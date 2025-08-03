export function formatDeliveryDateVerbose(dateStr) {
  const date = new Date(dateStr);
  const day = date.toLocaleDateString("en-GB", { weekday: "long" }); // e.g. Monday
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" }); // e.g. Aug
  const year = `'${date.getFullYear().toString().slice(-2)}`; // '25

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
