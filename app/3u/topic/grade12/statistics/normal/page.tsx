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

// ─── Gaussian helper ─────────────────────────────────────────────────────────

function gaussian(x: number, mu: number, sigma: number): number {
  const exp = -0.5 * ((x - mu) / sigma) ** 2;
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
}

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  // Simple bell curve with μ marked
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = 30 + i * 2;
    const t = (i - 50) / 16;
    const y = 130 - 100 * Math.exp(-0.5 * t * t);
    pts.push(`${x},${y}`);
  }
  return (
    <svg viewBox="0 0 270 160" className="w-full max-w-sm mx-auto" aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke="#16A34A" strokeWidth={2.5} opacity={0.7} />
      {/* Axis */}
      <line x1={30} y1={130} x2={230} y2={130} stroke="#94a3b8" strokeWidth={1} />
      {/* μ line */}
      <line x1={130} y1={28} x2={130} y2={130} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={130} y={148} fontSize={13} fill="#f59e0b" textAnchor="middle" fontFamily="serif" fontWeight={700}>μ</text>
      {/* Question marks on sides */}
      <text x={85} y={115} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?%</text>
      <text x={175} y={115} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?%</text>
    </svg>
  );
}

function MediumSVG() {
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = 20 + i * 2.2;
    const t = (i - 50) / 16;
    const y = 125 - 95 * Math.exp(-0.5 * t * t);
    pts.push(`${x},${y}`);
  }
  return (
    <svg viewBox="0 0 270 170" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Filled region between μ-σ and μ+σ */}
      <path d={`M${20 + (50 - 16) * 2.2},125 ${Array.from({ length: 33 }, (_, i) => {
        const idx = 50 - 16 + i;
        const x = 20 + idx * 2.2;
        const t = (idx - 50) / 16;
        return `L${x},${125 - 95 * Math.exp(-0.5 * t * t)}`;
      }).join(" ")} L${20 + (50 + 16) * 2.2},125 Z`} fill="rgba(234,88,12,0.12)" />
      <polyline points={pts.join(" ")} fill="none" stroke="#EA580C" strokeWidth={2.5} opacity={0.7} />
      <line x1={20} y1={125} x2={240} y2={125} stroke="#94a3b8" strokeWidth={1} />
      {/* σ markers */}
      <line x1={130} y1={28} x2={130} y2={125} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={20 + (50 - 16) * 2.2} y1={70} x2={20 + (50 - 16) * 2.2} y2={125} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="4,3" />
      <line x1={20 + (50 + 16) * 2.2} y1={70} x2={20 + (50 + 16) * 2.2} y2={125} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="4,3" />
      <text x={130} y={150} fontSize={12} fill="#f59e0b" textAnchor="middle" fontFamily="serif" fontWeight={700}>μ</text>
      <text x={20 + (50 - 16) * 2.2} y={150} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="serif">μ−σ</text>
      <text x={20 + (50 + 16) * 2.2} y={150} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="serif">μ+σ</text>
      <text x={130} y={105} fontSize={14} fill="#EA580C" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?%</text>
    </svg>
  );
}

