const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
const socketUtil = require('./utils/socket');
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads (payment proofs)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/organizers', require('./routes/organizers'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Felicity API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// expose io to controllers via util
socketUtil.setIO(io);

// Simple socket auth using JWT passed in handshake auth or query
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Not authenticated'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    return next(new Error('Authentication error'));
  }
});

const Message = require('./models/Message');

// Simple in-memory rate limiter per user (sliding window). For production use Redis.
const rateMap = new Map(); // userId => [timestamps]

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id, 'user', socket.user?.id);

  // Join user-specific room for notifications
  if (socket.user && socket.user.id) {
    socket.join(`user:${socket.user.id}`);
  }

  socket.on('join', ({ eventId }) => {
    if (!eventId) return;
    const room = `event:${eventId}`;
    socket.join(room);
  });

  // Join team room
  socket.on('join:team', ({ teamId }) => {
    if (!teamId) return;
    const room = `team:${teamId}`;
    socket.join(room);
  });

  socket.on('message', async (data) => {
    try {
      const { eventId, body, parent } = data;
      if (!eventId || !body) return;

      // Rate limiting: allow max 5 messages per 10 seconds
      try {
        const uid = socket.user.id;
        const now = Date.now();
        const windowMs = 10000;
        const maxMsgs = 5;
        const arr = rateMap.get(uid) || [];
        const recent = arr.filter(t => now - t < windowMs);
        recent.push(now);
        rateMap.set(uid, recent);
        if (recent.length > maxMsgs) {
          socket.emit('rate_limited', { message: 'You are sending messages too quickly. Please slow down.' });
          return;
        }
      } catch (e) {
        // if rate check fails, allow message
      }

      // Create message in DB
      const senderModel = socket.user.role === 'organizer' ? 'Organizer' : socket.user.role === 'admin' ? 'Admin' : 'Participant';
      const msgPayload = {
        event: eventId,
        sender: socket.user.id,
        senderModel,
        senderName: socket.user.name || socket.user.email || 'Unknown',
        body,
        parent: parent || null
      };
      const msg = await Message.create(msgPayload);

      const out = {
        _id: msg._id,
        event: msg.event,
        sender: msg.sender,
        senderModel: msg.senderModel,
        senderName: msg.senderName,
        body: msg.body,
        parent: msg.parent,
        pinned: msg.pinned,
        reactions: msg.reactions || [],
        createdAt: msg.createdAt
      };

      io.to(`event:${eventId}`).emit('message:new', out);


      // If this is a reply, notify the parent message sender (if different)
      if (msg.parent) {
        try {
          const parentMsg = await Message.findById(msg.parent);
          if (parentMsg && parentMsg.sender && parentMsg.sender.toString() !== socket.user.id.toString()) {
            // emit notification to that user's room
            io.to(`user:${parentMsg.sender}`).emit('notification', {
              type: 'reply',
              eventId,
              message: `${socket.user.name || socket.user.email} replied to your message`,
              data: out
            });
          }
        } catch (e) {
          console.error('Failed notifying parent sender:', e);
        }
      }
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  // Team message handling
  socket.on('team:message', async (data) => {
    try {
      const { teamId, body, parent } = data;
      if (!teamId || !body) return;

      // Rate limiting per user
      try {
        const uid = socket.user.id;
        const now = Date.now();
        const windowMs = 10000;
        const maxMsgs = 10; // allow slightly higher for team chat
        const arr = rateMap.get(uid) || [];
        const recent = arr.filter(t => now - t < windowMs);
        recent.push(now);
        rateMap.set(uid, recent);
        if (recent.length > maxMsgs) {
          socket.emit('rate_limited', { message: 'You are sending messages too quickly. Please slow down.' });
          return;
        }
      } catch (e) {}

      const senderModel = socket.user.role === 'organizer' ? 'Organizer' : socket.user.role === 'admin' ? 'Admin' : 'Participant';
      const msg = await Message.create({
        event: data.eventId || null,
        team: teamId,
        sender: socket.user.id,
        senderModel,
        senderName: socket.user.name || socket.user.email || 'Unknown',
        body,
        parent: parent || null
      });

      const out = {
        _id: msg._id,
        team: msg.team,
        sender: msg.sender,
        senderModel: msg.senderModel,
        senderName: msg.senderName,
        body: msg.body,
        parent: msg.parent,
        createdAt: msg.createdAt
      };

      io.to(`team:${teamId}`).emit('team:message:new', out);
    } catch (e) {
      console.error('team message socket error', e);
    }
  });

  // Moderation via socket (organizer/admin) - delete
  socket.on('message:delete', async ({ id, eventId }) => {
    if (!id) return;
    try {
      // Only organizer/admin allowed
      if (!['organizer','admin'].includes(socket.user.role)) return;
      const msg = await Message.findById(id);
      if (!msg) return;
      msg.deleted = true;
      msg.deletedAt = new Date();
      msg.deletedBy = socket.user.id;
      msg.deletedByModel = socket.user.role === 'admin' ? 'Admin' : 'Organizer';
      await msg.save();
      io.to(`event:${eventId}`).emit('message:deleted', { id });
    } catch (e) { console.error('delete socket error', e); }
  });

  // Pin/unpin via socket
  socket.on('message:pin', async ({ id, eventId, pin }) => {
    if (!id) return;
    try {
      if (!['organizer','admin'].includes(socket.user.role)) return;
      const msg = await Message.findById(id);
      if (!msg) return;
      msg.pinned = !!pin;
      await msg.save();
      io.to(`event:${eventId}`).emit('message:pinned', { id, pinned: msg.pinned });
    } catch (e) { console.error('pin socket error', e); }
  });

  // Reaction via socket
  socket.on('message:reaction', async ({ id, eventId, type }) => {
    if (!id || !type) return;
    try {
      const msg = await Message.findById(id);
      if (!msg) return;
      const uid = socket.user.id;
      const uModel = socket.user.role === 'organizer' ? 'Organizer' : socket.user.role === 'admin' ? 'Admin' : 'Participant';
      const existingIndex = msg.reactions.findIndex(r => r.user.toString() === uid.toString() && r.type === type);
      if (existingIndex !== -1) {
        msg.reactions.splice(existingIndex, 1);
      } else {
        msg.reactions.push({ user: uid, reactionsModel: uModel, type });
      }
      await msg.save();
      io.to(`event:${eventId}`).emit('message:reaction', { id, reactions: msg.reactions });
    } catch (e) { console.error('reaction socket error', e); }
  });

  // Typing indicators
  socket.on('typing:start', ({ eventId }) => {
    if (!eventId) return;
    socket.to(`event:${eventId}`).emit('typing', { user: { id: socket.user.id, name: socket.user.name || socket.user.email }, typing: true });
  });
  socket.on('typing:stop', ({ eventId }) => {
    if (!eventId) return;
    socket.to(`event:${eventId}`).emit('typing', { user: { id: socket.user.id, name: socket.user.name || socket.user.email }, typing: false });
  });

  socket.on('disconnect', () => {
    // console.log('Socket disconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});