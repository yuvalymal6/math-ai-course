"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Eye, EyeOff, ChevronRight, Wrench } from "lucide-react";
import Link from "next/link";

// ─── Wizard data (same as /wizard) ───────────────────────────────────────────

type Grade = "י" | "יא" | "יב";

const GRADES: { id: Grade; label: string }[] = [
  { id: "י",  label: 'כיתה י׳' },
  { id: "יא", label: 'כיתה י"א' },
  { id: "יב", label: 'כיתה י"ב' },
];

const TOPICS: Record<Grade, { label: string; slug: string | null }[]> = {
  "י": [
    { label: "טכניקה אלגברית", slug: "grade10/algebra" },
    { label: "גאומטריה", slug: "grade10/geometry" },
    { label: "טריגונומטריה", slug: "grade10/trig" },
  ],
  "יא": [
    { label: "חדו\"א", slug: "calculus" },
    { label: "בעיות קיצון", slug: "kitzun" },
    { label: "גיאומטריה אנליטית", slug: "analytic" },
    { label: "הסתברות", slug: "probability" },
    { label: "סטטיסטיקה", slug: "statistics" },
  ],
  "יב": [
    { label: "פונקציות מעריכיות ולוגריתמיות", slug: null },
    { label: "אינטגרלים", slug: null },
    { label: "וקטורים", slug: null },
    { label: "סדרות", slug: null },
    { label: "בדיקת השערות", slug: null },
  ],
};

// ─── Shared card button ───────────────────────────────────────────────────────

function Card({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-right px-5 py-4 rounded-xl border font-medium text-base transition-all duration-200 group bg-slate-800/60 border-slate-700 text-slate-300 hover:border-[#00d4ff]/60 hover:text-white hover:bg-slate-800"
    >
      <span className="flex items-center justify-between">
        {label}
        <ChevronRight
          size={16}
          className="text-slate-600 group-hover:text-[#00d4ff] group-hover:-translate-x-0.5 transition-all duration-200"
        />
      </span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type WizardStep = "grade" | "topic" | "coming-soon";

export default function AuthPage() {
  const router = useRouter();

  // Auth step
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  // Wizard step (shown after auth)
  const [wizardStep, setWizardStep] = useState<WizardStep>("grade");
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [animating, setAnimating] = useState(false);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 2) { setAuthError("שם המשתמש חייב להכיל לפחות 2 תווים"); return; }
    if (password.length < 6)        { setAuthError("הסיסמה חייבת להכיל לפחות 6 תווים"); return; }
    setAuthError("");
    setAuthStep(2);
  };

  const transition = (fn: () => void) => {
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 180);
  };

  const handleGrade = (grade: Grade) => {
    if (grade === "י") {
      router.push("/");
      return;
    }
    if (grade === "יא") {
      router.push("/");
      return;
    }
    if (grade === "יב") {
      router.push("/");
      return;
    }
    setSelectedGrade(grade);
    transition(() => setWizardStep("topic"));
  };

  const handleTopic = (slug: string | null) => {
    if (slug) {
      router.push(`/topic/${slug}`);
    } else {
      transition(() => setWizardStep("coming-soon"));
    }
  };

  const goBack = () => {
    if (wizardStep === "topic")       transition(() => setWizardStep("grade"));
    if (wizardStep === "coming-soon") transition(() => setWizardStep("topic"));
  };

  // ── Step indicator dots ──
  const allSteps = ["auth", "grade", "topic"] as const;
  const currentDot = authStep === 1 ? 0 : wizardStep === "grade" ? 1 : 2;

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <span className="text-slate-500 text-sm">
            {authStep === 1 ? "יצירת חשבון" : "בחירת נושא"}
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {allSteps.map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i <= currentDot
                      ? "bg-[#00d4ff] shadow-[0_0_8px_#00d4ff]"
                      : "bg-slate-700"
                  }`}
                />
                {i < allSteps.length - 1 && (
                  <div className={`w-8 h-px transition-all duration-300 ${i < currentDot ? "bg-[#00d4ff]" : "bg-slate-700"}`} />
                )}
              </div>
            ))}
          </div>

          {/* ─── Auth step ─── */}
          {authStep === 1 && (
            <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-8">
              <div className="text-center space-y-2 mb-8">
                <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">שלב 1 מתוך 3</p>
                <h1 className="text-3xl font-extrabold text-white">יצירת חשבון</h1>
                <p className="text-slate-400">הצטרף לאלפי תלמידים שלומדים עם AI</p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-5">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">שם משתמש</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setAuthError(""); }}
                    placeholder="לדוגמה: david123"
                    dir="ltr"
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d4ff] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">סיסמה</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                      placeholder="לפחות 6 תווים"
                      dir="ltr"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d4ff] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {authError && <p className="text-red-400 text-sm">{authError}</p>}

                <button
                  type="submit"
                  className="w-full bg-[#00d4ff] hover:bg-[#00b8d9] text-[#0f172a] font-bold py-3 rounded-xl transition-all hover:scale-[1.02] text-base mt-2"
                >
                  המשך ←
                </button>
              </form>
            </div>
          )}

          {/* ─── Wizard steps ─── */}
          {authStep === 2 && (
            <div
              className={`transition-all duration-180 ${
                animating ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
              }`}
            >
              {/* Grade */}
              {wizardStep === "grade" && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">שלב 2 מתוך 3</p>
                    <h1 className="text-3xl font-extrabold text-white">באיזו כיתה אתה?</h1>
                    <p className="text-slate-400">נתאים את הנושאים בדיוק לרמה שלך</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    {GRADES.map((g) => (
                      <Card key={g.id} label={g.label} onClick={() => handleGrade(g.id)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Topic */}
              {wizardStep === "topic" && selectedGrade && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">שלב 3 מתוך 3</p>
                    <h1 className="text-3xl font-extrabold text-white">מה הנושא?</h1>
                    <p className="text-slate-400">{GRADES.find((g) => g.id === selectedGrade)?.label}</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    {TOPICS[selectedGrade].map((t) => (
                      <Card key={t.label} label={t.label} onClick={() => handleTopic(t.slug)} />
                    ))}
                  </div>
                  <button
                    onClick={goBack}
                    className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors flex items-center justify-center gap-1"
                  >
                    <ChevronRight size={14} className="rotate-180" />
                    חזרה
                  </button>
                </div>
              )}

              {/* Coming soon */}
              {wizardStep === "coming-soon" && (
                <div className="space-y-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto shadow-[0_0_40px_#00d4ff11]">
                    <Wrench size={36} className="text-[#00d4ff]" />
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-extrabold text-white">בקרוב...</h1>
                    <p className="text-slate-300 text-lg font-medium">אנחנו עובדים על זה! 🛠️</p>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                      הנושא הזה עדיין בפיתוח. הצטרף לרשימת ההמתנה וניידע אותך ברגע שיפתח.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/#waitlist"
                      className="bg-[#00d4ff] text-[#0f172a] font-bold px-6 py-3 rounded-full hover:bg-[#00b8d9] transition-all hover:scale-105 text-sm inline-block"
                    >
                      הצטרף לרשימת ההמתנה
                    </Link>
                    <button
                      onClick={goBack}
                      className="text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors flex items-center justify-center gap-1"
                    >
                      <ChevronRight size={14} className="rotate-180" />
                      חזרה לנושאים
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
