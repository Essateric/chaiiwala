import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import TicketForm from "../components/Support/TicketForm.jsx"; // Adjust path if needed
import KanbanColumn from "../components/Support/KanbanColumn.jsx"; // Adjust path if needed
import DashboardLayout from "../components/layout/DashboardLayout.jsx"; // Or wherever your layout lives

export default function SupportPage() {
  const supabase = useSupabaseClient();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all tickets
  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching tickets:", error.message);
      setTickets([]);
    } else {
      setTickets(data || []);
      // Debug: Log all tickets and status counts
      console.log("All fetched tickets:", data);
      // Print a summary count by status
      const counts = data.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});
      console.log("Ticket status counts:", counts);
      // Show any tickets with unknown status
      const unknown = data.filter(
        (t) =>
          !["todo", "in progress", "completed"].includes(
            (t.status || "").toLowerCase()
          )
      );
      if (unknown.length > 0) {
        console.warn("Tickets with unknown status:", unknown);
      }
    }
    setLoading(false);
  }

  // Call fetchTickets on mount
  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Support & Technical Issues</h1>
        {/* DEBUG: Visual list of ticket statuses */}
        <div className="mb-4 bg-gray-100 rounded p-2 text-xs">
          <span className="font-bold">Debug: </span>
          Total tickets: {tickets.length} |{" "}
          {["todo", "in progress", "completed"].map((status) => (
            <span key={status} className="mr-3">
              {status}: {tickets.filter((t) => (t.status || "").toLowerCase() === status).length}
            </span>
          ))}
          {/* Unknown status tickets */}
          <span className="text-red-600">
            Unknown status: {tickets.filter(
              (t) =>
                !["todo", "in progress", "completed"].includes(
                  (t.status || "").toLowerCase()
                )
            ).length}
          </span>
        </div>
        {/* Ticket Form */}
        <div className="mb-8">
          <TicketForm onCreated={fetchTickets} />
        </div>
        {/* Kanban Columns */}
        {loading ? (
          <div className="text-center text-gray-500">Loading tickets...</div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            <KanbanColumn
              title="To Do"
              status="todo"
              tickets={tickets}
              refresh={fetchTickets}
              showRoleAndStore // Pass this as a prop!
            />
            <KanbanColumn
              title="In Progress"
              status="in progress"
              tickets={tickets}
              refresh={fetchTickets}
              showRoleAndStore
            />
            <KanbanColumn
              title="Completed"
              status="completed"
              tickets={tickets}
              refresh={fetchTickets}
              showRoleAndStore
            />
          </div>
        )}
        {/* DEBUG: See all ticket objects in browser (for developers) */}
        <details className="mt-4 bg-gray-50 p-2 rounded">
          <summary className="cursor-pointer text-xs text-gray-500">
            Debug: View all tickets JSON
          </summary>
          <pre className="overflow-x-auto text-xs">{JSON.stringify(tickets, null, 2)}</pre>
        </details>
      </div>
    </DashboardLayout>
  );
}
