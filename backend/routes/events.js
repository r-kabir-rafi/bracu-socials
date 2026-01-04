const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', eventsController.createEvent);
router.get('/', eventsController.getAllEvents);
router.get('/my-events', eventsController.getUserEvents);
router.get('/search', eventsController.searchEvents);
router.get('/:event_id', eventsController.getEventDetails);
router.post('/:event_id/rsvp', eventsController.rsvpEvent);
router.post('/:event_id/invite', eventsController.inviteFriends);
router.get('/:event_id/participants', eventsController.getEventParticipants);
router.put('/:event_id', eventsController.updateEvent);
router.delete('/:event_id', eventsController.deleteEvent);

module.exports = router;
