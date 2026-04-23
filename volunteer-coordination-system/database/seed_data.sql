-- Users
INSERT INTO users (email, password, role, is_active) VALUES
('admin@smartresource.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2DdvRxFUvS',
 'super_admin', TRUE),
('manager@ngo.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2DdvRxFUvS',
 'ngo_admin', TRUE),
('ravi@gmail.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2DdvRxFUvS',
 'volunteer', TRUE),
('priya@gmail.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2DdvRxFUvS',
 'volunteer', TRUE),
('arjun@gmail.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2DdvRxFUvS',
 'volunteer', TRUE);

-- Volunteers (8 realistic records)
INSERT INTO volunteers
(volunteer_code, first_name, last_name, email, phone,
 gender, city, state, skills, availability, match_score,
 notes, user_id)
VALUES
('VOL-0001','Ravi','Kumar','ravi@gmail.com','9876543210',
 'Male','Chennai','Tamil Nadu',
 '["Healthcare","First Aid","Logistics"]',
 'Available', 85,
 'Experienced in community health camps', 3),

('VOL-0002','Priya','Sharma','priya@gmail.com','9123456780',
 'Female','Coimbatore','Tamil Nadu',
 '["Education","Teaching","Counseling"]',
 'Busy', 78,
 'School teacher with 5 years experience', 4),

('VOL-0003','Arjun','Patel','arjun@gmail.com','9988776655',
 'Male','Madurai','Tamil Nadu',
 '["IT Support","Data Entry","Logistics"]',
 'Available', 72, 'Software engineer', 5),

('VOL-0004','Meena','Raj','meena@gmail.com','9776655443',
 'Female','Trichy','Tamil Nadu',
 '["Cooking","Food Distribution","Healthcare"]',
 'Available', 68, 'Expert in community kitchen management', NULL),

('VOL-0005','Karthik','Nair','karthik@gmail.com','9654321098',
 'Male','Salem','Tamil Nadu',
 '["Construction","Logistics","First Aid"]',
 'On Leave', 55, 'Civil engineer, available after project', NULL),

('VOL-0006','Divya','Menon','divya@gmail.com','9543210987',
 'Female','Vellore','Tamil Nadu',
 '["Counseling","Education","Legal Aid"]',
 'Available', 90, 'Social worker with NGO experience', NULL),

('VOL-0007','Suresh','Babu','suresh@gmail.com','9432109876',
 'Male','Tirunelveli','Tamil Nadu',
 '["Healthcare","Nursing","First Aid"]',
 'Available', 82, 'Trained nurse volunteer', NULL),

('VOL-0008','Lakshmi','Devi','lakshmi@gmail.com','9321098765',
 'Female','Erode','Tamil Nadu',
 '["Teaching","Education","Cooking"]',
 'Busy', 74, 'Primary school teacher', NULL);
