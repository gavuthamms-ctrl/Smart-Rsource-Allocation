from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS

db      = SQLAlchemy()
migrate = Migrate()
jwt     = JWTManager()
bcrypt  = Bcrypt()

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET","POST","PUT","DELETE"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Import models so SQLAlchemy knows about them
    from app.models.user import User
    from app.models.volunteer import Volunteer
    from app.models.message import ChatRoom, Message, MessageReaction
    from app.models.community_member import CommunityMember

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.volunteer_routes import volunteer_bp
    from app.routes.chat_routes import chat_bp
    from app.routes.resource_routes import resource_bp
    from app.routes.profile_routes import profile_bp
    from app.routes.ngo_routes import ngo_bp
    from app.routes.community_routes import community_bp
    
    app.register_blueprint(auth_bp,       url_prefix='/api/auth')
    app.register_blueprint(volunteer_bp,  url_prefix='/api/volunteers')
    app.register_blueprint(chat_bp,       url_prefix='/api/chat')
    app.register_blueprint(resource_bp,   url_prefix='/api/resources')
    app.register_blueprint(profile_bp,    url_prefix='/api/profile')
    app.register_blueprint(ngo_bp,        url_prefix='/api/ngo')
    app.register_blueprint(community_bp,  url_prefix='/api/community')

    # Import models for SQLAlchemy auto-creation (if needed)
    from app.models.resource import SkillResource, ResourceCategory

    # Auto-create tables on startup
    with app.app_context():
        db.create_all()
        print("Database connected. Tables verified.")

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

    return app
