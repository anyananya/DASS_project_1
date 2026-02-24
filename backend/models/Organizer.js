const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
  organizerName: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  password: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },
  contactEmail: { type: String },
  contactNumber: { type: String },
  discordWebhook: { type: String },
  
  role: { type: String, default: 'organizer' },
  isActive: { type: Boolean, default: true },
  // When true, organizer must change password on next login
  forcePasswordChange: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Organizer', organizerSchema);