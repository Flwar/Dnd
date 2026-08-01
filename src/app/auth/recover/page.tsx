import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { RecoveryForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "שחזור סיסמה" };

export default function RecoveryPage() {
  return <AuthFrame title="השבת המפתח" description="נשלח קישור מאובטח לכתובת המקושרת לחשבון."><RecoveryForm /></AuthFrame>;
}
