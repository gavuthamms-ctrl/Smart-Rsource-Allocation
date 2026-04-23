from app import create_app, db
from sqlalchemy import text
import json

app = create_app()
with app.app_context():
    tables = ['users', 'volunteers', 'ngos', 'tasks', 'task_assignments', 'community_members', 'activity_logs']
    results = {}
    for t in tables:
        try:
            count = db.session.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            results[t] = count
        except Exception as e:
            results[t] = str(e)
    
    # Also check if Gavutham has an organization
    try:
        gav = db.session.execute(text("SELECT id FROM users WHERE email='Gavutham@gmail.com'")).scalar()
        if gav:
            org = db.session.execute(text(f"SELECT id, ngo_name FROM ngos WHERE user_id={gav}")).first()
            results['gav_org'] = dict(org._mapping) if org else "None"
        else:
            results['gav_org'] = "User Not Found"
    except Exception as e:
        results['gav_org_error'] = str(e)

    print(json.dumps(results, indent=2))
