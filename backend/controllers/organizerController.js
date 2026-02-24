const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const { postToDiscord } = require('../utils/discord');

// List organizers (public)
exports.listOrganizers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (search) {
      query.$or = [
        { organizerName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const organizers = await Organizer.find(query).skip(skip).limit(parseInt(limit));
    const total = await Organizer.countDocuments(query);
    res.json({ success: true, count: organizers.length, total, organizers });
  } catch (err) {
    console.error('List organizers error', err);
    res.status(500).json({ message: 'Server error listing organizers' });
  }
};

// Get organizer profile (public)
exports.getOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).select('-password');
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const events = await Event.find({
    organizer: organizer._id,
    status: { $in: ['Published', 'Ongoing', 'Completed', 'Closed'] }
    }).sort({ eventStartDate: -1 }).limit(50);

    res.json({ success: true, organizer, events });
  } catch (err) {
    console.error('Get organizer error', err);
    res.status(500).json({ message: 'Server error fetching organizer' });
  }
};

// Update organizer profile (organizer only)
exports.updateOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    if (req.user.role !== 'admin' && organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    // Only allow specific fields to be updated
    const allowed = ['organizerName', 'category', 'description', 'contactEmail', 'contactNumber', 'discordWebhook'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) organizer[field] = req.body[field];
    });

    await organizer.save();
    res.json({ success: true, message: 'Organizer profile updated', organizer: { ...organizer.toObject(), password: undefined } });
  } catch (err) {
    console.error('Update organizer error', err);
    res.status(500).json({ message: 'Server error updating organizer' });
  }
};

// Follow an organizer (participant)
exports.followOrganizer = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const participant = await Participant.findById(req.user._id);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    if (participant.followedClubs.includes(organizerId)) {
      return res.status(400).json({ message: 'Already following this organizer' });
    }

    participant.followedClubs.push(organizerId);
    await participant.save();

    res.json({ success: true, message: 'Organizer followed' });
  } catch (err) {
    console.error('Follow organizer error', err);
    res.status(500).json({ message: 'Server error while following organizer' });
  }
};

// Unfollow organizer
exports.unfollowOrganizer = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const participant = await Participant.findById(req.user._id);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    participant.followedClubs = participant.followedClubs.filter(id => id.toString() !== organizerId.toString());
    await participant.save();

    res.json({ success: true, message: 'Organizer unfollowed' });
  } catch (err) {
    console.error('Unfollow organizer error', err);
    res.status(500).json({ message: 'Server error while unfollowing organizer' });
  }
};

// @desc Test discord webhook for organizer
// @route POST /api/organizers/:id/webhook/test
// @access Private - Organizer/Admin
exports.testWebhook = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).select('organizerName discordWebhook');
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    // Only allow organizer or admin to test
    if (req.user.role !== 'admin' && organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to test this webhook' });
    }

    if (!organizer.discordWebhook) return res.status(400).json({ message: 'No webhook configured' });

    const payload = {
      content: `Webhook test from Felicity: Hello from **${organizer.organizerName}** at ${new Date().toLocaleString()}`
    };

    await postToDiscord(organizer.discordWebhook, payload);

    res.json({ success: true, message: 'Test message sent to Discord webhook' });
  } catch (err) {
    console.error('Test webhook error', err);
    res.status(500).json({ message: 'Failed to send test webhook' });
  }
};
