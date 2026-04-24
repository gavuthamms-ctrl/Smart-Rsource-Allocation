from dotenv import load_dotenv
import os
load_dotenv()

class Config:
    SECRET_KEY                  = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY              = os.getenv('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES    = 86400
    SQLALCHEMY_DATABASE_URI     = os.getenv('SQLALCHEMY_DATABASE_URI')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS   = {
        'pool_pre_ping'  : True,
        'pool_recycle'   : 3600,
        'pool_size'      : 5,
        'max_overflow'   : 10,
        'connect_args'   : {
            'ssl_disabled': True
        }
    }
    UPLOAD_FOLDER        = os.getenv('UPLOAD_FOLDER', 'uploads/')
    MAX_CONTENT_LENGTH   = int(os.getenv('MAX_CONTENT_LENGTH', 16777216))