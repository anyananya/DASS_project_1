import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI, organizersAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import api from '../services/api';

const Profile = () => {
  const { user, role, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Initialize form based on role
    if (role === 'participant') {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        contactNumber: user.contactNumber || '',
        collegeName: user.collegeName || '',
        areasOfInterest: user.areasOfInterest || [],
        followedClubs: user.followedClubs || []
      });
    } else if (role === 'organizer') {
      setForm({
        organizerName: user.organizerName || '',
        category: user.category || '',
        description: user.description || '',
        contactEmail: user.contactEmail || '',
        contactNumber: user.contactNumber || '',
        discordWebhook: user.discordWebhook || ''
      });
    }
  }, [user, role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

 const handleRequestReset = async () => {
  const reasonText = window.prompt("Reason for reset:");
  if (!reasonText) return; 

  try {
    // Use the 'api' instance which already knows your BASE_URL and TOKEN
    await api.post('/organizers/request-reset', { 
      reason: reasonText.trim() 
    });
    toast.success("Request sent to Admin!");
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to send request");
  }
};
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (role === 'participant') {
        const res = await profileAPI.updateParticipant(form);
        toast.success('Profile updated');
        setUser(res.data.participant || user);
      } else if (role === 'organizer') {
        await organizersAPI.update(user.id || user._id, form);
        toast.success('Organizer profile updated');
      }
    } catch (err) {
      console.error('Profile update error', err);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const [webhookStatus, setWebhookStatus] = useState(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const handleTestWebhook = async () => {
    if (!form.discordWebhook) {
      toast.error('Please provide a Discord webhook URL first');
      return;
    }
    setTestingWebhook(true);
    try {
      const id = user.id || user._id;
      await organizersAPI.testWebhook(id);
      setWebhookStatus('success');
      toast.success('Test message sent to Discord');
    } catch (err) {
      setWebhookStatus('failed');
      toast.error('Failed to send test message');
    } finally {
      setTestingWebhook(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {role === 'participant' ? (
              <>
                {/* Requirement 9.6: Non-Editable Fields */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Email Address (Read-Only)</label>
                    <input value={user.email || ''} disabled className="w-full mt-1 bg-transparent text-gray-600 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Participant Type (Read-Only)</label>
                    <input value={user.participantType || ''} disabled className="w-full mt-1 bg-transparent text-gray-600 cursor-not-allowed" />
                  </div>
                </div>

                {/* Requirement 9.6: Editable Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input name="firstName" value={form.firstName || ''} onChange={handleChange} className="w-full border px-3 py-2 rounded mt-1 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input name="lastName" value={form.lastName || ''} onChange={handleChange} className="w-full border px-3 py-2 rounded mt-1 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                  <input name="contactNumber" value={form.contactNumber || ''} onChange={handleChange} className="w-full border px-3 py-2 rounded mt-1 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">College / Organization</label>
                  <input name="collegeName" value={form.collegeName || ''} onChange={handleChange} className="w-full border px-3 py-2 rounded mt-1 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </>
            ) : (
              <>
                {/* Organizer Specific Fields (Requirement 10.5) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Organizer Name</label>
                  <input name="organizerName" value={form.organizerName || ''} onChange={handleChange} className="w-full border px-3 py-2 rounded mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input name="category" value={form.category || ''} onChange={handleChange} className="w-full border px-3 py-2 rounded mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <input name="contactEmail" value={form.contactEmail || ''} onChange={handleChange} className="w-full border px-3 py-2 rounded mt-1" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" value={form.description || ''} onChange={handleChange} rows="3" className="w-full border px-3 py-2 rounded mt-1" />
                </div>
                <div className="md:col-span-2 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700">Discord Webhook (Requirement 10.5)</label>
                  <input name="discordWebhook" value={form.discordWebhook || ''} onChange={handleChange} className="w-full border px-3 py-2 rounded mt-1" placeholder="https://discord.com/api/webhooks/..." />
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" onClick={handleTestWebhook} disabled={testingWebhook} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition">
                      {testingWebhook ? 'Testing...' : 'Test Discord Webhook'}
                    </button>
                    {webhookStatus === 'success' && <span className="text-xs text-green-600 font-medium">✓ Connection successful</span>}
                    {webhookStatus === 'failed' && <span className="text-xs text-red-600 font-medium">✗ Connection failed</span>}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t">
            {/* Requirement 9.6: Security Settings Section */}
            <div>
            <button 
            type="button" 
            onClick={handleRequestReset} 
            className="text-sm text-indigo-600 hover:underline font-medium"
            >
            {user.role === 'organizer' ? 'Request Password Reset from Admin' : 'Change Password'}
            </button>
            </div>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 transition">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;