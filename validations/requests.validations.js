import z from "zod";

export const signUpBodySchema = z.object({
    firstName: z.string().min(1, "First Name is required").max(55),
    lastName: z.string().max(55).optional(),

    email: z.string().email("Invalid email address!").max(255),
    password: z.string().min(8, "Should be 8 characters long"),
});

export const loginBodySchema = z.object({
    email: z.string().email("Invalid email address").max(255),
    password: z.string().min(8, "Should be 8 characters long!"),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  body: z.string().min(1, "Body is required"),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().max(255).optional(),
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(8, "Should be 8 characters long"),
});