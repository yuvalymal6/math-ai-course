"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";

// ─── Types ────────────────────────────────────────────────────────────────────

const CONTEXT_WORDS = ["נגזרת", "f′", "קיצון", "מינימום", "מקסימום", "שורש", "להשוות", "אפס"];

type PromptStep = {
  phase: string;
  label: string;
  coaching: string;
  prompt: string;
  contextWords: string[];
  keywordHint: string;
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  title: string;
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  advancedGateQuestion?: string;
  steps: PromptStep[];
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-emerald-500 text-black", accentCls: "text-emerald-400", ladderBorder: "#065f46" },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-amber-400 text-black",   accentCls: "text-amber-400",   ladderBorder: "#78350f" },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",   badgeCls: "bg-rose-600 text-white",    accentCls: "text-rose-400",    ladderBorder: "#881337" },
} as const;

// ─── SVGs ─────────────────────────────────────────────────────────────────────

function CubicCurveSVG() {
  const W = 260, H = 150, padX = 36, padY = 16;
  const xMin = -0.6, xMax = 3.6, yMin = -3.2, yMax = 4.2;
  const sx = (x: number) => padX + ((x - xMin) / (xMax - xMin)) * (W - 2 * padX);
  const sy = (y: number) => padY + ((yMax - y) / (yMax - yMin)) * (H - 2 * padY);
  const pts: string[] = [];
  for (let xi = xMin; xi <= xMax; xi += 0.04) {
    const yi = xi ** 3 - 3 * xi ** 2 + 2;
    if (yi > yMin - 0.5 && yi < yMax + 0.5) pts.push(`${sx(xi).toFixed(1)},${sy(yi).toFixed(1)}`);
  }
  const ox = sx(0), oy = sy(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }} aria-hidden>
      <line x1={padX} y1={oy} x2={W - padX} y2={oy} stroke="#1e3a5f" strokeWidth={1} />
      <line x1={ox} y1={padY} x2={ox} y2={H - padY} stroke="#1e3a5f" strokeWidth={1} />
      <polyline points={pts.join(" ")} fill="none" stroke="#22d3ee" strokeWidth={2.2} />
    </svg>
  );
}

function QuarticCurveSVG() {
  const W = 260, H = 150, padX = 36, padY = 16;
  const xMin = -3.6, xMax = 3.6, yMin = -11, yMax = 13;
  const sx = (x: number) => padX + ((x - xMin) / (xMax - xMin)) * (W - 2 * padX);
  const sy = (y: number) => padY + ((yMax - y) / (yMax - yMin)) * (H - 2 * padY);
  const pts: string[] = [];
  for (let xi = xMin; xi <= xMax; xi += 0.04) {
    const yi = xi ** 4 - 8 * xi ** 2 + 7;
    if (yi > yMin - 1 && yi < yMax + 1) pts.push(`${sx(xi).toFixed(1)},${sy(yi).toFixed(1)}`);
  }
  const oy = sy(0), ox = sx(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }} aria-hidden>
      <line x1={padX} y1={oy} x2={W - padX} y2={oy} stroke="#1e3a5f" strokeWidth={1} />
      <line x1={ox} y1={padY} x2={ox} y2={H - padY} stroke="#1e3a5f" strokeWidth={1} />
      <polyline points={pts.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={2.2} />
    </svg>
  );
}

