import { format } from "date-fns";
import StatusBadge from "./StatusBadge"; // Update this path if needed

export default function EventOrderTable({ eventOrders }) {
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
          </tr>
        </thead>
        <tbody>
          {eventOrders.map((order, i) => (
            <tr
              key={order.id}
              className={i % 2 === 0 ? "bg-yellow-50" : "bg-white"}
            >
              <td className="px-4 py-2">
                {order.booking_date
                  ? format(new Date(order.booking_date), "dd MMM yyyy")
                  : order.created_at
                  ? format(new Date(order.created_at), "dd MMM yyyy")
                  : ""}
              </td>
              <td className="px-4 py-2">
                {order.event_date
                  ? format(new Date(order.event_date), "dd MMM yyyy")
                  : ""}
              </td>
              <td className="px-4 py-2">{order.event_time || ""}</td>
              <td className="px-4 py-2">{order.venue || ""}</td>
              <td className="px-4 py-2">{order.product || ""}</td>
              <td className="px-4 py-2">{order.quantity || ""}</td>
              <td className="px-4 py-2">{order.customer_name || ""}</td>
              <td className="px-4 py-2">{order.customer_phone || ""}</td>
              <td className="px-4 py-2">
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
