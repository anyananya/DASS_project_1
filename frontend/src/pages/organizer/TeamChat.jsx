import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { teamAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

let socket;

const TeamChat = () => {
  const { id } = useParams(); // team id
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [connected, setConnected] = useState(false);
  const listRef = useRef();

  const navigate = useNavigate();

  useEffect(() => {
    fetchMessages();
    // init socket only if token present
    const token = localStorage.getItem('token');
    if (!token) {
      toast('Please login to join team chat');
      navigate(`/login?next=/organizer/team/${id}/chat`);
      return;
    }

    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { auth: { token } });
    socket.on('connect', () => { setConnected(true); socket.emit('join:team', { teamId: id }); });
    socket.on('team:message:new', (m) => setMessages(prev => [...prev, m]));
    socket.on('disconnect', () => setConnected(false));
    return () => { socket.disconnect(); };
  }, [id]);

  const fetchMessages = async () => {
    try {
      // call messages API
      const msgs = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/team/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!msgs.ok) {
        const txt = await msgs.text();
        console.error('Failed fetching messages', txt);
        toast.error('Failed to load messages');
        return;
      }
      const json = await msgs.json();
      setMessages(json.messages || []);
    } catch (e) { console.error(e); toast.error('Failed to load messages'); }
  };

  const send = () => {
    if (!body.trim()) return;
    socket.emit('team:message', { teamId: id, body });
    setBody('');
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Team Chat</h2>
      <div className="border rounded p-4 h-96 overflow-auto" ref={listRef}>
        {messages.map(m => (
          <div key={m._id} className="mb-2">
            <strong>{m.senderName}</strong>: {m.body}
          </div>
        ))}
      </div>
      <div className="mt-4 flex">
        <input className="flex-1 border rounded px-3 py-2" value={body} onChange={e=>setBody(e.target.value)} />
        <button onClick={send} className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded">Send</button>
      </div>
    </div>
  );
};

export default TeamChat;
