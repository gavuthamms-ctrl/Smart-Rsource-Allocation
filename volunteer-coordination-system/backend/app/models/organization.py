from app import db
from datetime import datetime

class Organization(db.Model):
    __tablename__ = 'ngos'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'))
    ngo_name     = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(20))
    address      = db.Column(db.String(255))
    city         = db.Column(db.String(100))
    focus_area   = db.Column(db.String(100))
    website      = db.Column(db.String(255))
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'ngo_name': self.ngo_name,
            'phone_number': self.phone_number,
            'address': self.address,
            'city': self.city,
            'focus_area': self.focus_area,
            'website': self.website
        }
