from app import create_app, db
app = create_app()
with app.app_context():
    result = db.session.execute(db.text("DESCRIBE ngos"))
    for row in result:
        print(f"Column: {row[0]}, Type: {row[1]}")
