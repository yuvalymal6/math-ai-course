"use client";

import Link from "next/link";
import { Dice5, ChevronLeft } from "lucide-react";

const SUBTOPICS = [
  { id: "basic", href: "/3u/topic/grade10/probability/basic", symbol: "P", title: "הסתברות בסיסית", description: "הגדרת הסתברות, מרחב מדגם, אירוע — חישוב הסתברות פשוטה", color: "#16A34A", ready: false },
  { id: "events", href: "/3u/topic/grade10/probability/events", symbol: "\u2229", title: "חיתוך ואיחוד", description: "אירועים זרים, אירועים משלימים, חיתוך ואיחוד — P(A\u222AB) ו-P(A\u2229B)", color: "#EA580C", ready: true },
  { id: "conditional", href: "/3u/topic/grade10/probability/conditional", symbol: "P|", title: "הסתברות מותנית", description: "P(A|B) — הסתברות בהינתן מידע נוסף, נוסחת בייס הבסיסית", color: "#DC2626", ready: false },
];

export default function Probability3UHub() {
  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Dice5 size={22} color="#EA580C" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>הסתברות</h1>
          </div>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none" }}>
            <ChevronLeft size={16} />חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2.5rem 1rem 5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <p style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>כיתה י׳ • 3 יח״ל</p>
          <p style={{ color: "#2D3436", fontSize: 16, fontWeight: 500 }}>הסתברות בסיסית, אירועים, חיתוך ואיחוד — ואיך לשאול AI את השאלות הנכונות</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SUBTOPICS.map(s => {
            const inner = (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${s.color}15`, border: `1.5px solid ${s.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "serif", flexShrink: 0 }}>{s.symbol}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>{s.title}</h2>
                    {!s.ready && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)", color: "#6B7280" }}>בקרוב</span>}
                  </div>
                  <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.description}</p>
                </div>
              </div>
            );
            const cardStyle = { borderRadius: 20, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.75rem", opacity: s.ready ? 1 : 0.6, textDecoration: "none" as const };
            return s.ready ? (
              <Link key={s.id} href={s.href} style={cardStyle}>{inner}</Link>
            ) : (
              <div key={s.id} style={{ ...cardStyle, cursor: "not-allowed" }}>{inner}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
