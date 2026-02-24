import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamAPI } from '../../services/api';
import toast from 'react-hot-toast'

const TeamDashboard = () => {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [invites, setInvites] = useState([]);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    fetchTeam();
  }, [id]);

  const fetchTeam = async () => {
    try {
      const res = await teamAPI.getTeam(id);
      setTeam(res.data.team);
      setInvites(res.data.invites || []);
    } catch (e) { toast.error('Failed to load team'); }
  };

  const handleInvite = async (e) => {
  e.preventDefault();
  try {
    // Requirement 1: Invite members via unique code/link
    await teamAPI.inviteMembers(id, [emailInput]);
    toast.success(`Invite sent to ${emailInput}`);
    setEmailInput('');
    fetchTeam(); // Refresh the list
  } catch (err) {
    toast.error('Failed to send invite');
  }
};

  if (!team) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Team: {team.teamName || team._id}</h2>
      <p>Status: <strong>{team.status}</strong></p>
      <p>Members ({team.members.length}/{team.size}):</p>
      <ul className="list-disc pl-6">
        {team.members.map(m => <li key={m._id}>{m.firstName} {m.lastName} — {m.email}</li>)}
      </ul>
      {team.status === 'Forming' && (
        <form onSubmit={handleInvite} className="mt-4 mb-6 flex gap-2">
            <input 
            type="email" 
            placeholder="Enter member email"
            className="border rounded px-3 py-2 flex-1"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
            Invite Member
            </button>
        </form>
        )}
      <h3 className="mt-4">Invites</h3>
      <ul className="list-disc pl-6">
        {invites.map(inv => <li key={inv._id}>{inv.invitedEmail} — {inv.status}</li>)}
      </ul>

      <div className="mt-6">
        <Link to={`/organizer/team/${id}/chat`} className="px-4 py-2 bg-indigo-600 text-white rounded">Open Team Chat</Link>
      </div>
    </div>
  );
};

export default TeamDashboard;
