from app import db
from datetime import datetime

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'))
    volunteer_id    = db.Column(db.Integer, db.ForeignKey('volunteers.id', ondelete='CASCADE'))
    type            = db.Column(db.String(50)) # e.g. 'task_accepted', 'task_completed'
    message         = db.Column(db.String(255))
    related_task_id = db.Column(db.Integer)
    time_ago        = db.Column(db.String(50))
    is_read         = db.Column(db.Boolean, default=False)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'volunteer_id': self.volunteer_id,
            'type': self.type,
            'message': self.message,
            'related_task_id': self.related_task_id,
            'time_ago': self.time_ago,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }
