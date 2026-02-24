const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const QRCode = require('qrcode');
const crypto = require('crypto');
const emailService = require('../utils/emailService');
const path = require('path');

// Generate unique ticket ID
const generateTicketId = () => {
  return 'TKT-' + crypto.randomBytes(8).toString('hex').toUpperCase();
};

// Generate QR Code
const generateQRCode = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(data), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('QR generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

// @desc    Register for an event
// @route   POST /api/registrations/:eventId
// @access  Private - Participant only
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const participantId = req.user._id;
    // Support multipart/form-data for merchandise orders with payment proof
    const { formResponses } = req.body;
    let merchandiseOrder = null;
    if (req.body.merchandiseOrder) {
      try {
        merchandiseOrder = JSON.parse(req.body.merchandiseOrder);
      } catch (e) {
        merchandiseOrder = req.body.merchandiseOrder;
      }
    }

    // Get event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event is published
    if (event.status !== 'Published') {
      return res.status(400).json({ message: 'Event is not open for registration' });
    }

    // Check registration deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // Check registration limit
    if (event.registrationCount >= event.registrationLimit) {
      return res.status(400).json({ message: 'Registration limit reached' });
    }

    // Check eligibility
    const participant = await Participant.findById(participantId);
    if (event.eligibility === 'IIIT Only' && participant.participantType !== 'IIIT') {
      return res.status(403).json({ message: 'This event is only for IIIT students' });
    }
    if (event.eligibility === 'Non-IIIT Only' && participant.participantType === 'IIIT') {
      return res.status(403).json({ message: 'This event is only for Non-IIIT participants' });
    }

    // Check for existing registration
    const existingRegistration = await Registration.findOne({
      event: eventId,
      participant: participantId
    });

    if (existingRegistration) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Prepare registration data
    const registrationData = {
      event: eventId,
      participant: participantId,
      amountPaid: event.registrationFee,
      status: event.eventType === 'Normal' ? 'Confirmed' : 'Pending',
      paymentStatus: event.eventType === 'Normal' ? 'Completed' : 'Pending'
    };

    // Handle Normal Event registration
  if (event.eventType === 'Normal') {
      
      if (!formResponses || formResponses.length === 0) {
        return res.status(400).json({ message: 'Form responses are required' });
      }
      const ticketId = generateTicketId();
      registrationData.ticketId = ticketId;

      const qrData = { 
        ticketId,
        eventId: event._id,
        eventName: event.eventName,
        participantId: participant._id,
        participantName: `${participant.firstName} ${participant.lastName}`,
        participantEmail: participant.email,
        registrationDate: new Date().toISOString()
     };
      registrationData.qrCode = await generateQRCode(qrData);

      registrationData.formResponses = formResponses;

      // Lock form after first registration
      if (event.registrationCount === 0 && event.customForm) {
        event.customForm.isLocked = true;
      }
    }

   // Handle Merchandise Event registration
    if (event.eventType === 'Merchandise') {
    if (!merchandiseOrder) {
        return res.status(400).json({ message: 'Merchandise order details required' });
    }

    // Support both parsed and stringified JSON for compatibility with multipart/form-data
    let orderData = merchandiseOrder;
    if (typeof merchandiseOrder === 'string') {
        try {
        orderData = JSON.parse(merchandiseOrder);
        } catch (e) {
        return res.status(400).json({ message: 'Invalid merchandise order format' });
        }
    }

    const { variant, quantity } = orderData;

    // 1. Validation: Ensure quantity is a positive number
    const orderQuantity = parseInt(quantity) || 1;
    if (orderQuantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // 2. Check purchase limit per participant
    // We aggregate the total quantity already purchased (Confirmed/Pending) by this user for this event
    const previousPurchases = await Registration.aggregate([
        { 
        $match: { 
            event: event._id, 
            participant: participantId,
            status: { $ne: 'Rejected' } // Don't count rejected orders against the limit
        } 
        },
        { 
        $group: { 
            _id: null, 
            totalQuantity: { $sum: "$merchandiseOrder.quantity" } 
        } 
        }
    ]);

    const totalAlreadyPurchased = previousPurchases.length > 0 ? previousPurchases[0].totalQuantity : 0;
    const limit = event.merchandiseDetails.purchaseLimitPerParticipant;

    if (totalAlreadyPurchased + orderQuantity > limit) {
        return res.status(400).json({ 
        message: `Purchase limit exceeded. You have already ordered ${totalAlreadyPurchased} items. The limit is ${limit} per participant.` 
        });
    }

    // 3. Find variant and check stock availability
    const selectedVariant = event.merchandiseDetails.variants.find(
        v => v.size === variant.size && v.color === variant.color
    );

    if (!selectedVariant) {
        return res.status(400).json({ message: 'Invalid merchandise variant selected' });
    }

    // Proactive stock check before creating a pending registration
    if (selectedVariant.stockQuantity < orderQuantity) {
        return res.status(400).json({ message: `Insufficient stock. Only ${selectedVariant.stockQuantity} items left.` });
    }

    const totalAmount = (selectedVariant.price || event.registrationFee) * orderQuantity;

    registrationData.merchandiseOrder = {
        variant,
        quantity: orderQuantity,
        totalAmount
    };
    registrationData.amountPaid = totalAmount;

    // For merchandise orders, status is Pending until organizer approves payment proof
    registrationData.status = 'Pending';
    registrationData.paymentStatus = 'Pending';
      // Save payment proof if uploaded (req.file). Supports disk or S3.
      if (req.file) {
        if (req.file.location) {
          // multer-s3 exposes `location`
          registrationData.paymentProofUrl = req.file.location;
        } else if (req.file.path) {
          // multer disk returns `path`
          // store relative path for static serving
          const rel = req.file.path.replace(path.join(__dirname, '..'), '');
          registrationData.paymentProofUrl = rel.startsWith('/') ? rel : '/' + rel;
        } else if (req.file.filename) {
          registrationData.paymentProofUrl = `/uploads/${req.file.filename}`;
        }
      }
    }

    // Create registration
    const registration = await Registration.create(registrationData);

    // For Normal events, generate ticket and QR, update event counts
    if (event.eventType === 'Normal') {

      // Update event registration count and revenue
      event.registrationCount += 1;
      event.analytics.totalRevenue += registrationData.amountPaid || 0;
      await event.save();
    }

    // Populate registration for response
    await registration.populate('event', 'eventName eventType eventStartDate eventEndDate');
    await registration.populate('participant', 'firstName lastName email');

    // For Normal event send registration email immediately
    if (event.eventType === 'Normal') {
      await emailService.sendRegistrationEmail(participant, event, registration);
    }

    res.status(201).json({
      success: true,
      message: event.eventType === 'Merchandise' ? 'Order placed and pending approval' : 'Registration successful. Confirmation email sent',
      registration,
      ticketId: registration.ticketId,
      qrCode: registration.qrCode
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Get participant's registrations
// @route   GET /api/registrations/my-registrations
// @access  Private - Participant only
exports.getMyRegistrations = async (req, res) => {
  try {
    const { filter } = req.query; // upcoming, normal, merchandise, completed, cancelled

    let query = { participant: req.user._id };

    if (filter === 'upcoming') {
      const now = new Date();
      const registrations = await Registration.find(query)
        .populate({
          path: 'event',
          match: { eventStartDate: { $gte: now }, status: { $in: ['Published', 'Ongoing'] } },
          populate: { path: 'organizer', select: 'organizerName' }
        })
        .populate('participant', 'firstName lastName email')
        .sort({ 'event.eventStartDate': 1 });

      // Filter out null events (events that didn't match)
      const filtered = registrations.filter(r => r.event !== null);

      return res.json({
        success: true,
        count: filtered.length,
        registrations: filtered
      });
    }

    if (filter === 'completed') {
      const registrations = await Registration.find(query)
        .populate({
          path: 'event',
          match: { status: 'Completed' },
          populate: { path: 'organizer', select: 'organizerName' }
        })
        .populate('participant', 'firstName lastName email')
        .sort({ registeredAt: -1 });

      const filtered = registrations.filter(r => r.event !== null);

      return res.json({
        success: true,
        count: filtered.length,
        registrations: filtered
      });
    }

    if (filter === 'cancelled') {
      query.status = { $in: ['Cancelled', 'Rejected'] };
    }

    if (filter === 'normal' || filter === 'merchandise') {
      const registrations = await Registration.find(query)
        .populate({
          path: 'event',
          match: { eventType: filter === 'normal' ? 'Normal' : 'Merchandise' },
          populate: { path: 'organizer', select: 'organizerName' }
        })
        .populate('participant', 'firstName lastName email')
        .sort({ registeredAt: -1 });

      const filtered = registrations.filter(r => r.event !== null);

      return res.json({
        success: true,
        count: filtered.length,
        registrations: filtered
      });
    }

    // Default: all registrations
    const registrations = await Registration.find(query)
      .populate('event')
      .populate('participant', 'firstName lastName email')
      .sort({ registeredAt: -1 });

    res.json({
      success: true,
      count: registrations.length,
      registrations
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ message: 'Server error while fetching registrations' });
  }
};

// @desc    Get single registration/ticket
// @route   GET /api/registrations/ticket/:ticketId
// @access  Private
exports.getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const registration = await Registration.findOne({ ticketId })
      .populate('event')
      .populate('participant', 'firstName lastName email contactNumber');

    if (!registration) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user has access to this ticket
    if (req.role === 'participant' && registration.participant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    res.json({
      success: true,
      registration
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error while fetching ticket' });
  }
};

// @desc    Get pending merchandise orders for organizer
// @route   GET /api/registrations/pending-orders
// @access  Private - Organizer/Admin
exports.getPendingOrders = async (req, res) => {
  try {
    let query = { status: 'Pending' };

    // If organizer, limit to events they own
    if (req.role === 'organizer') {
      query = { status: 'Pending' };
      // Find events by organizer
      const Event = require('../models/Event');
      const events = await Event.find({ organizer: req.user._id }).select('_id');
      const eventIds = events.map(e => e._id);
      query.event = { $in: eventIds };
    }

    const orders = await Registration.find(query)
      .populate('event', 'eventName organizer')
      .populate('participant', 'firstName lastName email')
      .sort({ registeredAt: -1 });

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get pending orders error:', error);
    res.status(500).json({ message: 'Server error while fetching pending orders' });
  }
};

// @desc    Approve pending merchandise order
// @route   PATCH /api/registrations/:id/approve
// @access  Private - Organizer/Admin
exports.approveOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findById(id).populate('event').populate('participant');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    if (registration.status !== 'Pending') {
      return res.status(400).json({ message: 'Registration is not pending' });
    }

    // Ensure organizer owns the event
    if (req.role === 'organizer') {
      if (registration.event.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to approve this order' });
      }
    }

    // Atomically decrement stock and increment registration count and revenue
    const Event = require('../models/Event');
    const { variant, quantity } = registration.merchandiseOrder;

    // Find event and update the matching variant atomically if sufficient stock exists
    const query = {
      _id: registration.event._id,
      merchandiseDetails: { $exists: true },
      'merchandiseDetails.variants': {
        $elemMatch: { size: variant.size, color: variant.color, stockQuantity: { $gte: quantity } }
      }
    };

    const update = {
      $inc: {
        'merchandiseDetails.variants.$.stockQuantity': -quantity,
        'merchandiseDetails.totalStock': -quantity,
        registrationCount: 1,
        'analytics.totalRevenue': registration.amountPaid || 0
      }
    };

    const updatedEvent = await Event.findOneAndUpdate(query, update, { new: true });
    if (!updatedEvent) {
      return res.status(400).json({ message: 'Insufficient stock to approve order or variant not found' });
    }

    // Generate ticket and QR code now
    const ticketId = generateTicketId();
    const qrData = {
      ticketId,
      eventId: updatedEvent._id,
      eventName: updatedEvent.eventName,
      participantId: registration.participant._id,
      participantName: `${registration.participant.firstName} ${registration.participant.lastName}`,
      participantEmail: registration.participant.email,
      registrationDate: new Date().toISOString()
    };

    const qrCode = await generateQRCode(qrData);

    // Update registration
    registration.ticketId = ticketId;
    registration.qrCode = qrCode;
    registration.status = 'Confirmed';
    registration.paymentStatus = 'Completed';
    registration.registeredAt = registration.registeredAt || new Date();
    await registration.save();

    // Send confirmation email with ticket
    try {
      await emailService.sendRegistrationEmail(registration.participant, updatedEvent, registration);
    } catch (e) {
      console.error('Failed sending confirmation email on approval:', e);
    }

    res.json({ success: true, message: 'Order approved and ticket generated', registration });
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({ message: 'Server error while approving order' });
  }
};

// @desc    Reject pending merchandise order
// @route   PATCH /api/registrations/:id/reject
// @access  Private - Organizer/Admin
exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const registration = await Registration.findById(id).populate('event').populate('participant');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    if (registration.status !== 'Pending') {
      return res.status(400).json({ message: 'Registration is not pending' });
    }

    // Ensure organizer owns the event
    if (req.role === 'organizer') {
      if (registration.event.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to reject this order' });
      }
    }

    registration.status = 'Rejected';
    registration.paymentStatus = 'Failed';
    registration.rejectionReason = reason || 'Rejected by organizer';
    await registration.save();

    // Optionally notify participant
    try {
      await emailService.sendOrderRejectedEmail(registration.participant, registration.event, registration);
    } catch (e) {
      console.error('Failed sending rejection email:', e);
    }

    res.json({ success: true, message: 'Order rejected', registration });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ message: 'Server error while rejecting order' });
  }
};

