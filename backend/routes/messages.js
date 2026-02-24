const express = require('express');
const router = express.Router();
const { getMessagesForEvent, deleteMessage, pinMessage, reactToMessage, getMessagesForTeam } = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/auth');

// Get message history for an event (protected - must be authenticated to view)
router.get('/:eventId', protect, getMessagesForEvent);
// Get team message history
router.get('/team/:teamId', protect, getMessagesForTeam);

// Moderation endpoints (organizer/admin)
router.delete('/:id', protect, authorize('organizer','admin'), deleteMessage);
router.post('/:id/pin', protect, authorize('organizer','admin'), pinMessage);
// Reactions: any authenticated user can react
router.post('/:id/react', protect, reactToMessage);

module.exports = router;
