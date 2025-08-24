import React, { useMemo } from "react";
import JobLogCard from "./JobLogCard.jsx";
import useKanbanSort, { SORT_KEYS } from "@/components/kanban/useKanbanSort.js";
import KanbanSortBar from "@/components/kanban/KanbanSortBar.jsx";

const STATUSES = ["pending", "approved", "in_progress", "completed"];

export default function JobLogKanban({ jobLogs = [] }) {
  // ✅ Hooks must be inside the component
  const { sortKey, setSortKey, sortDir, setSortDir, sortArray } =
    useKanbanSort(SORT_KEYS.CREATED, "desc");

  // ✅ Group once per render
  const grouped = useMemo(() => {
    const g = Object.fromEntries(STATUSES.map((s) => [s, []]));
    for (const log of jobLogs) {
      const status = log?.status || "pending";
      (g[status] || g.pending).push(log);
    }
    return g;
  }, [jobLogs]);

  return (
    <>
      <KanbanSortBar
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortDir={sortDir}
        setSortDir={setSortDir}
        className="mb-2"
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          // ✅ Apply sorting for each column
          const items = sortArray(grouped[status] || []);
          return (
            <div key={status} className="min-w-[250px] w-full max-w-[300px] flex-shrink-0">
              <h2 className="text-lg font-semibold capitalize mb-2 text-center">
                {status.replace("_", " ")}
              </h2>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center">
                    {status === "completed"
                      ? "No maintenance jobs completed in the last 7 days."
                      : "No logs"}
                  </div>
                ) : (
                  items
                    .filter((log) => log && typeof log === "object")
                    .map((log) => <JobLogCard key={log.id} log={log} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