// @desc    Mark attendance by scanning ticket OR manual override
// @route   POST /api/registrations/scan
// @access  Private - Organizer/Admin
exports.markAttendance = async (req, res) => {
  try {
    // Destructure 'reason' from the request body
    const { ticketId, method, reason } = req.body;

    if (!ticketId) {
      return res.status(400).json({ message: 'ticketId is required' });
    }

    const registration = await Registration.findOne({ ticketId })
      .populate('event')
      .populate('participant');

    if (!registration) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Authorization check
    if (req.role === 'organizer') {
      if (!registration.event.organizer) {
        return res.status(403).json({ message: 'Event has no organizer set' });
      }
      if (registration.event.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to mark attendance for this event' });
      }
    }

    // Prepare the Attendance Audit Log
    const Attendance = require('../models/Attendance');
    const attendanceLog = new Attendance({
      event: registration.event._id,
      registration: registration._id,
      participant: registration.participant._id,
      scannedBy: req.user?._id,
      scannedByModel: req.role === 'admin' ? 'Admin' : 'Organizer',
      method: method || 'qr', // Default to 'qr' if not specified
      // LOG THE REASON: Mandatory for manual overrides
      reason: method === 'manual' ? (reason || 'Manual override by organizer') : null,
      userAgent: req.get('User-Agent') || '',
      ip: req.ip
    });

    // Duplicate scan detection
    if (registration.attended) {
      attendanceLog.duplicate = true;
      await attendanceLog.save();
      return res.status(200).json({ 
        success: true, 
        message: 'Attendance already marked (duplicate recorded)', 
        registration, 
        attendanceLog 
      });
    }

    // Mark attendance on the registration record
    registration.attended = true;
    registration.attendanceMarkedAt = new Date();
    await registration.save();

    // Increment event analytics totalAttendance
    try {
      const Event = require('../models/Event');
      const event = await Event.findById(registration.event._id);
      if (event) {
        event.analytics = event.analytics || {};
        event.analytics.totalAttendance = (event.analytics.totalAttendance || 0) + 1;
        await event.save();
      }
    } catch (e) {
      console.error('Failed updating event analytics:', e);
    }

    // Save final successful attendance log
    attendanceLog.duplicate = false;
    await attendanceLog.save();

    res.json({ 
      success: true, 
      message: method === 'manual' ? 'Manual attendance override successful' : 'Attendance marked via scan', 
      registration, 
      attendanceLog 
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error while marking attendance' });
  }
};

// @desc    Get attendance logs for an event (including audit reasons)
// @route   GET /api/registrations/attendance/:eventId
// @access  Private - Organizer/Admin
exports.getAttendanceLogs = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (req.role === 'organizer') {
      const Event = require('../models/Event');
      const ev = await Event.findById(eventId).select('organizer');
      if (!ev) return res.status(404).json({ message: 'Event not found' });
      if (ev.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view logs for this event' });
      }
    }

    const Attendance = require('../models/Attendance');
    const logs = await Attendance.find({ event: eventId })
      .populate('participant', 'firstName lastName email')
      .populate('scannedBy', 'organizerName email')
      .populate('registration', 'ticketId')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: logs.length, 
      logs // The 'reason' field will be included in each log object
    });
  } catch (error) {
    console.error('Get attendance logs error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance logs' });
  }
};

