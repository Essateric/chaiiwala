import { format } from "date-fns";
import StatusBadge from "./StatusBadge.jsx";
import PaymentStatusBadge from "./PaymentStatusBadge.jsx"; // NEW - see below

export default function EventOrderTable({
  eventOrders,
  profile,
  onOpenStatusModal, // (order) => void
}) {
  const canUpdateStatus = ["admin", "regional", "area", "store"].includes(profile?.permissions);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr className="bg-yellow-100">
            <th className="px-4 py-2 text-left font-semibold">Order Date</th>
            <th className="px-4 py-2 text-left font-semibold">Event Date</th>
            <th className="px-4 py-2 text-left font-semibold">Event Time</th>
            <th className="px-4 py-2 text-left font-semibold">Venue</th>
            <th className="px-4 py-2 text-left font-semibold">Product</th>
            <th className="px-4 py-2 text-left font-semibold">Quantity</th>
            <th className="px-4 py-2 text-left font-semibold">Customer Name</th>
            <th className="px-4 py-2 text-left font-semibold">Customer Phone</th>
            <th className="px-4 py-2 text-left font-semibold">Status</th>
            <th className="px-4 py-2 text-left font-semibold">Payment Status</th>
            <th className="px-4 py-2 text-left font-semibold">Comment</th>
            <th className="px-4 py-2 text-left font-semibold">Completed By</th>
            <th className="px-4 py-2 text-left font-semibold">Completed At</th>
          </tr>
        </thead>
        <tbody>
          {eventOrders.map((order, i) => (
            <tr key={order.id} className={i % 2 === 0 ? "bg-yellow-50" : "bg-white"}>
              <td className="px-4 py-2">
                {order.booking_date
                  ? format(new Date(order.booking_date), "dd MMM yyyy")
                  : order.created_at
                  ? format(new Date(order.created_at), "dd MMM yyyy")
                  : ""}
              </td>
              <td className="px-4 py-2">
                {order.event_date ? format(new Date(order.event_date), "dd MMM yyyy") : ""}
              </td>
              <td className="px-4 py-2">{order.event_time || ""}</td>
              <td className="px-4 py-2">{order.venue || ""}</td>
              <td className="px-4 py-2">{order.product || ""}</td>
              <td className="px-4 py-2">{order.quantity || ""}</td>
              <td className="px-4 py-2">{order.customer_name || ""}</td>
              <td className="px-4 py-2">{order.customer_phone || ""}</td>
              <td className="px-4 py-2">
                {canUpdateStatus && onOpenStatusModal ? (
                  <span
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    title="Click to update status"
                    onClick={() => onOpenStatusModal(order)}
                  >
                    <StatusBadge status={order.status} />
                  </span>
                ) : (
                  <StatusBadge status={order.status} />
                )}
              </td>
              <td className="px-4 py-2">
                <PaymentStatusBadge status={order.payment_status} />
              </td>
              <td className="px-4 py-2" style={{ maxWidth: 120, wordBreak: "break-word" }}>
                {order.event_comment ? order.event_comment : "-"}
              </td>
              <td className="px-4 py-2">{order.completed_by || "-"}</td>
              <td className="px-4 py-2">
                {order.completed_at ? format(new Date(order.completed_at), "dd MMM yyyy HH:mm") : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
