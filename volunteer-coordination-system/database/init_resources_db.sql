-- ── RESOURCE CATEGORIES TABLE ──
CREATE TABLE IF NOT EXISTS resource_categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    icon        VARCHAR(10),
    color       VARCHAR(20),
    skill_tag   VARCHAR(100),
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── SKILL RESOURCES TABLE (main table) ──
CREATE TABLE IF NOT EXISTS skill_resources (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    description   TEXT NOT NULL,
    content       LONGTEXT,
    category_id   INT NOT NULL,
    resource_type ENUM(
                    'pdf',
                    'video',
                    'article',
                    'guide',
                    'checklist',
                    'template',
                    'quiz'
                  ) NOT NULL,
    skill_tags    VARCHAR(255),
    difficulty    ENUM('Beginner','Intermediate','Advanced')
                  DEFAULT 'Beginner',
    duration_mins INT DEFAULT 0,
    file_url      VARCHAR(500),
    thumbnail_url VARCHAR(500),
    uploaded_by   INT,
    is_featured   BOOLEAN DEFAULT FALSE,
    is_active     BOOLEAN DEFAULT TRUE,
    view_count    INT DEFAULT 0,
    download_count INT DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id)
        REFERENCES resource_categories(id)
        ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- ── RESOURCE RATINGS TABLE ──
