const db = require('../config/database');

const CAMPUS_START = '08:00:00';
const CAMPUS_END = '17:00:00';

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function calculateFreeSlots(busySlots) {
    const campusStart = timeToMinutes(CAMPUS_START);
    const campusEnd = timeToMinutes(CAMPUS_END);
    
    const sorted = busySlots
        .map(slot => ({
            start: timeToMinutes(slot.Start_time),
            end: timeToMinutes(slot.End_time)
        }))
        .sort((a, b) => a.start - b.start);
    
    const freeSlots = [];
    let currentTime = campusStart;
    
    for (const slot of sorted) {
        if (slot.start > currentTime) {
            freeSlots.push({
                start: minutesToTime(currentTime),
                end: minutesToTime(slot.start)
            });
        }
        currentTime = Math.max(currentTime, slot.end);
    }
    
    if (currentTime < campusEnd) {
        freeSlots.push({
            start: minutesToTime(currentTime),
            end: minutesToTime(campusEnd)
        });
    }
    
    return freeSlots;
}

function isCurrentlyFree(schedule, currentDay, currentTime) {
    const currentMinutes = timeToMinutes(currentTime);
    const campusStart = timeToMinutes(CAMPUS_START);
    const campusEnd = timeToMinutes(CAMPUS_END);
    
    if (currentMinutes < campusStart || currentMinutes > campusEnd) {
        return null;
    }
    
    for (const item of schedule) {
        if (item.Class_days.toLowerCase().includes(currentDay.toLowerCase())) {
            const classStart = timeToMinutes(item.Start_time);
            const classEnd = timeToMinutes(item.End_time);
            
            if (currentMinutes >= classStart && currentMinutes < classEnd) {
                return false;
            }
        }
    }
    
    return true;
}

exports.calculateCurrentStatus = async function(userId) {
    const [availability] = await db.query(
        'SELECT * FROM User_availability WHERE user_id = ?',
        [userId]
    );

    let status = 'free';
    let isOverride = false;

    if (availability.length > 0) {
        const userAvail = availability[0];
        
        if (userAvail.status_override) {
            if (userAvail.override_until && new Date(userAvail.override_until) < new Date()) {
                await db.query(
                    'UPDATE User_availability SET status_override = FALSE, override_until = NULL WHERE user_id = ?',
                    [userId]
                );
            } else {
                status = userAvail.current_status;
                isOverride = true;
            }
        }
    }

    if (!isOverride) {
        const now = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDay = days[now.getDay()];
        const currentTime = now.toTimeString().slice(0, 8);

        const [schedule] = await db.query(
            'SELECT * FROM SCHEDULE WHERE user_id = ?',
            [userId]
        );

        const isFree = isCurrentlyFree(schedule, currentDay, currentTime);
        
        if (isFree === null) {
            status = 'off_campus';
        } else {
            status = isFree ? 'free' : 'busy';
        }
    }

    return { current_status: status, is_override: isOverride };
};

