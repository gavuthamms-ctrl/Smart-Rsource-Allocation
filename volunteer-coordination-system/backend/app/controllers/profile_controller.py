from flask import request, g
from app import db
from app.models.user import User
from app.models.volunteer import Volunteer
from app.utils.api_response import success_response, error_response
from app.middleware.auth_middleware import jwt_required_custom

@jwt_required_custom
def get_profile():
    user = g.current_user
    volunteer = Volunteer.query.filter_by(user_id=user.id).first()
    
    profile_data = user.to_dict()
    if volunteer:
        profile_data.update(volunteer.to_dict())
    
    return success_response(profile_data, 'Profile fetched successfully')

@jwt_required_custom
def update_profile():
    user = g.current_user
    data = request.get_json()
    
    name         = data.get('name')
    phone_number = data.get('phone_number')
    skills       = data.get('skills')
    location     = data.get('location')
    availability = data.get('availability')

    try:
        # Update User table
        if name:
            user.name = name
        
        # Update Volunteer table
        volunteer = Volunteer.query.filter_by(user_id=user.id).first()
        if volunteer:
            if phone_number is not None:
                volunteer.phone_number = phone_number
            if skills is not None:
                volunteer.skills = skills
            if location is not None:
                volunteer.location = location
            if availability is not None:
                volunteer.availability = availability
        
        db.session.commit()
        
        # Fetch fresh data to return
        updated_data = user.to_dict()
        if volunteer:
            updated_data.update(volunteer.to_dict())
            
        return success_response(updated_data, 'Profile updated successfully')
        
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)
