import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ResetPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "בחירת סיסמה חדשה" };

export default function ResetPage() {
  return <AuthFrame title="סיסמה חדשה" description="בחרו סיסמה חזקה שלא שימשה אתכם בעבר."><ResetPasswordForm /></AuthFrame>;
}
