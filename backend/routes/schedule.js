const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Schedule management
router.post('/class', scheduleController.addClass);
router.get('/', scheduleController.getSchedule);
router.get('/user/:user_id', scheduleController.getSchedule);
router.put('/class/:course_code', scheduleController.updateClass);
router.delete('/class/:course_code', scheduleController.deleteClass);

// Free time
router.get('/free-time/:day', scheduleController.getFreeTime);
router.post('/common-free-time', scheduleController.findCommonFreeTime);

// Status (free/busy)
router.get('/status', scheduleController.getStatus);
router.get('/status/:user_id', scheduleController.getStatus);
router.post('/status', scheduleController.setStatus);
router.delete('/status/override', scheduleController.clearStatusOverride);

module.exports = router;
