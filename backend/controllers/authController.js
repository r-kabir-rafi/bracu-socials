const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');
const { calculateCurrentStatus } = require('./scheduleController');

exports.register = async (req, res) => {
    try {
        const { student_id, email, password, full_name, department, year } = req.body;

        if (!email.endsWith('@bracu.ac.bd') && !email.endsWith('@g.bracu.ac.bd')) {
            return res.status(400).json({ error: 'Please use your BRAC University email' });
        }

        const [existing] = await db.query(
            'SELECT * FROM USERS WHERE Email = ? OR Student_ID = ?',
            [email, student_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO USERS (Student_ID, Email, Password, Full_name, Department, Year, Email_verified) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
            [student_id, email, hashedPassword, full_name, department, year]
        );

        res.status(201).json({ 
            message: 'Registration successful! You can now log in.',
            userId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.query(
            'SELECT * FROM USERS WHERE Email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        const isValidPassword = await bcrypt.compare(password, user.Password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        await db.query('UPDATE USERS SET Status = "online" WHERE ID = ?', [user.ID]);
        user.Status = 'online';

        const token = jwt.sign(
            { userId: user.ID, email: user.Email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.ID,
                student_id: user.Student_ID,
                email: user.Email,
                full_name: user.Full_name,
                department: user.Department,
                year: user.Year
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT ID, Student_ID, Email, Full_name, Department, Year, Interests, Profile_pic, Status, Privacy_profile, Privacy_location, Privacy_schedule FROM USERS WHERE ID = ?',
            [req.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        
        if (!user.Status) {
            user.Status = 'offline';
        }

        const [checkIns] = await db.query(
            `SELECT c.*, cs.Name as location_name, cs.Category as location_category
             FROM CHECK_INS c
             JOIN Campus_spot cs ON c.location_id = cs.Spot_ID
             WHERE c.user_id = ? AND c.Created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
             ORDER BY c.Created_at DESC LIMIT 1`,
            [req.userId]
        );

        const availability = await calculateCurrentStatus(req.userId);

        user.current_checkin = checkIns.length > 0 ? checkIns[0] : null;
        user.availability = availability;

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { full_name, department, year, interests } = req.body;
        
        await db.query(
            'UPDATE USERS SET Full_name = ?, Department = ?, Year = ?, Interests = ? WHERE ID = ?',
            [full_name, department, year, interests, req.userId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.uploadProfilePic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filename = req.file.filename;

        await db.query(
            'UPDATE USERS SET Profile_pic = ? WHERE ID = ?',
            [filename, req.userId]
        );

        res.json({ 
            message: 'Profile picture updated successfully',
            filename: filename
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updatePrivacy = async (req, res) => {
    try {
        const { privacy_profile, privacy_location, privacy_schedule } = req.body;
        
        await db.query(
            'UPDATE USERS SET Privacy_profile = ?, Privacy_location = ?, Privacy_schedule = ? WHERE ID = ?',
            [privacy_profile, privacy_location, privacy_schedule, req.userId]
        );

        res.json({ message: 'Privacy settings updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.logout = async (req, res) => {
    try {
        await db.query('UPDATE USERS SET Status = "offline" WHERE ID = ?', [req.userId]);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const [users] = await db.query('SELECT ID, Full_name FROM USERS WHERE Email = ?', [email]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'No account found with this email' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000);

        await db.query(
            'UPDATE USERS SET Reset_token = ?, Reset_expires = ? WHERE Email = ?',
            [resetToken, resetExpires, email]
        );

        res.json({ 
            message: 'Password reset token generated. Use it to reset your password.',
            resetToken: resetToken
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const [users] = await db.query(
            'SELECT ID FROM USERS WHERE Reset_token = ? AND Reset_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            'UPDATE USERS SET Password = ?, Reset_token = NULL, Reset_expires = NULL WHERE ID = ?',
            [hashedPassword, users[0].ID]
        );

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const [users] = await db.query('SELECT Password FROM USERS WHERE ID = ?', [req.userId]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, users[0].Password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query('UPDATE USERS SET Password = ? WHERE ID = ?', [hashedPassword, req.userId]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
