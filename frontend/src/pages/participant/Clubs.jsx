import { useEffect, useState } from 'react';
import { organizersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchClubs(); }, []);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const res = await organizersAPI.list();
      setClubs(res.data.organizers || []);
    } catch (err) {
      console.error('Fetch clubs error', err);
      toast.error('Failed to fetch clubs');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-4">Clubs & Organizers</h1>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clubs.map(c => (
              <div key={c._id} className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold">{c.organizerName}</h3>
                <p className="text-sm text-gray-600">{c.category}</p>
                <p className="mt-2 text-sm text-gray-700">{c.description}</p>
                <div className="mt-4 flex gap-2">
                  <Link to={`/organizers/${c._id}`} className="px-3 py-1 bg-indigo-600 text-white rounded">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clubs;

