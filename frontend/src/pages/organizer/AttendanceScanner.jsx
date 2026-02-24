import { useState, useEffect, useRef } from 'react';
import { registrationAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AttendanceScanner() {
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [QrReaderComp, setQrReaderComp] = useState(null);
  const lastScanRef = useRef(0);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!ticketId) {
      toast.error('Please enter a ticket ID or scan a QR');
      return;
    }

    try {
      setLoading(true);
      const res = await registrationAPI.scanTicket({ ticketId });
      setResult(res.data.registration);
      toast.success(res.data.message || 'Attendance marked');
    } catch (error) {
      const msg = error.response?.data?.message || 'Scan failed';
      toast.error(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Attempt dynamic import of react-qr-reader for camera scanning
  useEffect(() => {
    let mounted = true;
    import('react-qr-reader')
      .then((mod) => {
        if (!mounted) return;
        const Comp = mod?.default || mod?.QrReader || mod?.QrReaderAsync;
        if (Comp) setQrReaderComp(() => Comp);
      })
      .catch(() => {
        // Not installed - user will be prompted to install when toggling camera
      });
    return () => { mounted = false; };
  }, []);

  const handleQrResult = async (raw) => {
    const now = Date.now();
    if (now - lastScanRef.current < 1500) return; // debounce repeated frames
    lastScanRef.current = now;

    let payload = raw;
    // If QR contains JSON payload, try parse
    try {
      const parsed = JSON.parse(raw);
      // If it's our QR object with ticketId, extract
      if (parsed.ticketId) payload = parsed.ticketId;
    } catch (e) {
      // not JSON, use raw text
    }

    // call scan API
    try {
      setLoading(true);
      const res = await registrationAPI.scanTicket({ ticketId: payload, method: 'camera' });
      setResult(res.data.registration);
      toast.success(res.data.message || 'Attendance marked');
    } catch (error) {
      const msg = error.response?.data?.message || 'Scan failed';
      toast.error(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Attendance Scanner</h2>

      <form onSubmit={handleScan} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Ticket ID or QR payload</label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Enter ticket ID (e.g., TKT-...)"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            {loading ? 'Scanning...' : 'Mark Attendance'}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <button
          onClick={() => setCameraActive(v => !v)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md"
        >
          {cameraActive ? 'Stop Camera' : 'Open Camera Scanner'}
        </button>

        {!QrReaderComp && cameraActive && (
          <div className="mt-4 text-sm text-yellow-700">
            Camera scanner is not installed. Run in frontend folder:
            <pre className="bg-gray-100 p-2 mt-2">npm install react-qr-reader</pre>
          </div>
        )}

        {QrReaderComp && cameraActive && (
          <div className="mt-4">
            <QrReaderComp
              constraints={{ facingMode: 'environment' }}
              onResult={(result, error) => {
                if (!!result) {
                  const text = result?.text || (typeof result === 'string' ? result : null);
                  if (text) handleQrResult(text);
                }
              }}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {result && (
        <div className="mt-6 p-4 border rounded-md bg-white">
          <h3 className="text-lg font-medium">Scan Result</h3>
          <p><strong>Participant:</strong> {result.participant?.firstName} {result.participant?.lastName}</p>
          <p><strong>Ticket ID:</strong> {result.ticketId}</p>
          <p><strong>Event:</strong> {result.event?.eventName}</p>
          <p><strong>Marked at:</strong> {new Date(result.attendanceMarkedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
