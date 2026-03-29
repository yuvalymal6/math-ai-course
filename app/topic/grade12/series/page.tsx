"use client";

import Link from "next/link";
import { Brain, ChevronRight, TrendingUp, GitMerge } from "lucide-react";

// ─── Sub-topic definitions ────────────────────────────────────────────────────

const SUBTOPICS = [
  {
    id: "arithmetic",
    href: "/topic/grade12/series-arithmetic",
    icon: TrendingUp,
    title: "סדרה חשבונית",
    subtitle: "הפרש קבוע • aₙ • Sₙ • שתי משוואות",
    description: "הפרש קבוע d בין איברים עוקבים. גזירת האיבר הכללי aₙ, חישוב סכום n האיברים הראשונים Sₙ, ופתרון בעיות עם שתי משוואות.",
    chips: ["aₙ = a₁+(n−1)d", "Sₙ = n(a₁+aₙ)/2", "שתי משוואות"],
    ready: true,
    glowAnim: true,
    iconBg: "bg-amber-500/10", iconBorder: "border-amber-500/30", iconText: "text-amber-400",
    hoverBorder: "hover:border-amber-500/60",
    badgeBg: "bg-amber-500/10 border-amber-500/30", badgeText: "text-amber-400",
    chevronHover: "group-hover:text-amber-400",
  },
  {
    id: "geometric",
    href: "/topic/grade12/series-geometric",
    icon: GitMerge,
    title: "סדרה הנדסית",
    subtitle: "מנה קבועה • aₙ • Sₙ • ריבית דריבית",
    description: "מנה קבועה q בין איברים עוקבים. גזירת האיבר הכללי aₙ, חישוב סכום Sₙ, ויישום בבעיות ריבית דריבית ומינוי.",
    chips: ["aₙ = a₁·qⁿ⁻¹", "Sₙ = a₁(1−qⁿ)/(1−q)", "ריבית דריבית"],
    ready: true,
    glowAnim: false,
    iconBg: "bg-amber-400/10", iconBorder: "border-amber-400/30", iconText: "text-amber-300",
    hoverBorder: "hover:border-amber-400/60",
    badgeBg: "bg-amber-400/10 border-amber-400/30", badgeText: "text-amber-300",
    chevronHover: "group-hover:text-amber-300",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeriesHub() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGlowAmber { 0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); } 50% { box-shadow: 0 0 20px 5px rgba(251,191,36,0.15); } }
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
          <Link href="/topic/grade12" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" />
            כיתה י״ב
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-14 space-y-10">

        {/* ── Hero ── */}
        <div className="text-center space-y-3 animate-[fadeSlideIn_0.4s_ease_both]">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">כיתה י״ב • 4 יח&quot;ל</p>
          <h1 className="text-4xl font-extrabold">סדרות</h1>
          <p className="text-slate-400 text-sm">חשבונית • הנדסית • כלל נסיגה</p>
        </div>

        {/* ── Sub-topic cards ── */}
        <div className="grid gap-5 animate-[fadeSlideIn_0.5s_ease_both]">
          {SUBTOPICS.map((sub) => {
            const Icon = sub.icon;

            // ── Coming-soon card ──
            if (!sub.ready) {
              return (
                <div
                  key={sub.id}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 opacity-50 cursor-not-allowed select-none"
                >
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
                      <p className="text-slate-400 text-sm leading-relaxed mb-3">{sub.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {sub.chips.map(chip => (
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
                key={sub.id}
                href={sub.href}
                className={`card-hover block bg-[#0f172a] border border-slate-700 ${sub.hoverBorder} rounded-2xl p-6 group`}
                style={sub.glowAnim ? { animation: "pulseGlowAmber 3s ease-in-out infinite" } : undefined}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl ${sub.iconBg} border ${sub.iconBorder} flex items-center justify-center shrink-0 group-hover:opacity-90 transition-opacity`}>
                    <Icon size={22} className={sub.iconText} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h2 className="text-white font-bold text-xl">{sub.title}</h2>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-opacity-10 border ${sub.badgeBg} ${sub.badgeText}`}>
                        תרגול
                      </span>
                    </div>
                    <p className={`text-xs font-medium mb-2 ${sub.iconText}`}>{sub.subtitle}</p>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">{sub.description}</p>
                    <div className="flex flex-wrap gap-2">
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

        {/* ── Footer link ── */}
        <div className="border-t border-slate-800 pt-6 flex justify-center">
          <Link
            href="/topic/grade12"
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
