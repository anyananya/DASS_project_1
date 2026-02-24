const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'scannedByModel' },
  scannedByModel: { type: String, enum: ['Organizer', 'Admin'], default: 'Organizer' },
  method: { type: String, enum: ['manual', 'camera', 'api'], default: 'manual' },
  duplicate: { type: Boolean, default: false },
  userAgent: { type: String },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now }
});

attendanceSchema.index({ event: 1 });
attendanceSchema.index({ registration: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