function AdvancedSVG() {
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = 20 + i * 2.2;
    const t = (i - 50) / 16;
    const y = 120 - 90 * Math.exp(-0.5 * t * t);
    pts.push(`${x},${y}`);
  }
  return (
    <svg viewBox="0 0 270 170" className="w-full max-w-sm mx-auto" aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2.5} opacity={0.7} />
      <line x1={20} y1={120} x2={240} y2={120} stroke="#94a3b8" strokeWidth={1} />
      {/* Z arrow */}
      <line x1={130} y1={28} x2={130} y2={120} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      {/* Shaded tail area on left */}
      <path d={`M20,120 ${Array.from({ length: 25 }, (_, i) => {
        const x = 20 + i * 2.2;
        const t = (i - 50) / 16;
        return `L${x},${120 - 90 * Math.exp(-0.5 * t * t)}`;
      }).join(" ")} L${20 + 24 * 2.2},120 Z`} fill="rgba(220,38,38,0.15)" />
      <line x1={20 + 24 * 2.2} y1={75} x2={20 + 24 * 2.2} y2={120} stroke="#DC2626" strokeWidth={1.2} strokeDasharray="3,2" />
      <text x={40} y={112} fontSize={12} fill="#DC2626" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?%</text>
      {/* Z label */}
      <text x={130} y={148} fontSize={12} fill="#f59e0b" textAnchor="middle" fontFamily="serif" fontWeight={700}>μ</text>
      <text x={20 + 24 * 2.2} y={148} fontSize={10} fill="#DC2626" textAnchor="middle" fontFamily="serif">Z = ?</text>
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div>
    </div>
  );

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..." style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}><span>ציון הפרומפט</span><span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span></div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div>
          </div>
        )}
        {!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>בדיקת AI מדומה 🤖</button>}
        {result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>⚠️ {result.hint}</motion.div>}
        {result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>💡 {result.hint}</motion.div>}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong></div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button>
          </motion.div>
        )}
        {result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  const ROSE = { border: "rgba(244,63,94,0.35)", text: "#fda4af" };

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span>🔒</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
    </div>
  );

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : ROSE.border}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(244,63,94,0.2)"}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב את הפרומפט שלך לסעיף זה..." style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}><span>ציון</span><span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span></div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} /></div>
          </div>
        )}
        {result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "⚠️" : "💡"} {result.hint}</motion.div>}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}</button>
          </motion.div>
        )}
        {!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${ROSE.border}`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>בדיקת AI מדומה 🤖</button>}
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
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>סיימתי סעיף זה ✓</button>
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
        <TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} borderRgb={borderRgb} />
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
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["נורמלית", "התפלגות", "ציון תקן", "Z", "סטיית תקן", "ממוצע", "אחוז"]} />
      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{s.phase} — {s.label}</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.phase} — {s.label}</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{s.prompt}</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>סיימתי סעיף זה ✓</button>
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
    title: "הכרת ההתפלגות הנורמלית",
    problem: "ציוני מבחן של תלמידים מתפלגים נורמלית עם ממוצע μ וסטיית תקן σ.\n\nא. תארו את צורת הגרף של התפלגות נורמלית — מה מאפיין אותה?\nב. היכן נמצא הממוצע על העקומה? מה ניתן לומר על סימטריית ההתפלגות?\nג. לפי כלל 68-95-99.7, כמה אחוז מהנתונים נמצאים בין μ−σ ל-μ+σ?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין ממוצע לחציון בהתפלגות נורמלית", text: "בהתפלגות נורמלית הממוצע, החציון והשכיח שווים זה לזה ונמצאים במרכז העקומה. זה לא תמיד נכון בהתפלגויות אחרות — אל תניחו את זה בלי לבדוק." },
      { title: "⚠️ שכחת שהעקומה סימטרית", text: "50% מהנתונים מימין לממוצע ו-50% משמאל. תלמידים שוכחים את הסימטריה ומחשבים אחוזים רק מצד אחד." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 3 יחידות, ומצרף/ת שאלה בסטטיסטיקה על הכרת ההתפלגות הנורמלית — צורת הגרף, ממוצע, סימטריה וכלל 68-95-99.7. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "צורת עקומת הפעמון", coaching: "", prompt: "ציוני מבחן מתפלגים נורמלית. תנחה אותי לתאר את צורת הגרף — למה קוראים לה 'עקומת פעמון' ומה המאפיינים שלה.", keywords: [], keywordHint: "", contextWords: ["התפלגות", "נורמלית", "פעמון", "עקומה", "צורה", "סימטריה"] },
      { phase: "סעיף ב׳", label: "ממוצע וסימטריה", coaching: "", prompt: "בהתפלגות נורמלית, תכווין אותי — היכן נמצא הממוצע על העקומה, ולמה ההתפלגות סימטרית סביבו.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סימטריה", "מרכז", "חציון", "שכיח", "שווים"] },
      { phase: "סעיף ג׳", label: "כלל 68-95-99.7", coaching: "", prompt: "תדריך אותי על כלל 68-95-99.7 — כמה אחוז מהנתונים נמצאים בטווח של סטיית תקן אחת, שתיים ושלוש מהממוצע.", keywords: [], keywordHint: "", contextWords: ["כלל", "אחוז", "סטיית תקן", "טווח", "68", "95"] },
    ],
  },
  {
    id: "medium",
    title: "חישוב אחוזים עם כלל 68-95-99.7",
    problem: "משקל תינוקות בלידה מתפלג נורמלית עם ממוצע μ = 3.2 ק\"ג וסטיית תקן σ = 0.5 ק\"ג.\n\nא. בין אילו משקלים נמצאים 68% מהתינוקות?\nב. מהו האחוז של תינוקות שמשקלם מעל 4.2 ק\"ג?\nג. מהו האחוז של תינוקות שמשקלם בין 2.2 ל-3.7 ק\"ג?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחה לחלק את האחוז בשני הצדדים", text: "כלל 95% אומר ש-95% בטווח μ±2σ, אבל 5% נשאר — 2.5% בכל צד. תלמידים שוכחים לחלק ל-2 ושמים את כל ה-5% בצד אחד." },
      { title: "⚠️ טעות בחישוב גבולות הטווח", text: "כדי למצוא μ+2σ חייבים לכפול את σ ב-2 ורק אז להוסיף. תלמידים לפעמים מוסיפים σ פעמיים (3.2+0.5+0.5) במקום לחשב 3.2+2×0.5 — אותו דבר, אבל דרך ההכפלה פחות חשופה לטעויות." },
    ],
    goldenPrompt: `אני בכיתה יב', 3 יחידות, מצרף/ת תרגיל בסטטיסטיקה על חישוב אחוזים בהתפלגות נורמלית לפי כלל 68-95-99.7.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על זיהוי הטווח וחלוקת האחוזים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "טווח 68%", coaching: "", prompt: "משקל תינוקות: μ=3.2, σ=0.5. תנחה אותי למצוא בין אילו משקלים נמצאים 68% מהתינוקות — מהו הטווח μ±σ.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סטיית תקן", "טווח", "68", "אחוז", "סימטריה"] },
      { phase: "סעיף ב׳", label: "אחוז מעל 4.2", coaching: "", prompt: "μ=3.2, σ=0.5. תכווין אותי — כמה סטיות תקן 4.2 מעל הממוצע, ואיך מחשבים את האחוז שמעל ערך זה.", keywords: [], keywordHint: "", contextWords: ["סטיות תקן", "אחוז", "מעל", "כלל", "זנב", "חילוק"] },
      { phase: "סעיף ג׳", label: "אחוז בטווח מעורב", coaching: "", prompt: "μ=3.2, σ=0.5. תדריך אותי לחשב את האחוז בין 2.2 ל-3.7 — צריך לפצל את הטווח לחלקים מוכרים של סטיות תקן.", keywords: [], keywordHint: "", contextWords: ["טווח", "אחוז", "סטיות", "פיצול", "חיבור", "סימטריה"] },
    ],
  },
  {
    id: "advanced",
    title: "ציון תקן Z וטבלת Z",
    problem: "ציוני פסיכומטרי מתפלגים נורמלית עם ממוצע μ = 530 וסטיית תקן σ = 110.\n\nא. חשבו את ציון ה-Z של תלמיד שקיבל 700.\nב. באמצעות טבלת Z, מהו אחוז הנבחנים שציונם נמוך מ-700?\nג. מהו אחוז הנבחנים שציונם בין 420 ל-640?\nד. איזה ציון פסיכומטרי מתאים לאחוזון ה-90 (Z ≈ 1.28)?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שכחת הסימן של Z", text: "ציון Z יכול להיות שלילי (כשהערך מתחת לממוצע). תלמידים שוכחים את המינוס ומקבלים אחוז שגוי מטבלת Z — שימו לב לכיוון." },
      { title: "⚠️ קריאה לא נכונה של טבלת Z", text: "בטבלת Z, הערך שמופיע הוא השטח משמאל לציון Z (אחוזון). כדי למצוא את האחוז מעל Z מסוים, צריך לחסר מ-1. כדי למצוא בין שני ערכים — מחסרים שני ערכי טבלה." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה נוסחת ציון Z, ואיך משתמשים בטבלת Z כדי למצוא אחוזים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "חישוב ציון Z", coaching: "", prompt: "ציוני פסיכומטרי: μ=530, σ=110. תלמיד קיבל 700. תנחה אותי לחשב את ציון ה-Z שלו — מה הנוסחה ומה המשמעות.", keywords: [], keywordHint: "", contextWords: ["ציון", "Z", "נוסחה", "ממוצע", "סטיית תקן", "חישוב"] },
      { phase: "סעיף ב׳", label: "אחוז מטבלת Z", coaching: "", prompt: "Z ≈ 1.55. תכווין אותי — איך קוראים מטבלת Z את האחוז של נבחנים שציונם נמוך מ-700.", keywords: [], keywordHint: "", contextWords: ["טבלה", "אחוז", "אחוזון", "שטח", "משמאל", "Z"] },
      { phase: "סעיף ג׳", label: "אחוז בין שני ערכים", coaching: "", prompt: "μ=530, σ=110. תדריך אותי לחשב את האחוז בין 420 ל-640 — צריך לחשב Z לכל ערך ואז להשתמש בטבלה.", keywords: [], keywordHint: "", contextWords: ["Z", "טווח", "חיסור", "טבלה", "שני ערכים", "אחוז"] },
      { phase: "סעיף ד׳", label: "מציאת ערך מאחוזון", coaching: "", prompt: "אחוזון 90, Z ≈ 1.28. תנחה אותי — איך חוזרים מ-Z לציון מקורי, ומה הנוסחה ההפוכה X = μ + Z·σ.", keywords: [], keywordHint: "", contextWords: ["אחוזון", "הפוך", "נוסחה", "ציון", "ממוצע", "סטיית תקן"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📊 התפלגות נורמלית</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "הכרת עקומת הפעמון — ממוצע, סימטריה וכלל 68-95-99.7."}
            {ex.id === "medium" && "חישוב אחוזים בהתפלגות נורמלית לפי כלל 68-95-99.7."}
            {ex.id === "advanced" && "ציון תקן Z, טבלת Z, חישוב אחוזים ואחוזונים."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎯 מושגי יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>μ (ממוצע)</span>
              <span>מרכז ההתפלגות — שם העקומה הכי גבוהה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>σ (סט״ת)</span>
              <span>רוחב ההתפלגות — כמה הנתונים מפוזרים.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>68-95-99.7</span>
              <span>אחוז בטווח ±1σ, ±2σ, ±3σ מ-μ.</span>
            </div>
          </div>
        </div>

        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ חישוב אחוזים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>טווח ±1σ</span>
                  <span>68% מהנתונים (34% בכל צד)</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>טווח ±2σ</span>
                  <span>95% מהנתונים (2.5% בכל זנב)</span>
                </div>
              </div>
            </div>
          </>
        )}

        {ex.id === "advanced" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 ציון תקן Z</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 130 }}>Z = (X−μ)/σ</span>
                  <span>כמה סטיות תקן מהממוצע</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 130 }}>X = μ + Z·σ</span>
                  <span>חזרה מ-Z לערך מקורי</span>
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
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}{copiedProblem ? "הועתק!" : "העתק"}
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
        {ex.id === "basic"  && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── BellCurveLab (basic) ────────────────────────────────────────────────────

function BellCurveLab() {
  const [mu, setMu] = useState(50);
  const [sigma, setSigma] = useState(10);
  const st = STATION.basic;

  const pts: string[] = [];
  const w = 280, h = 140, ox = 20, oy = h - 20;
  const xMin = mu - 4 * sigma, xMax = mu + 4 * sigma;
  const steps = 120;
  let maxY = 0;
  for (let i = 0; i <= steps; i++) {
    const xVal = xMin + (xMax - xMin) * (i / steps);
    const yVal = gaussian(xVal, mu, sigma);
    if (yVal > maxY) maxY = yVal;
  }
  for (let i = 0; i <= steps; i++) {
    const xVal = xMin + (xMax - xMin) * (i / steps);
    const yVal = gaussian(xVal, mu, sigma);
    const sx = ox + (i / steps) * (w - 2 * ox);
    const sy = oy - (yVal / maxY) * (oy - 20);
    pts.push(`${sx},${sy}`);
  }

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת עקומת הפעמון</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו ממוצע וסטיית תקן וצפו כיצד עקומת הפעמון משתנה.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "μ (ממוצע)", val: mu, set: setMu, min: 20, max: 80 },
          { label: "σ (סט״ת)", val: sigma, set: setSigma, min: 2, max: 20 },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={ox} y1={oy} x2={w - ox} y2={oy} stroke="#94a3b8" strokeWidth={1} />
          <polyline points={pts.join(" ")} fill="none" stroke="#16A34A" strokeWidth={2.5} />
          {/* μ line */}
          <line x1={w / 2} y1={18} x2={w / 2} y2={oy} stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="4,3" />
          <text x={w / 2} y={oy + 14} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="serif">μ={mu}</text>
          {/* ±σ markers */}
          {[-1, 1].map(d => {
            const xPos = ox + ((mu + d * sigma - xMin) / (xMax - xMin)) * (w - 2 * ox);
            return <line key={d} x1={xPos} y1={40} x2={xPos} y2={oy} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3,3" />;
          })}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "μ − σ", val: String(mu - sigma) },
          { label: "μ", val: String(mu) },
          { label: "μ + σ", val: String(mu + sigma) },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הגדילו את σ — העקומה מתרחבת ונמוכה יותר. הקטינו — היא צרה וגבוהה.</p>
    </section>
  );
}

