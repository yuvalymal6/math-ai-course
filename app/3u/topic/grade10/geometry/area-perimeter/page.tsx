"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";
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
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Rectangle */}
      <rect x={30} y={30} width={200} height={120} fill="none" stroke="#94a3b8" strokeWidth={2} rx={2} />
      {/* Triangle inside */}
      <polygon points="50,140 180,140 120,60" fill="rgba(22,163,74,0.12)" stroke="#16A34A" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Vertex labels */}
      <text x={22} y={26} fontSize={12} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>A</text>
      <text x={232} y={26} fontSize={12} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>B</text>
      <text x={232} y={160} fontSize={12} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>C</text>
      <text x={22} y={160} fontSize={12} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>D</text>
      {/* Triangle vertex labels */}
      <text x={38} y={152} fontSize={11} fill="#16A34A" fontFamily="sans-serif" fontWeight={600}>E</text>
      <text x={182} y={152} fontSize={11} fill="#16A34A" fontFamily="sans-serif" fontWeight={600}>F</text>
      <text x={116} y={54} fontSize={11} fill="#16A34A" fontFamily="sans-serif" fontWeight={600}>G</text>
      {/* Side indicators (no numbers) */}
      <text x={130} y={22} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" textAnchor="middle">a</text>
      <text x={240} y={95} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" textAnchor="middle">b</text>
      {/* Triangle base/height indicators */}
      <line x1={120} y1={60} x2={120} y2={140} stroke="#34d399" strokeWidth={1} strokeDasharray="3,3" />
      <text x={126} y={105} fontSize={9} fill="#34d399" fontFamily="sans-serif">h</text>
    </svg>
  );
}

