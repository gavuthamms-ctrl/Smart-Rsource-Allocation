from flask import request, g
from datetime import datetime
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models.volunteer import Volunteer
from app.models.user import User
from app.utils.api_response import success_response, error_response, paginated_response
from app.middleware.auth_middleware import jwt_required_custom
from app.middleware.role_middleware import require_role
from app.models.task import Task
from app.models.organization import Organization
from app.models.task_assignment import TaskAssignment
from app.models.activity_log import ActivityLog

def get_all():
    page    = request.args.get('page', 1, type=int)
    limit   = request.args.get('limit', 10, type=int)
    search  = request.args.get('search', '')
    
    query = Volunteer.query.join(User)
    
    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                Volunteer.skills.ilike(f'%{search}%')
            )
        )
    
    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    
    return paginated_response(
        items   = [v.to_dict() for v in pagination.items],
        total   = pagination.total,
        page    = pagination.page,
        pages   = pagination.pages,
        per_page= limit
    )

@jwt_required_custom
def get_my_profile():
    user_id = get_jwt_identity()
    v = Volunteer.query.filter_by(user_id=user_id).first()
    if not v:
        return error_response('Volunteer profile not found', 404)
    return success_response({'volunteer': v.to_dict()})

@jwt_required_custom
def get_my_stats():
    user_id = get_jwt_identity()
    v = Volunteer.query.filter_by(user_id=user_id).first()
    if not v: return error_response('Profile not found', 404)
    
    # Live counts from assignments
    in_progress = TaskAssignment.query.filter_by(volunteer_id=v.id).filter(TaskAssignment.status.in_(['To Do', 'In Progress'])).count()
    
    return success_response({
        'tasks_assigned': v.tasks_assigned,
        'tasks_completed': v.tasks_completed,
        'people_helped': v.people_helped,
        'hours_volunteered': v.hours_volunteered,
        'match_score': v.match_score,
        'tasks_in_progress': in_progress
    })

@jwt_required_custom
def get_my_tasks():
    # Placeholder for tasks assigned to the current volunteer
    mock_tasks = [
        { "id": 10, "title": "Medical Camp - Palladam", "priority": "Critical", "status": "In Progress", "due_date": "2024-04-15", "ngo": "Gavutham Foundation" },
        { "id": 11, "title": "Road Survey - Peelamedu", "priority": "High", "status": "To Do", "due_date": "2024-04-18", "ngo": "Gavutham Foundation" },
        { "id": 12, "title": "Water Testing - Palladam", "priority": "Medium", "status": "Pending Review", "due_date": "2024-04-10", "ngo": "Gavutham Foundation" }
    ]
    return success_response({'tasks': mock_tasks})

@jwt_required_custom
def update_availability():
    user_id = get_jwt_identity()
    v = Volunteer.query.filter_by(user_id=user_id).first()
    if not v:
        return error_response('Volunteer not found', 404)
    
    data = request.get_json()
    new_status = data.get('availability')
    if new_status not in ['Available', 'Busy', 'On Leave']:
        return error_response('Invalid status', 400)
        
    v.availability = new_status
    try:
        db.session.commit()
        return success_response({'volunteer': v.to_dict()}, f'Status updated to {new_status}')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

@jwt_required_custom
def get_my_task_history():
    user_id = get_jwt_identity()
    vol = Volunteer.query.filter_by(user_id=user_id).first()
    if not vol: return error_response('Volunteer not found', 404)

    # Join assignment with task and ngo
    results = db.session.query(TaskAssignment, Task, Organization.ngo_name) \
        .join(Task, TaskAssignment.task_id == Task.id) \
        .outerjoin(Organization, Task.ngo_id == Organization.id) \
        .filter(TaskAssignment.volunteer_id == vol.id) \
        .order_by(TaskAssignment.accepted_at.desc()).all()

    tasks_data = []
    for ta, task, ngo_name in results:
        t_dict = task.to_dict()
        ta_dict = ta.to_dict()
        # Merge task info into assignment context
        combined = { **ta_dict, **t_dict }
        combined['assignment_id'] = ta.id
        combined['task_id'] = task.id
        combined['ngo_name'] = ngo_name or "Gavutham Foundation"
        tasks_data.append(combined)

    return success_response({'tasks': tasks_data})