// ─── PercentageLab (medium) ──────────────────────────────────────────────────

function PercentageLab() {
  const [numSigma, setNumSigma] = useState(1);
  const st = STATION.medium;

  const percents: Record<number, { inner: string; tail: string }> = {
    1: { inner: "68%", tail: "16%" },
    2: { inner: "95%", tail: "2.5%" },
    3: { inner: "99.7%", tail: "0.15%" },
  };
  const p = percents[numSigma];

  const w = 280, h = 140, ox = 20, oy = h - 20;
  const pts: string[] = [];
  const fillPts: string[] = [];
  const steps2 = 120;
  let maxY = 0;
  for (let i = 0; i <= steps2; i++) {
    const t = -4 + 8 * (i / steps2);
    const y = Math.exp(-0.5 * t * t);
    if (y > maxY) maxY = y;
  }
  for (let i = 0; i <= steps2; i++) {
    const t = -4 + 8 * (i / steps2);
    const y = Math.exp(-0.5 * t * t);
    const sx = ox + (i / steps2) * (w - 2 * ox);
    const sy = oy - (y / maxY) * (oy - 20);
    pts.push(`${sx},${sy}`);
    if (Math.abs(t) <= numSigma) fillPts.push(`${sx},${sy}`);
  }
  // Fill region
  const leftBound = ox + (((-numSigma + 4) / 8)) * (w - 2 * ox);
  const rightBound = ox + (((numSigma + 4) / 8)) * (w - 2 * ox);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת כלל 68-95-99.7</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>בחרו מספר סטיות תקן וצפו באחוז הנתונים בטווח.</p>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: "2rem" }}>
        {[1, 2, 3].map(n => (
          <button key={n} onClick={() => setNumSigma(n)} style={{
            padding: "10px 24px", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer",
            border: `2px solid ${numSigma === n ? st.accentColor : "rgba(60,54,42,0.15)"}`,
            background: numSigma === n ? `${st.accentColor}15` : "rgba(255,255,255,0.75)",
            color: numSigma === n ? st.accentColor : "#6B7280", transition: "all 0.2s",
          }}>±{n}σ</button>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={ox} y1={oy} x2={w - ox} y2={oy} stroke="#94a3b8" strokeWidth={1} />
          {/* Filled region */}
          <path d={`M${leftBound},${oy} ${fillPts.join(" ")} L${rightBound},${oy} Z`} fill="rgba(234,88,12,0.15)" />
          <polyline points={pts.join(" ")} fill="none" stroke="#EA580C" strokeWidth={2.5} />
          {/* σ bounds */}
          <line x1={leftBound} y1={25} x2={leftBound} y2={oy} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="4,3" />
          <line x1={rightBound} y1={25} x2={rightBound} y2={oy} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="4,3" />
          {/* Center label */}
          <text x={w / 2} y={70} fontSize={16} fill="#EA580C" textAnchor="middle" fontFamily="sans-serif" fontWeight={800}>{p.inner}</text>
          <text x={leftBound - 8} y={oy + 14} fontSize={9} fill="#a78bfa" textAnchor="middle" fontFamily="serif">μ−{numSigma}σ</text>
          <text x={rightBound + 8} y={oy + 14} fontSize={9} fill="#a78bfa" textAnchor="middle" fontFamily="serif">μ+{numSigma}σ</text>
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "בטווח", val: p.inner },
          { label: "בכל זנב", val: p.tail },
          { label: "סטיות תקן", val: `±${numSigma}` },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>ככל שמרחיבים את הטווח — יותר נתונים בפנים ופחות בזנבות.</p>
    </section>
  );
}

