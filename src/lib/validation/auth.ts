import { z } from "zod";

const password = z
  .string()
  .min(8, "הסיסמה חייבת להכיל לפחות שמונה תווים.")
  .regex(/[\p{L}]/u, "הסיסמה חייבת להכיל לפחות אות אחת.")
  .regex(/\d/, "הסיסמה חייבת להכיל לפחות ספרה אחת.");

export const loginSchema = z.object({
  email: z.string().trim().email("יש להזין כתובת אימייל תקינה."),
  password: z.string().min(1, "יש להזין סיסמה."),
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "שם התצוגה חייב להכיל לפחות שני תווים.")
      .max(32, "שם התצוגה יכול להכיל עד שלושים ושניים תווים.")
      .regex(/^[\p{L}\p{N}][\p{L}\p{N}\s'’\-]{0,30}[\p{L}\p{N}]$/u, "שם התצוגה יכול להכיל אותיות, מספרים, רווח, מקף או גרש."),
    email: z.string().trim().email("יש להזין כתובת אימייל תקינה."),
    password,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((value) => value, "יש לאשר את תנאי השימוש כדי ליצור חשבון."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "הסיסמאות אינן תואמות.",
  });

export const recoverySchema = z.object({
  email: z.string().trim().email("יש להזין כתובת אימייל תקינה."),
});

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "הסיסמאות אינן תואמות.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RecoveryInput = z.infer<typeof recoverySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
