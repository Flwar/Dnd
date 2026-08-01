import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "יצירת חשבון" };

export default function RegisterPage() {
  return <AuthFrame title="נשבעים אל הדרך" description="החשבון שומר דמויות, בחירות והתקדמות בענן."><RegisterForm /></AuthFrame>;
}
