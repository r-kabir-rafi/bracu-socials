const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groupsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', groupsController.createGroup);
router.get('/', groupsController.getAllGroups);
router.get('/my-groups', groupsController.getUserGroups);
router.get('/search', groupsController.searchGroups);
router.get('/:group_id', groupsController.getGroupDetails);
router.get('/:group_id/my-role', groupsController.getMyRole);
router.post('/:group_id/join', groupsController.joinGroup);
router.delete('/:group_id/leave', groupsController.leaveGroup);
router.get('/:group_id/members', groupsController.getGroupMembers);
router.post('/posts', groupsController.createPost);
router.get('/:group_id/posts', groupsController.getGroupPosts);

// Post comments
router.post('/posts/comments', groupsController.addComment);
router.get('/posts/:post_id/comments', groupsController.getPostComments);
router.delete('/posts/comments/:comment_id', groupsController.deleteComment);

// Join request management (admins only)
router.get('/:group_id/join-requests', groupsController.getJoinRequests);
router.post('/:group_id/join-requests/:request_id', groupsController.handleJoinRequest);

// Admin management
router.post('/:group_id/admins', groupsController.addAdmin);
router.delete('/:group_id/admins', groupsController.removeAdmin);

module.exports = router;
