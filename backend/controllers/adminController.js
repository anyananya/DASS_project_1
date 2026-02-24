const bcrypt = require('bcryptjs');
const Organizer = require('../models/Organizer');
const emailService = require('../utils/emailService');
const crypto = require('crypto');

// Generate random password
const generatePassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

// @desc    Create organizer account
// @route   POST /api/admin/organizers
// @access  Private - Admin only
exports.createOrganizer = async (req, res) => {
  try {
    const {
      organizerName,
      email,
      category,
      description,
      contactEmail,
      contactNumber
    } = req.body;

    // Validation
    if (!organizerName || !email || !category) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if organizer already exists
    const existingOrganizer = await Organizer.findOne({ email });
    if (existingOrganizer) {
      return res.status(400).json({ message: 'Organizer with this email already exists' });
    }

    // Generate temporary password
    const tempPassword = generatePassword();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create organizer
    const organizer = await Organizer.create({
      organizerName,
      email,
      password: hashedPassword,
      category,
      description: description || '',
      contactEmail: contactEmail || email,
      contactNumber: contactNumber || '',
      isActive: true
    });

    // Send credentials email
    await emailService.sendOrganizerCredentials(organizer, tempPassword);

    res.status(201).json({
      success: true,
      message: 'Organizer account created successfully. Credentials sent via email.',
      organizer: {
        id: organizer._id,
        organizerName: organizer.organizerName,
        email: organizer.email,
        category: organizer.category
      },
      credentials: {
        email: organizer.email,
        tempPassword: tempPassword
      }
    });
  } catch (error) {
    console.error('Create organizer error:', error);
    res.status(500).json({ message: 'Server error while creating organizer' });
  }
};

// @desc    Get all organizers
// @route   GET /api/admin/organizers
// @access  Private - Admin only
exports.getAllOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: organizers.length,
      organizers
    });
  } catch (error) {
    console.error('Get organizers error:', error);
    res.status(500).json({ message: 'Server error while fetching organizers' });
  }
};

// @desc    Delete/disable organizer
// @route   DELETE /api/admin/organizers/:id
// @access  Private - Admin only
exports.deleteOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    // Soft delete - disable the account
    organizer.isActive = false;
    await organizer.save();

    res.json({
      success: true,
      message: 'Organizer account disabled successfully'
    });
  } catch (error) {
    console.error('Delete organizer error:', error);
    res.status(500).json({ message: 'Server error while deleting organizer' });
  }
};

// @desc    Permanently delete organizer
// @route   DELETE /api/admin/organizers/:id/permanent
// @access  Private - Admin only
exports.permanentlyDeleteOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    await Organizer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Organizer account permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ message: 'Server error while deleting organizer' });
  }
};

// @desc    Reactivate organizer
// @route   PUT /api/admin/organizers/:id/reactivate
// @access  Private - Admin only
exports.reactivateOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    organizer.isActive = true;
    await organizer.save();

    res.json({
      success: true,
      message: 'Organizer account reactivated successfully',
      organizer: {
        id: organizer._id,
        organizerName: organizer.organizerName,
        email: organizer.email,
        isActive: organizer.isActive
      }
    });
  } catch (error) {
    console.error('Reactivate organizer error:', error);
    res.status(500).json({ message: 'Server error while reactivating organizer' });
  }
};