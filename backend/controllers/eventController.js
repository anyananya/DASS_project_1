const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { generateEventICS, wrapCalendar } = require('../utils/calendar');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');
const { postToDiscord } = require('../utils/discord');
const Fuse = require('fuse.js');

// @desc    Create a new event (Draft)
// @route   POST /api/events
// @access  Private - Organizer only
exports.createEvent = async (req, res) => {
  try {
    const {
      eventName,
      eventDescription,
      eventType,
      maxTeamSize,
      eligibility,
      eventTags,
      registrationDeadline,
      eventStartDate,
      eventEndDate,
      registrationLimit,
      registrationFee,
      customForm,
      merchandiseDetails
    } = req.body;

    // Validation
    if (!eventName || !eventDescription || !eventType || !registrationDeadline || 
        !eventStartDate || !eventEndDate || !registrationLimit) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Date validations
    const now = new Date();
    const regDeadline = new Date(registrationDeadline);
    const startDate = new Date(eventStartDate);
    const endDate = new Date(eventEndDate);

    if (regDeadline <= now) {
      return res.status(400).json({ message: 'Registration deadline must be in the future' });
    }
    if (startDate <= regDeadline) {
      return res.status(400).json({ message: 'Event start date must be after registration deadline' });
    }
    if (endDate < startDate) {
      return res.status(400).json({ message: 'Event end date must be after start date' });
    }

    // Create event object
    const eventData = {
      eventName,
      eventDescription,
      eventType,
      maxTeamSize: eventType === 'Hackathon' ? (parseInt(maxTeamSize) || 1) : 1, // Capture maxTeamSize
      eligibility: eligibility || 'All',
      eventTags: eventTags || [],
      registrationDeadline,
      eventStartDate,
      eventEndDate,
      registrationLimit,
      registrationFee: registrationFee || 0,
      organizer: req.user._id,
      status: 'Draft'
    };

    // Add type-specific data
    if (eventType === 'Normal' && customForm) {
      eventData.customForm = {
        fields: customForm.fields || [],
        isLocked: false
      };
    } else if (eventType === 'Merchandise' && merchandiseDetails) {
      // Calculate total stock from variants
      const totalStock = merchandiseDetails.variants?.reduce((sum, v) => sum + v.stockQuantity, 0) || 0;
      
      eventData.merchandiseDetails = {
        itemName: merchandiseDetails.itemName,
        description: merchandiseDetails.description,
        variants: merchandiseDetails.variants || [],
        purchaseLimitPerParticipant: merchandiseDetails.purchaseLimitPerParticipant || 1,
        totalStock
      };
    }
    else if (eventType === 'Hackathon') {
        eventData.maxTeamSize = parseInt(maxTeamSize) || 1;
    }

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created as draft',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error while creating event' });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private - Organizer only
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const { status } = event;
    const updates = req.body;

    // Define what can be edited based on status
    if (status === 'Draft') {
      // Draft: Free edits
      if (updates.eventType === 'Hackathon') {
          updates.maxTeamSize = parseInt(updates.maxTeamSize) || 1;
      }
      Object.assign(event, updates);
    } else if (status === 'Published') {
      // Published: Limited edits
      const allowedFields = ['eventDescription', 'registrationDeadline', 'registrationLimit'];
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          event[field] = updates[field];
        }
      });
      
      // Can close registrations
      if (updates.status === 'Closed') {
        event.status = 'Closed';
      }
    } else if (status === 'Ongoing' || status === 'Completed') {
      // Only status changes allowed
      if (updates.status === 'Completed' || updates.status === 'Closed') {
        event.status = updates.status;
      } else {
        return res.status(400).json({ 
          message: 'Only status changes to Completed/Closed are allowed for ongoing/completed events' 
        });
      }
    }

    event.updatedAt = Date.now();
    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error while updating event' });
  }
};

// @desc    Publish event
// @route   POST /api/events/:id/publish
// @access  Private - Organizer only
exports.publishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to publish this event' });
    }

    if (event.status !== 'Draft') {
      return res.status(400).json({ message: 'Only draft events can be published' });
    }

    event.status = 'Published';
    event.updatedAt = Date.now();
    await event.save();

    // If organizer has a discord webhook configured, post an announcement
    try {
      const org = await Organizer.findById(event.organizer).select('organizerName discordWebhook');
      if (org?.discordWebhook) {
        const payload = {
          content: `New event published: **${event.eventName}**\nStarts: ${new Date(event.eventStartDate).toLocaleString()}\nOrganizer: ${org.organizerName}`
        };
        postToDiscord(org.discordWebhook, payload);
      }
    } catch (e) {
      console.error('Failed to post to Discord webhook:', e);
    }

    res.json({
      success: true,
      message: 'Event published successfully',
      event
    });
  } catch (error) {
    console.error('Publish event error:', error);
    res.status(500).json({ message: 'Server error while publishing event' });
  }
};

