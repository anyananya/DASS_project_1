import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { eventAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { id: eventId } = useParams();
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [eventData, setEventData] = useState({
    eventName: '',
    eventDescription: '',
    eventType: 'Normal',
    eligibility: 'All',
    eventTags: '',
    registrationDeadline: '',
    eventStartDate: '',
    eventEndDate: '',
    registrationLimit: '',
    registrationFee: ''
  });

  // For Normal Events - Custom Form
  const [formFields, setFormFields] = useState([]);
  const [newField, setNewField] = useState({
    fieldType: 'text',
    label: '',
    placeholder: '',
    required: false,
    options: []
  });

  // For Merchandise Events
  const [merchandiseDetails, setMerchandiseDetails] = useState({
    itemName: '',
    description: '',
    purchaseLimitPerParticipant: 1,
    variants: []
  });
  const [newVariant, setNewVariant] = useState({
    size: '',
    color: '',
    stockQuantity: '',
    price: ''
  });

  const handleEventDataChange = (e) => {
    setEventData({
      ...eventData,
      [e.target.name]: e.target.value
    });
  };

  const handleMerchandiseChange = (e) => {
    setMerchandiseDetails({
      ...merchandiseDetails,
      [e.target.name]: e.target.value
    });
  };

  const handleVariantChange = (e) => {
    setNewVariant({
      ...newVariant,
      [e.target.name]: e.target.value
    });
  };

  const addVariant = () => {
    if (!newVariant.size || !newVariant.color || !newVariant.stockQuantity) {
      toast.error('Please fill all variant fields');
      return;
    }

    setMerchandiseDetails({
      ...merchandiseDetails,
      variants: [...merchandiseDetails.variants, { ...newVariant, stockQuantity: parseInt(newVariant.stockQuantity), price: parseFloat(newVariant.price) || 0 }]
    });

    setNewVariant({ size: '', color: '', stockQuantity: '', price: '' });
  };

  const removeVariant = (index) => {
    setMerchandiseDetails({
      ...merchandiseDetails,
      variants: merchandiseDetails.variants.filter((_, i) => i !== index)
    });
  };

  const handleFieldChange = (e) => {
    setNewField({
      ...newField,
      [e.target.name]: e.target.value
    });
  };

  const addFormField = () => {
    if (!newField.label) {
      toast.error('Please enter field label');
      return;
    }

    if ((newField.fieldType === 'dropdown' || newField.fieldType === 'radio' || newField.fieldType === 'checkbox') && newField.options.length === 0) {
      toast.error('Please add options for this field type');
      return;
    }

    const field = {
      fieldId: `field_${Date.now()}`,
      fieldType: newField.fieldType,
      label: newField.label,
      placeholder: newField.placeholder,
      required: newField.required,
      options: newField.options,
      order: formFields.length + 1
    };

    setFormFields([...formFields, field]);
    setNewField({
      fieldType: 'text',
      label: '',
      placeholder: '',
      required: false,
      options: []
    });
  };

  const removeFormField = (index) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const addOption = () => {
    const option = prompt('Enter option:');
    if (option) {
      setNewField({
        ...newField,
        options: [...newField.options, option]
      });
    }
  };

  // If route contains an event id, load event and prefill for edit
  useEffect(() => {
    const loadIfEdit = async () => {
      if (!eventId) return;
      setIsEdit(true);
      setLoading(true);
      try {
        const res = await eventAPI.getEvent(eventId);
        const ev = res.data.event;
        if (!ev) {
          toast.error('Event not found');
          setLoading(false);
          return;
        }

        setEventData({
          eventName: ev.eventName || '',
          eventDescription: ev.eventDescription || '',
          eventType: ev.eventType || 'Normal',
          eligibility: ev.eligibility || 'All',
          eventTags: (ev.eventTags || []).join(', '),
          registrationDeadline: ev.registrationDeadline ? new Date(ev.registrationDeadline).toISOString().slice(0,16) : '',
          eventStartDate: ev.eventStartDate ? new Date(ev.eventStartDate).toISOString().slice(0,16) : '',
          eventEndDate: ev.eventEndDate ? new Date(ev.eventEndDate).toISOString().slice(0,16) : '',
          registrationLimit: ev.registrationLimit || '',
          registrationFee: ev.registrationFee || '',
          maxTeamSize: ev.maxTeamSize || ''
        });

        if (ev.eventType === 'Normal' && ev.customForm) {
          setFormFields(ev.customForm.fields || []);
        }

        if (ev.eventType === 'Merchandise' && ev.merchandiseDetails) {
          setMerchandiseDetails({
            itemName: ev.merchandiseDetails.itemName || '',
            description: ev.merchandiseDetails.description || '',
            purchaseLimitPerParticipant: ev.merchandiseDetails.purchaseLimitPerParticipant || 1,
            variants: (ev.merchandiseDetails.variants || []).map(v => ({
              size: v.size || '',
              color: v.color || '',
              stockQuantity: v.stockQuantity || 0,
              price: v.price || 0
            }))
          });
        }
      } catch (error) {
        console.error('Failed to load event for edit:', error);
        toast.error('Failed to load event for editing');
      } finally {
        setLoading(false);
      }
    };

    loadIfEdit();
  }, [eventId]);

  const handleSubmit = async (e, saveAsDraft = true) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate dates
      const now = new Date();
      const regDeadline = new Date(eventData.registrationDeadline);
      const startDate = new Date(eventData.eventStartDate);
      const endDate = new Date(eventData.eventEndDate);

      if (regDeadline <= now) {
        toast.error('Registration deadline must be in the future');
        setLoading(false);
        return;
      }

      if (startDate <= regDeadline) {
        toast.error('Event start date must be after registration deadline');
        setLoading(false);
        return;
      }

      if (endDate < startDate) {
        toast.error('Event end date must be after start date');
        setLoading(false);
        return;
      }

      const payload = {
        ...eventData,
        eventTags: eventData.eventTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        registrationLimit: parseInt(eventData.registrationLimit),
        registrationFee: parseFloat(eventData.registrationFee) || 0,
        maxTeamSize: eventData.eventType === 'Hackathon' ? parseInt(eventData.maxTeamSize) : null
      };

      if (eventData.eventType === 'Normal') {
        payload.customForm = {
          fields: formFields
        };
      } else if (eventData.eventType === 'Merchandise') {
        if (merchandiseDetails.variants.length === 0) {
          toast.error('Please add at least one merchandise variant');
          setLoading(false);
          return;
        }
        payload.merchandiseDetails = merchandiseDetails;
      }

      let response;

      if (isEdit && eventId) {
        // Update existing event
        response = await eventAPI.updateEvent(eventId, payload);
        toast.success('Event updated successfully!');

        if (!saveAsDraft) {
          // Publish after update
          await eventAPI.publishEvent(eventId);
          toast.success('Event published!');
        }
      } else {
        // Create new event
        response = await eventAPI.createEvent(payload);
        toast.success('Event created successfully!');

        if (!saveAsDraft) {
          // Publish immediately
          await eventAPI.publishEvent(response.data.event._id);
          toast.success('Event published!');
        }
      }

      navigate('/organizer/dashboard');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create event';
      toast.error(message);
      console.error('Create event error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
          <p className="mt-2 text-gray-600">Fill in the details to create your event</p>
        </div>

        <form className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="eventName"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={eventData.eventName}
                  onChange={handleEventDataChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="eventDescription"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={eventData.eventDescription}
                  onChange={handleEventDataChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="eventType"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={eventData.eventType}
                    onChange={handleEventDataChange}
                  >
                    <option value="Normal">Normal Event</option>
                    <option value="Merchandise">Merchandise Event</option>
                    <option value="Hackathon">Hackathon (Team-based)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Eligibility <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="eligibility"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={eventData.eligibility}
                    onChange={handleEventDataChange}
                  >
                    <option value="All">Open to All</option>
                    <option value="IIIT Only">IIIT Students Only</option>
                    <option value="Non-IIIT Only">Non-IIIT Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="eventTags"
                  placeholder="workshop, tech, coding"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={eventData.eventTags}
                  onChange={handleEventDataChange}
                />
              </div>
            </div>
          </div>

          {/* Dates and Registration */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dates & Registration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="registrationDeadline"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={eventData.registrationDeadline}
                  onChange={handleEventDataChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="eventStartDate"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={eventData.eventStartDate}
                  onChange={handleEventDataChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="eventEndDate"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={eventData.eventEndDate}
                  onChange={handleEventDataChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Limit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="registrationLimit"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={eventData.registrationLimit}
                  onChange={handleEventDataChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Fee (₹)
                </label>
                <input
                  type="number"
                  name="registrationFee"
                  min="0"
                  step="0.01"
                  placeholder="0 for free events"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={eventData.registrationFee}
                  onChange={handleEventDataChange}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Form Builder for Normal Events */}
          {eventData.eventType === 'Normal' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Registration Form</h2>
              
              {/* Existing Fields */}
              {formFields.length > 0 && (
                <div className="space-y-3 mb-4">
                  {formFields.map((field, index) => (
                    <div key={field.fieldId} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <GripVertical className="w-5 h-5 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{field.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                              {field.fieldType}
                            </span>
                            {field.required && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                Required
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFormField(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {field.placeholder && (
                          <p className="text-sm text-gray-500">Placeholder: {field.placeholder}</p>
                        )}
                        {field.options && field.options.length > 0 && (
                          <p className="text-sm text-gray-500">Options: {field.options.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Field */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Add New Field</h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Type
                      </label>
                      <select
                        name="fieldType"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={newField.fieldType}
                        onChange={handleFieldChange}
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="number">Number</option>
                        <option value="textarea">Textarea</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="radio">Radio</option>
                        <option value="date">Date</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Label
                      </label>
                      <input
                        type="text"
                        name="label"
                        placeholder="e.g., Full Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={newField.label}
                        onChange={handleFieldChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placeholder (optional)
                    </label>
                    <input
                      type="text"
                      name="placeholder"
                      placeholder="e.g., Enter your full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      value={newField.placeholder}
                      onChange={handleFieldChange}
                    />
                  </div>

                  {(newField.fieldType === 'dropdown' || newField.fieldType === 'radio' || newField.fieldType === 'checkbox') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Options
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addOption}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          + Add Option
                        </button>
                        {newField.options.length > 0 && (
                          <div className="flex-1 flex flex-wrap gap-2">
                            {newField.options.map((option, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                {option}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="required"
                      id="required"
                      className="mr-2"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                    />
                    <label htmlFor="required" className="text-sm text-gray-700">
                      Required field
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={addFormField}
                    className="w-full px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Field
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Merchandise Details */}
          {eventData.eventType === 'Merchandise' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Merchandise Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="itemName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={merchandiseDetails.itemName}
                    onChange={handleMerchandiseChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={merchandiseDetails.description}
                    onChange={handleMerchandiseChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Limit Per Participant
                  </label>
                  <input
                    type="number"
                    name="purchaseLimitPerParticipant"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={merchandiseDetails.purchaseLimitPerParticipant}
                    onChange={handleMerchandiseChange}
                  />
                </div>

                {/* Existing Variants */}
                {merchandiseDetails.variants.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Variants</h3>
                    <div className="space-y-2">
                      {merchandiseDetails.variants.map((variant, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Size:</span> {variant.size}
                            </div>
                            <div>
                              <span className="text-gray-500">Color:</span> {variant.color}
                            </div>
                            <div>
                              <span className="text-gray-500">Stock:</span> {variant.stockQuantity}
                            </div>
                            <div>
                              <span className="text-gray-500">Price:</span> ₹{variant.price}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-red-600 hover:text-red-800 ml-4"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Variant */}
                <div className="border border-dashed border-gray-300 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Add New Variant</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                      <input
                        type="text"
                        name="size"
                        placeholder="S, M, L, XL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={newVariant.size}
                        onChange={handleVariantChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <input
                        type="text"
                        name="color"
                        placeholder="Red, Blue"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={newVariant.color}
                        onChange={handleVariantChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                      <input
                        type="number"
                        name="stockQuantity"
                        min="1"
                        placeholder="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={newVariant.stockQuantity}
                        onChange={handleVariantChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        name="price"
                        min="0"
                        step="0.01"
                        placeholder="299"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={newVariant.price}
                        onChange={handleVariantChange}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addVariant}
                    className="mt-3 w-full px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variant
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hackathon Details */}
          {eventData.eventType === 'Hackathon' && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-indigo-900 mb-4 font-mono">Hackathon Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-indigo-700 mb-2">
                    Required Team Size <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="maxTeamSize" // Your controller uses this to validate team formation
                    required
                    min="1"
                    placeholder="e.g., 4 members"
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    value={eventData.maxTeamSize || ''}
                    onChange={handleEventDataChange}
                  />
                  <p className="text-xs text-indigo-500 mt-2">
                    Registration will only complete when this many members join the team.
                  </p>
                </div>
                <div className="flex items-center mt-6">
                  <div className="bg-white p-3 rounded border border-indigo-200 text-xs text-indigo-600">
                    <strong>Note:</strong> Team chat will be automatically provisioned for all confirmed teams.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={(e) => handleSubmit(e, true)}
              className="flex-1 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Save as Draft'}
            </button>
            <button
              type="submit"
              onClick={(e) => handleSubmit(e, false)}
              className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create & Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;