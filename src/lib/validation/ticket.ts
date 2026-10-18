import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be 80 characters or fewer"),
  email: z.email("Enter a valid email address").max(254),
  // 72 is bcrypt's input limit: everything past byte 72 is silently ignored,
  // so accepting a longer password would give a false sense of security.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required").max(72),
});

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10).max(5000),
  categoryId: z.uuid(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const statusChangeSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

export const listTicketsQuerySchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.uuid().optional(),
  q: z.string().trim().max(120).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
