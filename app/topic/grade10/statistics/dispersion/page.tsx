"use client";

import React, { useState } from "react";
import { Copy, Check, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// ─── Constants ───────────────────────────────────────────────────────────────

const CLASS_A = [78, 79, 80, 81, 82];
const CLASS_B = [60, 70, 80, 90, 100];
const MEAN = 80;
const GATE_CHARS = 80;

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium w-full"
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: copied ? "#34d399" : "#e2e8f0" }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "הועתק!" : label}
    </button>
  );
}

// ─── Silent SVG: Two Dot Plots ───────────────────────────────────────────────

function DotPlotDiagram() {
  const W = 420, H = 200;
  const padL = 40, padR = 20, plotW = W - padL - padR;
  const minVal = 50, maxVal = 110, range = maxVal - minVal;
  const toX = (v: number) => padL + ((v - minVal) / range) * plotW;

  const rowAy = 55;
  const rowBy = 130;

  const rangeA = Math.max(...CLASS_A) - Math.min(...CLASS_A);
  const rangeB = Math.max(...CLASS_B) - Math.min(...CLASS_B);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto" aria-hidden>
      {/* Class A label */}
      <text x={W - padR} y={rowAy - 22} textAnchor="end" fill="#60a5fa" fontSize={12} fontWeight={700}>{"כיתה א'"}</text>
      {/* Class A axis */}
      <line x1={padL} y1={rowAy} x2={W - padR} y2={rowAy} stroke="#334155" strokeWidth={1} />
      {/* Class A dots */}
      {CLASS_A.map((v, i) => (
        <circle key={`a${i}`} cx={toX(v)} cy={rowAy} r={8} fill="rgba(96,165,250,0.25)" stroke="#60a5fa" strokeWidth={2} />
      ))}
      {/* Class A range bar */}
      <line x1={toX(Math.min(...CLASS_A))} y1={rowAy + 18} x2={toX(Math.max(...CLASS_A))} y2={rowAy + 18} stroke="#60a5fa" strokeWidth={3} strokeLinecap="round" />
      <text x={toX(MEAN)} y={rowAy + 32} textAnchor="middle" fill="#60a5fa" fontSize={9} fontWeight={600}>{`טווח = ${rangeA}`}</text>

      {/* Class B label */}
      <text x={W - padR} y={rowBy - 22} textAnchor="end" fill="#f43f5e" fontSize={12} fontWeight={700}>{"כיתה ב'"}</text>
      {/* Class B axis */}
      <line x1={padL} y1={rowBy} x2={W - padR} y2={rowBy} stroke="#334155" strokeWidth={1} />
      {/* Class B dots */}
      {CLASS_B.map((v, i) => (
        <circle key={`b${i}`} cx={toX(v)} cy={rowBy} r={8} fill="rgba(244,63,94,0.25)" stroke="#f43f5e" strokeWidth={2} />
      ))}
      {/* Class B range bar */}
      <line x1={toX(Math.min(...CLASS_B))} y1={rowBy + 18} x2={toX(Math.max(...CLASS_B))} y2={rowBy + 18} stroke="#f43f5e" strokeWidth={3} strokeLinecap="round" />
      <text x={toX(MEAN)} y={rowBy + 32} textAnchor="middle" fill="#f43f5e" fontSize={9} fontWeight={600}>{`טווח = ${rangeB}`}</text>

      {/* Mean dashed line */}
      <line x1={toX(MEAN)} y1={rowAy - 30} x2={toX(MEAN)} y2={rowBy + 18} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,4" />
      <text x={toX(MEAN)} y={H - 8} textAnchor="middle" fill="#f59e0b" fontSize={10} fontWeight={700}>{`ממוצע = ${MEAN}`}</text>

      {/* Axis ticks */}
      {[60, 70, 80, 90, 100].map(v => (
        <g key={v}>
          <text x={toX(v)} y={rowAy - 8} textAnchor="middle" fill="#64748b" fontSize={8}>{v}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Level 1: Guiding (Copy-Paste) ──────────────────────────────────────────

const L1_STEPS = [
  {
    label: "א. זהו את הציון הגבוה והנמוך בכל כיתה",
    description: "הסתכלו על גרף הנקודות. מצאו את הנקודה הכי ימנית (גבוה) והכי שמאלית (נמוך) בכל כיתה.",
    prompt: "הנה שתי כיתות שנבחנו באותו מבחן:\nכיתה א': 78, 79, 80, 81, 82\nכיתה ב': 60, 70, 80, 90, 100\n\nהנחה אותי לזהות את הציון הכי גבוה והכי נמוך בכל כיתה. אל תיתן לי את התשובה ישירות — שאל אותי שאלות מנחות.",
  },
  {
    label: "ב. חשבו את הטווח (Max − Min)",
    description: "חשבו את ההפרש בין הציון הגבוה לנמוך בכל כיתה. זהו הטווח.",
    prompt: "מצאתי את הציונים הקיצוניים. עכשיו הנחה אותי לחשב את הטווח (הפרש בין מקסימום למינימום) של כל כיתה. תשאל אותי מה ההפרש ואל תגיד לי ישירות.",
  },
  {
    label: "ג. איזו כיתה אחידה יותר?",
    description: "הסבירו: למה הממוצע לבדו לא מספיק כדי לתאר את ההתפלגות?",
    prompt: "הממוצע של שתי הכיתות הוא 80. אבל הכיתות נראות שונות מאוד. הנחה אותי להבין למה ממוצע לבדו לא מספיק ומה הטווח מוסיף לנו.",
  },
  {
    label: "ד. שאלת בונוס: +5 נקודות לכולם",
    description: "אם כולם בכיתה ב' קיבלו 5 נקודות בונוס — האם המרחק בין התלמידים השתנה?",
    prompt: "המורה של כיתה ב' נתן 5 נקודות בונוס לכולם. הנחה אותי להבין: האם הטווח (המרחק בין הגבוה לנמוך) ישתנה? למה כן או למה לא?",
  },
];

function Level1({ done, setDone }: { done: boolean[]; setDone: (d: boolean[]) => void }) {
  const [copiedIdx, setCopiedIdx] = useState(-1);

  function toggleDone(i: number) {
    const next = [...done];
    next[i] = !next[i];
    setDone(next);
  }

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm font-bold">1</div>
        <div>
          <h2 className="text-lg font-bold text-white">שלב א׳ — העתקת פרומפטים</h2>
          <p className="text-slate-400 text-sm">העתיקו כל פרומפט, שלחו ל-AI, ואשרו שסיימתם</p>
        </div>
      </div>

      {/* Diagram */}
      <div className="rounded-2xl border border-amber-500/30 p-6 mb-6" style={{ background: "#0f172a" }}>
        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest text-center mb-4">שתי כיתות — פיזור על ציר</p>
        <DotPlotDiagram />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {L1_STEPS.map((step, i) => {
          const locked = i > 0 && !done[i - 1];
          const isDone = done[i];

          return (
            <div
              key={i}
              className="rounded-xl border p-4"
              style={{
                borderColor: locked ? "#1e293b" : isDone ? "rgba(52,211,153,0.4)" : "rgba(245,158,11,0.3)",
                background: locked ? "rgba(15,23,42,0.5)" : isDone ? "rgba(52,211,153,0.05)" : "#0f172a",
                opacity: locked ? 0.45 : 1,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{
                    borderColor: locked ? "#334155" : isDone ? "#34d399" : "#f59e0b",
                    color: locked ? "#475569" : isDone ? "#34d399" : "#f59e0b",
                    background: isDone ? "rgba(52,211,153,0.15)" : "transparent",
                  }}
                >
                  {locked ? <Lock size={10} /> : isDone ? <Check size={10} /> : i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-200 mb-1">{step.label}</p>
                  <p className="text-slate-400 text-sm mb-3">{step.description}</p>

                  {!locked && !isDone && (
                    <>
                      <div className="rounded-lg border border-slate-700 p-3 mb-3" style={{ background: "#020617" }}>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{step.prompt}</p>
                      </div>
                      <CopyBtn text={step.prompt} />
                    </>
                  )}

                  {!locked && (
                    <button
                      onClick={() => toggleDone(i)}
                      className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        background: isDone ? "rgba(52,211,153,0.15)" : "rgba(245,158,11,0.1)",
                        border: `1px solid ${isDone ? "rgba(52,211,153,0.4)" : "rgba(245,158,11,0.3)"}`,
                        color: isDone ? "#34d399" : "#f59e0b",
                      }}
                    >
                      {isDone ? <Check size={12} /> : null}
                      {isDone ? "סיימתי עם AI" : "סיימתי עם AI"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Level 2: Training (Keyword Validation) ─────────────────────────────────

const L2_KEYWORDS = ["טווח", "מקסימום", "מינימום", "פיזור", "אחידות"];
const L2_HINT = "נסו לכלול מילים כמו: טווח, מקסימום, מינימום, פיזור, אחידות";

function Level2({ status, setStatus }: { status: "idle" | "ok" | "hint"; setStatus: (s: "idle" | "ok" | "hint") => void }) {
  const [text, setText] = useState("");
  const locked = status === "ok";

  function check() {
    const allFound = L2_KEYWORDS.every(kw => text.includes(kw));
    setStatus(allFound ? "ok" : "hint");
  }

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm font-bold">2</div>
        <div>
          <h2 className="text-lg font-bold text-white">שלב ב׳ — כתיבת פרומפט עצמאי</h2>
          <p className="text-slate-400 text-sm">כתבו פרומפט משלכם שמכיל את מילות המפתח</p>
        </div>
      </div>

      {/* New problem diagram */}
      <div className="rounded-2xl border border-emerald-500/30 p-6 mb-6" style={{ background: "#0f172a" }}>
        <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest text-center mb-3">תרגיל חדש</p>
        <p className="text-slate-300 text-sm text-center leading-relaxed">
          {"נתונות שתי קבוצות כדורסל. ממוצע הנקודות זהה (75 נקודות למשחק)."}<br />
          {"קבוצה א': 73, 74, 75, 76, 77"}<br />
          {"קבוצה ב': 55, 65, 75, 85, 95"}<br />
          {"כתבו פרומפט שמבקש מ-AI להסביר לכם מה הטווח של כל קבוצה ולמה ממוצע לבדו לא מספיק."}
        </p>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={locked}
        dir="rtl"
        rows={4}
        placeholder="כתבו כאן את הפרומפט שלכם..."
        className="w-full rounded-xl border p-4 text-sm resize-none mb-3"
        style={{
          background: locked ? "rgba(52,211,153,0.05)" : "#0f172a",
          borderColor: locked ? "rgba(52,211,153,0.4)" : "#334155",
          color: "#e2e8f0",
        }}
      />

      {/* Keyword pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {L2_KEYWORDS.map(kw => {
          const found = text.includes(kw);
          return (
            <span
              key={kw}
              className="px-3 py-1 rounded-full text-xs font-semibold border"
              style={{
                background: found ? "rgba(52,211,153,0.15)" : "rgba(100,116,139,0.1)",
                borderColor: found ? "#34d399" : "#475569",
                color: found ? "#34d399" : "#64748b",
              }}
            >
              {kw} {found ? "✓" : ""}
            </span>
          );
        })}
      </div>

      {/* Check button */}
      {!locked && (
        <button
          onClick={check}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.4)", color: "#34d399" }}
        >
          בדוק
        </button>
      )}

      {/* Feedback */}
      {status === "ok" && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl border" style={{ background: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.4)" }}>
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-emerald-400 text-sm font-semibold">מצוין! הפרומפט שלכם מכיל את כל מילות המפתח.</span>
        </div>
      )}
      {status === "hint" && (
        <div className="mt-4 p-3 rounded-xl border" style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)" }}>
          <p className="text-amber-400 text-sm">{L2_HINT}</p>
        </div>
      )}
    </section>
  );
}

// ─── Level 3: Mastery (Free-form + char gate) ───────────────────────────────

function Level3({ submitted, setSubmitted }: { submitted: boolean; setSubmitted: (s: boolean) => void }) {
  const [text, setText] = useState("");
  const progress = Math.min(100, (text.length / GATE_CHARS) * 100);
  const ready = text.length >= GATE_CHARS;

  if (submitted) {
    return (
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 text-sm font-bold">3</div>
          <h2 className="text-lg font-bold text-white">שלב ג׳ — שליטה</h2>
        </div>
        <div className="rounded-2xl border border-emerald-500/40 p-6 flex flex-col items-center gap-3" style={{ background: "rgba(52,211,153,0.05)" }}>
          <CheckCircle2 size={36} className="text-emerald-400" />
          <p className="text-emerald-400 font-bold text-lg">הפרומפט נשלח לחונך!</p>
          <p className="text-slate-400 text-sm">כל הכבוד — סיימתם את שלושת השלבים.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 text-sm font-bold">3</div>
        <div>
          <h2 className="text-lg font-bold text-white">שלב ג׳ — שליטה</h2>
          <p className="text-slate-400 text-sm">כתבו פרומפט מלא בעצמכם — בלי עזרה</p>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-500/30 p-6 mb-6" style={{ background: "#0f172a" }}>
        <p className="text-violet-400 text-xs font-bold uppercase tracking-widest text-center mb-3">אתגר מתקדם</p>
        <p className="text-slate-300 text-sm text-center leading-relaxed">
          {"בבית ספר יש 3 כיתות עשירית. ממוצע הציונים בכולן 80."}<br />
          {"כיתה א': טווח 4, כיתה ב': טווח 40, כיתה ג': טווח 20."}<br />
          {"כתבו פרומפט שמבקש מ-AI להסביר: למה כיתה ב' היא הכי מאתגרת למורה? מה אפשר ללמוד מהטווח של כל כיתה?"}
        </p>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        dir="rtl"
        rows={5}
        placeholder="כתבו כאן את הפרומפט המלא שלכם..."
        className="w-full rounded-xl border border-slate-700 p-4 text-sm resize-none mb-3"
        style={{ background: "#0f172a", color: "#e2e8f0" }}
      />

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "#1e293b" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: ready ? "#34d399" : "#a78bfa" }}
        />
      </div>
      <p className="text-slate-500 text-xs mb-4">{text.length} / {GATE_CHARS} תווים</p>

      <button
        onClick={() => setSubmitted(true)}
        disabled={!ready}
        className="px-6 py-3 rounded-xl text-sm font-bold transition-all"
        style={{
          background: ready ? "rgba(167,139,250,0.15)" : "rgba(100,116,139,0.08)",
          border: `1px solid ${ready ? "rgba(167,139,250,0.5)" : "#334155"}`,
          color: ready ? "#a78bfa" : "#475569",
          cursor: ready ? "pointer" : "not-allowed",
        }}
      >
        שלח לחונך
      </button>
    </section>
  );
}

// ─── Lab: Spread Simulator ───────────────────────────────────────────────────

function SpreadLab() {
  const [spread, setSpread] = useState(50);
  const [bonus, setBonus] = useState(0);

  const mean = 80;
  const baseOffsets = [-20, -10, 0, 10, 20];
  const factor = spread / 100;
  const data = baseOffsets.map(off => mean + off * factor + bonus);
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const rangeVal = Math.round(maxVal - minVal);

  // SVG
  const W = 400, H = 90;
  const padL = 12, padR = 12, plotW = W - padL - padR;
  const displayMin = 30 + bonus;
  const displayMax = 130 + bonus;
  const displayRange = displayMax - displayMin;
  const toX = (v: number) => padL + ((v - displayMin) / displayRange) * plotW;
  const dotY = 36;

  return (
    <section
      className="mb-12"
      style={{ border: "8px solid #334155", borderRadius: 40, padding: "2.5rem", background: "#020617" }}
    >
      <h3 className="text-white text-lg font-bold text-center mb-1">סימולטור פיזור וטווח</h3>
      <p className="text-slate-400 text-sm text-center mb-6">הזיזו את הסליידר — הנקודות מתפזרות או מתכווצות. לחצו +5 בונוס וראו מה קורה לטווח.</p>

      {/* SVG dot plot */}
      <div className="rounded-xl border border-slate-700 p-3 mb-6" style={{ background: "#0a0f1e" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {/* Axis */}
          <line x1={padL} y1={dotY + 14} x2={W - padR} y2={dotY + 14} stroke="#334155" strokeWidth={1} />

          {/* Range bar */}
          {rangeVal > 0 && (
            <rect
              x={toX(minVal)} y={dotY + 20} width={Math.max(2, toX(maxVal) - toX(minVal))} height={7}
              rx={3.5} fill="rgba(96,165,250,0.2)" stroke="#60a5fa" strokeWidth={1.5}
            />
          )}

          {/* Mean line */}
          <line x1={toX(mean + bonus)} y1={dotY - 18} x2={toX(mean + bonus)} y2={dotY + 30} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={toX(mean + bonus)} y={dotY - 22} textAnchor="middle" fill="#f59e0b" fontSize={9} fontWeight={700}>{`ממוצע=${Math.round(mean + bonus)}`}</text>

          {/* Dots */}
          {data.map((v, i) => (
            <g key={i}>
              <circle cx={toX(v)} cy={dotY} r={10} fill="rgba(96,165,250,0.2)" stroke="#60a5fa" strokeWidth={2} />
              <text x={toX(v)} y={dotY + 4} textAnchor="middle" fill="#60a5fa" fontSize={8} fontWeight={700}>{Math.round(v)}</text>
            </g>
          ))}

          {/* Range label */}
          <text x={W / 2} y={H - 4} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={600}>{`טווח = ${rangeVal}`}</text>
        </svg>
      </div>

      {/* Spread slider */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-slate-400 text-sm whitespace-nowrap">פיזור:</span>
        <input
          type="range" min={0} max={100} step={1} value={spread}
          onChange={e => setSpread(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: "#60a5fa" }}
        />
        <span className="text-blue-400 font-mono font-bold text-sm w-10 text-left">{spread}%</span>
      </div>

      {/* Bonus button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setBonus(b => b + 5)}
          className="px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: "rgba(96,165,250,0.1)", border: "1.5px solid rgba(96,165,250,0.4)", color: "#60a5fa" }}
        >
          +5 בונוס
        </button>
        {bonus > 0 && (
          <button
            onClick={() => setBonus(0)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.3)", color: "#64748b" }}
          >
            איפוס
          </button>
        )}
        {bonus > 0 && (
          <span className="text-emerald-400 text-sm font-bold">
            +{bonus} נקודות — הטווח נשאר {rangeVal} יחידות!
          </span>
        )}
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-700 p-3 text-center" style={{ background: "#0f172a" }}>
          <div className="text-slate-500 text-xs mb-1">טווח</div>
          <div className="text-blue-400 font-bold text-xl font-mono">{rangeVal}</div>
        </div>
        <div className="rounded-xl border border-slate-700 p-3 text-center" style={{ background: "#0f172a" }}>
          <div className="text-slate-500 text-xs mb-1">ממוצע</div>
          <div className="text-amber-400 font-bold text-xl font-mono">{Math.round(mean + bonus)}</div>
        </div>
        <div className="rounded-xl border border-slate-700 p-3 text-center" style={{ background: "#0f172a" }}>
          <div className="text-slate-500 text-xs mb-1">אחידות</div>
          <div className="text-sm font-bold" style={{ color: rangeVal < 10 ? "#34d399" : rangeVal < 25 ? "#f59e0b" : "#f43f5e" }}>
            {rangeVal < 10 ? "גבוהה" : rangeVal < 25 ? "בינונית" : "נמוכה"}
          </div>
        </div>
      </div>

      {/* Verification text */}
      <p className="text-center text-slate-500 text-xs mt-4">
        תוספת קבועה (בונוס) מזיזה את כל הנקודות — אבל המרחק ביניהן לא משתנה. הטווח נשמר!
      </p>
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function StatisticsDispersionPage() {
  // Level 1
  const [l1Done, setL1Done] = useState<boolean[]>(Array(L1_STEPS.length).fill(false));
  const l1Complete = l1Done.every(Boolean);

  // Level 2
  const [l2Status, setL2Status] = useState<"idle" | "ok" | "hint">("idle");
  const l2Complete = l2Status === "ok";

  // Level 3
  const [l3Submitted, setL3Submitted] = useState(false);

  return (
    <main className="min-h-screen" style={{ background: "#0a0f1e" }} dir="rtl">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">מדדי פיזור — טווח</h1>
            <p className="text-slate-400 text-sm mt-0.5">כיתה י׳ — סטטיסטיקה</p>
          </div>
          <Link
            href="/topic/grade10/statistics"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white no-underline"
            style={{ background: "#1e293b", border: "1px solid #334155" }}
          >
            <span>←</span> חזרה
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Level 1 ── */}
        <Level1 done={l1Done} setDone={setL1Done} />

        {/* ── Level 2 (locked until L1 complete) ── */}
        {!l1Complete ? (
          <div className="mb-12 rounded-2xl border border-slate-800 p-6 flex items-center gap-4 opacity-40">
            <Lock size={20} className="text-slate-600" />
            <div>
              <p className="text-slate-500 font-semibold text-sm">שלב ב׳ — נעול</p>
              <p className="text-slate-600 text-xs">סיימו את כל שלבי ההעתקה כדי להמשיך</p>
            </div>
          </div>
        ) : (
          <Level2 status={l2Status} setStatus={setL2Status} />
        )}

        {/* ── Level 3 (locked until L2 complete) ── */}
        {!l2Complete ? (
          <div className="mb-12 rounded-2xl border border-slate-800 p-6 flex items-center gap-4 opacity-40">
            <Lock size={20} className="text-slate-600" />
            <div>
              <p className="text-slate-500 font-semibold text-sm">שלב ג׳ — נעול</p>
              <p className="text-slate-600 text-xs">סיימו את שלב הכתיבה כדי להמשיך</p>
            </div>
          </div>
        ) : (
          <Level3 submitted={l3Submitted} setSubmitted={setL3Submitted} />
        )}

        {/* ── Lab ── */}
        <SpreadLab />

        {/* Back link */}
        <div className="text-center pt-4 pb-8">
          <Link href="/topic/grade10/statistics" className="text-slate-500 hover:text-slate-300 text-sm no-underline">
            ← חזרה לסטטיסטיקה
          </Link>
        </div>
      </div>
    </main>
  );
}
