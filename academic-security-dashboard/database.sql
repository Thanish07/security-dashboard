CREATE DATABASE IF NOT EXISTS academic_security;
USE academic_security;

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS security_events;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL, -- In production, use hashing!
    role VARCHAR(20) NOT NULL
);

INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@university.edu', 'admin123', 'Admin'),
('faculty', 'faculty@gmail.com', 'fac123', 'Faculty'),
('student', 'student@university.edu', 'stu123', 'Student')
ON DUPLICATE KEY UPDATE password=password;

CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(20),
    user_role VARCHAR(20),
    event_type VARCHAR(100),
    department VARCHAR(50),
    risk_level VARCHAR(20),
    mfa_status BOOLEAN
);

INSERT INTO security_events (timestamp, user_id, user_role, event_type, department, risk_level, mfa_status) VALUES
(NOW(), '1001', 'Student', 'Failed Login', 'CS', 'Low', 0),
(NOW() - INTERVAL 1 HOUR, '1002', 'Faculty', 'Unusual Access', 'Admin', 'High', 1),
(NOW() - INTERVAL 2 HOUR, '1003', 'Student', 'Malware Detected', 'Library', 'Critical', 0),
(NOW() - INTERVAL 3 HOUR, '1004', 'Staff', 'Password Change', 'HR', 'Low', 1),
(NOW() - INTERVAL 5 HOUR, '1001', 'Student', 'Failed Login', 'CS', 'Medium', 0);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(50),
    role VARCHAR(20),
    action VARCHAR(200)
);

INSERT INTO activity_logs (username, role, action) VALUES
('admin', 'Admin', 'System backup completed'),
('faculty', 'Faculty', 'Viewed student records');
