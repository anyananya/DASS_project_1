const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  // Optional team reference for team chat messages
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  sender: { type: mongoose.Schema.Types.ObjectId, refPath: 'senderModel', required: true },
  senderModel: { type: String, enum: ['Participant', 'Organizer', 'Admin'], required: true },
  senderName: { type: String },
  body: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, // for threading
  pinned: { type: Boolean, default: false },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, refPath: 'reactionsModel' },
      reactionsModel: { type: String, enum: ['Participant', 'Organizer', 'Admin'] },
      type: { type: String }
    }
  ],
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'deletedByModel' },
  deletedByModel: { type: String, enum: ['Organizer', 'Admin'] },
  createdAt: { type: Date, default: Date.now }
});

messageSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
