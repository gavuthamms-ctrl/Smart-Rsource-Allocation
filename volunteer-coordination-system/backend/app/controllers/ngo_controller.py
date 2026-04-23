from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models.user import User
from app.models.volunteer import Volunteer
from app.models.organization import Organization
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.community_member import CommunityMember
from app.models.activity_log import ActivityLog
from app.utils.api_response import success_response, error_response, paginated_response
from datetime import datetime, timedelta
import sqlalchemy as sa

def get_dashboard_stats():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'ngo':
        return error_response('Not authorized', 403)

    ngo = Organization.query.filter_by(user_id=user_id).first()
    if not ngo:
        return error_response('NGO profile not found', 404)

    total_volunteers = Volunteer.query.count()
    available = Volunteer.query.filter_by(availability='Available').count()
    busy = Volunteer.query.filter_by(availability='Busy').count()
    on_leave = Volunteer.query.filter_by(availability='On Leave').count()

    total_tasks = Task.query.filter_by(ngo_id=ngo.id).count()
    active_tasks = Task.query.filter(
        Task.ngo_id == ngo.id,
        Task.status.in_(['Open', 'Assigned', 'In Progress'])
    ).count()
    completed_tasks = Task.query.filter_by(ngo_id=ngo.id, status='Completed').count()

    pending_reviews = db.session.query(TaskAssignment).join(Task).filter(
        Task.ngo_id == ngo.id,
        TaskAssignment.status == 'Pending Review'
    ).count()

    critical_needs = CommunityMember.query.filter_by(
        priority='Critical', status='Open').count()

    people_helped = db.session.query(sa.func.sum(Volunteer.people_helped)).scalar() or 0

    tasks_by_status = {
        'Open': Task.query.filter_by(ngo_id=ngo.id, status='Open').count(),
        'Assigned': Task.query.filter_by(ngo_id=ngo.id, status='Assigned').count(),
        'In Progress': Task.query.filter_by(ngo_id=ngo.id, status='In Progress').count(),
        'Completed': completed_tasks,
        'Cancelled': Task.query.filter_by(ngo_id=ngo.id, status='Cancelled').count()
    }

    return success_response({
        'total_volunteers': total_volunteers,
        'available_volunteers': available,
        'busy_volunteers': busy,
        'on_leave_volunteers': on_leave,
        'total_tasks': total_tasks,
        'active_tasks': active_tasks,
        'completed_tasks': completed_tasks,
        'pending_reviews': pending_reviews,
        'critical_needs': critical_needs,
        'total_people_helped': int(people_helped),
        'tasks_by_status': tasks_by_status,
        'volunteer_by_availability': {
            'Available': available,
            'Busy': busy,
            'On Leave': on_leave
        }
    })

def get_ngo_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'ngo':
        return error_response('Not authorized', 403)

    ngo = Organization.query.filter_by(user_id=user_id).first()
    if not ngo:
        return error_response('NGO profile not found', 404)

    return success_response({
        'user': user.to_dict(),
        'ngo': ngo.to_dict()
    })

def update_ngo_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    ngo = Organization.query.filter_by(user_id=user_id).first()
    
    data = request.get_json()
    
    # Update User Info
    if 'name' in data: user.name = data['name']
    if 'email' in data: user.email = data['email']
    
    # Update NGO Info
    if 'ngo_name' in data: ngo.ngo_name = data['ngo_name']
    if 'phone_number' in data: ngo.phone_number = data['phone_number']
    if 'address' in data: ngo.address = data['address']
    if 'city' in data: ngo.city = data['city']
    if 'focus_area' in data: ngo.focus_area = data['focus_area']
    if 'website' in data: ngo.website = data['website']
    
    db.session.commit()
    
    return success_response({
        'user': user.to_dict(),
        'ngo': ngo.to_dict()
    }, 'Profile updated successfully')

def get_recent_activity():
    limit = request.args.get('limit', 8, type=int)
    logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return success_response([log.to_dict() for log in logs])

