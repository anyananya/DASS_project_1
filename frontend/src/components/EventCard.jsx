import { Calendar, MapPin, Users, Tag, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const EventCard = ({ event }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const spotsLeft = event.registrationLimit - event.registrationCount;
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;

  return (
    <Link to={`/events/${event._id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        <div className="p-6">
          {/* Event Type Badge */}
          <div className="flex items-center justify-between mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                event.eventType === 'Normal'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {event.eventType}
            </span>
            {isFull && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                Full
              </span>
            )}
            {isAlmostFull && !isFull && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                Almost Full
              </span>
            )}
          </div>

          {/* Event Name */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {event.eventName}
          </h3>

          {/* Organizer */}
          <p className="text-sm text-indigo-600 mb-3">
            by {event.organizer?.organizerName}
          </p>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {event.eventDescription}
          </p>

          {/* Event Details */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatDate(event.eventStartDate)}</span>
            </div>

            <div className="flex items-center text-sm text-gray-500">
              <Users className="w-4 h-4 mr-2" />
              <span>
                {event.registrationCount} / {event.registrationLimit} registered
              </span>
            </div>

            {event.registrationFee > 0 && (
              <div className="flex items-center text-sm text-gray-500">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>₹{event.registrationFee}</span>
              </div>
            )}

            {event.registrationFee === 0 && (
              <div className="flex items-center text-sm text-green-600 font-semibold">
                <Tag className="w-4 h-4 mr-2" />
                <span>Free</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {event.eventTags && event.eventTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {event.eventTags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {event.eventTags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{event.eventTags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3">
          <button className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
            View Details →
          </button>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;