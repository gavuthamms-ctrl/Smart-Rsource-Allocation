from app import db
from datetime import datetime

class Task(db.Model):
    __tablename__ = 'tasks'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title           = db.Column(db.String(255), nullable=False)
    description     = db.Column(db.Text, nullable=False)
    required_skills = db.Column(db.String(255), nullable=False, index=True)
    location        = db.Column(db.String(100), nullable=False, index=True)
    priority        = db.Column(db.Enum('Low', 'Medium', 'High', 'Critical'), default='Medium', index=True)
    status          = db.Column(db.Enum('Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled'), default='Open', index=True)
    ngo_id          = db.Column(db.Integer, index=True) # Linked to ngos table
    due_date        = db.Column(db.Date)
    latitude        = db.Column(db.Numeric(10, 8))
    longitude       = db.Column(db.Numeric(11, 8))
    people_needed   = db.Column(db.Integer, default=1)
    people_helped   = db.Column(db.Integer, default=0)
    is_new          = db.Column(db.Boolean, default=True, index=True)
    match_percentage = db.Column(db.Integer, default=0)
    posted_ago      = db.Column(db.String(50), default='Just now')
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id'              : self.id,
            'title'           : self.title,
            'description'     : self.description,
            'required_skills' : self.required_skills,
            'location'        : self.location,
            'priority'        : self.priority,
            'status'          : self.status,
            'ngo_id'          : self.ngo_id,
            'due_date'        : self.due_date.strftime('%Y-%m-%d') if self.due_date else None,
            'people_needed'   : self.people_needed,
            'people_helped'   : self.people_helped,
            'is_new'          : bool(self.is_new),
            'match_percentage': self.match_percentage,
            'posted_ago'      : self.posted_ago,
            'created_at'      : self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Task {self.id}: {self.title}>'
