import { useMemo, useState } from "react";

export const SORT_KEYS = {
  CREATED: "created",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  UPDATED: "updated",
};

export function getDateForKey(item, key) {
  if (!item) return null;
  switch (key) {
    case SORT_KEYS.CREATED:
      return item.created_at || item.createdAt || item.date_created || null;
    case SORT_KEYS.IN_PROGRESS:
      // Prefer explicit timestamp; else if status is in_progress, fall back to updated
      return (
        item.in_progress_at ||
        item.inProgressAt ||
        (item.status === "in_progress" ? item.updated_at || item.updatedAt : null)
      );
    case SORT_KEYS.COMPLETED:
      // Prefer explicit timestamp; else if status is completed, fall back to updated
      return (
        item.completed_at ||
        item.completedAt ||
        (item.status === "completed" ? item.updated_at || item.updatedAt : null)
      );
    case SORT_KEYS.UPDATED:
      return item.updated_at || item.updatedAt || item.last_modified_at || null;
    default:
      return item.created_at || item.createdAt || null;
  }
}

export default function useKanbanSort(initialKey = SORT_KEYS.CREATED, initialDir = "desc") {
  const [sortKey, setSortKey] = useState(initialKey); // "created" | "in_progress" | "completed" | "updated"
  const [sortDir, setSortDir] = useState(initialDir); // "asc" | "desc"

  const comparator = useMemo(() => {
    return (a, b) => {
      const da = getDateForKey(a, sortKey);
      const db = getDateForKey(b, sortKey);
      const ta = da ? new Date(da).getTime() : NaN;
      const tb = db ? new Date(db).getTime() : NaN;

      // Put items with no date at the end
      const aInvalid = Number.isNaN(ta);
      const bInvalid = Number.isNaN(tb);
      if (aInvalid && bInvalid) return 0;
      if (aInvalid) return 1;
      if (bInvalid) return -1;

      return sortDir === "asc" ? ta - tb : tb - ta;
    };
  }, [sortKey, sortDir]);

  function sortArray(items) {
    return [...items].sort(comparator);
  }

  return { sortKey, setSortKey, sortDir, setSortDir, sortArray };
}
