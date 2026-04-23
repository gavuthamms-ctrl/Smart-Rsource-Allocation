from flask import request, current_app
from app import db
from app.models.resource import SkillResource, ResourceCategory, ResourceRating, ResourceBookmark, ResourceProgress, ResourceQuiz
from app.models.user import User
from app.models.volunteer import Volunteer
from app.utils.api_response import success_response, error_response, paginated_response
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
import os
from werkzeug.utils import secure_filename

def get_resources():
    user_id = get_jwt_identity()
    
    page        = request.args.get('page', 1, type=int)
    limit       = request.args.get('limit', 12, type=int)
    search      = request.args.get('search', '').strip()
    cat_id      = request.args.get('category_id') 
    res_type    = request.args.get('resource_type', '')
    diff        = request.args.get('difficulty', '')
    featured    = request.args.get('featured', '')
    sort        = request.args.get('sort', 'relevant')
    skill_match = request.args.get('skill_match', '')
    bookmarked  = request.args.get('bookmarked', '')
    in_progress = request.args.get('in_progress', '')
    completed   = request.args.get('completed', '')
    duration_max = request.args.get('duration_max', type=int)

    query = SkillResource.query.filter_by(is_active=True)

    # Join with Category if searching or if needed for sorting
    if search:
        query = query.join(ResourceCategory)
        query = query.filter(db.or_(
            SkillResource.title.ilike(f'%{search}%'),
            SkillResource.description.ilike(f'%{search}%'),
            SkillResource.skill_tags.ilike(f'%{search}%'),
            ResourceCategory.name.ilike(f'%{search}%')
        ))

    if cat_id:
        try:
            if ',' in str(cat_id):
                ids = [int(i.strip()) for i in cat_id.split(',') if i.strip()]
                if ids:
                    query = query.filter(SkillResource.category_id.in_(ids))
            else:
                query = query.filter_by(category_id=int(cat_id))
        except ValueError:
            pass # Ignore malformed IDs

    if res_type:
        query = query.filter_by(resource_type=res_type)

    if diff:
        if ',' in str(diff):
            diff_list = [d.strip() for d in diff.split(',') if d.strip()]
            if diff_list:
                query = query.filter(SkillResource.difficulty.in_(diff_list))
        else:
            query = query.filter_by(difficulty=diff)

    def is_true(val):
        return str(val).lower() in ['true', '1', 'yes']

    if is_true(featured):
        query = query.filter_by(is_featured=True)

    if skill_match:
        skills = [s.strip() for s in skill_match.split(',') if s.strip()]
        if skills:
            conditions = [SkillResource.skill_tags.ilike(f'%{skill}%') for skill in skills]
            query = query.filter(db.or_(*conditions))

    if is_true(bookmarked):
        bookmarked_ids = [b.resource_id for b in ResourceBookmark.query.filter_by(user_id=user_id).all()]
        query = query.filter(SkillResource.id.in_(bookmarked_ids))

    if is_true(in_progress):
        progress_ids = [p.resource_id for p in ResourceProgress.query.filter_by(user_id=user_id, status='in_progress').all()]
        query = query.filter(SkillResource.id.in_(progress_ids))

    if is_true(completed):
        completed_ids = [p.resource_id for p in ResourceProgress.query.filter_by(user_id=user_id, status='completed').all()]
        query = query.filter(SkillResource.id.in_(completed_ids))

    if duration_max:
        query = query.filter(SkillResource.duration_mins <= duration_max)

    # Sorting logic
    if sort == 'newest':
        query = query.order_by(SkillResource.created_at.desc())
    elif sort == 'most_viewed':
        query = query.order_by(SkillResource.view_count.desc())
    elif sort == 'az':
        query = query.order_by(SkillResource.title.asc())
    elif sort == 'relevant':
        # Combined weight: featured first, then view count
        query = query.order_by(SkillResource.is_featured.desc(), SkillResource.view_count.desc())
    else:
        query = query.order_by(SkillResource.is_featured.desc())

    result = query.paginate(page=page, per_page=limit, error_out=False)
    resources = [r.to_dict(user_id=user_id) for r in result.items]

    return paginated_response(
        items=resources,
        total=result.total,
        page=result.page,
        pages=result.pages,
        per_page=limit
    )

def get_stats():
    user_id = get_jwt_identity()
    total   = SkillResource.query.filter_by(is_active=True).count()
    completed = ResourceProgress.query.filter_by(user_id=user_id, status='completed').count()
    bookmarked = ResourceBookmark.query.filter_by(user_id=user_id).count()

    volunteer = Volunteer.query.filter_by(user_id=user_id).first()
    skill_matched = 0
    if volunteer and volunteer.skills:
        skills = [s.strip() for s in volunteer.skills.split(',')]
        conditions = [SkillResource.skill_tags.ilike(f'%{s}%') for s in skills]
        skill_matched = SkillResource.query.filter(
            SkillResource.is_active == True,
            db.or_(*conditions)
        ).count()

    return success_response({
        'total_resources' : total,
        'completed'       : completed,
        'bookmarked'      : bookmarked,
        'skill_matched'   : skill_matched
    })

