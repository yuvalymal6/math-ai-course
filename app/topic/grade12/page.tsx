"use client";

import Link from "next/link";
import {
  Brain, ChevronRight,
  TrendingUp, FunctionSquare, Box, Activity,
} from "lucide-react";

// ─── Section definitions ───────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "series",
    href: "/topic/grade12/series",
    icon: TrendingUp,
    title: "סדרות",
    subtitle: "חשבונית • הנדסית • כלל נסיגה",
    description: "נוסחאות לאיבר הכללי aₙ וסכום Sₙ, פתרון משוואות ויישומים בבעיות מעשיות — כולל ניתוח כלל נסיגה.",
    chips: ["aₙ = a₁+(n−1)d", "Sₙ = n(a₁+aₙ)/2", "aₙ = a₁·qⁿ⁻¹"],
    subTopics: [
      { label: "סדרה חשבונית", ready: true },
      { label: "סדרה הנדסית",  ready: true },
      { label: "כלל נסיגה",   ready: false },
    ],
    ready: true,
    glowAnim: "pulseGlowAmber",
    iconBg: "bg-amber-500/10", iconBorder: "border-amber-500/30", iconText: "text-amber-400",
    hoverBorder: "hover:border-amber-500/60",
    badgeBg: "bg-amber-500/10 border-amber-500/30", badgeText: "text-amber-400",
    chevronHover: "group-hover:text-amber-400",
  },
  {
    id: "geometry-space",
    href: "/topic/grade12/space-geometry",
    icon: Box,
    title: "גאומטריה במרחב",
    subtitle: "תיבה • פירמידה",
    description: "חישוב נפחים, שטחים ואלכסונים של גופים תלת-ממדיים — תיבה, פירמידה ויישומים גיאומטריים.",
    chips: ["V = a·b·c", "V = ⅓Bh", "√(a²+b²+c²)"],
    subTopics: [
      { label: "תיבה",    ready: false },
      { label: "פירמידה", ready: false },
    ],
    ready: true,
    glowAnim: null,
    iconBg: "bg-emerald-500/10", iconBorder: "border-emerald-500/30", iconText: "text-emerald-400",
    hoverBorder: "hover:border-emerald-500/50",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30", badgeText: "text-emerald-400",
    chevronHover: "group-hover:text-emerald-400",
  },
  {
    id: "growth-decay",
    href: "/topic/grade12/growth-decay",
    icon: Activity,
    title: "גדילה ודעיכה",
    subtitle: "בעיות מילוליות מעריכיות",
    description: "מודלים מעריכיים לגדילה ודעיכה: בידוד פרמטרים, ניתוח בעיות מילוליות וחיזוי כמותי.",
    chips: ["N(t) = N₀·aᵗ", "T½ = ln2/λ", "כפלה"],
    subTopics: [
      { label: "בעיות מילוליות מעריכיות", ready: false },
    ],
    ready: true,
    glowAnim: null,
    iconBg: "bg-rose-500/10", iconBorder: "border-rose-500/30", iconText: "text-rose-400",
    hoverBorder: "hover:border-rose-500/50",
    badgeBg: "bg-rose-500/10 border-rose-500/30", badgeText: "text-rose-400",
    chevronHover: "group-hover:text-rose-400",
  },
  {
    id: "calculus",
    href: "/topic/grade12/calculus",
    icon: FunctionSquare,
    title: 'חדו"א',
    subtitle: "פולינומים • eˣ • ln x • אינטגרלים",
    description: "חקירת פונקציות פולינום, פונקציות מעריכיות ולוגריתמיות ויסוד החשבון האינטגרלי.",
    chips: ["f′(x) = 0", "eˣ · ln x", "∫f(x)dx"],
    subTopics: [
      { label: "פולינומים",                 ready: true  },
      { label: "פונקציות מעריכיות eˣ",     ready: false },
      { label: "פונקציות לוגריתמיות ln x", ready: false },
      { label: "חשבון אינטגרלי",            ready: false },
    ],
    ready: true,
    glowAnim: "pulseGlowIndigo",
    iconBg: "bg-indigo-500/10", iconBorder: "border-indigo-500/30", iconText: "text-indigo-400",
    hoverBorder: "hover:border-indigo-500/60",
    badgeBg: "bg-indigo-500/10 border-indigo-500/30", badgeText: "text-indigo-400",
    chevronHover: "group-hover:text-indigo-400",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Grade12Hub() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGlowAmber  { 0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0);   } 50% { box-shadow: 0 0 20px 5px rgba(251,191,36,0.15);  } }
        @keyframes pulseGlowIndigo { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0);   } 50% { box-shadow: 0 0 20px 5px rgba(99,102,241,0.15);   } }
        .card-hover { transition: transform 0.18s ease, border-color 0.18s ease; }
        .card-hover:hover { transform: translateY(-3px); }
      `}</style>

      {/* ── Header ── */}
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

        {/* ── Hero ── */}
        <div className="text-center space-y-3 animate-[fadeSlideIn_0.4s_ease_both]">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">כיתה י״ב • 4 יח&quot;ל</p>
          <h1 className="text-4xl font-extrabold">מרכז הלמידה — כיתה י״ב</h1>
          <p className="text-slate-400 text-sm">בחר תחום ללימוד</p>
        </div>

        {/* ── Section cards ── */}
        <div className="grid gap-5 animate-[fadeSlideIn_0.5s_ease_both]">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;

            // ── Coming-soon card ──
            if (!sec.ready) {
              return (
                <div
                  key={sec.id}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 opacity-50 cursor-not-allowed select-none"
                >
                  <div className="flex items-start gap-5">
                    <div className={`w-12 h-12 rounded-xl ${sec.iconBg} border ${sec.iconBorder} flex items-center justify-center shrink-0`}>
                      <Icon size={22} className={sec.iconText} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h2 className="text-white font-bold text-xl">{sec.title}</h2>
                        <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-2 py-0.5">בקרוב</span>
                      </div>
                      <p className={`text-xs font-medium mb-2 ${sec.iconText}`}>{sec.subtitle}</p>
                      <p className="text-slate-400 text-sm leading-relaxed mb-3">{sec.description}</p>

                      {/* Sub-topic pills */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {sec.subTopics.map(st => (
                          <span key={st.label} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-500">
                            {st.label}
                          </span>
                        ))}
                      </div>

                      {/* Formula chips */}
                      <div className="flex flex-wrap gap-2">
                        {sec.chips.map(chip => (
                          <span key={chip} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500">{chip}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Active card ──
            return (
              <Link
                key={sec.id}
                href={sec.href}
                className={`card-hover block bg-[#0f172a] border border-slate-700 ${sec.hoverBorder} rounded-2xl p-6 group`}
                style={sec.glowAnim ? { animation: `${sec.glowAnim} 3s ease-in-out infinite` } : undefined}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl ${sec.iconBg} border ${sec.iconBorder} flex items-center justify-center shrink-0 group-hover:opacity-90 transition-opacity`}>
                    <Icon size={22} className={sec.iconText} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h2 className="text-white font-bold text-xl">{sec.title}</h2>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-opacity-10 border ${sec.badgeBg} ${sec.badgeText}`}>
                        תרגול
                      </span>
                    </div>
                    <p className={`text-xs font-medium mb-2 ${sec.iconText}`}>{sec.subtitle}</p>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">{sec.description}</p>

                    {/* Sub-topic pills — ready vs coming-soon */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sec.subTopics.map(st => (
                        <span
                          key={st.label}
                          className={`text-[10px] px-2.5 py-1 rounded-full border ${
                            st.ready
                              ? `${sec.badgeBg} ${sec.badgeText}`
                              : "bg-slate-800/60 border-slate-700 text-slate-500"
                          }`}
                        >
                          {st.label}{!st.ready && " ·"}
                        </span>
                      ))}
                    </div>

                    {/* Formula chips */}
                    <div className="flex flex-wrap gap-2">
                      {sec.chips.map(chip => (
                        <span key={chip} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{chip}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} className={`text-slate-600 ${sec.chevronHover} transition-colors shrink-0 mt-1`} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Footer link ── */}
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
