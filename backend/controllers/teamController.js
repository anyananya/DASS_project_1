const Team = require('../models/Team');
const TeamInvite = require('../models/TeamInvite');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const QRCode = require('qrcode');
const crypto = require('crypto');
const emailService = require('../utils/emailService');

// Helper: generate invite code
const generateCode = (len = 8) => crypto.randomBytes(len).toString('base64url').slice(0, len);

// Helper: generate ticket id
const generateTicketId = () => 'TKT-' + crypto.randomBytes(8).toString('hex').toUpperCase();

const generateQRCode = async (data) => {
  return await QRCode.toDataURL(JSON.stringify(data), { errorCorrectionLevel: 'H', type: 'image/png', width: 300 });
};

// Create a team for an event (leader is current participant)
exports.createTeam = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { teamName, size } = req.body;
    const leaderId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status !== 'Published') return res.status(400).json({ message: 'Event is not open for team registration' });

    if (!size || size < 1) return res.status(400).json({ message: 'Invalid team size' });

    // Create team with leader as first member
    const inviteCode = generateCode(10);
    const team = await Team.create({ event: eventId, leader: leaderId, teamName, size, members: [leaderId], inviteCode });

    res.status(201).json({ success: true, team });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error while creating team' });
  }
};

// Invite members by email
exports.inviteMembers = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { emails } = req.body; // array of emails

    const team = await Team.findById(teamId).populate('event');
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Only leader can invite
    if (team.leader.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only team leader can invite members' });

    const createdInvites = [];
    for (const email of emails) {
      const code = generateCode(12);
      const invite = await TeamInvite.create({ team: team._id, invitedEmail: email.toLowerCase(), code });
      createdInvites.push(invite);

      // Send invite email with link
      try {
        const link = `${process.env.FRONTEND_URL}/team/invite/${invite.code}`;
        await emailService.sendTeamInviteEmail(email, team, link);
      } catch (e) {
        console.error('Failed sending team invite email to', email, e);
      }
    }

    res.json({ success: true, invites: createdInvites });
  } catch (error) {
    console.error('Invite members error:', error);
    res.status(500).json({ message: 'Server error while inviting members' });
  }
};

// Get team details (members and invites)
exports.getTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate('members', 'firstName lastName email').populate('leader', 'firstName lastName email');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const invites = await TeamInvite.find({ team: teamId });
    res.json({ success: true, team, invites });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept invite by code
exports.acceptInvite = async (req, res) => {
  try {
    const { code } = req.body;
    const participantId = req.user._id;

    const invite = await TeamInvite.findOne({ code });
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    if (invite.status !== 'Pending') return res.status(400).json({ message: 'Invite already processed' });

    const team = await Team.findById(invite.team);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Prevent duplicate membership
    if (team.members.map(m => m.toString()).includes(participantId.toString())) {
      invite.status = 'Accepted';
      invite.acceptedBy = participantId;
      invite.acceptedAt = new Date();
      await invite.save();
      return res.json({ success: true, message: 'Already a member', team });
    }

    // Add member if space
    if (team.members.length >= team.size) return res.status(400).json({ message: 'Team is already full' });

    team.members.push(participantId);
    // If team full after this, mark complete and finalize registrations
    let becameComplete = false;
    if (team.members.length === team.size) {
      team.status = 'Complete';
      becameComplete = true;
    }
    await team.save();

    invite.status = 'Accepted';
    invite.acceptedBy = participantId;
    invite.acceptedAt = new Date();
    await invite.save();

    // If team became complete, create registrations/tickets for all members
    if (becameComplete) {
      const event = await Event.findById(team.event);
      const participants = await Participant.find({ _id: { $in: team.members } });

      for (const p of participants) {
        // Prevent duplicate registrations
        const existing = await Registration.findOne({ event: event._id, participant: p._id });
        if (existing) continue;

        // 1. PRE-GENERATE TICKET ID AND QR CODE
        const ticketId = generateTicketId();
        const qrData = {
          ticketId,
          eventId: event._id,
          eventName: event.eventName,
          participantId: p._id,
          participantName: `${p.firstName} ${p.lastName}`,
          participantEmail: p.email,
          registrationDate: new Date().toISOString()
        };
        const qrCode = await generateQRCode(qrData);

        // Create registration
       // 2. CREATE DOCUMENT WITH ALL DATA AT ONCE
        // This avoids the "duplicate null" error because the ID is present on creation
        const reg = await Registration.create({ 
          event: event._id, 
          participant: p._id, 
          amountPaid: event.registrationFee || 0, 
          status: 'Confirmed', 
          paymentStatus: 'Completed',
          ticketId, // Included here
          qrCode    // Included here
        });

        // Update event counts
        event.registrationCount = (event.registrationCount || 0) + 1;
        event.analytics = event.analytics || {};
        event.analytics.totalRevenue = (event.analytics.totalRevenue || 0) + (reg.amountPaid || 0);

        // Send registration email
        try {
          await emailService.sendRegistrationEmail(p, event, reg);
        } catch (e) { console.error('Failed sending team registration email', e); }
      }
      await event.save();
    }

    res.json({ success: true, message: 'Invite accepted', team, invite });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ message: 'Server error while accepting invite' });
  }
};

// List teams for an event (organizer)
exports.listTeamsForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    // Organizer only: ensure user owns event if role organizer
    if (req.role === 'organizer') {
      const ev = await Event.findById(eventId).select('organizer');
      if (!ev) return res.status(404).json({ message: 'Event not found' });
      if (ev.organizer.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    }

    const teams = await Team.find({ event: eventId }).populate('leader', 'firstName lastName email').populate('members', 'firstName lastName email');
    res.json({ success: true, count: teams.length, teams });
  } catch (error) {
    console.error('List teams error:', error);
    res.status(500).json({ message: 'Server error while listing teams' });
  }
};
