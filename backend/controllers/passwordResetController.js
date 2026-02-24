const PasswordResetRequest = require('../models/PasswordResetRequest');
const Organizer = require('../models/Organizer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../utils/emailService');

// Organizer creates a password reset request
exports.createRequest = async (req, res) => {
  try {
    const organizerId = req.user._id;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required' });

    const organizer = await Organizer.findById(organizerId);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const existing = await PasswordResetRequest.findOne({ organizer: organizerId, status: 'Pending' });
    if (existing) return res.status(400).json({ message: 'You already have a pending password reset request' });

    const reqDoc = await PasswordResetRequest.create({ organizer: organizerId, organizerName: organizer.organizerName, reason });

    // Optionally notify admins via email (ADMIN_EMAIL)
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await emailService.sendPasswordResetNotificationToAdmin(adminEmail, organizer, reqDoc);
      }
    } catch (e) {
      console.error('Failed notifying admin about password reset request:', e);
    }

    res.status(201).json({ success: true, message: 'Password reset request submitted', request: reqDoc });
  } catch (error) {
    console.error('Create password reset request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin gets all requests
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find().populate('organizer', 'organizerName email category').sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error('Get password reset requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin approves a request: generate temp password, update organizer, mark request approved
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const reqDoc = await PasswordResetRequest.findById(id).populate('organizer');
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status !== 'Pending') return res.status(400).json({ message: 'Request already processed' });

    // Generate a secure temporary password
    const tempPassword = crypto.randomBytes(6).toString('base64url'); // ~8 chars URL-safe
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(tempPassword, salt);

    // Update organizer password and set forcePasswordChange so organizer must change it on first login
    const organizer = await Organizer.findById(reqDoc.organizer._id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
    organizer.password = hashed;
    organizer.forcePasswordChange = true;
    await organizer.save();

    // Update request
    reqDoc.status = 'Approved';
    reqDoc.adminComment = comment || '';
    reqDoc.processedBy = req.user._id;
    reqDoc.processedAt = new Date();
    await reqDoc.save();

    // Send credentials to organizer via email only (rely solely on email delivery)
    try {
      await emailService.sendOrganizerCredentials(organizer, tempPassword);
    } catch (e) {
      console.error('Failed sending organizer credentials email:', e);
    }

    // Do NOT return the plaintext password in the API response for security
    res.json({ success: true, message: 'Request approved; temporary password emailed to the organizer', request: reqDoc });
  } catch (error) {
    console.error('Approve password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin rejects a request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const reqDoc = await PasswordResetRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status !== 'Pending') return res.status(400).json({ message: 'Request already processed' });

    reqDoc.status = 'Rejected';
    reqDoc.adminComment = comment || '';
    reqDoc.processedBy = req.user._id;
    reqDoc.processedAt = new Date();
    await reqDoc.save();

    // Optionally notify organizer
    try {
      const organizer = await Organizer.findById(reqDoc.organizer);
      if (organizer) {
        await emailService.sendPasswordResetRejectionEmail(organizer, reqDoc.adminComment || 'Your request was rejected');
      }
    } catch (e) {
      console.error('Failed sending rejection email:', e);
    }

    res.json({ success: true, message: 'Request rejected', request: reqDoc });
  } catch (error) {
    console.error('Reject password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
