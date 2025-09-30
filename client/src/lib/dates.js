// lib/dates.js

/** London-local calendar date in ISO (YYYY-MM-DD) — use for DB keys */
export function londonTodayDateISO(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [dd, mm, yyyy] = fmt.format(now).split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function ordinalSuffix(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  const last = n % 10;
  return last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th";
}

/**
 * Safe, London-time verbose formatter.
 * Pass "YYYY-MM-DD" or a Date.
 * Example: "Sunday 28th Sep '25"
 */
export function formatDeliveryDateVerboseLondon(dateInput) {
  let d;
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, day] = dateInput.split("-").map(Number);
    d = new Date(Date.UTC(y, m - 1, day)); // avoid TZ drift
  } else {
    d = new Date(dateInput);
  }

  const dayName = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "Europe/London",
  }).format(d);

  const dayNum = Number(
    new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: "Europe/London" }).format(d)
  );

  const monthShort = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "Europe/London",
  }).format(d);

  const yearShort = new Intl.DateTimeFormat("en-GB", {
    year: "2-digit",
    timeZone: "Europe/London",
  }).format(d);

  return `${dayName} ${dayNum}${ordinalSuffix(dayNum)} ${monthShort} '${yearShort}`;
}

/* Optional: keep your old name without changing call sites */
export { formatDeliveryDateVerboseLondon as formatDeliveryDateVerbose };
