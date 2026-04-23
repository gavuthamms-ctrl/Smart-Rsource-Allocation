from flask import Blueprint
from app.controllers.chat_controller import (
    get_all_rooms,
    get_room_messages,
    send_message,
    toggle_reaction,
    get_online_members,
    get_pinned_messages
)
from flask_jwt_extended import jwt_required

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/rooms', methods=['GET'])
@jwt_required()
def rooms():
    return get_all_rooms()

@chat_bp.route('/rooms/<int:room_id>/messages',
               methods=['GET'])
@jwt_required()
def room_messages(room_id):
    return get_room_messages(room_id)

@chat_bp.route('/messages', methods=['POST'])
@jwt_required()
def messages():
    return send_message()

@chat_bp.route('/messages/<int:message_id>/react',
               methods=['POST'])
@jwt_required()
def react(message_id):
    return toggle_reaction(message_id)

@chat_bp.route('/members', methods=['GET'])
@jwt_required()
def members():
    return get_online_members()

@chat_bp.route('/pinned', methods=['GET'])
@jwt_required()
def pinned():
    return get_pinned_messages()
