const express = require('express');
const router = express.Router();
const smartMatchingController = require('../controllers/smartMatchingController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/suggest-friends', smartMatchingController.suggestFriends);
router.get('/common-free-time', smartMatchingController.getCommonFreeTime);
router.get('/recommend-groups', smartMatchingController.recommendGroups);
router.get('/recommend-nearby', smartMatchingController.recommendNearbyFriends);
router.get('/search-by-dept-year', smartMatchingController.searchByDepartmentYear);
router.get('/popular-spots', smartMatchingController.getPopularSpots);

module.exports = router;
