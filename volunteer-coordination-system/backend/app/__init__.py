from flask import Flask, jsonify, render_template
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
    app = Flask(__name__, 
                static_folder='static',
                static_url_path='/',
                template_folder='templates')
    app.config.from_object('app.config.Config')

    # Override engine options to fix Aiven SSL issue
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping'  : True,
        'pool_recycle'   : 3600,
        'pool_size'      : 5,
        'max_overflow'   : 10,
        'connect_args'   : {
            'ssl_disabled': True
        }
    }

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
    from app.routes.profile_routes import profile_bp
    from app.routes.ngo_routes import ngo_bp
    from app.routes.community_routes import community_bp
    
    app.register_blueprint(auth_bp,       url_prefix='/api/auth')
    app.register_blueprint(volunteer_bp,  url_prefix='/api/volunteers')
    app.register_blueprint(chat_bp,       url_prefix='/api/chat')
    app.register_blueprint(profile_bp,    url_prefix='/api/profile')
    app.register_blueprint(ngo_bp,        url_prefix='/api/ngo')
    app.register_blueprint(community_bp,  url_prefix='/api/community')

    # Auto-create tables on startup
    with app.app_context():
        try:
            db.create_all()
            print("Database connected. Tables verified.")
        except Exception as e:
            print(f"Database connection error: {e}")

    # Frontend routes
    @app.route('/')
    def index():
        from flask import redirect
        return redirect('/pages/login.html')

    @app.route('/pages/<path:path>')
    def serve_pages(path):
        return render_template(f'pages/{path}')

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

    return app