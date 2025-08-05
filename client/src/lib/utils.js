import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes
export function cn(...inputs) {
  return twMerge(clsx(...inputs));
}

// Status from quantity
export function getStatusFromQty(qty, threshold = 5) {
  if (qty === 0) return "out_of_stock";
  if (qty <= threshold) return "low_stock";
  return "in_stock";
}

// Get array of past N dates
export function getPastNDates(n) {
  const arr = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().split("T")[0]);
  }
  return arr.reverse();
}
