const db = require('../config/database');

exports.getNotifications = async (req, res) => {
    try {
        const [notifications] = await db.query(
            'SELECT * FROM Notification WHERE user_id = ? ORDER BY Created_at DESC LIMIT 50',
            [req.userId]
        );

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM Notification WHERE user_id = ? AND is_read = FALSE',
            [req.userId]
        );

        res.json({ count: result[0].count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { notification_id } = req.params;

        await db.query(
            'UPDATE Notification SET is_read = TRUE WHERE ID = ? AND user_id = ?',
            [notification_id, req.userId]
        );

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await db.query(
            'UPDATE Notification SET is_read = TRUE WHERE user_id = ?',
            [req.userId]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { notification_id } = req.params;

        await db.query(
            'DELETE FROM Notification WHERE ID = ? AND user_id = ?',
            [notification_id, req.userId]
        );

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
