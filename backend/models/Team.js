const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  teamName: { type: String },
  size: { type: Number, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Participant' }],
  inviteCode: { type: String, unique: true },
  status: { type: String, enum: ['Forming', 'Complete', 'Cancelled'], default: 'Forming' },
  createdAt: { type: Date, default: Date.now }
});

teamSchema.index({ event: 1, leader: 1 });

module.exports = mongoose.model('Team', teamSchema);
