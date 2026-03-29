"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, ChevronRight, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";

// ─── Level 1 — Guiding (buttons) ─────────────────────────────────────────────

const L1_PROBLEM = "נתון כלל נסיגה:  a₁ = 1 ,  aₙ₊₁ = aₙ + 4\nחקור את הסדרה וקבע את נוסחת האיבר הכללי.";

type Choice = { text: string; correct: boolean };
type L1Step = { prompt: string; choices: Choice[]; hint: string };

const L1_STEPS: L1Step[] = [
  {
    prompt: "\n\nמהו סוג כלל הנסיגה?",
    choices: [
      { text: "חשבוני — הפרש קבוע d בין איברים עוקבים", correct: true },
      { text: "הנדסי — מנה קבועה q בין איברים עוקבים", correct: false },
      { text: "כלל כללי — אין דפוס קבוע", correct: false },
    ],
    hint: "כלל הנסיגה aₙ₊₁ = aₙ + 4 מוסיף את אותו קבוע בכל שלב — זהו הפרש קבוע d.",
  },
  {
    prompt: "\n\nמהו ההפרש d?",
    choices: [
      { text: "d = 1  (ערך a₁)", correct: false },
      { text: "d = 4  (הקבוע שמתווסף)", correct: true },
      { text: "d = 5  (a₁ + 4 = 5)", correct: false },
    ],
    hint: "d הוא הקבוע שמופיע בצד ימין של כלל הנסיגה — כאן d = 4.",
  },
  {
    prompt: "\n\nמהו ערך a₃?",
    choices: [
      { text: "a₃ = 7  (1 + 3 + 3)", correct: false },
      { text: "a₃ = 9  (a₂ + d = 5 + 4)", correct: true },
      { text: "a₃ = 12  (a₁ · d · 3)", correct: false },
    ],
    hint: "a₂ = a₁ + 4 = 5 ,  a₃ = a₂ + 4 = 9. הצב שלב אחר שלב.",
  },
  {
    prompt: "\n\nמהי נוסחת האיבר הכללי aₙ?",
    choices: [
      { text: "aₙ = n + 4", correct: false },
      { text: "aₙ = 4n + 1", correct: false },
      { text: "aₙ = 4n − 3", correct: true },
    ],
    hint: "aₙ = a₁ + (n−1)d = 1 + (n−1)·4 = 4n − 3.",
  },
];

// ─── Level 2 — Training (prompt + validation) ─────────────────────────────────

const L2_PROBLEM = "נתון כלל נסיגה:  a₁ = 2 ,  aₙ₊₁ = 3·aₙ\nנתח את הסדרה ומצא נוסחה סגורה לאיבר הכללי.";

const L2_CONTEXT_WORDS = ["נוסחת נסיגה", "איבר", "סדרה", "a1", "הצבה", "חישוב", "כלל", "רקורסיה"];

type L2Step = { prompt: string; placeholder: string; contextWords: string[]; coaching: string };

const L2_STEPS: L2Step[] = [
  {
    prompt: "\n\nזהה את סוג הסדרה ומצא את המנה q.",
    placeholder: "תאר ל-AI אילו פעולות תבצע כדי לזהות את סוג הסדרה ולחלץ את q...",
    contextWords: L2_CONTEXT_WORDS,
    coaching: "חקור את היחס בין איברים עוקבים: a₂/a₁ = 3·a₁/a₁ = 3. היחס קבוע — הסדרה הנדסית, q = 3.",
  },
  {
    prompt: "\n\nחשב את a₅ על-ידי שימוש חוזר בכלל הנסיגה.",
    placeholder: "תאר ל-AI כיצד תחשב כל איבר מהאיבר הקודם עד a₅...",
    contextWords: L2_CONTEXT_WORDS,
    coaching: "a₂ = 6, a₃ = 18, a₄ = 54, a₅ = 162. הצב צעד אחר צעד עד שתגיע ל-a₅.",
  },
  {
    prompt: "\n\nנסח את נוסחת האיבר הכללי aₙ.",
    placeholder: "כתוב את הנוסחה הסגורה של aₙ בעזרת a₁ ו-q...",
    contextWords: L2_CONTEXT_WORDS,
    coaching: "לסדרה הנדסית: aₙ = a₁·qⁿ⁻¹. הצב a₁ = 2 ו-q = 3 לקבלת aₙ = 2·3ⁿ⁻¹.",
  },
];

// ─── Level 3 — Mastery (80-char gate) ────────────────────────────────────────

