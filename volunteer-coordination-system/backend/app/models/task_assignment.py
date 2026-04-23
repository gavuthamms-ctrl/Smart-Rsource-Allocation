from app import db
from datetime import datetime

class TaskAssignment(db.Model):
    __tablename__ = 'task_assignments'

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    task_id        = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    volunteer_id   = db.Column(db.Integer, db.ForeignKey('volunteers.id', ondelete='CASCADE'), nullable=False)
    status         = db.Column(db.Enum('To Do', 'In Progress', 'Pending Review', 'Completed', 'Cancelled'), default='To Do')
    accepted_at    = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at   = db.Column(db.DateTime)
    field_notes    = db.Column(db.Text)
    people_helped  = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'volunteer_id': self.volunteer_id,
            'status': self.status,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'field_notes': self.field_notes,
            'people_helped': self.people_helped
        }
