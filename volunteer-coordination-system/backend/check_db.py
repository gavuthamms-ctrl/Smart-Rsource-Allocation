from app import create_app, db
from sqlalchemy import inspect
import os

app = create_app()
with app.app_context():
    inst = inspect(db.engine)
    output = []
    for table_name in inst.get_table_names():
        output.append(f"Table: {table_name}")
        for column in inst.get_columns(table_name):
            output.append(f"  - {column['name']} ({column['type']})")
    
    with open('db_schema.txt', 'w') as f:
        f.write("\n".join(output))
print("Schema written to db_schema.txt")
