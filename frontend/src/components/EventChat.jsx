import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { messagesAPI, messageModerationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function EventChat({ eventId }) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const fetchHistory = async () => {
      try {
        const res = await messagesAPI.getMessages(eventId);
        if (mounted) setMessages(res.data.messages || []);
      } catch (err) {
        console.error('Fetch messages failed', err);
      }
    };

    fetchHistory();

    // Connect socket
    const token = localStorage.getItem('token');
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { eventId });
    });

    socket.on('message:new', (msg) => {
      setMessages(prev => [...prev, msg]);
      // scroll to bottom
      setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
    });

    socket.on('message:deleted', ({ id }) => {
      setMessages(prev => prev.filter(m => m._id !== id));
    });

    socket.on('message:pinned', ({ id, pinned }) => {
      setMessages(prev => prev.map(m => m._id === id ? { ...m, pinned } : m));
    });

    socket.on('message:reaction', ({ id, reactions }) => {
      setMessages(prev => prev.map(m => m._id === id ? { ...m, reactions } : m));
    });

    socket.on('typing', ({ user: tUser, typing }) => {
      setTypingUsers(prev => {
        if (typing) {
          // add if not present
          if (!prev.find(u => u.id === tUser.id)) return [...prev, tUser];
          return prev;
        } else {
          return prev.filter(u => u.id !== tUser.id);
        }
      });
    });

    socket.on('notification', (n) => {
      toast(`${n.message}`);
    });

    socket.on('rate_limited', (d) => {
      toast.error(d?.message || 'You are sending messages too quickly');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error', err);
      toast.error('Realtime connection failed');
    });

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, [eventId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const payload = { eventId, body: input.trim(), parent: replyTo ? replyTo._id : undefined };
    // optimistic UI
    const temp = { _id: Date.now(), senderName: user?.firstName || user?.organizerName || 'You', body: input, createdAt: new Date(), parent: replyTo?._id };
    setMessages(prev => [...prev, temp]);
    setInput('');
    setReplyTo(null);
    try {
      socketRef.current.emit('message', payload);
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
    // focus input
    document.querySelector('input[placeholder="Write a message..."]')?.focus();
  };

  const handleDelete = async (id) => {
    try {
      await messageModerationAPI.deleteMessage(id);
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handlePin = async (id, pin) => {
    try {
      await messageModerationAPI.pinMessage(id, pin);
    } catch (err) {
      toast.error('Pin failed');
    }
  };

  const handleReact = (id, type) => {
    try {
      // emit via socket for instant broadcast
      socketRef.current.emit('message:reaction', { id, eventId, type });
    } catch (err) {
      toast.error('Reaction failed');
    }
  };

  // Typing indicator handling
  const handleInputChange = (e) => {
    setInput(e.target.value);
    try {
      socketRef.current.emit('typing:start', { eventId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        try { socketRef.current.emit('typing:stop', { eventId }); } catch (e) {}
      }, 2000);
    } catch (e) {}
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-medium mb-3">Discussion</h3>
      <div className="max-h-80 overflow-y-auto p-2 space-y-3" style={{background:'#f9fafb'}}>
        {/** Render top-level messages and their replies */}
        {messages.filter(m => !m.parent).map((m) => (
          <div key={m._id} className="space-y-2">
            <div className="p-2 bg-white rounded shadow-sm">
              <div className="flex justify-between items-start">
                <div className="text-sm text-gray-700"><strong>{m.senderName}</strong> <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span></div>
                <div className="flex items-center gap-2">
                  {m.pinned && <span className="text-yellow-600 text-sm">📌</span>}
                  {role === 'organizer' || role === 'admin' ? (
                    <>
                      <button onClick={() => handlePin(m._id, !m.pinned)} className="text-xs px-2 py-1 bg-gray-100 rounded">{m.pinned ? 'Unpin' : 'Pin'}</button>
                      <button onClick={() => handleDelete(m._id)} className="text-xs px-2 py-1 bg-red-100 rounded">Delete</button>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 text-gray-800">{m.body}</div>

              <div className="mt-2 flex items-center gap-3 text-sm">
                <button onClick={() => handleReply(m)} className="text-indigo-600">Reply</button>
                <button onClick={() => handleReact(m._id, 'like')} className="text-gray-600">👍 {m.reactions ? m.reactions.filter(r=>r.type==='like').length : 0}</button>
              </div>
            </div>

            {/* Replies */}
            <div className="pl-6">
              {messages.filter(r => r.parent === m._id).map(reply => (
                <div key={reply._id} className="p-2 bg-white rounded shadow-sm mt-2">
                  <div className="text-sm text-gray-700"><strong>{reply.senderName}</strong> <span className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleString()}</span></div>
                  <div className="mt-1 text-gray-800">{reply.body}</div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <button onClick={() => handleReply(reply)} className="text-indigo-600">Reply</button>
                    <button onClick={() => handleReact(reply._id, 'like')} className="text-gray-600">👍 {reply.reactions ? reply.reactions.filter(r=>r.type==='like').length : 0}</button>
                    {role === 'organizer' || role === 'admin' ? (
                      <button onClick={() => handleDelete(reply._id)} className="text-xs px-2 py-1 bg-red-100 rounded">Delete</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div ref={listRef} />

        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-500">{typingUsers.map(u => u.name || u.email).join(', ')} is typing...</div>
        )}
      </div>

      <div className="mt-3">
        {replyTo && (
          <div className="mb-2 text-sm bg-gray-100 p-2 rounded flex items-center justify-between">
            <div>Replying to <strong>{replyTo.senderName}</strong>: <span className="text-gray-700">{replyTo.body.slice(0,80)}{replyTo.body.length>80?'...':''}</span></div>
            <button onClick={() => setReplyTo(null)} className="text-sm text-red-600">Cancel</button>
          </div>
        )}

        <div className="flex gap-2">
          <input value={input} onChange={handleInputChange} placeholder="Write a message..." className="flex-1 px-3 py-2 border rounded" />
          <button onClick={sendMessage} className="px-4 py-2 bg-indigo-600 text-white rounded">Send</button>
        </div>
      </div>
    </div>
  );
}
