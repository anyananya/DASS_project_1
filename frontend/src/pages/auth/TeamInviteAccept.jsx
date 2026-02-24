import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TeamInviteAccept = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accept = async () => {
      // If user not loaded, redirect to login and preserve next param so they return here after login
      if (!user) {
        toast('Please login as participant to accept the invite');
        navigate(`/login?next=/team/invite/${code}`);
        return;
      }

      try {
        const res = await teamAPI.acceptInvite(code);
        toast.success('Invite accepted');
        navigate(`/organizer/team/${res.data.team._id}`);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to accept invite');
        navigate('/');
      } finally { setLoading(false); }
    };
    accept();
  }, [code, user]);

  return <div className="p-6">{loading ? 'Processing invite...' : 'Done'}</div>;
};

export default TeamInviteAccept;
