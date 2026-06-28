import z from "zod";

export const loginBodySchema = z.object({
    email: z.string().email("Invalid email address").max(255),
    password: z.string().min(8, "Should be 8 characters long!"),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  body: z.string().min(1, "Body is required").max(50000),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().max(255).optional(),
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(8, "Should be 8 characters long"),
});