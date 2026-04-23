from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Initialize DB (global)
db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # 1. Database Config (Example)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost/volunteer_db'
    db.init_app(app)

    # 2. IMPORTANT: Import and Register your Chat Blueprint
    from app.routes.chat_routes import chat_bp
    app.register_blueprint(chat_bp)

    # Add a root route so the homepage doesn't show 404
    @app.route('/')
    def index():
        return {"status": "success", "message": "Volunteer API is active"}

    return app