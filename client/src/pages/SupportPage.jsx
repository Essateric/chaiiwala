import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import TicketForm from "../components/Support/TicketForm.jsx"; // Adjust path if needed
import KanbanColumn from "../components/Support/KanbanColumn.jsx"; // Adjust path if needed
import DashboardLayout from "../components/layout/DashboardLayout.jsx"; // Or wherever your layout lives
import usePagination from "../hooks/usePagination.js";

export default function SupportPage() {
  const supabase = useSupabaseClient();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const todoPagination = usePagination(5);
const inProgressPagination = usePagination(5);
const completedPagination = usePagination(5);
const filteredTickets = tickets.filter(t => (t.status || "").toLowerCase() === "todo");
const hasNext = todoPagination.page * todoPagination.itemsPerPage < filteredTickets.length;


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
  tickets={todoPagination.paginate(tickets.filter(t => (t.status || "").toLowerCase() === "todo"))}
  refresh={fetchTickets}
  showRoleAndStore
>
<div className="flex flex-col h-full">
  {/* Ticket list */}
<div className="flex-1">
  {tickets.map(ticket => (
    <div key={ticket.id} className="p-2 bg-white shadow rounded mb-2">
      <h4 className="font-semibold">{ticket.title}</h4>
      <p className="text-sm text-gray-600">{ticket.description}</p>
    </div>
  ))}
</div>

  {/* Pagination buttons */}
<div className="flex justify-between items-center p-2 border-t">
  <button
    onClick={() => todoPagination.prev()}
    disabled={todoPagination.page === 1}
    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
  >
    ← Prev
  </button>

  <span className="text-sm text-gray-600">
    Page {todoPagination.page} of {Math.max(1, Math.ceil(todosAll.length / todoPagination.itemsPerPage))}
  </span>

  <button
    onClick={() => todoPagination.next(todosAll)}
    disabled={todoPagination.page * todoPagination.itemsPerPage >= todosAll.length}
    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
  >
    Next →
  </button>
</div>

</div>


</KanbanColumn>

<KanbanColumn
  title="In Progress"
  status="in progress"
  tickets={inProgressPagination.paginate(tickets.filter(t => (t.status || "").toLowerCase() === "in progress"))}
  refresh={fetchTickets}
  showRoleAndStore
>
<div className="flex flex-col h-full">
  {/* Ticket list */}
<div className="flex-1">
  {tickets.map(ticket => (
    <div key={ticket.id} className="p-2 bg-white shadow rounded mb-2">
      <h4 className="font-semibold">{ticket.title}</h4>
      <p className="text-sm text-gray-600">{ticket.description}</p>
    </div>
  ))}
</div>

  {/* Pagination buttons */}
<div className="flex justify-between items-center p-2 border-t">
  <button
    onClick={() => inProgressPagination.prev()}
    disabled={inProgressPagination.page === 1}
    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
  >
    ← Prev
  </button>

  <span className="text-sm text-gray-600">
    Page {inProgressPagination.page} of {Math.max(1, Math.ceil(inProgressAll.length / inProgressPagination.itemsPerPage))}
  </span>

  <button
    onClick={() => inProgressPagination.next(inProgressAll)}
    disabled={inProgressPagination.page * inProgressPagination.itemsPerPage >= inProgressAll.length}
    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
  >
    Next →
  </button>
</div>

</div>

</KanbanColumn>

<KanbanColumn
  title="Completed"
  status="completed"
  tickets={completedPagination.paginate(tickets.filter(t => (t.status || "").toLowerCase() === "completed"))}
  refresh={fetchTickets}
  showRoleAndStore
>
<div className="flex flex-col h-full">
  {/* Ticket list */}
<div className="flex-1">
  {tickets.map(ticket => (
    <div key={ticket.id} className="p-2 bg-white shadow rounded mb-2">
      <h4 className="font-semibold">{ticket.title}</h4>
      <p className="text-sm text-gray-600">{ticket.description}</p>
    </div>
  ))}
</div>

  {/* Pagination buttons */}
<div className="flex justify-between items-center p-2 border-t">
  <button
    onClick={() => completedPagination.prev()}
    disabled={completedPagination.page === 1}
    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
  >
    ← Prev
  </button>

  <span className="text-sm text-gray-600">
    Page {completedPagination.page} of {Math.max(1, Math.ceil(completedAll.length / completedPagination.itemsPerPage))}
  </span>

  <button
    onClick={() => completedPagination.next(completedAll)}
    disabled={completedPagination.page * completedPagination.itemsPerPage >= completedAll.length}
    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
  >
    Next →
  </button>
</div>

</div>

</KanbanColumn>
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
