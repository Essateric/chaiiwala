import React, { useState, useEffect, useRef } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export function TaskTimer({ ticket, refresh }) {
  const supabase = useSupabaseClient();
  const [isRunning, setIsRunning] = useState(ticket.ticker_state?.running || false);
  const [accumulated, setAccumulated] = useState(ticket.ticker_state?.accumulated_seconds || 0);
  const [startedAt, setStartedAt] = useState(ticket.ticker_state?.started_at ? new Date(ticket.ticker_state.started_at) : null);
  const intervalRef = useRef();

  // On mount: update timer every second if running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => refresh && refresh(), 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [isRunning, refresh]);

  const elapsed = isRunning && startedAt ? Math.floor((Date.now() - startedAt.getTime())/1000) : 0;
  const total = accumulated + elapsed;

  async function handleStart() {
    setIsRunning(true);
    setStartedAt(new Date());
    await supabase.from("support_tickets").update({
      ticker_state: { running: true, started_at: new Date().toISOString(), accumulated_seconds: accumulated }
    }).eq("id", ticket.id);
    refresh && refresh();
  }
  async function handlePause() {
    const pauseAccum = accumulated + Math.floor((Date.now() - startedAt.getTime())/1000);
    setIsRunning(false);
    setAccumulated(pauseAccum);
    await supabase.from("support_tickets").update({
      ticker_state: { running: false, started_at: null, accumulated_seconds: pauseAccum }
    }).eq("id", ticket.id);
    refresh && refresh();
  }
  async function handleComplete() {
    let finalAccum = accumulated;
    if (isRunning && startedAt) {
      finalAccum += Math.floor((Date.now() - startedAt.getTime())/1000);
    }
    await supabase.from("support_tickets").update({
      ticker_state: { running: false, started_at: null, accumulated_seconds: finalAccum },
      status: "completed",
      completed_at: new Date().toISOString(),
      total_seconds: finalAccum,
    }).eq("id", ticket.id);

    // Add notification
    await supabase.from("notifications").insert([{
      message: `✅ "${ticket.page}" was completed by ${ticket.user_name} in ${(finalAccum/3600).toFixed(2)} hours`
    }]);
    refresh && refresh();
  }

  return (
    <div className="space-x-2 flex items-center">
      <span>⏱️ {Math.floor(total/60)}m {total%60}s</span>
      {!isRunning && <button onClick={handleStart}>Start</button>}
      {isRunning && <button onClick={handlePause}>Pause</button>}
      <button onClick={handleComplete}>Complete</button>
    </div>
  );
}
