"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, GraduationCap, ChevronLeft } from "lucide-react";

const GRADES = [
  {
    id: "10",
    label: "כיתה י׳",
    description: "אלגברה, גיאומטריה, טריגונומטריה, סטטיסטיקה",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
    accent: "text-emerald-400",
    iconBg: "bg-emerald-900/50",
  },
  {
    id: "11",
    label: "כיתה י״א",
    description: 'חדו"א, גיאומטריה אנליטית, הסתברות, סטטיסטיקה',
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30 hover:border-blue-400/60",
    glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
    accent: "text-blue-400",
    iconBg: "bg-blue-900/50",
  },
  {
    id: "12",
    label: "כיתה י״ב",
    description: "סדרות, גדילה ודעיכה, גיאומטריה מרחבית, אינטגרלים",
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30 hover:border-violet-400/60",
    glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
    accent: "text-violet-400",
    iconBg: "bg-violet-900/50",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const selectGrade = async (gradeId: string) => {
    setLoading(gradeId);

    try {
      const res = await fetch("/api/auth/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: gradeId }),
      });

      if (res.ok) {
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

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center space-y-3 mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 to-[#3b82f6]/20 border border-[#00d4ff]/30 flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={28} className="text-[#00d4ff]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">באיזו כיתה אתה?</h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">נתאים את הנושאים והתרגילים בדיוק לרמה שלך</p>
          </div>

          {/* Grade cards — side by side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {GRADES.map((g) => (
              <button
                key={g.id}
                onClick={() => selectGrade(g.id)}
                disabled={loading !== null}
                className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 bg-gradient-to-br ${g.color} ${g.border} ${g.glow} text-right disabled:opacity-50 disabled:hover:scale-100`}
              >
                <div className={`w-12 h-12 rounded-xl ${g.iconBg} flex items-center justify-center mb-4`}>
                  <GraduationCap size={22} className={g.accent} />
                </div>

                <h3 className={`text-xl font-bold mb-2 ${g.accent}`}>{g.label}</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">{g.description}</p>

                <div className={`flex items-center gap-1 text-xs font-medium ${g.accent} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <span>בחר כיתה</span>
                  <ChevronLeft size={14} />
                </div>

                {loading === g.id && (
                  <div className="absolute inset-0 bg-[#0a0f1e]/60 flex items-center justify-center rounded-2xl">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <p className="text-center text-slate-600 text-xs mt-8">
            תוכל לשנות את הבחירה בכל עת מהגדרות הפרופיל
          </p>
        </div>
      </div>
    </div>
  );
}
