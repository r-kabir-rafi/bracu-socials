const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friendsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/profile/:user_id', friendsController.getUserProfile);
router.get('/search', friendsController.searchUsers);
router.post('/request', friendsController.sendFriendRequest);
router.get('/requests/incoming', friendsController.getIncomingRequests);
router.get('/requests/sent', friendsController.getSentRequests);
router.post('/request/:request_id/accept', friendsController.acceptFriendRequest);
router.post('/request/:request_id/decline', friendsController.declineFriendRequest);
router.get('/list', friendsController.getFriendsList);
router.get('/mutual/:user_id', friendsController.getMutualFriends);
router.delete('/:friend_id', friendsController.removeFriend);
router.post('/block', friendsController.blockUser);
router.get('/blocked', friendsController.getBlockedUsers);
router.delete('/block/:user_id', friendsController.unblockUser);

module.exports = router;
