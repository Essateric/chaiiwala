import { z } from "zod";

export const RegisterSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  name: z.string().min(3, "Display name must be at least 3 characters"),
  email: z.string().email("Enter a valid email"),
  title: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "regional", "store", "staff"]).default("staff"),
});