// @desc    Export attendance CSV for an event
// @route   GET /api/registrations/attendance/:eventId/export
// @access  Private - Organizer/Admin
exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Authorization same as above
    if (req.role === 'organizer') {
      const Event = require('../models/Event');
      const ev = await Event.findById(eventId).select('organizer');
      if (!ev) return res.status(404).json({ message: 'Event not found' });
      if (ev.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to export attendance for this event' });
      }
    }

    const Attendance = require('../models/Attendance');
    const logs = await Attendance.find({ event: eventId })
      .populate('participant', 'firstName lastName email')
      .populate('scannedBy', 'organizerName email')
      .sort({ createdAt: -1 });

    // Build CSV
    const headers = ['Participant Name', 'Email', 'Scanned By', 'Method', 'Duplicate', 'IP', 'UserAgent', 'Scanned At'];
    const rows = logs.map(l => [
      `${l.participant?.firstName || ''} ${l.participant?.lastName || ''}`.trim(),
      l.participant?.email || '',
      l.scannedBy?.organizerName || l.scannedBy?.email || '',
      l.method || '',
      l.duplicate ? 'Yes' : 'No',
      l.ip || '',
      l.userAgent || '',
      l.createdAt ? new Date(l.createdAt).toISOString() : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${(cell||'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${eventId}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export attendance CSV error:', error);
    res.status(500).json({ message: 'Server error while exporting attendance CSV' });
  }
};

// Export multiple registered events as a combined .ics for the current participant
// POST /api/registrations/export/ics
exports.exportRegistrationsICS = async (req, res) => {
  try {
    const { registrationIds } = req.body; // optional array
    let regs;
    if (Array.isArray(registrationIds) && registrationIds.length > 0) {
      regs = await Registration.find({ _id: { $in: registrationIds }, participant: req.user._id }).populate('event');
    } else {
      regs = await Registration.find({ participant: req.user._id, status: { $in: ['Confirmed'] } }).populate('event');
    }

    if (!regs || regs.length === 0) return res.status(404).json({ message: 'No registrations found' });

    const { generateEventICS, wrapCalendar } = require('../utils/calendar');
    const vevents = [];
    for (const r of regs) {
      const e = r.event;
      if (!e) continue;
      const uid = `event-${e._id}-reg-${r._id}@felicity.local`;
      const title = e.eventName;
      const description = `${e.eventDescription}\nTicket: ${r.ticketId || ''}`;
      const location = e.venue || '';
      const start = e.eventStartDate;
      const end = e.eventEndDate;
      const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ticket/${r.ticketId}`;
      const organizerEmail = e.organizer?.contactEmail || '';

      vevents.push(generateEventICS({ uid, title, description, location, start, end, url, organizerEmail }));
    }

    if (vevents.length === 0) return res.status(404).json({ message: 'No valid events to export' });

    const ical = wrapCalendar(vevents);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registrations-${req.user._id}.ics"`);
    res.send(ical);
  } catch (error) {
    console.error('Export registrations ICS error:', error);
    res.status(500).json({ message: 'Server error while exporting registrations calendar' });
  }
};