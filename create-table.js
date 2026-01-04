const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTables() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bracu_socials'
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS User_availability (
                user_id INT PRIMARY KEY,
                current_status ENUM('free', 'busy') DEFAULT 'free',
                status_override BOOLEAN DEFAULT FALSE,
                override_until DATETIME,
                FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE
            )
        `);
        console.log('✓ User_availability table created successfully!');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS Group_join_request (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                group_id INT NOT NULL,
                Status VARCHAR(20) DEFAULT 'pending',
                Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES Groups(ID) ON DELETE CASCADE,
                UNIQUE KEY unique_request (user_id, group_id)
            )
        `);
        console.log('✓ Group_join_request table created successfully!');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS Post_comments (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                Content TEXT NOT NULL,
                Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES Posts(ID) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES USERS(ID) ON DELETE CASCADE
            )
        `);
        console.log('✓ Post_comments table created successfully!');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS Blocked_users (
                blocker_id INT NOT NULL,
                blocked_id INT NOT NULL,
                Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (blocker_id, blocked_id),
                FOREIGN KEY (blocker_id) REFERENCES USERS(ID) ON DELETE CASCADE,
                FOREIGN KEY (blocked_id) REFERENCES USERS(ID) ON DELETE CASCADE
            )
        `);
        console.log('✓ Blocked_users table created successfully!');

        try {
            await pool.query('ALTER TABLE CHECK_INS ADD COLUMN room_number VARCHAR(20)');
            console.log('✓ room_number column added to CHECK_INS');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ room_number column already exists in CHECK_INS');
            } else {
                console.error('Error adding room_number:', e.message);
            }
        }

        await pool.query('DELETE FROM Campus_spot');
        await pool.query(`
            INSERT INTO Campus_spot (Name, Category) VALUES
            ('Multipurpose Hall', 'Events'),
            ('Auditorium', 'Events'),
            ('Medical Center', 'Services'),
            ('OIC', 'Services'),
            ('4th Floor', 'Academic'),
            ('5th Floor', 'Academic'),
            ('Cafeteria (6th Floor)', 'Food'),
            ('7th Floor', 'Academic'),
            ('8th Floor', 'Academic'),
            ('9th Floor', 'Academic'),
            ('10th Floor', 'Academic'),
            ('11th Floor', 'Academic'),
            ('12th Floor', 'Academic'),
            ('Rooftop', 'Recreation'),
            ('Running Track', 'Recreation')
        `);
        console.log('✓ Campus_spot locations updated!');

        const [result] = await pool.query('UPDATE USERS SET Status = "offline" WHERE Status IS NULL');
        if (result.affectedRows > 0) {
            console.log(`✓ Fixed ${result.affectedRows} users with NULL status`);
        }

    } catch (error) {
        console.error('Error creating table:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

createTables();
