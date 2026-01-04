const db = require('../config/database');

exports.createEvent = async (req, res) => {
    try {
        const { name, location, description, event_time, max_participant, group_id } = req.body;

        const [result] = await db.query(
            'INSERT INTO Events (Name, location, description, event_time, max_participant, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [name, location, description, event_time, max_participant, req.userId]
        );

        const eventId = result.insertId;

        if (group_id) {
            await db.query(
                'INSERT INTO Launches (group_id, event_id) VALUES (?, ?)',
                [group_id, eventId]
            );
        }

        await db.query(
            'INSERT INTO Joins (user_id, event_id, rsvp_status) VALUES (?, ?, ?)',
            [req.userId, eventId, 'accepted']
        );

        res.status(201).json({ 
            message: 'Event created successfully',
            eventId: eventId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const [events] = await db.query(
            `SELECT e.*, u.Full_name as creator_name, COUNT(j.user_id) as participant_count
             FROM Events e
             JOIN USERS u ON e.created_by = u.ID
             LEFT JOIN Joins j ON e.ID = j.event_id AND j.rsvp_status = 'accepted'
             WHERE e.event_time >= NOW()
             AND e.created_by NOT IN (
                SELECT blocked_id FROM Blocked_users WHERE blocker_id = ?
             )
             AND e.created_by NOT IN (
                SELECT blocker_id FROM Blocked_users WHERE blocked_id = ?
             )
             GROUP BY e.ID
             ORDER BY e.event_time ASC`,
            [req.userId, req.userId]
        );

        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getEventDetails = async (req, res) => {
    try {
        const { event_id } = req.params;

        const [events] = await db.query(
            `SELECT e.*, u.Full_name as creator_name
             FROM Events e
             JOIN USERS u ON e.created_by = u.ID
             WHERE e.ID = ?`,
            [event_id]
        );

        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if creator is blocked
        const [blocked] = await db.query(
            'SELECT * FROM Blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
            [req.userId, events[0].created_by, events[0].created_by, req.userId]
        );

        if (blocked.length > 0) {
            return res.status(403).json({ error: 'Unable to view this event' });
        }

        const [participantCount] = await db.query(
            'SELECT COUNT(*) as count FROM Joins WHERE event_id = ? AND rsvp_status = "accepted"',
            [event_id]
        );

        const event = events[0];
        event.participant_count = participantCount[0].count;

        res.json(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.rsvpEvent = async (req, res) => {
    try {
        const { event_id } = req.params;
        const { rsvp_status } = req.body;

        const [events] = await db.query('SELECT * FROM Events WHERE ID = ?', [event_id]);
        
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = events[0];

        if (rsvp_status === 'accepted' && event.max_participant) {
            const [participantCount] = await db.query(
                'SELECT COUNT(*) as count FROM Joins WHERE event_id = ? AND rsvp_status = "accepted"',
                [event_id]
            );

            if (participantCount[0].count >= event.max_participant) {
                return res.status(400).json({ error: 'Event is full' });
            }
        }

        const [existing] = await db.query(
            'SELECT * FROM Joins WHERE user_id = ? AND event_id = ?',
            [req.userId, event_id]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE Joins SET rsvp_status = ? WHERE user_id = ? AND event_id = ?',
                [rsvp_status, req.userId, event_id]
            );
        } else {
            await db.query(
                'INSERT INTO Joins (user_id, event_id, rsvp_status) VALUES (?, ?, ?)',
                [req.userId, event_id, rsvp_status]
            );
        }

        res.json({ message: 'RSVP updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.inviteFriends = async (req, res) => {
    try {
        const { event_id } = req.params;
        const { friend_ids } = req.body;

        const [events] = await db.query('SELECT created_by, Name FROM Events WHERE ID = ?', [event_id]);
        
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const [userInfo] = await db.query('SELECT Full_name FROM USERS WHERE ID = ?', [req.userId]);

        for (const friendId of friend_ids) {
            await db.query(
                'INSERT INTO Notification (user_id, Message, Type, related_id) VALUES (?, ?, ?, ?)',
                [friendId, `${userInfo[0].Full_name} invited you to event: ${events[0].Name}`, 'event_invite', event_id]
            );
        }

        res.json({ message: 'Invitations sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getEventParticipants = async (req, res) => {
    try {
        const { event_id } = req.params;

        const [participants] = await db.query(
            `SELECT u.ID, u.Student_ID, u.Full_name, u.Department, u.Year, u.Profile_pic, j.rsvp_status, j.Joined_at
             FROM Joins j
             JOIN USERS u ON j.user_id = u.ID
             WHERE j.event_id = ?
             ORDER BY j.rsvp_status, u.Full_name`,
            [event_id]
        );

        res.json(participants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUserEvents = async (req, res) => {
    try {
        const [events] = await db.query(
            `SELECT e.*, j.rsvp_status, u.Full_name as creator_name, COUNT(j2.user_id) as participant_count
             FROM Joins j
             JOIN Events e ON j.event_id = e.ID
             JOIN USERS u ON e.created_by = u.ID
             LEFT JOIN Joins j2 ON e.ID = j2.event_id AND j2.rsvp_status = 'accepted'
             WHERE j.user_id = ? AND e.event_time >= NOW()
             GROUP BY e.ID
             ORDER BY e.event_time ASC`,
            [req.userId]
        );

        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.searchEvents = async (req, res) => {
    try {
        const { query, location } = req.query;

        let sql = `
            SELECT e.*, u.Full_name as creator_name, COUNT(j.user_id) as participant_count
            FROM Events e
            JOIN USERS u ON e.created_by = u.ID
            LEFT JOIN Joins j ON e.ID = j.event_id AND j.rsvp_status = 'accepted'
            WHERE e.event_time >= NOW()
        `;

        const params = [];

        if (query) {
            sql += ' AND (e.Name LIKE ? OR e.description LIKE ?)';
            params.push(`%${query}%`, `%${query}%`);
        }

        if (location) {
            sql += ' AND e.location LIKE ?';
            params.push(`%${location}%`);
        }

        sql += ' GROUP BY e.ID ORDER BY e.event_time ASC LIMIT 20';

        const [events] = await db.query(sql, params);
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { event_id } = req.params;

        const [events] = await db.query('SELECT created_by FROM Events WHERE ID = ?', [event_id]);
        
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (events[0].created_by !== req.userId) {
            return res.status(403).json({ error: 'Only event creator can delete the event' });
        }

        await db.query('DELETE FROM Events WHERE ID = ?', [event_id]);

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.updateEvent = async (req, res) => {
    try {
        const { event_id } = req.params;
        const { name, description, location, event_time, max_participant } = req.body;

        const [events] = await db.query('SELECT created_by FROM Events WHERE ID = ?', [event_id]);
        
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (events[0].created_by !== req.userId) {
            return res.status(403).json({ error: 'Only event creator can edit the event' });
        }

        await db.query(
            'UPDATE Events SET Name = ?, description = ?, location = ?, event_time = ?, max_participant = ? WHERE ID = ?',
            [name, description, location, event_time, max_participant, event_id]
        );

        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
