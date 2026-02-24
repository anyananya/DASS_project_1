import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Calendar, MapPin, User, Mail, Phone, Building } from 'lucide-react';
import { registrationAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Ticket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await registrationAPI.getTicket(ticketId);
      setRegistration(response.data.registration);
    } catch (error) {
      toast.error('Failed to fetch ticket');
      console.error('Fetch ticket error:', error);
    } finally {
      setLoading(false);
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

  const handleDownload = () => {
    // Create a canvas to combine ticket info and QR code
    const link = document.createElement('a');
    link.download = `ticket-${ticketId}.png`;
    link.href = registration.qrCode;
    link.click();
    toast.success('Ticket downloaded!');
  };

  const handleDownloadICS = async () => {
    if (!registration.event?._id) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/events/${registration.event._id}/ics`);
      if (!resp.ok) throw new Error('Failed to fetch ics');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${registration.event._id}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Calendar file downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to download calendar file');
    }
  };

  const makeGoogleCalendarUrl = () => {
    const ev = registration.event;
    const start = new Date(ev.eventStartDate).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const end = new Date(ev.eventEndDate).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const text = encodeURIComponent(ev.eventName);
    const details = encodeURIComponent(ev.eventDescription || '');
    const location = encodeURIComponent(ev.venue || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}&sf=true&output=xml`;
  };

  const makeOutlookUrl = () => {
    const ev = registration.event;
    const start = encodeURIComponent(new Date(ev.eventStartDate).toISOString());
    const end = encodeURIComponent(new Date(ev.eventEndDate).toISOString());
    const subject = encodeURIComponent(ev.eventName);
    const body = encodeURIComponent(ev.eventDescription || '');
    const location = encodeURIComponent(ev.venue || '');
    return `https://outlook.live.com/owa/?rru=addevent&startdt=${start}&enddt=${end}&subject=${subject}&body=${body}&location=${location}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg mb-4">Ticket not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Action Buttons */}
        <div className="mb-6 flex gap-4 print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download QR
          </button>
          <button
            onClick={handleDownloadICS}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Add to Calendar (.ics)
          </button>
          <a href={makeGoogleCalendarUrl()} target="_blank" rel="noreferrer" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Google Calendar
          </a>
          <a href={makeOutlookUrl()} target="_blank" rel="noreferrer" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Outlook
          </a>
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50"
          >
            Print Ticket
          </button>
        </div>

        {/* Ticket Card */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Event Ticket</h1>
            <p className="text-indigo-100">Valid for entry and participation</p>
          </div>

          <div className="p-8">
            {/* Ticket ID */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-2">Ticket ID</p>
              <p className="text-2xl font-mono font-bold text-indigo-600">
                {registration.ticketId}
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-8">
              <div className="bg-white p-4 rounded-lg border-4 border-indigo-600">
                <img
                  src={registration.qrCode}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
            </div>

            {/* Event Details */}
            <div className="border-t border-b border-gray-200 py-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {registration.event?.eventName}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Event Date & Time</p>
                      <p className="text-gray-900 font-semibold">
                        {formatDate(registration.event?.eventStartDate)}
                      </p>
                      <p className="text-sm text-gray-600">
                        to {formatDate(registration.event?.eventEndDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Organizer</p>
                      <p className="text-gray-900">{registration.event?.organizer?.organizerName}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Participant Name</p>
                      <p className="text-gray-900">
                        {registration.participant?.firstName} {registration.participant?.lastName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-900">{registration.participant?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact</p>
                      <p className="text-gray-900">{registration.participant?.contactNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Registration Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(registration.registeredAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Event Type:</span>
                  <span className="font-medium text-gray-900">
                    {registration.event?.eventType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${
                      registration.status === 'Confirmed'
                        ? 'text-green-600'
                        : registration.status === 'Pending'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {registration.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span
                    className={`font-medium ${
                      registration.paymentStatus === 'Completed'
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {registration.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-gray-900">
                    ₹{registration.amountPaid}
                  </span>
                </div>
              </div>
            </div>

            {/* Merchandise Details */}
            {registration.merchandiseOrder && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Merchandise Order</h3>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium text-gray-900">
                      {registration.merchandiseOrder.variant?.size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium text-gray-900">
                      {registration.merchandiseOrder.variant?.color}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium text-gray-900">
                      {registration.merchandiseOrder.quantity}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Responses */}
            {registration.formResponses && registration.formResponses.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Form Responses</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {registration.formResponses.map((response, index) => (
                    <div key={index}>
                      <p className="text-sm font-medium text-gray-600">{response.label}</p>
                      <p className="text-gray-900 mt-1">
                        {Array.isArray(response.value)
                          ? response.value.join(', ')
                          : response.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important Instructions */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                Important Instructions
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Present this QR code at the event entrance</li>
                <li>Carry a valid ID proof for verification</li>
                <li>Arrive 15 minutes before the event start time</li>
                <li>This ticket is non-transferable</li>
                <li>Save this ticket or download it for offline access</li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="text-center text-sm text-gray-500">
              <p>For any queries, contact the event organizer</p>
              <p className="mt-1">
                Email: {registration.event?.organizer?.contactEmail || 'N/A'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-500">
            <p>Generated by Felicity Event Management System</p>
            <p className="mt-1">Ticket ID: {registration.ticketId}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ticket;