"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Brain, ChevronRight, Copy, Check, Lock, CheckCircle2 } from "lucide-react";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";

// ─── Constants ─────────────────────────────────────────────────────────────────

const GATE_CHARS = 80;

// ─── Inline Components ─────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "הועתק!" : "העתק פרומפט"}
    </button>
  );
}

function GoldenPromptCard({ children, prompt }: { children: React.ReactNode; prompt?: string }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(0,212,255,0.07), rgba(245,158,11,0.07))",
      border: "1px solid rgba(0,212,255,0.25)",
      borderRadius: 16,
      padding: "1.25rem 1.5rem",
      marginBottom: "1.5rem",
    }}>
      <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest mb-2">צעד 1: הפעלת המורה (AI)</p>
      {children}
      {prompt && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,212,255,0.15)" }}>
          <CopyBtn text={prompt} />
        </div>
      )}
    </div>
  );
}

function TutorStepBasic({
  number, title, description, prompt, done, onToggle,
}: {
  number: number; title: string; description: string; prompt: string;
  done: boolean; onToggle: () => void;
}) {
  return (
    <div className={`flex gap-4 p-4 rounded-xl border transition-all ${done ? "bg-emerald-500/5 border-emerald-500/30" : "bg-[#0a0f1e] border-slate-800"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${done ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-300" : "bg-emerald-500/15 border border-emerald-500/35 text-emerald-400"}`}>
        {done ? "✓" : number}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
        <div className="flex items-center gap-3">
          <CopyBtn text={prompt} />
          <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              done
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${done ? "bg-emerald-500 border-emerald-500" : "border-slate-500"}`}>
              {done && <Check size={9} className="text-white" />}
            </div>
            סיימתי עם AI
          </button>
        </div>
      </div>
    </div>
  );
}

function KeywordPills({ keywords, text }: { keywords: string[]; text: string }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {keywords.map(kw => {
        const found = text.includes(kw);
        return (
          <span key={kw} className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
            found
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-slate-800 border-slate-700 text-slate-500"
          }`}>
            {found && <Check size={10} className="inline mr-1" />}
            {kw}
          </span>
        );
      })}
    </div>
  );
}

function HintBox({ text }: { text: string }) {
  return (
    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
      💡 {text}
    </div>
  );
}

