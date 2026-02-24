const express = require('express');
const router = express.Router();
const { registerParticipant, login, getMe, createOrganizer, changePassword } = require('../controllers/authController');
const { updateParticipantProfile } = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');
const { protect, authorize } = require('../middleware/auth');
const { authLimiter, loginLimiter } = require('../middleware/rateLimiter');
const verifyCaptcha = require('../middleware/verifyCaptcha');

// Protect registration with captcha and rate limiting
router.post('/register', authLimiter, verifyCaptcha, registerParticipant);
// Aggressive rate limiting on login
router.post('/login', loginLimiter, verifyCaptcha, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, authorize('participant'), updateParticipantProfile);
router.post('/create-organizer', protect, authorize('admin'), createOrganizer);
// Organizer password reset request (organizer only)
// Organizer password reset requests should be rate-limited and captcha-verified to prevent abuse
router.post('/password-reset-requests', protect, authorize('organizer'), authLimiter, verifyCaptcha, passwordResetController.createRequest);
// Change password (organizer uses temp password or current password to change)
router.post('/change-password', changePassword);

module.exports = router;