const L3_PROBLEM =
  "נתון כלל נסיגה:  a₁ = 5 ,  aₙ₊₁ = 2·aₙ − 3\n" +
  "הוכח האם הסדרה חשבונית, הנדסית או כללית.\n" +
  "מצא נוסחה סגורה לאיבר הכללי aₙ.";

const L3_PLACEHOLDER =
  "תאר ל-AI את תהליך הניתוח המלא:\n" +
  "1. כיצד תזהה את סוג הסדרה?\n" +
  "2. אילו חישובים ביניים תבצע?\n" +
  "3. כיצד תגיע לנוסחה הסגורה?\n\n" +
  "כתוב בפירוט כדי לאפשר לחונך לעזור לך.";

const GATE_CHARS = 80;

// ─── SVG Diagrams ─────────────────────────────────────────────────────────────

function ArithRecurrenceSVG() {
  const TERMS = ["a₁", "a₂", "a₃", "a₄"];
  return (
    <svg viewBox="0 0 340 86" className="w-full max-w-sm mx-auto" aria-hidden>
      <defs>
        <marker id="ar-a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
        </marker>
      </defs>
      {TERMS.map((label, i) => (
        <g key={i}>
          <rect x={8 + i * 80} y={26} width={54} height={34} rx={9}
            fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
          <text x={35 + i * 80} y={48} textAnchor="middle" fontSize={13}
            fill="#94a3b8" fontFamily="monospace">{label}</text>
        </g>
      ))}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <line x1={63 + i * 80} y1={43} x2={83 + i * 80} y2={43}
            stroke="#f59e0b" strokeWidth={1.5} markerEnd="url(#ar-a)" />
          <text x={73 + i * 80} y={38} textAnchor="middle" fontSize={9} fill="#f59e0b">+d</text>
        </g>
      ))}
      <text x={325} y={47} fontSize={13} fill="#475569">…</text>
    </svg>
  );
}

function GeoRecurrenceSVG() {
  const TERMS = ["a₁", "a₂", "a₃", "a₄"];
  return (
    <svg viewBox="0 0 340 86" className="w-full max-w-sm mx-auto" aria-hidden>
      <defs>
        <marker id="ar-g" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#34d399" />
        </marker>
      </defs>
      {TERMS.map((label, i) => (
        <g key={i}>
          <rect x={8 + i * 80} y={26} width={54} height={34} rx={9}
            fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
          <text x={35 + i * 80} y={48} textAnchor="middle" fontSize={13}
            fill="#94a3b8" fontFamily="monospace">{label}</text>
        </g>
      ))}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <line x1={63 + i * 80} y1={43} x2={83 + i * 80} y2={43}
            stroke="#34d399" strokeWidth={1.5} markerEnd="url(#ar-g)" />
          <text x={73 + i * 80} y={38} textAnchor="middle" fontSize={9} fill="#34d399">×q</text>
        </g>
      ))}
      <text x={325} y={47} fontSize={13} fill="#475569">…</text>
    </svg>
  );
}

function GeneralRecurrenceSVG() {
  const TERMS = ["a₁", "a₂", "a₃", "a₄"];
  return (
    <svg viewBox="0 0 340 96" className="w-full max-w-sm mx-auto" aria-hidden>
      <defs>
        <marker id="ar-r" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#a78bfa" />
        </marker>
      </defs>
      {TERMS.map((label, i) => (
        <g key={i}>
          <rect x={8 + i * 80} y={36} width={54} height={34} rx={9}
            fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
          <text x={35 + i * 80} y={58} textAnchor="middle" fontSize={13}
            fill="#94a3b8" fontFamily="monospace">{label}</text>
        </g>
      ))}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <path
            d={`M${63 + i * 80},53 C${70 + i * 80},12 ${76 + i * 80},12 ${83 + i * 80},53`}
            fill="none" stroke="#a78bfa" strokeWidth={1.5} markerEnd="url(#ar-r)" />
          <text x={73 + i * 80} y={10} textAnchor="middle" fontSize={8} fill="#a78bfa">f(aₙ)</text>
        </g>
      ))}
      <text x={325} y={57} fontSize={13} fill="#475569">…</text>
    </svg>
  );
}

// ─── RecursionLab ─────────────────────────────────────────────────────────────

