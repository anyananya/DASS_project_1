import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Tag, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { eventAPI, registrationAPI } from '../../services/api';
import EventChat from '../../components/EventChat';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [merchandiseSelection, setMerchandiseSelection] = useState({
    size: '',
    color: '',
    quantity: 1
  });
  const [paymentProofFile, setPaymentProofFile] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await eventAPI.getEvent(id);
      setEvent(response.data.event);
      
      // Initialize form responses for Normal events
      if (response.data.event.eventType === 'Normal' && response.data.event.customForm?.fields) {
        const initialResponses = {};
        response.data.event.customForm.fields.forEach(field => {
          initialResponses[field.fieldId] = '';
        });
        setFormResponses(initialResponses);
      }
    } catch (error) {
      toast.error('Failed to fetch event details');
      console.error('Fetch event error:', error);
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

  const isRegistrationOpen = () => {
    if (event.status !== 'Published') return false;
    const now = new Date();
    const deadline = new Date(event.registrationDeadline);
    return now < deadline && event.registrationCount < event.registrationLimit;
  };

  const handleFormResponseChange = (fieldId, value) => {
    setFormResponses({
      ...formResponses,
      [fieldId]: value
    });
  };

  const handleMerchandiseChange = (e) => {
    setMerchandiseSelection({
      ...merchandiseSelection,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (role !== 'participant') {
      toast.error('Only participants can register for events');
      return;
    }

    setRegistering(true);

    try {
      let registrationData = {};

      if (event.eventType === 'Normal') {
        // Validate form responses
        const responses = event.customForm.fields.map(field => ({
          fieldId: field.fieldId,
          label: field.label,
          value: formResponses[field.fieldId]
        }));

        // Check required fields
        const missingFields = event.customForm.fields.filter(
          field => field.required && !formResponses[field.fieldId]
        );

        if (missingFields.length > 0) {
          toast.error('Please fill all required fields');
          setRegistering(false);
          return;
        }

        registrationData.formResponses = responses;
      } else if (event.eventType === 'Merchandise') {
        if (!merchandiseSelection.size || !merchandiseSelection.color) {
          toast.error('Please select size and color');
          setRegistering(false);
          return;
        }

        registrationData.merchandiseOrder = {
          variant: {
            size: merchandiseSelection.size,
            color: merchandiseSelection.color
          },
          quantity: parseInt(merchandiseSelection.quantity)
        };
      }

      let response;

      if (event.eventType === 'Merchandise') {
        // Ensure payment proof file provided
        if (!paymentProofFile) {
          toast.error('Please upload payment proof to complete the order');
          setRegistering(false);
          return;
        }

        const fd = new FormData();
        fd.append('merchandiseOrder', JSON.stringify(registrationData.merchandiseOrder));
        fd.append('paymentProof', paymentProofFile);

        response = await registrationAPI.registerForEventFormData(id, fd);

        toast.success(response.data.message || 'Order placed — pending approval');
        navigate('/dashboard');
      } else {
        response = await registrationAPI.registerForEvent(id, registrationData);
        toast.success('Registration successful! Check your email for ticket.');
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      console.error('Registration error:', error);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Event not found</p>
      </div>
    );
  }

  const spotsLeft = event.registrationLimit - event.registrationCount;
  const registrationOpen = isRegistrationOpen();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-12 text-white">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  event.eventType === 'Normal' ? 'bg-blue-500' : 
                  event.eventType === 'Hackathon' ? 'bg-purple-500' : 'bg-green-500'
                }`}
              >
                {event.eventType}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white bg-opacity-20">
                {event.eligibility}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-4">{event.eventName}</h1>
            <p className="text-xl text-indigo-100">
              by {event.organizer?.organizerName}
            </p>
          </div>

          <div className="px-8 py-6">
            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <Calendar className="w-6 h-6 text-indigo-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Start Date</p>
                  <p className="text-gray-600">{formatDate(event.eventStartDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-indigo-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">End Date</p>
                  <p className="text-gray-600">{formatDate(event.eventEndDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-indigo-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Registration Deadline</p>
                  <p className="text-gray-600">{formatDate(event.registrationDeadline)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-6 h-6 text-indigo-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {event.eventType === 'Hackathon' ? 'Team Capacity' : 'Spots Available'}
                  </p>
                  <p className="text-gray-600">
                    {spotsLeft} / {event.registrationLimit} remaining
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-6 h-6 text-indigo-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Registration Fee</p>
                  <p className="text-gray-600">
                    {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                  </p>
                </div>
              </div>

              {event.eventType === 'Hackathon' && (
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 text-indigo-600 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Required Team Size</p>
                    <p className="text-gray-600">{event.maxTeamSize} Members</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
              <p className="text-gray-700 whitespace-pre-line">{event.eventDescription}</p>
            </div>

            {/* Tags */}
            {event.eventTags && event.eventTags.length > 0 && (
              <div className="mb-8">
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

            {/* Registration Status Alert */}
            {!registrationOpen && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      {event.status !== 'Published'
                        ? 'This event is not open for registration yet.'
                        : spotsLeft <= 0
                        ? 'Registration is full.'
                        : 'Registration deadline has passed.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Registration Section */}
            {registrationOpen && role === 'participant' && (
              <div className="border-t pt-8">
                {event.eventType === 'Hackathon' ? (
                  /* --- HACKATHON TEAM WORKFLOW --- */
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-8 text-center">
                    <Users className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-indigo-900 mb-2">Team Registration</h2>
                    <p className="text-indigo-700 mb-6 max-w-lg mx-auto text-sm">
                      This is a team-based event. You must create a team and invite members. 
                      Registration is <strong>marked complete only when all {event.maxTeamSize} members accept</strong> and the team is fully formed.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => navigate(`/organizer/create-team/${event._id}`)}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg transition-all"
                      >
                        Create a New Team
                      </button>
                      <button
                        onClick={() => toast('To join an existing team, please use the invite link sent to your email!')}
                        className="px-8 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold hover:bg-gray-50 transition-all text-sm"
                      >
                        I have an invite code
                      </button>
                    </div>
                  </div>
                ) : (
                  /* --- NORMAL / MERCHANDISE REGISTRATION FORM --- */
                  <form onSubmit={handleRegister}>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      {event.eventType === 'Merchandise' ? 'Place Your Order' : 'Register for this Event'}
                    </h2>

                    {/* Normal Event Form Fields */}
                    {event.eventType === 'Normal' && event.customForm?.fields && (
                      <div className="space-y-4">
                        {event.customForm.fields.map((field) => (
                          <div key={field.fieldId}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>

                            {field.fieldType === 'text' && (
                              <input
                                type="text"
                                placeholder={field.placeholder}
                                required={field.required}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formResponses[field.fieldId] || ''}
                                onChange={(e) => handleFormResponseChange(field.fieldId, e.target.value)}
                              />
                            )}

                            {field.fieldType === 'textarea' && (
                              <textarea
                                placeholder={field.placeholder}
                                required={field.required}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formResponses[field.fieldId] || ''}
                                onChange={(e) => handleFormResponseChange(field.fieldId, e.target.value)}
                              />
                            )}

                            {field.fieldType === 'dropdown' && (
                              <select
                                required={field.required}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formResponses[field.fieldId] || ''}
                                onChange={(e) => handleFormResponseChange(field.fieldId, e.target.value)}
                              >
                                <option value="">Select an option</option>
                                {field.options?.map((option, idx) => (
                                  <option key={idx} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            )}

                            {field.fieldType === 'checkbox' && (
                              <div className="space-y-2">
                                {field.options?.map((option, idx) => (
                                  <label key={idx} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      value={option}
                                      className="mr-2"
                                      onChange={(e) => {
                                        const currentValue = formResponses[field.fieldId] || [];
                                        const newValue = e.target.checked
                                          ? [...currentValue, option]
                                          : currentValue.filter(v => v !== option);
                                        handleFormResponseChange(field.fieldId, newValue);
                                      }}
                                    />
                                    {option}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Merchandise Selection */}
                    {event.eventType === 'Merchandise' && event.merchandiseDetails && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-4">
                            {event.merchandiseDetails.itemName}
                          </h3>
                          <p className="text-gray-600 mb-4">
                            {event.merchandiseDetails.description}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Size <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="size"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              value={merchandiseSelection.size}
                              onChange={handleMerchandiseChange}
                            >
                              <option value="">Select size</option>
                              {[...new Set(event.merchandiseDetails.variants.map(v => v.size))].map(size => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Color <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="color"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              value={merchandiseSelection.color}
                              onChange={handleMerchandiseChange}
                            >
                              <option value="">Select color</option>
                              {[...new Set(event.merchandiseDetails.variants.map(v => v.color))].map(color => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Quantity
                            </label>
                            <input
                              type="number"
                              name="quantity"
                              min="1"
                              max={event.merchandiseDetails.purchaseLimitPerParticipant}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              value={merchandiseSelection.quantity}
                              onChange={handleMerchandiseChange}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Max {event.merchandiseDetails.purchaseLimitPerParticipant} per person
                            </p>
                          </div>
                        </div>

                        {merchandiseSelection.size && merchandiseSelection.color && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">
                              Available stock:{' '}
                              {event.merchandiseDetails.variants.find(
                                v => v.size === merchandiseSelection.size && v.color === merchandiseSelection.color
                              )?.stockQuantity || 0}{' '}
                              units
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Payment Proof (screenshot/receipt) *</label>
                          <input
                            type="file"
                            accept="image/*"
                            required
                            onChange={(e) => setPaymentProofFile(e.target.files[0] || null)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-8 flex gap-4">
                      <button
                        type="submit"
                        disabled={registering}
                        className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {registering ? 'Processing...' : `Register ${event.registrationFee > 0 ? `(₹${event.registrationFee})` : '(Free)'}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            
            {/* Discussion Forum */}
            <div className="mt-8 border-t pt-8">
              <EventChat eventId={event._id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  }; // This closing bracket was missing

export default EventDetails;