function FullCubicSVG() {
  // f(x) = 2x³ − 9x² + 12x − 4  |  max at x=1 (f=1), min at x=2 (f=0), inflection at x=1.5 (f=0.5)
  const W = 260, H = 150, padX = 36, padY = 16;
  const xMin = -0.3, xMax = 3.8, yMin = -1.5, yMax = 3.5;
  const sx = (x: number) => padX + ((x - xMin) / (xMax - xMin)) * (W - 2 * padX);
  const sy = (y: number) => padY + ((yMax - y) / (yMax - yMin)) * (H - 2 * padY);
  const f = (x: number) => 2 * x ** 3 - 9 * x ** 2 + 12 * x - 4;
  const pts: string[] = [];
  for (let xi = xMin; xi <= xMax; xi += 0.04) {
    const yi = f(xi);
    if (yi > yMin - 0.3 && yi < yMax + 0.3) pts.push(`${sx(xi).toFixed(1)},${sy(yi).toFixed(1)}`);
  }
  const ox = sx(0), oy = sy(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }} aria-hidden>
      <line x1={padX} y1={oy} x2={W - padX} y2={oy} stroke="#1e3a5f" strokeWidth={1} />
      <line x1={ox} y1={padY} x2={ox} y2={H - padY} stroke="#1e3a5f" strokeWidth={1} />
      <polyline points={pts.join(" ")} fill="none" stroke="#f472b6" strokeWidth={2.2} />
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-black/40 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition-colors">
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt }: { prompt: string }) {
  return (
    <div className="relative rounded-2xl p-px bg-gradient-to-br from-cyan-400/60 via-cyan-400/25 to-purple-400/40 mb-4">
      <div className="rounded-2xl bg-black/60 p-5">
        <div className="flex items-center gap-2 mb-3"><span>✨</span><span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">פרומפט ראשי</span></div>
        <p className="text-slate-200 text-sm leading-relaxed mb-4">{prompt}</p>
        <CopyBtn text={prompt} label="העתק פרומפט מלא" />
      </div>
    </div>
  );
}

function TutorStepBasic({ step }: { step: PromptStep }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-black/40 border-b border-slate-700">
        <span className="text-cyan-400 text-xs font-bold shrink-0">{step.phase}</span>
        <span className="text-slate-300 text-xs font-semibold">{step.label}</span>
      </div>
      <div className="bg-black/20 p-4 space-y-3">
        <p className="text-slate-400 text-xs leading-relaxed border-r-2 border-cyan-400/30 pr-3 italic">{step.coaching}</p>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">הפרומפט המוכן ✍️</div>
        <div className="rounded-lg bg-black/40 border border-slate-700 p-3 text-[11px] text-slate-200 leading-relaxed break-words">{step.prompt}</div>
        <CopyBtn text={step.prompt} />
      </div>
    </div>
  );
}

