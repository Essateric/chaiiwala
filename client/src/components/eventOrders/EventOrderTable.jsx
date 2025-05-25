// client/src/components/eventOrders/EventOrderTable.jsx
import React from "react";
import StatusBadge from "./StatusBadge";

export default function EventOrderTable({ eventOrders }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Venue</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {eventOrders.map((order) => (
          <tr key={order.id}>
            <td>{order.date}</td>
            <td>{order.venue}</td>
            <td><StatusBadge status={order.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
