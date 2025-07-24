// src/lib/formatters.js

export function formatDeliveryDateVerbose(dateStr) {
  const date = new Date(dateStr);
  const day = date.toLocaleDateString("en-GB", { weekday: "short" }); // e.g. Sat
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "long" }); // e.g. July
  const year = date.getFullYear();

  const suffix =
    dayNum === 1 || dayNum === 21 || dayNum === 31
      ? "st"
      : dayNum === 2 || dayNum === 22
      ? "nd"
      : dayNum === 3 || dayNum === 23
      ? "rd"
      : "th";

  return `${day} ${dayNum}${suffix} ${month} ${year}`;
}
