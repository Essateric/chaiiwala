// netlify/functions/_lib/formatters.js
export function formatDeliveryDateVerbose(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return "—";
  const day = date.toLocaleDateString("en-GB", { weekday: "long" });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  const year = `'${date.getFullYear().toString().slice(-2)}`;
  const suffix = (d => (d===1||d===21||d===31) ? "st" : (d===2||d===22) ? "nd" : (d===3||d===23) ? "rd" : "th")(dayNum);
  return `${day} ${dayNum}${suffix} ${month} ${year}`;
}

export function buildCoverData(payload, friendlyBaseName) {
  const reportedBy =
    payload.reportedByName ||
    payload.reporterName ||
    payload.submittedByName ||
    payload.user?.full_name ||
    payload.user?.name ||
    "—";

  return {
    title: "Chaiiwala Audit",
    file: `${friendlyBaseName}.pdf`,
    store: payload.store_name || payload.store || "—",
    template: payload.template_name || payload.template || "—",
    reportedBy,
    startedHuman:   formatDeliveryDateVerbose(payload.started_at),
    submittedHuman: formatDeliveryDateVerbose(payload.submitted_at),
  };
}
