from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers import ngo_controller

ngo_bp = Blueprint('ngo', __name__)

# Dashboard routes
@ngo_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    return ngo_controller.get_dashboard_stats()

@ngo_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_ngo_profile():
    return ngo_controller.get_ngo_profile()

@ngo_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_ngo_profile():
    return ngo_controller.update_ngo_profile()

@ngo_bp.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    return ngo_controller.get_recent_activity()

@ngo_bp.route('/pending-reports', methods=['GET'])
@jwt_required()
def get_pending_reports():
    return ngo_controller.get_pending_reports()

# Volunteer management
@ngo_bp.route('/volunteers', methods=['GET'])
@jwt_required()
def get_volunteers():
    return ngo_controller.get_volunteers()

@ngo_bp.route('/volunteers/create', methods=['POST'])
@jwt_required()
def create_volunteer():
    return ngo_controller.create_volunteer()

# Task management
@ngo_bp.route('/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    return ngo_controller.get_tasks()

@ngo_bp.route('/tasks/create', methods=['POST'])
@jwt_required()
def create_task():
    return ngo_controller.create_task()

@ngo_bp.route('/tasks/assignments/<int:assignment_id>/approve', methods=['PUT'])
@jwt_required()
def approve_report(assignment_id):
    return ngo_controller.approve_report(assignment_id)

@ngo_bp.route('/tasks/assignments/<int:assignment_id>/reject', methods=['PUT'])
@jwt_required()
def reject_report(assignment_id):
    return ngo_controller.reject_report(assignment_id)

# Community needs
@ngo_bp.route('/community-needs', methods=['GET'])
@jwt_required()
def get_community_needs():
    return ngo_controller.get_community_needs()

@ngo_bp.route('/community/<int:need_id>/resolve', methods=['PUT'])
@jwt_required()
def resolve_community_need(need_id):
    return ngo_controller.resolve_community_need(need_id)

# Reports & Analytics
@ngo_bp.route('/reports/stats', methods=['GET'])
@jwt_required()
def get_report_stats():
    return ngo_controller.get_report_stats()

@ngo_bp.route('/reports/preview', methods=['GET'])
@jwt_required()
def get_report_preview():
    return ngo_controller.get_report_preview()

@ngo_bp.route('/reports/generate', methods=['GET'])
@jwt_required()
def generate_report():
    return ngo_controller.generate_report()

# Notifications & Broadcasts
@ngo_bp.route('/broadcast-notification', methods=['POST'])
@jwt_required()
def broadcast_notification():
    return ngo_controller.broadcast_notification()

@ngo_bp.route('/send-urgent-notification', methods=['POST'])
@jwt_required()
def send_urgent_notification():
    return ngo_controller.send_urgent_alert()

@ngo_bp.route('/matching-volunteers', methods=['GET'])
@jwt_required()
def get_matching_volunteers():
    return ngo_controller.get_matching_volunteers()
