"use client";

import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";

const SUBTOPICS = [
  {
    id: "geometry",
    symbol: "📐",
    title: "גיאומטריה מישורית",
    description: "בעיות קיצון עם אילוצים גיאומטריים — גידור, חלונות, חיתוך חוט וכלים מישוריים",
    exercises: [
      "גידור שלוש צלעות ליד קיר — שטח מקסימלי (60 מ׳ גדר)",
      "חלון נורמן: חצי עיגול + מלבן — מקסום שטח תחת אילוץ היקף",
      "מלבן חצוי לשני ריבועים — מינימום שטח כולל",
    ],
    color: "amber",
  },
  {
    id: "functions",
    symbol: "f(x)",
    title: "פונקציות וגרפים",
    description: "קיצון בהקשר אלגברי — מלבן מתחת לפרבולה, מרחק בין עקומות, קטע אנכי מקסימלי",
    exercises: [
      "מלבן מתחת לפרבולה y = 4 − x² — שטח מקסימלי",
      "מרחק מינימלי בין נקודות על y = x² ועל y = −x + 2",
      "קטע אנכי מקסימלי בין f(x) = x² + 2 ל-g(x) = −x² + 8",
    ],
    color: "emerald",
  },
];

const COLOR = {
  amber:   { bg: "bg-amber-950/40",   border: "border-amber-800/50",   text: "text-amber-400",   sym: "bg-amber-900/60 text-amber-200 text-2xl" },
  emerald: { bg: "bg-emerald-950/40", border: "border-emerald-800/50", text: "text-emerald-400", sym: "bg-emerald-900/60 text-emerald-300 text-xs font-mono font-bold" },
};

export default function KitzunHub() {
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
          <h1 className="text-4xl font-extrabold">בעיות קיצון</h1>
          <p className="text-slate-400 text-lg">תרגם סיפור לפונקציה — ופתור</p>
        </div>

        <p className="text-slate-400 text-center text-sm">בחר נושא-משנה להתחיל</p>

        <div className="space-y-4">
          {SUBTOPICS.map((s) => {
            const c = COLOR[s.color as keyof typeof COLOR];
            return (
              <Link
                key={s.id}
                href={`/topic/kitzun/${s.id}`}
                className={`block rounded-2xl border p-6 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${c.bg} ${c.border}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${c.sym}`}>
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
