const express = require('express');
const router = express.Router();
const { listOrganizers, getOrganizer, updateOrganizer, followOrganizer, unfollowOrganizer } = require('../controllers/organizerController');
const { createRequest } = require('../controllers/passwordResetController');
const { protect, authorize } = require('../middleware/auth');

// Public: list organizers
router.get('/', listOrganizers);
// Public: get organizer profile
router.get('/:id', getOrganizer);

// Organizer: REQUEST PASSWORD RESET (Tier B Feature)
// This connects your frontend button to the createRequest logic
router.post('/request-reset', protect, authorize('organizer'), createRequest);

// Participant: follow/unfollow
router.post('/:id/follow', protect, authorize('participant'), followOrganizer);
router.delete('/:id/follow', protect, authorize('participant'), unfollowOrganizer);

// Organizer/Admin: update profile
router.put('/:id', protect, authorize('organizer','admin'), updateOrganizer);
// Test webhook
router.post('/:id/webhook/test', protect, authorize('organizer','admin'), require('../controllers/organizerController').testWebhook);

module.exports = router;
