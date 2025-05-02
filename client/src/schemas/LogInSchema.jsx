import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Email must use a valid format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
