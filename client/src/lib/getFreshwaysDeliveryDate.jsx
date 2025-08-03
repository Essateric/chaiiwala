// lib/getFreshwaysDeliveryDate.js

export function getFreshwaysDeliveryDate(today = new Date()) {
  const validOrderDays = {
    Monday: "Tuesday",
    Tuesday: "Wednesday",
    Thursday: "Friday",
    Friday: "Saturday",
    Saturday: "Monday",
  };

  const cutoffHour = 11;
  const orderDay = today.toLocaleDateString("en-GB", { weekday: "long" });

  // If it's past 11AM, treat today as not a valid order day
  const isPastCutoff = today.getHours() >= cutoffHour;
  const shouldSkipToday = isPastCutoff;

  // Get list of order days in order
  const orderedDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayIndexMap = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };

  let nextOrderDay = orderDay;

  // If today is not valid or after cutoff, find next valid order day
  if (!validOrderDays[orderDay] || shouldSkipToday) {
    const todayIndex = today.getDay();
    for (let i = 1; i <= 7; i++) {
      const nextIndex = (todayIndex + i) % 7;
      const nextDayName = orderedDays[nextIndex];
      if (validOrderDays[nextDayName]) {
        nextOrderDay = nextDayName;
        break;
      }
    }
  }

  const deliveryDay = validOrderDays[nextOrderDay];
  if (!deliveryDay) return null;

  const todayIndex = today.getDay();
  const targetDayIndex = dayIndexMap[deliveryDay];

  let daysUntilDelivery = (targetDayIndex - todayIndex + 7) % 7;
  if (daysUntilDelivery === 0) daysUntilDelivery = 7;

  const deliveryDate = new Date(today);
  deliveryDate.setDate(today.getDate() + daysUntilDelivery);

  return deliveryDate.toISOString().split("T")[0];
}
