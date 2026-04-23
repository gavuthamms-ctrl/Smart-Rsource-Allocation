from flask import Blueprint
from app.controllers import profile_controller

profile_bp = Blueprint('profile_bp', __name__)

@profile_bp.route('/me', methods=['GET'])
def get_me():
    return profile_controller.get_profile()

@profile_bp.route('/me', methods=['PUT'])
def update_me():
    return profile_controller.update_profile()
