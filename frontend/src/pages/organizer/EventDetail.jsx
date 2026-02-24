import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Edit, 
  Eye, 
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  ScanLine
} from 'lucide-react';
import { eventAPI, registrationAPI } from '../../services/api';
import toast from 'react-hot-toast';

const OrganizerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const eventResponse = await eventAPI.getEvent(id);
      setEvent(eventResponse.data.event);
      
      // In a real implementation, you'd have an API endpoint to get participants
      const participantsResponse = await registrationAPI.getEventParticipants(id);
      setParticipants(participantsResponse.data.participants || []);
      
    } catch (error) {
      toast.error('Failed to fetch event details');
      console.error('Fetch event error:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: MANUAL ATTENDANCE OVERRIDE ---
  const handleManualAttendance = async (ticketId) => {
    const reason = window.prompt(
      "Enter reason for manual override (e.g., 'Forgot phone', 'Scanner failed'):"
    );
    
    if (reason === null) return; // Cancelled
    if (!reason.trim()) {
      toast.error("A reason is required for manual override audit logs.");
      return;
    }

    try {
      await registrationAPI.markAttendance({
        ticketId,
        method: 'manual',
        reason: reason.trim()
      });
      toast.success('Attendance marked via manual override');
      fetchEventDetails(); // Refresh list to show updated status
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish this event?')) return;

    try {
      await eventAPI.publishEvent(id);
      toast.success('Event published successfully!');
      fetchEventDetails();
    } catch (error) {
      toast.error('Failed to publish event');
      console.error('Publish error:', error);
    }
  };

  const handleCloseRegistrations = async () => {
    if (!confirm('Are you sure you want to close registrations for this event?')) return;

    try {
      await eventAPI.updateEvent(id, { status: 'Closed' });
      toast.success('Registrations closed successfully!');
      fetchEventDetails();
    } catch (error) {
      toast.error('Failed to close registrations');
      console.error('Close error:', error);
    }
  };

  const handleMarkCompleted = async () => {
    if (!confirm('Are you sure you want to mark this event as completed?')) return;

    try {
      await eventAPI.updateEvent(id, { status: 'Completed' });
      toast.success('Event marked as completed!');
      fetchEventDetails();
    } catch (error) {
      toast.error('Failed to mark event as completed');
      console.error('Complete error:', error);
    }
  };

  const handleExportCSV = () => {
    if (participants.length === 0) {
      toast.error('No participants to export');
      return;
    }

    // Create CSV content
    const headers = ['Name', 'Email', 'Registration Date', 'Payment Status', 'Attendance', 'Override Reason'];
    const rows = participants.map(p => [
      `${p.participant?.firstName} ${p.participant?.lastName}`,
      p.participant?.email,
      new Date(p.registeredAt).toLocaleDateString(),
      p.ticketId,
      p.paymentStatus,
      p.attended ? 'Yes' : 'No',
      p.attendanceReason || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.eventName}-participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('CSV exported successfully!');
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = 
      p.participant?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.participant?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.participant?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'confirmed' && p.status === 'Confirmed') ||
      (filterStatus === 'attended' && p.attended) ||
      (filterStatus === 'not-attended' && !p.attended);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg mb-4">Event not found</p>
        <button
          onClick={() => navigate('/organizer/dashboard')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const registrationPercentage = (event.registrationCount / event.registrationLimit) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/organizer/dashboard')}
            className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{event.eventName}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(event.status)}`}>
                  {event.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  event.eventType === 'Normal' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {event.eventType}
                </span>
              </div>
              <p className="text-gray-600">{event.eventDescription}</p>
            </div>

            <div className="flex gap-2">
              <button
              onClick={() => navigate(`/organizer/attendance`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
              >
              <ScanLine className="w-5 h-5" />
              Open QR Scanner
              </button>
              {event.status === 'Draft' && (
                <button
                  onClick={handlePublish}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Publish Event
                </button>
              )}
              {event.status === 'Published' && (
                <button
                  onClick={handleCloseRegistrations}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                >
                  Close Registrations
                </button>
              )}
              {(event.status === 'Published' || event.status === 'Ongoing') && (
                <button
                  onClick={handleMarkCompleted}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Mark Completed
                </button>
              )}
              <button
                onClick={() => navigate(`/organizer/events/${id}/edit`)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'analytics'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'participants'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Participants ({event.registrationCount})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-indigo-600 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Start Date</p>
                          <p className="text-gray-900">{formatDate(event.eventStartDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-indigo-600 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">End Date</p>
                          <p className="text-gray-900">{formatDate(event.eventEndDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-indigo-600 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Registration Deadline</p>
                          <p className="text-gray-900">{formatDate(event.registrationDeadline)}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-indigo-600 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Eligibility</p>
                          <p className="text-gray-900">{event.eligibility}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-indigo-600 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Registration Fee</p>
                          <p className="text-gray-900">
                            {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Status</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Registrations</span>
                          <span className="font-semibold text-gray-900">
                            {event.registrationCount} / {event.registrationLimit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              registrationPercentage >= 90
                                ? 'bg-red-600'
                                : registrationPercentage >= 70
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                            }`}
                            style={{ width: `${registrationPercentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {event.registrationLimit - event.registrationCount} spots remaining
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700">Quick Stats</p>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Registrations:</span>
                            <span className="font-semibold">{event.registrationCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-semibold">₹{event.analytics?.totalRevenue || 0}</span>
                          </div>
                          {event.status === 'Completed' && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Attendance:</span>
                              <span className="font-semibold">{event.analytics?.totalAttendance || 0}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {event.eventTags && event.eventTags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {event.eventTags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Form Fields */}
                {event.eventType === 'Normal' && event.customForm?.fields && event.customForm.fields.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Registration Form Fields</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {event.customForm.fields.map((field, index) => (
                        <div key={field.fieldId} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{field.label}</span>
                            {field.required && (
                              <span className="ml-2 text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">{field.fieldType}</span>
                        </div>
                      ))}
                      {event.customForm.isLocked && (
                        <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                          🔒 Form is locked (registrations received)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Merchandise Details */}
                {event.eventType === 'Merchandise' && event.merchandiseDetails && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Merchandise Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{event.merchandiseDetails.itemName}</h4>
                      <p className="text-sm text-gray-600 mb-4">{event.merchandiseDetails.description}</p>
                      
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="text-gray-600">Total Stock:</span>{' '}
                          <span className="font-semibold">{event.merchandiseDetails.totalStock}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">Purchase Limit:</span>{' '}
                          <span className="font-semibold">{event.merchandiseDetails.purchaseLimitPerParticipant} per person</span>
                        </p>
                      </div>

                      <h5 className="font-medium text-gray-900 mt-4 mb-2">Variants:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {event.merchandiseDetails.variants.map((variant, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {variant.size} - {variant.color}
                                </p>
                                <p className="text-sm text-gray-600">Stock: {variant.stockQuantity}</p>
                              </div>
                              <p className="font-semibold text-indigo-600">₹{variant.price || 0}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {/* Hackathon Details */}
                {event.eventType === 'Hackathon' && (
                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <h3 className="font-bold text-indigo-900">Participating as a Team?</h3>
                    <p className="text-sm text-indigo-700 mb-4">
                      Create a team, invite your friends, and get your tickets automatically once full.
                    </p>
                    <button
                      onClick={() => navigate(`/organizer/create-team/${id}`)}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700"
                    >
                      Create a New Team
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total Registrations</p>
                        <p className="text-3xl font-bold mt-2">{event.registrationCount}</p>
                      </div>
                      <Users className="w-12 h-12 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Total Revenue</p>
                        <p className="text-3xl font-bold mt-2">₹{event.analytics?.totalRevenue || 0}</p>
                      </div>
                      <DollarSign className="w-12 h-12 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Attendance</p>
                        <p className="text-3xl font-bold mt-2">{event.analytics?.totalAttendance || 0}</p>
                      </div>
                      <CheckCircle className="w-12 h-12 opacity-50" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">Fill Rate</p>
                        <p className="text-3xl font-bold mt-2">{registrationPercentage.toFixed(0)}%</p>
                      </div>
                      <TrendingUp className="w-12 h-12 opacity-50" />
                    </div>
                  </div>
                </div>

                {event.status === 'Completed' && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Registration Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Registrations:</span>
                            <span className="font-semibold">{event.registrationCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Registration Limit:</span>
                            <span className="font-semibold">{event.registrationLimit}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Fill Rate:</span>
                            <span className="font-semibold">{registrationPercentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Financial Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Registration Fee:</span>
                            <span className="font-semibold">₹{event.registrationFee}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Revenue:</span>
                            <span className="font-semibold">₹{event.analytics?.totalRevenue || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Avg. per Registration:</span>
                            <span className="font-semibold">
                              ₹{event.registrationCount > 0 
                                ? ((event.analytics?.totalRevenue || 0) / event.registrationCount).toFixed(2) 
                                : 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Participants Tab */}
            {activeTab === 'participants' && (
              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-4 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Participants</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="attended">Attended</option>
                    <option value="not-attended">Not Attended</option>
                  </select>

                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                  <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {filteredParticipants.map((reg) => (
                  <tr key={reg._id}>
                  <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{reg.participant?.firstName} {reg.participant?.lastName}</div>
                  <div className="text-xs text-gray-500">{reg.participant?.email}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{reg.ticketId}</td>
                  <td className="px-6 py-4">
                  {reg.attended ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Present
                  </span>
                  ) : (
                  <span className="flex items-center gap-1 text-gray-400 text-sm">
                  <XCircle className="w-4 h-4" /> Absent
                  </span>
                  )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                  {!reg.attended && (
                  <button
                  onClick={() => handleManualAttendance(reg.ticketId)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-800 underline"
                  >
                  Manual Override
                  </button>
                  )}
                  <button onClick={() => navigate(`/ticket/${reg.ticketId}`)} className="text-indigo-600 hover:text-indigo-900">
                  <Eye className="w-4 h-4 inline" />
                  </button>
                  </td>
                  </tr>
                  ))}
                  </tbody>
                  </table>
                  </div>

                {/* Participants Table */}
                {participants.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No participants yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Participants will appear here once they register for the event.
                    </p>
                  </div>
                ) : filteredParticipants.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Search className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search or filter criteria.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Registration Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Attendance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredParticipants.map((registration) => (
                          <tr key={registration._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {registration.participant?.firstName} {registration.participant?.lastName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{registration.participant?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {new Date(registration.registeredAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  registration.paymentStatus === 'Completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {registration.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {registration.attended ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-400" />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => navigate(`/ticket/${registration.ticketId}`)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                View Ticket
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-sm text-gray-500 text-center">
                  Showing {filteredParticipants.length} of {participants.length} participants
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerEventDetail;