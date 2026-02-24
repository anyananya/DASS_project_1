const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  event: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  participant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Participant', 
    required: true 
  },
  
  // Registration Status
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Rejected'], 
    default: 'Confirmed' 
  },
  
  // Custom Form Responses (for Normal events)
  formResponses: [{
    fieldId: { type: String },
    label: { type: String },
    value: { type: mongoose.Schema.Types.Mixed } // Can be string, array, etc.
  }],
  
  // Merchandise Details (for Merchandise events)
  merchandiseOrder: {
    variant: {
      size: { type: String },
      color: { type: String }
    },
    quantity: { type: Number, default: 1 },
    totalAmount: { type: Number }
  },
  
  // Payment
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed'], 
    default: 'Completed' 
  },
  amountPaid: { type: Number },
  
  // Ticket
  ticketId: { type: String, unique: true },
  qrCode: { type: String }, // Base64 encoded QR code image
  // Payment proof for merchandise orders
  paymentProofUrl: { type: String },
  
  // Attendance
  attended: { type: Boolean, default: false },
  attendanceMarkedAt: { type: Date },
  
  registeredAt: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate registrations
registrationSchema.index({ event: 1, participant: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);