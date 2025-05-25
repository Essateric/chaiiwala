// client/src/components/eventOrders/StatusBadge.jsx
import React from "react";
import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ status }) {
  const statusStyles = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <Badge className={statusStyles[status] || statusStyles.pending}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending"}
    </Badge>
  );
}
