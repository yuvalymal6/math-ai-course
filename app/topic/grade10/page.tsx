"use client";

import Link from "next/link";
import { Brain, ChevronRight, FunctionSquare, Square, Triangle, BarChart2, Compass } from "lucide-react";

const HUBS = [
  {
    id: "algebra",
    href: "/topic/grade10/algebra-parabola",
    title: "חקירת פרבולה",
    subtitle: "",
    description: "חקירת פרבולה עם גרף אינטראקטיבי.",
    icon: FunctionSquare,
    topics: 1,
    chips: ["פרבולה"],
    color: {
      accent: "#34d399",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      hoverBorder: "hover:border-emerald-500/60",
      text: "text-emerald-400",
      pulse: "rgba(52,211,153,0.18)",
    },
  },
  {
    id: "analytic",
    href: "/topic/grade10/analytic",
    title: "גאומטריה אנליטית",
    subtitle: "",
    description: "נקודת אמצע, מרחק, שיפוע, משוואת קו — ומשוואת מעגל, השלמה לריבוע ומשיקים.",
    icon: Compass,
    topics: 3,
    chips: ["קו ישר", "מעגל", "משיקים"],
    color: {
      accent: "#fb923c",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      hoverBorder: "hover:border-orange-500/60",
      text: "text-orange-400",
      pulse: "rgba(251,146,60,0.18)",
    },
  },
  {
    id: "geometry",
    href: "/topic/grade10/geometry",
    title: "גאומטריה",
    subtitle: "",
    description: "הוכחות ותכונות של מקבילית, מלבן, מעוין וריבוע — אלכסונים, זוויות וחפיפת משולשים.",
    icon: Square,
    topics: 2,
    chips: ["מקבילית ומלבן", "מעוין וריבוע"],
    color: {
      accent: "#a78bfa",
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      hoverBorder: "hover:border-violet-500/60",
      text: "text-violet-400",
      pulse: "rgba(139,92,246,0.18)",
    },
  },
  {
    id: "trig",
    href: "/topic/grade10/trig",
    title: "טריגונומטריה",
    subtitle: "",
    description: "יחסי הצלעות במשולש ישר-זווית עם משולש אינטראקטיבי, ובעיות מעשיות מהעולם האמיתי.",
    icon: Triangle,
    topics: 2,
    chips: ["SIN-COS-TAN", "יישומים"],
    color: {
      accent: "#00d4ff",
      bg: "bg-[#00d4ff]/10",
      border: "border-[#00d4ff]/30",
      hoverBorder: "hover:border-[#00d4ff]/60",
      text: "text-[#00d4ff]",
      pulse: "rgba(0,212,255,0.18)",
    },
  },
  {
    id: "statistics",
    href: "/topic/grade10/statistics",
    title: "סטטיסטיקה",
    subtitle: "",
    description: "ממוצע, חציון, שכיח — ומדדי הפיזור: טווח, סטיית תקן ושינויים לינאריים.",
    icon: BarChart2,
    topics: 2,
    chips: ["מדדי מרכז", "מדדי פיזור"],
    color: {
      accent: "#f43f5e",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      hoverBorder: "hover:border-rose-500/60",
      text: "text-rose-400",
      pulse: "rgba(244,63,94,0.18)",
    },
  },
];

export default function Grade10Hub() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .card-hover { transition: transform 0.2s ease, border-color 0.2s ease; }
        .card-hover:hover { transform: translateY(-3px); }
      `}</style>

      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link href="/wizard" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" />
            בחר כיתה
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-14 space-y-10">
        <div className="text-center space-y-3 animate-[fadeSlideIn_0.4s_ease_both]">
          <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">כיתה י׳ • 4 יח&quot;ל</p>
          <h1 className="text-4xl font-extrabold">מרכז הלמידה — כיתה י׳</h1>
          <p className="text-slate-400 text-sm">בחר תחום להתחיל</p>
        </div>

        <div className="grid gap-5 animate-[fadeSlideIn_0.5s_ease_both]">
          {HUBS.map((hub) => {
            const Icon = hub.icon;
            return (
              <Link
                key={hub.id}
                href={hub.href}
                className={`card-hover block bg-[#0f172a] border border-slate-700 ${hub.color.hoverBorder} rounded-2xl p-6 group`}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl ${hub.color.bg} border ${hub.color.border} flex items-center justify-center shrink-0 transition-colors`}>
                    <Icon size={22} className={hub.color.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h2 className="text-white font-bold text-xl">{hub.title}</h2>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hub.color.bg} border ${hub.color.border} ${hub.color.text}`}>
                        {hub.topics === 1 ? "נושא 1" : `${hub.topics} נושאים`}
                      </span>
                    </div>
                    {hub.subtitle && <p className={`text-xs font-medium mb-2 ${hub.color.text}`}>{hub.subtitle}</p>}
                    <p className="text-slate-400 text-sm leading-relaxed">{hub.description}</p>
                    {hub.chips.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-3 justify-start w-full">
                        {hub.chips.map(chip => (
                          <span key={chip} className={`text-xs font-bold px-3 py-1 rounded-lg ${hub.color.bg} border ${hub.color.border} ${hub.color.text}`} style={{ boxShadow: `0 0 12px ${hub.color.pulse}` }}>{chip}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={18} className={`text-slate-600 group-hover:${hub.color.text} transition-colors shrink-0 mt-1`} />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-slate-800 pt-6 flex justify-center">
          <Link
            href="/wizard"
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
