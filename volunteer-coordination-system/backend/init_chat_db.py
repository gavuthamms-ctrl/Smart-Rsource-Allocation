from app import create_app, db
from sqlalchemy import text
import os

app = create_app()

sql_commands = [
    """
    CREATE TABLE IF NOT EXISTS chat_rooms (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        type        ENUM(
                        'general',
                        'urgent',
                        'announcements',
                        'volunteers_only',
                        'location_based',
                        'ngo_community'
                    ) DEFAULT 'general',
        location    VARCHAR(100),
        is_active   BOOLEAN DEFAULT TRUE,
        created_by  INT,
        pin_order   INT DEFAULT 0,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by)
            REFERENCES users(id) ON DELETE SET NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS messages (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        room_id         INT NOT NULL,
        user_id         INT NOT NULL,
        message         TEXT NOT NULL,
        message_type    ENUM(
                            'text',
                            'urgent_alert',
                            'announcement',
                            'image',
                            'system'
                        ) DEFAULT 'text',
        image_url       VARCHAR(255),
        reply_to_id     INT,
        is_edited       BOOLEAN DEFAULT FALSE,
        is_deleted      BOOLEAN DEFAULT FALSE,
        urgency_level   ENUM('normal','high','critical')
                        DEFAULT 'normal',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id)
            REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)
            REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_id)
            REFERENCES messages(id) ON DELETE SET NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS message_reactions (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        user_id    INT NOT NULL,
        emoji      VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_reaction (message_id, user_id, emoji),
        FOREIGN KEY (message_id)
            REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)
            REFERENCES users(id) ON DELETE CASCADE
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS chat_room_members (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        room_id   INT NOT NULL,
        user_id   INT NOT NULL,
        last_read TIMESTAMP,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_member (room_id, user_id),
        FOREIGN KEY (room_id)
            REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)
            REFERENCES users(id) ON DELETE CASCADE
    );
    """,
    # INSERT DEFAULT CHAT ROOMS
    """
    INSERT IGNORE INTO chat_rooms
        (id, name, description, type, location, pin_order, created_by)
    VALUES
    (1, '🌐 General Community', 'Open discussion for everyone — volunteers, NGOs, and community members', 'general', NULL, 1, 4),
    (2, '🚨 Urgent Alerts', 'Post critical emergencies and urgent needs here. All members are notified immediately.', 'urgent', NULL, 2, 4),
    (3, '📢 NGO Announcements', 'Official announcements from NGOs to all volunteers and community members', 'announcements', NULL, 3, 4),
    (4, '🙋 Volunteers Hub', 'Exclusive space for volunteers to coordinate, share tips, and support each other', 'volunteers_only', NULL, 4, 4),
    (5, '📍 Palladam Local', 'Local chat for volunteers and community members in Palladam area', 'location_based', 'Palladam', 5, 4),
    (6, '📍 Ukkadam Local', 'Local chat for volunteers and community members in Ukkadam area', 'location_based', 'Ukkadam', 6, 4),
    (7, '📍 Peelamedu Local', 'Local chat for volunteers and community members in Peelamedu area', 'location_based', 'Peelamedu', 7, 4),
    (8, '🤝 NGO ↔ Community', 'Direct channel between NGOs and community members to discuss needs and resources', 'ngo_community', NULL, 8, 4);
    """,
    # INSERT SAMPLE MESSAGES
    """
    INSERT IGNORE INTO messages
        (room_id, user_id, message, message_type, urgency_level)
    VALUES
    (1, 4, 'Welcome everyone to the SmartResource Community Chatbox! This is your space to coordinate, communicate, and make an impact together. 🤝', 'announcement', 'normal'),
    (1, 1, 'Hi everyone! Dharun here — doctor from Palladam. Happy to help with any medical queries in the area!', 'text', 'normal'),
    (1, 5, 'Hello! I am Prasanna from Palladam. My father needs a doctor for a home visit. Can anyone help?', 'text', 'normal'),
    (1, 1, 'Hi Prasanna! I can help. Please share the details and I will visit tomorrow morning.', 'text', 'normal'),
    (1, 2, 'Annamalai here — electrical technician from Ukkadam. If anyone needs electrical repairs, please reach out!', 'text', 'normal'),
    (1, 6, 'The community hall in Ukkadam has a power outage. We need urgent help!', 'text', 'high'),
    (1, 2, 'I saw the alert — I am on my way to Ukkadam community hall right now.', 'text', 'normal'),
    (1, 3, 'Deenadhayalan here. Water levels near Peelamedu bus stand are rising. Monitoring the situation.', 'text', 'normal'),
    (2, 6, '🚨 URGENT: Complete power failure at Ukkadam Community Hall. 200+ residents affected. Need electrician IMMEDIATELY.', 'urgent_alert', 'critical'),
    (2, 2, '✅ RESPONDING: Annamalai (Electrician, Ukkadam) is on the way. ETA 20 minutes.', 'text', 'normal'),
    (2, 5, '🚨 URGENT: Elderly man collapsed near Palladam market. Need medical help NOW. Location: Near Palladam Bus Stand.', 'urgent_alert', 'critical'),
    (2, 1, '✅ RESPONDING: Dr. Dharun responding. On my way. Call 8220302457 for updates.', 'text', 'normal'),
    (2, 7, '⚠️ HIGH ALERT: Road near Peelamedu school badly damaged after rain. School reopens Monday. Urgent repair needed.', 'urgent_alert', 'high'),
    (2, 3, '✅ RESPONDING: Deenadhayalan (Road Work) will assess damage tomorrow morning.', 'text', 'normal'),
    (2, 4, '📢 NOTICE: Gavutham Foundation is mobilizing resources for all 3 urgent situations above. Volunteers please stay on standby.', 'announcement', 'high'),
    (3, 4, '📢 ANNOUNCEMENT: We are organizing a Medical Camp in Palladam this Saturday (April 13). Volunteers with medical skills please confirm availability by replying here.', 'announcement', 'normal'),
    (3, 1, 'Confirmed! Dr. Dharun available Saturday morning.', 'text', 'normal'),
    (3, 4, '📢 ANNOUNCEMENT: Monthly food distribution drive in Coimbatore on April 20. Need 5 volunteers with driving skills for transport.', 'announcement', 'normal'),
    (3, 4, '📢 ANNOUNCEMENT: Field reports for last week must be submitted by today 5PM. Please use the Task History page to submit your reports.', 'announcement', 'high'),
    (3, 2, 'Submitted my report for electrical repair. Thank you for the reminder!', 'text', 'normal'),
    (4, 1, 'Fellow volunteers — quick tip: always carry your volunteer ID card when going to community assignments. NGOs verify identity before allowing access.', 'text', 'normal'),
    (4, 2, 'Good tip Dharun! Also make sure to take before and after photos of your work for the field report.', 'text', 'normal'),
    (4, 3, 'Anyone else facing waterlogging issues in their area? The rain has been heavy this week.', 'text', 'normal'),
    (4, 1, 'Yes — roads near Palladam are bad. Be careful if driving to assignments.', 'text', 'normal'),
    (4, 2, 'My match score improved to 74% after I updated my profile with more skills. Recommend everyone updates their profile!', 'text', 'normal'),
    (5, 1, 'Palladam residents — I am Dr. Dharun, volunteer doctor in this area. Available for medical assistance Mon-Sat.', 'text', 'normal'),
    (5, 5, 'Thank you Dr. Dharun! My mother needs a blood pressure check. Can you visit next week?', 'text', 'normal'),
    (5, 1, 'Yes Prasanna — will visit Tuesday morning. Keep your medical records ready.', 'text', 'normal'),
    (5, 4, 'Medical camp happening in Palladam this Saturday at the community center. All residents welcome — free checkup!', 'announcement', 'normal'),
    (6, 2, 'Ukkadam community — power restored at community hall. Took 3 hours to fix the main wiring. Hall is now open.', 'text', 'normal'),
    (6, 6, 'Thank you so much Annamalai! The evening program can go ahead now.', 'text', 'normal'),
    (6, 4, 'Great work Annamalai! Gavutham Foundation recognizes your rapid response to the emergency. 🏆', 'text', 'normal'),
    (7, 3, 'Peelamedu residents — water contamination risk near bus stand. Please use bottled water until further notice. Monitoring in progress.', 'urgent_alert', 'high'),
    (7, 7, 'Thank you for the warning! When will it be safe to use tap water again?', 'text', 'normal'),
    (7, 3, 'Expect 2-3 days. We are setting up a temporary filtration unit tomorrow.', 'text', 'normal'),
    (7, 4, 'Gavutham Foundation will distribute water packets in Peelamedu tomorrow morning 8AM near bus stand.', 'announcement', 'normal');
    """
]

with app.app_context():
    print("Initializing chat database tables...")
    for cmd in sql_commands:
        try:
            db.session.execute(text(cmd))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error executing command: {e}")
    print("Chat database initialization complete.")
