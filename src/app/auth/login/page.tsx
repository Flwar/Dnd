import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "התחברות" };

export default function LoginPage() {
  return <AuthFrame title="ברוכים השבים" description="התחברו כדי לשוב אל הדמויות והשמירות שלכם."><LoginForm /></AuthFrame>;
}