// ─── ZScoreLab (advanced) ────────────────────────────────────────────────────

function ZScoreLab() {
  const [rawScore, setRawScore] = useState(650);
  const st = STATION.advanced;

  const mu = 530, sigma = 110;
  const z = (rawScore - mu) / sigma;

  // Approximate Φ(z) using logistic approximation
  function approxPhi(z: number): number {
    if (z < -6) return 0;
    if (z > 6) return 1;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804 * Math.exp(-0.5 * z * z);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  const percentBelow = approxPhi(z) * 100;
  const percentAbove = 100 - percentBelow;

  // Bell curve with shaded region
  const w = 280, h = 140, ox = 20, oy = h - 20;
  const pts: string[] = [];
  const shadePts: string[] = [];
  const steps3 = 120;
  const zNorm = Math.min(Math.max(z, -3.5), 3.5);
  for (let i = 0; i <= steps3; i++) {
    const t = -4 + 8 * (i / steps3);
    const y = Math.exp(-0.5 * t * t);
    const sx = ox + (i / steps3) * (w - 2 * ox);
    const sy = oy - y * (oy - 22);
    pts.push(`${sx},${sy}`);
    if (t <= zNorm) shadePts.push(`${sx},${sy}`);
  }
  const zPx = ox + ((zNorm + 4) / 8) * (w - 2 * ox);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ציון Z</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו ציון גולמי וצפו כיצד ציון Z ואחוזון משתנים (μ=530, σ=110).</p>

      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>ציון גולמי (X)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{rawScore}</span>
          </div>
          <input type="range" min={200} max={800} step={5} value={rawScore} onChange={(e) => setRawScore(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            <span>200</span><span>μ = {mu}</span><span>800</span>
          </div>
        </div>
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={ox} y1={oy} x2={w - ox} y2={oy} stroke="#94a3b8" strokeWidth={1} />
          {/* Shaded area */}
          {shadePts.length > 0 && (
            <path d={`M${ox},${oy} ${shadePts.join(" ")} L${zPx},${oy} Z`} fill="rgba(220,38,38,0.15)" />
          )}
          <polyline points={pts.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2.5} />
          {/* Z line */}
          <line x1={zPx} y1={20} x2={zPx} y2={oy} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={zPx} y={oy + 14} fontSize={9} fill="#DC2626" textAnchor="middle" fontFamily="monospace">Z={z.toFixed(2)}</text>
          {/* μ line */}
          <line x1={w / 2} y1={20} x2={w / 2} y2={oy} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "X", val: String(rawScore) },
          { label: "Z", val: z.toFixed(2) },
          { label: "% מתחת", val: percentBelow.toFixed(1) + "%" },
          { label: "% מעל", val: percentAbove.toFixed(1) + "%" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הזיזו ל-530 (הממוצע) — Z=0 ובדיוק 50% מתחת. למה?</p>
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
  const [activeTab, setActiveTab] = useState<"rule" | "z-score" | "z-table" | null>(null);

  const tabs = [
    { id: "rule" as const, label: "📊 כלל 68-95-99.7", tex: "\\mu \\pm k\\sigma", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "z-score" as const, label: "📐 ציון תקן Z", tex: "Z=\\frac{X-\\mu}{\\sigma}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "z-table" as const, label: "📋 שימוש בטבלת Z", tex: "\\Phi(Z)", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)} style={{
              flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
              border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.1)"}`,
              background: isActive ? `${t.color}0D` : "rgba(60,54,42,0.03)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {activeTab === "rule" && (
        <motion.div key="rule" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>כלל 68-95-99.7 (כלל אמפירי)</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><strong>68%</strong> מהנתונים בטווח μ ± 1σ (34% בכל צד).</li>
                  <li><strong>95%</strong> מהנתונים בטווח μ ± 2σ (2.5% בכל זנב).</li>
                  <li><strong>99.7%</strong> מהנתונים בטווח μ ± 3σ (0.15% בכל זנב).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: μ=100, σ=15 → 68% בטווח 85-115
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "z-score" && (
        <motion.div key="z-score" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"Z = \\frac{X - \\mu}{\\sigma}"}</DisplayMath>
              <DisplayMath>{"X = \\mu + Z \\cdot \\sigma"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה אומר ציון Z?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>Z חיובי = מעל הממוצע, Z שלילי = מתחת.</li>
                  <li>|Z| = מספר סטיות התקן מהממוצע.</li>
                  <li>הנוסחה ההפוכה מאפשרת לחזור מ-Z לערך מקורי.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: X=700, μ=530, σ=110 → Z = (700−530)/110 ≈ 1.55
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "z-table" && (
        <motion.div key="z-table" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>שימוש בטבלת Z</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><strong>P(X &lt; a):</strong> חשבו Z, קראו Φ(Z) מהטבלה.</li>
                  <li><strong>P(X &gt; a):</strong> חשבו 1 − Φ(Z).</li>
                  <li><strong>P(a &lt; X &lt; b):</strong> חשבו Φ(Z_b) − Φ(Z_a).</li>
                  <li><strong>אחוזון:</strong> מצאו Z בטבלה, חשבו X = μ + Z·σ.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 דוגמה: Z=1.55 → Φ(1.55)≈0.9394 → 93.94% מתחת
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NormalDistribution12Page() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"], input[type="password"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus { outline: none !important; border-color: rgba(var(--lvl-rgb), 0.65) !important; box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important; }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important; }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>התפלגות נורמלית עם AI — כיתה יב׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>עקומת פעמון, כלל 68-95-99.7, ציון Z — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade12/statistics"
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

        <SubtopicProgress subtopicId="3u/grade12/statistics/normal" />

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

        <FormulaBar />

        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {selectedLevel === "basic" && <BellCurveLab />}
        {selectedLevel === "medium" && <PercentageLab />}
        {selectedLevel === "advanced" && <ZScoreLab />}

        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade12/statistics/normal" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