@jwt_required_custom
def get_my_activity():
    user_id = get_jwt_identity()
    logs = ActivityLog.query.filter_by(user_id=user_id).order_by(ActivityLog.created_at.desc()).limit(8).all()
    return success_response({'activities': [l.to_dict() for l in logs]})

@jwt_required_custom
def get_my_notifications():
    user_id = get_jwt_identity()
    vol = Volunteer.query.filter_by(user_id=user_id).first()
    if not vol:
        return error_response('Volunteer profile not found', 404)
    
    # Get logs specifically for this volunteer
    logs = ActivityLog.query.filter_by(volunteer_id=vol.id).order_by(ActivityLog.created_at.desc()).limit(20).all()
    return success_response({'notifications': [l.to_dict() for l in logs]})

@jwt_required_custom
def mark_notifications_read():
    user_id = get_jwt_identity()
    vol = Volunteer.query.filter_by(user_id=user_id).first()
    if not vol:
        return error_response('Volunteer profile not found', 404)
    
    # Bulk update unread logs for this volunteer
    ActivityLog.query.filter_by(volunteer_id=vol.id, is_read=False).update({ActivityLog.is_read: True})
    
    try:
        db.session.commit()
        return success_response(None, 'Notifications marked as read')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

@jwt_required_custom
def update_assignment_status():
    data = request.get_json()
    assignment_id = data.get('assignment_id')
    new_status = data.get('status')
    
    assignment = TaskAssignment.query.get_or_404(assignment_id)
    assignment.status = new_status
    
    if new_status == 'Completed':
        assignment.completed_at = datetime.utcnow()
        # Also update volunteer summary
        vol = Volunteer.query.get(assignment.volunteer_id)
        vol.tasks_completed += 1
        
    try:
        db.session.commit()
        return success_response(None, f'Status updated to {new_status}')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

