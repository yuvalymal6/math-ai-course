"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Brain, ChevronRight, Copy, Check, Lock, CheckCircle2 } from "lucide-react";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";

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

function QuestionBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: "1rem 1.25rem" }}>
      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-1.5">השאלה</p>
      <div className="text-white text-base leading-relaxed">{children}</div>
    </div>
  );
}

function TutorStepBasic({ number, title, description, prompt, done, onToggle }: {
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
        <div className="flex items-center gap-3 flex-wrap">
          <CopyBtn text={prompt} />
          <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
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
            found ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-500"
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

function TutorStepMedium({ number, title, description, contextWords, value, onChange, result, onCheck }: {
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
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

// Level 1: f(x) = x²−4, shaded region between curve and x-axis from x=−2 to x=2
function IntegralSVG_L1() {
  const xMin = -3.3, xMax = 3.3;
  const yMin = -5.5, yMax = 5.5;
  const W = 300, H = 180;
  const toSX = (x: number) => 40 + ((x - xMin) / (xMax - xMin)) * 220;
  const toSY = (y: number) => 140 - ((y - yMin) / (yMax - yMin)) * 120;

  const curvePts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = xMin + (i / 100) * (xMax - xMin);
    const y = x * x - 4;
    if (y < yMin || y > yMax) continue;
    curvePts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }

  // Shaded polygon: curve from x=−2 to x=2 (both endpoints sit on x-axis since f(±2)=0)
  const shadePts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = -2 + (i / 60) * 4;
    shadePts.push(`${toSX(x).toFixed(1)},${toSY(x * x - 4).toFixed(1)}`);
  }

  const lx = toSX(-2), rx = toSX(2), ax = toSY(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" style={{ display: "block" }}>
      <line x1="38" y1={ax} x2={W - 5} y2={ax} stroke="#475569" strokeWidth="1" />
      <line x1="40" y1="10" x2="40" y2={H - 8} stroke="#475569" strokeWidth="1" />
      {/* Shaded */}
      <polygon points={shadePts.join(" ")} fill="rgba(52,211,153,0.2)" />
      {/* Curve */}
      <polyline points={curvePts.join(" ")} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Intersection markers */}
      <circle cx={lx} cy={ax} r="4" fill="#a78bfa" />
      <text x={lx} y={ax - 8} fill="#a78bfa" fontSize="9" textAnchor="middle" fontFamily="sans-serif">−2</text>
      <circle cx={rx} cy={ax} r="4" fill="#a78bfa" />
      <text x={rx} y={ax - 8} fill="#a78bfa" fontSize="9" textAnchor="middle" fontFamily="sans-serif">2</text>
      <text x={W - 10} y="22" textAnchor="end" fill="#34d399" fontSize="11" fontFamily="serif" fontStyle="italic">f(x)=x²−4</text>
    </svg>
  );
}

// Level 2: f(x)=eˣ (amber) and g(x)=x+1 (green), shaded between them x=0..2
function IntegralSVG_L2() {
  const xMin = -0.6, xMax = 2.8;
  const yMin = -0.5, yMax = 8.5;
  const W = 300, H = 180;
  const toSX = (x: number) => 40 + ((x - xMin) / (xMax - xMin)) * 240;
  const toSY = (y: number) => 160 - ((y - yMin) / (yMax - yMin)) * 145;

  const expPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = xMin + (i / 80) * (xMax - xMin);
    const y = Math.exp(x);
    if (y > yMax) continue;
    expPts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }

  // Shaded polygon: eˣ top from 0→2, then x+1 bottom from 2→0
  const shadePts: string[] = [];
  for (let i = 0; i <= 50; i++) {
    const x = (i / 50) * 2;
    shadePts.push(`${toSX(x).toFixed(1)},${toSY(Math.exp(x)).toFixed(1)}`);
  }
  for (let i = 50; i >= 0; i--) {
    const x = (i / 50) * 2;
    shadePts.push(`${toSX(x).toFixed(1)},${toSY(x + 1).toFixed(1)}`);
  }

  const x0 = toSX(0), x2 = toSX(2);
  const y0 = toSY(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" style={{ display: "block" }}>
      <line x1="38" y1={y0} x2={W - 5} y2={y0} stroke="#475569" strokeWidth="1" />
      <line x1="40" y1="8" x2="40" y2={H - 6} stroke="#475569" strokeWidth="1" />
      {/* Shaded */}
      <polygon points={shadePts.join(" ")} fill="rgba(245,158,11,0.2)" />
      {/* Boundary dashes */}
      <line x1={x0} y1={toSY(1)} x2={x0} y2={y0} stroke="#64748b" strokeWidth="1" strokeDasharray="3,2" />
      <line x1={x2} y1={toSY(Math.exp(2))} x2={x2} y2={toSY(3)} stroke="#64748b" strokeWidth="1" strokeDasharray="3,2" />
      {/* eˣ curve */}
      <polyline points={expPts.join(" ")} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* x+1 line */}
      <line x1={toSX(xMin)} y1={toSY(xMin + 1)} x2={toSX(xMax)} y2={toSY(xMax + 1)} stroke="#34d399" strokeWidth="2" />
      {/* Labels */}
      <text x={W - 10} y="22" textAnchor="end" fill="#f59e0b" fontSize="10" fontFamily="serif" fontStyle="italic">f(x)=eˣ</text>
      <text x={W - 10} y="36" textAnchor="end" fill="#34d399" fontSize="10" fontFamily="serif" fontStyle="italic">g(x)=x+1</text>
      <text x={x0} y={y0 + 12} fill="#a78bfa" fontSize="9" textAnchor="middle" fontFamily="sans-serif">0</text>
      <text x={x2} y={y0 + 12} fill="#a78bfa" fontSize="9" textAnchor="middle" fontFamily="sans-serif">2</text>
    </svg>
  );
}