function MediumSVG() {
  const cx = 130, cy = 100, r = 60;
  const side = r * 2;
  const sx = cx - r, sy = cy - r;
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Square */}
      <rect x={sx} y={sy} width={side} height={side} fill="none" stroke="#94a3b8" strokeWidth={2} rx={2} />
      {/* Circle */}
      <circle cx={cx} cy={cy} r={r} fill="rgba(234,88,12,0.1)" stroke="#EA580C" strokeWidth={1.5} />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="#EA580C" />
      <text x={cx + 6} y={cy - 4} fontSize={10} fill="#EA580C" fontFamily="sans-serif" fontWeight={600}>O</text>
      {/* Radius line */}
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={cx + r / 2} y={cy - 6} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" textAnchor="middle">r</text>
      {/* Walkway shading — four corner regions */}
      <text x={sx + 6} y={sy + 14} fontSize={9} fill="#a78bfa" fontFamily="sans-serif">שביל</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* L-shape outline */}
      <path
        d="M 30,30 L 220,30 L 220,120 L 140,120 L 140,190 L 30,190 Z"
        fill="rgba(220,38,38,0.06)" stroke="#94a3b8" strokeWidth={2}
      />
      {/* Dashed decomposition line */}
      <line x1={140} y1={30} x2={140} y2={120} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,3" />
      {/* Vertex labels */}
      <text x={22} y={26} fontSize={11} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>A</text>
      <text x={222} y={26} fontSize={11} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>B</text>
      <text x={222} y={132} fontSize={11} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>C</text>
      <text x={142} y={132} fontSize={11} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>D</text>
      <text x={142} y={200} fontSize={11} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>E</text>
      <text x={22} y={200} fontSize={11} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>F</text>
      {/* Dimension labels (no numbers) */}
      <text x={125} y={22} fontSize={9} fill="#f59e0b" fontFamily="sans-serif" textAnchor="middle">W</text>
      <text x={14} y={115} fontSize={9} fill="#f59e0b" fontFamily="sans-serif" textAnchor="middle">H</text>
      <text x={148} y={160} fontSize={9} fill="#34d399" fontFamily="sans-serif">c</text>
      {/* Rectangle labels */}
      <text x={85} y={80} fontSize={10} fill="#a78bfa" fontFamily="sans-serif" textAnchor="middle">I</text>
      <text x={180} y={80} fontSize={10} fill="#a78bfa" fontFamily="sans-serif" textAnchor="middle">II</text>
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

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "16,185,129", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span>✨</span>
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
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." });
      return;
    }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>🔒</span>
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
            בדיקת AI מדומה 🤖
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
      <span>🔒</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
    </div>
  );

  const validate = () => {
    if (text.trim().length < 20) {
      setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." });
      return;
    }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : ROSE.border}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(244,63,94,0.2)"}` }}>
        {passed
          ? <CheckCircle size={14} color="#34d399" />
          : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
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
            בדיקת AI מדומה 🤖
          </button>
        )}
      </div>
    </div>
  );
}

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
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>🔒</div>
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
        subjectWords={["שטח", "היקף", "מלבן", "עיגול", "פירוק", "מורכב"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } — { s.label }</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ s.phase } — { s.label }</div>
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
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div>
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
    title: "שטח והיקף מלבן ומשולש",
    problem: "גן מלבני ABCD, אורכו a ורוחבו b.\nבתוך הגן נמצאת ערוגת פרחים משולשית EFG, כאשר בסיס המשולש EF = d וגובהו h.\n\nא. חשבו את היקף המלבן ABCD.\nב. חשבו את שטח המלבן ABCD.\nג. חשבו את שטח המשולש EFG.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "בלבול בין שטח להיקף", text: "היקף הוא סכום אורכי כל הצלעות (P = 2a + 2b). שטח הוא מדידת השטח הפנימי (S = a·b). תלמידים רבים מבלבלים בין שתי הנוסחאות — שימו לב שהיקף נמדד בס\"מ ושטח בסמ\"ר." },
      { title: "שוכחים לחלק ב-2 בשטח משולש", text: "שטח משולש = (בסיס × גובה) / 2. רבים שוכחים את החלוקה ב-2 ומקבלים תוצאה כפולה מהנכון. זכרו: משולש הוא חצי מלבן!" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 3 יחידות, ומצרף/ת שאלה בגיאומטריה על שטח והיקף של מלבן ומשולש. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "היקף המלבן", coaching: "", prompt: "גן מלבני ABCD, אורכו a ורוחבו b. תנחה אותי כיצד לחשב את ההיקף — סכום כל הצלעות של המלבן.", keywords: [], keywordHint: "", contextWords: ["היקף", "מלבן", "צלעות", "סכום", "אורך", "רוחב"] },
      { phase: "סעיף ב׳", label: "שטח המלבן", coaching: "", prompt: "גן מלבני ABCD, אורכו a ורוחבו b. תסביר לי כיצד מחשבים את שטח המלבן — מכפלת אורך ברוחב.", keywords: [], keywordHint: "", contextWords: ["שטח", "מלבן", "אורך", "רוחב", "מכפלה", "שטח פנים"] },
      { phase: "סעיף ג׳", label: "שטח המשולש", coaching: "", prompt: "ערוגת פרחים משולשית EFG, בסיסה d וגובהה h. תכווין אותי לחשב את שטח המשולש — בסיס כפול גובה חלקי 2.", keywords: [], keywordHint: "", contextWords: ["משולש", "בסיס", "גובה", "חלקי", "שטח", "חצי"] },
    ],
  },
  {
    id: "medium",
    title: "שטח עיגול וצורות מורכבות",
    problem: "בריכה עגולה ברדיוס r מוקפת בשביל מרובע.\nצלע השביל (הריבוע) שווה לקוטר הבריכה (2r).\n\nא. חשבו את שטח העיגול (הבריכה) ואת היקפו.\nב. חשבו את שטח הריבוע.\nג. חשבו את שטח השביל בלבד (שטח הריבוע פחות שטח העיגול).",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שימוש בקוטר במקום רדיוס", text: "הנוסחה לשטח עיגול היא πr² — כלומר רדיוס בריבוע. תלמידים רבים מציבים את הקוטר (2r) בטעות ומקבלים תוצאה פי 4 מהנכון. וודאו שאתם משתמשים ברדיוס!" },
      { title: "שוכחים לחסר את העיגול מהריבוע", text: "שטח השביל = שטח הריבוע - שטח העיגול. אל תשכחו שהשביל הוא רק החלק שבין הריבוע לעיגול — צריך לחסר!" },
    ],
    goldenPrompt: `אני בכיתה י', 3 יחידות, מצרף/ת תרגיל בגיאומטריה בנושא שטח עיגול, היקף עיגול ושטח צורה מורכבת (ריבוע מינוס עיגול).

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על נוסחאות שטח והיקף, הבדל בין רדיוס לקוטר, ואיך מחשבים שטח אזור בין שתי צורות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "שטח והיקף העיגול", coaching: "", prompt: "בריכה עגולה ברדיוס r. תנחה אותי לחשב את שטח העיגול (πr²) ואת ההיקף (2πr) — מהו ההבדל בין רדיוס לקוטר?", keywords: [], keywordHint: "", contextWords: ["עיגול", "רדיוס", "שטח", "היקף", "פאי", "קוטר"] },
      { phase: "סעיף ב׳", label: "שטח הריבוע", coaching: "", prompt: "ריבוע שצלעו שווה לקוטר הבריכה (2r). תדריך אותי לחשב את שטח הריבוע — צלע בריבוע.", keywords: [], keywordHint: "", contextWords: ["ריבוע", "צלע", "שטח", "קוטר", "בריבוע", "מכפלה"] },
      { phase: "סעיף ג׳", label: "שטח השביל", coaching: "", prompt: "השביל הוא השטח שבין הריבוע לעיגול. תכווין אותי לחשב שטח מורכב — חיסור שטח העיגול משטח הריבוע.", keywords: [], keywordHint: "", contextWords: ["שביל", "חיסור", "מורכב", "ריבוע", "עיגול", "הפרש"] },
    ],
  },
  {
    id: "advanced",
    title: "צורה מורכבת — פירוק לחלקים",
    problem: "חדר בצורת L. הממדים החיצוניים: רוחב W וגובה H.\nבפינה הימנית העליונה יש חתך מלבני בגודל c × c.\n\nא. פרקו את צורת ה-L לשני מלבנים.\nב. חשבו את השטח הכולל.\nג. חשבו את ההיקף (זהירות — לא כל הצלעות חיצוניות!).\nד. אם ריצוף עולה X ₪ למ\"ר, כמה יעלה ריצוף כל החדר?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "ספירת צלעות פנימיות בהיקף", text: "בצורת L יש צלעות פנימיות (שנוצרו מהחתך) שהן חלק מההיקף! תלמידים רבים שוכחים לספור אותן ומקבלים היקף קטן מדי. עקבו בזהירות על כל קטע חיצוני." },
      { title: "פירוק שגוי לשני מלבנים", text: "ניתן לפרק צורת L בכמה דרכים — אבל חשוב שהמלבנים יכסו בדיוק את כל השטח, בלי חפיפה ובלי חסר. ציירו את קו הפירוק ובדקו שהמידות מסתדרות." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מפרקים צורת L לחלקים, מחשבים שטח מורכב והיקף עם צלעות פנימיות? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "פירוק לשני מלבנים", coaching: "", prompt: "חדר בצורת L, ממדים חיצוניים W × H, חתך c × c. תנחה אותי לפרק את הצורה לשני מלבנים — היכן כדאי לצייר את קו הפירוק?", keywords: [], keywordHint: "", contextWords: ["פירוק", "מלבן", "צורה", "חתך", "קו", "חלקים"] },
      { phase: "סעיף ב׳", label: "שטח כולל", coaching: "", prompt: "לאחר הפירוק לשני מלבנים, תדריך אותי לחשב את שטח כל מלבן בנפרד ולסכם — שטח כולל של צורת L.", keywords: [], keywordHint: "", contextWords: ["שטח", "סכום", "מלבן", "כולל", "חיבור", "פירוק"] },
      { phase: "סעיף ג׳", label: "חישוב היקף", coaching: "", prompt: "צורת L עם ממדים W, H, c. תכווין אותי לחשב את ההיקף — לעקוב על כל הצלעות החיצוניות כולל הצלעות הפנימיות שנוצרו מהחתך.", keywords: [], keywordHint: "", contextWords: ["היקף", "צלעות", "חיצוני", "פנימי", "חתך", "עקיבה"] },
      { phase: "סעיף ד׳", label: "עלות ריצוף", coaching: "", prompt: "שטח החדר ידוע, ריצוף עולה X ₪ למ\"ר. תסביר לי איך מחשבים עלות כוללת — שטח כפול מחיר ליחידה.", keywords: [], keywordHint: "", contextWords: ["עלות", "ריצוף", "מחיר", "שטח", "כפול", "מ\"ר"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 שטח והיקף (Area & Perimeter)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "נוסחאות בסיסיות — היקף מלבן (סכום צלעות), שטח מלבן (אורך × רוחב), שטח משולש (בסיס × גובה / 2)."}
            {ex.id === "medium" && "שטח עיגול (πr²), היקף עיגול (2πr), ושטח אזור מורכב — חיסור צורה מתוך צורה."}
            {ex.id === "advanced" && "פירוק צורה מורכבת (L) לחלקים, חישוב שטח כולל, היקף עם צלעות פנימיות, ועלות ריצוף."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: נוסחאות */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>נוסחאות יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>מלבן</span>
              <span>שטח = a·b, היקף = 2(a+b)</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>משולש</span>
              <span>שטח = (בסיס × גובה) / 2</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>עיגול</span>
              <span>שטח = πr², היקף = 2πr</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>צורות מורכבות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חיסור</span>
                  <span>שטח צורה גדולה - שטח צורה קטנה = שטח האזור ביניהן.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>פירוק</span>
                  <span>ניתן לפרק צורה מורכבת לצורות פשוטות ולסכם שטחים.</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Advanced extras */}
        {ex.id === "advanced" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>היקף צורה מורכבת</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>עקיבה</span>
                  <span>עוקבים על כל הצלעות החיצוניות כולל פנימיות.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>עלות</span>
                  <span>עלות = שטח × מחיר ליחידת שטח.</span>
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

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── RectTriLab (basic) ─────────────────────────────────────────────────────

function RectTriLab() {
  const [length, setLength] = useState(12);
  const [width, setWidth] = useState(8);
  const st = STATION.basic;

  const rectArea = length * width;
  const rectPerimeter = 2 * (length + width);
  const triBase = length * 0.7;
  const triHeight = width * 0.6;
  const triArea = (triBase * triHeight) / 2;

  // SVG dimensions
  const pad = 20, svgW = 280, svgH = 200;
  const maxDim = Math.max(length, width);
  const scale = Math.min((svgW - 2 * pad) / length, (svgH - 2 * pad) / width);
  const rw = length * scale, rh = width * scale;
  const rx = (svgW - rw) / 2, ry = (svgH - rh) / 2;

  // Triangle inside
  const tx1 = rx + rw * 0.1, ty1 = ry + rh;
  const tx2 = rx + rw * 0.8, ty2 = ry + rh;
  const tx3 = rx + rw * 0.5, ty3 = ry + rh * 0.35;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מלבן ומשולש</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את האורך והרוחב וצפו כיצד השטח וההיקף משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>אורך (a)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{length}</span>
          </div>
          <input type="range" min={2} max={20} step={1} value={length} onChange={(e) => setLength(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>רוחב (b)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{width}</span>
          </div>
          <input type="range" min={2} max={20} step={1} value={width} onChange={(e) => setWidth(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Rectangle */}
          <rect x={rx} y={ry} width={rw} height={rh} fill="rgba(22,163,74,0.08)" stroke="#94a3b8" strokeWidth={2} rx={2} />
          {/* Triangle */}
          <polygon points={`${tx1},${ty1} ${tx2},${ty2} ${tx3},${ty3}`} fill="rgba(22,163,74,0.15)" stroke="#16A34A" strokeWidth={1.5} />
          {/* Labels */}
          <text x={rx + rw / 2} y={ry - 6} fontSize={11} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>{length}</text>
          <text x={rx + rw + 10} y={ry + rh / 2} fontSize={11} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>{width}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "שטח מלבן", val: rectArea.toFixed(0) },
          { label: "היקף מלבן", val: rectPerimeter.toFixed(0) },
          { label: "שטח משולש", val: triArea.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שנו את הממדים — שימו לב שהשטח גדל בקצב מהיר יותר מההיקף!</p>
    </section>
  );
}

// ─── CircleSquareLab (medium) ───────────────────────────────────────────────

function CircleSquareLab() {
  const [radius, setRadius] = useState(5);
  const st = STATION.medium;

  const circleArea = Math.PI * radius * radius;
  const circumference = 2 * Math.PI * radius;
  const side = 2 * radius;
  const squareArea = side * side;
  const walkwayArea = squareArea - circleArea;

  const svgW = 260, svgH = 260, pad = 30;
  const maxR = 10;
  const scale = (svgW - 2 * pad) / (2 * maxR);
  const cx = svgW / 2, cy = svgH / 2;
  const r = radius * scale;
  const halfSide = r;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת עיגול וריבוע</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הרדיוס וצפו כיצד שטח השביל (ריבוע מינוס עיגול) משתנה.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>רדיוס (r)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{radius}</span>
          </div>
          <input type="range" min={1} max={10} step={0.5} value={radius} onChange={(e) => setRadius(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Square */}
          <rect x={cx - halfSide} y={cy - halfSide} width={halfSide * 2} height={halfSide * 2} fill="rgba(234,88,12,0.08)" stroke="#94a3b8" strokeWidth={2} rx={2} />
          {/* Circle */}
          <circle cx={cx} cy={cy} r={r} fill="rgba(234,88,12,0.15)" stroke="#EA580C" strokeWidth={1.5} />
          {/* Radius line */}
          <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={cx + r / 2} y={cy - 6} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>r={radius}</text>
          {/* Center */}
          <circle cx={cx} cy={cy} r={2.5} fill="#EA580C" />
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "שטח עיגול", val: circleArea.toFixed(1) },
          { label: "שטח ריבוע", val: squareArea.toFixed(1) },
          { label: "שטח שביל", val: walkwayArea.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>היחס בין שטח העיגול לריבוע תמיד שווה π/4 ≈ 0.785 — ללא קשר לרדיוס!</p>
    </section>
  );
}

// ─── LShapeLab (advanced) ───────────────────────────────────────────────────

function LShapeLab() {
  const [outerW, setOuterW] = useState(12);
  const [outerH, setOuterH] = useState(10);
  const [cutSize, setCutSize] = useState(4);
  const st = STATION.advanced;

  const clampedCut = Math.min(cutSize, outerW - 1, outerH - 1);
  const totalArea = outerW * outerH - clampedCut * clampedCut;
  const perimeter = 2 * outerW + 2 * outerH;
  const costPerSqm = 120;
  const flooringCost = totalArea * costPerSqm;

  // SVG
  const svgW = 300, svgH = 240, pad = 30;
  const maxDim = Math.max(outerW, outerH);
  const scale = Math.min((svgW - 2 * pad) / outerW, (svgH - 2 * pad) / outerH);
  const lw = outerW * scale, lh = outerH * scale;
  const lx = (svgW - lw) / 2, ly = (svgH - lh) / 2;
  const cw = clampedCut * scale, ch = clampedCut * scale;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת צורת L</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את ממדי החדר והחתך וצפו כיצד השטח, ההיקף ועלות הריצוף משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>רוחב (W)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{outerW}</span>
          </div>
          <input type="range" min={4} max={20} step={1} value={outerW} onChange={(e) => setOuterW(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>גובה (H)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{outerH}</span>
          </div>
          <input type="range" min={4} max={20} step={1} value={outerH} onChange={(e) => setOuterH(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>חתך (c)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{clampedCut}</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={cutSize} onChange={(e) => setCutSize(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* L-shape */}
          <path
            d={`M ${lx},${ly} L ${lx + lw},${ly} L ${lx + lw},${ly + lh - ch} L ${lx + lw - cw},${ly + lh - ch} L ${lx + lw - cw},${ly + lh} L ${lx},${ly + lh} Z`}
            fill="rgba(220,38,38,0.08)" stroke="#94a3b8" strokeWidth={2}
          />
          {/* Dashed decomposition line */}
          <line x1={lx + lw - cw} y1={ly} x2={lx + lw - cw} y2={ly + lh - ch} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,3" />
          {/* Cut-out ghost */}
          <rect x={lx + lw - cw} y={ly + lh - ch} width={cw} height={ch} fill="none" stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" opacity={0.4} />
          {/* Dimension labels */}
          <text x={lx + lw / 2} y={ly - 6} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>W={outerW}</text>
          <text x={lx - 10} y={ly + lh / 2} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>H={outerH}</text>
          <text x={lx + lw + 8} y={ly + lh - ch / 2} fontSize={9} fill="#a78bfa" fontFamily="sans-serif" fontWeight={600}>c={clampedCut}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "שטח כולל", val: totalArea.toFixed(0) + " מ\"ר" },
          { label: "היקף", val: perimeter.toFixed(0) + " מ׳" },
          { label: "עלות ריצוף", val: flooringCost.toLocaleString() + " ₪" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שימו לב: היקף צורת L שווה תמיד להיקף המלבן המקורי — מפתיע!</p>
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
  const [activeTab, setActiveTab] = useState<"rect" | "tri" | "circle" | null>(null);

  const tabs = [
    { id: "rect" as const, label: "מלבן", tex: "S = a \\cdot b", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "tri" as const, label: "משולש", tex: "S = \\frac{ah}{2}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "circle" as const, label: "עיגול", tex: "S = \\pi r^2", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

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

      {/* Expanded: Rectangle */}
      {activeTab === "rect" && (
        <motion.div key="rect" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = a \\cdot b \\quad,\\quad P = 2(a+b)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>שטח = אורך כפול רוחב (<InlineMath>{"a \\cdot b"}</InlineMath>).</li>
                  <li>היקף = סכום כל הצלעות = <InlineMath>{"2a + 2b"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: מלבן 6×4. שטח = 24, היקף = 20.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Triangle */}
      {activeTab === "tri" && (
        <motion.div key="tri" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\frac{a \\cdot h}{2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מכפילים את הבסיס (<InlineMath>{"a"}</InlineMath>) בגובה (<InlineMath>{"h"}</InlineMath>).</li>
                  <li>מחלקים ב-2 (משולש = חצי מלבן).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: משולש עם בסיס 8 וגובה 5. שטח = (8×5)/2 = 20.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Circle */}
      {activeTab === "circle" && (
        <motion.div key="circle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\pi r^2 \\quad,\\quad P = 2\\pi r"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>שטח = <InlineMath>{"\\pi"}</InlineMath> כפול הרדיוס בריבוע (<InlineMath>{"r^2"}</InlineMath>).</li>
                  <li>היקף (= הקיפו) = <InlineMath>{"2\\pi r"}</InlineMath>.</li>
                  <li>זכרו: רדיוס = חצי קוטר!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: עיגול ברדיוס 3. שטח = π·9 ≈ 28.27, היקף = 6π ≈ 18.85.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AreaPerimeterPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>שטח והיקף עם AI — כיתה י׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מלבן, משולש, עיגול, צורות מורכבות — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade10/geometry"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="3u/grade10/geometry/area-perimeter" />

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

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <RectTriLab />}
        {selectedLevel === "medium" && <CircleSquareLab />}
        {selectedLevel === "advanced" && <LShapeLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/geometry/area-perimeter" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
