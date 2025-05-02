import { z } from "zod";

export const StockItemSchema = z.object({
  itemCode: z.string().min(2),
  name: z.string().min(2),
  category: z.string(),
  lowStockThreshold: z.number(),
  price: z.number(),
  sku: z.string().optional(),
});
