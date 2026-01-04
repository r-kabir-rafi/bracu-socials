const db = require('../config/database');

exports.getCampusSpots = async (req, res) => {
    try {
        const [spots] = await db.query('SELECT * FROM Campus_spot ORDER BY Name');
        res.json(spots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.checkIn = async (req, res) => {
    try {
        const { location_id, status, visible_to, room_number } = req.body;

        const [spot] = await db.query('SELECT Name FROM Campus_spot WHERE Spot_ID = ?', [location_id]);
        
        if (spot.length === 0) {
            return res.status(404).json({ error: 'Campus spot not found' });
        }

        await db.query(
            'INSERT INTO CHECK_INS (user_id, location_id, Status, visible_to, at_location, room_number) VALUES (?, ?, ?, ?, ?, ?)',
            [req.userId, location_id, status, visible_to, spot[0].Name, room_number || null]
        );

        if (visible_to === 'friends') {
            const [friends] = await db.query(
                'SELECT friend_id FROM Friends WHERE user_id = ?',
                [req.userId]
            );

            const [userInfo] = await db.query('SELECT Full_name FROM USERS WHERE ID = ?', [req.userId]);
            const roomInfo = room_number ? ` (Room ${room_number})` : '';

            for (const friend of friends) {
                await db.query(
                    'INSERT INTO Notification (user_id, Message, Type, related_id) VALUES (?, ?, ?, ?)',
                    [friend.friend_id, `${userInfo[0].Full_name} checked in at ${spot[0].Name}${roomInfo}`, 'check_in', req.userId]
                );
            }
        }

        res.json({ message: 'Checked in successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getNearbyFriends = async (req, res) => {
    try {
        const { location_id } = req.params;

        const [nearbyFriends] = await db.query(
            `SELECT DISTINCT u.ID, u.Full_name, u.Profile_pic, u.Status, c.Status as check_in_status, c.at_location, c.Created_at
             FROM CHECK_INS c
             JOIN USERS u ON c.user_id = u.ID
             JOIN Friends f ON (f.friend_id = u.ID AND f.user_id = ?)
             WHERE c.location_id = ? 
             AND c.Created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
             AND c.visible_to IN ('friends', 'public')
             AND u.ID NOT IN (SELECT blocked_id FROM Blocked_users WHERE blocker_id = ?)
             AND u.ID NOT IN (SELECT blocker_id FROM Blocked_users WHERE blocked_id = ?)
             ORDER BY c.Created_at DESC`,
            [req.userId, location_id, req.userId, req.userId]
        );

        res.json(nearbyFriends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAllNearbyFriends = async (req, res) => {
    try {
        const [nearbyFriends] = await db.query(
            `SELECT DISTINCT u.ID, u.Full_name, u.Profile_pic, u.Status, c.Status as check_in_status, c.at_location, cs.Name as location_name, c.Created_at
             FROM CHECK_INS c
             JOIN USERS u ON c.user_id = u.ID
             JOIN Friends f ON (f.friend_id = u.ID AND f.user_id = ?)
             JOIN Campus_spot cs ON c.location_id = cs.Spot_ID
             WHERE c.Created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
             AND c.visible_to IN ('friends', 'public')
             AND u.ID NOT IN (SELECT blocked_id FROM Blocked_users WHERE blocker_id = ?)
             AND u.ID NOT IN (SELECT blocker_id FROM Blocked_users WHERE blocked_id = ?)
             ORDER BY c.Created_at DESC`,
            [req.userId, req.userId, req.userId]
        );

        res.json(nearbyFriends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getCheckInHistory = async (req, res) => {
    try {
        const [checkIns] = await db.query(
            `SELECT c.*, cs.Name as location_name, cs.Category
             FROM CHECK_INS c
             JOIN Campus_spot cs ON c.location_id = cs.Spot_ID
             WHERE c.user_id = ?
             ORDER BY c.Created_at DESC
             LIMIT 20`,
            [req.userId]
        );

        res.json(checkIns);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
