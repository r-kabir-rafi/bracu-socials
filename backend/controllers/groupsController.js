const db = require('../config/database');

exports.createGroup = async (req, res) => {
    try {
        const { name, description, category, privacy } = req.body;

        const [result] = await db.query(
            'INSERT INTO Groups (Name, Description, Category, Privacy, Created_by) VALUES (?, ?, ?, ?, ?)',
            [name, description, category, privacy || 'public', req.userId]
        );

        await db.query(
            'INSERT INTO Members_of (user_id, group_id, role) VALUES (?, ?, ?)',
            [req.userId, result.insertId, 'Admin']
        );

        res.status(201).json({ 
            message: 'Group created successfully',
            groupId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAllGroups = async (req, res) => {
    try {
        const { category } = req.query;

        let query = `
            SELECT g.*, u.Full_name as creator_name, COUNT(m.user_id) as member_count,
                   (SELECT COUNT(*) FROM Members_of WHERE user_id = ? AND group_id = g.ID) as is_member,
                   (SELECT COUNT(*) FROM Group_join_request WHERE user_id = ? AND group_id = g.ID AND Status = 'pending') as has_pending_request
            FROM Groups g
            JOIN USERS u ON g.Created_by = u.ID
            LEFT JOIN Members_of m ON g.ID = m.group_id
            WHERE g.Created_by NOT IN (
                SELECT blocked_id FROM Blocked_users WHERE blocker_id = ?
            )
            AND g.Created_by NOT IN (
                SELECT blocker_id FROM Blocked_users WHERE blocked_id = ?
            )
        `;

        const params = [req.userId, req.userId, req.userId, req.userId];

        if (category) {
            query += ' AND g.Category = ?';
            params.push(category);
        }

        query += ' GROUP BY g.ID ORDER BY g.Created_at DESC';

        const [groups] = await db.query(query, params);
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getGroupDetails = async (req, res) => {
    try {
        const { group_id } = req.params;

        const [groups] = await db.query(
            `SELECT g.*, u.Full_name as creator_name, u.Profile_pic as creator_pic
             FROM Groups g
             JOIN USERS u ON g.Created_by = u.ID
             WHERE g.ID = ?`,
            [group_id]
        );

        if (groups.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const [memberCount] = await db.query(
            'SELECT COUNT(*) as count FROM Members_of WHERE group_id = ?',
            [group_id]
        );

        const group = groups[0];
        group.member_count = memberCount[0].count;

        res.json(group);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.joinGroup = async (req, res) => {
    try {
        const { group_id } = req.params;

        //privacy
        const [group] = await db.query('SELECT Privacy FROM Groups WHERE ID = ?', [group_id]);
        if (group.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const [existing] = await db.query(
            'SELECT * FROM Members_of WHERE user_id = ? AND group_id = ?',
            [req.userId, group_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already a member of this group' });
        }


        if (group[0].Privacy === 'private') {

            const [existingRequest] = await db.query(
                'SELECT * FROM Group_join_request WHERE user_id = ? AND group_id = ? AND Status = "pending"',
                [req.userId, group_id]
            );

            if (existingRequest.length > 0) {
                return res.status(400).json({ error: 'Join request already pending' });
            }

            await db.query(
                'INSERT INTO Group_join_request (user_id, group_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE Status = "pending", Created_at = NOW()',
                [req.userId, group_id]
            );

            return res.json({ message: 'Join request sent. Waiting for admin approval.' });
        }


        await db.query(
            'INSERT INTO Members_of (user_id, group_id) VALUES (?, ?)',
            [req.userId, group_id]
        );

        res.json({ message: 'Joined group successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.leaveGroup = async (req, res) => {
    try {
        const { group_id } = req.params;

        const [group] = await db.query(
            'SELECT Created_by FROM Groups WHERE ID = ?',
            [group_id]
        );

        if (group.length > 0 && group[0].Created_by === req.userId) {
            return res.status(400).json({ error: 'Group creator cannot leave. Transfer ownership or delete the group.' });
        }

        await db.query(
            'DELETE FROM Members_of WHERE user_id = ? AND group_id = ?',
            [req.userId, group_id]
        );

        res.json({ message: 'Left group successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getGroupMembers = async (req, res) => {
    try {
        const { group_id } = req.params;

        const [members] = await db.query(
            `SELECT u.ID, u.Student_ID, u.Full_name, u.Department, u.Year, u.Profile_pic, m.role, m.Joined_at
             FROM Members_of m
             JOIN USERS u ON m.user_id = u.ID
             WHERE m.group_id = ?
             ORDER BY m.role DESC, u.Full_name`,
            [group_id]
        );

        res.json(members);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createPost = async (req, res) => {
    try {
        const { group_id, content } = req.body;

        const [membership] = await db.query(
            'SELECT * FROM Members_of WHERE user_id = ? AND group_id = ?',
            [req.userId, group_id]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'You must be a member to post' });
        }

        const [result] = await db.query(
            'INSERT INTO Posts (group_id, user_id, Content) VALUES (?, ?, ?)',
            [group_id, req.userId, content]
        );

        res.status(201).json({ 
            message: 'Post created successfully',
            postId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getGroupPosts = async (req, res) => {
    try {
        const { group_id } = req.params;


        const [group] = await db.query('SELECT Privacy FROM Groups WHERE ID = ?', [group_id]);
        if (group.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }


        if (group[0].Privacy === 'private') {
            const [membership] = await db.query(
                'SELECT * FROM Members_of WHERE user_id = ? AND group_id = ?',
                [req.userId, group_id]
            );

            if (membership.length === 0) {
                return res.status(403).json({ error: 'You must be a member to view posts in this private group' });
            }
        }

        const [posts] = await db.query(
            `SELECT p.*, u.Full_name, u.Profile_pic, u.Department, u.Year
             FROM Posts p
             JOIN USERS u ON p.user_id = u.ID
             WHERE p.group_id = ?
             ORDER BY p.Created_at DESC`,
            [group_id]
        );

        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.addComment = async (req, res) => {
    try {
        const { post_id, content } = req.body;


        const [post] = await db.query(
            'SELECT p.*, g.Privacy FROM Posts p JOIN Groups g ON p.group_id = g.ID WHERE p.ID = ?',
            [post_id]
        );

        if (post.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }


        const [membership] = await db.query(
            'SELECT * FROM Members_of WHERE user_id = ? AND group_id = ?',
            [req.userId, post[0].group_id]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'You must be a member to comment' });
        }

        const [result] = await db.query(
            'INSERT INTO Post_comments (post_id, user_id, Content) VALUES (?, ?, ?)',
            [post_id, req.userId, content]
        );

        res.status(201).json({
            message: 'Comment added successfully',
            commentId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.getPostComments = async (req, res) => {
    try {
        const { post_id } = req.params;

        const [comments] = await db.query(
            `SELECT c.*, u.Full_name, u.Profile_pic
             FROM Post_comments c
             JOIN USERS u ON c.user_id = u.ID
             WHERE c.post_id = ?
             ORDER BY c.Created_at ASC`,
            [post_id]
        );

        res.json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.deleteComment = async (req, res) => {
    try {
        const { comment_id } = req.params;

        const [comment] = await db.query('SELECT * FROM Post_comments WHERE ID = ?', [comment_id]);

        if (comment.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment[0].user_id !== req.userId) {
            return res.status(403).json({ error: 'You can only delete your own comments' });
        }

        await db.query('DELETE FROM Post_comments WHERE ID = ?', [comment_id]);

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const [groups] = await db.query(
            `SELECT g.*, m.role, m.Joined_at, COUNT(m2.user_id) as member_count
             FROM Members_of m
             JOIN Groups g ON m.group_id = g.ID
             LEFT JOIN Members_of m2 ON g.ID = m2.group_id
             WHERE m.user_id = ?
             GROUP BY g.ID
             ORDER BY m.Joined_at DESC`,
            [req.userId]
        );

        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.searchGroups = async (req, res) => {
    try {
        const { query } = req.query;

        const [groups] = await db.query(
            `SELECT g.*, u.Full_name as creator_name, COUNT(m.user_id) as member_count,
                    (SELECT COUNT(*) FROM Members_of WHERE user_id = ? AND group_id = g.ID) as is_member,
                    (SELECT COUNT(*) FROM Group_join_request WHERE user_id = ? AND group_id = g.ID AND Status = 'pending') as has_pending_request
             FROM Groups g
             JOIN USERS u ON g.Created_by = u.ID
             LEFT JOIN Members_of m ON g.ID = m.group_id
             WHERE (g.Name LIKE ? OR g.Description LIKE ?)
             GROUP BY g.ID
             ORDER BY member_count DESC
             LIMIT 20`,
            [req.userId, req.userId, `%${query}%`, `%${query}%`]
        );

        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.getJoinRequests = async (req, res) => {
    try {
        const { group_id } = req.params;


        const [admin] = await db.query(
            'SELECT * FROM Members_of WHERE user_id = ? AND group_id = ? AND role = "Admin"',
            [req.userId, group_id]
        );

        if (admin.length === 0) {
            return res.status(403).json({ error: 'Only admins can view join requests' });
        }

        const [requests] = await db.query(
            `SELECT jr.*, u.Full_name, u.Student_ID, u.Department, u.Profile_pic
             FROM Group_join_request jr
             JOIN USERS u ON jr.user_id = u.ID
             WHERE jr.group_id = ? AND jr.Status = 'pending'
             ORDER BY jr.Created_at DESC`,
            [group_id]
        );

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.handleJoinRequest = async (req, res) => {
    try {
        const { group_id, request_id } = req.params;
        const { action } = req.body;


        const [admin] = await db.query(
            'SELECT * FROM Members_of WHERE user_id = ? AND group_id = ? AND role = "Admin"',
            [req.userId, group_id]
        );

        if (admin.length === 0) {
            return res.status(403).json({ error: 'Only admins can handle join requests' });
        }


        const [request] = await db.query(
            'SELECT * FROM Group_join_request WHERE ID = ? AND group_id = ?',
            [request_id, group_id]
        );

        if (request.length === 0) {
            return res.status(404).json({ error: 'Join request not found' });
        }

        if (action === 'approve') {

            await db.query(
                'INSERT INTO Members_of (user_id, group_id) VALUES (?, ?)',
                [request[0].user_id, group_id]
            );


            await db.query(
                'UPDATE Group_join_request SET Status = "approved" WHERE ID = ?',
                [request_id]
            );


            await db.query(
                'INSERT INTO Notification (user_id, Message, Type, related_id) VALUES (?, ?, ?, ?)',
                [request[0].user_id, 'Your request to join the group has been approved!', 'group_approved', group_id]
            );

            res.json({ message: 'Request approved. User added to group.' });
        } else if (action === 'reject') {
            await db.query(
                'UPDATE Group_join_request SET Status = "rejected" WHERE ID = ?',
                [request_id]
            );

            res.json({ message: 'Request rejected.' });
        } else {
            res.status(400).json({ error: 'Invalid action. Use "approve" or "reject".' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.addAdmin = async (req, res) => {
    try {
        const { group_id } = req.params;
        const { user_id } = req.body;


        const [admin] = await db.query(
            'SELECT * FROM Members_of WHERE user_id = ? AND group_id = ? AND role = "Admin"',
            [req.userId, group_id]
        );

        if (admin.length === 0) {
            return res.status(403).json({ error: 'Only admins can add other admins' });
        }


        const [member] = await db.query(
            'SELECT * FROM Members_of WHERE user_id = ? AND group_id = ?',
            [user_id, group_id]
        );

        if (member.length === 0) {
            return res.status(400).json({ error: 'User must be a member first' });
        }

        if (member[0].role === 'Admin') {
            return res.status(400).json({ error: 'User is already an admin' });
        }

        await db.query(
            'UPDATE Members_of SET role = "Admin" WHERE user_id = ? AND group_id = ?',
            [user_id, group_id]
        );

        res.json({ message: 'User promoted to admin' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.removeAdmin = async (req, res) => {
    try {
        const { group_id } = req.params;
        const { user_id } = req.body;


        const [group] = await db.query(
            'SELECT Created_by FROM Groups WHERE ID = ?',
            [group_id]
        );

        if (group.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (group[0].Created_by !== req.userId) {
            return res.status(403).json({ error: 'Only the group creator can remove admins' });
        }

        if (parseInt(user_id) === req.userId) {
            return res.status(400).json({ error: 'Cannot remove yourself as admin' });
        }

        await db.query(
            'UPDATE Members_of SET role = "General" WHERE user_id = ? AND group_id = ?',
            [user_id, group_id]
        );

        res.json({ message: 'Admin removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.getMyRole = async (req, res) => {
    try {
        const { group_id } = req.params;

        const [membership] = await db.query(
            'SELECT role FROM Members_of WHERE user_id = ? AND group_id = ?',
            [req.userId, group_id]
        );

        if (membership.length === 0) {
            return res.json({ role: null, is_member: false });
        }

        res.json({ role: membership[0].role, is_member: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