// Level 3: f(x)=a/x shown as 1/x, shaded from x=1 to x=e
function IntegralSVG_L3() {
  const xMin = 0.15, xMax = 3.5;
  const yMin = -0.3, yMax = 4.5;
  const W = 300, H = 175;
  const toSX = (x: number) => 40 + ((x - xMin) / (xMax - xMin)) * 240;
  const toSY = (y: number) => 150 - ((y - yMin) / (yMax - yMin)) * 135;

  const curvePts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = 0.19 + (i / 100) * (xMax - 0.19);
    const y = 1 / x;
    if (y > yMax) continue;
    curvePts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }

  const e = Math.E;
  const shadePts: string[] = [];
  for (let i = 0; i <= 50; i++) {
    const x = 1 + (i / 50) * (e - 1);
    shadePts.push(`${toSX(x).toFixed(1)},${toSY(1 / x).toFixed(1)}`);
  }
  shadePts.push(`${toSX(e).toFixed(1)},${toSY(0).toFixed(1)}`);
  shadePts.push(`${toSX(1).toFixed(1)},${toSY(0).toFixed(1)}`);

  const x1 = toSX(1), xe = toSX(e), y0 = toSY(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" style={{ display: "block" }}>
      <line x1="38" y1={y0} x2={W - 5} y2={y0} stroke="#475569" strokeWidth="1" />
      <line x1="40" y1="8" x2="40" y2={H - 6} stroke="#475569" strokeWidth="1" />
      {/* Asymptote x=0 */}
      <line x1={toSX(0.02)} y1="8" x2={toSX(0.02)} y2={H - 6} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" />
      {/* Shaded */}
      <polygon points={shadePts.join(" ")} fill="rgba(139,92,246,0.22)" />
      {/* Boundary lines */}
      <line x1={x1} y1={toSY(1)} x2={x1} y2={y0} stroke="#64748b" strokeWidth="1" strokeDasharray="3,2" />
      <line x1={xe} y1={toSY(1 / e)} x2={xe} y2={y0} stroke="#64748b" strokeWidth="1" strokeDasharray="3,2" />
      {/* Curve */}
      <polyline points={curvePts.join(" ")} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Labels */}
      <text x={W - 10} y="20" textAnchor="end" fill="#a78bfa" fontSize="11" fontFamily="serif" fontStyle="italic">f(x)=a/x</text>
      <text x={x1} y={y0 + 12} fill="#a78bfa" fontSize="9" textAnchor="middle" fontFamily="sans-serif">1</text>
      <text x={xe} y={y0 + 12} fill="#a78bfa" fontSize="9" textAnchor="middle" fontFamily="sans-serif">e</text>
    </svg>
  );
}

// ─── IntegralLab ───────────────────────────────────────────────────────────────

