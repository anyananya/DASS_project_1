const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');
const emailService = require('../utils/emailService');

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Validate IIIT Email
const isIIITEmail = (email) => {
  const iiitDomains = ['@research.iiit.ac.in', '@students.iiit.ac.in'];
  return iiitDomains.some(domain => email.endsWith(domain));
};

// @desc    Register Participant
// @route   POST /api/auth/register
// @access  Public
exports.registerParticipant = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      participantType,
      collegeName,
      contactNumber,
      areasOfInterest,
      followedClubs
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !participantType || !collegeName || !contactNumber) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // IIIT Email Validation
    if (participantType === 'IIIT') {
      if (!isIIITEmail(email)) {
        return res.status(400).json({ 
          success: false,
          message: 'IIIT participants must register using an IIIT-issued email ID only (@iiit.ac.in or @students.iiit.ac.in)' 
        });
      }
    }

    // Check if user exists
    const existingParticipant = await Participant.findOne({ email });
    if (existingParticipant) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create participant
    const participant = await Participant.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      participantType,
      collegeName,
      contactNumber,
      areasOfInterest: areasOfInterest || [],
      followedClubs: followedClubs || []
    });

    // Generate token
    const token = generateToken(participant._id, 'participant');

    // Send welcome email (don't wait for it)
    emailService.sendWelcomeEmail(participant, 'participant');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: participant._id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        role: 'participant',
        participantType: participant.participantType
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login User (All roles)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Please provide email, password, and role' });
    }

    let user;
    let userRole;

    // Find user based on role
    switch (role) {
      case 'participant':
        user = await Participant.findOne({ email });
        userRole = 'participant';
        break;
      case 'organizer':
        user = await Organizer.findOne({ email, isActive: true });
        userRole = 'organizer';
        break;
      case 'admin':
        user = await Admin.findOne({ email });
        userRole = 'admin';
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id, userRole);

    // If organizer must change password, indicate this to the client. Token is still issued
    // so the frontend can call the change-password endpoint. The frontend should
    // force the user to complete the change before using the app.
    if (userRole === 'organizer' && user.forcePasswordChange) {
      return res.json({
        success: true,
        token,
        forceChangeRequired: true,
        user: {
          id: user._id,
          email: user.email,
          role: userRole,
          organizerName: user.organizerName
        }
      });
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: userRole,
        ...(userRole === 'participant' && { 
          firstName: user.firstName,
          lastName: user.lastName,
          participantType: user.participantType
        }),
        ...(userRole === 'organizer' && { 
          organizerName: user.organizerName 
        })
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc Change password (organizer can call using temp password or current password)
// @route POST /api/auth/change-password
// @access Public (requires email + oldPassword + newPassword)
exports.changePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    if (!email || !oldPassword || !newPassword) return res.status(400).json({ message: 'Please provide email, oldPassword and newPassword' });

    const organizer = await Organizer.findOne({ email });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const isMatch = await bcrypt.compare(oldPassword, organizer.password);
    if (!isMatch) return res.status(401).json({ message: 'Old password incorrect' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    organizer.password = hashed;
    organizer.forcePasswordChange = false;
    await organizer.save();

    // Issue a new token after password change
    const token = generateToken(organizer._id, 'organizer');
    res.json({ success: true, message: 'Password changed successfully', token });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    role: req.role
  });
};

// @desc    Update participant profile
// @route   PUT /api/auth/profile
// @access  Private - Participant only
exports.updateParticipantProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const participant = await Participant.findById(userId);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    // Allow update of only specific fields
    const allowed = ['firstName', 'lastName', 'contactNumber', 'collegeName', 'areasOfInterest', 'followedClubs'];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) participant[f] = req.body[f];
    });

    await participant.save();
    res.json({ success: true, message: 'Profile updated', participant });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// @desc    Admin creates an Organizer
// @route   POST /api/auth/create-organizer
// @access  Private (Admin only)
exports.createOrganizer = async (req, res) => {
  try {
    const { organizerName, email, password, category } = req.body;

    // 1. Basic Validation
    if (!organizerName || !email || !password || !category) {
      return res.status(400).json({ message: 'Please provide name, email, and password and category' });
    }

    // 2. Check if Organizer already exists
    const existingOrg = await Organizer.findOne({ email });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organizer with this email already exists' });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the Organizer (set isActive to true by default)
    const organizer = await Organizer.create({
      organizerName,
      email,
      password: hashedPassword,
      category,
      isActive: true 
    });

    // 5. GENERATE TOKEN FOR THE ORGANIZER
    // We pass the new organizer's ID and the 'organizer' role
    const token = generateToken(organizer._id, 'organizer');

    res.status(201).json({
      success: true,
      message: 'Organizer account created successfully',
      token,
      organizer: {
        id: organizer._id,
        name: organizer.organizerName,
        email: organizer.email
      }
    });
  } catch (error) {
    console.error('Create Organizer Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};