exports.addClass = async (req, res) => {
    try {
        const { course_code, class_days, location, start_time, end_time } = req.body;

        await db.query(
            'INSERT INTO SCHEDULE (user_id, Course_code, Class_days, Location, Start_time, End_time) VALUES (?, ?, ?, ?, ?, ?)',
            [req.userId, course_code, class_days, location, start_time, end_time]
        );

        res.json({ message: 'Class added to schedule successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getSchedule = async (req, res) => {
    try {
        const targetUserId = req.params.user_id || req.userId;

        if (targetUserId != req.userId) {
            const [user] = await db.query(
                'SELECT Privacy_schedule FROM USERS WHERE ID = ?',
                [targetUserId]
            );

            if (user.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (user[0].Privacy_schedule === 'private') {
                return res.status(403).json({ error: 'Schedule is private' });
            }

            if (user[0].Privacy_schedule === 'friends') {
                const [friendship] = await db.query(
                    'SELECT * FROM Friends WHERE user_id = ? AND friend_id = ?',
                    [req.userId, targetUserId]
                );

                if (friendship.length === 0) {
                    return res.status(403).json({ error: 'Schedule is only visible to friends' });
                }
            }
        }

        const [schedule] = await db.query(
            'SELECT * FROM SCHEDULE WHERE user_id = ? ORDER BY Start_time',
            [targetUserId]
        );

        res.json(schedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateClass = async (req, res) => {
    try {
        const { course_code } = req.params;
        const { class_days, location, start_time, end_time } = req.body;

        await db.query(
            'UPDATE SCHEDULE SET Class_days = ?, Location = ?, Start_time = ?, End_time = ? WHERE user_id = ? AND Course_code = ?',
            [class_days, location, start_time, end_time, req.userId, course_code]
        );

        res.json({ message: 'Class updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { course_code } = req.params;

        await db.query(
            'DELETE FROM SCHEDULE WHERE user_id = ? AND Course_code = ?',
            [req.userId, course_code]
        );

        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.findCommonFreeTime = async (req, res) => {
    try {
        const { friend_ids, day } = req.body;

        const [mySchedule] = await db.query(
            'SELECT Start_time, End_time FROM SCHEDULE WHERE user_id = ? AND Class_days LIKE ?',
            [req.userId, `%${day}%`]
        );

        const friendSchedules = [];
        for (const friendId of friend_ids) {
            const [schedule] = await db.query(
                'SELECT Start_time, End_time FROM SCHEDULE WHERE user_id = ? AND Class_days LIKE ?',
                [friendId, `%${day}%`]
            );
            friendSchedules.push(...schedule);
        }

        const allBusySlots = [...mySchedule, ...friendSchedules];
        
        const freeSlots = calculateFreeSlots(allBusySlots);

        res.json({ 
            day,
            campus_hours: { start: CAMPUS_START, end: CAMPUS_END },
            busy_slots: allBusySlots,
            free_slots: freeSlots 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.getFreeTime = async (req, res) => {
    try {
        const { day } = req.params;
        const targetUserId = req.query.user_id || req.userId;

        const [schedule] = await db.query(
            'SELECT Start_time, End_time FROM SCHEDULE WHERE user_id = ? AND Class_days LIKE ?',
            [targetUserId, `%${day}%`]
        );

        const freeSlots = calculateFreeSlots(schedule);

        res.json({
            day,
            campus_hours: { start: CAMPUS_START, end: CAMPUS_END },
            classes: schedule.length,
            free_slots: freeSlots
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};


exports.getStatus = async (req, res) => {
    try {
        const targetUserId = req.params.user_id || req.userId;

        const [availability] = await db.query(
            'SELECT * FROM User_availability WHERE user_id = ?',
            [targetUserId]
        );

        let status = 'free';
        let isOverride = false;

        if (availability.length > 0) {
            const userAvail = availability[0];
            
            if (userAvail.status_override) {
                if (userAvail.override_until && new Date(userAvail.override_until) < new Date()) {
                    await db.query(
                        'UPDATE User_availability SET status_override = FALSE, override_until = NULL WHERE user_id = ?',
                        [targetUserId]
                    );
                } else {
                    status = userAvail.current_status;
                    isOverride = true;
                }
            }
        }

        if (!isOverride) {
            const now = new Date();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const currentDay = days[now.getDay()];
            const currentTime = now.toTimeString().slice(0, 8);

            const [schedule] = await db.query(
                'SELECT * FROM SCHEDULE WHERE user_id = ?',
                [targetUserId]
            );

            const isFree = isCurrentlyFree(schedule, currentDay, currentTime);
            
            if (isFree === null) {
                status = 'off_campus';
                status = isFree ? 'free' : 'busy';
            }
        }

        res.json({
            user_id: parseInt(targetUserId),
            status,
            is_override: isOverride,
            campus_hours: { start: CAMPUS_START, end: CAMPUS_END }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.setStatus = async (req, res) => {
    try {
        const { status, duration_minutes } = req.body;

        if (!['free', 'busy'].includes(status)) {
            return res.status(400).json({ error: 'Status must be "free" or "busy"' });
        }

        let overrideUntil = null;
        if (duration_minutes) {
            overrideUntil = new Date(Date.now() + duration_minutes * 60 * 1000);
        }

        await db.query(
            `INSERT INTO User_availability (user_id, current_status, status_override, override_until) 
             VALUES (?, ?, TRUE, ?)
             ON DUPLICATE KEY UPDATE current_status = ?, status_override = TRUE, override_until = ?`,
            [req.userId, status, overrideUntil, status, overrideUntil]
        );

        res.json({ 
            message: 'Status updated',
            status,
            is_override: true,
            override_until: overrideUntil
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.clearStatusOverride = async (req, res) => {
    try {
        await db.query(
            'UPDATE User_availability SET status_override = FALSE, override_until = NULL WHERE user_id = ?',
            [req.userId]
        );

        res.json({ message: 'Status override cleared. Now using schedule-based status.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