function TutorStepMedium({ step }: { step: PromptStep }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result !== null && !result.blocked && result.score >= 75;
  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";
  const validate = () => {
    const r = calculatePromptScore(text, step.contextWords);
    setResult(r);
  };
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-black/40 border-b border-slate-700">
        {passed ? <CheckCircle size={14} className="text-emerald-400 shrink-0" /> : <span className="text-cyan-400 text-xs font-bold shrink-0">{step.phase}</span>}
        <span className="text-slate-300 text-xs font-semibold">{step.label}</span>
      </div>
      <div className="bg-black/20 p-4 space-y-3">
        <p className="text-slate-400 text-xs leading-relaxed border-r-2 border-cyan-400/30 pr-3 italic">{step.coaching}</p>
        <textarea value={text} rows={3} dir="rtl" onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="נסח את השאלה שלך ל-AI..." style={{ minHeight: 80, maxHeight: 160 }} className="block w-full rounded-xl bg-black/40 border border-slate-700 text-slate-200 text-sm p-3 resize-none placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/50 overflow-auto" disabled={passed} />
        {!passed && <button onClick={validate} className="px-4 py-1.5 rounded-xl text-xs bg-black/40 border border-slate-700 text-slate-400 hover:border-cyan-400/40 transition-colors">בדיקת AI מדומה 🤖</button>}
        {result && (
          <div style={{ marginTop: 8 }}>
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
            padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6,
            ...(result.score >= 75 ? { fontWeight: 600 } : {})
          }}>
            {result.hint}
          </div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/20 transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק את הניסוח שלך"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, unlocked, onValidated }: { step: PromptStep; unlocked: boolean; onValidated: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setText(""); setResult(null); }, [unlocked]);
  if (!unlocked) return (
    <div className="rounded-xl border border-slate-800 bg-black/20 p-4 opacity-40 select-none flex items-center gap-3">
      <span className="text-slate-600">🔒</span><span className="text-slate-600 text-xs">{step.phase} — {step.label}</span>
    </div>
  );
  const passed = result !== null && !result.blocked && result.score >= 75;
  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";
  const validate = () => {
    const r = calculatePromptScore(text, step.contextWords);
    setResult(r);
    if (!r.blocked && r.score >= 75) onValidated();
  };
  return (
    <div className="rounded-xl overflow-hidden border border-purple-500/30">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-black/40 border-b border-purple-500/20">
        {passed ? <CheckCircle size={14} className="text-emerald-400 shrink-0" /> : <span className="text-purple-300 text-xs font-bold shrink-0">{step.phase}</span>}
        <span className="text-slate-300 text-xs font-semibold">{step.label}</span>
      </div>
      <div className="bg-black/20 p-4 space-y-3">
        <p className="text-slate-400 text-xs leading-relaxed border-r-2 border-purple-500/30 pr-3 italic">{step.coaching}</p>
        <textarea value={text} rows={3} dir="rtl" onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="נסח את השאלה שלך ל-AI..." style={{ minHeight: 80, maxHeight: 160 }} className="block w-full rounded-xl bg-black/40 border border-slate-700 text-slate-200 text-sm p-3 resize-none placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40 overflow-auto" disabled={passed} />
        {!passed && <button onClick={validate} className="px-4 py-1.5 rounded-xl text-xs bg-black/40 border border-slate-700 text-slate-400 hover:border-purple-500/40 transition-colors">בדיקת AI מדומה 🤖</button>}
        {result && (
          <div style={{ marginTop: 8 }}>
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
            padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6,
            ...(result.score >= 75 ? { fontWeight: 600 } : {})
          }}>
            {result.hint}
          </div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/30 p-3 text-emerald-300 text-xs">השלב הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/20 transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק את הניסוח שלך"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function LadderBase({ steps, goldenPrompt }: { steps: PromptStep[]; goldenPrompt: string }) {
  return <div className="space-y-3"><GoldenPromptCard prompt={goldenPrompt} /><div className="space-y-2">{steps.map((s, i) => <TutorStepBasic key={i} step={s} />)}</div></div>;
}

function LadderMedium({ steps, goldenPrompt }: { steps: PromptStep[]; goldenPrompt: string }) {
  return <div className="space-y-3"><GoldenPromptCard prompt={goldenPrompt} /><div className="space-y-2">{steps.map((s, i) => <TutorStepMedium key={i} step={s} />)}</div></div>;
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlocked, setUnlocked] = useState(1);
  return (
    <div className="space-y-2">
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#4f46e5" accentRgb="79,70,229" requiredPhrase="סרוק נתונים ועצור" />
      {steps.map((s, i) => <TutorStepAdvanced key={i} step={s} unlocked={!masterPassed ? false : i < unlocked} onValidated={() => setUnlocked(v => Math.max(v, i + 2))} />)}
      {masterPassed && (
        <button onClick={() => { setMasterPassed(false); setUnlocked(1); }} className="text-xs text-slate-500 hover:text-slate-300 underline pt-1">התחל מחדש</button>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "מציאת נקודות סטציונריות וסיווג הקיצון",
    problem: "נתונה הפונקציה:\nf(x) = x³ − 3x² + 2\n\nא. מצא את הנקודות הסטציונריות (f′(x)=0).\nב. סווג כל נקודה באמצעות מבחן הנגזרת השנייה — מקסימום מקומי או מינימום מקומי.",
    diagram: <CubicCurveSVG />,
    pitfalls: [
      { title: "שוכחים להוציא גורם משותף מ-f′", text: "f′(x)=3x²−6x=3x(x−2). הגורם המשותף 3x מגלה את x=0 מיידית — אל תתעלם ממנו." },
      { title: "בלבול בסיווג על-פי הנגזרת השנייה", text: "f″(0)=−6<0 → מקסימום מקומי. f″(2)=+6>0 → מינימום מקומי. שלילי=מקסימום, חיובי=מינימום." },
    ],
    goldenPrompt: "\n\nf(x)=x³−3x²+2. גזירה: f′(x)=3x²−6x=3x(x−2)=0 → x=0, x=2. f″(x)=6x−6. f″(0)=−6<0 → מקסימום מקומי, f(0)=2. f″(2)=6>0 → מינימום מקומי, f(2)=−2.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "🔍 הזיהוי", label: "מה הנגזרת? מה מחפשים?", coaching: "שאל את ה-AI לגזור ולהסביר: מה פירוש נקודת קיצון מבחינה גרפית?", prompt: "\n\nf(x)=x³−3x²+2. מהי f′(x)? מה המשמעות של f′(x)=0? מצא את כל הנקודות שבהן f′=0.", contextWords: [], keywordHint: "" },
      { phase: "🧭 האסטרטגיה", label: "הוצא גורם משותף וקבע שורשים", coaching: "תאר ל-AI אילו פעולות תבצע כדי למצוא את שורשי הנגזרת. חשוב: האם יש גורם משותף?", prompt: "\n\nf′(x)=3x²−6x. הוצא גורם משותף. מה שני השורשים? פרט כל צעד אלגברי.", contextWords: CONTEXT_WORDS, keywordHint: "" },
      { phase: "🔢 החישוב", label: "סיווג נקודות הקיצון באמצעות הנגזרת השנייה", coaching: "תאר ל-AI כיצד תשתמש בנגזרת השנייה לסיווג כל נקודה סטציונרית שמצאת.", prompt: "\n\nf″(x)=6x−6. חשב f″ בכל נקודה סטציונרית. סווג כל נקודה — מקסימום מקומי או מינימום מקומי? נמק.", contextWords: CONTEXT_WORDS, keywordHint: "" },
      { phase: "✅ אימות הפתרון", label: "חשב ערכי הפונקציה בנקודות הקיצון", coaching: "הסבר מדוע הנגזרת השנייה מאשרת את הסיווג. חשב ערכי הפונקציה בנקודות הקיצון.", prompt: "\n\nחשב f בכל נקודת קיצון שמצאת. הסבר מדוע מבחינה גרפית המקסימום חייב להיות גדול מהמינימום.", contextWords: CONTEXT_WORDS, keywordHint: "" },
    ],
  },
  {
    id: "medium",
    title: "קביעת תחומי מונוטוניות לפונקציה ממעלה רביעית",
    problem: "נתונה הפונקציה:\nf(x) = x⁴ − 8x² + 7\n\nא. מצא נקודות סטציונריות וסווגן באמצעות מבחן הנגזרת השנייה.\nב. קבע תחומי מונוטוניות (עלייה וירידה) בסיוע טבלת סימנים מלאה.\nג. מצא נקודות פיתול.",
    diagram: <QuarticCurveSVG />,
    pitfalls: [
      { title: "גורום שגוי של f′", text: "f′(x)=4x³−16x=4x(x²−4)=4x(x−2)(x+2). שלושה שורשים: x=−2, 0, 2. אל תשכח את x=0!" },
      { title: "אי-בניית טבלת סימנים לתחומי עלייה/ירידה", text: "שלושה שורשים יוצרים ארבעה תחומים. בדוק נקודת ביניים בכל תחום לקביעת הסימן." },
    ],
    goldenPrompt: "\n\nf′=4x³−16x=4x(x−2)(x+2)=0 → x=−2,0,2. f″=12x²−16. f″(−2)=32>0 מינ, f″(0)=−16<0 מקס, f″(2)=32>0 מינ. עלייה: (−2,0)∪(2,∞). ירידה: (−∞,−2)∪(0,2). פיתול: f″=0 → x=±√(4/3)≈±1.15.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "🔍 הזיהוי", label: "גזור ושוה ל-0: שלושה שורשים", coaching: "גורם משותף 4x חושף שלושה שורשים. ארבעה תחומים לבדיקה.", prompt: "\n\nf(x)=x⁴−8x²+7. מהי f′(x)? הוצא גורם משותף ומצא את כל השורשים. כמה שורשים צפויים?", contextWords: CONTEXT_WORDS, keywordHint: "" },
      { phase: "🧭 האסטרטגיה", label: "בנה טבלת סימנים לקביעת תחומי עלייה וירידה", coaching: "ארבעה תחומים: (−∞,−2), (−2,0), (0,2), (2,∞). בדוק נקודת ביניים בכל תחום.", prompt: "\n\nשורשי f′: x=−2, 0, 2. בנה טבלת סימנים מפורטת. מה סימן f′ בכל אחד מארבעת התחומים?", contextWords: CONTEXT_WORDS, keywordHint: "" },
      { phase: "🔢 החישוב", label: "סיווג נקודות הקיצון באמצעות הנגזרת השנייה", coaching: "תאר ל-AI כיצד תשתמש בנגזרת השנייה לסיווג כל נקודה סטציונרית.", prompt: "\n\nf″(x)=12x²−16. חשב f″ בכל נקודה סטציונרית. מה הסיווג של כל נקודה — מקסימום מקומי או מינימום מקומי?", contextWords: CONTEXT_WORDS, keywordHint: "" },
      { phase: "✅ אימות הפתרון", label: "אמת תחומי עלייה וירידה ומצא פיתול", coaching: "אמת את תחומי המונוטוניות. מצא נקודות פיתול: היכן f″=0 ויש שינוי סימן?", prompt: "\n\nבדוק סימן f′ בנקודת ביניים בכל תחום. מצא f″=0 ואמת שינוי סימן. הסבר את ההבדל בין קיצון לפיתול.", contextWords: CONTEXT_WORDS, keywordHint: "" },
    ],
  },
  {
    id: "advanced",
    title: "חקירה מלאה: נקודות סטציונריות, קעירות ואלגוריתם הפתרון",
    problem: "נתונה הפונקציה:\nf(x) = 2x³ − 9x² + 12x − 4\n\nא. מצא נקודות סטציונריות וסווגן באמצעות מבחן הנגזרת השנייה.\nב. קבע תחומי מונוטוניות (עלייה וירידה).\nג. מצא נקודת פיתול ואמת שינוי קעירות.\nד. תאר את התנהגות הגרף לפי אלגוריתם הפתרון.",
    diagram: <FullCubicSVG />,
    pitfalls: [
      { title: "פירוק שגוי של f′=6x²−18x+12", text: "f′=6(x²−3x+2)=6(x−1)(x−2). שני שורשים: x=1 ו-x=2. אל תחשב בלי לפרק לגורמים!" },
      { title: "בלבול בין קיצון לפיתול", text: "קיצון: f′=0 ו-f″≠0. פיתול: f″=0 ושינוי סימן של f″. שתי מושגים שונים לחלוטין." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני הפתרון — נסח פרומפט מקיף שמסביר: מה ההבדל המהותי בין נקודת קיצון לנקודת פיתול? כיצד זוהים כל אחת מהן? ומה מצביע על כך שנקודה היא פיתול ולא קיצון? (לפחות 80 תווים)",
    steps: [
      { phase: "🔍 הזיהוי", label: "גזור ופרק לגורמים", coaching: "f′=6x²−18x+12=6(x−1)(x−2). שני שורשים: x=1 ו-x=2.", prompt: "\n\nf(x)=2x³−9x²+12x−4. מהי f′(x)? פרק לגורמים. מהם שורשי f′? הסבר כל שלב.", contextWords: CONTEXT_WORDS, keywordHint: "" },
      { phase: "🧭 האסטרטגיה", label: "סיווג קיצונות באמצעות הנגזרת השנייה", coaching: "תאר ל-AI כיצד תשתמש בנגזרת השנייה לסיווג נקודות הקיצון שמצאת.", prompt: "\n\nf″(x)=12x−18. חשב f″ בכל נקודה סטציונרית. סווג כל נקודת קיצון. מה ערכי הפונקציה בנקודות אלו?", contextWords: CONTEXT_WORDS, keywordHint: "" },
      { phase: "🔢 החישוב", label: "מציאת נקודת הפיתול", coaching: "הסבר מדוע f″=0 לבדו אינו מספיק לנקודת פיתול. מה עוד צריך לאמת?", prompt: "\n\nf″(x)=12x−18. פתור f″(x)=0. חשב f בנקודה זו. מדוע נקודה זו היא פיתול ולא קיצון? מה ההבדל?", contextWords: CONTEXT_WORDS, keywordHint: "" },
      { phase: "✅ אימות הפתרון", label: "תאר את התנהגות הגרף", coaching: "מקסימום ב-(1,1), מינימום ב-(2,0), פיתול ב-(1.5, 0.5). הגרף עולה←יורד←עולה.", prompt: "\n\nסכם: תחומי עלייה וירידה, נקודות הקיצון, נקודת הפיתול. מה צורת הגרף הכללית? האם יש קיצון גלובלי?", contextWords: CONTEXT_WORDS, keywordHint: "" },
    ],
  },
];

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-emerald-400", border: "border-emerald-500", bg: "bg-emerald-500/10" },
  { id: "medium",   label: "בינוני", textColor: "text-amber-400",   border: "border-amber-500",   bg: "bg-amber-500/10"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-rose-400",    border: "border-rose-500",    bg: "bg-rose-500/10"    },
];

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+סעיף/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: "8px solid #334155", borderRadius: 24, padding: "2.5rem", background: "#020617", marginLeft: "auto", marginRight: "auto" }}>

      {/* Formula bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "center", justifyContent: "center", borderRadius: 16, border: "1px solid #1e3a5f", background: "rgba(0,0,0,0.5)", padding: "12px 24px", marginBottom: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>נקודות סטציונריות</div>
          <div style={{ color: "#22d3ee", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>f′(x) = 0 → חשודות לקיצון</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>מבחן הנגזרת השנייה</div>
          <div style={{ color: "#22d3ee", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>f″ {">"} 0 מינ · f″ {"<"} 0 מקס</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>נקודת פיתול</div>
          <div style={{ color: "#22d3ee", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>f″(x) = 0 + שינוי סימן</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <div>
          <div className={`text-xs font-bold uppercase tracking-widest ${s.accentCls}`}>{s.stationName}</div>
          <h2 style={{ color: "white", fontSize: 22, fontWeight: 700, marginTop: 2 }}>{ex.title}</h2>
        </div>
      </div>
      <div style={{ height: 1, background: "#334155", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: "1px solid #1e3a5f", background: "rgba(0,0,0,0.4)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        {ex.diagram}
      </div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: "1px solid #1e3a5f", background: "rgba(0,0,0,0.4)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(100,116,139,0.15)", border: "1px solid rgba(100,116,139,0.3)", color: copiedProblem ? "#4ade80" : "#94a3b8", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#f1f5f9", fontSize: 14, lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "2rem" }}>
        <div style={{ color: "#fb7185", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>⚠️ שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 16, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(127,29,29,0.15)", padding: "1rem" }}>
            <div style={{ color: "#fca5a5", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>⚠️ {p.title}</div>
            <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{p.text}</div>
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.ladderBorder}`, background: "rgba(0,0,0,0.3)", padding: "1.5rem" }}>
        <div className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>

    </section>
  );
}

// ─── Polynomial Lab ───────────────────────────────────────────────────────────

function PolynomialLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-3);
  const [c, setC] = useState(0);
  const [d, setD] = useState(2);

  const f  = (x: number) => a * x ** 3 + b * x ** 2 + c * x + d;
  const fp = (x: number) => 3 * a * x ** 2 + 2 * b * x + c;

  const W = 480, H = 200, padX = 44, padY = 18;
  const xMin = -4, xMax = 4;
  const xs = Array.from({ length: 120 }, (_, i) => xMin + (i / 119) * (xMax - xMin));
  const ys = xs.map(f);
  const rawYMin = Math.min(...ys), rawYMax = Math.max(...ys);
  const yPad = Math.max((rawYMax - rawYMin) * 0.15, 2);
  const yMin = rawYMin - yPad, yMax = rawYMax + yPad;
  const yRange = yMax - yMin || 1;

  const toSVG = (x: number, y: number) => ({
    sx: padX + ((x - xMin) / (xMax - xMin)) * (W - 2 * padX),
    sy: padY + ((yMax - y) / yRange) * (H - 2 * padY),
  });

  const pts = xs.map((x, i) => { const { sx, sy } = toSVG(x, ys[i]); return `${sx.toFixed(1)},${sy.toFixed(1)}`; }).join(" ");
  const origin = toSVG(0, 0);
  const xAxisY = Math.max(padY + 1, Math.min(H - padY - 1, origin.sy));
  const yAxisX = Math.max(padX + 1, Math.min(W - padX - 1, origin.sx));

  const critPoints: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    if (fp(xs[i]) * fp(xs[i + 1]) <= 0) critPoints.push((xs[i] + xs[i + 1]) / 2);
  }

  const sign = (n: number) => n > 0 ? `+${n}` : `${n}`;
  const expr = `${a}x³ ${sign(b)}x² ${sign(c)}x ${sign(d)}`.replace("+-", "−").replace(/\+0x[³²]/g, "").replace(/\+0x/g, "").replace(/\+0$/, "");
  const dExpr = `${3*a}x² ${sign(2*b)}x ${sign(c)}`.replace("+-", "−").replace(/\+0x[²]/g, "").replace(/\+0x/g, "").replace(/\+0$/, "");

  return (
    <section style={{ border: "8px solid #334155", borderRadius: 24, padding: "2.5rem", background: "#020617", marginLeft: "auto", marginRight: "auto", marginTop: "2rem" }}>
      <h3 style={{ color: "white", fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>מעבדת פולינום אינטראקטיבית</h3>
      <p style={{ color: "#64748b", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        שנה מקדמים וצפה בנקודות הסטציונריות מתעדכנות בזמן אמת
      </p>

      <div style={{ textAlign: "center", marginBottom: "1.5rem", fontFamily: "monospace", fontSize: 15, color: "#22d3ee", background: "rgba(0,0,0,0.5)", border: "1px solid #1e3a5f", borderRadius: 14, padding: "14px 20px" }}>
        f(x) = {expr}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: "2rem" }}>
        {([
          { label: "מקדם a  (x³)", val: a, set: setA, min: -3, max: 3, color: "#22d3ee"  },
          { label: "מקדם b  (x²)", val: b, set: setB, min: -5, max: 5, color: "#a78bfa"  },
          { label: "מקדם c  (x)",  val: c, set: setC, min: -5, max: 5, color: "#10b981"  },
          { label: "מקדם d  (קבוע)", val: d, set: setD, min: -5, max: 5, color: "#f59e0b" },
        ] as const).map((row) => (
          <div key={row.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              <span>{row.label}</span>
              <span style={{ color: "white", fontWeight: 700 }}>{row.val}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={1} value={row.val}
              onChange={(e) => row.set(+e.target.value as never)}
              style={{ width: "100%", accentColor: row.color }} />
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid #1e3a5f", borderRadius: 16, padding: 16, marginBottom: "1.5rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
          <line x1={padX} y1={xAxisY} x2={W - padX} y2={xAxisY} stroke="#1e3a5f" strokeWidth={1} />
          <line x1={yAxisX} y1={padY} x2={yAxisX} y2={H - padY} stroke="#1e3a5f" strokeWidth={1} />
          <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth={2.5} strokeLinejoin="round" />
          {critPoints.map((x, i) => {
            const { sx, sy } = toSVG(x, f(x));
            return <circle key={i} cx={sx} cy={sy} r={5} fill="#f59e0b" />;
          })}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid #1e3a5f", borderRadius: 14, padding: 16, textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>f′(x) =</div>
          <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{dExpr}</div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid #1e3a5f", borderRadius: 14, padding: 16, textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>נקודות קיצון (x≈)</div>
          <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 14 }}>
            {critPoints.length === 0 ? "אין" : critPoints.map(x => x.toFixed(2)).join(",  ")}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestigationPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;

  return (
    <main style={{ minHeight: "100vh", background: "#000000", color: "white" }} dir="rtl">

      <div style={{ borderBottom: "1px solid #1e293b", background: "#0a0f1e" }}>
        <div style={{ margin: "0 auto", padding: "1.25rem 1.5rem" }}>
          <Link href="/topic/grade12/calculus-polynomial" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 8 }}
            className="hover:text-indigo-400 transition-colors">← פולינומים ונגזרות</Link>
          <h1 style={{ color: "white", fontSize: 22, fontWeight: 700 }}>חקירת קיצון וסיווג</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>מציאת נקודות סטציונריות • סיווג קיצון באמצעות מבחן הנגזרת השנייה • קביעת תחומי מונוטוניות</p>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        {/* Sub-topic progress */}
        <SubtopicProgress subtopicId="/grade12/calculus-polynomial/investigation" />

        {/* Level Selector */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-700 rounded-xl p-1 mb-8">
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id as typeof selectedLevel)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-slate-500 hover:text-slate-300"}`}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab — always visible */}
        <PolynomialLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade12/calculus-polynomial/investigation" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
