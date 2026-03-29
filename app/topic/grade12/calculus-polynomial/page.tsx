"use client";

import Link from "next/link";
import { Brain, ChevronRight, FunctionSquare, BarChart2, Sigma } from "lucide-react";

// ─── Sub-topic definitions ────────────────────────────────────────────────────

const SUBTOPICS = [
  {
    id: "investigation",
    href: "/topic/grade12/calculus-polynomial/investigation",
    icon: FunctionSquare,
    title: "חקירת קיצון וסיווג",
    subtitle: "סיווג נקודות קיצון באמצעות נגזרת שנייה • תחומי עלייה וירידה",
    description: "ניתוח התנהגות הפונקציה: מציאת נקודות קיצון, סיווגן על-ידי הנגזרת השנייה, וקביעת תחומי עלייה וירידה בצורה שיטתית.",
    chips: ["f′(x)=0", "f″ סיווג", "תחומי עלייה"],
    ready: true,
    iconBg: "bg-indigo-500/10", iconBorder: "border-indigo-500/30", iconText: "text-indigo-400",
    hoverBorder: "hover:border-indigo-500/60",
    badgeBg: "bg-indigo-500/10 border-indigo-500/30", badgeText: "text-indigo-400",
    chevronHover: "group-hover:text-indigo-400",
    glowAnim: true,
  },
  {
    id: "full-investigation",
    href: "/topic/grade12/calculus-polynomial/full-investigation",
    icon: BarChart2,
    title: "חקירה מלאה וגרפים",
    subtitle: "אלגוריתם הפתרון • ניתוח קעירות • סקיצה גרפית",
    description: "חקירה שיטתית מלאה: חקר התנהגות בקצוות, נקודות חיתוך, תחומי מונוטוניות, נקודות פיתול וניתוח קעירות — עד לסקיצה גרפית מלאה.",
    chips: ["אלגוריתם פתרון", "נקודת פיתול", "קעירות"],
    ready: true,
    iconBg: "bg-violet-500/10", iconBorder: "border-violet-500/30", iconText: "text-violet-400",
    hoverBorder: "hover:border-violet-500/50",
    badgeBg: "bg-violet-500/10 border-violet-500/30", badgeText: "text-violet-400",
    chevronHover: "group-hover:text-violet-400",
    glowAnim: false,
  },
  {
    id: "parameters",
    href: "/topic/grade12/calculus-polynomial/parameters",
    icon: Sigma,
    title: "בעיות פרמטרים ומשיקים",
    subtitle: "אסטרטגיות לבידוד פרמטרים • משוואת המשיק",
    description: "ניצול תנאי הקיצון לביסוס מערכת משוואות, בידוד פרמטרים עלומים, וחישוב משיק לגרף הפונקציה בנקודה נתונה.",
    chips: ["f′(x₀)=0", "פרמטר a", "משיק"],
    ready: true,
    iconBg: "bg-cyan-500/10", iconBorder: "border-cyan-500/30", iconText: "text-cyan-400",
    hoverBorder: "hover:border-cyan-500/60",
    badgeBg: "bg-cyan-500/10 border-cyan-500/30", badgeText: "text-cyan-400",
    chevronHover: "group-hover:text-cyan-400",
    glowAnim: false,
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculusPolynomialHub() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGlowIndigo { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); } 50% { box-shadow: 0 0 18px 4px rgba(99,102,241,0.18); } }
        .card-hover { transition: transform 0.18s ease, border-color 0.18s ease; }
        .card-hover:hover { transform: translateY(-3px); }
      `}</style>

      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link href="/topic/grade12/calculus" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" />
            חדו&quot;א
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-14 space-y-10">
        <div className="text-center space-y-3 animate-[fadeSlideIn_0.4s_ease_both]">
          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">כיתה י״ב • 4 יח&quot;ל</p>
          <h1 className="text-4xl font-extrabold">חדו&quot;א: פולינומים ונגזרות</h1>
          <p className="text-slate-400 text-sm">ביסוס יסודות החדו&quot;א לשאלון 482</p>
        </div>

        <div className="grid gap-5 animate-[fadeSlideIn_0.5s_ease_both]">
          {SUBTOPICS.map((sub) => {
            const Icon = sub.icon;

            if (!sub.ready) {
              return (
                <div key={sub.id} className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 opacity-50 cursor-not-allowed select-none">
                  <div className="flex items-start gap-5">
                    <div className={`w-12 h-12 rounded-xl ${sub.iconBg} border ${sub.iconBorder} flex items-center justify-center shrink-0`}>
                      <Icon size={22} className={sub.iconText} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h2 className="text-white font-bold text-xl">{sub.title}</h2>
                        <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-2 py-0.5">בקרוב</span>
                      </div>
                      <p className={`text-xs font-medium mb-2 ${sub.iconText}`}>{sub.subtitle}</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{sub.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {sub.chips.map(chip => (
                          <span key={chip} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{chip}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={sub.id}
                href={sub.href}
                className={`card-hover block bg-[#0f172a] border border-slate-700 ${sub.hoverBorder} rounded-2xl p-6 group`}
                style={sub.glowAnim ? { animation: "pulseGlowIndigo 3s ease-in-out infinite" } : undefined}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl ${sub.iconBg} border ${sub.iconBorder} flex items-center justify-center shrink-0 group-hover:opacity-90 transition-opacity`}>
                    <Icon size={22} className={sub.iconText} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h2 className="text-white font-bold text-xl">{sub.title}</h2>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sub.badgeBg} border ${sub.badgeText}`}>
                        תרגול
                      </span>
                    </div>
                    <p className={`text-xs font-medium mb-2 ${sub.iconText}`}>{sub.subtitle}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{sub.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {sub.chips.map(chip => (
                        <span key={chip} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{chip}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} className={`text-slate-600 ${sub.chevronHover} transition-colors shrink-0 mt-1`} />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-slate-800 pt-6 flex justify-center">
          <Link
            href="/topic/grade12/calculus"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </main>
    </div>
  );
}
