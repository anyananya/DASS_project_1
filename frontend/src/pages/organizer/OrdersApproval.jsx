import { useEffect, useState } from 'react';
import { orderAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function OrdersApproval() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderAPI.getPendingOrders();
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleApprove = async (id) => {
    try {
      await orderAPI.approveOrder(id);
      toast.success('Order approved');
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || 'Approve failed';
      toast.error(msg);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await orderAPI.rejectOrder(id, reason);
      toast.success('Order rejected');
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || 'Reject failed';
      toast.error(msg);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Pending Merchandise Orders</h2>
      {loading && <p>Loading...</p>}
      {!loading && orders.length === 0 && <p>No pending orders.</p>}

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order._id} className="p-4 border rounded-md bg-white">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-medium">{order.event?.eventName}</h3>
                <p><strong>Participant:</strong> {order.participant?.firstName} {order.participant?.lastName} ({order.participant?.email})</p>
                <p><strong>Variant:</strong> {order.merchandiseOrder?.variant?.size} / {order.merchandiseOrder?.variant?.color}</p>
                <p><strong>Quantity:</strong> {order.merchandiseOrder?.quantity}</p>
                <p><strong>Amount:</strong> ₹{order.merchandiseOrder?.totalAmount}</p>
                <p><strong>Placed:</strong> {new Date(order.registeredAt).toLocaleString()}</p>
              </div>

              <div className="flex flex-col items-end space-y-2">
                {order.paymentProofUrl && (
                  <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">View Payment Proof</a>
                )}
                <div>
                  <button onClick={() => handleApprove(order._id)} className="mr-2 px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                  <button onClick={() => handleReject(order._id)} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
