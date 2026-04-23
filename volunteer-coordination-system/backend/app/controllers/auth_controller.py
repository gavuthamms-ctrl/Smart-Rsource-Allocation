from flask import request, g
from datetime import datetime
from flask_jwt_extended import create_access_token
from app import db
from app.models.user import User
from app.models.volunteer import Volunteer
from app.utils.api_response import success_response, error_response
from app.middleware.auth_middleware import jwt_required_custom
import re

def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not email or not password or not role:
        return error_response('Missing required fields', 400)

    user = User.query.filter_by(email=email).first()
    if not user:
        return error_response('User not found', 404)

    if user.role != role:
        return error_response('Role mismatch', 403)

    if user.password != password:
        return error_response('Wrong password', 401)

    db.session.commit()

    token = create_access_token(identity=str(user.id))
    
    volunteer_info = None
    if user.role == 'volunteer':
        v = Volunteer.query.filter_by(user_id=user.id).first()
        if v:
            volunteer_info = v.to_dict()

    return success_response({
        'token': token,
        'user' : user.to_dict(),
        'volunteer': volunteer_info
    }, 'Login successful', 200)

def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    first_name = data.get('first_name')
    last_name = data.get('last_name')

    if not email or not password or not role or not first_name or not last_name:
        return error_response('Missing required fields', 400)

    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return error_response('Invalid email format', 400)

    if len(password) < 6:
        return error_response('Password must be at least 6 characters', 400)

    if User.query.filter_by(email=email).first():
        return error_response('Email already registered', 409)

    user = User()
    user.email = email
    user.name = f"{first_name} {last_name}"
    user.role = role
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()

        if role == 'volunteer':
            volunteer = Volunteer()
            volunteer.first_name = first_name
            volunteer.last_name  = last_name
            volunteer.email      = email
            volunteer.user_id    = user.id
            volunteer.set_skills_list([])
            db.session.add(volunteer)
            db.session.commit()
            volunteer.volunteer_code = volunteer.generate_volunteer_code(volunteer.id)
            db.session.commit()

        return success_response({'user': user.to_dict()}, 'Registered successfully', 201)
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

@jwt_required_custom
def logout():
    return success_response(None, 'Logged out successfully', 200)

@jwt_required_custom
def get_me():
    user = g.current_user
    return success_response({'user': user.to_dict()})
