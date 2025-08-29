// src/components/checklists/DailyStoreChecklistCard.jsx
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient.js";
import { useAuth } from "@/hooks/UseAuth.jsx";
import { useToast } from "@/hooks/use-toast.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Loader2, CheckCircle2, Circle, ChevronUp, ChevronDown } from "lucide-react";

/* Small row component for each task */
function TaskRow({ task, onToggle, disabled }) {
  const isCompleted = task.status === "completed";
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(task.id, isCompleted ? "pending" : "completed")}
        disabled={disabled}
        className="mt-0.5"
        aria-label={isCompleted ? "Mark as not done" : "Mark as done"}
        title={isCompleted ? "Mark as not done" : "Mark as done"}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <Circle className="h-5 w-5 text-gray-400" />
        )}
      </button>

      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{task.title}</div>
        <div className="text-xs text-gray-500">{task.location || "Store"} · {isCompleted ? "Completed" : "Pending"}</div>
      </div>
    </div>
  );
}

/**
 * DailyStoreChecklistCard
 * - Exact same checklist as the Daily Checklist page
 * - Expand/Collapse button in the header
 * - Optimistic toggle + refetch (no manual refresh needed)
 *
 * Props:
 *  - title?: string
 *  - storeId?: number|string|null  (defaults to user's first store if available)
 *  - collapsible?: boolean         (default: true)
 *  - defaultExpanded?: boolean     (default: true)
 *  - limit?: number                (optional cap on tasks displayed)
 */
export default function DailyStoreChecklistCard({
  title = "Daily Store Checklist",
  storeId = null,
  collapsible = true,
  defaultExpanded = true,
  limit = 999,
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Resolve store: if none passed, use manager's first store (if any)
  const effectiveStoreId =
    storeId ?? (Array.isArray(profile?.store_ids) ? profile.store_ids[0] : "all");

  const [expanded, setExpanded] = useState(defaultExpanded);

  // Today ISO (naive)
  const todayISO = new Date().toISOString().split("T")[0];

  // Fetch today's checklist rows (status view)
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["v_daily_checklist_with_status", todayISO, effectiveStoreId],
    queryFn: async () => {
      let q = supabase
        .from("v_daily_checklist_with_status")
        .select("*")
        .eq("date", todayISO);
      if (effectiveStoreId !== "all" && effectiveStoreId !== null && effectiveStoreId !== undefined) {
        q = q.eq("store_id", effectiveStoreId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all daily task titles for mapping
  const { data: allDailyTasks = [] } = useQuery({
    queryKey: ["all_daily_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_tasks")
        .select("id, title");
      if (error) throw error;
      return data || [];
    },
  });

  // Optional: store names (only for "location" display). Safe to omit if you don't need it.
  const { data: stores = [] } = useQuery({
    queryKey: ["stores_minimal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const tasks = useMemo(() => {
    return (rows || [])
      .map((row) => ({
        ...row,
        title: allDailyTasks.find((t) => t.id === row.task_id)?.title || "Untitled Task",
        location: stores.find((s) => String(s.id) === String(row.store_id))?.name,
      }))
      .slice(0, limit);
  }, [rows, allDailyTasks, stores, limit]);

  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Toggle mutation with OPTIMISTIC UPDATE + REFRESH
  const toggleMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      const { error } = await supabase
        .from("daily_checklist_status")
        .update({
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    // optimistic update
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({
        queryKey: ["v_daily_checklist_with_status", todayISO, effectiveStoreId],
      });

      const prev = queryClient.getQueryData([
        "v_daily_checklist_with_status",
        todayISO,
        effectiveStoreId,
      ]);

      // update cache
      queryClient.setQueryData(
        ["v_daily_checklist_with_status", todayISO, effectiveStoreId],
        (old = []) =>
          old.map((row) =>
            row.id === id
              ? {
                  ...row,
                  status: newStatus,
                  completed_at: newStatus === "completed" ? new Date().toISOString() : null,
                }
              : row
          )
      );

      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(
          ["v_daily_checklist_with_status", todayISO, effectiveStoreId],
          ctx.prev
        );
      }
      toast({
        title: "Error",
        description: err?.message || "Could not update task.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // refresh this list…
      queryClient.invalidateQueries({
        queryKey: ["v_daily_checklist_with_status", todayISO, effectiveStoreId],
      });
      // …and any other widgets using the same base key
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "v_daily_checklist_with_status",
      });
    },
  });

  const handleToggle = (id, newStatus) => {
    toggleMutation.mutate({ id, newStatus });
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>

        {collapsible && (
          <Button size="sm" variant="outline" onClick={() => setExpanded((s) => !s)}>
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" /> Expand
              </>
            )}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {!expanded ? (
          <div className="text-xs text-gray-600">
            {completed}/{total} completed ({percent}%)
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : total === 0 ? (
          <div className="text-sm text-gray-500">No checklist items for today.</div>
        ) : (
          <>
            <div className="mb-3 h-2 w-full bg-gray-200 rounded">
              <div
                className="h-2 bg-emerald-500 rounded"
                style={{ width: `${percent}%` }}
                aria-label={`Progress ${percent}%`}
              />
            </div>

            <div className="text-xs text-gray-600 mb-3">
              {completed}/{total} completed ({percent}%)
            </div>

            <div className="divide-y">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={handleToggle}
                  disabled={toggleMutation.isPending}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
