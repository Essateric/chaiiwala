// --- ORDER/DELIVERY DAY MAPPING ---
const orderToDelivery = {
  Monday: "Tuesday",
  Tuesday: "Wednesday",
  Thursday: "Friday",
  Friday: "Saturday",
  Saturday: "Monday",
};
// Inverse mapping: delivery day → order day
const deliveryToOrder = {
  Tuesday: "Monday",
  Wednesday: "Tuesday",
  Friday: "Thursday",
  Saturday: "Friday",
  Monday: "Saturday",
};

// --- UTILS ---
const orderedDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const validOrderDays = Object.keys(orderToDelivery);
const deliveryDays = Object.keys(deliveryToOrder);
const dayIndexMap = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

// --- Returns next Freshways delivery date (YYYY-MM-DD) ---
export function getFreshwaysDeliveryDate(today = new Date()) {
  const cutoffHour = 11;
  const orderDay = today.toLocaleDateString("en-GB", { weekday: "long" });
  const isPastCutoff = today.getHours() >= cutoffHour;

  let nextOrderDay = orderDay;
  if (!validOrderDays.includes(orderDay) || isPastCutoff) {
    const todayIndex = today.getDay();
    for (let i = 1; i <= 7; i++) {
      const nextIndex = (todayIndex + i) % 7;
      const nextDayName = orderedDays[nextIndex];
      if (validOrderDays.includes(nextDayName)) {
        nextOrderDay = nextDayName;
        break;
      }
    }
  }

  const deliveryDay = orderToDelivery[nextOrderDay];
  if (!deliveryDay) return null;
  const todayIndex = today.getDay();
  const targetDayIndex = dayIndexMap[deliveryDay];
  let daysUntilDelivery = (targetDayIndex - todayIndex + 7) % 7;
  if (daysUntilDelivery === 0) daysUntilDelivery = 7;
  const deliveryDate = new Date(today);
  deliveryDate.setDate(today.getDate() + daysUntilDelivery);
  return deliveryDate.toISOString().split("T")[0];
}

// --- Find LAST order day (for "most recent" delivery) ---
export function getLastFreshwaysOrderDay(today = new Date()) {
  let date = new Date(today);
  if (date.getHours() < 11) date.setDate(date.getDate() - 1);
  for (let i = 0; i < 7; i++) {
    const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });
    if (validOrderDays.includes(dayName)) return new Date(date);
    date.setDate(date.getDate() - 1);
  }
  return null;
}

// --- Returns "most recent" delivery date for widget/dashboard ---
export function getMostRecentFreshwaysDeliveryDate(today = new Date()) {
  // If today IS a delivery day, show today's date; else, show yesterday (if it was a delivery day), else most recent delivery day.
  if (isTodayDeliveryDay(today)) {
    return today.toISOString().split("T")[0]; // Today!
  }
  // Try yesterday
  const yday = new Date(today);
  yday.setDate(today.getDate() - 1);
  if (isTodayDeliveryDay(yday)) {
    return yday.toISOString().split("T")[0]; // Yesterday!
  }
  // Fallback: last delivery day in the past week
  let date = new Date(today);
  for (let i = 1; i <= 7; i++) {
    date.setDate(today.getDate() - i);
    if (isTodayDeliveryDay(date)) return date.toISOString().split("T")[0];
  }
  return null;
}

// --- Get delivery day name for today ---
export function getTodayDeliveryDay(today = new Date()) {
  return today.toLocaleDateString("en-GB", { weekday: "long" });
}

// --- Get order day name needed for *today's* delivery day ---
export function getOrderDayForTodayDelivery(today = new Date()) {
  const deliveryDay = getTodayDeliveryDay(today);
  return deliveryToOrder[deliveryDay] || null;
}

// --- Get Date object (11am) of the order deadline for today's delivery ---
export function getOrderDateForTodayDelivery(today = new Date()) {
  const orderDayName = getOrderDayForTodayDelivery(today);
  if (!orderDayName) return null;
  for (let i = 1; i <= 7; i++) {
    const prev = new Date(today);
    prev.setDate(today.getDate() - i);
    const prevDayName = prev.toLocaleDateString("en-GB", { weekday: "long" });
    if (prevDayName === orderDayName) {
      prev.setHours(11, 0, 0, 0);
      return prev;
    }
  }
  return null;
}

// --- True if today is a Freshways delivery day ---
export function isTodayDeliveryDay(today = new Date()) {
  const todayName = today.toLocaleDateString("en-GB", { weekday: "long" });
  return deliveryDays.includes(todayName);
}
