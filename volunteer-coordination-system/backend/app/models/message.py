from app import db
from datetime import datetime

class ChatRoom(db.Model):
    __tablename__ = 'chat_rooms'
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    type        = db.Column(db.Enum(
                     'general','urgent',
                     'announcements',
                     'volunteers_only',
                     'location_based',
                     'ngo_community'),
                     default='general')
    location    = db.Column(db.String(100))
    is_active   = db.Column(db.Boolean, default=True)
    created_by  = db.Column(db.Integer, db.ForeignKey('users.id'))
    pin_order   = db.Column(db.Integer, default=0)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

class Message(db.Model):
    __tablename__ = 'messages'
    id            = db.Column(db.Integer, primary_key=True)
    room_id       = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message       = db.Column(db.Text, nullable=False)
    message_type  = db.Column(db.Enum(
                       'text','urgent_alert',
                       'announcement','image','system'),
                       default='text')
    image_url     = db.Column(db.String(255))
    reply_to_id   = db.Column(db.Integer, db.ForeignKey('messages.id'))
    is_edited     = db.Column(db.Boolean, default=False)
    is_deleted    = db.Column(db.Boolean, default=False)
    urgency_level = db.Column(db.Enum(
                       'normal','high','critical'),
                       default='normal')
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='messages', lazy=True)

class MessageReaction(db.Model):
    __tablename__ = 'message_reactions'
    id         = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    emoji      = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('message_id', 'user_id', 'emoji', name='unique_reaction'),
    )
