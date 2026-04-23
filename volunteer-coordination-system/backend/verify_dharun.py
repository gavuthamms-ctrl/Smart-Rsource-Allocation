from app import create_app, db
from app.models.user import User
from app.models.volunteer import Volunteer

app = create_app()
with app.app_context():
    user = User.query.filter_by(email='dharun@gmail.com').first()
    if user:
        print(f"User: {user.email}")
        print(f"Role: {user.role}")
        print(f"Password stored: '{user.password}'")
        v = Volunteer.query.filter_by(user_id=user.id).first()
        if v:
            print(f"Volunteer Profile found: {v.id}")
            print(f"First Name: {v.first_name}")
            print(f"Skills: {v.skills}")
    else:
        print("User not found in DB")
