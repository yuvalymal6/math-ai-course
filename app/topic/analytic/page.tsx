"use client";

import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";

const SUBTOPICS = [
  {
    id: "problems",
    symbol: "△",
    title: "בעיות גיאומטריות",
    description: "דלתון, משולש חסום במעגל, מעגלים משיקים — הוכחות ובניות",
    exercises: ["דלתון ABCD — ניצבות אלכסונים והוכחה", "משולש חסום במעגל — מרכז, רדיוס ושטח", "שני מעגלים משיקים — משיק משותף ומשולש"],
    color: "orange",
  },
  {
    id: "circle",
    symbol: "○",
    title: "המעגל",
    description: "משוואת מעגל, מרכז ורדיוס, השלמה לריבוע, חיתוך עם הצירים",
    exercises: ["(x−2)²+(y+3)²=25 — מרכז, רדיוס, מיקום", "בניית מעגל ממרכז ונקודה", "x²+y²−6x+4y−12=0 — השלמה לריבוע"],
    color: "cyan",
  },
  {
    id: "tangent",
    symbol: "⊙",
    title: "משיק למעגל",
    description: "משוואת משיק, ניצבות רדיוס-משיק, משיק מנקודה חיצונית",
    exercises: ["x²+y²=25, משיק בנקודה (3,4)", "(x−2)²+(y−1)²=10, משיק בנקודה (5,2)", "משיקים מנקודה חיצונית (8,0) למעגל"],
    color: "rose",
  },
];

const COLOR = {
  orange: { bg: "bg-orange-950/40", border: "border-orange-800/50", text: "text-orange-400", sym: "bg-orange-900/60 text-orange-300" },
  cyan:   { bg: "bg-cyan-950/40",   border: "border-cyan-800/50",   text: "text-[#00d4ff]",  sym: "bg-cyan-900/60 text-cyan-300" },
  rose:   { bg: "bg-rose-950/40",   border: "border-rose-800/50",   text: "text-rose-400",   sym: "bg-rose-900/60 text-rose-300" },
};

export default function AnalyticHub() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-3">
          <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">כיתה יא • 4 יח"ל מהדורה חדשה</p>
          <h1 className="text-4xl font-extrabold">גיאומטריה אנליטית</h1>
          <p className="text-slate-400 text-lg">קו ישר, מעגל ומשיקים</p>
        </div>

        <p className="text-slate-400 text-center text-sm">בחר נושא-משנה להתחיל</p>

        <div className="space-y-4">
          {SUBTOPICS.map((s) => {
            const c = COLOR[s.color as keyof typeof COLOR];
            return (
              <Link
                key={s.id}
                href={`/topic/analytic/${s.id}`}
                className={`block rounded-2xl border p-6 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${c.bg} ${c.border}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl shrink-0 ${c.sym}`}>
                    {s.symbol}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className={`text-lg font-bold ${c.text}`}>{s.title}</h2>
                      <ChevronRight size={18} className="text-slate-600 shrink-0" />
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">{s.description}</p>
                    <div className="space-y-1">
                      {s.exercises.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                          <span className={`font-semibold ${c.text} shrink-0`}>{["בסיסי", "בינוני", "מתקדם"][i]}</span>
                          <span className="truncate">{ex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

      </main>
    </div>
  );
}
