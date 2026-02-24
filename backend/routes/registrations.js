const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
// Optional S3 support if USE_S3=true and AWS credentials are configured
let upload;
if (process.env.USE_S3 === 'true') {
  const AWS = require('aws-sdk');
  const multerS3 = require('multer-s3');
  const s3 = new AWS.S3();

  upload = multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET,
      acl: 'private',
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = unique + '-' + file.originalname.replace(/\s+/g, '-');
        cb(null, `payment-proofs/${filename}`);
      }
    }),
    limits: { fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || '5242880', 10) } // default 5MB
  });
} else {
  // disk storage
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: function (req, file, cb) {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + '-' + file.originalname.replace(/\s+/g, '-'));
    }
  });

  // Accept only images and PDFs as payment proof
  const fileFilter = (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only PNG/JPEG/PDF allowed.'));
  };

  upload = multer({ storage, limits: { fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || '5242880', 10) }, fileFilter });
}

const {
  registerForEvent,
  getMyRegistrations,
  getTicket,
  markAttendance,
  getAttendanceLogs,
  exportAttendanceCSV,
  exportRegistrationsICS,
  getPendingOrders,
  approveOrder,
  rejectOrder
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Participant routes
// For merchandise orders, allow multipart with payment proof
// Limit registration requests per IP to reduce abuse
router.post('/:eventId', protect, authorize('participant'), authLimiter, upload.single('paymentProof'), registerForEvent);
router.get('/my-registrations', protect, authorize('participant'), getMyRegistrations);

// Get ticket (accessible by participant and organizer)
router.get('/ticket/:ticketId', protect, getTicket);

// Mark attendance by scanning ticket (organizer/admin)
router.post('/scan', protect, authorize('organizer', 'admin'), markAttendance);

// Pending merchandise orders
router.get('/pending-orders', protect, authorize('organizer', 'admin'), getPendingOrders);

// Attendance logs & export
router.get('/attendance/:eventId', protect, authorize('organizer', 'admin'), getAttendanceLogs);
router.get('/attendance/:eventId/export', protect, authorize('organizer', 'admin'), exportAttendanceCSV);

// Export participant registrations as .ics (batch)
router.post('/export/ics', protect, authorize('participant'), exportRegistrationsICS);

// Approve / Reject orders
router.patch('/:id/approve', protect, authorize('organizer', 'admin'), approveOrder);
router.patch('/:id/reject', protect, authorize('organizer', 'admin'), rejectOrder);

module.exports = router;