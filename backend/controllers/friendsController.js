const db = require('../config/database');
const { calculateCurrentStatus } = require('./scheduleController');

exports.getUserProfile = async (req, res) => {
    try {
        const { user_id } = req.params;
        const viewerId = req.userId;

        const [blocked] = await db.query(
            'SELECT * FROM Blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
            [user_id, viewerId, viewerId, user_id]
        );

        if (blocked.length > 0) {
            return res.status(403).json({ error: 'Unable to view this profile' });
        }

        const [users] = await db.query(
            `SELECT ID, Student_ID, Full_name, Department, Year, Interests, Profile_pic, Status, 
                    Privacy_profile, Privacy_location, Privacy_schedule 
             FROM USERS WHERE ID = ?`,
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        const [friendship] = await db.query(
            'SELECT * FROM Friends WHERE user_id = ? AND friend_id = ?',
            [viewerId, user_id]
        );
        const isFriend = friendship.length > 0;

        const isSelf = parseInt(user_id) === viewerId;

        const profile = {
            id: user.ID,
            student_id: user.Student_ID,
            full_name: user.Full_name,
            profile_pic: user.Profile_pic,
            is_friend: isFriend,
            is_self: isSelf
        };

        const canViewProfile = isSelf || 
            user.Privacy_profile === 'public' ||
            (user.Privacy_profile === 'friends' && isFriend);

        if (canViewProfile) {
            profile.department = user.Department;
            profile.year = user.Year;
            profile.interests = user.Interests;
            profile.status = user.Status || 'offline'; 
        } else {
            profile.private = true;
            profile.message = 'This profile is private';
        }

        const canViewLocation = isSelf || 
            user.Privacy_location === 'public' || 
            (user.Privacy_location === 'friends' && isFriend);
        profile.can_view_location = canViewLocation;

        const canViewSchedule = isSelf || 
            user.Privacy_schedule === 'public' || 
            (user.Privacy_schedule === 'friends' && isFriend);
        profile.can_view_schedule = canViewSchedule;

        if (canViewSchedule) {
            profile.availability = await calculateCurrentStatus(user_id);
        }

        if (canViewLocation) {
            const [checkIns] = await db.query(
                `SELECT c.*, cs.Name as location_name, cs.Category as location_category
                 FROM CHECK_INS c
                 JOIN Campus_spot cs ON c.location_id = cs.Spot_ID
                 WHERE c.user_id = ? AND c.Created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
                 AND c.visible_to IN ('public'${isFriend ? ", 'friends'" : ''})
                 ORDER BY c.Created_at DESC LIMIT 1`,
                [user_id]
            );
            profile.current_checkin = checkIns.length > 0 ? checkIns[0] : null;
        }

        if (!isSelf) {
            const [mutualFriends] = await db.query(
                `SELECT COUNT(DISTINCT f1.friend_id) as count
                 FROM Friends f1
                 JOIN Friends f2 ON f1.friend_id = f2.friend_id
                 WHERE f1.user_id = ? AND f2.user_id = ?`,
                [viewerId, user_id]
            );
            profile.mutual_friends_count = mutualFriends[0].count;
        }

        if (!isSelf && !isFriend) {
            const [sentRequest] = await db.query(
                'SELECT ID FROM Friend_request WHERE Sender = ? AND Receiver = ? AND Status = "pending"',
                [viewerId, user_id]
            );
            const [receivedRequest] = await db.query(
                'SELECT ID FROM Friend_request WHERE Sender = ? AND Receiver = ? AND Status = "pending"',
                [user_id, viewerId]
            );
            
            if (sentRequest.length > 0) {
                profile.friend_request_status = 'sent';
            } else if (receivedRequest.length > 0) {
                profile.friend_request_status = 'received';
                profile.friend_request_id = receivedRequest[0].ID;
            } else {
                profile.friend_request_status = 'none';
            }
        }

        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const userId = req.userId;

        const [users] = await db.query(
            `SELECT ID, Student_ID, Full_name, Department, Year, Profile_pic 
             FROM USERS 
             WHERE (Full_name LIKE ? OR Student_ID LIKE ?) 
             AND ID != ? 
             AND Email_verified = TRUE
             LIMIT 20`,
            [`%${query}%`, `%${query}%`, userId]
        );

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.sendFriendRequest = async (req, res) => {
    try {
        const { receiver_id } = req.body;
        const sender_id = req.userId;

        if (sender_id === receiver_id) {
            return res.status(400).json({ error: 'Cannot send friend request to yourself' });
        }

        const [blocked] = await db.query(
            'SELECT * FROM Blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
            [sender_id, receiver_id, receiver_id, sender_id]
        );

        if (blocked.length > 0) {
            return res.status(400).json({ error: 'Cannot send friend request to this user' });
        }

        const [existing] = await db.query(
            'SELECT * FROM Friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
            [sender_id, receiver_id, receiver_id, sender_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already friends' });
        }

        const [existingRequest] = await db.query(
            'SELECT * FROM Friend_request WHERE Sender = ? AND Receiver = ? AND Status = "pending"',
            [sender_id, receiver_id]
        );

        if (existingRequest.length > 0) {
            return res.status(400).json({ error: 'Friend request already sent' });
        }

        await db.query(
            'INSERT INTO Friend_request (Sender, Receiver) VALUES (?, ?)',
            [sender_id, receiver_id]
        );

        const [senderInfo] = await db.query('SELECT Full_name FROM USERS WHERE ID = ?', [sender_id]);
        await db.query(
            'INSERT INTO Notification (user_id, Message, Type, related_id) VALUES (?, ?, ?, ?)',
            [receiver_id, `${senderInfo[0].Full_name} sent you a friend request`, 'friend_request', sender_id]
        );

        res.json({ message: 'Friend request sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getIncomingRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `SELECT fr.ID, fr.Sender, fr.Created_at, u.Student_ID, u.Full_name, u.Department, u.Year, u.Profile_pic
             FROM Friend_request fr
             JOIN USERS u ON fr.Sender = u.ID
             WHERE fr.Receiver = ? AND fr.Status = "pending"
             ORDER BY fr.Created_at DESC`,
            [req.userId]
        );

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getSentRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `SELECT fr.ID, fr.Receiver, fr.Created_at, u.Student_ID, u.Full_name, u.Department, u.Year, u.Profile_pic
             FROM Friend_request fr
             JOIN USERS u ON fr.Receiver = u.ID
             WHERE fr.Sender = ? AND fr.Status = "pending"
             ORDER BY fr.Created_at DESC`,
            [req.userId]
        );

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.acceptFriendRequest = async (req, res) => {
    try {
        const { request_id } = req.params;

        const [requests] = await db.query(
            'SELECT * FROM Friend_request WHERE ID = ? AND Receiver = ? AND Status = "pending"',
            [request_id, req.userId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        const request = requests[0];

        await db.query(
            'INSERT INTO Friends (user_id, friend_id) VALUES (?, ?), (?, ?)',
            [request.Sender, request.Receiver, request.Receiver, request.Sender]
        );

        await db.query(
            'UPDATE Friend_request SET Status = "accepted" WHERE ID = ?',
            [request_id]
        );

        const [receiverInfo] = await db.query('SELECT Full_name FROM USERS WHERE ID = ?', [req.userId]);
        await db.query(
            'INSERT INTO Notification (user_id, Message, Type, related_id) VALUES (?, ?, ?, ?)',
            [request.Sender, `${receiverInfo[0].Full_name} accepted your friend request`, 'friend_accepted', req.userId]
        );

        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.declineFriendRequest = async (req, res) => {
    try {
        const { request_id } = req.params;

        const [requests] = await db.query(
            'SELECT * FROM Friend_request WHERE ID = ? AND Receiver = ?',
            [request_id, req.userId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        await db.query(
            'UPDATE Friend_request SET Status = "declined" WHERE ID = ?',
            [request_id]
        );

        res.json({ message: 'Friend request declined' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getFriendsList = async (req, res) => {
    try {
        const [friends] = await db.query(
            `SELECT u.ID, u.Student_ID, u.Full_name, u.Department, u.Year, u.Profile_pic, u.Status, f.Created_at
             FROM Friends f
             JOIN USERS u ON f.friend_id = u.ID
             WHERE f.user_id = ?
             ORDER BY u.Full_name`,
            [req.userId]
        );

        res.json(friends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMutualFriends = async (req, res) => {
    try {
        const { user_id } = req.params;

        const [mutualFriends] = await db.query(
            `SELECT DISTINCT u.ID, u.Student_ID, u.Full_name, u.Department, u.Year
             FROM Friends f1
             JOIN Friends f2 ON f1.friend_id = f2.friend_id
             JOIN USERS u ON f1.friend_id = u.ID
             WHERE f1.user_id = ? AND f2.user_id = ?`,
            [req.userId, user_id]
        );

        res.json(mutualFriends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.removeFriend = async (req, res) => {
    try {
        const { friend_id } = req.params;

        await db.query(
            'DELETE FROM Friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
            [req.userId, friend_id, friend_id, req.userId]
        );

        res.json({ message: 'Friend removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const { user_id } = req.body;

        await db.query(
            'DELETE FROM Friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
            [req.userId, user_id, user_id, req.userId]
        );

        await db.query(
            'INSERT INTO Blocked_users (blocker_id, blocked_id) VALUES (?, ?)',
            [req.userId, user_id]
        );

        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.unblockUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        await db.query(
            'DELETE FROM Blocked_users WHERE blocker_id = ? AND blocked_id = ?',
            [req.userId, user_id]
        );

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getBlockedUsers = async (req, res) => {
    try {
        const [blockedUsers] = await db.query(
            `SELECT u.ID, u.Student_ID, u.Full_name, u.Department, u.Year, b.Created_at as blocked_at
             FROM Blocked_users b
             JOIN USERS u ON b.blocked_id = u.ID
             WHERE b.blocker_id = ?
             ORDER BY b.Created_at DESC`,
            [req.userId]
        );

        res.json(blockedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
