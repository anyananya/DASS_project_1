const mongoose = require('mongoose');

const teamInviteSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  invitedEmail: { type: String, required: true, lowercase: true, trim: true },
  code: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Declined', 'Expired'], default: 'Pending' },
  invitedAt: { type: Date, default: Date.now },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
  acceptedAt: { type: Date }
});

teamInviteSchema.index({ team: 1, invitedEmail: 1 });

module.exports = mongoose.model('TeamInvite', teamInviteSchema);
