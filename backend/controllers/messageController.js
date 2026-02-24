const Message = require('../models/Message');
const socketUtil = require('../utils/socket');

// Get messages for an event (paged/latest)
exports.getMessagesForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    // Return non-deleted messages, include parent references so client can thread
    const messages = await Message.find({ event: eventId, deleted: false })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
};

// Get messages for a team (team chat)
exports.getMessagesForTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    const messages = await Message.find({ team: teamId, deleted: false })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    console.error('Get team messages error:', error);
    res.status(500).json({ message: 'Server error while fetching team messages' });
  }
};

// Delete (soft) a message
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // Only organizers/admins can delete (socket layer also enforces)
    msg.deleted = true;
    msg.deletedAt = new Date();
    msg.deletedBy = req.user._id;
    msg.deletedByModel = req.role === 'admin' ? 'Admin' : 'Organizer';
    await msg.save();

    // Emit to sockets
    const io = socketUtil.getIO();
    if (io) {
      if (msg.team) io.to(`team:${msg.team}`).emit('message:deleted', { id });
      else io.to(`event:${msg.event}`).emit('message:deleted', { id });
    }

    res.json({ success: true, message: 'Message deleted', id });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error while deleting message' });
  }
};

// Pin / unpin a message
exports.pinMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body; // boolean
    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    msg.pinned = !!pin;
    await msg.save();
    const io = socketUtil.getIO();
    if (io) {
      if (msg.team) io.to(`team:${msg.team}`).emit('message:pinned', { id, pinned: msg.pinned });
      else io.to(`event:${msg.event}`).emit('message:pinned', { id, pinned: msg.pinned });
    }

    res.json({ success: true, message: pin ? 'Message pinned' : 'Message unpinned', id, pinned: msg.pinned });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ message: 'Server error while pinning message' });
  }
};

// Toggle reaction
exports.reactToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // e.g., 'like', 'love', 'laugh'
    const userId = req.user._id;
    const userModel = req.role === 'organizer' ? 'Organizer' : req.role === 'admin' ? 'Admin' : 'Participant';

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // find existing reaction by this user
    const existingIndex = msg.reactions.findIndex(r => r.user.toString() === userId.toString() && r.type === type);
    if (existingIndex !== -1) {
      // remove reaction
      msg.reactions.splice(existingIndex, 1);
    } else {
      // add reaction
      msg.reactions.push({ user: userId, reactionsModel: userModel, type });
    }
    await msg.save();
    const io = socketUtil.getIO();
    if (io) {
      if (msg.team) io.to(`team:${msg.team}`).emit('message:reaction', { id, reactions: msg.reactions });
      else io.to(`event:${msg.event}`).emit('message:reaction', { id, reactions: msg.reactions });
    }

    res.json({ success: true, message: 'Reaction updated', id, reactions: msg.reactions });
  } catch (error) {
    console.error('React error:', error);
    res.status(500).json({ message: 'Server error while reacting to message' });
  }
};
