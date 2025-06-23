import {useState, useEffect } from "react";

export default function StatusModal({ open, onClose, order, onSubmit }) {
  const [newStatus, setNewStatus] = useState(order?.status || "pending");
  const [newPaymentStatus, setNewPaymentStatus] = useState(order?.payment_status || "unpaid");
  const [comment, setComment] = useState(order?.event_comment || "");

  // Reset state when order changes or modal opens
  useEffect(() => {
    setNewStatus(order?.status || "pending");
    setNewPaymentStatus(order?.payment_status || "unpaid");
    setComment(order?.event_comment || "");
  }, [order, open]);

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow max-w-md w-full">
        <h2 className="font-semibold mb-2">Update Status</h2>

        {/* Status */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Status:</label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Payment Status */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Payment Status:</label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={newPaymentStatus}
            onChange={e => setNewPaymentStatus(e.target.value)}
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Comment (optional):</label>
          <textarea
            className="border rounded w-full p-2"
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-1 rounded bg-gray-200"
            onClick={onClose}
            type="button"
          >Cancel</button>
          <button
            className="px-4 py-1 rounded bg-chai-gold text-white"
            onClick={() => {
              onSubmit(order.id, newStatus, comment, newPaymentStatus);
              onClose();
            }}
            type="button"
          >Save</button>
        </div>
      </div>
    </div>
  );
}
