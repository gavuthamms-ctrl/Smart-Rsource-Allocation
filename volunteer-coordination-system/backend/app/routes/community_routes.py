from flask import Blueprint
import app.controllers.community_controller as community_controller
from flask_jwt_extended import jwt_required

community_bp = Blueprint('community', __name__)

@community_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    return community_controller.get_profile()

@community_bp.route('/nearby-volunteers', methods=['GET'])
@jwt_required()
def get_nearby_volunteers():
    return community_controller.get_nearby_volunteers()

@community_bp.route('/area-tasks', methods=['GET'])
@jwt_required()
def get_area_tasks():
    return community_controller.get_area_tasks()

@community_bp.route('/announcements', methods=['GET'])
@jwt_required()
def get_announcements():
    return community_controller.get_announcements()

@community_bp.route('/volunteers', methods=['GET'])
@jwt_required()
def get_volunteers():
    return community_controller.get_volunteers()

@community_bp.route('/request-volunteer', methods=['POST'])
@jwt_required()
def request_volunteer():
    return community_controller.request_volunteer()

@community_bp.route('/update-need', methods=['PUT'])
@jwt_required()
def update_need():
    return community_controller.update_need()

@community_bp.route('/resolve-need', methods=['PUT'])
@jwt_required()
def resolve_need():
    return community_controller.resolve_need()

@community_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    return community_controller.update_profile()

@community_bp.route('/dashboard-stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    return community_controller.get_dashboard_stats()
