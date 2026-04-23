from flask import Blueprint
from app.controllers import resource_controller
from flask_jwt_extended import jwt_required

resource_bp = Blueprint('resource_bp', __name__)

@resource_bp.route('', methods=['GET'])
@jwt_required()
def get_resources():
    return resource_controller.get_resources()

@resource_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    return resource_controller.get_stats()

@resource_bp.route('/categories', methods=['GET'])
def get_categories():
    return resource_controller.get_categories()

@resource_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_one(id):
    return resource_controller.get_one(id)

@resource_bp.route('/<int:id>/quiz', methods=['GET'])
@jwt_required()
def get_quiz(id):
    return resource_controller.get_quiz(id)

@resource_bp.route('/<int:id>/view', methods=['POST'])
@jwt_required()
def increment_view(id):
    return resource_controller.increment_view(id)

@resource_bp.route('/<int:id>/download', methods=['POST'])
@jwt_required()
def increment_download(id):
    return resource_controller.increment_download(id)

@resource_bp.route('/<int:id>/bookmark', methods=['POST'])
@jwt_required()
def toggle_bookmark(id):
    return resource_controller.toggle_bookmark(id)

@resource_bp.route('/<int:id>/rate', methods=['POST'])
@jwt_required()
def rate_resource(id):
    return resource_controller.rate_resource(id)

@resource_bp.route('/<int:id>/progress', methods=['POST'])
@jwt_required()
def update_progress(id):
    return resource_controller.update_progress(id)

@resource_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_resource():
    return resource_controller.upload_resource()
