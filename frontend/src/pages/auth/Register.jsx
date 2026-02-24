import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { organizersAPI } from '../../services/api';

const INTERESTS = [
  'Technology', 'Music', 'Sports', 'Art & Design', 'Science',
  'Gaming', 'Literature', 'Dance', 'Photography', 'Entrepreneurship',
  'Finance', 'Film & Media', 'Robotics', 'AI & ML', 'Cybersecurity'
];

const Register = () => {
  const [step, setStep] = useState(1); // Step 1: Details, Step 2: Onboarding
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    participantType: 'Non-IIIT', collegeName: '', contactNumber: '',
    areasOfInterest: [], followedClubs: []
  });
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      areasOfInterest: prev.areasOfInterest.includes(interest)
        ? prev.areasOfInterest.filter(i => i !== interest)
        : [...prev.areasOfInterest, interest]
    }));
  };

  const toggleClub = (id) => {
    setFormData(prev => ({
      ...prev,
      followedClubs: prev.followedClubs.includes(id)
        ? prev.followedClubs.filter(c => c !== id)
        : [...prev.followedClubs, id]
    }));
  };

  // Step 1 submit — validate then move to step 2 and fetch clubs
  const handleStep1 = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await organizersAPI.list();
      setOrganizers(res.data.organizers || []);
    } catch (_) {
      setOrganizers([]);
    } finally {
      setLoading(false);
    }
    setStep(2);
  };

  // Step 2 submit — register with full data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white p-10 rounded-xl shadow-2xl">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step === s ? 'bg-indigo-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-sm font-medium ${step === s ? 'text-indigo-600' : 'text-gray-400'}`}>
                {s === 1 ? 'Your Details' : 'Preferences'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="text-center text-2xl font-extrabold text-gray-900 mb-6">Create your account</h2>
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input name="firstName" type="text" required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="John" value={formData.firstName} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input name="lastName" type="text" required
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Doe" value={formData.lastName} onChange={handleChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Participant Type</label>
                <select name="participantType"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.participantType} onChange={handleChange}>
                  <option value="IIIT">IIIT Student</option>
                  <option value="Non-IIIT">Non-IIIT Participant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                  {formData.participantType === 'IIIT' && (
                    <span className="text-xs text-gray-500 ml-2">(must be @iiit.ac.in or @students.iiit.ac.in)</span>
                  )}
                </label>
                <input name="email" type="email" required
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="john@example.com" value={formData.email} onChange={handleChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input name="password" type="password" required
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••" value={formData.password} onChange={handleChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">College / Organization</label>
                <input name="collegeName" type="text" required
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="IIIT Hyderabad" value={formData.collegeName} onChange={handleChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                <input name="contactNumber" type="tel" required
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+91 1234567890" value={formData.contactNumber} onChange={handleChange} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Loading...' : 'Next →'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">Sign in</Link>
              </p>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-center text-2xl font-extrabold text-gray-900 mb-2">Set your preferences</h2>
            <p className="text-center text-sm text-gray-500 mb-6">Personalise your event feed. You can change these later in your profile.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Areas of Interest */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Areas of Interest <span className="font-normal text-gray-400">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(interest => (
                    <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors
                        ${formData.areasOfInterest.includes(interest)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clubs to Follow */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Clubs / Organizers to Follow <span className="font-normal text-gray-400">(optional)</span>
                </label>
                {organizers.length === 0 ? (
                  <p className="text-sm text-gray-400">No clubs available yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {organizers.map(org => (
                      <label key={org._id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                          ${formData.followedClubs.includes(org._id)
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300'}`}>
                        <input type="checkbox" className="accent-indigo-600"
                          checked={formData.followedClubs.includes(org._id)}
                          onChange={() => toggleClub(org._id)} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{org.organizerName}</p>
                          <p className="text-xs text-gray-500">{org.category}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>

              <button type="button" onClick={handleSubmit}
                className="w-full text-sm text-gray-400 hover:text-gray-600 underline">
                Skip and set up later
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;