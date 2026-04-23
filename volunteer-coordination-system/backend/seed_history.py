from app import create_app, db
from app.models.volunteer import Volunteer
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from datetime import datetime, timedelta

app = create_app()
with app.app_context():
    # 1. Update Dharun's Profile
    dharun = Volunteer.query.filter(Volunteer.user_id == 1).first() # Assuming ID 1 is Dharun
    if not dharun:
        print("Dharun not found")
    else:
        dharun.tasks_assigned = 15
        dharun.tasks_completed = 12
        dharun.people_helped = 124
        dharun.hours_volunteered = 42
        
        # 2. Add some assignments
        # Task 1 (Medical Camp)
        a1 = TaskAssignment(
            task_id=1, volunteer_id=dharun.id, status='In Progress',
            accepted_at=datetime.utcnow() - timedelta(days=1)
        )
        
        # Task 7 (Home Visit)
        a2 = TaskAssignment(
            task_id=7, volunteer_id=dharun.id, status='Completed',
            accepted_at=datetime.utcnow() - timedelta(days=10),
            completed_at=datetime.utcnow() - timedelta(days=5),
            field_notes="Visited patients, gave advice.",
            people_helped=3
        )

        db.session.add(a1)
        db.session.add(a2)
        db.session.commit()
        print("Data seeded for Dharun's history")
