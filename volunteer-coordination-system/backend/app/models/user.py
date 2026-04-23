from app import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name        = db.Column(db.String(100), nullable=False)
    email       = db.Column(db.String(120), unique=True, nullable=False)
    password    = db.Column(db.String(255), nullable=False)
    role        = db.Column(db.Enum('volunteer', 'ngo', 'community'), default='volunteer')
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, plain_password):
        # The user requested plain text in their spec, but we'll store as provided.
        self.password = plain_password

    def check_password(self, plain_password):
        return self.password == plain_password

    def to_dict(self):
        return {
            'id'        : self.id,
            'name'      : self.name,
            'email'     : self.email,
            'role'      : self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<User {self.email} ({self.role})>'