CREATE TABLE IF NOT EXISTS resource_ratings (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    user_id     INT NOT NULL,
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review      TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_rating (resource_id, user_id),
    FOREIGN KEY (resource_id)
        REFERENCES skill_resources(id)
        ON DELETE CASCADE,
    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ── RESOURCE BOOKMARKS TABLE ──
CREATE TABLE IF NOT EXISTS resource_bookmarks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    user_id     INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_bookmark (resource_id, user_id),
    FOREIGN KEY (resource_id)
        REFERENCES skill_resources(id)
        ON DELETE CASCADE,
    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ── RESOURCE PROGRESS TABLE ──
CREATE TABLE IF NOT EXISTS resource_progress (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    resource_id  INT NOT NULL,
    user_id      INT NOT NULL,
    status       ENUM('not_started','in_progress','completed')
                 DEFAULT 'not_started',
    progress_pct INT DEFAULT 0,
    started_at   TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    UNIQUE KEY unique_progress (resource_id, user_id),
    FOREIGN KEY (resource_id)
        REFERENCES skill_resources(id)
        ON DELETE CASCADE,
    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ── RESOURCE QUIZ TABLE ──
CREATE TABLE IF NOT EXISTS resource_quizzes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    question    TEXT NOT NULL,
    option_a    VARCHAR(255) NOT NULL,
    option_b    VARCHAR(255) NOT NULL,
    option_c    VARCHAR(255) NOT NULL,
    option_d    VARCHAR(255) NOT NULL,
    correct_ans ENUM('a','b','c','d') NOT NULL,
    explanation TEXT,
    sort_order  INT DEFAULT 0,
    FOREIGN KEY (resource_id)
        REFERENCES skill_resources(id)
        ON DELETE CASCADE
);

-- ── INDEXES ──
CREATE INDEX idx_resources_category
    ON skill_resources(category_id);
CREATE INDEX idx_resources_type
    ON skill_resources(resource_type);
CREATE INDEX idx_resources_difficulty
    ON skill_resources(difficulty);
CREATE INDEX idx_resources_featured
    ON skill_resources(is_featured);
CREATE INDEX idx_resources_skills
    ON skill_resources(skill_tags);
CREATE INDEX idx_ratings_resource
    ON resource_ratings(resource_id);
CREATE INDEX idx_bookmarks_user
    ON resource_bookmarks(user_id);
CREATE INDEX idx_progress_user
    ON resource_progress(user_id);

-- ── CATEGORIES ──
INSERT IGNORE INTO resource_categories
    (name, description, icon, color, skill_tag, sort_order)
VALUES
('Medical & Healthcare',
 'Resources for medical volunteers and healthcare workers',
 '🩺', '#c62828', 'Doctor,First Aid,Nursing', 1),

('Electrical & Technical',
 'Guides for electrical work and technical repairs',
 '⚡', '#f57c00', 'Electrical Work,Technical', 2),

('Counselling & Mental Health',
 'Resources for counselling and psychological support',
 '🧠', '#6a1b9a', 'Counselling,Psychology', 3),

('Water & Environment',
 'Water treatment and environmental management guides',
 '💧', '#0277bd', 'Water Treatment,Environment', 4),

('Construction & Road Work',
 'Civil engineering and road repair resources',
 '🏗️', '#4e342e', 'Road Work,Construction', 5),

('General Volunteering',
 'Essential guides for all volunteers',
 '🤝', '#1a237e', 'General,All Volunteers', 6),

('Disaster Response',
 'Emergency response and disaster management',
 '🚨', '#b71c1c', 'Emergency,Disaster', 7),

('Communication & Leadership',
 'Community leadership and communication skills',
 '📣', '#2e7d32', 'Leadership,Communication', 8);

-- ── RESOURCES ──
-- uploaded_by = 4 (Gavutham NGO user)
INSERT IGNORE INTO skill_resources
(id, title, description, content, category_id,
 resource_type, skill_tags, difficulty,
 duration_mins, file_url, is_featured,
 view_count, download_count, uploaded_by)
VALUES
(1, 'Basic First Aid for Community Volunteers', 'Complete first aid guide covering CPR, wound care, fracture management, and emergency response protocols for community health volunteers.', '# Basic First Aid Guide\n\n## Module 1: CPR Basics\nCardiopulmonary resuscitation (CPR) is a life-saving technique...\n\n## Module 2: Wound Care\nProper wound cleaning and bandaging techniques...\n\n## Module 3: Fracture Management\nHow to immobilize fractures in field conditions...\n\n## Module 4: Shock Management\nRecognizing and treating shock in emergency situations...', 1, 'guide', 'Doctor,First Aid,Healthcare', 'Beginner', 45, '/resources/files/first-aid-guide.pdf', TRUE, 234, 89, 4),
(2, 'Blood Pressure Monitoring — Field Protocol', 'Step-by-step protocol for measuring and recording blood pressure during community health camps. Includes normal ranges, hypertension identification, and referral criteria.', '# Blood Pressure Monitoring Protocol\n\n## Equipment Needed\n- Sphygmomanometer\n- Stethoscope\n- Record sheets\n\n## Measurement Procedure\n1. Patient seated quietly for 5 minutes\n2. Arm at heart level...', 1, 'checklist', 'Doctor,Nursing,Healthcare', 'Beginner', 20, '/resources/files/bp-monitoring-checklist.pdf', FALSE, 156, 67, 4),
(3, 'Managing Medical Camp — NGO Volunteer Guide', 'Comprehensive guide for organizing and running medical camps in rural communities. Covers logistics, patient flow, record keeping, and post-camp reporting.', NULL, 1, 'pdf', 'Doctor,Healthcare,Camp Management', 'Intermediate', 60, '/resources/files/medical-camp-guide.pdf', TRUE, 189, 92, 4),
(4, 'Medication Safety for Community Volunteers', 'Essential knowledge about common medications, dosage guidance, drug interactions, and safe storage in field conditions for medical volunteers.', NULL, 1, 'article', 'Doctor,Nursing,Pharmacy', 'Advanced', 35, NULL, FALSE, 98, 23, 4),
(5, 'First Aid Knowledge Quiz', 'Test your first aid knowledge with this 10-question quiz covering CPR, wound care, burns, fractures, and emergency protocols.', NULL, 1, 'quiz', 'Doctor,First Aid', 'Beginner', 15, NULL, FALSE, 445, 0, 4),
(6, 'Electrical Safety for Community Buildings', 'Essential electrical safety protocols for volunteers working on community building repairs. Covers lockout/ tagout procedures, PPE requirements, and basic wiring safety.', '# Electrical Safety Guide\n\n## CRITICAL: Always switch off main breaker before work\n\n## Personal Protective Equipment\n- Rubber gloves (1000V rated)\n- Safety goggles\n- Non-conductive footwear\n\n## Basic Wiring Color Codes\nRed: Live | Black: Neutral | Green: Earth\n\n## Lockout/Tagout Procedure\n1. Identify all power sources\n2. Notify all affected persons\n3. Isolate power source...', 2, 'guide', 'Electrical Work,Safety', 'Beginner', 40, '/resources/files/electrical-safety.pdf', TRUE, 312, 134, 4),
(7, 'Distribution Board Troubleshooting', 'Practical guide for diagnosing and fixing common distribution board faults including tripped breakers, blown fuses, and wiring failures in community buildings.', NULL, 2, 'pdf', 'Electrical Work,Technical', 'Intermediate', 55, '/resources/files/db-troubleshooting.pdf', FALSE, 178, 56, 4),
(8, 'Wiring a Community Hall — Step by Step', 'Complete video tutorial on safely re-wiring a community hall after electrical damage. Covers planning, material list, execution, and testing.', NULL, 2, 'video', 'Electrical Work', 'Advanced', 90, 'https://www.youtube.com/embed/dQw4w9WgXcQ', TRUE, 267, 0, 4),
(9, 'Electrical Inspection Checklist', 'Pre and post-repair electrical inspection checklist for community buildings. Ensures all safety standards are met before restoring power to residents.', NULL, 2, 'checklist', 'Electrical Work,Safety', 'Beginner', 15, '/resources/files/electrical-inspection.pdf', FALSE, 145, 89, 4),
(10, 'Trauma-Informed Counselling for Disaster Victims', 'Evidence-based counselling techniques for volunteers supporting flood, fire, and displacement victims. Covers psychological first aid and group sessions.', '# Trauma-Informed Counselling\n\n## What is Trauma?\nTrauma is the emotional response to a deeply distressing event...\n\n## Psychological First Aid (PFA)\n### Step 1: Look\nObserve the scene and identify people who need support\n\n### Step 2: Listen\nActive listening without judgment...\n\n### Step 3: Link\nConnect survivors to practical support...', 3, 'guide', 'Counselling,Mental Health,Psychology', 'Intermediate', 60, '/resources/files/trauma-counselling.pdf', TRUE, 223, 78, 4),
(11, 'Active Listening Techniques — Field Guide', 'Practical active listening techniques for volunteer counsellors. Includes exercises, common mistakes, and cultural sensitivity guidelines.', NULL, 3, 'article', 'Counselling,Communication', 'Beginner', 25, NULL, FALSE, 167, 34, 4),
(12, 'Group Counselling Session — Facilitator Template', 'Ready-to-use template for facilitating group counselling sessions for displaced families. Includes ice-breakers, discussion prompts, and session closing techniques.', NULL, 3, 'template', 'Counselling,Group Facilitation', 'Intermediate', 30, '/resources/files/group-session-template.pdf', FALSE, 134, 67, 4),
(13, 'Mental Health Awareness — Community Workshop', 'Workshop materials for conducting mental health awareness sessions in rural communities. Reduces stigma and encourages help-seeking behavior.', NULL, 3, 'pdf', 'Counselling,Mental Health,Community', 'Beginner', 45, '/resources/files/mental-health-workshop.pdf', TRUE, 198, 89, 4),
(14, 'Emergency Water Treatment in Field Conditions', 'Complete guide for treating contaminated water during floods and disasters. Covers chlorination, filtration setup, and testing for safe drinking water.', '# Emergency Water Treatment\n\n## When to Treat Water\nAlways treat water from unknown sources during disasters...\n\n## Chlorination Method\n### Materials Needed\n- Bleaching powder (HTH) or sodium hypochlorite\n- Clean containers\n- Testing strips\n\n### Steps\n1. Filter visible debris through clean cloth\n2. Add 2.3mg/L of chlorine...\n\n## Simple Sand Filter Setup\n1. PVC pipe (100mm dia)\n2. Layers: gravel, sand, activated carbon...', 4, 'guide', 'Water Treatment,Emergency', 'Intermediate', 50, '/resources/files/water-treatment-field.pdf', TRUE, 289, 112, 4),
(15, 'Water Quality Testing — Field Protocol', 'Step-by-step protocol for testing water quality using portable testing kits. Covers pH, turbidity, chlorine levels, and bacterial contamination.', NULL, 4, 'checklist', 'Water Treatment,Testing', 'Beginner', 25, '/resources/files/water-testing-checklist.pdf', FALSE, 178, 67, 4),
(16, 'Waterlogging Management in Urban Areas', 'Practical guide for managing waterlogging in urban and semi-urban areas after heavy rainfall. Covers drainage, pumping, and decontamination.', NULL, 4, 'pdf', 'Water Treatment,Flood Management', 'Advanced', 45, '/resources/files/waterlogging-guide.pdf', FALSE, 134, 45, 4),
(17, 'Emergency Road Repair — Pothole & Crack Fix', 'Field guide for emergency road repairs including pothole filling, crack sealing, and surface restoration. Designed for volunteer civil workers.', '# Emergency Road Repair Guide\n\n## Safety First\nAlways set up warning signs and barriers before starting repair work...\n\n## Pothole Repair Steps\n1. Clean the pothole — remove debris and standing water\n2. Apply primer/tack coat to the edges\n3. Fill with cold mix asphalt\n4. Compact using plate compactor or hand tamper\n5. Check levelness and apply finishing...\n\n## Material Quantities\nEstimate: 1 bag cold mix covers approx 0.1 sqm at 50mm depth', 5, 'guide', 'Road Work,Construction,Civil', 'Intermediate', 40, '/resources/files/road-repair-guide.pdf', TRUE, 156, 67, 4),
(18, 'Damage Assessment Form — Road & Infrastructure', 'Standardized form for assessing road and infrastructure damage after natural disasters. Used to request resources from NGOs and government.', NULL, 5, 'template', 'Road Work,Assessment,Documentation', 'Beginner', 15, '/resources/files/damage-assessment-form.pdf', FALSE, 123, 89, 4),
(19, 'Volunteer Onboarding — Complete Starter Guide', 'Everything a new volunteer needs to know about the SmartResource system. Covers profile setup, task matching, field reporting, and best practices.', NULL, 6, 'guide', 'General,All Volunteers,Onboarding', 'Beginner', 30, '/resources/files/volunteer-onboarding.pdf', TRUE, 567, 234, 4),
(20, 'Field Report Writing — Templates & Examples', 'Professional templates and real examples for writing effective field reports after completing volunteer tasks. Ensures NGO approval and impact tracking.', NULL, 6, 'template', 'General,Documentation,Reporting', 'Beginner', 20, '/resources/files/field-report-templates.pdf', FALSE, 345, 178, 4),
(21, 'Disaster Response Protocol — All Volunteers', 'Step-by-step emergency response protocol for volunteers during floods, fires, and building collapses. Covers triage, communication, and safety.', NULL, 7, 'guide', 'Emergency,Disaster,Safety', 'Intermediate', 50, '/resources/files/disaster-protocol.pdf', TRUE, 412, 189, 4),
(22, 'Community Leadership for Volunteer Coordinators', 'Leadership skills guide for volunteers who lead teams in the field. Covers delegation, conflict resolution, motivation, and decision-making.', NULL, 8, 'guide', 'Leadership,Communication,Management', 'Intermediate', 45, NULL, TRUE, 189, 56, 4);

-- ── QUIZ QUESTIONS (for resource_id = 5, First Aid Quiz) ──
INSERT IGNORE INTO resource_quizzes
    (resource_id, question, option_a, option_b,
     option_c, option_d, correct_ans, explanation,
     sort_order)
VALUES
(5, 'What is the correct compression rate for adult CPR?', '60-80 compressions per minute', '100-120 compressions per minute', '40-60 compressions per minute', '120-140 compressions per minute', 'b', 'Current guidelines recommend 100-120 compressions per minute for effective CPR in adults.', 1),
(5, 'What is the correct depth for chest compressions in an adult?', '1-2 cm', '2-3 cm', '5-6 cm', '7-8 cm', 'c', 'Chest compressions should be at least 5cm but not more than 6cm deep for effective CPR.', 2),
(5, 'How long should you check for breathing before starting CPR?', 'Up to 30 seconds', 'No more than 10 seconds', 'Exactly 1 minute', '2-3 seconds only', 'b', 'Check for breathing for no more than 10 seconds to avoid delaying CPR.', 3),
(5, 'What does RICE stand for in injury management?', 'Rest, Ice, Compress, Elevate', 'Run, Immobilize, Call, Evacuate', 'Rescue, Immobilize, Compress, Elevate', 'Rest, Immobilize, Cool, Evaluate', 'a', 'RICE (Rest, Ice, Compression, Elevation) is the standard first aid treatment for sprains and strains.', 4),
(5, 'What is the first step in treating a severe bleed?', 'Call for ambulance immediately', 'Apply a tourniquet above the wound', 'Apply firm direct pressure to the wound', 'Elevate the affected limb first', 'c', 'Direct pressure is always the first step in controlling severe bleeding.', 5);

-- ── SAMPLE RATINGS ──
INSERT IGNORE INTO resource_ratings
    (resource_id, user_id, rating, review)
VALUES
(1, 1, 5, 'Excellent guide! Used this at our medical camp in Palladam. Very practical and easy to follow.'),
(1, 2, 4, 'Good content but could use more diagrams.'),
(6, 2, 5, 'This saved my life at the community hall electrical repair. Safety section is critical!'),
(6, 3, 5, 'Must-read for any electrical volunteer.'),
(10, 2, 5, 'Perfect guide for counselling flood victims. Helped me greatly at Ukkadam relief camp.'),
(14, 3, 5, 'The water treatment guide was exactly what I needed for the Peelamedu situation.'),
(19, 1, 5, 'Every volunteer must read the onboarding guide. Explains everything clearly.'),
(17, 1, 4, 'Good road repair guide. Practical and simple.'),
(17, 3, 5, 'Used this for Peelamedu school road repair. Worked perfectly.'),
(21, 1, 5, 'Disaster protocol is well structured. Easy to follow in chaotic situations.');

-- ── SAMPLE BOOKMARKS ──
INSERT IGNORE INTO resource_bookmarks (resource_id, user_id)
VALUES
(1, 1), (3, 1), (5, 1),
(6, 2), (8, 2), (10, 2),
(14, 3), (15, 3), (17, 3),
(19, 1), (19, 2), (19, 3),
(21, 1), (21, 2), (21, 3);

-- ── SAMPLE PROGRESS ──
INSERT IGNORE INTO resource_progress
    (resource_id, user_id, status, progress_pct,
     started_at, completed_at)
VALUES
(1, 1, 'completed', 100, '2026-04-01 09:00:00', '2026-04-01 09:45:00'),
(5, 1, 'in_progress', 60, '2026-04-10 14:00:00', NULL),
(19, 1, 'completed', 100, '2026-03-28 10:00:00', '2026-03-28 10:30:00'),
(6, 2, 'completed', 100, '2026-04-02 11:00:00', '2026-04-02 11:40:00'),
(10, 2, 'in_progress', 75, '2026-04-09 15:00:00', NULL),
(19, 2, 'completed', 100, '2026-03-29 09:00:00', '2026-03-29 09:30:00'),
(14, 3, 'completed', 100, '2026-04-03 08:00:00', '2026-04-03 08:50:00'),
(17, 3, 'in_progress', 50, '2026-04-11 16:00:00', NULL),
(19, 3, 'completed', 100, '2026-03-30 10:00:00', '2026-03-30 10:30:00');
