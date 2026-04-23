from functools import wraps
from flask import request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.user import User
from app.utils.api_response import error_response

def jwt_required_custom(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user:
                return error_response('User not found', 401)
            g.current_user = user
        except Exception as e:
            return error_response(f'Token invalid or expired: {str(e)}', 401)
        return f(*args, **kwargs)
    return decorated
