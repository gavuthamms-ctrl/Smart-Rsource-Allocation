from app import create_app, db
from app.models.user import User
from app.models.volunteer import Volunteer

app = create_app()
with app.app_context():
    # Force drop and recreate tables to match EXACT schema
    db.session.execute(db.text("SET FOREIGN_KEY_CHECKS = 0;"))
    db.drop_all()
    db.session.execute(db.text("SET FOREIGN_KEY_CHECKS = 1;"))
    db.create_all()
    
    # 1. Dharun
    user1 = User(name='Dharun', email='dharun@gmail.com', password='Dharun@123', role='volunteer')
    db.session.add(user1)
    db.session.commit()
    vol1 = Volunteer(user_id=user1.id, phone_number='1234567890', skills='Doctor, Driving', location='Palladam', availability='Available')
    db.session.add(vol1)
    
    # 2. Annamalai
    user2 = User(name='Annamalai', email='Annamalai@gmail.com', password='Annamalai@123', role='volunteer')
    db.session.add(user2)
    db.session.commit()
    vol2 = Volunteer(user_id=user2.id, phone_number='0987654321', skills='Counselling, Electrical Work', location='Ukkadam', availability='Busy')
    db.session.add(vol2)
    
    # 3. Deenadhayalan
    user3 = User(name='Deenadhayalan', email='Deenadhayalan@gmail.com', password='Deena@123', role='volunteer')
    db.session.add(user3)
    db.session.commit()
    vol3 = Volunteer(user_id=user3.id, phone_number='1122334455', skills='Water Treatment, Road Work', location='Peelamedu', availability='Available')
    db.session.add(vol3)
    
    # 4. Gavutham (NGO Admin)
    user4 = User(name='Gavutham', email='Gavutham@gmail.com', password='Gavutham@123', role='ngo')
    db.session.add(user4)
    db.session.commit()
    
    # Existing NGO Admin for backup
    user5 = User(name='NGO Admin', email='ngo@gmail.com', password='Admin@123', role='ngo')
    db.session.add(user5)
    
    db.session.commit()
    print("Database reset and seeded with EXACT user data.")
