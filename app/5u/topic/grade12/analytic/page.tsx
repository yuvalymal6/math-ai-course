"use client";

import Link from "next/link";
import { Brain, ChevronRight, Circle, MapPin } from "lucide-react";

const SUBTOPICS = [
  {
    id: "circle-ellipse",
    href: "/5u/topic/grade12/analytic/circle-ellipse",
    icon: Circle,
    title: "מעגל ואליפסה",
    subtitle: "משוואת מעגל • אליפסה • מוקדים",
    description: "משוואת מעגל בצורה כללית וקנונית, אליפסה — צירים, מוקדים, אקסצנטריות ומשיקים.",
    chips: ["(x−a)²+(y−b)²=r²", "x²/a²+y²/b²=1", "מוקדים"],
    ready: true,
    glowAnim: false,
    iconBg: "bg-blue-500/10", iconBorder: "border-blue-500/30", iconText: "text-blue-400",
    hoverBorder: "hover:border-blue-500/50",
    badgeBg: "bg-blue-500/10 border-blue-500/30", badgeText: "text-blue-400",
    chevronHover: "group-hover:text-blue-400",
  },
  {
    id: "loci",
    href: "/5u/topic/grade12/analytic/loci",
    icon: MapPin,
    title: "מקומות גיאומטריים",
    subtitle: "אנך אמצעי • חוצה זווית • מקום הנדסי",
    description: "מציאת מקום גיאומטרי של נקודות המקיימות תנאי נתון — אנך אמצעי, חוצה זווית, מעגל אפולוניוס.",
    chips: ["מקום גיאומטרי", "אנך אמצעי", "אפולוניוס"],
    ready: true,
    glowAnim: false,
    iconBg: "bg-violet-500/10", iconBorder: "border-violet-500/30", iconText: "text-violet-400",
    hoverBorder: "hover:border-violet-500/50",
    badgeBg: "bg-violet-500/10 border-violet-500/30", badgeText: "text-violet-400",
    chevronHover: "group-hover:text-violet-400",
  },
] as const;

export default function Analytic5UHub() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .card-hover { transition: transform 0.18s ease, border-color 0.18s ease; }
        .card-hover:hover { transform: translateY(-3px); }
      `}</style>
      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" />כיתה י״ב • 5 יח&quot;ל
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-14 space-y-10">
        <div className="text-center space-y-3 animate-[fadeSlideIn_0.4s_ease_both]">
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest">כיתה י״ב • 5 יח&quot;ל</p>
          <h1 className="text-4xl font-extrabold">גיאומטריה אנליטית</h1>
          <p className="text-slate-400 text-sm">מעגל ואליפסה • מקומות גיאומטריים</p>
        </div>
        <div className="grid gap-5 animate-[fadeSlideIn_0.5s_ease_both]">
          {SUBTOPICS.map((sub) => {
            const Icon = sub.icon;
            if (!sub.ready) {
              return (
                <div key={sub.id} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 opacity-50 cursor-not-allowed select-none">
                  <div className="flex items-start gap-5">
                    <div className={`w-12 h-12 rounded-xl ${sub.iconBg} border ${sub.iconBorder} flex items-center justify-center shrink-0`}><Icon size={22} className={sub.iconText} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5"><h2 className="text-white font-bold text-xl">{sub.title}</h2><span className="text-[10px] text-slate-500 border border-slate-700 rounded px-2 py-0.5">בקרוב</span></div>
                      <p className={`text-xs font-medium mb-2 ${sub.iconText}`}>{sub.subtitle}</p>
                      <p className="text-slate-400 text-sm leading-relaxed mb-3">{sub.description}</p>
                      <div className="flex flex-wrap gap-2">{sub.chips.map(c => <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500">{c}</span>)}</div>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <Link key={sub.id} href={sub.href} className={`card-hover block bg-[#0f172a] border border-slate-700 ${sub.hoverBorder} rounded-2xl p-6 group`}>
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl ${sub.iconBg} border ${sub.iconBorder} flex items-center justify-center shrink-0`}><Icon size={22} className={sub.iconText} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5"><h2 className="text-white font-bold text-xl">{sub.title}</h2><span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sub.badgeBg} ${sub.badgeText}`}>תרגול</span></div>
                    <p className={`text-xs font-medium mb-2 ${sub.iconText}`}>{sub.subtitle}</p>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">{sub.description}</p>
                    <div className="flex flex-wrap gap-2">{sub.chips.map(c => <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{c}</span>)}</div>
                  </div>
                  <ChevronRight size={18} className={`text-slate-600 ${sub.chevronHover} transition-colors shrink-0 mt-1`} />
                </div>
              </Link>
            );
          })}
        </div>
        <div className="border-t border-slate-800 pt-6 flex justify-center">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}>
            <span style={{ fontSize: 16 }}>←</span>חזרה
          </Link>
        </div>
      </main>
    </div>
  );
}
