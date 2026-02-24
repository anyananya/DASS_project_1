import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import { registrationAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRegistrations(activeTab);
  }, [activeTab]);

  const fetchRegistrations = async (filter) => {
    setLoading(true);
    try {
      const response = await registrationAPI.getMyRegistrations(filter);
      setRegistrations(response.data.registrations);
    } catch (error) {
      toast.error('Failed to fetch registrations');
      console.error('Fetch registrations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming Events' },
    { id: 'normal', label: 'Normal Events' },
    { id: 'merchandise', label: 'Merchandise' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled/Rejected' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Events Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your event registrations and view your participation history
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === 'upcoming'
                    ? "You haven't registered for any upcoming events yet."
                    : `No ${activeTab} events found.`}
                </p>
                {activeTab === 'upcoming' && (
                  <div className="mt-6">
                    <Link
                      to="/browse-events"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Browse Events
                    </Link>
                  </div>
                )}
              </div>
              ) : (
              <div className="space-y-4">
                {registrations.filter(r => r.event).map((registration) => (
                  <div
                    key={registration._id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {registration.event?.eventName}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              registration.event?.eventType === 'Normal'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {registration.event?.eventType}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              registration.status === 'Confirmed'
                                ? 'bg-green-100 text-green-800'
                                : registration.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {registration.status}
                          </span>
                        </div>
                        {registration.event?.organizer?.organizerName && (
                            <p className="text-sm text-gray-500 mb-2">
                                by {registration.event.organizer.organizerName}
                            </p>
                            )}

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(registration.event?.eventStartDate)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className="font-mono">{registration.ticketId || '—'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              Registered on {formatDate(registration.registeredAt)}
                            </span>
                          </div>

                          {registration.merchandiseOrder && (
                            <div className="mt-2 p-3 bg-gray-50 rounded">
                              <p className="font-medium text-gray-700">Order Details:</p>
                              <p className="text-sm">
                                Size: {registration.merchandiseOrder.variant?.size} |
                                Color: {registration.merchandiseOrder.variant?.color} |
                                Quantity: {registration.merchandiseOrder.quantity}
                              </p>
                              <p className="text-sm font-semibold mt-1">
                                Total: ₹{registration.merchandiseOrder.totalAmount}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        <Link
                          to={`/ticket/${registration.ticketId}`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          View Ticket
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;