@jwt_required_custom
def submit_field_report():
    data = request.get_json()
    assignment_id = data.get('assignment_id')
    field_notes = data.get('field_notes')
    people_helped = int(data.get('people_helped', 0))
    hours_spent = float(data.get('hours_spent', 0))
    outcome = data.get('outcome')

    assignment = TaskAssignment.query.get_or_404(assignment_id)
    assignment.field_notes = field_notes
    assignment.people_helped = people_helped
    assignment.status = 'Pending Review'

    vol = Volunteer.query.get(assignment.volunteer_id)
    vol.people_helped += people_helped
    vol.hours_volunteered += int(hours_spent)
    
    # Add activity log
    log = ActivityLog(
        user_id = vol.user_id,
        volunteer_id = vol.id,
        type = 'report_submitted',
        message = f'You submitted a field report for task #{assignment.task_id}',
        related_task_id = assignment.task_id,
        time_ago = 'Just now'
    )
    db.session.add(log)

    try:
        db.session.commit()
        return success_response(None, 'Report submitted successfully')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def get_recommended_tasks():
    '''
    GET /api/tasks/recommended
    Query params: skills, location, volunteer_id
    Returns tasks sorted by match score for this volunteer
    '''

    # Get query params
    skills_str   = request.args.get('skills', '').strip()
    location_str = request.args.get('location', '').strip()
    volunteer_id = request.args.get('volunteer_id', type=int)

    # Parse volunteer skills into list
    volunteer_skills = []
    if skills_str:
        volunteer_skills = [
            s.strip().lower()
            for s in skills_str.split(',')
            if s.strip()
        ]

    volunteer_location = location_str.lower().strip()

    # Coimbatore district mapping
    coimbatore_district = [
        'palladam', 'ukkadam', 'peelamedu',
        'coimbatore', 'ganapathy', 'saibaba colony',
        'rs puram', 'gandhipuram', 'singanallur',
        'hopes college', 'race course'
    ]

    # STEP 1: Fetch only OPEN tasks from DB
    open_tasks = Task.query.filter_by(
        status='Open'
    ).all()

    # STEP 2: Exclude tasks already assigned to this volunteer
    excluded_task_ids = set()
    if volunteer_id:
        assignments = TaskAssignment.query.filter_by(
            volunteer_id=volunteer_id
        ).all()
        excluded_task_ids = {a.task_id for a in assignments}

    # STEP 3: Calculate match score for each task
    scored_tasks = []

    for task in open_tasks:

        # Skip already accepted tasks
        if task.id in excluded_task_ids:
            continue

        # Parse task required skills
        task_skills = []
        if task.required_skills:
            task_skills = [
                s.strip().lower()
                for s in task.required_skills.split(',')
                if s.strip()
            ]

        task_location = (task.location or '').lower().strip()

        # ── A) SKILL MATCH SCORE (50 pts max) ──
        if task_skills and volunteer_skills:
            matched = [
                s for s in task_skills
                if s in volunteer_skills
            ]
            unmatched = [
                s for s in task_skills
                if s not in volunteer_skills
            ]
            skill_score = (len(matched) / len(task_skills)) * 50
        else:
            matched   = []
            unmatched = task_skills
            skill_score = 0

        # ── B) LOCATION MATCH SCORE (30 pts max) ──
        if task_location == volunteer_location:
            location_score = 30
            location_match_type = 'exact'
        elif (task_location in coimbatore_district and
              volunteer_location in coimbatore_district):
            location_score = 15
            location_match_type = 'nearby'
        else:
            location_score = 0
            location_match_type = 'different'

        # ── C) PRIORITY SCORE (20 pts max) ──
        priority_map = {
            'Critical': 20,
            'High'    : 15,
            'Medium'  : 10,
            'Low'     : 5
        }
        priority_score = priority_map.get(task.priority, 5)

        # ── D) AVAILABILITY BONUS ──
        # Get volunteer availability from DB
        volunteer_obj = None
        if volunteer_id:
            volunteer_obj = Volunteer.query.get(volunteer_id)
        availability_bonus = 0
        if volunteer_obj and volunteer_obj.availability == 'Available':
            availability_bonus = 10

        # ── FINAL SCORE ──
        raw_score = (skill_score +
                     location_score +
                     priority_score +
                     availability_bonus)
        final_pct = min(int(raw_score), 100)

        # ── MINIMUM THRESHOLD ──
        if final_pct < 20:
            continue  # Skip irrelevant tasks

        # ── BUILD TASK DICT ──
        ngo = Organization.query.get(task.ngo_id)
        ngo_name = ngo.ngo_name if ngo else 'Gavutham Foundation'

        task_dict = {
            'id'                 : task.id,
            'title'              : task.title,
            'description'        : task.description,
            'required_skills'    : task.required_skills,
            'location'           : task.location,
            'priority'           : task.priority,
            'status'             : task.status,
            'ngo_name'           : ngo_name,
            'due_date'           : task.due_date.strftime(
                                       '%Y-%m-%d')
                                   if task.due_date else None,
            'people_needed'      : task.people_needed,
            'is_new'             : bool(task.is_new),
            'posted_ago'         : task.posted_ago,
            'match_percentage'   : final_pct,
            'matched_skills'     : matched,
            'unmatched_skills'   : unmatched,
            'location_match_type': location_match_type,
            'skill_score'        : int(skill_score),
            'location_score'     : location_score,
            'priority_score'     : priority_score,
            'availability_bonus' : availability_bonus,
            'created_at'         : task.created_at.isoformat()
                                   if task.created_at else None
        }
        scored_tasks.append(task_dict)

    # STEP 4: SORT
    priority_order = {
        'Critical': 4,
        'High'    : 3,
        'Medium'  : 2,
        'Low'     : 1
    }
    location_order = {
        'exact'    : 3,
        'nearby'   : 2,
        'different': 1
    }
    scored_tasks.sort(
        key=lambda t: (
            -t['match_percentage'],
            -priority_order.get(t['priority'], 0),
            -location_order.get(t['location_match_type'], 0),
            -(1 if t['is_new'] else 0)
        )
    )

    # STEP 5: UPDATE match_percentage in DB
    # Update each task's match_percentage in DB
    # so it reflects the latest calculation
    for t in scored_tasks:
        try:
            task_obj = Task.query.get(t['id'])
            if task_obj:
                task_obj.match_percentage = t['match_percentage']
            db.session.commit()
        except:
            db.session.rollback()

    return success_response({
        'tasks'            : scored_tasks,
        'total'            : len(scored_tasks),
        'volunteer_skills' : volunteer_skills,
        'volunteer_location': volunteer_location
    })