function RecursionLab() {
  const [a1, setA1] = useState(2);
  const [isAdditive, setIsAdditive] = useState(true);
  const [constant, setConstant] = useState(3);

  const terms: number[] = [];
  let cur = a1;
  for (let i = 0; i < 8; i++) {
    terms.push(cur);
    if (!Number.isFinite(cur) || Math.abs(cur) > 1e9) {
      while (terms.length < 8) terms.push(NaN);
      break;
    }
    cur = isAdditive ? cur + constant : cur * constant;
  }

  const display = (v: number) =>
    !Number.isFinite(v) || isNaN(v) ? "∞" : String(v);

  let typeLabel = "";
  if (isAdditive) {
    typeLabel = constant === 0 ? "סדרה קבועה (d = 0)"
      : constant > 0 ? `סדרה חשבונית עולה (d = ${constant})`
      : `סדרה חשבונית יורדת (d = ${constant})`;
  } else {
    typeLabel = constant === 0 ? "סדרה שמתאפסת (q = 0)"
      : constant === 1 ? "סדרה קבועה (q = 1)"
      : constant === -1 ? "סדרה מתחלפת בסימן (q = −1)"
      : Math.abs(constant) > 1 ? `סדרה הנדסית מתפצלת (q = ${constant})`
      : `סדרה הנדסית מתכנסת (q = ${constant})`;
  }

  return (
    <section style={{ border: "8px solid #334155", borderRadius: "40px", padding: "2.5rem", background: "#020617" }}>
      <h3 className="text-white font-bold text-xl mb-1 text-center">RecursionLab</h3>
      <p className="text-slate-400 text-sm text-center mb-7">
        שנה פרמטרים וצפה כיצד הסדרה מתפתחת בזמן אמת
      </p>

      {/* Toggle */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setIsAdditive(true)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            isAdditive
              ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
              : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
          }`}
        >
          aₙ₊₁ = aₙ + d
        </button>
        <button
          onClick={() => setIsAdditive(false)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
            !isAdditive
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
              : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
          }`}
        >
          aₙ₊₁ = q · aₙ
        </button>
      </div>

      {/* Sliders */}
      <div className="space-y-5 mb-7">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>a₁ — איבר ראשון</span>
            <span className="font-mono text-white">{a1}</span>
          </div>
          <input type="range" min={-5} max={10} step={1} value={a1}
            onChange={e => setA1(+e.target.value)}
            className="w-full h-1.5 rounded-full accent-blue-400 cursor-pointer" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{isAdditive ? "d — הפרש" : "q — מנה"}</span>
            <span className="font-mono text-white">{constant}</span>
          </div>
          <input
            type="range"
            min={isAdditive ? -5 : -3} max={isAdditive ? 8 : 5} step={1}
            value={constant}
            onChange={e => setConstant(+e.target.value)}
            className="w-full h-1.5 rounded-full accent-blue-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Term boxes */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 mb-4">
        {terms.map((t, i) => (
          <div key={i} className="text-center">
            <div className="text-[9px] text-slate-500 mb-1">a{i + 1}</div>
            <div className={`rounded-lg px-1 py-2 text-xs font-mono border text-center overflow-hidden ${
              isNaN(t)
                ? "bg-slate-900 border-slate-800 text-slate-700"
                : "bg-slate-800 border-slate-700 text-white"
            }`}>
              {display(t)}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-500">{typeLabel}</p>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LevelBadge({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`${color} text-xs font-bold px-3 py-1 rounded-full border`}>{label}</span>
      <span className="text-slate-500 text-xs">{sub}</span>
    </div>
  );
}

function ProblemBox({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 space-y-4">
      <pre className="bg-slate-900/60 rounded-xl p-4 font-mono text-sm text-slate-200 text-center leading-loose whitespace-pre-wrap">
        {text}
      </pre>
      {children}
    </div>
  );
}

function HintBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mt-3">
      <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
      <p className="text-amber-300 text-xs leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecursionPage() {

  // ── Level 1 state ──────────────────────────────────────────────────────────
  const [l1Answers, setL1Answers] = useState<(number | null)[]>([null, null, null, null]);

  const l1StepOk = (i: number) =>
    l1Answers[i] !== null && L1_STEPS[i].choices[l1Answers[i]!].correct;
  const l1StepLocked = (i: number) => i > 0 && !l1StepOk(i - 1);
  const l1Complete = L1_STEPS.every((_, i) => l1StepOk(i));

  function pickL1(stepIdx: number, choiceIdx: number) {
    if (l1StepLocked(stepIdx) || l1StepOk(stepIdx)) return;
    setL1Answers(prev => { const n = [...prev]; n[stepIdx] = choiceIdx; return n; });
  }

  // ── Level 2 state ──────────────────────────────────────────────────────────
  const [l2Texts, setL2Texts] = useState(["", "", ""]);
  const [l2Results, setL2Results] = useState<(ScoreResult | null)[]>([null, null, null]);

  const l2StepPassed = (i: number) => {
    const r = l2Results[i];
    return r !== null && !r.blocked && r.score >= 75;
  };
  const l2StepLocked = (i: number) => i > 0 && !l2StepPassed(i - 1);
  const l2Complete = [0, 1, 2].every(i => l2StepPassed(i));

  function setL2Text(i: number, val: string) {
    setL2Texts(prev => { const n = [...prev]; n[i] = val; return n; });
    if (l2Results[i] !== null)
      setL2Results(prev => { const n = [...prev]; n[i] = null; return n; });
  }

  function validateL2(i: number) {
    const text = l2Texts[i];
    const r = calculatePromptScore(text, L2_STEPS[i].contextWords);
    setL2Results(prev => { const n = [...prev]; n[i] = r; return n; });
  }

  // ── Level 3 state ──────────────────────────────────────────────────────────
  const [l3Text, setL3Text] = useState("");
  const [l3Submitted, setL3Submitted] = useState(false);
  const l3Ready = l3Text.length >= GATE_CHARS;

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeSlideIn 0.35s ease both; }
      `}</style>

      {/* Header */}
      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link href="/topic/grade12/series" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" />
            סדרות
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-14">

        {/* Hero */}
        <div className="text-center space-y-3 fade-in">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">כיתה י״ב • סדרות</p>
          <h1 className="text-4xl font-extrabold">כלל נסיגה</h1>
          <p className="text-slate-400 text-sm">מהגדרה רקורסיבית לנוסחה סגורה — שלושה שלבי שליטה</p>
        </div>

        {/* ══════════════════════ LEVEL 1 — GUIDING ══════════════════════ */}
        <section className="space-y-5 fade-in">
          <LevelBadge
            color="bg-amber-500/20 border-amber-500/40 text-amber-400"
            label="שלב א׳ · הכוונה"
            sub="בחר את התשובה הנכונה"
          />

          <ProblemBox text={L1_PROBLEM}>
            <ArithRecurrenceSVG />
          </ProblemBox>

          <div className="space-y-4">
            {L1_STEPS.map((step, si) => {
              const locked = l1StepLocked(si);
              const ok = l1StepOk(si);
              const sel = l1Answers[si];
              const wrong = sel !== null && !step.choices[sel].correct;

              return (
                <div
                  key={si}
                  className={`bg-[#0f172a] border rounded-2xl p-5 transition-all ${
                    locked ? "border-slate-800 opacity-35 pointer-events-none"
                    : ok ? "border-emerald-700/50"
                    : "border-slate-700"
                  }`}
                >
                  {/* Step header */}
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      ok ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"
                    }`}>
                      {ok ? "✓" : si + 1}
                    </span>
                    <p className="text-white font-semibold">{step.prompt}</p>
                  </div>

                  {/* Choices */}
                  <div className="space-y-2.5">
                    {step.choices.map((choice, ci) => {
                      const isSelected = sel === ci;
                      let cls = "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 cursor-pointer";
                      if (isSelected && choice.correct) cls = "bg-emerald-500/15 border-emerald-500/60 text-emerald-300 cursor-default";
                      else if (isSelected && !choice.correct) cls = "bg-red-500/10 border-red-500/40 text-red-300 cursor-default";
                      else if (ok) cls = "bg-slate-800/30 border-slate-800 text-slate-600 cursor-default";

                      return (
                        <button
                          key={ci}
                          onClick={() => pickL1(si, ci)}
                          disabled={ok}
                          className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all ${cls}`}
                        >
                          {choice.text}
                        </button>
                      );
                    })}
                  </div>

                  {wrong && !ok && <HintBox text={step.hint} />}
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════ LEVEL 2 — TRAINING ══════════════════════ */}
        {!l1Complete ? (
          <div className="flex items-center gap-3 py-2 opacity-40 select-none">
            <Lock size={15} className="text-slate-500 shrink-0" />
            <p className="text-slate-500 text-sm">שלב ב׳ יפתח לאחר השלמת שלב א׳</p>
          </div>
        ) : (
          <section className="space-y-5 fade-in">
            <LevelBadge
              color="bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              label="שלב ב׳ · אימון"
              sub="הסבר בכתב — מילות מפתח נדרשות"
            />

            <ProblemBox text={L2_PROBLEM}>
              <GeoRecurrenceSVG />
            </ProblemBox>

            <div className="space-y-4">
              {L2_STEPS.map((step, si) => {
                const locked = l2StepLocked(si);
                const result = l2Results[si];
                const isOk = l2StepPassed(si);
                const scoreBarColor = !result ? "#9CA3AF"
                  : result.score >= 75 ? "#16a34a"
                  : result.score >= 50 ? "#d97706"
                  : "#dc2626";

                return (
                  <div
                    key={si}
                    className={`bg-[#0f172a] border rounded-2xl p-5 transition-all ${
                      locked ? "border-slate-800 opacity-35 pointer-events-none"
                      : isOk ? "border-emerald-700/50"
                      : "border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isOk ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"
                      }`}>
                        {isOk ? "✓" : si + 1}
                      </span>
                      <p className="text-white font-semibold">{step.prompt}</p>
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={l2Texts[si]}
                      onChange={e => setL2Text(si, e.target.value)}
                      disabled={isOk}
                      placeholder={step.placeholder}
                      rows={3}
                      dir="rtl"
                      className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none transition-colors mb-3 ${
                        isOk ? "border-emerald-800/40 opacity-60 cursor-default"
                        : "border-slate-700 focus:border-slate-500"
                      }`}
                    />

                    {!isOk && (
                      <button
                        onClick={() => validateL2(si)}
                        className="text-sm font-semibold px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                      >
                        בדוק
                      </button>
                    )}

                    {result && (
                      <div style={{ marginTop: 8, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
                          <span>ציון הפרומפט</span>
                          <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
                        </div>
                      </div>
                    )}

                    {result && result.hint && (
                      <div style={{
                        borderRadius: 12,
                        background: result.blocked ? "rgba(254,226,226,1)" : result.score >= 75 ? "rgba(220,252,231,1)" : "rgba(255,251,235,1)",
                        border: `2px solid ${result.blocked ? "#dc2626" : result.score >= 75 ? "#16a34a" : "#d97706"}`,
                        padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, marginTop: 8,
                        ...(result.score >= 75 ? { fontWeight: 600 } : {})
                      }}>
                        {result.hint}
                      </div>
                    )}

                    {isOk && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm mt-3">
                        <CheckCircle2 size={15} />
                        <span>הפרומפט עבר את הסף — המשך לשלב הבא</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ══════════════════════ LEVEL 3 — MASTERY ══════════════════════ */}
        {l1Complete && !l2Complete ? (
          <div className="flex items-center gap-3 py-2 opacity-40 select-none">
            <Lock size={15} className="text-slate-500 shrink-0" />
            <p className="text-slate-500 text-sm">שלב ג׳ יפתח לאחר השלמת שלב ב׳</p>
          </div>
        ) : l2Complete ? (
          <section className="space-y-5 fade-in">
            <LevelBadge
              color="bg-violet-500/20 border-violet-500/40 text-violet-400"
              label="שלב ג׳ · שליטה"
              sub={`ניתוח מלא — לפחות ${GATE_CHARS} תווים`}
            />

            <ProblemBox text={L3_PROBLEM}>
              <GeneralRecurrenceSVG />
            </ProblemBox>

            <div className={`bg-[#0f172a] border rounded-2xl p-5 transition-all ${
              l3Submitted ? "border-violet-700/50" : "border-slate-700"
            }`}>
              {!l3Submitted ? (
                <>
                  <textarea
                    value={l3Text}
                    onChange={e => setL3Text(e.target.value)}
                    placeholder={L3_PLACEHOLDER}
                    rows={8}
                    dir="rtl"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-slate-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none transition-colors mb-4"
                  />

                  {/* Gate bar */}
                  <div className="mb-4">
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${Math.min(100, (l3Text.length / GATE_CHARS) * 100)}%`,
                          background: l3Ready ? "#a78bfa" : "#475569",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${l3Ready ? "text-violet-400" : "text-slate-500"}`}>
                      {l3Text.length} / {GATE_CHARS} תווים
                    </span>
                    <div className="flex items-center gap-3">
                      {!l3Ready && (
                        <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Lock size={11} />
                          עוד {GATE_CHARS - l3Text.length} תווים
                        </span>
                      )}
                      <button
                        disabled={!l3Ready}
                        onClick={() => setL3Submitted(true)}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                          l3Ready
                            ? "bg-violet-600 hover:bg-violet-500 text-white"
                            : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        }`}
                      >
                        שלח לחונך
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-3 py-6">
                  <CheckCircle2 size={38} className="text-violet-400 mx-auto" />
                  <p className="text-white font-bold text-lg">הפרומפט נשלח!</p>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                    החונך ינתח את תיאורך ויעזור לך לפתח את הפתרון המלא.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* ══════════════════════ RECURSION LAB ══════════════════════════ */}
        <RecursionLab />

        {/* Footer */}
        <div className="border-t border-slate-800 pt-6 flex justify-center">
          <Link
            href="/topic/grade12/series"
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