function IntegralLab() {
  const [a, setA] = useState(-2);
  const [b, setB] = useState(2);

  // f(x) = x², ∫ₐᵇ x² dx = b³/3 − a³/3
  const integralValue = (b ** 3 - a ** 3) / 3;
  const area = Math.abs(integralValue);

  const xMin = -3.5, xMax = 3.5;
  const yMin = -0.5, yMax = 10;
  const W = 320, H = 200;
  const toSX = (x: number) => 45 + ((x - xMin) / (xMax - xMin)) * 260;
  const toSY = (y: number) => 170 - ((y - yMin) / (yMax - yMin)) * 155;

  const curvePts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = xMin + (i / 100) * (xMax - xMin);
    const y = x * x;
    if (y > yMax) continue;
    curvePts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }

  const lo = Math.min(a, b), hi = Math.max(a, b);
  const shadePts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = lo + (i / 60) * (hi - lo);
    shadePts.push(`${toSX(x).toFixed(1)},${toSY(x * x).toFixed(1)}`);
  }
  shadePts.push(`${toSX(hi).toFixed(1)},${toSY(0).toFixed(1)}`);
  shadePts.push(`${toSX(lo).toFixed(1)},${toSY(0).toFixed(1)}`);

  const negativeIntegral = a > b;

  return (
    <section style={{
      border: "8px solid #334155",
      borderRadius: "24px",
      padding: "2rem",
      background: "#020617",
      boxSizing: "border-box",
      width: "100%",
    }}>
      <h3 className="text-white font-bold text-xl mb-1">מעבדה: ∫ₐᵇ x² dx</h3>
      <p className="text-slate-400 text-sm mb-6">הזז את גבולות האינטגרציה וראה את השטח המוצלל והערך משתנים</p>

      {/* Sliders */}
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              גבול תחתון a = <span className="text-violet-400 font-bold">{a}</span>
            </label>
            <input
              type="range" min={-3} max={2} step={1} value={a}
              onChange={e => setA(Number(e.target.value))}
              className="w-full accent-violet-400"
              style={{ display: "block" }}
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1"><span>-3</span><span>2</span></div>
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium mb-2 block">
              גבול עליון b = <span className="text-emerald-400 font-bold">{b}</span>
            </label>
            <input
              type="range" min={0} max={3} step={1} value={b}
              onChange={e => setB(Number(e.target.value))}
              className="w-full accent-emerald-400"
              style={{ display: "block" }}
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1"><span>0</span><span>3</span></div>
          </div>
        </div>
      </div>

      {/* SVG */}
      <div style={{ height: 240, display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1.5rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
          <line x1="42" y1={toSY(0)} x2={W - 5} y2={toSY(0)} stroke="#475569" strokeWidth="1" />
          <line x1="45" y1="8" x2="45" y2={H - 5} stroke="#475569" strokeWidth="1" />
          {/* Shaded */}
          {lo < hi && (
            <polygon points={shadePts.join(" ")} fill={negativeIntegral ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.25)"} />
          )}
          {/* Boundary dashes */}
          <line x1={toSX(a)} y1={toSY(a * a)} x2={toSX(a)} y2={toSY(0)} stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4,2" />
          <line x1={toSX(b)} y1={toSY(b * b)} x2={toSX(b)} y2={toSY(0)} stroke="#34d399" strokeWidth="1.5" strokeDasharray="4,2" />
          {/* Curve */}
          <polyline points={curvePts.join(" ")} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Axis labels */}
          <text x={toSX(a)} y={toSY(0) + 13} fill="#a78bfa" fontSize="9" textAnchor="middle" fontFamily="sans-serif">a={a}</text>
          <text x={toSX(b)} y={toSY(0) + 13} fill="#34d399" fontSize="9" textAnchor="middle" fontFamily="sans-serif">b={b}</text>
          <text x={W - 8} y="20" textAnchor="end" fill="#6366f1" fontSize="11" fontFamily="serif" fontStyle="italic">f(x)=x²</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">גבול תחתון</p>
            <p className="text-violet-400 font-bold text-lg">a = {a}</p>
          </div>
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">גבול עליון</p>
            <p className="text-emerald-400 font-bold text-lg">b = {b}</p>
          </div>
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-slate-500 text-xs mb-1">ערך האינטגרל</p>
            <p className={`font-bold text-lg ${negativeIntegral ? "text-red-400" : "text-indigo-400"}`}>
              {integralValue.toFixed(3)}
            </p>
          </div>
        </div>
        <p className="text-slate-600 text-xs text-center mt-3">
          ∫ₐᵇ x² dx = b³/3 − a³/3
          {negativeIntegral ? " • a > b: האינטגרל שלילי" : ` • שטח = ${area.toFixed(3)}`}
        </p>
      </div>
    </section>
  );
}

// ─── Level Sections ─────────────────────────────────────────────────────────────

