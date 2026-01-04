const db = require('../config/database');

exports.suggestFriends = async (req, res) => {
    try {
        const [suggestions] = await db.query(
            `SELECT DISTINCT u.ID, u.Student_ID, u.Full_name, u.Department, u.Year, u.Interests, u.Profile_pic
             FROM USERS u
             WHERE u.ID != ? 
             AND u.ID NOT IN (
                SELECT friend_id FROM Friends WHERE user_id = ?
             )
             AND u.ID NOT IN (
                SELECT user_id FROM Friends WHERE friend_id = ?
             )
             AND u.ID NOT IN (
                SELECT Receiver FROM Friend_request WHERE Sender = ? AND Status = 'pending'
             )
             AND u.ID NOT IN (
                SELECT Sender FROM Friend_request WHERE Receiver = ? AND Status = 'pending'
             )
             AND u.ID NOT IN (
                SELECT blocked_id FROM Blocked_users WHERE blocker_id = ?
             )
             AND u.ID NOT IN (
                SELECT blocker_id FROM Blocked_users WHERE blocked_id = ?
             )
             ORDER BY u.Full_name
             LIMIT 50`,
            [req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId]
        );

        res.json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getCommonFreeTime = async (req, res) => {
    try {
        const { friend_id, day } = req.query;

        const [mySchedule] = await db.query(
            'SELECT Course_code, Start_time, End_time FROM SCHEDULE WHERE user_id = ? AND Class_days LIKE ?',
            [req.userId, `%${day}%`]
        );

        const [friendSchedule] = await db.query(
            'SELECT Course_code, Start_time, End_time FROM SCHEDULE WHERE user_id = ? AND Class_days LIKE ?',
            [friend_id, `%${day}%`]
        );

        res.json({
            mySchedule,
            friendSchedule
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.recommendGroups = async (req, res) => {
    try {
        const [recommendations] = await db.query(
            `SELECT g.*, u.Full_name as creator_name, COUNT(m.user_id) as member_count,
                    (SELECT COUNT(*) FROM Group_join_request WHERE user_id = ? AND group_id = g.ID AND Status = 'pending') as has_pending_request
             FROM Groups g
             JOIN USERS u ON g.Created_by = u.ID
             LEFT JOIN Members_of m ON g.ID = m.group_id
             WHERE g.ID NOT IN (
                SELECT group_id FROM Members_of WHERE user_id = ?
             )
             GROUP BY g.ID
             ORDER BY member_count DESC
             LIMIT 50`,
            [req.userId, req.userId]
        );

        res.json(recommendations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.recommendNearbyFriends = async (req, res) => {
    try {
        const [nearbyFriends] = await db.query(
            `SELECT DISTINCT u.ID, u.Full_name, u.Profile_pic, u.Status, 
             c.Status as check_in_status, cs.Name as location_name, c.Created_at
             FROM CHECK_INS c
             JOIN USERS u ON c.user_id = u.ID
             JOIN Friends f ON (f.friend_id = u.ID AND f.user_id = ?)
             JOIN Campus_spot cs ON c.location_id = cs.Spot_ID
             WHERE c.Created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
             AND c.visible_to IN ('friends', 'public')
             AND c.Status IN ('available to meet', 'socializing')
             ORDER BY c.Created_at DESC
             LIMIT 10`,
            [req.userId]
        );

        res.json(nearbyFriends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.searchByDepartmentYear = async (req, res) => {
    try {
        const { department, year } = req.query;

        let query = `
            SELECT ID, Student_ID, Full_name, Department, Year, Profile_pic
            FROM USERS
            WHERE ID != ? AND Email_verified = TRUE
        `;

        const params = [req.userId];

        if (department) {
            query += ' AND Department = ?';
            params.push(department);
        }

        if (year) {
            query += ' AND Year = ?';
            params.push(year);
        }

        query += ' ORDER BY Full_name LIMIT 20';

        const [users] = await db.query(query, params);
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getPopularSpots = async (req, res) => {
    try {
        const [spots] = await db.query(
            `SELECT cs.Spot_ID, cs.Name, cs.Category, COUNT(c.user_id) as check_in_count
             FROM Campus_spot cs
             LEFT JOIN CHECK_INS c ON cs.Spot_ID = c.location_id 
             AND c.Created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             GROUP BY cs.Spot_ID
             ORDER BY check_in_count DESC
             LIMIT 10`
        );

        res.json(spots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
