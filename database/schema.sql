CREATE DATABASE IF NOT EXISTS bracu_socials;
USE bracu_socials;

CREATE TABLE IF NOT EXISTS USERS (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    Student_ID VARCHAR(20) UNIQUE NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Full_name VARCHAR(100) NOT NULL,
    Department VARCHAR(50),
    Year INT,
    Interests TEXT,
    Profile_pic VARCHAR(255) DEFAULT 'default.jpg',
    Status VARCHAR(50) DEFAULT 'offline',
    Email_verified BOOLEAN DEFAULT FALSE,
    Verification_token VARCHAR(255),
    Reset_token VARCHAR(255),
    Reset_expires DATETIME,
    Privacy_profile VARCHAR(20) DEFAULT 'friends',
    Privacy_location VARCHAR(20) DEFAULT 'friends',
    Privacy_schedule VARCHAR(20) DEFAULT 'friends',
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Friends (
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Friend_request (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    Sender INT NOT NULL,
    Receiver INT NOT NULL,
    Status VARCHAR(20) DEFAULT 'pending',
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Sender) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (Receiver) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Notification (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    Message TEXT NOT NULL,
    Type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id INT,
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Groups (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    Category VARCHAR(50),
    Privacy VARCHAR(20) DEFAULT 'public',
    Created_by INT NOT NULL,
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Created_by) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Members_of (
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    role VARCHAR(20) DEFAULT 'General',
    Joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES Groups(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Group_join_request (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    Status VARCHAR(20) DEFAULT 'pending',
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES Groups(ID) ON DELETE CASCADE,
    UNIQUE KEY unique_request (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS Posts (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    Content TEXT NOT NULL,
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES Groups(ID) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Post_comments (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    Content TEXT NOT NULL,
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES Posts(ID) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Events (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    File VARCHAR(255),
    description TEXT,
    event_time DATETIME NOT NULL,
    max_participant INT,
    created_by INT NOT NULL,
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Launches (
    group_id INT NOT NULL,
    event_id INT NOT NULL,
    PRIMARY KEY (group_id, event_id),
    FOREIGN KEY (group_id) REFERENCES Groups(ID) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES Events(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Joins (
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    rsvp_status VARCHAR(20) DEFAULT 'pending',
    Joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES Events(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SCHEDULE (
    user_id INT NOT NULL,
    Course_code VARCHAR(20) NOT NULL,
    Class_days VARCHAR(50),
    Location VARCHAR(100),
    Start_time TIME,
    End_time TIME,
    PRIMARY KEY (user_id, Course_code),
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Campus_spot (
    Spot_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Category VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS CHECK_INS (
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    Created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(50),
    visible_to VARCHAR(20) DEFAULT 'friends',
    at_location VARCHAR(100),
    room_number VARCHAR(20),
    PRIMARY KEY (user_id, location_id, Created_at),
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES Campus_spot(Spot_ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Blocked_users (
    blocker_id INT NOT NULL,
    blocked_id INT NOT NULL,
    Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES USERS(ID) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES USERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS User_availability (
    user_id INT PRIMARY KEY,
    current_status ENUM('free', 'busy') DEFAULT 'free',
    status_override BOOLEAN DEFAULT FALSE,
    override_until DATETIME,
    FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE
);

INSERT INTO Campus_spot (Name, Category) VALUES
('Multipurpose Hall', 'Events'),
('Auditorium', 'Events'),
('1st Floor', 'Medical Center '),
('2nd Floor', 'OIC'),
('4th Floor', 'Departments'),
('5th Floor', 'Departments'),
('6th Floor', 'Cafeteria'),
('7th Floor', 'Academic'),
('8th Floor', 'Academic'),
('9th Floor', 'Academic'),
('10th Floor', 'Academic'),
('11th Floor', 'Academic'),
('12th Floor', 'Academic'),
('Rooftop', 'Recreation'),
('Running Track', 'Recreation');