def get_pending_reports():
    user_id = get_jwt_identity()
    ngo = Organization.query.filter_by(user_id=user_id).first()
    
    reports = db.session.query(TaskAssignment, Task, Volunteer, User).join(
        Task, TaskAssignment.task_id == Task.id
    ).join(
        Volunteer, TaskAssignment.volunteer_id == Volunteer.id
    ).join(
        User, Volunteer.user_id == User.id
    ).filter(
        Task.ngo_id == ngo.id,
        TaskAssignment.status == 'Pending Review'
    ).all()

    result = []
    for assignment, task, volunteer, user in reports:
        result.append({
            'assignment_id': assignment.id,
            'task_title': task.title,
            'volunteer_name': user.name,
            'submitted_at': assignment.completed_at.isoformat() if assignment.completed_at else None,
            'field_notes': assignment.field_notes,
            'people_helped': assignment.people_helped
        })
    
    return success_response(result)

def get_volunteers():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 12, type=int)
    search = request.args.get('search', '')
    availability = request.args.get('availability', '')
    skill = request.args.get('skill', '')
    location = request.args.get('location', '')
    sort = request.args.get('sort', 'name')

    query = db.session.query(Volunteer).join(User)

    if search:
        query = query.filter(sa.or_(
            User.name.ilike(f'%{search}%'),
            User.email.ilike(f'%{search}%'),
            Volunteer.skills.ilike(f'%{search}%'),
            Volunteer.location.ilike(f'%{search}%')
        ))

    if availability:
        query = query.filter(Volunteer.availability == availability)
    
    if skill:
        query = query.filter(Volunteer.skills.ilike(f'%{skill}%'))
        
    if location:
        query = query.filter(Volunteer.location == location)

    if sort == 'match_score':
        query = query.order_by(Volunteer.match_score.desc())
    elif sort == 'tasks':
        query = query.order_by(Volunteer.tasks_completed.desc())
    else:
        query = query.order_by(User.name.asc())

    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    
    volunteers = []
    for v in pagination.items:
        d = v.to_dict()
        current_assignment = TaskAssignment.query.filter_by(
            volunteer_id=v.id, status='In Progress').first()
        if current_assignment:
            task = Task.query.get(current_assignment.task_id)
            d['current_task'] = {'id': task.id, 'title': task.title}
        volunteers.append(d)

    return paginated_response(volunteers, pagination.total, pagination.page, pagination.pages, limit)

def create_volunteer():
    data = request.get_json()
    # In a real app, we'd check if user exists, etc.
    # For this demo, we'll create user + volunteer
    new_user = User(
        name=f"{data['first_name']} {data['last_name']}",
        email=data['email'],
        password=data.get('password', 'Volunteer@123'),
        role='volunteer'
    )
    db.session.add(new_user)
    db.session.flush()

    new_volunteer = Volunteer(
        user_id=new_user.id,
        phone_number=data.get('phone_number'),
        location=data.get('location'),
        skills=data.get('skills'),
        availability=data.get('availability', 'Available'),
        notes=data.get('notes'),
        volunteer_code=f"VOL-{new_user.id:04d}"
    )
    db.session.add(new_volunteer)
    db.session.commit()
    
    return success_response(new_volunteer.to_dict(), 'Volunteer created successfully', 201)

