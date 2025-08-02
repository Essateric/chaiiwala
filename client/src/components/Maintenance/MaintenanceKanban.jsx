import JobLogCard from "./JobLogCard.jsx";

const STATUSES = ["pending", "approved", "in_progress", "completed"];

export default function JobLogKanban({ jobLogs }) {
  const grouped = Object.fromEntries(STATUSES.map((s) => [s, []]));

  for (const log of jobLogs) {
    const status = log.status || "pending";
    if (grouped[status]) {
      grouped[status].push(log);
    } else {
      grouped["pending"].push(log); // fallback
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUSES.map((status) => (
        <div key={status} className="min-w-[250px] w-full max-w-[300px] flex-shrink-0">
          <h2 className="text-lg font-semibold capitalize mb-2 text-center">{status.replace("_", " ")}</h2>
          <div className="space-y-2">
        {grouped[status].length === 0 ? (
  <div className="text-sm text-muted-foreground text-center">
    {status === "completed"
      ? "No maintenance jobs completed in the last 7 days."
      : "No logs"}
  </div>
) : (
  grouped[status]
    .filter((log) => log && typeof log === "object")
    .map((log) => <JobLogCard key={log.id} log={log} />)
)}

          </div>
        </div>
      ))}
    </div>
  );
}
