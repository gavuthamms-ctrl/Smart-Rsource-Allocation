-- Create and use database
CREATE DATABASE IF NOT EXISTS volunteer_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE volunteer_db;

-- Drop existing tables (safe re-run)
DROP TABLE IF EXISTS volunteers;
DROP TABLE IF EXISTS users;

-- users table
CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('volunteer','ngo_admin','super_admin')
                DEFAULT 'volunteer',
    is_active   BOOLEAN DEFAULT TRUE,
    last_login  DATETIME NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
);

-- volunteers table
CREATE TABLE volunteers (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_code          VARCHAR(20) UNIQUE,
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100) NOT NULL,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    phone                   VARCHAR(20),
    date_of_birth           DATE,
    gender                  ENUM('Male','Female','Other',
                            'Prefer not to say'),
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    skills                  TEXT,
    availability            ENUM('Available','Busy','On Leave')
                            DEFAULT 'Available',
    match_score             INT DEFAULT 0,
    emergency_contact_name  VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    notes                   TEXT,
    user_id                 INT,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE SET NULL
);

-- Indexes for fast queries
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_role          ON users(role);
CREATE INDEX idx_volunteers_email    ON volunteers(email);
CREATE INDEX idx_volunteers_avail    ON volunteers(availability);
CREATE INDEX idx_volunteers_city     ON volunteers(city);
