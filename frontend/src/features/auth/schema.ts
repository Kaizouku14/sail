import { z } from "zod";

export const loginFormSchema = z.object({
  email: z
    .email({ error: "Invalid email address" })
    .min(1, { error: "Email is required" }),
  password: z.string().min(1, { error: "Password is required" }),
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  username: z.string({ error: "Username is required" }),
  email: z.email({ error: "Invalid email address" }),
  password: z.string({ error: "Password is required" }),
});

export type RegisterFormSchema = z.infer<typeof registerFormSchema>;
