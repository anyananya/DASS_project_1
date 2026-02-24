import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { organizersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const OrganizerDetail = () => {
  const { id } = useParams();
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  
  // Requirement 9.8: Categorization logic
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.eventStartDate) > now);
  const pastEvents = events.filter(e => new Date(e.eventStartDate) <= now);

  useEffect(() => { 
    fetchDetail(); 
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await organizersAPI.get(id);
      setOrganizer(res.data.organizer);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Fetch organizer', err);
      toast.error('Failed to fetch organizer');
    }
  };

  if (!organizer) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
        {/* Requirement 9.8: Basic Info */}
        <h2 className="text-2xl font-bold">{organizer.organizerName}</h2>
        <p className="text-sm text-indigo-600 font-medium">{organizer.category}</p>
        <p className="mt-4 text-gray-700">{organizer.description}</p>
        <p className="mt-4 text-sm font-semibold">Contact: {organizer.contactEmail || 'N/A'}</p>

        {/* Requirement 9.8: Upcoming Events Section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold border-b pb-2">Upcoming Events</h3>
          <div className="mt-3 space-y-3 mb-8">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming events</p>
            ) : (
              upcomingEvents.map(e => (
                <div key={e._id} className="p-3 border rounded hover:border-indigo-300 transition">
                  <Link to={`/events/${e._id}`} className="text-indigo-600 font-medium">{e.eventName}</Link>
                  <p className="text-sm text-gray-600">{e.eventType} • {new Date(e.eventStartDate).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>

          {/* Requirement 9.8: Past Events Section */}
          <h3 className="text-lg font-semibold border-b pb-2">Past Events</h3>
          <div className="mt-3 space-y-3 opacity-75">
            {pastEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No past events</p>
            ) : (
              pastEvents.map(e => (
                <div key={e._id} className="p-3 border rounded bg-gray-50">
                  <Link to={`/events/${e._id}`} className="text-gray-700 font-medium">{e.eventName}</Link>
                  <p className="text-sm text-gray-500">{new Date(e.eventStartDate).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDetail;