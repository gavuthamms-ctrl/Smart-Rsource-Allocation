from functools import wraps
from flask import g
from app.utils.api_response import error_response

def require_role(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                return error_response('Authentication required', 401)
            if user.role not in allowed_roles:
                return error_response(
                    f'Access denied. Required roles: {list(allowed_roles)}', 403
                )
            return f(*args, **kwargs)
        return decorated
    return decorator