// @desc    Update custom form
// @route   PUT /api/events/:id/form
// @access  Private - Organizer only
exports.updateCustomForm = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    if (event.eventType !== 'Normal') {
      return res.status(400).json({ message: 'Custom forms are only for Normal events' });
    }

    if (event.customForm.isLocked) {
      return res.status(400).json({ 
        message: 'Form is locked. Cannot edit after first registration.' 
      });
    }

    const { fields } = req.body;

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ message: 'Invalid form fields' });
    }

    event.customForm.fields = fields;
    event.updatedAt = Date.now();
    await event.save();

    res.json({
      success: true,
      message: 'Custom form updated successfully',
      customForm: event.customForm
    });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ message: 'Server error while updating form' });
  }
};

// @desc    Get organizer's events
// @route   GET /api/events/my-events
// @access  Private - Organizer only
exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({ message: 'Server error while fetching events' });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'organizerName category description contactEmail');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error while fetching event' });
  }
};

// @desc Export single event as .ics
// @route GET /api/events/:id/ics
// @access Public
exports.exportEventICS = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'organizerName contactEmail');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const uid = `event-${event._id}@felicity.local`;
    const title = event.eventName;
    const description = event.eventDescription;
    const location = event.venue || '';
    const start = event.eventStartDate;
    const end = event.eventEndDate;
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}`;
    const organizerEmail = event.organizer?.contactEmail || '';

    const vevent = generateEventICS({ uid, title, description, location, start, end, url, organizerEmail });
    const ical = wrapCalendar([vevent]);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${event._id}.ics"`);
    res.send(ical);
  } catch (error) {
    console.error('Export event ICS error:', error);
    res.status(500).json({ message: 'Server error while exporting event calendar' });
  }
};

// @desc    Browse/Search events with preference-based recommendations
// @route   GET /api/events
// @access  Public
exports.browseEvents = async (req, res) => {
  try {
    const {
      search,
      eventType,
      eligibility,
      dateFrom,
      dateTo,
      followedClubs,
      trending,
      page = 1,
      limit = 10
    } = req.query;

    // 1. Build the base MongoDB query (Filtering)
    let query = { status: 'Published' };
    if (eventType) query.eventType = eventType;
    if (eligibility) query.eligibility = eligibility;
    if (dateFrom || dateTo) {
      query.eventStartDate = {};
      if (dateFrom) query.eventStartDate.$gte = new Date(dateFrom);
      if (dateTo) query.eventStartDate.$lte = new Date(dateTo);
    }
    if (followedClubs) {
      query.organizer = { $in: followedClubs.split(',') };
    }

    // 2. Fetch events from DB (Populate organizer so we can search by organizerName)
    let events = await Event.find(query)
      .populate('organizer', 'organizerName category')
      .lean();

    // 3. Apply Fuzzy Searching if 'search' query exists
    if (search && events.length > 0) {
      const fuseOptions = {
        keys: [
          { name: 'eventName', weight: 0.7 },
          { name: 'organizer.organizerName', weight: 0.5 },
          { name: 'eventTags', weight: 0.3 }
        ],
        threshold: 0.4, // Lower is stricter, 0.4 allows for moderate typos/partial matches
        includeScore: true,
        ignoreLocation: true // Search anywhere in the string
      };

      const fuse = new Fuse(events, fuseOptions);
      const result = fuse.search(search);
      
      // Fuse.js returns objects in format { item: event, score: 0.1 }
      events = result.map(res => ({
        ...res.item,
        searchScore: res.score 
      }));
    }

    // 4. Apply Preference Scoring for logged-in participants
    let participantInterests = [];
    let followedClubIds = [];

    if (req.user && req.user.role === 'participant') {
      const participant = await Participant.findById(req.user._id);
      if (participant) {
        participantInterests = participant.interests || [];
        followedClubIds = participant.followedClubs || [];
      }
    }

    events = events.map(event => {
      let prefScore = 0;
      // Match interests (Tags)
      const matches = event.eventTags.filter(tag => participantInterests.includes(tag));
      if (matches.length > 0) prefScore += 10;
      
      // Match followed clubs
      const organizerId = event.organizer._id ? event.organizer._id.toString() : event.organizer.toString();
      if (followedClubIds.includes(organizerId)) prefScore += 15;

      return { ...event, preferenceScore: prefScore };
    });

    // 5. Final Sort (Preference Score desc, then Search/Fuzzy Score asc, then Date asc)
    events.sort((a, b) => {
      if (b.preferenceScore !== a.preferenceScore) {
        return b.preferenceScore - a.preferenceScore;
      }
      if (search && a.searchScore !== b.searchScore) {
        return a.searchScore - b.searchScore; // Lower Fuse.js score is a better match
      }
      return new Date(a.eventStartDate) - new Date(b.eventStartDate);
    });

    // 6. Pagination (Manual because we sorted in JS)
    const startIndex = (page - 1) * limit;
    const paginatedEvents = events.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      count: paginatedEvents.length,
      total: events.length,
      page: parseInt(page),
      pages: Math.ceil(events.length / limit),
      events: paginatedEvents
    });
  } catch (error) {
    console.error('Browse events error:', error);
    res.status(500).json({ message: 'Server error while browsing events' });
  }
};