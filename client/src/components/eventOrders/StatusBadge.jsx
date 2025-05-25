import React from "react";
import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ status }) {
  const statusStyles = {
    pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    confirmed: "bg-green-100 text-green-800 hover:bg-green-200",
    completed: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    cancelled: "bg-red-100 text-red-800 hover:bg-red-200",
  };

  const style = statusStyles[status] || statusStyles.pending;

  return (
    <Badge className={style} variant="outline">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
