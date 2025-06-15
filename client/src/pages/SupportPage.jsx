import React, { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import TicketForm from "../components/Support/TicketForm.jsx"; // Adjust path if needed
import DashboardLayout from "../components/layout/DashboardLayout.jsx";

// Simple Task Timer for each card (if you already have one, import yours)
function TaskTimer({ ticket, refresh }) {
  // ... you can paste your own TaskTimer code here or use the example from before ...
  return null; // Remove and use real TaskTimer!
}

function KanbanColumn({ title, status, tickets, onMove, refresh }) {
  return (
    <div className="flex-1 min-w-[250px] bg-gray-50 p-2 rounded shadow">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="space-y-2">
        {tickets.filter(t => t.status === status).map(ticket => (
          <div key={ticket.id} className="p-2 bg-white rounded border shadow flex flex-col gap-1">
            <div className="font-bold">{ticket.page} <span className="text-xs text-gray-500">({ticket.store})</span></div>
            <div className="text-xs text-gray-700">{ticket.error_message}</div>
            {Array.isArray(ticket.replication_steps) && (
              <div className="text-xs">
                Steps:
                <ol className="list-decimal ml-5">
                  {ticket.replication_steps.map((step, idx) => <li key={idx}>{step}</li>)}
                </ol>
              </div>
            )}
            {ticket.screenshot_url && <img src={ticket.screenshot_url} alt="screenshot" className="max-w-[100px] rounded" />}
            <TaskTimer ticket={ticket} refresh={refresh} />
            <div className="text-xs text-gray-400">By: {ticket.user_name}</div>
            <div className="flex gap-2">
              {/* Move buttons */}
              {["todo", "in_progress", "pending", "completed"]
                .filter(s => s !== ticket.status)
                .map(st =>
                  <button key={st} className="text-xs underline" onClick={() => onMove(ticket, st)}>{st.replace("_", " ")}</button>
                )
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SupportPage() {
  const supabase = useSupabaseClient();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load all tickets from Supabase
  async function fetchTickets() {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTickets();
    // (Optional) add real-time subscription for live updates
  }, []);

  async function handleMove(ticket, newStatus) {
    await supabase.from("support_tickets").update({ status: newStatus }).eq("id", ticket.id);
    fetchTickets();
  }

  return (
    <DashboardLayout>
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Support & Technical Issues</h1>
      <TicketForm onCreated={fetchTickets} />
      <div className="flex gap-4 mt-8">
        <KanbanColumn title="To Do" status="todo" tickets={tickets} onMove={handleMove} refresh={fetchTickets} />
        <KanbanColumn title="In Progress" status="in_progress" tickets={tickets} onMove={handleMove} refresh={fetchTickets} />
        <KanbanColumn title="Pending" status="pending" tickets={tickets} onMove={handleMove} refresh={fetchTickets} />
        <KanbanColumn title="Completed" status="completed" tickets={tickets} onMove={handleMove} refresh={fetchTickets} />
      </div>
      {loading && <div>Loading…</div>}
    </div>
    </DashboardLayout>
  );
}
