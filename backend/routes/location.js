const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/spots', locationController.getCampusSpots);
router.post('/checkin', locationController.checkIn);
router.get('/nearby/:location_id', locationController.getNearbyFriends);
router.get('/nearby', locationController.getAllNearbyFriends);
router.get('/history', locationController.getCheckInHistory);

module.exports = router;
