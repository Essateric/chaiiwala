import React, { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useAuth } from "../../hooks/UseAuth.jsx";

// Modal for showing full ticket details, with delete button if allowed
function TicketModal({ ticket, onClose, canDelete, onDelete }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button
          className="absolute top-2 right-3 text-2xl font-bold text-gray-500 hover:text-black"
          onClick={onClose}
          aria-label="Close"
        >×</button>
        <h2 className="text-lg font-bold mb-2">{ticket.page}</h2>
        <div className="mb-2 text-sm text-gray-600">
          Logged: {new Date(ticket.created_at).toLocaleString()}
        </div>
        <div className="mb-2 text-sm text-gray-600">Store: {ticket.store}</div>
        <div className="mb-2">
          <b>Description:</b>{" "}
          {ticket.error_message || <span className="text-gray-400">(none)</span>}
        </div>
        <div className="mb-2">
          <b>Steps:</b>
          <ol className="list-decimal ml-6">
            {ticket.replication_steps &&
              ticket.replication_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
          </ol>
        </div>
        <div className="mb-2 text-sm text-gray-600">By: {ticket.user_name}</div>
        {ticket.screenshot_url && (
          <div className="my-2">
            <a href={ticket.screenshot_url} target="_blank" rel="noopener noreferrer">
      <img
        src={ticket.screenshot_url}
        alt="Screenshot"
        style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }}
      />
    </a>
          </div>
        )}
        <div className="mt-4 text-xs text-gray-400">ID: {ticket.id}</div>
        {canDelete && ticket.status !== "completed" && (
          <div className="mt-4">
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this ticket? If you still have this issue you will need to create a new ticket again."
                  )
                ) {
                  onDelete(ticket.id);
                  onClose();
                }
              }}
            >
              Delete Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanColumn({
  title,
  status,
  tickets,
  refresh,
  showRoleAndStore = false,
}) {
  const supabase = useSupabaseClient();
  const { user, profile } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Only allow valid status transitions
  function getNextStatuses(currentStatus) {
    if (currentStatus === "todo") return ["in progress", "completed"];
    if (currentStatus === "in progress") return ["completed"];
    return [];
  }

  // Can current user delete this ticket?
  function canDelete(ticket) {
    return (
      profile?.permissions === "admin" ||
      (user && ticket.user_id && user.id === ticket.user_id)
    );
  }

  // Move ticket to a new status
  async function moveTicket(ticketId, newStatus) {
    setUpdatingId(ticketId);
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: newStatus })
      .eq("id", ticketId);
    setUpdatingId(null);
    if (error) {
      alert("Error updating ticket: " + error.message);
      return;
    }
    refresh(); // reload tickets
  }

  // Delete ticket (only if allowed)
  async function handleDelete(ticketId) {
    const { error } = await supabase
      .from("support_tickets")
      .delete()
      .eq("id", ticketId);
    if (error) {
      alert("Error deleting ticket: " + error.message);
    }
    refresh();
  }

  return (
    <div className="flex-1 min-w-[250px] bg-gray-50 p-2 rounded shadow">
      <h3 className="font-semibold mb-2">{title}</h3>
      {tickets
        .filter((t) => t.status === status)
        .map((ticket) => (
          <div
            key={ticket.id}
            className="p-2 bg-white rounded border shadow mb-3 hover:bg-yellow-50 cursor-pointer transition"
            onClick={() => setSelectedTicket(ticket)}
          >
            <div className="font-bold">{ticket.page}</div>
            {ticket.error_message && (
              <div className="text-xs text-gray-700">{ticket.error_message}</div>
            )}
            <div className="mt-1 mb-1">
              <b className="text-xs">Steps:</b>
              <ol className="list-decimal ml-4 text-xs">
                {Array.isArray(ticket.replication_steps) &&
                  ticket.replication_steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
              </ol>
            </div>
            <div className="text-xs text-gray-500">By: {ticket.user_name}</div>
            {showRoleAndStore && (
              <div className="text-xs text-gray-500">
                <b>Role:</b> {ticket.user_role || "-"} | <b>Store:</b>{" "}
                {ticket.store || "-"}
              </div>
            )}
            {/* Image Preview */}
{ticket.screenshot_url && (
  <div>
    <div style={{ fontSize: 10, color: 'gray' }}>
      Image URL: <a href={ticket.screenshot_url} target="_blank">{ticket.screenshot_url}</a>
    </div>
    <a href={ticket.screenshot_url} target="_blank" rel="noopener noreferrer">
      <img
        src={ticket.screenshot_url}
        alt="Screenshot"
        style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }}
      />
    </a>
  </div>
)}


            {/* Status move links */}
            <div className="mt-1 text-xs">
              {getNextStatuses(ticket.status).map((st) => (
                <span
                  key={st}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTicket(ticket.id, st);
                  }}
                  className={`mr-2 underline cursor-pointer ${
                    updatingId === ticket.id
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }`}
                  style={{
                    color:
                      st === "completed"
                        ? "green"
                        : st === "in progress"
                        ? "#005"
                        : "#000",
                  }}
                >
                  {st}
                </span>
              ))}
            </div>
          </div>
        ))}

      {/* Modal for ticket details */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          canDelete={canDelete(selectedTicket)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
