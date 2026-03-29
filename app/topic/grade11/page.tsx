"use client";

import Link from "next/link";
import { Brain, ChevronRight, TrendingUp, Circle, Maximize2, GitBranch, BarChart2 } from "lucide-react";

const HUBS = [
  {
    id: "calculus",
    href: "/topic/calculus",
    title: 'חדו"א',
    subtitle: "פולינומים • רציונליות • שורש",
    description: 'חקירת פונקציות שלמה: מונוטוניות, קיצוניים, נקודות מפנה, אסימפטוטות ונגזרת בכלל השרשרת.',
    icon: TrendingUp,
    chips: ["f′(x)=0 → קיצון", "אסימפטוטות", "נקודות מפנה"],
    subtopics: 3,
    color: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      hoverBorder: "hover:border-blue-500/60",
      text: "text-blue-400",
    },
  },
  {
    id: "analytic",
    href: "/topic/analytic",
    title: "גיאומטריה אנליטית",
    subtitle: "קו ישר • מעגל • משיק",
    description: "משוואת קו ישר, מרחק נקודה מקו, משוואת מעגל ומשיקים מנקודה חיצונית.",
    icon: Circle,
    chips: ["y=mx+b", "x²+y²=r²", "נקודת חיתוך"],
    subtopics: 3,
    color: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      hoverBorder: "hover:border-orange-500/60",
      text: "text-orange-400",
    },
  },
  {
    id: "kitzun",
    href: "/topic/kitzun",
    title: "בעיות קיצון",
    subtitle: "גיאומטריה מישורית • פונקציות",
    description: "מקסימום שטח, מינימום מרחק ואילוצים — שיטת הנגזרת לפתרון בעיות אופטימיזציה.",
    icon: Maximize2,
    chips: ["f′(x)=0", "הגדרת האילוץ", "בדיקת קצוות"],
    subtopics: 2,
    color: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      hoverBorder: "hover:border-amber-500/60",
      text: "text-amber-400",
    },
  },
  {
    id: "probability",
    href: "/topic/probability",
    title: "הסתברות",
    subtitle: "עץ הסתברות • טבלה דו-ממדית",
    description: "הסתברות מותנית, עץ החלטה, טבלאות תדרים ומשפט בייס — עם דוגמאות מבגרות.",
    icon: GitBranch,
    chips: ["P(A|B)", "עץ הסתברות", "הסתברות מותנית"],
    subtopics: 2,
    color: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      hoverBorder: "hover:border-purple-500/60",
      text: "text-purple-400",
    },
  },
  {
    id: "statistics",
    href: "/topic/statistics",
    title: "סטטיסטיקה",
    subtitle: "מדדי מרכז • מדדי פיזור",
    description: "ממוצע, חציון ושכיח; שונות וסטיית תקן; השפעת שינוי לינארי על הנתונים.",
    icon: BarChart2,
    chips: ["ממוצע וחציון", "סטיית תקן", "שינוי לינארי"],
    subtopics: 2,
    color: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      hoverBorder: "hover:border-rose-500/60",
      text: "text-rose-400",
    },
  },
];

export default function Grade11Hub() {
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
          <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">כיתה י&quot;א • 4 יח&quot;ל</p>
          <h1 className="text-4xl font-extrabold">מרכז הלמידה — כיתה י&quot;א</h1>
          <p className="text-slate-400 text-sm">בחר תחום להתחיל</p>
        </div>

        <div className="grid gap-4 animate-[fadeSlideIn_0.5s_ease_both]">
          {HUBS.map((hub, i) => {
            const Icon = hub.icon;
            return (
              <Link
                key={hub.id}
                href={hub.href}
                className={`card-hover block bg-[#0f172a] border border-slate-700 ${hub.color.hoverBorder} rounded-2xl p-6 group`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl ${hub.color.bg} border ${hub.color.border} flex items-center justify-center shrink-0 transition-colors`}>
                    <Icon size={22} className={hub.color.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h2 className="text-white font-bold text-xl">{hub.title}</h2>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hub.color.bg} border ${hub.color.border} ${hub.color.text}`}>
                        {hub.subtopics} נושאים
                      </span>
                    </div>
                    <p className={`text-xs font-medium mb-2 ${hub.color.text}`}>{hub.subtitle}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{hub.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {hub.chips.map(chip => (
                        <span key={chip} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{chip}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} className={`text-slate-600 group-hover:${hub.color.text} transition-colors shrink-0 mt-1`} />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-slate-800 pt-6 flex justify-center">
          <Link href="/wizard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ChevronRight size={14} className="rotate-180" />
            בחר כיתה
          </Link>
        </div>
      </main>
    </div>
  );
}
