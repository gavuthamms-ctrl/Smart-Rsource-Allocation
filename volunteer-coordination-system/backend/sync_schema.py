from app import create_app, db
import sqlalchemy

app = create_app()
with app.app_context():
    # 1. Update Volunteers Table
    db.session.execute(db.text("""
        ALTER TABLE volunteers 
        ADD COLUMN IF NOT EXISTS volunteer_code VARCHAR(20) UNIQUE AFTER user_id,
        ADD COLUMN IF NOT EXISTS tasks_assigned INT DEFAULT 0 AFTER match_score,
        ADD COLUMN IF NOT EXISTS tasks_completed INT DEFAULT 0 AFTER tasks_assigned,
        ADD COLUMN IF NOT EXISTS people_helped INT DEFAULT 0 AFTER tasks_completed,
        ADD COLUMN IF NOT EXISTS hours_volunteered INT DEFAULT 0 AFTER people_helped
    """))
    
    # 2. Update NGOs Table (renaming columns if necessary or adding)
    # The user said EXACT structure: id, user_id, ngo_name, phone_number, address, city, focus_area, website
    try:
        db.session.execute(db.text("ALTER TABLE ngos CHANGE COLUMN name ngo_name VARCHAR(255)"))
    except: pass
    
    db.session.execute(db.text("""
        ALTER TABLE ngos
        ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) AFTER ngo_name,
        ADD COLUMN IF NOT EXISTS address VARCHAR(255) AFTER phone_number,
        ADD COLUMN IF NOT EXISTS city VARCHAR(100) AFTER address,
        ADD COLUMN IF NOT EXISTS focus_area VARCHAR(100) AFTER city,
        ADD COLUMN IF NOT EXISTS website VARCHAR(255) AFTER focus_area
    """))

    # 3. Activity Logs Table
    db.session.execute(db.text("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            volunteer_id INT,
            type VARCHAR(50),
            message VARCHAR(255),
            related_task_id INT,
            time_ago VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE
        )
    """))

    # 4. Task Assignments Table
    db.session.execute(db.text("""
        CREATE TABLE IF NOT EXISTS task_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            task_id INT,
            volunteer_id INT,
            status ENUM('To Do', 'In Progress', 'Pending Review', 'Completed', 'Cancelled') DEFAULT 'To Do',
            accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            field_notes TEXT,
            people_helped INT DEFAULT 0,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE
        )
    """))

    db.session.commit()
    print("Database schema synchronized successfully.")
