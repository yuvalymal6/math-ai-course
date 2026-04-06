"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, BookOpen, ChevronLeft } from "lucide-react";

const UNITS = [
  {
    id: "3",
    label: "3 יחידות",
    description: "אלגברה, גיאומטריה, סטטיסטיקה והסתברות",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
    accent: "text-emerald-400",
    iconBg: "bg-emerald-900/50",
    ready: true,
  },
  {
    id: "4",
    label: "4 יחידות",
    description: 'חדו"א, גיאומטריה אנליטית, הסתברות, סדרות ואינטגרלים',
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30 hover:border-blue-400/60",
    glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
    accent: "text-blue-400",
    iconBg: "bg-blue-900/50",
    ready: true,
  },
  {
    id: "5",
    label: "5 יחידות",
    description: "חדו״א מורחב, אינדוקציה, מרוכבים, גיאומטריה מרחבית מתקדמת",
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
    accent: "text-violet-400",
    iconBg: "bg-violet-900/50",
    ready: false,
  },
];

export default function UnitsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const selectUnits = async (unitId: string) => {
    setLoading(unitId);
    try {
      const res = await fetch("/api/auth/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units: Number(unitId) }),
      });
      if (res.ok) {
        try { localStorage.setItem("math-units", unitId); } catch {}
        router.push("/");
        router.refresh();
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Brain size={20} className="text-[#00d4ff]" />
          <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center space-y-2 sm:space-y-3 mb-8 sm:mb-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 to-[#3b82f6]/20 border border-[#00d4ff]/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <BookOpen size={24} className="text-[#00d4ff]" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">כמה יחידות לימוד?</h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">נתאים את רמת הקושי והנושאים בדיוק עבורך</p>
          </div>

          {/* Unit cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {UNITS.map((u) => {
              if (!u.ready) {
                return (
                  <div
                    key={u.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 bg-gradient-to-br ${u.color} ${u.border} opacity-50 cursor-not-allowed select-none text-right w-full`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${u.iconBg} flex items-center justify-center mb-4`}>
                      <BookOpen size={22} className={u.accent} />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${u.accent}`}>{u.label}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-4">{u.description}</p>
                    <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-2 py-0.5">בקרוב</span>
                  </div>
                );
              }

              return (
                <button
                  key={u.id}
                  onClick={() => selectUnits(u.id)}
                  disabled={loading !== null}
                  className={`group relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 bg-gradient-to-br ${u.color} ${u.border} ${u.glow} text-right disabled:opacity-50 disabled:hover:scale-100 w-full`}
                >
                  <div className={`w-12 h-12 rounded-xl ${u.iconBg} flex items-center justify-center mb-4`}>
                    <BookOpen size={22} className={u.accent} />
                  </div>

                  <h3 className={`text-xl font-bold mb-2 ${u.accent}`}>{u.label}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4">{u.description}</p>

                  <div className={`flex items-center gap-1 text-xs font-medium ${u.accent} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <span>בחר יחידות</span>
                    <ChevronLeft size={14} />
                  </div>

                  {loading === u.id && (
                    <div className="absolute inset-0 bg-[#0a0f1e]/60 flex items-center justify-center rounded-2xl">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-center text-slate-600 text-xs mt-8">
            תוכל לשנות את הבחירה בכל עת מהגדרות הפרופיל
          </p>
        </div>
      </div>
    </div>
  );
}
