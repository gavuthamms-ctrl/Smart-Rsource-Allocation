from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models.user import User
from app.models.community_member import CommunityMember
from app.models.volunteer import Volunteer
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.message import Message
from app.models.activity_log import ActivityLog
from datetime import datetime

def success_response(data=None, message='Success'):
    return jsonify({
        'success': True,
        'message': message,
        'data': data
    })

def error_response(message='Error', status_code=400):
    return jsonify({
        'success': False,
        'message': message
    }), status_code

def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    if not community:
        return error_response('Profile not found', 404)
        
    result = community.to_dict()
    result['email'] = user.email # user.name is already handled in to_dict
    return success_response({'profile': result})

def get_nearby_volunteers():
    user_id = get_jwt_identity()
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    if not community:
        return error_response('Community profile not found', 404)
        
    city = request.args.get('city', community.city)
    volunteers = Volunteer.query.filter_by(location=city).all()
    
    result = []
    for v in volunteers:
        d = v.to_dict()
        d['name'] = v.user.name
        d['email'] = v.user.email
        
        # Skill matching logic
        skill_match = False
        if community.needs and v.skills:
            need_text = community.needs.lower()
            skill_list = [s.strip().lower() for s in v.skills.split(',')]
            skill_match = any(skill in need_text for skill in skill_list)
        
        d['skill_match'] = skill_match
        result.append(d)
        
    # Sort: matching skills first, then availability
    result.sort(key=lambda x: (-x['skill_match'], x['availability'] != 'Available'))
    return success_response({'volunteers': result})

def get_area_tasks():
    user_id = get_jwt_identity()
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    if not community:
        return error_response('Community profile not found', 404)
        
    city = request.args.get('city', community.city)
    tasks = Task.query.filter(
        Task.location == city,
        Task.status.in_(['Open', 'Assigned', 'In Progress'])
    ).order_by(Task.priority.desc()).limit(5).all()
    
    result = []
    for t in tasks:
        d = t.to_dict()
        # Find assignment
        assignment = TaskAssignment.query.filter_by(task_id=t.id).first()
        if assignment:
            v = Volunteer.query.get(assignment.volunteer_id)
            if v:
                d['assigned_volunteer'] = {
                    'name': v.user.name,
                    'skills': v.skills,
                    'status': assignment.status
                }
        result.append(d)
        
    return success_response({'tasks': result})

def get_announcements():
    msgs = Message.query.filter_by(
        room_id=3,
        message_type='announcement',
        is_deleted=False
    ).order_by(Message.created_at.desc()).limit(5).all()
    
    result = []
    for m in msgs:
        d = {
            'id': m.id,
            'message': m.message,
            'sender_name': m.user.name if m.user else 'System',
            'created_at': m.created_at.isoformat() if m.created_at else None,
            'time_ago': 'Recently'
        }
        result.append(d)
        
    return success_response({'announcements': result})

def get_volunteers():
    city = request.args.get('city')
    skill = request.args.get('skill')
    availability = request.args.get('availability')
    sort_by = request.args.get('sort', 'match')
    
    query = Volunteer.query
    if city:
        query = query.filter_by(location=city)
    if availability:
        query = query.filter_by(availability=availability)
        
    volunteers = query.all()
    user_id = get_jwt_identity()
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    result = []
    for v in volunteers:
        d = v.to_dict()
        d['name'] = v.user.name
        d['email'] = v.user.email
        
        skill_match = False
        if community and community.needs and v.skills:
            need_text = community.needs.lower()
            skill_list = [s.strip().lower() for s in v.skills.split(',')]
            skill_match = any(skill in need_text for skill in skill_list)
        
        d['skill_match'] = skill_match
        result.append(d)
        
    if sort_by == 'match':
        result.sort(key=lambda x: (-x['skill_match'], x['availability'] != 'Available'))
    elif sort_by == 'name':
        result.sort(key=lambda x: x['name'])
        
    return success_response({'volunteers': result})

