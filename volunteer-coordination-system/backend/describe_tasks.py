from app import create_app, db
app = create_app()
with app.app_context():
    result = db.session.execute(db.text("DESCRIBE tasks"))
    for row in result:
        print(f"Column: {row[0]}, Type: {row[1]}, Null: {row[2]}, Key: {row[3]}, Default: {row[4]}, Extra: {row[5]}")