@jwt_required_custom
def accept_task():
    data = request.get_json()
    task_id = data.get('task_id')
    
    # Get volunteer_id from token for safety
    user_id = get_jwt_identity()
    vol = Volunteer.query.filter_by(user_id=user_id).first()
    if not vol: return error_response('Volunteer profile not found', 404)
    
    # Create Assignment in task_assignments table
    try:
        # Check if already assigned
        check = db.session.execute(
            db.text("SELECT id FROM task_assignments WHERE task_id = :tid AND volunteer_id = :vid"),
            {'tid': task_id, 'vid': vol.id}
        ).fetchone()
        
        if check:
            return error_response('You have already accepted this task', 400)

        db.session.execute(
            db.text("INSERT INTO task_assignments (task_id, volunteer_id, status, accepted_at) VALUES (:tid, :vid, 'To Do', :now)"),
            {'tid': task_id, 'vid': vol.id, 'now': datetime.utcnow()}
        )
        
        # Update Task status to 'Assigned' if no more people needed
        # (Simplified logic: always set to Assigned for now)
        db.session.execute(
            db.text("UPDATE tasks SET status = 'Assigned' WHERE id = :tid"),
            {'tid': task_id}
        )
        
        db.session.commit()
        return success_response(None, 'Task accepted successfully! It is now in My Task History.')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

@jwt_required_custom
def submit_report():
    data = request.get_json()
    task_id = data.get('task_id')
    issue_type = data.get('issue_type')
    description = data.get('description')
    
    user_id = get_jwt_identity()
    vol = Volunteer.query.filter_by(user_id=user_id).first()
    
    try:
        db.session.execute(
            db.text("INSERT INTO task_reports (task_id, volunteer_id, issue_type, description, status) VALUES (:tid, :vid, :type, :desc, 'Open')"),
            {'tid': task_id, 'vid': vol.id if vol else None, 'type': issue_type, 'desc': description}
        )
        db.session.commit()
        return success_response(None, 'Issue reported successfully. The NGO will review it.')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def get_one(id):
    v = Volunteer.query.get_or_404(id)
    return success_response({'volunteer': v.to_dict()})

def get_stats():
    # Admin stats
    total = Volunteer.query.count()
    active = Volunteer.query.filter_by(availability='Available').count()
    return success_response({
        'total': total,
        'active': active
    })

def create():
    # Basic create logic for new volunteers
    data = request.get_json()
    # would need to create User first, then Volunteer...
    return error_response('User registration recommended', 400)

def update(id):
    v = Volunteer.query.get_or_404(id)
    data = request.get_json()
    if 'skills' in data: v.skills = data['skills']
    if 'location' in data: v.location = data['location']
    if 'availability' in data: v.availability = data['availability']
    if 'phone_number' in data: v.phone_number = data['phone_number']
    
    try:
        db.session.commit()
        return success_response({'volunteer': v.to_dict()})
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def delete(id):
    v = Volunteer.query.get_or_404(id)
    try:
        db.session.delete(v)
        db.session.commit()
        return success_response(None, 'Deleted successfully')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)