def request_volunteer():
    user_id = get_jwt_identity()
    data = request.get_json()
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    if not community:
        return error_response('Profile not found', 404)

    # 1. Create a persistent Task in the database
    new_task = Task(
        title=f"Assistance Request: {data.get('required_skill')}",
        description=data.get('need_description'),
        required_skills=data.get('required_skill'),
        location=data.get('location', community.city),
        priority=data.get('urgency', 'Medium'),
        status='Open',
        ngo_id=1, # Default to Gavutham Foundation for demo
        due_date=datetime.utcnow().date(),
        people_needed=1,
        is_new=True
    )
    db.session.add(new_task)
    db.session.flush()

    # 2. Update Community Member status
    community.status = 'Open'
    community.needs = data.get('need_description')
    community.priority = data.get('urgency', 'Medium')

    # 3. Log Activity
    log = ActivityLog(
        user_id=user_id,
        type='task_created',
        message=f'Volunteer assistance requested: {data.get("required_skill")}',
        related_task_id=new_task.id,
        time_ago='Just now'
    )
    db.session.add(log)
    
    try:
        db.session.commit()
        return success_response({'task_id': new_task.id}, 'Request sent successfully and task created')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def update_need():
    user_id = get_jwt_identity()
    data = request.get_json()
    user = User.query.get(user_id)
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    if not community:
        return error_response('Profile not found', 404)
        
    needs_text = data.get('needs', community.needs)
    priority_level = data.get('priority', community.priority)

    community.needs = needs_text
    community.priority = priority_level
    community.status = 'Open'
    
    # Optional: Post to Urgent Alerts Room (id=2) if Critical
    if priority_level == 'Critical':
        alert_msg = Message(
            room_id=2,
            user_id=user_id,
            message=f"🚨 URGENT COMMUNITY NEED: {community.city}\n{needs_text}",
            message_type='urgent_alert',
            urgency_level='critical'
        )
        db.session.add(alert_msg)

    log = ActivityLog(
        user_id = user_id,
        type = 'profile_updated',
        message = 'Community need updated',
        time_ago = 'Just now'
    )
    db.session.add(log)
    
    try:
        db.session.commit()
        return success_response({'community': community.to_dict()}, 'Need updated successfully')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def resolve_need():
    user_id = get_jwt_identity()
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    if not community:
        return error_response('Profile not found', 404)
        
    community.status = 'Resolved'
    
    log = ActivityLog(
        user_id = user_id,
        type = 'task_completed',
        message = 'Community need marked as resolved',
        time_ago = 'Just now'
    )
    db.session.add(log)
    
    try:
        db.session.commit()
        return success_response(None, 'Need marked as resolved')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    user = User.query.get(user_id)
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    if data.get('name'):
        user.name = data['name']
    if community:
        if data.get('phone_number'):
            community.phone_number = data['phone_number']
        if data.get('address'):
            community.address = data['address']
        if data.get('needs'):
            community.needs = data['needs']
        if data.get('priority'):
            community.priority = data['priority']
            
    try:
        db.session.commit()
        return success_response(None, 'Profile updated successfully')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def get_dashboard_stats():
    user_id = get_jwt_identity()
    community = CommunityMember.query.filter_by(user_id=user_id).first()
    
    if not community:
        return error_response('Community profile not found', 404)
        
    city = community.city
    nearby_v_count = Volunteer.query.filter_by(location=city).count()
    active_area_tasks = Task.query.filter(
        Task.location == city,
        Task.status.in_(['Open', 'Assigned', 'In Progress'])
    ).count()
    
    return success_response({
        'nearby_volunteers': nearby_v_count,
        'active_area_tasks': active_area_tasks,
        'supporting_ngos': 1, # Default as per requirement
        'my_need_status': community.status,
        'my_need_priority': community.priority
    })
