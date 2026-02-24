const express = require('express');
const router = express.Router();
const {
  createEvent,
  updateEvent,
  publishEvent,
  updateCustomForm,
  getMyEvents,
  getEvent,
  browseEvents
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const { exportEventICS } = require('../controllers/eventController');

// Public routes
router.get('/', browseEvents);
router.get('/:id', getEvent);
// Export event .ics
router.get('/:id/ics', exportEventICS);

// Organizer routes
router.post('/', protect, authorize('organizer'), createEvent);
router.put('/:id', protect, authorize('organizer'), updateEvent);
router.post('/:id/publish', protect, authorize('organizer'), publishEvent);
router.put('/:id/form', protect, authorize('organizer'), updateCustomForm);
router.get('/organizer/my-events', protect, authorize('organizer'), getMyEvents);

module.exports = router;