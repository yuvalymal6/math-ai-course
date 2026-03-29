"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Brain, Wrench } from "lucide-react";
import Link from "next/link";

type Grade = 'י' | 'יא' | 'יב';

const GRADES: { id: Grade; label: string }[] = [
  { id: 'י', label: 'כיתה י׳' },
  { id: 'יא', label: 'כיתה י"א' },
  { id: 'יב', label: 'כיתה י"ב' },
];

const TOPICS: Record<Grade, { label: string; slug: string | null }[]> = {
  'י': [
    { label: 'טכניקה אלגברית', slug: 'grade10/algebra' },
    { label: 'גאומטריה', slug: 'grade10/geometry' },
    { label: 'טריגונומטריה', slug: 'grade10/trig' },
  ],
  'יא': [
    { label: 'חדו"א', slug: 'calculus' },
    { label: 'בעיות קיצון', slug: 'kitzun' },
    { label: 'גיאומטריה אנליטית', slug: 'analytic' },
    { label: 'הסתברות', slug: 'probability' },
    { label: 'סטטיסטיקה', slug: 'statistics' },
  ],
  'יב': [
    { label: 'פונקציות מעריכיות ולוגריתמיות', slug: null },
    { label: 'אינטגרלים', slug: null },
    { label: 'וקטורים', slug: null },
    { label: 'סדרות', slug: null },
    { label: 'בדיקת השערות', slug: null },
  ],
};

type Step = 'grade' | 'topic' | 'coming-soon';

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ['grade', 'topic'];
  const currentIndex = steps.indexOf(step === 'coming-soon' ? 'topic' : step);
  return (
    <div className="flex items-center gap-2 justify-center mb-10">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i <= currentIndex
                ? 'bg-[#00d4ff] shadow-[0_0_8px_#00d4ff]'
                : 'bg-slate-700'
            }`}
          />
          {i < steps.length - 1 && (
            <div className={`w-8 h-px transition-all duration-300 ${i < currentIndex ? 'bg-[#00d4ff]' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Card({
  label,
  onClick,
  selected,
}: {
  label: string;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-right px-5 py-4 rounded-xl border font-medium text-base transition-all duration-200 group
        ${
          selected
            ? 'bg-[#00d4ff]/15 border-[#00d4ff] text-white shadow-[0_0_16px_#00d4ff22]'
            : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-[#00d4ff]/60 hover:text-white hover:bg-slate-800'
        }`}
    >
      <span className="flex items-center justify-between">
        {label}
        <ChevronRight
          size={16}
          className={`transition-all duration-200 ${
            selected ? 'text-[#00d4ff]' : 'text-slate-600 group-hover:text-[#00d4ff] group-hover:translate-x-[-2px]'
          }`}
        />
      </span>
    </button>
  );
}

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('grade');
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [animating, setAnimating] = useState(false);

  const transition = (fn: () => void) => {
    setAnimating(true);
    setTimeout(() => {
      fn();
      setAnimating(false);
    }, 180);
  };

  const handleGrade = (grade: Grade) => {
    if (grade === 'י') {
      router.push('/topic/grade10');
      return;
    }
    if (grade === 'יא') {
      router.push('/topic/grade11');
      return;
    }
    if (grade === 'יב') {
      router.push('/topic/grade12');
      return;
    }
    setSelectedGrade(grade);
    transition(() => setStep('topic'));
  };

  const handleTopic = (slug: string | null) => {
    if (slug) {
      router.push(`/topic/${slug}`);
    } else {
      transition(() => setStep('coming-soon'));
    }
  };

  const goBack = () => {
    if (step === 'topic') transition(() => setStep('grade'));
    if (step === 'coming-soon') transition(() => setStep('topic'));
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <span className="text-slate-500 text-sm">מצא את הנושא שלך</span>
        </div>
      </header>

      {/* Wizard body */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <ProgressDots step={step} />

          <div
            className={`transition-all duration-180 ${
              animating ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
            }`}
          >
            {/* Step 1 — Grade */}
            {step === 'grade' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">שלב 1 מתוך 2</p>
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

            {/* Step 2 — Topic */}
            {step === 'topic' && selectedGrade && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">שלב 2 מתוך 2</p>
                  <h1 className="text-3xl font-extrabold text-white">מה הנושא?</h1>
                  <p className="text-slate-400">
                    {GRADES.find((g) => g.id === selectedGrade)?.label}
                  </p>
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
            {step === 'coming-soon' && (
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
        </div>
      </div>
    </div>
  );
}
