import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, Store } from "lucide-react";
import { format } from "date-fns";

export default function SupportTicketCard({ ticket }) {
  const [open, setOpen] = useState(false);

  if (!ticket) return null;

  const hasImage = ticket.screenshot_url && ticket.screenshot_url.trim() !== "";

  let displayDate = "Unknown date";
  try {
    displayDate = format(new Date(ticket.created_at), "d MMM yyyy, h:mmaaa");
  } catch {}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Card preview */}
      <DialogTrigger asChild>
        <div className="p-3 bg-white border rounded shadow cursor-pointer hover:shadow-md transition relative">
          {hasImage && (
            <img
              src={ticket.screenshot_url}
              alt="Screenshot"
              className="h-28 w-full object-cover rounded mb-2"
            />
          )}
          <h4 className="font-semibold truncate">{ticket.page || "Unknown Page"}</h4>
          <p className="text-sm text-gray-600 line-clamp-2">
            {ticket.error_message || "No error message"}
          </p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">
              {displayDate}
            </span>
            <Badge variant="outline" className="capitalize">
              {ticket.status || "todo"}
            </Badge>
          </div>
        </div>
      </DialogTrigger>

      {/* Expanded details in modal */}
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogTitle>
          {ticket.page || "Support Ticket"}
        </DialogTitle>
        <DialogDescription>
          Logged on {displayDate} by {ticket.user_name || "Unknown"} ({ticket.user_role || "N/A"})
        </DialogDescription>

        {/* Screenshot */}
        {hasImage && (
          <div className="my-4">
            <a
              href={ticket.screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Click to view full size"
            >
              <img
                src={ticket.screenshot_url}
                alt="Screenshot"
                className="w-full max-h-72 object-cover rounded hover:scale-105 transition-transform cursor-zoom-in"
              />
            </a>
          </div>
        )}

        {/* Error message */}
        <p className="text-sm whitespace-pre-wrap mb-4">
          <strong>Error Message:</strong><br />
          {ticket.error_message || "N/A"}
        </p>

        {/* Replication steps */}
        {Array.isArray(ticket.replication_steps) && ticket.replication_steps.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-1">Replication Steps</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {ticket.replication_steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Store */}
        {ticket.store && (
          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
            <Store className="h-3 w-3" />
            {ticket.store}
          </p>
        )}

        {/* Status */}
        <p className="text-sm">
          <strong>Status:</strong>{" "}
          <span
            className={
              ticket.status === "completed"
                ? "text-green-600 font-semibold"
                : ticket.status === "in progress"
                ? "text-yellow-600 font-semibold"
                : "text-red-600 font-semibold"
            }
          >
            {ticket.status || "todo"}
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
