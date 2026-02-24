import { useEffect, useState } from 'react';
import { eventAPI, attendanceAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AttendanceLogs() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await eventAPI.getMyEvents();
        setEvents(res.data.events || []);
      } catch (error) {
        console.error('Failed to load events:', error);
        toast.error('Failed to load your events');
      }
    };
    load();
  }, []);

  const fetchLogs = async (eventId) => {
    setLoading(true);
    try {
      const res = await attendanceAPI.getLogs(eventId);
      setLogs(res.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to fetch attendance logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedEvent(id);
    if (id) fetchLogs(id);
    else setLogs([]);
  };

  const handleExport = async () => {
    if (!selectedEvent) return toast.error('Select an event first');
    try {
      const res = await attendanceAPI.exportCSV(selectedEvent);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${selectedEvent}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Attendance Logs</h2>
        <div>
          <button onClick={handleExport} className="px-3 py-2 bg-indigo-600 text-white rounded-md">Export CSV</button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Select Event</label>
        <select value={selectedEvent} onChange={handleSelect} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
          <option value="">-- Select an event --</option>
          {events.map(ev => (
            <option key={ev._id} value={ev._id}>{ev.eventName} ({ev.eventType})</option>
          ))}
        </select>
      </div>

      {loading && <p>Loading logs...</p>}

      {!loading && logs.length === 0 && selectedEvent && <p>No logs for this event.</p>}

      {!loading && logs.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-md border p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-2">Participant</th>
                <th className="p-2">Email</th>
                <th className="p-2">Scanned By</th>
                <th className="p-2">Method</th>
                <th className="p-2">Duplicate</th>
                <th className="p-2">IP</th>
                <th className="p-2">Scanned At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l._id} className="border-t">
                  <td className="p-2">{l.participant?.firstName} {l.participant?.lastName}</td>
                  <td className="p-2">{l.participant?.email}</td>
                  <td className="p-2">{l.scannedBy?.organizerName || l.scannedBy?.email || l.scannedByModel}</td>
                  <td className="p-2">{l.method}</td>
                  <td className="p-2">{l.duplicate ? 'Yes' : 'No'}</td>
                  <td className="p-2">{l.ip}</td>
                  <td className="p-2">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
