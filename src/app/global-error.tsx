"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, background: "#08090b", color: "#e8dfce", fontFamily: "Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <h1>הכתר נסדק</h1>
            <p>לא הצלחנו לטעון את המשחק. אפשר לנסות שוב בבטחה.</p>
            <button onClick={reset} style={{ minHeight: 48, padding: "0 24px" }}>נסה שוב</button>
          </div>
        </main>
      </body>
    </html>
  );
}
