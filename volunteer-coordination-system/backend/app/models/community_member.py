from app import db
from datetime import datetime

class CommunityMember(db.Model):
    __tablename__ = 'community_members'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'))
    phone_number = db.Column(db.String(20))
    address      = db.Column(db.String(255))
    city         = db.Column(db.String(100))
    needs        = db.Column(db.Text)
    priority     = db.Column(db.Enum('Low', 'Medium', 'High', 'Critical'), default='Low')
    status       = db.Column(db.Enum('Open', 'In Progress', 'Resolved'), default='Open')
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref=db.backref('community_profile', uselist=False, cascade='all, delete-orphan'), lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.user.name if self.user else None,
            'phone_number': self.phone_number,
            'address': self.address,
            'city': self.city,
            'needs': self.needs,
            'priority': self.priority,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<CommunityMember {self.id}>'
