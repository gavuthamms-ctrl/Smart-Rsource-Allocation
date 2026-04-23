import pymysql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def apply_sql(filename):
    # Get DB connection info from .env
    host     = os.getenv('DB_HOST', 'localhost')
    port     = int(os.getenv('DB_PORT', 3306))
    user     = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    db_name  = os.getenv('DB_NAME', 'volunteer_db')

    try:
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=db_name,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS
        )
        print(f"Connected to database: {db_name}")

        with connection.cursor() as cursor:
            # Read SQL file
            sql_path = os.path.join(os.path.dirname(__file__), '..', 'database', filename)
            with open(sql_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Execute SQL
            print(f"Executing {filename}...")
            cursor.execute(sql_content)
            connection.commit()
            print("SQL executed successfully.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()
            print("Connection closed.")

if __name__ == "__main__":
    apply_sql('init_resources_db.sql')
