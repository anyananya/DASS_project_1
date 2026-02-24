import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';
import { eventAPI } from '../../services/api';
import toast from 'react-hot-toast';

const OrganizerDashboard = () => {
  const location = useLocation();
  const statusFilter = new URLSearchParams(location.search).get('status');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
    completedEvents: 0
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await eventAPI.getMyEvents();
      const fetchedEvents = response.data.events;
      setEvents(fetchedEvents);
      
      // Calculate stats
      const completedEvents = fetchedEvents.filter(e => e.status === 'Completed');
      const totalRegistrations = fetchedEvents.reduce((sum, e) => sum + e.registrationCount, 0);
      const totalRevenue = completedEvents.reduce((sum, e) => sum + (e.analytics?.totalRevenue || 0), 0);
      
      setStats({
        totalEvents: fetchedEvents.length,
        totalRegistrations,
        totalRevenue,
        completedEvents: completedEvents.length
      });
    } catch (error) {
      toast.error('Failed to fetch events');
      console.error('Fetch events error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Draft: 'bg-gray-100 text-gray-800',
      Published: 'bg-blue-100 text-blue-800',
      Ongoing: 'bg-green-100 text-green-800',
      Completed: 'bg-purple-100 text-purple-800',
      Closed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your events and view analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/organizer/create-event"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </Link>
            <Link
              to="/organizer/attendance-logs"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium"
            >
              View Attendance Logs
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEvents}</p>
              </div>
              <Calendar className="w-12 h-12 text-indigo-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRegistrations}</p>
              </div>
              <Users className="w-12 h-12 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">₹{stats.totalRevenue}</p>
              </div>
              <DollarSign className="w-12 h-12 text-yellow-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Events</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedEvents}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Events</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No events yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first event.</p>
              <div className="mt-6">
                <Link
                  to="/organizer/create-event"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Filter badge */}
              {statusFilter && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">Showing:</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    {statusFilter} Events
                  </span>
                  <a href="/organizer/dashboard" className="text-xs text-indigo-500 hover:underline ml-1">Clear filter</a>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(statusFilter ? events.filter(e => e.status === statusFilter) : events).map((event) => (
                  <Link
                    key={event._id}
                    to={`/organizer/events/${event._id}`}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          event.eventType === 'Normal'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {event.eventType}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {event.eventName}
                    </h3>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {event.eventDescription}
                    </p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(event.eventStartDate)}</span>
                      </div>

                      <div className="flex items-center text-gray-500">
                        <Users className="w-4 h-4 mr-2" />
                        <span>
                          {event.registrationCount} / {event.registrationLimit} registered
                        </span>
                      </div>

                      {event.status === 'Completed' && (
                        <div className="flex items-center text-gray-500">
                          <DollarSign className="w-4 h-4 mr-2" />
                          <span>Revenue: ₹{event.analytics?.totalRevenue || 0}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
                        Manage Event →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;