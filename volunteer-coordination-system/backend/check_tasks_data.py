from app import create_app, db
app = create_app()
with app.app_context():
    result = db.session.execute(db.text("SELECT count(*) FROM tasks"))
    count = result.fetchone()[0]
    print(f"Total tasks in DB: {count}")
    
    if count > 0:
        result = db.session.execute(db.text("SELECT id, title, location, required_skills FROM tasks LIMIT 5"))
        for row in result:
            print(f"ID: {row[0]}, Title: {row[1]}, Location: {row[2]}, Skills: {row[3]}")
