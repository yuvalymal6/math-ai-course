"use client";

import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";

const SUBTOPICS = [
  {
    id: "descriptive",
    symbol: "μσ",
    title: "מדדי תיאור",
    description: "ממוצע, חציון, סטיית תקן וטרנספורמציות — כל מדדי התיאור במקום אחד",
    exercises: [
      "ממוצע, חציון ושכיח — חישוב מנתונים גולמיים",
      "סטיית תקן — חישוב והשוואת פיזור בין שתי כיתות",
      "הכלל הכללי Y = aX + b — מה קורה למדדים?",
    ],
    color: "cyan",
  },
  {
    id: "regression",
    symbol: "📈",
    title: "רגרסיה לינארית",
    description: "מקדם מתאם r, ישר ניבוי ŷ = a + bx, ניבוי ערכים והגבלותיו",
    exercises: [
      "חישוב שיפוע ישר רגרסיה מנתונים סטטיסטיים",
      "פרשנות מקדם המתאם — מתי r חזק ומתי חלש?",
      "ניבוי מחוץ לטווח (אקסטרפולציה) — למה זה מסוכן?",
    ],
    color: "cyan",
  },
  {
    id: "normal",
    symbol: "🔔",
    title: "התפלגות נורמלית",
    description: "ציון תקן z, אחוזונים, טבלת z, כלל 68-95-99.7",
    exercises: [
      "ציון תקן — חישוב z ומציאת אחוזון",
      "אחוז תלמידים בין שני ציונים — שימוש בטבלת z",
      "השוואת שתי התפלגויות — מי ביצע טוב יותר יחסית?",
    ],
    color: "rose",
    href: "/topic/probability/normal",
  },
];

const COLOR = {
  cyan: { bg: "bg-cyan-950/40", border: "border-cyan-800/50", text: "text-cyan-400", sym: "bg-cyan-900/60 text-cyan-200" },
  rose: { bg: "bg-rose-950/40", border: "border-rose-800/50", text: "text-rose-400", sym: "bg-rose-900/60 text-rose-200" },
};

export default function StatisticsHub() {
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
          <h1 className="text-4xl font-extrabold">סטטיסטיקה</h1>
          <p className="text-slate-400 text-lg">מדדי מרכז ופיזור — הסתכל על הנתונים נכון</p>
        </div>

        <p className="text-slate-400 text-center text-sm">בחר נושא-משנה להתחיל</p>

        <div className="space-y-4">
          {SUBTOPICS.map((s) => {
            const c = COLOR[s.color as keyof typeof COLOR];
            return (
              <Link
                key={s.id}
                href={s.href ?? `/topic/statistics/${s.id}`}
                className={`block rounded-2xl border p-6 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${c.bg} ${c.border}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 font-bold text-2xl font-serif ${c.sym}`}>
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
