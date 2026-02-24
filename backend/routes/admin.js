const express = require('express');
const router = express.Router();
const {
  createOrganizer,
  getAllOrganizers,
  deleteOrganizer,
  permanentlyDeleteOrganizer,
  reactivateOrganizer
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const passwordResetController = require('../controllers/passwordResetController');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

router.post('/organizers', createOrganizer);
router.get('/organizers', getAllOrganizers);
router.delete('/organizers/:id', deleteOrganizer);
router.delete('/organizers/:id/permanent', permanentlyDeleteOrganizer);
router.put('/organizers/:id/reactivate', reactivateOrganizer);

// Password reset request admin endpoints (list / approve / reject)
router.get('/password-reset-requests', passwordResetController.getAllRequests);
router.patch('/password-reset-requests/:id/approve', passwordResetController.approveRequest);
router.patch('/password-reset-requests/:id/reject', passwordResetController.rejectRequest);

module.exports = router;