const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  organizerName: { type: String },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  adminComment: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  processedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

passwordResetRequestSchema.index({ organizer: 1, status: 1 });

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
