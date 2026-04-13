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
  // Two intersecting lines on a coordinate plane, "?" at intersection
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={170} x2={240} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={40} y1={20} x2={40} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Axis labels */}
      <text x={245} y={175} fontSize={11} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={35} y={15} fontSize={11} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Line 1 — ascending, green */}
      <line x1={50} y1={150} x2={220} y2={50} stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      <text x={225} y={48} fontSize={10} fill="#16A34A" fontWeight={600} fontFamily="sans-serif">L1</text>
      {/* Line 2 — descending, amber */}
      <line x1={60} y1={40} x2={230} y2={140} stroke="#f59e0b" strokeWidth={2} opacity={0.7} />
      <text x={232} y={145} fontSize={10} fill="#f59e0b" fontWeight={600} fontFamily="sans-serif">L2</text>
      {/* Intersection point — "?" */}
      <circle cx={145} cy={95} r={12} fill="rgba(22,163,74,0.12)" stroke="#16A34A" strokeWidth={1.5} />
      <text x={145} y={100} fontSize={14} fill="#16A34A" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function MediumSVG() {
  // Two lines crossing — comparison/elimination method
  return (
    <svg viewBox="0 0 260 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={170} x2={240} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={40} y1={20} x2={40} y2={170} stroke="#94a3b8" strokeWidth={1.5} />
      <text x={245} y={175} fontSize={11} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={35} y={15} fontSize={11} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Line 1 — orange */}
      <line x1={55} y1={140} x2={225} y2={40} stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      <text x={228} y={38} fontSize={10} fill="#EA580C" fontWeight={600} fontFamily="sans-serif">L1</text>
      {/* Line 2 — violet */}
      <line x1={50} y1={55} x2={230} y2={155} stroke="#a78bfa" strokeWidth={2} opacity={0.7} />
      <text x={232} y={160} fontSize={10} fill="#a78bfa" fontWeight={600} fontFamily="sans-serif">L2</text>
      {/* Intersection */}
      <circle cx={140} cy={98} r={12} fill="rgba(234,88,12,0.12)" stroke="#EA580C" strokeWidth={1.5} />
      <text x={140} y={103} fontSize={14} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Notebook and pen icons with "?" price tags
  return (
    <svg viewBox="0 0 280 160" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Notebook icon */}
      <rect x={50} y={40} width={60} height={80} rx={6} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      <line x1={60} y1={55} x2={100} y2={55} stroke="#DC2626" strokeWidth={1} opacity={0.4} />
      <line x1={60} y1={70} x2={100} y2={70} stroke="#DC2626" strokeWidth={1} opacity={0.4} />
      <line x1={60} y1={85} x2={100} y2={85} stroke="#DC2626" strokeWidth={1} opacity={0.4} />
      <line x1={60} y1={100} x2={100} y2={100} stroke="#DC2626" strokeWidth={1} opacity={0.4} />
      {/* Notebook spiral */}
      <line x1={50} y1={50} x2={45} y2={50} stroke="#DC2626" strokeWidth={1.5} opacity={0.5} />
      <line x1={50} y1={65} x2={45} y2={65} stroke="#DC2626" strokeWidth={1.5} opacity={0.5} />
      <line x1={50} y1={80} x2={45} y2={80} stroke="#DC2626" strokeWidth={1.5} opacity={0.5} />
      <line x1={50} y1={95} x2={45} y2={95} stroke="#DC2626" strokeWidth={1.5} opacity={0.5} />
      <line x1={50} y1={110} x2={45} y2={110} stroke="#DC2626" strokeWidth={1.5} opacity={0.5} />
      {/* Notebook price tag */}
      <rect x={55} y={25} width={48} height={18} rx={9} fill="rgba(220,38,38,0.1)" stroke="#DC2626" strokeWidth={1} />
      <text x={79} y={38} fontSize={12} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">? &#8362;</text>

      {/* Pen icon */}
      <line x1={185} y1={45} x2={185} y2={115} stroke="#a78bfa" strokeWidth={4} strokeLinecap="round" />
      <line x1={185} y1={115} x2={185} y2={125} stroke="#64748b" strokeWidth={2} strokeLinecap="round" />
      <circle cx={185} cy={40} r={5} fill="#a78bfa" opacity={0.6} />
      {/* Pen price tag */}
      <rect x={160} y={25} width={48} height={18} rx={9} fill="rgba(167,139,250,0.1)" stroke="#a78bfa" strokeWidth={1} />
      <text x={184} y={38} fontSize={12} fill="#a78bfa" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">? &#8362;</text>

      {/* Equations hint — curly brace */}
      <text x={140} y={145} fontSize={11} fill="#64748b" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">מערכת משוואות</text>
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
            ⚠️ {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            💡 {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
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
            {result.blocked ? "⚠️" : "💡"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ ניסוח מעולה! הסעיף הבא נפתח.</div>
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
                  סיימתי סעיף זה ✓
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ הושלם</div>
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
        subjectWords={["מערכת", "משוואות", "נעלם", "הצבה", "השוואה", "פתרון"]}
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
                סיימתי סעיף זה ✓
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
    title: "שיטת ההצבה",
    problem: "פתרו את מערכת המשוואות הבאה בשיטת ההצבה:\n2x + y = 10\nx - y = 2\n\nא. בודדו את y מתוך המשוואה השנייה.\nב. הציבו לתוך המשוואה הראשונה ופתרו עבור x.\nג. מצאו את y וודאו את הפתרון.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ טעות סימן בבידוד משתנה", text: "כשמבודדים משתנה ומעבירים אגף, תלמידים רבים שוכחים להפוך את הסימן. שימו לב: מה שעובר אגף — משנה סימן!" },
      { title: "⚠️ שוכחים להציב בחזרה", text: "אחרי שמוצאים את הערך של משתנה אחד, חובה להציב בחזרה באחת המשוואות כדי למצוא את המשתנה השני. בלי זה — אין פתרון מלא." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת תרגיל על מערכת משוואות בשיטת ההצבה. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "בידוד y מהמשוואה השנייה", coaching: "", prompt: "נתונה מערכת משוואות: 2x + y = 10, x - y = 2. תנחה אותי כיצד לבודד את y מתוך המשוואה השנייה — מה מעבירים אגף ואיך.", keywords: [], keywordHint: "", contextWords: ["בידוד", "משתנה", "אגף", "y", "משוואה", "העברה"] },
      { phase: "סעיף ב׳", label: "הצבה ופתרון עבור x", coaching: "", prompt: "נתונה מערכת משוואות: 2x + y = 10, x - y = 2. אחרי שבודדתי את y, תדריך אותי כיצד להציב את הביטוי לתוך המשוואה הראשונה ולפתור עבור x.", keywords: [], keywordHint: "", contextWords: ["הצבה", "משוואה", "x", "פתרון", "ביטוי", "פישוט"] },
      { phase: "סעיף ג׳", label: "מציאת y ואימות", coaching: "", prompt: "נתונה מערכת משוואות: 2x + y = 10, x - y = 2. מצאתי את x. תכווין אותי כיצד למצוא את y ולאמת שהפתרון נכון בשתי המשוואות.", keywords: [], keywordHint: "", contextWords: ["אימות", "הצבה", "y", "בדיקה", "משוואה", "נכון"] },
    ],
  },
  {
    id: "medium",
    title: "שיטת ההשוואה",
    problem: "פתרו את מערכת המשוואות הבאה:\n3x + 2y = 16\nx + 2y = 8\n\nא. הסבירו איזה משתנה הכי קל לסלק ומדוע.\nב. חסרו את המשוואות כדי לסלק את y, ופתרו עבור x.\nג. מצאו את y ופרשו את הפתרון גרפית.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ חיסור בסדר הפוך", text: "כשמחסירים משוואות, חשוב לחסר את כל האגף — ולא רק חלק ממנו. חיסור חלקי מוביל לתוצאה שגויה. ודאו ששני הצדדים מחוסרים." },
      { title: "⚠️ שוכחים שהפתרון מקיים את שתי המשוואות", text: "הפתרון חייב להתקיים בשתי המשוואות במקביל. אם הוא מתקיים רק באחת — חזרו לבדוק את החישוב." },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת תרגיל על מערכת משוואות בשיטת ההשוואה (חיסור). אני רוצה שתדריך אותי שלב אחר שלב.

אל תיתן לי את התשובה — שאל אותי שאלות מנחות על זיהוי המשתנה לסילוק, חיסור משוואות ופירוש גרפי.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "זיהוי משתנה לסילוק", coaching: "", prompt: "נתונה מערכת משוואות: 3x + 2y = 16, x + 2y = 8. תנחה אותי להסביר איזה משתנה הכי קל לסלק ומדוע — מה משותף בשתי המשוואות?", keywords: [], keywordHint: "", contextWords: ["סילוק", "משתנה", "מקדם", "זהה", "y", "חיסור"] },
      { phase: "סעיף ב׳", label: "חיסור המשוואות ופתרון x", coaching: "", prompt: "נתונה מערכת משוואות: 3x + 2y = 16, x + 2y = 8. תדריך אותי כיצד לחסר את המשוואות כדי לסלק את y ולפתור עבור x.", keywords: [], keywordHint: "", contextWords: ["חיסור", "משוואה", "x", "סילוק", "פתרון", "אגף"] },
      { phase: "סעיף ג׳", label: "מציאת y ופירוש גרפי", coaching: "", prompt: "נתונה מערכת משוואות: 3x + 2y = 16, x + 2y = 8. מצאתי את x. תכווין אותי למצוא את y ולהסביר מה המשמעות הגרפית של הפתרון — נקודת חיתוך של שני ישרים.", keywords: [], keywordHint: "", contextWords: ["גרפי", "חיתוך", "ישרים", "y", "נקודה", "מישור"] },
    ],
  },
  {
    id: "advanced",
    title: "בעיה מילולית → מערכת משוואות",
    problem: "בחנות מוכרים מחברות ועטים.\n3 מחברות + 5 עטים עולים 47 ש״ח.\n2 מחברות + 3 עטים עולים 29 ש״ח.\n\nא. הגדירו משתנים וכתבו מערכת משוואות.\nב. פתרו בשיטה שבחרתם.\nג. ודאו שהפתרון הגיוני בהקשר השאלה.\nד. אם החנות מציעה ״קנה 4 מחברות וקבל עט מתנה״ — כמה זה עולה?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין המשתנים", text: "בבעיות מילוליות חשוב להגדיר בברור מה כל משתנה מייצג מיד בהתחלה. אם x הוא מחיר מחברת ו-y מחיר עט — אל תחליפו ביניהם באמצע!" },
      { title: "⚠️ לא בודקים שהמחירים הגיוניים", text: "מחיר פריט חייב להיות חיובי. אם קיבלתם ערך שלילי — יש טעות בחישוב. תמיד בדקו שהתוצאה הגיונית בהקשר המציאותי." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מתרגמים בעיה מילולית למערכת משוואות? מה חשוב בהגדרת המשתנים ואיך מוודאים שהפתרון הגיוני? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הגדרת משתנים וכתיבת מערכת", coaching: "", prompt: "בחנות: 3 מחברות + 5 עטים = 47 ש״ח, 2 מחברות + 3 עטים = 29 ש״ח. תנחה אותי להגדיר משתנים ולכתוב מערכת משוואות.", keywords: [], keywordHint: "", contextWords: ["משתנה", "מערכת", "משוואה", "הגדרה", "x", "תרגום"] },
      { phase: "סעיף ב׳", label: "פתרון המערכת", coaching: "", prompt: "נתונה מערכת: 3x + 5y = 47, 2x + 3y = 29. תדריך אותי לפתור בשיטה שאבחר — הצבה או השוואה.", keywords: [], keywordHint: "", contextWords: ["פתרון", "שיטה", "הצבה", "השוואה", "סילוק", "משוואה"] },
      { phase: "סעיף ג׳", label: "אימות והגיוניות", coaching: "", prompt: "מצאתי פתרון למערכת 3x + 5y = 47, 2x + 3y = 29. תכווין אותי לבדוק שהפתרון מתקיים בשתי המשוואות ושהמחירים הגיוניים.", keywords: [], keywordHint: "", contextWords: ["אימות", "בדיקה", "הגיוני", "חיובי", "מחיר", "הצבה"] },
      { phase: "סעיף ד׳", label: "שאלת המבצע", coaching: "", prompt: "מחירי המחברת והעט ידועים. החנות מציעה ״קנה 4 מחברות וקבל עט מתנה״. תנחה אותי לחשב כמה עולה המבצע.", keywords: [], keywordHint: "", contextWords: ["מבצע", "עלות", "מחברת", "עט", "חישוב", "מתנה"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 מערכת משוואות (Systems of Equations)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "שיטת ההצבה — בידוד משתנה, הצבה במשוואה השנייה ואימות הפתרון."}
            {ex.id === "medium" && "שיטת ההשוואה (חיסור) — סילוק משתנה בעזרת חיסור משוואות ופירוש גרפי."}
            {ex.id === "advanced" && "בעיה מילולית — תרגום מציאות למשוואות, פתרון ובדיקת הגיוניות."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: שיטות פתרון */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📏 שיטות פתרון</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>הצבה</span>
              <span>בודדים משתנה אחד ומציבים בתוך המשוואה השנייה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>השוואה</span>
              <span>מחסרים או מחברים משוואות כדי לסלק משתנה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>אימות</span>
              <span>מציבים את הפתרון בשתי המשוואות — שניהם חייבים להתקיים.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ פירוש גרפי</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חיתוך</span>
                  <span>נקודת החיתוך של שני הישרים היא פתרון המערכת.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>מקביליים</span>
                  <span>אם הישרים מקביליים — אין פתרון (מערכת סותרת).</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 בעיות מילוליות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>תרגום</span>
                  <span>הגדירו משתנים וכתבו משוואה לכל נתון.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>הגיוניות</span>
                  <span>ודאו שהתשובה חיובית ומתאימה להקשר.</span>
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── SubstitutionLab (basic) ────────────────────────────────────────────────

function SubstitutionLab() {
  const [a1, setA1] = useState(2);  // coefficient of x in eq1
  const [b1, setB1] = useState(1);  // coefficient of y in eq1
  const [c1, setC1] = useState(10); // constant in eq1
  const [a2, setA2] = useState(1);  // coefficient of x in eq2
  const [b2, setB2] = useState(-1); // coefficient of y in eq2
  const [c2, setC2] = useState(2);  // constant in eq2
  const st = STATION.basic;

  // Solve using Cramer's rule
  const det = a1 * b2 - a2 * b1;
  const hasSolution = Math.abs(det) > 0.0001;
  const x = hasSolution ? (c1 * b2 - c2 * b1) / det : NaN;
  const y = hasSolution ? (a1 * c2 - a2 * c1) / det : NaN;

  // Verification
  const eq1Check = hasSolution ? Math.abs(a1 * x + b1 * y - c1) < 0.01 : false;
  const eq2Check = hasSolution ? Math.abs(a2 * x + b2 * y - c2) < 0.01 : false;

  // SVG: two lines
  const pad = 40, svgW = 280, svgH = 200;
  const xMin = -5, xMax = 15, yMin = -5, yMax = 15;
  const toSvgX = (v: number) => pad + ((v - xMin) / (xMax - xMin)) * (svgW - 2 * pad);
  const toSvgY = (v: number) => svgH - pad - ((v - yMin) / (yMax - yMin)) * (svgH - 2 * pad);

  // Line 1: a1*x + b1*y = c1 => y = (c1 - a1*x) / b1
  const line1 = b1 !== 0
    ? [{ px: xMin, py: (c1 - a1 * xMin) / b1 }, { px: xMax, py: (c1 - a1 * xMax) / b1 }]
    : [];
  // Line 2: a2*x + b2*y = c2 => y = (c2 - a2*x) / b2
  const line2 = b2 !== 0
    ? [{ px: xMin, py: (c2 - a2 * xMin) / b2 }, { px: xMax, py: (c2 - a2 * xMax) / b2 }]
    : [];

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שיטת ההצבה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את המקדמים בעזרת הסליידרים וצפו כיצד נקודת החיתוך משתנה בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
        {[
          { label: "a₁ (מקדם x)", val: a1, set: setA1, min: -5, max: 5 },
          { label: "b₁ (מקדם y)", val: b1, set: setB1, min: -5, max: 5 },
          { label: "c₁ (קבוע)", val: c1, set: setC1, min: -10, max: 20 },
        ].map(({ label, val, set, min, max }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{val}</span>
            </div>
            <input type="range" min={min} max={max} step={1} value={val} onChange={(e) => set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "a₂ (מקדם x)", val: a2, set: setA2, min: -5, max: 5 },
          { label: "b₂ (מקדם y)", val: b2, set: setB2, min: -5, max: 5 },
          { label: "c₂ (קבוע)", val: c2, set: setC2, min: -10, max: 20 },
        ].map(({ label, val, set, min, max }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{label}</span>
              <span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{val}</span>
            </div>
            <input type="range" min={min} max={max} step={1} value={val} onChange={(e) => set(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* Grid lines */}
          {Array.from({ length: 21 }, (_, i) => i - 5).map(v => (
            <g key={`g${v}`}>
              <line x1={toSvgX(v)} y1={toSvgY(yMin)} x2={toSvgX(v)} y2={toSvgY(yMax)} stroke="#e5e7eb" strokeWidth={0.5} />
              <line x1={toSvgX(xMin)} y1={toSvgY(v)} x2={toSvgX(xMax)} y2={toSvgY(v)} stroke="#e5e7eb" strokeWidth={0.5} />
            </g>
          ))}
          {/* Axes */}
          <line x1={toSvgX(0)} y1={toSvgY(yMin)} x2={toSvgX(0)} y2={toSvgY(yMax)} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={toSvgX(xMin)} y1={toSvgY(0)} x2={toSvgX(xMax)} y2={toSvgY(0)} stroke="#94a3b8" strokeWidth={1.5} />
          {/* Line 1 */}
          {line1.length === 2 && (
            <line x1={toSvgX(line1[0].px)} y1={toSvgY(line1[0].py)} x2={toSvgX(line1[1].px)} y2={toSvgY(line1[1].py)} stroke={st.accentColor} strokeWidth={2} opacity={0.7} />
          )}
          {/* Line 2 */}
          {line2.length === 2 && (
            <line x1={toSvgX(line2[0].px)} y1={toSvgY(line2[0].py)} x2={toSvgX(line2[1].px)} y2={toSvgY(line2[1].py)} stroke="#f59e0b" strokeWidth={2} opacity={0.7} />
          )}
          {/* Intersection */}
          {hasSolution && x >= xMin && x <= xMax && y >= yMin && y <= yMax && (
            <circle cx={toSvgX(x)} cy={toSvgY(y)} r={6} fill="rgba(22,163,74,0.2)" stroke={st.accentColor} strokeWidth={2} />
          )}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>x</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{hasSolution ? x.toFixed(2) : "---"}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>y</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{hasSolution ? y.toFixed(2) : "---"}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>אימות</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {hasSolution
              ? (eq1Check && eq2Check ? <span style={{ color: "#16a34a" }}>✅ תקין</span> : <span style={{ color: "#dc2626" }}>❌ שגיאה</span>)
              : <span style={{ color: "#6B7280" }}>אין פתרון</span>}
          </div>
        </div>
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שנו מקדמים כדי לראות כיצד הישרים זזים — מתי יש פתרון יחיד ומתי אין?</p>
    </section>
  );
}

// ─── EliminationLab (medium) ────────────────────────────────────────────────

function EliminationLab() {
  const [mult1, setMult1] = useState(1);
  const [mult2, setMult2] = useState(1);
  const st = STATION.medium;

  // Fixed equations: 3x + 2y = 16, x + 2y = 8
  const a1 = 3, b1 = 2, c1 = 16;
  const a2 = 1, b2 = 2, c2 = 8;

  // After multiplication
  const na1 = a1 * mult1, nb1 = b1 * mult1, nc1 = c1 * mult1;
  const na2 = a2 * mult2, nb2 = b2 * mult2, nc2 = c2 * mult2;

  // Subtraction result
  const ra = na1 - na2;
  const rb = nb1 - nb2;
  const rc = nc1 - nc2;

  // Can we eliminate y?
  const yEliminated = Math.abs(rb) < 0.001 && Math.abs(ra) > 0.001;
  const xVal = yEliminated ? rc / ra : NaN;
  const yVal = yEliminated ? (c1 - a1 * xVal) / b1 : NaN;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שיטת ההשוואה (חיסור)</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>בחרו מכפילים לכל משוואה וצפו בתהליך הסילוק — מתי y נעלם?</p>

      {/* Equations display */}
      <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.15)", padding: "1rem 1.25rem", marginBottom: "1.5rem", textAlign: "center" }}>
        <div style={{ color: "#2D3436", fontSize: 14, fontWeight: 600, lineHeight: 2 }}>
          <div>משוואה I: 3x + 2y = 16 &times; <span style={{ color: st.accentColor, fontWeight: 800 }}>{mult1}</span> &rarr; {na1}x + {nb1}y = {nc1}</div>
          <div>משוואה II: x + 2y = 8 &times; <span style={{ color: "#a78bfa", fontWeight: 800 }}>{mult2}</span> &rarr; {na2}x + {nb2}y = {nc2}</div>
          <div style={{ borderTop: "2px solid rgba(60,54,42,0.2)", paddingTop: 8, marginTop: 8, color: yEliminated ? "#16a34a" : "#DC2626", fontWeight: 700 }}>
            חיסור: {ra}x + {rb}y = {rc}
            {yEliminated && <span style={{ marginRight: 12, color: "#16a34a" }}> ← y נעלם!</span>}
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>מכפיל משוואה I</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{mult1}</span>
          </div>
          <input type="range" min={-3} max={5} step={1} value={mult1} onChange={(e) => setMult1(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>מכפיל משוואה II</span>
            <span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{mult2}</span>
          </div>
          <input type="range" min={-3} max={5} step={1} value={mult2} onChange={(e) => setMult2(+e.target.value)} style={{ width: "100%", accentColor: "#a78bfa" }} />
        </div>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>מקדם y אחרי חיסור</div>
          <div style={{ color: Math.abs(rb) < 0.001 ? "#16a34a" : "#DC2626", fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{rb}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>x</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{yEliminated ? xVal.toFixed(2) : "---"}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>y</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{yEliminated ? yVal.toFixed(2) : "---"}</div>
        </div>
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>נסו למצוא מכפילים שגורמים למקדם y להפוך ל-0 — זה סילוק!</p>
    </section>
  );
}

// ─── WordProblemLab (advanced) ──────────────────────────────────────────────

function WordProblemLab() {
  const [priceA, setPriceA] = useState(4); // price of notebook
  const [priceB, setPriceB] = useState(7); // price of pen
  const st = STATION.advanced;

  // Check equations: 3*a + 5*b = 47, 2*a + 3*b = 29
  const eq1Val = 3 * priceA + 5 * priceB;
  const eq2Val = 2 * priceA + 3 * priceB;
  const eq1OK = eq1Val === 47;
  const eq2OK = eq2Val === 29;
  const bothOK = eq1OK && eq2OK;

  // Deal: 4 notebooks + 1 pen free
  const dealCost = 4 * priceA;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת בעיה מילולית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>נסו למצוא את המחירים הנכונים — שתי המשוואות חייבות להתקיים בו-זמנית!</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>מחיר מחברת (x)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{priceA} &#8362;</span>
          </div>
          <input type="range" min={1} max={15} step={1} value={priceA} onChange={(e) => setPriceA(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.4)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>מחיר עט (y)</span>
            <span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{priceB} &#8362;</span>
          </div>
          <input type="range" min={1} max={15} step={1} value={priceB} onChange={(e) => setPriceB(+e.target.value)} style={{ width: "100%", accentColor: "#a78bfa" }} />
        </div>
      </div>

      {/* Equation checks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        <div style={{ borderRadius: 14, background: eq1OK ? "rgba(220,252,231,0.8)" : "rgba(254,226,226,0.8)", border: `2px solid ${eq1OK ? "#16a34a" : "#dc2626"}`, padding: "1rem", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>משוואה 1: 3x + 5y = 47</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: eq1OK ? "#16a34a" : "#dc2626" }}>
            {eq1Val} {eq1OK ? "= 47 ✅" : `≠ 47`}
          </div>
        </div>
        <div style={{ borderRadius: 14, background: eq2OK ? "rgba(220,252,231,0.8)" : "rgba(254,226,226,0.8)", border: `2px solid ${eq2OK ? "#16a34a" : "#dc2626"}`, padding: "1rem", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>משוואה 2: 2x + 3y = 29</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: eq2OK ? "#16a34a" : "#dc2626" }}>
            {eq2Val} {eq2OK ? "= 29 ✅" : `≠ 29`}
          </div>
        </div>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>משוואה 1</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>
            {eq1OK ? <span style={{ color: "#16a34a" }}>✅</span> : <span style={{ color: "#dc2626" }}>❌</span>}
          </div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>משוואה 2</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>
            {eq2OK ? <span style={{ color: "#16a34a" }}>✅</span> : <span style={{ color: "#dc2626" }}>❌</span>}
          </div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>עלות מבצע</div>
          <div style={{ color: bothOK ? st.accentColor : "#6B7280", fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{bothOK ? `${dealCost} ₪` : "---"}</div>
        </div>
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שתי המשוואות חייבות להתקיים בו-זמנית — רק אז הפתרון נכון!</p>
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
  const [activeTab, setActiveTab] = useState<"substitution" | "elimination" | "verification" | null>(null);

  const tabs = [
    { id: "substitution" as const, label: "📐 שיטת הצבה", tex: "y = f(x)", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "elimination" as const, label: "➖ שיטת השוואה", tex: "L_1 - L_2", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "verification" as const, label: "✅ בדיקה", tex: "(x_0, y_0)", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Substitution */}
      {activeTab === "substitution" && (
        <motion.div key="substitution" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\begin{cases} a_1x + b_1y = c_1 \\\\ a_2x + b_2y = c_2 \\end{cases}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך פותרים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>בודדים משתנה אחד מאחת המשוואות.</li>
                  <li>מציבים את הביטוי במשוואה השנייה.</li>
                  <li>פותרים משוואה עם נעלם אחד.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: x - y = 2 → y = x - 2, מציבים ב-2x + y = 10
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Elimination */}
      {activeTab === "elimination" && (
        <motion.div key="elimination" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"L_1 - L_2 \\Rightarrow \\text{eliminate } y"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך פותרים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מזהים משתנה עם מקדם זהה בשתי המשוואות.</li>
                  <li>מחסרים (או מחברים) את המשוואות לסילוק המשתנה.</li>
                  <li>פותרים עבור המשתנה שנשאר.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: 3x + 2y = 16 פחות x + 2y = 8 → 2x = 8
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Verification */}
      {activeTab === "verification" && (
        <motion.div key="verification" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              בדיקה בשתי המשוואות
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך בודקים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מציבים את הפתרון (<InlineMath>{"x_0, y_0"}</InlineMath>) במשוואה הראשונה ובודקים שוויון.</li>
                  <li>מציבים את הפתרון במשוואה השנייה ובודקים שוויון.</li>
                  <li>הפתרון תקין רק אם שתי המשוואות מתקיימות.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 אם אחת לא מתקיימת — חזרו לבדוק את החישוב!
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EquationsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מערכת משוואות עם AI — כיתה יא׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>שיטת הצבה, שיטת השוואה ובעיות מילוליות — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade11/linear-algebra"
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

        <SubtopicProgress subtopicId="3u/grade11/linear-algebra/equations" />

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
        {selectedLevel === "basic" && <SubstitutionLab />}
        {selectedLevel === "medium" && <EliminationLab />}
        {selectedLevel === "advanced" && <WordProblemLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/linear-algebra/equations" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