function TutorStepMedium({
  number, title, description, contextWords,
  value, onChange, result, onCheck,
}: {
  number: number; title: string; description: string;
  contextWords: string[];
  value: string; onChange: (v: string) => void;
  result: ScoreResult | null; onCheck: () => void;
}) {
  const done = result !== null && !result.blocked && result.score >= 75;
  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";
  return (
    <div className={`p-4 rounded-xl border ${done ? "bg-emerald-500/5 border-emerald-500/30" : "bg-[#0a0f1e] border-slate-800"}`}>
      <div className="flex gap-3 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
          done ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-300" : "bg-amber-500/20 border border-amber-500/40 text-amber-400"
        }`}>{done ? "✓" : number}</div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{title}</p>
          <p className="text-slate-400 text-sm leading-relaxed mt-1">{description}</p>
        </div>
      </div>
      <textarea
        disabled={done}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="כתוב כאן את הפרומפט שלך..."
        className="w-full rounded-lg bg-[#020617] border border-slate-700 text-slate-200 text-sm p-3 resize-none focus:outline-none focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        rows={3}
      />
      {result && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, fontWeight: 600 }}>
            <span style={{ color: "#94a3b8" }}>ציון הפרומפט</span>
            <span style={{ color: "#94a3b8", fontWeight: 800 }}>{result.score}/100</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}
      {result && result.hint && (
        <div style={{
          marginTop: 8,
          borderRadius: 12,
          background: result.blocked ? "rgba(254,226,226,1)" : result.score >= 75 ? "rgba(220,252,231,1)" : "rgba(255,251,235,1)",
          border: `2px solid ${result.blocked ? "#dc2626" : result.score >= 75 ? "#16a34a" : "#d97706"}`,
          padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6,
          ...(result.score >= 75 ? { fontWeight: 600 } : {})
        }}>
          {result.hint}
        </div>
      )}
      {done && (
        <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <CheckCircle2 size={16} /> מצוין! עברת לשלב הבא
        </div>
      )}
      {!done && (
        <button
          onClick={onCheck}
          disabled={value.trim().length < 5}
          className="mt-3 px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          בדוק
        </button>
      )}
    </div>
  );
}

// ─── SVG Diagrams ──────────────────────────────────────────────────────────────

// Level 1: f(x) = ln(2x-6), asymptote at x=3, contact point at x=4
function CalculusSVG_L1() {
  const xMin = 3.0, xMax = 8.5;
  const yMin = -2.4, yMax = 2.4;
  const W = 300, H = 165;
  const toSX = (x: number) => 55 + ((x - xMin) / (xMax - xMin)) * 225;
  const toSY = (y: number) => 130 - ((y - yMin) / (yMax - yMin)) * 115;

  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = 3.06 + (i / 100) * (xMax - 3.06);
    const y = Math.log(2 * x - 6);
    if (y < yMin || y > yMax) continue;
    pts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }

  const ax = toSX(3);
  const cx = toSX(4), cy = toSY(Math.log(2)); // contact point x=4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" style={{ display: "block" }}>
      {/* Axes */}
      <line x1="50" y1={toSY(0)} x2={W - 10} y2={toSY(0)} stroke="#475569" strokeWidth="1" />
      <line x1="50" y1="10" x2="50" y2={H - 10} stroke="#475569" strokeWidth="1" />
      {/* Asymptote at x=3 */}
      <line x1={ax} y1="10" x2={ax} y2={H - 8} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={ax + 3} y="22" fill="#f59e0b" fontSize="9" fontFamily="sans-serif">x=3</text>
      {/* Curve */}
      <polyline points={pts.join(" ")} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Contact point at x=4 */}
      <circle cx={cx} cy={cy} r="4" fill="#a78bfa" />
      <text x={cx + 6} y={cy - 5} fill="#a78bfa" fontSize="9" fontFamily="sans-serif">x=4</text>
      {/* Label */}
      <text x={W - 12} y="35" textAnchor="end" fill="#34d399" fontSize="11" fontFamily="serif" fontStyle="italic">f(x)=ln(2x−6)</text>
    </svg>
  );
}

// Level 2: f(x) = x² - 8ln(x), minimum at x=2
function CalculusSVG_L2() {
  const xMin = 0.15, xMax = 5.2;
  const yMin = -6, yMax = 22;
  const W = 300, H = 165;
  const toSX = (x: number) => 45 + ((x - xMin) / (xMax - xMin)) * 240;
  const toSY = (y: number) => 148 - ((y - yMin) / (yMax - yMin)) * 130;

  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = xMin + (i / 120) * (xMax - xMin);
    const y = x * x - 8 * Math.log(x);
    if (y < yMin || y > yMax) continue;
    pts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }

  // Minimum at x=2: f(2) = 4 - 8ln2 ≈ -1.545
  const minX = toSX(2), minY = toSY(4 - 8 * Math.log(2));
  // Asymptote at x=0
  const ax0 = toSX(0.01);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" style={{ display: "block" }}>
      <line x1="42" y1={toSY(0)} x2={W - 8} y2={toSY(0)} stroke="#475569" strokeWidth="1" />
      <line x1="45" y1="10" x2="45" y2={H - 8} stroke="#475569" strokeWidth="1" />
      {/* Asymptote at x=0 */}
      <line x1={ax0} y1="10" x2={ax0} y2={H - 8} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={ax0 + 3} y="22" fill="#f59e0b" fontSize="9" fontFamily="sans-serif">x=0</text>
      {/* Curve */}
      <polyline points={pts.join(" ")} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Minimum marker */}
      <circle cx={minX} cy={minY} r="4" fill="#a78bfa" />
      <text x={minX + 6} y={minY - 4} fill="#a78bfa" fontSize="9" fontFamily="sans-serif">מינימום</text>
      <text x={W - 12} y="25" textAnchor="end" fill="#34d399" fontSize="11" fontFamily="serif" fontStyle="italic">f(x)=x²−8ln x</text>
    </svg>
  );
}

// Level 3: f(x) = ln(ax-4) with a=5/3, passes through (3,0)
function CalculusSVG_L3() {
  const a = 5 / 3;
  const asymp = 4 / a; // ≈ 2.4
  const xMin = asymp - 0.3, xMax = asymp + 5;
  const yMin = -2.2, yMax = 2.5;
  const W = 300, H = 165;
  const toSX = (x: number) => 45 + ((x - xMin) / (xMax - xMin)) * 240;
  const toSY = (y: number) => 135 - ((y - yMin) / (yMax - yMin)) * 118;

  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = asymp + 0.04 + (i / 100) * (xMax - asymp - 0.04);
    const y = Math.log(a * x - 4);
    if (y < yMin || y > yMax) continue;
    pts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }

  const axX = toSX(asymp);
  const px = toSX(3), py = toSY(0); // (3, 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" style={{ display: "block" }}>
      <line x1="42" y1={toSY(0)} x2={W - 8} y2={toSY(0)} stroke="#475569" strokeWidth="1" />
      <line x1="45" y1="10" x2="45" y2={H - 8} stroke="#475569" strokeWidth="1" />
      {/* Asymptote */}
      <line x1={axX} y1="10" x2={axX} y2={H - 8} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={axX + 3} y="22" fill="#f59e0b" fontSize="9" fontFamily="sans-serif">x=4/a</text>
      {/* Curve */}
      <polyline points={pts.join(" ")} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Point (3, 0) */}
      <circle cx={px} cy={py} r="4.5" fill="#a78bfa" />
      <text x={px + 6} y={py - 5} fill="#a78bfa" fontSize="9" fontFamily="sans-serif">(3, 0)</text>
      <text x={W - 12} y="35" textAnchor="end" fill="#6366f1" fontSize="11" fontFamily="serif" fontStyle="italic">f(x)=ln(ax−4)</text>
    </svg>
  );
}

// ─── FunctionLab ───────────────────────────────────────────────────────────────

function FunctionLab() {
  // a = aInt/10, range 0.2–3.0
  const [aInt, setAInt] = useState(10);
  const [bInt, setBInt] = useState(0); // b integer -6..6

  const a = aInt / 10;
  const b = bInt;

  // g(x) = ln(a·x + b), domain: ax+b > 0 → x > -b/a
  const asymptote = a !== 0 ? -b / a : 0;
  const xStart = asymptote + 0.05;
  const xEnd = asymptote + 7;
  const yMin = -3, yMax = 3;
  const W = 320, H = 210;

  const toSX = (x: number) => 40 + ((x - xStart) / (xEnd - xStart)) * 265;
  const toSY = (y: number) => 175 - ((y - yMin) / (yMax - yMin)) * 155;

  const pts: string[] = [];
  for (let i = 0; i <= 140; i++) {
    const x = xStart + (i / 140) * (xEnd - xStart);
    const arg = a * x + b;
    if (arg <= 0) continue;
    const y = Math.log(arg);
    if (y < yMin || y > yMax) continue;
    pts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }

  const axX = toSX(asymptote);
  // x-intercept: ax+b=1 → x=(1-b)/a
  const xIntercept = a !== 0 ? (1 - b) / a : null;
  const xInterceptSX = xIntercept !== null && xIntercept > xStart && xIntercept < xEnd ? toSX(xIntercept) : null;

  // Tile values
  const fAt2 = (() => { const arg = a * (asymptote + 2) + b; return arg > 0 ? Math.log(arg) : null; })();
  const xZero = xIntercept;

  return (
    <section style={{
      border: "8px solid #334155",
      borderRadius: "24px",
      padding: "2rem",
      background: "#020617",
      boxSizing: "border-box",
      width: "100%",
    }}>
      <h3 className="text-white font-bold text-xl mb-1">מעבדה: ln(ax + b)</h3>
      <p className="text-slate-400 text-sm mb-6">שנה את הפרמטרים וראה איך האסימפטוטה זזה ימינה ושמאלה</p>

      {/* Sliders */}
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              a = <span className="text-emerald-400 font-bold">{a.toFixed(1)}</span>
            </label>
            <input
              type="range" min={2} max={30} value={aInt}
              onChange={e => setAInt(Number(e.target.value))}
              className="w-full accent-emerald-400"
              style={{ display: "block" }}
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1"><span>0.2</span><span>3.0</span></div>
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              b = <span className="text-amber-400 font-bold">{b}</span>
            </label>
            <input
              type="range" min={-6} max={6} step={1} value={bInt}
              onChange={e => setBInt(Number(e.target.value))}
              className="w-full accent-amber-400"
              style={{ display: "block" }}
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1"><span>-6</span><span>6</span></div>
          </div>
        </div>
      </div>

      {/* SVG */}
      <div style={{ height: 240, display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1.5rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
          {/* Axes */}
          <line x1="35" y1={toSY(0)} x2={W - 8} y2={toSY(0)} stroke="#475569" strokeWidth="1" />
          <line x1="40" y1="10" x2="40" y2={H - 8} stroke="#475569" strokeWidth="1" />
          {/* Asymptote */}
          {axX > 35 && axX < W - 5 && (
            <>
              <line x1={axX} y1="8" x2={axX} y2={H - 8} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,3" />
              <text x={axX + 4} y="24" fill="#f59e0b" fontSize="10" fontFamily="sans-serif">x={asymptote.toFixed(2)}</text>
            </>
          )}
          {/* Curve */}
          {pts.length > 1 && (
            <polyline points={pts.join(" ")} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {/* x-intercept dot */}
          {xInterceptSX !== null && (
            <circle cx={xInterceptSX} cy={toSY(0)} r="3.5" fill="#a78bfa" />
          )}
          {/* Label */}
          <text x={W - 8} y="22" textAnchor="end" fill="#34d399" fontSize="11" fontFamily="serif" fontStyle="italic">
            ln({a.toFixed(1)}x{b >= 0 ? `+${b}` : b})
          </text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#020617] border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">אסימפטוטה אנכית</p>
            <p className="text-amber-400 font-bold text-lg">x = {asymptote.toFixed(2)}</p>
          </div>
          <div className="bg-[#020617] border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">חיתוך עם ציר x</p>
            <p className="text-violet-400 font-bold text-lg">
              {xZero !== null ? `x ≈ ${xZero.toFixed(2)}` : "—"}
            </p>
          </div>
          <div className="bg-[#020617] border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">f(x₀+2)</p>
            <p className="text-emerald-400 font-bold text-lg">
              {fAt2 !== null ? fAt2.toFixed(3) : "—"}
            </p>
          </div>
        </div>
        <p className="text-slate-600 text-xs text-center mt-3">האסימפטוטה האנכית = −b/a • חיתוך x: ax+b=1 ← x=(1−b)/a</p>
      </div>
    </section>
  );
}

// ─── Question Box ─────────────────────────────────────────────────────────────

function QuestionBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#0f172a",
      border: "1px solid #334155",
      borderRadius: 16,
      padding: "1rem 1.25rem",
    }}>
      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-1.5">השאלה</p>
      <div className="text-white text-base leading-relaxed">{children}</div>
    </div>
  );
}

// ─── Level Sections ─────────────────────────────────────────────────────────────

function LevelBasic() {
  const [done, setDone] = useState([false, false, false]);
  const toggle = (i: number) => setDone(d => d.map((v, j) => (j === i ? !v : v)));
  const allDone = done.every(Boolean);

  return (
    <div className="space-y-5">

      {/* 1. שאלה */}
      <QuestionBox>
        נתונה הפונקציה <span className="font-mono text-emerald-400">f(x) = ln(2x − 6)</span>.
        מצא את תחום ההגדרה ואת ערך הנגזרת בנקודה x = 4.
      </QuestionBox>

      {/* 2. גרף */}
      <div className="rounded-2xl border border-slate-700 p-5 bg-[#0f172a]">
        <CalculusSVG_L1 />
      </div>

      {/* 3. פרומפט זהב */}
      <GoldenPromptCard
        prompt="אני תלמיד/ת כיתה י״ב לומד/ת חדו״א. אני רוצה שתהיה המורה שלי לתרגיל הזה. הפונקציה שלי היא f(x) = ln(2x-6). אנחנו הולכים לעבוד שלב אחר שלב: קודם נמצא את תחום ההגדרה, אחר כך נחשב את הנגזרת בכלל שרשרת, ולבסוף נציב x=4. בבקשה אל תיתן לי את התשובה ישר — שאל אותי שאלות שיעזרו לי להגיע לתשובה בעצמי."
      >
        <p className="text-slate-300 text-sm leading-relaxed">
          העתק את הפרומפט הזה ל-AI כדי להפעילו כמורה מלווה לכל התרגיל — ואז עבור שלב אחרי שלב בהמשך.
        </p>
      </GoldenPromptCard>

      {/* 4. שלבי פתרון */}
      <div className="space-y-3">
        <TutorStepBasic
          number={1}
          title="שלב א׳ — תחום הגדרה"
          description="בקש מה-AI להסביר מהי הדרישה לתחום ההגדרה של ln ולפתור את האי-שוויון."
          prompt="אני לומד/ת חדו״א בכיתה י״ב. יש לי את הפונקציה f(x) = ln(2x-6). עזור לי למצוא את תחום ההגדרה של הפונקציה. הסבר: מה הדרישה כדי שביטוי לוגריתמי יהיה מוגדר? פתור את האי-שוויון שמתקבל ורשום את תחום ההגדרה בסימון קבוצות."
          done={done[0]}
          onToggle={() => toggle(0)}
        />
        <TutorStepBasic
          number={2}
          title="שלב ב׳ — הנגזרת בכלל שרשרת"
          description="בקש מה-AI להדריך אותך בחישוב הנגזרת של ln(2x−6) שלב אחר שלב."
          prompt="לפונקציה f(x) = ln(2x-6). כיצד מחשבים את הנגזרת של לוגריתם טבעי של ביטוי? השתמש בכלל הנגזרת של פונקציה מורכבת (כלל שרשרת) ומצא את f'(x). הסבר כל שלב."
          done={done[1]}
          onToggle={() => toggle(1)}
        />
        <TutorStepBasic
          number={3}
          title="שלב ג׳ — הנגזרת בנקודה x = 4"
          description="הצב x=4 בנגזרת שמצאת וקבל את ערך השיפוע. בקש גם הסבר גיאומטרי."
          prompt="מצאתי שהנגזרת של f(x) = ln(2x-6) היא f'(x) = 2/(2x-6). כיצד מחשבים את ערך הנגזרת בנקודה x=4? הצב וחשב. מה המשמעות הגיאומטרית של ערך זה — מה הוא מייצג גרפית?"
          done={done[2]}
          onToggle={() => toggle(2)}
        />
      </div>

      {allDone && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium text-center">
          <CheckCircle2 size={18} className="inline mr-2" />
          כל הכבוד! סיימת את הרמה הבסיסית
        </div>
      )}
    </div>
  );
}

function LevelMedium() {
  const CONTEXT_WORDS = ["לוגריתם", "ln", "נגזרת", "תחום", "חקירה", "קיצון", "אינטגרל", "טבעי"];

  const [texts, setTexts] = useState(["", ""]);
  const [results, setResults] = useState<(ScoreResult | null)[]>([null, null]);

  const check = (i: number) => {
    const r = calculatePromptScore(texts[i], CONTEXT_WORDS);
    setResults(rs => rs.map((v, j) => j === i ? r : v));
  };

  const steps = [
    {
      title: "שלב א׳ — תחום הגדרה ונגזרת",
      description: "נסח פרומפט ל-AI: בקש ממנו להסביר את תחום ההגדרה, האסימפטוטה, ולגזור כל איבר.",
    },
    {
      title: "שלב ב׳ — נקודת קיצון ומונוטוניות",
      description: "נסח פרומפט להמשך: מתי f′(x)=0? מהם תחומי עלייה וירידה? סיווג הקיצון.",
    },
  ];

  const stepPassed = (i: number) => {
    const r = results[i];
    return r !== null && !r.blocked && r.score >= 75;
  };

  const l2Complete = steps.every((_, i) => stepPassed(i));

  return (
    <div className="space-y-5">

      {/* 1. שאלה */}
      <QuestionBox>
        נתונה הפונקציה <span className="font-mono text-amber-400">f(x) = x² − 8ln(x)</span>.
        מצא נקודות קיצון ותחומי עלייה/ירידה.
      </QuestionBox>

      {/* 2. גרף */}
      <div className="rounded-2xl border border-slate-700 p-5 bg-[#0f172a]">
        <CalculusSVG_L2 />
      </div>

      {/* 3. פרומפט זהב */}
      <GoldenPromptCard
        prompt="אני תלמיד/ת כיתה י״ב לומד/ת חקירת פונקציות לוגריתמיות. הפונקציה שלי היא f(x) = x² - 8ln(x). תהיה המורה שלי לתרגיל הזה. נחקור יחד: תחום הגדרה, חיוביות הביטוי מתחת ל-ln, האסימפטוטה האנכית, הנגזרת של כל איבר, נקודות קיצון ותחומי עלייה וירידה. שאל אותי שאלות מנחות — אל תיתן תשובות ישירות."
      >
        <p className="text-slate-300 text-sm leading-relaxed">
          העתק את הפרומפט הזה ל-AI להפעלתו כמורה — ואז נסח בעצמך כל שלב בתיבות למטה.
        </p>
      </GoldenPromptCard>

      {/* 4. שלבים עם תיבות טקסט */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const locked = i > 0 && !stepPassed(i - 1);
          if (locked) {
            return (
              <div key={i} className="p-4 rounded-xl border border-slate-800 bg-[#0a0f1e] opacity-50 flex items-center gap-3">
                <Lock size={16} className="text-slate-600 shrink-0" />
                <p className="text-slate-500 text-sm">השלב נעול — השלם את השלב הקודם תחילה</p>
              </div>
            );
          }
          return (
            <TutorStepMedium
              key={i}
              number={i + 1}
              title={step.title}
              description={step.description}
              contextWords={CONTEXT_WORDS}
              value={texts[i]}
              onChange={v => setTexts(t => t.map((x, j) => (j === i ? v : x)))}
              result={results[i]}
              onCheck={() => check(i)}
            />
          );
        })}
      </div>

      {l2Complete && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium text-center">
          <CheckCircle2 size={18} className="inline mr-2" />
          מצוין! מצאת את הקיצון ותחומי המונוטוניות
        </div>
      )}
    </div>
  );
}

function LevelAdvanced() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const ready = text.length >= GATE_CHARS;
  const progress = Math.min(100, (text.length / GATE_CHARS) * 100);

  return (
    <div className="space-y-5">

      {/* 1. שאלה */}
      <QuestionBox>
        נתונה הפונקציה <span className="font-mono text-violet-400">f(x) = ln(ax − 4)</span>.
        ידוע שהפונקציה עוברת בנקודה (3, 0). מצא את הפרמטר a.
      </QuestionBox>

      {/* 2. גרף */}
      <div className="rounded-2xl border border-slate-700 p-5 bg-[#0f172a]">
        <CalculusSVG_L3 />
      </div>

      {/* 3. פרומפט זהב — הסבר ידני */}
      <GoldenPromptCard>
        <p className="text-slate-300 text-sm leading-relaxed">
          ברמה זו <span className="text-violet-400 font-semibold">אתה כותב את הפרומפט</span> — נסח הוראה שלמה לסימולטור AI שתגרום לו ללמד אותך את הפתרון. הסבר לו את הנתונים, מה מבקשים, ובקש שינחה אותך שלב אחר שלב.
        </p>
      </GoldenPromptCard>

      {/* 4. שדה הכתיבה + שער */}
      {!submitted ? (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="לדוגמה: 'אני תלמיד/ת י״ב, יש לי f(x) = ln(ax-4) שעוברת ב-(3,0). הסבר לי כיצד להשתמש בנקודה הזו כדי למצוא את a, ואז בדוק שתחום ההגדרה תקין...'"
            className="w-full rounded-xl bg-[#020617] border border-slate-700 text-slate-200 text-sm p-4 resize-none focus:outline-none focus:border-violet-500/50"
            rows={5}
          />
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{text.length} תווים</span>
              <span>מינימום {GATE_CHARS}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${progress}%`,
                  background: ready ? "#a78bfa" : "linear-gradient(90deg, #6366f1, #a78bfa)",
                }}
              />
            </div>
          </div>
          <button
            disabled={!ready}
            onClick={() => setSubmitted(true)}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all"
            style={{
              background: ready ? "linear-gradient(135deg, #7c3aed, #a78bfa)" : "#1e293b",
              color: ready ? "white" : "#475569",
              cursor: ready ? "pointer" : "not-allowed",
              border: ready ? "none" : "1px solid #334155",
            }}
          >
            שלח לחונך
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-center space-y-2">
          <CheckCircle2 size={32} className="text-violet-400 mx-auto" />
          <p className="text-violet-300 font-bold text-lg">הפרומפט נשלח!</p>
          <p className="text-slate-400 text-sm">כל הכבוד — a = 5/3 ← הפונקציה היא ln(5x/3 − 4)</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LnPage() {
  const [level, setLevel] = useState<"basic" | "medium" | "advanced">("basic");

  const levels = [
    { id: "basic" as const, label: "בסיסי", sub: "תחום הגדרה ונגזרת", color: "emerald" },
    { id: "medium" as const, label: "בינוני", sub: "קיצון ומונוטוניות", color: "amber" },
    { id: "advanced" as const, label: "מתקדם", sub: "חקירת פרמטר", color: "violet" },
  ] as const;

  const colorMap = {
    emerald: {
      active: "border-emerald-500 bg-emerald-500/10",
      label: "text-emerald-400",
      sub: "text-emerald-300/70",
    },
    amber: {
      active: "border-amber-500 bg-amber-500/10",
      label: "text-amber-400",
      sub: "text-amber-300/70",
    },
    violet: {
      active: "border-violet-500 bg-violet-500/10",
      label: "text-violet-400",
      sub: "text-violet-300/70",
    },
  };

  return (
    <div style={{ background: "#020617", minHeight: "100vh" }} dir="rtl">

      {/* ── Header ── */}
      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link href="/topic/grade12/calculus" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" />
            חדו״א
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem" }}>

        {/* ── Hero ── */}
        <div className="text-center pt-12 pb-10 space-y-2">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">כיתה י״ב • 4 יח״ל</p>
          <h1 className="text-4xl font-extrabold text-white">פונקציות לוגריתמיות ln x</h1>
          <p className="text-slate-400 text-sm">תחום הגדרה • נגזרת • חקירה • אסימפטוטות</p>
        </div>

        {/* ── Level Picker ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {levels.map(lv => {
            const cm = colorMap[lv.color];
            const isActive = level === lv.id;
            return (
              <button
                key={lv.id}
                onClick={() => setLevel(lv.id)}
                className={`rounded-2xl border-2 p-4 text-right transition-all ${
                  isActive ? cm.active : "border-slate-700 bg-[#0f172a] hover:border-slate-600"
                }`}
              >
                <p className={`font-bold text-base ${isActive ? cm.label : "text-slate-300"}`}>{lv.label}</p>
                <p className={`text-xs mt-0.5 ${isActive ? cm.sub : "text-slate-500"}`}>{lv.sub}</p>
              </button>
            );
          })}
        </div>

        {/* ── Level Content ── */}
        <div className="mb-12">
          {level === "basic" && <LevelBasic />}
          {level === "medium" && <LevelMedium />}
          {level === "advanced" && <LevelAdvanced />}
        </div>

        {/* ── Lab ── */}
        <div className="mb-12">
          <FunctionLab />
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-800 pt-6 pb-12 flex justify-center">
          <Link
            href="/topic/grade12/calculus"
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
