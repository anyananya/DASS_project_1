import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, RotateCcw, AlertCircle, Copy, CheckCircle2, KeyRound, Clock, Check, X } from 'lucide-react';
import axios from '../../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  // Tab switching driven by navbar ?tab= param
  const location = useLocation();
  const tabParam = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'organizers');
  useEffect(() => { if (tabParam) setActiveTab(tabParam); }, [tabParam]);

  // Organizers
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Password reset requests
  const [resetRequests, setResetRequests] = useState([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [commentMap, setCommentMap] = useState({});

  useEffect(() => {
    if (activeTab === 'password-resets') fetchResetRequests();
  }, [activeTab]);

  const fetchResetRequests = async () => {
    setResetLoading(true);
    try {
      const res = await axios.get('/admin/password-reset-requests');
      setResetRequests(res.data.requests);
    } catch { toast.error('Failed to fetch reset requests'); }
    finally { setResetLoading(false); }
  };

  const handleApprove = async (id) => {
    try {
      await axios.patch(`/admin/password-reset-requests/${id}/approve`, { comment: commentMap[id] || '' });
      toast.success('Approved — temp password emailed to organizer');
      fetchResetRequests();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
  };

  const handleReject = async (id) => {
    if (!commentMap[id]?.trim()) { toast.error('Add a comment before rejecting'); return; }
    try {
      await axios.patch(`/admin/password-reset-requests/${id}/reject`, { comment: commentMap[id] });
      toast.success('Request rejected');
      fetchResetRequests();
    } catch { toast.error('Failed to reject'); }
  };

  // UI Section for the Password Resets Tab
    {activeTab === 'password-resets' && (
    <div className="space-y-4">
        {resetRequests.map(req => (
        <div key={req._id} className="bg-white rounded-lg shadow p-5 border-l-4 border-yellow-500">
            <div className="flex justify-between items-start">
            <div>
                <h3 className="font-bold text-gray-900">{req.organizerName}</h3>
                <p className="text-sm text-gray-500">Requested: {new Date(req.createdAt).toLocaleString()}</p>
                <div className="mt-2 bg-gray-50 p-3 rounded text-sm italic">"{req.reason}"</div>
            </div>
            {req.status === 'Pending' && (
                <div className="flex flex-col gap-2 w-64">
                <textarea 
                    placeholder="Admin comment..."
                    className="text-xs p-2 border rounded"
                    value={commentMap[req._id] || ''}
                    onChange={(e) => setCommentMap({...commentMap, [req._id]: e.target.value})}
                />
                <div className="flex gap-2">
                    <button onClick={() => handleApprove(req._id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm flex-1">Approve</button>
                    <button onClick={() => handleReject(req._id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm flex-1">Reject</button>
                </div>
                </div>
            )}
            </div>
        </div>
        ))}
    </div>
    )}

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    organizerName: '',
    email: '',
    category: '',
    description: '',
    contactEmail: '',
    contactNumber: ''
  });
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/admin/organizers');
      setOrganizers(response.data.organizers);
    } catch (error) {
      toast.error('Failed to fetch organizers');
      console.error('Fetch organizers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateOrganizer = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/admin/organizers', formData);
      
      toast.success('Organizer created successfully!');
      setCreatedCredentials(response.data.credentials);
      
      // Reset form
      setFormData({
        organizerName: '',
        email: '',
        category: '',
        description: '',
        contactEmail: '',
        contactNumber: ''
      });

      // Refresh list
      fetchOrganizers();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create organizer';
      toast.error(message);
      console.error('Create organizer error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableOrganizer = async (id, name) => {
    if (!confirm(`Are you sure you want to disable ${name}?`)) return;

    try {
      await axios.delete(`/admin/organizers/${id}`);
      toast.success('Organizer disabled successfully');
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to disable organizer');
      console.error('Disable organizer error:', error);
    }
  };

  const handleReactivateOrganizer = async (id, name) => {
    try {
      await axios.put(`/admin/organizers/${id}/reactivate`);
      toast.success(`${name} reactivated successfully`);
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to reactivate organizer');
      console.error('Reactivate organizer error:', error);
    }
  };

  const handlePermanentDelete = async (id, name) => {
    if (!confirm(`⚠️ WARNING: This will PERMANENTLY delete ${name}. This action cannot be undone! Are you absolutely sure?`)) return;

    try {
      await axios.delete(`/admin/organizers/${id}/permanent`);
      toast.success('Organizer permanently deleted');
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to delete organizer');
      console.error('Delete organizer error:', error);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setCreatedCredentials(null);
    setFormData({
      organizerName: '',
      email: '',
      category: '',
      description: '',
      contactEmail: '',
      contactNumber: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage clubs and organizers for Felicity</p>
          </div>
          {activeTab === 'organizers' && (
            <button
              onClick={() => { setShowCreateModal(true); setCreatedCredentials(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md hover:shadow-lg transition-shadow"
            >
              <Plus className="w-5 h-5" />
              Add Organizer
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex gap-8">
            {[
              { id: 'organizers', label: 'Manage Clubs / Organizers' },
              { id: 'password-resets', label: 'Password Reset Requests' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {tab.id === 'password-resets' && resetRequests.filter(r => r.status === 'Pending').length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {resetRequests.filter(r => r.status === 'Pending').length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Password Reset Requests Tab */}
        {activeTab === 'password-resets' && (
          <div>
            {resetLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
              </div>
            ) : resetRequests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow-md">
                <KeyRound className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg">No password reset requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resetRequests.map(req => (
                  <div key={req._id} className="bg-white rounded-lg shadow-md p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900">{req.organizerName || req.organizer?.organizerName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            req.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            req.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>{req.status}</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{req.organizer?.email}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                          <Clock className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleString()}
                        </div>
                        <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
                          <span className="font-medium">Reason: </span>{req.reason}
                        </div>
                        {req.adminComment && (
                          <div className="mt-2 bg-blue-50 rounded p-3 text-sm text-blue-700">
                            <span className="font-medium">Admin comment: </span>{req.adminComment}
                          </div>
                        )}
                      </div>
                      {req.status === 'Pending' && (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea rows={2} placeholder="Comment (required to reject)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                            value={commentMap[req._id] || ''}
                            onChange={e => setCommentMap(prev => ({ ...prev, [req._id]: e.target.value }))} />
                          <button onClick={() => handleApprove(req._id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => handleReject(req._id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manage Organizers Tab */}
        {activeTab === 'organizers' && (<>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Organizers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{organizers.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Organizers</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {organizers.filter(o => o.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disabled Organizers</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {organizers.filter(o => !o.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Organizers Table */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Organizers</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : organizers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏢</div>
              <p className="text-gray-500 text-lg">No organizers yet</p>
              <p className="text-gray-400 mt-2">Click "Add Organizer" to create the first one</p>
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
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {organizers.map((organizer) => (
                    <tr key={organizer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {organizer.organizerName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{organizer.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          {organizer.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {organizer.contactNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            organizer.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {organizer.isActive ? '✓ Active' : '✕ Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3">
                          {organizer.isActive ? (
                            <button
                              onClick={() => handleDisableOrganizer(organizer._id, organizer.organizerName)}
                              className="text-yellow-600 hover:text-yellow-900 transition-colors"
                              title="Disable Organizer"
                            >
                              <AlertCircle className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateOrganizer(organizer._id, organizer.organizerName)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="Reactivate Organizer"
                            >
                              <RotateCcw className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePermanentDelete(organizer._id, organizer.organizerName)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Organizer Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Create New Organizer
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {createdCredentials && (
                  <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 mb-2">
                          ✓ Organizer Created Successfully!
                        </h3>
                        <p className="text-sm text-green-700 mb-3">
                          Credentials have been sent to the organizer's email. Please save or share these credentials:
                        </p>
                        <div className="bg-white rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Login Email</p>
                              <p className="font-mono text-sm font-semibold">{createdCredentials.email}</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(createdCredentials.email, 'Email')}
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title="Copy email"
                            >
                              {copiedField === 'Email' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Temporary Password</p>
                              <p className="font-mono text-sm font-semibold">{createdCredentials.tempPassword}</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(createdCredentials.tempPassword, 'Password')}
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title="Copy password"
                            >
                              {copiedField === 'Password' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 mt-3">
                          ⚠️ Make sure to save these credentials before closing this dialog!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateOrganizer} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organizer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="organizerName"
                      required
                      placeholder="E.g., Programming Club, Cultural Committee"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.organizerName}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Login Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="organizer@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be used for login. A temporary password will be generated.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="category"
                      required
                      placeholder="E.g., Technical Club, Cultural Club, Sports Committee"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.category}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Brief description about the organizer..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.description}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      placeholder="public.contact@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.contactEmail}
                      onChange={handleChange}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Public contact email for participants
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      name="contactNumber"
                      placeholder="+91 1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.contactNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Creating...' : 'Create Organizer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </>)}
      </div>
    </div>
  );
};

export default AdminDashboard;