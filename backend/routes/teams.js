const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const teamController = require('../controllers/teamController');

// Create team (participant)
router.post('/:eventId', protect, authorize('participant'), teamController.createTeam);

// Invite members (leader only)
router.post('/:teamId/invite', protect, authorize('participant'), teamController.inviteMembers);

// Accept invite (participant)
router.post('/invite/accept', protect, authorize('participant'), teamController.acceptInvite);

// Get team details
router.get('/:teamId', protect, teamController.getTeam);

// List teams for event (organizer/admin)
router.get('/event/:eventId', protect, authorize('organizer'), teamController.listTeamsForEvent);

module.exports = router;
