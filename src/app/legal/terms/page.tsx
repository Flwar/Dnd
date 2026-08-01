import Link from "next/link";

export default function TermsPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-[#08090b] px-4 py-12 sm:px-6">
      <article className="parchment-panel mx-auto max-w-3xl p-6 sm:p-10">
        <h1 className="display-font text-4xl">תנאי השימוש</h1>
        <p className="mt-2 text-sm">עודכן לאחרונה: י״ז באב תשפ״ו</p>
        <div className="mt-8 space-y-6 leading-8">
          <section><h2 className="display-font text-2xl">חשבון ושמירה</h2><p>החשבון נועד לשמור דמויות והתקדמות. יש להשתמש בכתובת אימייל שבשליטתכם ולשמור על הסיסמה בסוד.</p></section>
          <section><h2 className="display-font text-2xl">התנהגות בחבורה</h2><p>במשחק מקוון יש לכבד שחקנים אחרים, להימנע מהטרדה ולא לנסות לעקוף את חוקי המשחק או את מנגנוני האבטחה.</p></section>
          <section><h2 className="display-font text-2xl">גרסת ההשקה</h2><p>זהו פרק פתיחה מתמשך. איזון, תוכן ומערכות עשויים להשתנות תוך שמירה על נתוני החשבון ככל שניתן.</p></section>
        </div>
        <Link href="/auth/register" className="mt-8 inline-block font-bold text-[#452711] underline">חזרה ליצירת החשבון</Link>
      </article>
    </main>
  );
}
