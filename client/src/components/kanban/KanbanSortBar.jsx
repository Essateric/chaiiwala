import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

// If you use shadcn Select, uncomment and use it. Otherwise a native <select> is provided below.
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function KanbanSortBar({
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  className = "",
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${className}`}>
      {/* --- Sort by field --- */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by</span>

        {/* Native select (works everywhere). Swap to shadcn Select if you prefer. */}
        <select
          className="border rounded px-2 py-1 text-sm bg-white"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
        >
          <option value="created">Date Created</option>
          <option value="in_progress">Date set to In Progress</option>
          <option value="completed">Date set to Completed</option>
          <option value="updated">Last Updated</option>
        </select>

        {/*
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Date Created</SelectItem>
            <SelectItem value="in_progress">Date set to In Progress</SelectItem>
            <SelectItem value="completed">Date set to Completed</SelectItem>
            <SelectItem value="updated">Last Updated</SelectItem>
          </SelectContent>
        </Select>
        */}
      </div>

      {/* --- Direction toggle --- */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        title={sortDir === "asc" ? "Oldest first" : "Newest first"}
      >
        <ArrowUpDown className="h-4 w-4 mr-2" />
        {sortDir === "asc" ? "Oldest first" : "Newest first"}
      </Button>
    </div>
  );
}
