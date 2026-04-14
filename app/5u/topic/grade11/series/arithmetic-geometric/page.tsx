"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── KaTeX helpers ───────────────────────────────────────────────────────────

function InlineMath({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: false }); }, [children]);
  return <span ref={ref} />;
}

function DisplayMath({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]);
  return <span ref={ref} style={{ display: "block", textAlign: "center" }} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  coaching: string;
  prompt: string;
  keywords: string[];
  keywordHint: string;
  contextWords?: string[];
  stationWords?: string[];
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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  /* Dots on a number line with equal spacing arrows labeled "d" and "?" */
  const dots = [40, 80, 120, 160, 200, 240];
  return (
    <svg viewBox="0 0 300 80" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={20} y1={50} x2={280} y2={50} stroke="#94a3b8" strokeWidth={1.5} />
      {dots.map((cx, i) => (
        <circle key={i} cx={cx} cy={50} r={6} fill="#16A34A" opacity={0.6} />
      ))}
      {/* spacing arrows */}
      {dots.slice(0, -1).map((cx, i) => (
        <g key={`a${i}`}>
          <line x1={cx + 8} y1={35} x2={dots[i + 1] - 8} y2={35} stroke="#f59e0b" strokeWidth={1.2} markerEnd="url(#arrowB)" />
          <text x={(cx + dots[i + 1]) / 2} y={28} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>{i < 2 ? "d" : "?"}</text>
        </g>
      ))}
      {/* last dot label */}
      <text x={dots[dots.length - 1]} y={70} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">aₙ</text>
      <text x={dots[0]} y={70} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">a₁</text>
      <defs>
        <marker id="arrowB" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
        </marker>
      </defs>
    </svg>
  );
}

function MediumSVG() {
  /* Dots getting smaller/larger with "x q" arrows */
  const sizes = [8, 6.5, 5, 3.8, 2.8, 2];
  const xs = [40, 80, 120, 160, 200, 240];
  return (
    <svg viewBox="0 0 300 80" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={20} y1={50} x2={280} y2={50} stroke="#94a3b8" strokeWidth={1.5} />
      {xs.map((cx, i) => (
        <circle key={i} cx={cx} cy={50} r={sizes[i]} fill="#EA580C" opacity={0.6} />
      ))}
      {xs.slice(0, -1).map((cx, i) => (
        <g key={`a${i}`}>
          <line x1={cx + sizes[i] + 3} y1={35} x2={xs[i + 1] - sizes[i + 1] - 3} y2={35} stroke="#a78bfa" strokeWidth={1.2} markerEnd="url(#arrowM)" />
          <text x={(cx + xs[i + 1]) / 2} y={28} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>{"\u00D7q"}</text>
        </g>
      ))}
      <text x={xs[0]} y={70} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">a₁</text>
      <text x={xs[xs.length - 1]} y={70} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">aₙ</text>
      <defs>
        <marker id="arrowM" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#a78bfa" />
        </marker>
      </defs>
    </svg>
  );
}

