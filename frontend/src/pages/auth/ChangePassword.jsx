import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ChangePassword = () => {
  const { user, logout, setForceChangeRequired } = useAuth();
  const [form, setForm] = useState({ email: '', oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email) setForm(f => ({ ...f, email: user.email }));
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setLoading(true);
    try {
      const payload = { email: form.email, oldPassword: form.oldPassword, newPassword: form.newPassword };
      const res = await authAPI.changePassword(payload);
      if (res.data?.success) {
        toast.success('Password changed successfully');
        // update local state and remove force flag
        setForceChangeRequired(false);
        // update token
        const token = res.data.token;
        if (token) localStorage.setItem('token', token);
        // redirect to organizer dashboard
        navigate('/organizer/dashboard');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to change password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
        <h2 className="text-center text-2xl font-bold">Change Password</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" value={form.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Temporary / Old Password</label>
            <input name="oldPassword" type="password" value={form.oldPassword} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input name="newPassword" type="password" value={form.newPassword} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md disabled:opacity-50">
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
