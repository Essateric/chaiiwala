import { z } from "zod";

export const EventOrderSchema = z.object({
  storeId: z.number(),
  eventDate: z.string(),
  eventTime: z.string(),
  venue: z.string().min(2),
  product: z.string().min(2),
  quantity: z.number().min(1),
  bookingDate: z.string(),
  bookingTime: z.string(),
  customerName: z.string().min(2),
  customerPhone: z.string(),
  customerEmail: z.string().email().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
  paymentStatus: z.enum(["unpaid", "paid", "pending_payment", "partially_paid"]).default("unpaid").optional(),
  bookedBy: z.string(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  notes: z.string().optional(),
});
