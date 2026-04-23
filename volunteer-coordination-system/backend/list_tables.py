from app import create_app, db
app = create_app()
with app.app_context():
    result = db.session.execute(db.text("SHOW TABLES"))
    for row in result:
        print(f"Table: {row[0]}")
