import pymysql
pymysql.install_as_MySQLdb()
from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    port  = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True') == 'True'
    print(f"Starting Smart Resource Allocation API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
