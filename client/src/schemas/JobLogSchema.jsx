import { z } from "zod";

export const JobLogSchema = z.object({
  storeId: z.number(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  category: z.string(),
  flag: z.enum(["normal", "long_standing", "urgent"]),
  ImageUpload: z.array(z.string()).default([]),
  comments: z.string().nullable().optional(),
  loggedBy: z.string(),
  logDate: z.string(),
  logTime: z.string(),
});
