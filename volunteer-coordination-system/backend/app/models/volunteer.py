from app import db
from datetime import datetime

class Volunteer(db.Model):
    __tablename__ = 'volunteers'

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id        = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'))
    volunteer_code = db.Column(db.String(20), unique=True)
    phone_number   = db.Column(db.String(15))
    skills         = db.Column(db.String(255)) # comma-separated e.g. "Doctor, Driving"
    location       = db.Column(db.String(100))
    availability   = db.Column(db.Enum('Available', 'Busy', 'On Leave'), default='Available')
    match_score    = db.Column(db.Integer, default=0)
    tasks_assigned  = db.Column(db.Integer, default=0)
    tasks_completed = db.Column(db.Integer, default=0)
    people_helped   = db.Column(db.Integer, default=0)
    hours_volunteered = db.Column(db.Integer, default=0)
    notes          = db.Column(db.Text)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('volunteer_profile', uselist=False, cascade='all, delete-orphan'), lazy=True)

    def to_dict(self):
        return {
            'id'               : self.id,
            'user_id'          : self.user_id,
            'volunteer_code'   : self.volunteer_code,
            'name'             : self.user.name if self.user else None,
            'email'            : self.user.email if self.user else None,
            'phone_number'     : self.phone_number,
            'skills'           : self.skills,
            'location'         : self.location,
            'availability'     : self.availability,
            'match_score'      : self.match_score,
            'tasks_assigned'   : self.tasks_assigned,
            'tasks_completed'  : self.tasks_completed,
            'people_helped'    : self.people_helped,
            'hours_volunteered': self.hours_volunteered,
            'notes'            : self.notes
        }

    def __repr__(self):
        return f'<Volunteer {self.id}>'
