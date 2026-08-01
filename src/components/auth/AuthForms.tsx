"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type AuthActionResult,
} from "@/lib/actions/auth";
import {
  loginSchema,
  recoverySchema,
  registerSchema,
  resetPasswordSchema,
  type LoginInput,
  type RecoveryInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/lib/validation/auth";
import { GameButton } from "@/components/ui/GameButton";
import { FormField } from "@/components/ui/FormField";
import { he } from "@/lib/i18n";

function StatusMessage({ result }: { result: AuthActionResult | null }) {
  if (!result) return null;
  return (
    <div
      className={`border px-4 py-3 text-sm ${result.ok ? "border-[#77b686]/45 bg-[#77b686]/10 text-[#bfe1c7]" : "border-[#d05b54]/45 bg-[#d05b54]/10 text-[#ffc0ba]"}`}
      role={result.ok ? "status" : "alert"}
    >
      {result.message}
    </div>
  );
}

function PasswordInput({ id, describedBy, invalid, registration }: { id: string; describedBy?: string; invalid?: true; registration: UseFormRegisterReturn<"password"> }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...registration}
        id={id}
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        className="fantasy-input pe-12"
        aria-describedby={describedBy}
        aria-invalid={invalid}
      />
      <button
        type="button"
        className="absolute inset-block-0 inset-inline-end-0 grid w-12 place-items-center text-[#a89f91] hover:text-[#f0cf82]"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
      >
        {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const submit = form.handleSubmit((values) => {
    setResult(null);
    startTransition(async () => {
      const response = await signInAction(values);
      setResult(response);
      if (response.ok) {
        router.replace("/menu");
        router.refresh();
      }
    });
  });
  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <StatusMessage result={result} />
      <FormField label={he.auth.email} error={form.formState.errors.email?.message} required>
        {(props) => <input {...props} {...form.register("email")} type="email" autoComplete="email" inputMode="email" className="fantasy-input text-left" dir="ltr" />}
      </FormField>
      <FormField label={he.auth.password} error={form.formState.errors.password?.message} required>
        {(props) => <PasswordInput id={props.id} describedBy={props["aria-describedby"]} invalid={props["aria-invalid"]} registration={form.register("password")} />}
      </FormField>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/auth/recover" className="text-[#c6a15b] underline-offset-4 hover:text-[#f0cf82] hover:underline">{he.auth.forgotPassword}</Link>
        <Link href="/auth/register" className="text-[#c8c0b3] underline-offset-4 hover:text-white hover:underline">{he.auth.noAccount}</Link>
      </div>
      <GameButton type="submit" loading={pending} className="w-full" size="lg">{he.auth.login}</GameButton>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "", acceptTerms: false },
  });
  const submit = form.handleSubmit((values) => {
    setResult(null);
    startTransition(async () => {
      const response = await signUpAction(values);
      setResult(response);
      if (response.ok && !response.requiresEmailConfirmation) {
        router.replace("/characters/new");
        router.refresh();
      }
    });
  });
  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <StatusMessage result={result} />
      <FormField label={he.auth.displayName} error={form.formState.errors.displayName?.message} required>
        {(props) => <input {...props} {...form.register("displayName")} autoComplete="nickname" className="fantasy-input" />}
      </FormField>
      <FormField label={he.auth.email} error={form.formState.errors.email?.message} required>
        {(props) => <input {...props} {...form.register("email")} type="email" autoComplete="email" inputMode="email" className="fantasy-input text-left" dir="ltr" />}
      </FormField>
      <FormField label={he.auth.password} hint={he.auth.passwordRequirements} error={form.formState.errors.password?.message} required>
        {(props) => <input {...props} {...form.register("password")} type="password" autoComplete="new-password" className="fantasy-input" />}
      </FormField>
      <FormField label={he.auth.confirmPassword} error={form.formState.errors.confirmPassword?.message} required>
        {(props) => <input {...props} {...form.register("confirmPassword")} type="password" autoComplete="new-password" className="fantasy-input" />}
      </FormField>
      <FormField label="אישור תנאים" error={form.formState.errors.acceptTerms?.message}>
        {({ id, ...props }) => (
          <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 border border-[#c6a15b]/20 bg-black/20 p-3 text-sm">
            <input {...props} {...form.register("acceptTerms")} id={id} type="checkbox" className="mt-1 size-5 accent-[#c6a15b]" />
            <span>קראתי ואני מסכים ל<Link href="/legal/terms" className="mx-1 text-[#f0cf82] underline">תנאי השימוש</Link>.</span>
          </label>
        )}
      </FormField>
      <div className="text-sm"><Link href="/auth/login" className="text-[#c8c0b3] hover:text-white hover:underline">{he.auth.haveAccount}</Link></div>
      <GameButton type="submit" loading={pending} className="w-full" size="lg">{he.auth.register}</GameButton>
    </form>
  );
}

export function RecoveryForm() {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<RecoveryInput>({ resolver: zodResolver(recoverySchema), defaultValues: { email: "" } });
  return (
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => startTransition(async () => setResult(await requestPasswordResetAction(values))))} noValidate>
      <StatusMessage result={result} />
      {result?.ok ? <Mail className="mx-auto size-12 text-[#77b686]" aria-hidden="true" /> : null}
      <FormField label={he.auth.email} error={form.formState.errors.email?.message} required>
        {(props) => <input {...props} {...form.register("email")} type="email" autoComplete="email" inputMode="email" className="fantasy-input text-left" dir="ltr" />}
      </FormField>
      <GameButton type="submit" loading={pending} className="w-full">{he.auth.sendResetLink}</GameButton>
      <Link href="/auth/login" className="block text-center text-sm text-[#c6a15b] hover:underline">חזרה להתחברות</Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });
  return (
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => startTransition(async () => {
      const response = await resetPasswordAction(values);
      setResult(response);
      if (response.ok) window.setTimeout(() => router.replace("/menu"), 900);
    }))} noValidate>
      <StatusMessage result={result} />
      {result?.ok ? <CheckCircle2 className="mx-auto size-12 text-[#77b686]" aria-hidden="true" /> : null}
      <FormField label="סיסמה חדשה" hint={he.auth.passwordRequirements} error={form.formState.errors.password?.message} required>
        {(props) => <input {...props} {...form.register("password")} type="password" autoComplete="new-password" className="fantasy-input" />}
      </FormField>
      <FormField label={he.auth.confirmPassword} error={form.formState.errors.confirmPassword?.message} required>
        {(props) => <input {...props} {...form.register("confirmPassword")} type="password" autoComplete="new-password" className="fantasy-input" />}
      </FormField>
      <GameButton type="submit" loading={pending} className="w-full">{he.auth.resetPassword}</GameButton>
    </form>
  );
}
