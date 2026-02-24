const mongoose = require('mongoose');

// Schema for custom form fields (for Normal events)
const formFieldSchema = new mongoose.Schema({
  fieldId: { type: String, required: true },
  fieldType: { 
    type: String, 
    enum: ['text', 'email', 'number', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'date'],
    required: true 
  },
  label: { type: String, required: true },
  placeholder: { type: String },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // For dropdown, radio, checkbox
  order: { type: Number, required: true }
});

// Schema for merchandise variants
const merchandiseVariantSchema = new mongoose.Schema({
  size: { type: String },
  color: { type: String },
  stockQuantity: { type: Number, required: true },
  price: { type: Number }
});

const eventSchema = new mongoose.Schema({
  // Basic Information
  eventName: { type: String, required: true },
  eventDescription: { type: String, required: true },
  eventType: { 
    type: String, 
    enum: ['Normal', 'Merchandise', 'Hackathon'], 
    required: true 
  },

  maxTeamSize: {
    type: Number,
    // Only required if eventType is Hackathon
    required: function() { return this.eventType === 'Hackathon'; },
    default: 1
  },
  
  // Organizer
  organizer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organizer', 
    required: true 
  },
  
  // Event Details
  eligibility: { 
    type: String, 
    enum: ['IIIT Only', 'Non-IIIT Only', 'All'], 
    default: 'All' 
  },
  eventTags: [{ type: String }],
  
  // Dates
  registrationDeadline: { type: Date, required: true },
  eventStartDate: { type: Date, required: true },
  eventEndDate: { type: Date, required: true },
  
  // Registration
  registrationLimit: { type: Number, required: true },
  registrationFee: { type: Number, default: 0 },
  registrationCount: { type: Number, default: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Closed'], 
    default: 'Draft' 
  },
  
  // Event Type Specific Fields
  
  // For Normal Events - Custom Registration Form
  customForm: {
    fields: [formFieldSchema],
    isLocked: { type: Boolean, default: false }
  },
  
  // For Merchandise Events
  merchandiseDetails: {
    itemName: { type: String },
    description: { type: String },
    variants: [merchandiseVariantSchema],
    purchaseLimitPerParticipant: { type: Number, default: 1 },
    totalStock: { type: Number }
  },
  
  // Analytics
  analytics: {
    totalRevenue: { type: Number, default: 0 },
    totalAttendance: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for search and filtering
eventSchema.index({ eventName: 'text', eventDescription: 'text' });
eventSchema.index({ organizer: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ eventType: 1 });
eventSchema.index({ eventStartDate: 1 });

module.exports = mongoose.model('Event', eventSchema);