function LevelBasic() {
  const [done, setDone] = useState([false, false, false]);
  const toggle = (i: number) => setDone(d => d.map((v, j) => j === i ? !v : v));
  const allDone = done.every(Boolean);

  return (
    <div className="space-y-5">

      {/* 1. שאלה */}
      <QuestionBox>
        נתונה הפונקציה <span className="font-mono text-emerald-400">f(x) = x² − 4</span>.
        מצא את השטח הכלוא בין הפונקציה לציר ה-x, בין נקודות החיתוך.
      </QuestionBox>

      {/* 2. גרף */}
      <div className="rounded-2xl border border-slate-700 p-5 bg-[#0f172a]">
        <IntegralSVG_L1 />
      </div>

      {/* 3. פרומפט זהב */}
      <GoldenPromptCard
        prompt="אני תלמיד/ת כיתה י״ב לומד/ת חשבון אינטגרלי. הפונקציה שלי היא f(x) = x² - 4. אני צריך/ה למצוא את השטח הכלוא בין הפונקציה לציר ה-x. תהיה המורה שלי: עזור לי למצוא את נקודות החיתוך עם ציר ה-x, לקבוע את תחום האינטגרציה, לחשב את האינטגרל ולהתייחס לסימן הפונקציה. שאל אותי שאלות מנחות — אל תיתן את התשובה ישירות."
      >
        <p className="text-slate-300 text-sm leading-relaxed">
          העתק פרומפט זה ל-AI להפעלתו כמורה מלווה — ואז עבור שלב אחרי שלב למטה.
        </p>
      </GoldenPromptCard>

      {/* 4. שלבים */}
      <div className="space-y-3">
        <TutorStepBasic
          number={1}
          title="שלב א׳ — נקודות חיתוך עם ציר x"
          description="בקש מה-AI לעזור לך למצוא היכן הפונקציה חוצה את ציר ה-x, ולהסביר מדוע זה קובע את גבולות האינטגרציה."
          prompt="יש לי f(x) = x² - 4. אני צריך/ה למצוא את נקודות החיתוך עם ציר ה-x. כיצד פותרים x² - 4 = 0? ומדוע הנקודות האלה קובעות את גבולות האינטגרציה כשמחשבים שטח כלוא?"
          done={done[0]}
          onToggle={() => toggle(0)}
        />
        <TutorStepBasic
          number={2}
          title="שלב ב׳ — הגדרת האינטגרל והאנטי-נגזרת"
          description="בקש מה-AI להסביר כיצד מגדירים את האינטגרל המסוים ולחשב את האנטי-נגזרת של כל איבר."
          prompt="מצאתי שהגבולות הם x=-2 ו-x=2. מה הוא האינטגרל המסוים שמחשב את השטח? כיצד מוצאים את האנטי-נגזרת של x² - 4? הראה לי את הנוסחה לחישוב אינטגרל מסוים צעד אחר צעד."
          done={done[1]}
          onToggle={() => toggle(1)}
        />
        <TutorStepBasic
          number={3}
          title="שלב ג׳ — הצבה וחישוב השטח"
          description="הצב את הגבולות, חשב את ההפרש. הפונקציה שלילית בתחום — מדוע לוקחים ערך מוחלט?"
          prompt="האנטי-נגזרת היא F(x) = x³/3 - 4x. כיצד מציבים F(2) - F(-2) ומחשבים? הפונקציה שלילית בתחום [-2,2] — מה זה אומר על סימן האינטגרל? כיצד מגיעים לשטח החיובי הסופי?"
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
  const CONTEXT_WORDS = ["אינטגרל", "שטח", "פונקציה", "גבולות", "נוסחה", "להציב", "חישוב", "אנטי-נגזרת"];

  const [texts, setTexts] = useState(["", ""]);
  const [results, setResults] = useState<(ScoreResult | null)[]>([null, null]);

  const check = (i: number) => {
    const r = calculatePromptScore(texts[i], CONTEXT_WORDS);
    setResults(rs => rs.map((v, j) => j === i ? r : v));
    if (!r.blocked && r.score >= 75) {
      // pass — no additional action needed, result state drives lock logic
    }
  };

  const steps = [
    {
      title: "שלב א׳ — זיהוי הפונקציה העליונה והתחתונה",
      description: "נסח פרומפט ל-AI שיזהה מי עליונה ומי תחתונה ב-[0,2], ויגדיר את אינטגרל ההפרש.",
    },
    {
      title: "שלב ב׳ — חישוב האינטגרל",
      description: "נסח פרומפט להמשך: חשב ∫₀²(eˣ − x − 1)dx — אנטי-נגזרת, הצבת גבולות, תשובה.",
    },
  ];

  const stepPassed = (i: number) => {
    const r = results[i];
    return r !== null && !r.blocked && r.score >= 75;
  };

  const l2Complete = results.every((r, i) => stepPassed(i));

  return (
    <div className="space-y-5">

      {/* 1. שאלה */}
      <QuestionBox>
        נתונות הפונקציות <span className="font-mono text-amber-400">f(x) = eˣ</span> ו-<span className="font-mono text-emerald-400">g(x) = x + 1</span>.
        מצא את השטח הכלוא ביניהן בין x = 0 לבין x = 2.
      </QuestionBox>

      {/* 2. גרף */}
      <div className="rounded-2xl border border-slate-700 p-5 bg-[#0f172a]">
        <IntegralSVG_L2 />
      </div>

      {/* 3. פרומפט זהב */}
      <GoldenPromptCard
        prompt="אני תלמיד/ת כיתה י״ב לומד/ת אינטגרלים. יש לי שתי פונקציות: f(x) = eˣ ו-g(x) = x+1. אני צריך/ה למצוא את השטח ביניהן בין x=0 לבין x=2. תהיה המורה שלי: נזהה מי הפונקציה העליונה ומי התחתונה, נכתוב את אינטגרל ההפרש, נחשב אנטי-נגזרת ונציב את הגבולות. שאל אותי שאלות מנחות — אל תיתן את התשובה ישירות."
      >
        <p className="text-slate-300 text-sm leading-relaxed">
          העתק פרומפט זה להפעלת המורה — ואז נסח בעצמך כל שלב בתיבות למטה.
        </p>
      </GoldenPromptCard>

      {/* 4. שלבים */}
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
              onChange={v => setTexts(t => t.map((x, j) => j === i ? v : x))}
              result={results[i]}
              onCheck={() => check(i)}
            />
          );
        })}
      </div>

      {l2Complete && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium text-center">
          <CheckCircle2 size={18} className="inline mr-2" />
          מצוין! חישבת את השטח בין הפונקציות — e² − 5
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
        נתונה הפונקציה <span className="font-mono text-violet-400">f(x) = a/x</span>.
        ידוע שהשטח הכלוא בין x = 1 לבין x = e שווה ל-5. מצא את הפרמטר a.
      </QuestionBox>

      {/* 2. גרף */}
      <div className="rounded-2xl border border-slate-700 p-5 bg-[#0f172a]">
        <IntegralSVG_L3 />
      </div>

      {/* 3. פרומפט זהב */}
      <GoldenPromptCard>
        <p className="text-slate-300 text-sm leading-relaxed">
          ברמה זו <span className="text-violet-400 font-semibold">אתה כותב את הפרומפט</span> — נסח הוראה שלמה לסימולטור AI שתגרום לו ללמד אותך לפתור: הסבר את הנתונים, בקש שיחשב ∫₁ᵉ (a/x)dx, יציב גבולות, ויבדד את a.
        </p>
      </GoldenPromptCard>

      {/* 4. שדה כתיבה + שער */}
      {!submitted ? (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="לדוגמה: 'אני תלמיד/ת י״ב, יש לי f(x) = a/x. ידוע שהשטח בין x=1 לבין x=e שווה 5. עזור לי לחשב את האינטגרל המסוים, להציב גבולות ולבדד את a...'"
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
          <p className="text-slate-400 text-sm">כל הכבוד — ∫₁ᵉ (a/x)dx = a·[ln x]₁ᵉ = a·1 = a = 5</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegralPage() {
  const [level, setLevel] = useState<"basic" | "medium" | "advanced">("basic");

  const levels = [
    { id: "basic" as const, label: "בסיסי", sub: "שטח בין עקומה לציר x", color: "emerald" },
    { id: "medium" as const, label: "בינוני", sub: "שטח בין שתי עקומות", color: "amber" },
    { id: "advanced" as const, label: "מתקדם", sub: "אינטגרל עם פרמטר", color: "violet" },
  ] as const;

  const colorMap = {
    emerald: { active: "border-emerald-500 bg-emerald-500/10", label: "text-emerald-400", sub: "text-emerald-300/70" },
    amber:   { active: "border-amber-500 bg-amber-500/10",   label: "text-amber-400",   sub: "text-amber-300/70"   },
    violet:  { active: "border-violet-500 bg-violet-500/10", label: "text-violet-400",  sub: "text-violet-300/70"  },
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
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest">כיתה י״ב • 4 יח״ל</p>
          <h1 className="text-4xl font-extrabold text-white">חשבון אינטגרלי</h1>
          <p className="text-slate-400 text-sm">אינטגרל מסוים • שטחים כלואים • פרמטרים</p>
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
          {level === "basic"    && <LevelBasic />}
          {level === "medium"   && <LevelMedium />}
          {level === "advanced" && <LevelAdvanced />}
        </div>

        {/* ── Lab ── */}
        <div className="mb-12">
          <IntegralLab />
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