def get_categories():
    cats = ResourceCategory.query.order_by(ResourceCategory.sort_order).all()
    # Also get counts per category
    return success_response({
        'categories': [c.to_dict() for c in cats]
    })

def get_one(id):
    user_id  = get_jwt_identity()
    resource = SkillResource.query.get_or_404(id)
    return success_response({
        'resource': resource.to_dict(user_id=user_id)
    })

def get_quiz(id):
    questions = ResourceQuiz.query.filter_by(resource_id=id).order_by(ResourceQuiz.sort_order).all()
    return success_response({
        'questions': [q.to_dict() for q in questions]
    })

def increment_view(id):
    resource = SkillResource.query.get_or_404(id)
    resource.view_count += 1
    db.session.commit()
    return success_response(None, 'View recorded')

def increment_download(id):
    resource = SkillResource.query.get_or_404(id)
    resource.download_count += 1
    db.session.commit()
    return success_response(None, 'Download recorded')

def toggle_bookmark(id):
    user_id  = get_jwt_identity()
    existing = ResourceBookmark.query.filter_by(resource_id=id, user_id=user_id).first()
    if existing:
        db.session.delete(existing)
        action = 'removed'
    else:
        b = ResourceBookmark(resource_id=id, user_id=user_id)
        db.session.add(b)
        action = 'added'
    try:
        db.session.commit()
        return success_response({'action': action}, f'Bookmark {action}')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def rate_resource(id):
    user_id = get_jwt_identity()
    data    = request.get_json()
    rating  = data.get('rating')
    review  = data.get('review', '')

    if not rating or not (1 <= int(rating) <= 5):
        return error_response('Rating must be 1-5', 400)

    existing = ResourceRating.query.filter_by(resource_id=id, user_id=user_id).first()
    if existing:
        existing.rating = rating
        existing.review = review
    else:
        r = ResourceRating(resource_id=id, user_id=user_id, rating=rating, review=review)
        db.session.add(r)
    try:
        db.session.commit()
        resource = SkillResource.query.get(id)
        return success_response({
            'avg_rating'  : resource.get_avg_rating(),
            'rating_count': len(resource.ratings)
        }, 'Rating submitted')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def update_progress(id):
    user_id  = get_jwt_identity()
    data     = request.get_json()
    status   = data.get('status')
    pct      = data.get('progress_pct', 0)

    existing = ResourceProgress.query.filter_by(resource_id=id, user_id=user_id).first()
    if existing:
        existing.status       = status
        existing.progress_pct = pct
        if status == 'completed':
            existing.completed_at = datetime.utcnow()
    else:
        p = ResourceProgress(
            resource_id  = id,
            user_id      = user_id,
            status       = status,
            progress_pct = pct,
            started_at   = datetime.utcnow())
        db.session.add(p)
    try:
        db.session.commit()
        return success_response(None, 'Progress saved')
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

def upload_resource():
    user_id = get_jwt_identity()
    user    = User.query.get(user_id)
    if user.role != 'ngo':
        return error_response('Only NGOs can upload', 403)

    title       = request.form.get('title')
    description = request.form.get('description')
    category_id = request.form.get('category_id')
    res_type    = request.form.get('resource_type')
    skill_tags  = request.form.get('skill_tags')
    difficulty  = request.form.get('difficulty')
    duration    = request.form.get('duration_mins', 0)
    is_featured = request.form.get('is_featured') == 'true'
    content     = request.form.get('content')

    if not all([title, description, category_id, res_type]):
        return error_response('Required fields missing', 400)

    file_url = None
    if 'file' in request.files:
        file = request.files['file']
        if file.filename:
            filename = secure_filename(file.filename)
            # Create upload folder if not exists
            upload_path = current_app.config['UPLOAD_FOLDER']
            if not os.path.exists(upload_path):
                os.makedirs(upload_path)
            
            filepath = os.path.join(upload_path, filename)
            file.save(filepath)
            file_url = f'/uploads/{filename}'

    resource = SkillResource(
        title        = title,
        description  = description,
        content      = content,
        category_id  = int(category_id),
        resource_type= res_type,
        skill_tags   = skill_tags,
        difficulty   = difficulty,
        duration_mins= int(duration),
        file_url     = file_url,
        is_featured  = is_featured,
        uploaded_by  = user_id
    )
    db.session.add(resource)
    try:
        db.session.commit()
        return success_response({'resource': resource.to_dict()}, 'Resource uploaded successfully', 201)
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)
