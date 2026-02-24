import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teamAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CreateTeam = () => {
  const [teamName, setTeamName] = useState('');
  const [size, setSize] = useState(2);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id: eventId } = useParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!eventId) {
        toast.error('Missing event id');
        return;
      }
      const res = await teamAPI.createTeam(eventId, { teamName, size });
      toast.success('Team created');
      navigate(`/organizer/team/${res.data.team._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create team');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Create Team for Event</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium">Team Name</label>
          <input value={teamName} onChange={e=>setTeamName(e.target.value)} className="mt-1 block w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium">Team Size</label>
          <input type="number" min={1} value={size} onChange={e=>setSize(Number(e.target.value))} className="mt-1 block w-24" />
        </div>
        <div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading? 'Creating...':'Create Team'}</button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeam;