def get_tasks():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 12, type=int)
    status = request.args.get('status', '')
    priority = request.args.get('priority', '')
    location = request.args.get('location', '')
    search = request.args.get('search', '')
    
    user_id = get_jwt_identity()
    ngo = Organization.query.filter_by(user_id=user_id).first()
    
    query = Task.query.filter_by(ngo_id=ngo.id)
    
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    if location:
        query = query.filter(Task.location.ilike(f'%{location}%'))
    if search:
        query = query.filter(sa.or_(
            Task.title.ilike(f'%{search}%'),
            Task.description.ilike(f'%{search}%')
        ))
        
    pagination = query.order_by(Task.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    
    tasks = []
    for t in pagination.items:
        td = t.to_dict()
        assignment = TaskAssignment.query.filter_by(task_id=t.id).first()
        if assignment:
            v = Volunteer.query.get(assignment.volunteer_id)
            td['assigned_volunteer'] = v.user.name if v and v.user else 'Unknown'
        tasks.append(td)
        
    return paginated_response(tasks, pagination.total, pagination.page, pagination.pages, limit)

def create_task():
    user_id = get_jwt_identity()
    ngo = Organization.query.filter_by(user_id=user_id).first()
    data = request.get_json()

    task = Task(
        title=data['title'],
        description=data['description'],
        required_skills=data['required_skills'],
        location=data['location'],
        priority=data['priority'],
        status=data.get('status', 'Open'),
        ngo_id=ngo.id,
        due_date=datetime.strptime(data['due_date'], '%Y-%m-%d').date(),
        people_needed=data.get('people_needed', 1),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        is_new=True
    )
    db.session.add(task)
    db.session.flush()

    if data.get('volunteer_id'):
        assignment = TaskAssignment(
            task_id=task.id,
            volunteer_id=data['volunteer_id'],
            status='Assigned'
        )
        db.session.add(assignment)
        task.status = 'Assigned'
        
    log = ActivityLog(
        user_id=user_id,
        type='task_created',
        message=f'New task created: {task.title}',
        related_task_id=task.id,
        time_ago='Just now'
    )
    db.session.add(log)
    db.session.commit()
    
    return success_response(task.to_dict(), 'Task created successfully', 201)

def approve_report(assignment_id):
    assignment = TaskAssignment.query.get_or_404(assignment_id)
    task = Task.query.get(assignment.task_id)
    volunteer = Volunteer.query.get(assignment.volunteer_id)
    data = request.get_json() or {}

    assignment.status = 'Completed'
    assignment.completed_at = datetime.utcnow()
    task.status = 'Completed'

    if volunteer:
        volunteer.tasks_completed += 1
        volunteer.people_helped += (assignment.people_helped or 0)
        volunteer.hours_volunteered += int(data.get('hours', 0))

    log = ActivityLog(
        user_id=volunteer.user_id if volunteer else None,
        type='task_completed',
        message=f'Task approved: {task.title}',
        related_task_id=task.id,
        time_ago='Just now'
    )
    db.session.add(log)
    db.session.commit()
    return success_response(None, 'Report approved successfully')

def reject_report(assignment_id):
    assignment = TaskAssignment.query.get_or_404(assignment_id)
    task = Task.query.get(assignment.task_id)
    
    assignment.status = 'In Progress' # Send back to volunteer
    
    log = ActivityLog(
        user_id=get_jwt_identity(),
        type='task_rejected',
        message=f'Report rejected for: {task.title}',
        related_task_id=task.id,
        time_ago='Just now'
    )
    db.session.add(log)
    db.session.commit()
    return success_response(None, 'Report rejected and task sent back to volunteer')

def get_community_needs():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    priority = request.args.get('priority', '')
    status = request.args.get('status', '')
    
    query = CommunityMember.query
    if priority:
        query = query.filter_by(priority=priority)
    if status:
        query = query.filter_by(status=status)
        
    pagination = query.order_by(CommunityMember.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    
    needs = []
    for item in pagination.items:
        d = item.to_dict()
        # Mock matched volunteers logic
        matched = Volunteer.query.filter(Volunteer.skills.ilike(f"%{item.needs[:5]}%")).limit(3).all()
        d['matched_volunteers'] = [{'id': v.id, 'name': v.user.name} for v in matched]
        needs.append(d)
        
    return paginated_response(needs, pagination.total, pagination.page, pagination.pages, limit)

def resolve_community_need(need_id):
    need = CommunityMember.query.get_or_404(need_id)
    need.status = 'Resolved'
    db.session.commit()
    return success_response(None, 'Need marked as resolved')

def get_report_stats():
    user_id = get_jwt_identity()
    ngo = Organization.query.filter_by(user_id=user_id).first()
    
    total_people_helped = db.session.query(sa.func.sum(Volunteer.people_helped)).scalar() or 0
    total_hours = db.session.query(sa.func.sum(Volunteer.hours_volunteered)).scalar() or 0
    completed = Task.query.filter_by(ngo_id=ngo.id, status='Completed').count()
    cancelled = Task.query.filter_by(ngo_id=ngo.id, status='Cancelled').count()
    success_rate = (completed / (completed + cancelled) * 100) if (completed + cancelled) > 0 else 0
    
    # Monthly activity (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        month_date = datetime.utcnow() - timedelta(days=i*30)
        count = Task.query.filter(
            Task.ngo_id == ngo.id,
            sa.extract('month', Task.created_at) == month_date.month
        ).count()
        monthly_data.append({'month': month_date.strftime('%b'), 'tasks': count})

    return success_response({
        'total_people_helped': int(total_people_helped),
        'success_rate': round(success_rate, 2),
        'total_hours': int(total_hours),
        'monthly_activity': monthly_data
    })

def broadcast_notification():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    audience = data.get('audience', [])
    title = data.get('title')
    message = data.get('message')
    
    # Filter volunteers based on audience selection
    volunteers_query = db.session.query(Volunteer)
    
    if 'All Volunteers' not in audience:
        conditions = []
        for a in audience:
            if 'Volunteers' in a:
                skill = a.replace(' Volunteers', '')
                conditions.append(Volunteer.skills.ilike(f'%{skill}%'))
            elif 'Area' in a:
                area = a.replace(' Area', '').replace('📍 ', '')
                conditions.append(Volunteer.location.ilike(f'%{area}%'))
        
        if conditions:
            volunteers_query = volunteers_query.filter(sa.or_(*conditions))

    volunteers = volunteers_query.all()
    
    # Insert logs for each targeted volunteer
    for v in volunteers:
        log = ActivityLog(
            user_id=user_id,
            volunteer_id=v.id,
            type='broadcast',
            message=f"NGO Broadcast: {title}",
            time_ago='Just now'
        )
        db.session.add(log)
    
    db.session.commit()
    return success_response({'notified_count': len(volunteers)}, f'Announcement broadcast to {len(volunteers)} volunteers')

def send_urgent_alert():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    location = data.get('location')
    description = data.get('message') # This is the full alert text
    urgency = data.get('urgency', 'critical')
    skills = data.get('skills_needed', [])
    
    # Match volunteers
    match_query = db.session.query(Volunteer)
    if location:
        match_query = match_query.filter(Volunteer.location.ilike(f'%{location}%'))
    
    if skills:
        skill_conditions = [Volunteer.skills.ilike(f'%{s}%') for s in skills]
        match_query = match_query.filter(sa.or_(*skill_conditions))
    
    volunteers = match_query.all()
    
    # Log critical need for each volunteer
    for v in volunteers:
        log = ActivityLog(
            user_id=user_id,
            volunteer_id=v.id,
            type='critical_need',
            message=f"Critical Alert: {location}",
            time_ago='Just now'
        )
        db.session.add(log)
        
    db.session.commit()
    return success_response({'notified_count': len(volunteers)}, f'Urgent alert sent to {len(volunteers)} volunteers')

def get_matching_volunteers():
    location = request.args.get('location', '')
    skills = request.args.get('skills', '')
    
    query = db.session.query(Volunteer).join(User)
    
    if location:
        query = query.filter(Volunteer.location.ilike(f'%{location}%'))
    
    if skills:
        skill_list = [s.strip() for s in skills.split(',') if s.strip()]
        conditions = [Volunteer.skills.ilike(f'%{s}%') for s in skill_list]
        if conditions:
            query = query.filter(sa.or_(*conditions))
            
    volunteers = query.limit(10).all()
    return success_response([v.to_dict() for v in volunteers])

def get_report_preview():
    user_id = get_jwt_identity()
    ngo = Organization.query.filter_by(user_id=user_id).first()
    report_type = request.args.get('type', 'tasks')
    
    data = {
        'tasks_count': Task.query.filter_by(ngo_id=ngo.id).count(),
        'volunteers_count': Volunteer.query.count(),
        'community_count': CommunityMember.query.count()
    }
    return success_response(data)

def generate_report():
    user_id = get_jwt_identity()
    ngo = Organization.query.filter_by(user_id=user_id).first()
    
    report_type = request.args.get('type')
    
    # Simply aggregate all required data for the frontend to format
    tasks = [t.to_dict() for t in Task.query.filter_by(ngo_id=ngo.id).all()]
    volunteers = [v.to_dict() for v in Volunteer.query.all()]
    community = [c.to_dict() for c in CommunityMember.query.all()]
    
    return success_response({
        'tasks': tasks,
        'volunteers': volunteers,
        'community': community,
        'generated_at': datetime.utcnow().isoformat()
    })
