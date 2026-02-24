const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  participantType: { 
    type: String, 
    enum: ['IIIT', 'Non-IIIT'], 
    required: true 
  },
  collegeName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  
  // Preferences (for onboarding)
  areasOfInterest: [{ type: String }],
  followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' }],
  
  role: { type: String, default: 'participant' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Participant', participantSchema);