function AdvancedSVG() {
  /* Two equation bubbles with "?" connecting to a₁ and d/q */
  return (
    <svg viewBox="0 0 300 120" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* equation bubble 1 */}
      <rect x={20} y={10} width={110} height={40} rx={12} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={75} y={35} fontSize={11} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>משוואה ?</text>
      {/* equation bubble 2 */}
      <rect x={170} y={10} width={110} height={40} rx={12} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
      <text x={225} y={35} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>משוואה ?</text>
      {/* arrows down */}
      <line x1={75} y1={50} x2={100} y2={85} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4,3" />
      <line x1={225} y1={50} x2={200} y2={85} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4,3" />
      {/* result boxes */}
      <rect x={70} y={80} width={60} height={30} rx={8} fill="none" stroke="#34d399" strokeWidth={1.5} />
      <text x={100} y={100} fontSize={11} fill="#34d399" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>a₁ = ?</text>
      <rect x={170} y={80} width={60} height={30} rx={8} fill="none" stroke="#34d399" strokeWidth={1.5} />
      <text x={200} y={100} fontSize={11} fill="#34d399" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>d/q = ?</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>*</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "16,185,129", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText]     = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);

  const passed = !!(result && !result.blocked && result.score >= 75);

  const validate = () => {
    if (text.trim().length < 20) {
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." });
      return;
    }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>&#128274;</span>
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
    </div>
  );

  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה
          </button>
        )}

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
        )}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText]       = useState("");
  const [result, setResult]   = useState<ScoreResult | null>(null);
  const [copied, setCopied]   = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;

  const ROSE = { border: "rgba(244,63,94,0.35)", dim: "rgba(244,63,94,0.2)", text: "#fda4af" };

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span>&#128274;</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span>
    </div>
  );

  const validate = () => {
    if (text.trim().length < 20) {
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." });
      return;
    }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : ROSE.border}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : ROSE.dim}` }}>
        {passed
          ? <CheckCircle size={14} color="#34d399" />
          : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>
              <span>ציון</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${ROSE.border}`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ladders ─────────────────────────────────────────────────────────────────

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => {
    setCompleted(prev => { const next = [...prev]; next[i] = true; return next; });
    const el = document.getElementById(`basic-step-${i + 1}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  };
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  סיימתי סעיף זה
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>&#128274;</div>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <TutorStepMedium
          key={i} step={s}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
          borderRgb={borderRgb}
        />
      ))}
    </div>
  );
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#991b1b"
        accentRgb="153,27,27"
        requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["סדרה", "חשבונית", "הנדסית", "הפרש", "מנה", "סכום"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } -- { s.label }</span>
              <span style={{ fontSize: 16 }}>&#128274;</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ s.phase } -- { s.label }</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{ s.prompt }</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                סיימתי סעיף זה
              </button>
            </div>
          )}
        </div>
      ))}

      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#127942;</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד -- השלמת את הרמה המתקדמת!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את כל הסעיפים.</div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "סדרה חשבונית -- איבר כללי וסכום",
    problem: "נתונה סדרה חשבונית שבה האיבר הראשון הוא a₁ וההפרש הוא d.\n\nא. כתבו את הנוסחה לאיבר הכללי aₙ.\nב. מצאו את האיבר ה-20 בסדרה (a₂₀).\nג. חשבו את סכום 20 האיברים הראשונים (S₂₀) באמצעות נוסחת הסכום.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "טעות off-by-one: (n-1)d ולא nd", text: "הנוסחה היא aₙ = a₁ + (n-1)d ולא a₁ + nd. למשל, האיבר השני הוא a₁ + d ולא a₁ + 2d. ההפרש מוכפל ב-(n-1) כי מהאיבר הראשון לשני יש קפיצה אחת בלבד." },
      { title: "בלבול בין aₙ לבין Sₙ", text: "aₙ הוא האיבר ה-n בלבד. Sₙ הוא סכום n האיברים הראשונים. תלמידים רבים מציבים את aₙ במקום Sₙ ולהפך -- שימו לב מה השאלה מבקשת!" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 5 יחידות, ומצרף/ת שאלה בנושא סדרה חשבונית -- איבר כללי וסכום. אני רוצה שתהיה המורה הפרטי שלי -- תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי -- שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "כתיבת האיבר הכללי", coaching: "", prompt: "נתונה סדרה חשבונית עם a₁ ו-d. תנחה אותי כיצד לכתוב את הנוסחה aₙ = a₁ + (n-1)d ותסביר מדוע מכפילים ב-(n-1) ולא ב-n.", keywords: [], keywordHint: "", contextWords: ["סדרה", "חשבונית", "איבר כללי", "הפרש", "נוסחה", "n-1"] },
      { phase: "סעיף ב׳", label: "חישוב a₂₀", coaching: "", prompt: "נתונה סדרה חשבונית עם a₁ ו-d. תדריך אותי כיצד להציב n=20 בנוסחת האיבר הכללי כדי למצוא את a₂₀.", keywords: [], keywordHint: "", contextWords: ["הצבה", "a₂₀", "איבר", "חשבונית", "הפרש", "20"] },
      { phase: "סעיף ג׳", label: "חישוב סכום S₂₀", coaching: "", prompt: "נתונה סדרה חשבונית. תכווין אותי לחשב את סכום 20 האיברים הראשונים S₂₀ באמצעות נוסחת הסכום Sₙ = n(a₁+aₙ)/2.", keywords: [], keywordHint: "", contextWords: ["סכום", "Sₙ", "נוסחה", "חשבונית", "איברים", "חצי"] },
    ],
  },
  {
    id: "medium",
    title: "סדרה הנדסית -- מנה וסכום אינסופי",
    problem: "נתונה סדרה הנדסית שבה האיבר הראשון הוא a₁ והמנה היא q.\n\nא. כתבו את הנוסחה לאיבר הכללי aₙ = a₁·qⁿ⁻¹.\nב. חשבו את סכום n האיברים הראשונים Sₙ.\nג. עבור |q|<1, חשבו את הסכום האינסופי S∞ = a₁/(1-q) והסבירו מדוע הסדרה מתכנסת.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שימוש ב-qⁿ במקום qⁿ⁻¹", text: "הנוסחה לאיבר הכללי היא aₙ = a₁·qⁿ⁻¹ ולא a₁·qⁿ. למשל, האיבר הראשון הוא a₁·q⁰ = a₁ (ולא a₁·q). שגיאה זו מזיזה את כל הסדרה באיבר אחד!" },
      { title: "שכחת התנאי |q|<1 לסכום אינסופי", text: "הנוסחה S∞ = a₁/(1-q) תקפה רק כאשר |q|<1. אם |q|≥1 הסדרה מתבדרת והסכום האינסופי לא קיים. חובה לציין ולבדוק תנאי זה!" },
    ],
    goldenPrompt: `אני בכיתה יא', 5 יחידות, מצרף/ת תרגיל בנושא סדרה הנדסית -- מנה, סכום סופי וסכום אינסופי.

אל תיתן לי את החישוב -- שאל אותי שאלות מנחות על כתיבת האיבר הכללי, הצבה בנוסחת סכום, ותנאי ההתכנסות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: "אני מוכן להמשיך."`,
    steps: [
      { phase: "סעיף א׳", label: "כתיבת האיבר הכללי", coaching: "", prompt: "נתונה סדרה הנדסית עם a₁ ו-q. תנחה אותי לכתוב את הנוסחה aₙ = a₁·qⁿ⁻¹ ותסביר מדוע המעריך הוא n-1.", keywords: [], keywordHint: "", contextWords: ["סדרה", "הנדסית", "מנה", "איבר כללי", "חזקה", "n-1"] },
      { phase: "סעיף ב׳", label: "חישוב סכום סופי Sₙ", coaching: "", prompt: "נתונה סדרה הנדסית עם a₁ ו-q. תדריך אותי כיצד להשתמש בנוסחה Sₙ = a₁(qⁿ-1)/(q-1) לחישוב סכום n איברים.", keywords: [], keywordHint: "", contextWords: ["סכום", "סופי", "נוסחה", "הנדסית", "מנה", "Sₙ"] },
      { phase: "סעיף ג׳", label: "סכום אינסופי והתכנסות", coaching: "", prompt: "נתונה סדרה הנדסית עם |q|<1. תכווין אותי לחשב S∞ = a₁/(1-q) ולהסביר מדוע הסדרה מתכנסת כאשר |q|<1.", keywords: [], keywordHint: "", contextWords: ["התכנסות", "אינסופי", "S∞", "מנה", "קטן מ-1", "גבול"] },
    ],
  },
  {
    id: "advanced",
    title: "שתי משוואות עם שני נעלמים",
    problem: "נתונה סדרה חשבונית. ידוע כי:\n  S₅ = 25\n  a₃ = 5\n\nא. כתבו שתי משוואות עם שני הנעלמים a₁ ו-d.\nב. פתרו את המערכת ומצאו את a₁ ואת d.\nג. מצאו את a₁₀ ואת S₁₀.\nד. וודאו שהפתרון מקיים את שני התנאים המקוריים.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "הצבה שגויה בנוסחת Sₙ", text: "עבור S₅ צריך להציב n=5 בנוסחה Sₙ = n(2a₁+(n-1)d)/2. טעות נפוצה: לשכוח את ה-2 במכנה, או להציב n=5 רק בחלק מהמקומות. רשמו את הנוסחה המלאה לפני ההצבה!" },
      { title: "אי-ביצוע בדיקה", text: "אחרי שמצאתם a₁ ו-d, חובה להציב בחזרה בשני התנאים המקוריים ולוודא שהם מתקיימים. בלי בדיקה -- לא ניתן לדעת אם הפתרון נכון." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים -- כתוב פרומפט שמנחה את ה-AI כיצד לעזור לך לפתור מערכת שתי משוואות בסדרה חשבונית, ללא מתן תשובות ישירות.",
    steps: [
      { phase: "סעיף א׳", label: "בניית שתי משוואות", coaching: "", prompt: "נתון: S₅=25, a₃=5 בסדרה חשבונית. תנחה אותי לכתוב שתי משוואות -- אחת מתוך a₃ = a₁+2d = 5, ואחת מתוך S₅ = 5(2a₁+4d)/2 = 25.", keywords: [], keywordHint: "", contextWords: ["משוואה", "a₁", "הפרש", "סדרה", "תנאי", "הצבה"] },
      { phase: "סעיף ב׳", label: "פתרון המערכת", coaching: "", prompt: "יש לי שתי משוואות עם a₁ ו-d. תדריך אותי לפתור את המערכת -- באיזו שיטה (הצבה או חיסור) עדיף להשתמש?", keywords: [], keywordHint: "", contextWords: ["פתרון", "מערכת", "הצבה", "חיסור", "נעלם", "משוואות"] },
      { phase: "סעיף ג׳", label: "חישוב a₁₀ ו-S₁₀", coaching: "", prompt: "מצאתי a₁ ו-d. תכווין אותי להציב בנוסחאות כדי למצוא את a₁₀ = a₁+9d ואת S₁₀ = 10(2a₁+9d)/2.", keywords: [], keywordHint: "", contextWords: ["a₁₀", "S₁₀", "הצבה", "נוסחה", "איבר", "סכום"] },
      { phase: "סעיף ד׳", label: "בדיקת הפתרון", coaching: "", prompt: "תנחה אותי לבדוק שהפתרון מקיים את שני התנאים: S₅=25 ו-a₃=5. איך מציבים בחזרה ומוודאים?", keywords: [], keywordHint: "", contextWords: ["בדיקה", "הצבה", "תנאי", "וידוא", "נכונות", "מקיים"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem);
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
            {ex.id === "basic" && "סדרה חשבונית (Arithmetic Series)"}
            {ex.id === "medium" && "סדרה הנדסית (Geometric Series)"}
            {ex.id === "advanced" && "מערכת משוואות בסדרות (System of Equations)"}
          </div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "נוסחת האיבר הכללי, חישוב איבר ספציפי, וסכום n איברים ראשונים בסדרה חשבונית."}
            {ex.id === "medium" && "נוסחת האיבר הכללי, סכום סופי, סכום אינסופי, ותנאי התכנסות בסדרה הנדסית."}
            {ex.id === "advanced" && "בניית מערכת משוואות משני תנאים על הסדרה, פתרון, ובדיקת נכונות."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: formulas */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>נוסחאות מרכזיות</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {ex.id === "basic" && (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>aₙ</span>
                  <span>a₁ + (n-1)d -- האיבר הכללי.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>Sₙ</span>
                  <span>n(a₁+aₙ)/2 -- סכום n איברים ראשונים.</span>
                </div>
              </>
            )}
            {ex.id === "medium" && (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>aₙ</span>
                  <span>a₁ * q^(n-1) -- האיבר הכללי.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>Sₙ</span>
                  <span>a₁(qⁿ-1)/(q-1) -- סכום סופי.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>S∞</span>
                  <span>a₁/(1-q) כאשר |q|&lt;1 -- סכום אינסופי.</span>
                </div>
              </>
            )}
            {ex.id === "advanced" && (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שיטה</span>
                  <span>תרגום כל תנאי למשוואה עם a₁ ו-d, ופתרון מערכת.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>בדיקה</span>
                  <span>הצבה חזרה בשני התנאים -- לוודא שוויון.</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Advanced extras */}
        {ex.id === "advanced" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>אסטרטגיית פתרון</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שלב 1</span>
                  <span>תרגום כל תנאי למשוואה עם a₁ ו-d.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שלב 2</span>
                  <span>פתרון המערכת (הצבה / חיסור).</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>שלב 3</span>
                  <span>הצבה בחזרה לבדיקת נכונות.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced -- outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── ArithmeticLab (basic) -- 2 sliders (a₁, d) ────────────────────────────

function ArithmeticLab() {
  const [a1, setA1] = useState(3);
  const [d, setD]   = useState(4);
  const st = STATION.basic;
  const n = 10;

  const terms = Array.from({ length: n }, (_, i) => a1 + i * d);
  const an = terms[n - 1];
  const sn = (n * (a1 + an)) / 2;

  const maxVal = Math.max(...terms.map(Math.abs), 1);
  const pad = 30, dotR = 6, gap = 28;
  const svgW = pad * 2 + (n - 1) * gap;

  return (
    <section style={{ border: "1px solid rgba(22,163,74,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת סדרה חשבונית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את a₁ ואת d וצפו כיצד הסדרה, האיבר הכללי והסכום משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>a₁</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{a1}</span>
          </div>
          <input type="range" min={-10} max={20} step={1} value={a1} onChange={(e) => setA1(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>d (הפרש)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{d}</span>
          </div>
          <input type="range" min={-10} max={10} step={1} value={d} onChange={(e) => setD(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG -- dots on number line with equal spacing */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${svgW} 80`} className="w-full max-w-lg mx-auto" aria-hidden>
          <line x1={pad} y1={50} x2={svgW - pad} y2={50} stroke="#94a3b8" strokeWidth={1.5} />
          {terms.map((v, i) => {
            const cx = pad + i * gap;
            const normH = maxVal > 0 ? (Math.abs(v) / maxVal) * 20 : 0;
            return (
              <g key={i}>
                <circle cx={cx} cy={50} r={dotR} fill={st.accentColor} opacity={0.6} />
                <text x={cx} y={50 - dotR - 4 - normH * 0.3} fontSize={8} fill="#2D3436" textAnchor="middle" fontFamily="monospace" fontWeight={600}>{v}</text>
              </g>
            );
          })}
          {/* spacing arrows */}
          {terms.slice(0, 3).map((_, i) => {
            const x1 = pad + i * gap + dotR + 2;
            const x2 = pad + (i + 1) * gap - dotR - 2;
            return (
              <g key={`arr${i}`}>
                <line x1={x1} y1={38} x2={x2} y2={38} stroke="#f59e0b" strokeWidth={1} />
                <text x={(x1 + x2) / 2} y={33} fontSize={7} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">+{d}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "a₁", val: a1.toString() },
          { label: "d", val: d.toString() },
          { label: `a₁₀`, val: an.toString() },
          { label: `S₁₀`, val: sn.toString() },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(22,163,74,0.4)", padding: 12 }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שנו את d -- שימו לב כיצד המרווח בין הנקודות גדל או קטן באופן שווה.</p>
    </section>
  );
}

// ─── GeometricLab (medium) -- 2 sliders (a₁, q) ────────────────────────────

function GeometricLab() {
  const [a1, setA1] = useState(8);
  const [qTen, setQTen] = useState(5); // q = qTen/10
  const q = qTen / 10;
  const st = STATION.medium;
  const n = 8;

  const terms = Array.from({ length: n }, (_, i) => a1 * Math.pow(q, i));
  const an = terms[n - 1];
  const sn = q === 1 ? a1 * n : a1 * (Math.pow(q, n) - 1) / (q - 1);
  const isConvergent = Math.abs(q) < 1 && q !== 0;
  const sInf = isConvergent ? a1 / (1 - q) : NaN;

  const maxVal = Math.max(...terms.map(Math.abs), 1);
  const pad = 30, gap = 30;
  const svgW = pad * 2 + (n - 1) * gap;

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת סדרה הנדסית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את a₁ ואת q וצפו כיצד האיברים גדלים/קטנים, ומתי הסכום האינסופי קיים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>a₁</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{a1}</span>
          </div>
          <input type="range" min={1} max={20} step={1} value={a1} onChange={(e) => setA1(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>q (מנה)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{q.toFixed(1)}</span>
          </div>
          <input type="range" min={-15} max={20} step={1} value={qTen} onChange={(e) => setQTen(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG -- dots with varying sizes */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${svgW} 80`} className="w-full max-w-lg mx-auto" aria-hidden>
          <line x1={pad} y1={50} x2={svgW - pad} y2={50} stroke="#94a3b8" strokeWidth={1.5} />
          {terms.map((v, i) => {
            const cx = pad + i * gap;
            const r = Math.max(2, Math.min(10, (Math.abs(v) / maxVal) * 10));
            return (
              <g key={i}>
                <circle cx={cx} cy={50} r={r} fill={st.accentColor} opacity={0.6} />
                <text x={cx} y={50 - r - 5} fontSize={7} fill="#2D3436" textAnchor="middle" fontFamily="monospace" fontWeight={600}>{v.toFixed(v === Math.round(v) ? 0 : 1)}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: `a₈`, val: an.toFixed(2) },
          { label: `S₈`, val: sn.toFixed(2) },
          { label: "S∞", val: isConvergent ? sInf.toFixed(2) : "---" },
          { label: "מתכנסת?", val: isConvergent ? "כן" : "לא" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(234,88,12,0.4)", padding: 12 }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.label === "מתכנסת?" ? (isConvergent ? "#16a34a" : "#dc2626") : st.accentColor, fontWeight: 700, fontSize: row.val.length > 6 ? 14 : 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {isConvergent ? "כאשר |q|<1 הסכום מתכנס! שנו q וצפו כיצד S∞ משתנה." : "הסדרה מתבדרת -- הסכום האינסופי לא קיים. נסו q קטן מ-1."}
      </p>
    </section>
  );
}

// ─── SystemLab (advanced) -- 2 sliders (a₁, d) ─────────────────────────────

function SystemLab() {
  const [a1, setA1] = useState(1);
  const [d, setD]   = useState(2);
  const st = STATION.advanced;

  // Check conditions: S₅ = 25, a₃ = 5
  const a3 = a1 + 2 * d;
  const s5 = (5 * (2 * a1 + 4 * d)) / 2;
  const cond1Ok = Math.abs(a3 - 5) < 0.01;
  const cond2Ok = Math.abs(s5 - 25) < 0.01;
  const bothOk = cond1Ok && cond2Ok;

  const a10 = a1 + 9 * d;
  const s10 = (10 * (2 * a1 + 9 * d)) / 2;

  return (
    <section style={{ border: "1px solid rgba(220,38,38,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מערכת משוואות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את a₁ ואת d ונסו למצוא את הערכים שמקיימים את שני התנאים: a₃ = 5 ו-S₅ = 25.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>a₁</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{a1}</span>
          </div>
          <input type="range" min={-10} max={10} step={1} value={a1} onChange={(e) => setA1(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>d (הפרש)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{d}</span>
          </div>
          <input type="range" min={-10} max={10} step={1} value={d} onChange={(e) => setD(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Condition checks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ borderRadius: 16, background: cond1Ok ? "rgba(220,252,231,0.8)" : "rgba(254,226,226,0.8)", border: `2px solid ${cond1Ok ? "#16a34a" : "#dc2626"}`, padding: "12px 16px", textAlign: "center", transition: "all 0.3s" }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4, fontWeight: 600 }}>a₃ = {a3}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: cond1Ok ? "#16a34a" : "#dc2626" }}>{cond1Ok ? "= 5" : "!= 5"}</div>
        </div>
        <div style={{ borderRadius: 16, background: cond2Ok ? "rgba(220,252,231,0.8)" : "rgba(254,226,226,0.8)", border: `2px solid ${cond2Ok ? "#16a34a" : "#dc2626"}`, padding: "12px 16px", textAlign: "center", transition: "all 0.3s" }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4, fontWeight: 600 }}>S₅ = {s5}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: cond2Ok ? "#16a34a" : "#dc2626" }}>{cond2Ok ? "= 25" : "!= 25"}</div>
        </div>
      </div>

      {/* Solution found banner */}
      {bothOk && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1rem 1.5rem", marginBottom: "2rem", textAlign: "center" }}>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>מצאת את הפתרון!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>a₁ = {a1}, d = {d} מקיימים את שני התנאים.</div>
        </motion.div>
      )}

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "a₁₀", val: a10.toString() },
          { label: "S₁₀", val: s10.toString() },
          { label: "נמצא פתרון?", val: bothOk ? "כן" : "לא" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(220,38,38,0.4)", padding: 12 }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.label === "נמצא פתרון?" ? (bothOk ? "#16a34a" : "#dc2626") : st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>נסו למצוא את a₁ ו-d שמקיימים גם a₃ = 5 וגם S₅ = 25. כמה פתרונות יש?</p>
    </section>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",  border: "border-green-600",  bg: "bg-green-600/10",  glowColor: "rgba(22,163,74,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700", border: "border-orange-600", bg: "bg-orange-600/10", glowColor: "rgba(234,88,12,0.3)"  },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",    border: "border-red-700",    bg: "bg-red-700/10",    glowColor: "rgba(220,38,38,0.3)"  },
];

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"arithmetic" | "geometric" | "system" | null>(null);

  const tabs = [
    { id: "arithmetic" as const, label: "חשבונית", tex: "a_n", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "geometric" as const, label: "הנדסית", tex: "a_1 \\cdot q^{n-1}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "system" as const, label: "מערכת משוואות", tex: "\\begin{cases} ? \\\\ ? \\end{cases}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאון</div>

      {/* Tab buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{
                flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.1)"}`,
                background: isActive ? `${t.color}0D` : "rgba(60,54,42,0.03)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {/* Expanded: Arithmetic */}
      {activeTab === "arithmetic" && (
        <motion.div key="arithmetic" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 10 }}>
              <DisplayMath>{"a_n = a_1 + (n-1)d"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S_n = \\frac{n(a_1 + a_n)}{2} = \\frac{n(2a_1 + (n-1)d)}{2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך משתמשים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מזהים את <InlineMath>{"a_1"}</InlineMath> (האיבר הראשון) ואת <InlineMath>{"d"}</InlineMath> (ההפרש הקבוע).</li>
                  <li>מציבים בנוסחת האיבר הכללי למציאת <InlineMath>{"a_n"}</InlineMath>.</li>
                  <li>לסכום -- מציבים בנוסחת <InlineMath>{"S_n"}</InlineMath> (שתי צורות שקולות).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: a₁=3, d=4. אז a₅ = 3+4*4 = 19, S₅ = 5*(3+19)/2 = 55
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Geometric */}
      {activeTab === "geometric" && (
        <motion.div key="geometric" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 10 }}>
              <DisplayMath>{"a_n = a_1 \\cdot q^{n-1}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 10 }}>
              <DisplayMath>{"S_n = \\frac{a_1(q^n - 1)}{q - 1}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S_\\infty = \\frac{a_1}{1-q} \\quad (|q| < 1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך משתמשים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מזהים את <InlineMath>{"a_1"}</InlineMath> ואת <InlineMath>{"q"}</InlineMath> (המנה הקבועה).</li>
                  <li>לסכום סופי -- <InlineMath>{"S_n"}</InlineMath> (שימו לב: <InlineMath>{"q \\neq 1"}</InlineMath>).</li>
                  <li>לסכום אינסופי -- רק כאשר <InlineMath>{"|q| < 1"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: a₁=8, q=0.5. S∞ = 8/(1-0.5) = 16
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: System */}
      {activeTab === "system" && (
        <motion.div key="system" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              מערכת משוואות -- שני תנאים, שני נעלמים
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>אסטרטגיה:</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>כל תנאי מתורגם למשוואה עם <InlineMath>{"a_1"}</InlineMath> ו-<InlineMath>{"d"}</InlineMath> (או <InlineMath>{"q"}</InlineMath>).</li>
                  <li>פותרים בשיטת הצבה או חיסור.</li>
                  <li>מציבים בחזרה בשני התנאים המקוריים לבדיקה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: a₃=5 נותן a₁+2d=5. S₅=25 נותן 5(2a₁+4d)/2=25. נפתור ונקבל a₁=1, d=2.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArithmeticGeometricSeriesPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"], input[type="password"] {
          outline: none !important;
        }
        textarea:focus, input[type="text"]:focus {
          outline: none !important;
          border-color: rgba(var(--lvl-rgb), 0.65) !important;
          box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important;
        }
        input[type="range"] {
          outline: none !important;
        }
        input[type="range"]:focus {
          outline: none !important;
        }
        button:focus, button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important;
        }
        button:focus:not(:focus-visible) {
          box-shadow: none !important;
        }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>סדרות חשבוניות והנדסיות עם AI -- כיתה יא׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>איבר כללי, סכום, סכום אינסופי, מערכת משוואות -- ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade11/series"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>&#8592;</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="5u/grade11/series/arithmetic-geometric" />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id as typeof selectedLevel)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Formula Bar */}
        <FormulaBar />

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab -- each level gets its own lab */}
        {selectedLevel === "basic" && <ArithmeticLab />}
        {selectedLevel === "medium" && <GeometricLab />}
        {selectedLevel === "advanced" && <SystemLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade11/series/arithmetic-geometric" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
