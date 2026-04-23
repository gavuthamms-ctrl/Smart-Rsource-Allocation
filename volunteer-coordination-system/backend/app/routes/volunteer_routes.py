from flask import Blueprint
import app.controllers.volunteer_controller as volunteer_controller

volunteer_bp = Blueprint('volunteer', __name__)

volunteer_bp.route('',            methods=['GET'])(volunteer_controller.get_all)
volunteer_bp.route('/stats',      methods=['GET'])(volunteer_controller.get_stats)
volunteer_bp.route('/<int:id>',   methods=['GET'])(volunteer_controller.get_one)
volunteer_bp.route('',            methods=['POST'])(volunteer_controller.create)
volunteer_bp.route('/<int:id>',   methods=['PUT'])(volunteer_controller.update)
volunteer_bp.route('/<int:id>',   methods=['DELETE'])(volunteer_controller.delete)

# Volunteer Dashboard Specific Routes
volunteer_bp.route('/me',              methods=['GET'])(volunteer_controller.get_my_profile)
volunteer_bp.route('/me/stats',        methods=['GET'])(volunteer_controller.get_my_stats)
volunteer_bp.route('/me/tasks',        methods=['GET'])(volunteer_controller.get_my_tasks)
volunteer_bp.route('/me/task-history', methods=['GET'])(volunteer_controller.get_my_task_history)
volunteer_bp.route('/me/activity',      methods=['GET'])(volunteer_controller.get_my_activity)
volunteer_bp.route('/me/notifications', methods=['GET'])(volunteer_controller.get_my_notifications)
volunteer_bp.route('/me/notifications/read', methods=['PUT'])(volunteer_controller.mark_notifications_read)
volunteer_bp.route('/availability',    methods=['PUT'])(volunteer_controller.update_availability)

# Task Specific
volunteer_bp.route('/tasks/recommended', methods=['GET'])(volunteer_controller.get_recommended_tasks)
volunteer_bp.route('/tasks/accept',      methods=['POST'])(volunteer_controller.accept_task)
volunteer_bp.route('/tasks/report',      methods=['POST'])(volunteer_controller.submit_field_report)
volunteer_bp.route('/assignments/status', methods=['PUT'])(volunteer_controller.update_assignment_status)
