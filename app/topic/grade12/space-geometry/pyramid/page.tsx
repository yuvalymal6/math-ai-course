"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
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
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  title: string;
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── Silent Pyramid SVGs ──────────────────────────────────────────────────────

const PV = {
  A: [60, 195] as [number, number], B: [200, 195] as [number, number],
  C: [238, 162] as [number, number], D: [98, 162] as [number, number],
  P: [149, 52] as [number, number],
} as const;
type PVK = keyof typeof PV;

function PSeg({ a, b, color = "#94a3b8", w = 1.5, dash }: { a: PVK; b: PVK; color?: string; w?: number; dash?: string }) {
  const [x1, y1] = PV[a], [x2, y2] = PV[b];
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeDasharray={dash} />;
}
function PLbl({ v, t, dx = 0, dy = 0, color = "#6B7280" }: { v: PVK; t: string; dx?: number; dy?: number; color?: string }) {
  const [x, y] = PV[v];
  return <text x={x + dx} y={y + dy} fill={color} fontSize={11} textAnchor="middle">{t}</text>;
}

function PyramidSVG_L1() {
  const [mx, my] = [(PV.A[0] + PV.B[0]) / 2, (PV.A[1] + PV.B[1]) / 2];
  return (
    <svg viewBox="30 30 230 185" className="w-full max-w-sm mx-auto" style={{ display: "block" }} aria-hidden>
      <PSeg a="A" b="B" /><PSeg a="B" b="C" /><PSeg a="C" b="D" dash="4 3" /><PSeg a="D" b="A" dash="4 3" />
      <PSeg a="P" b="A" color="#a78bfa" w={2.5} />
      <PSeg a="P" b="B" /><PSeg a="P" b="C" dash="4 3" /><PSeg a="P" b="D" dash="4 3" />
      <line x1={mx} y1={my} x2={PV.P[0]} y2={PV.P[1]} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />
      <PLbl v="A" t="A" dy={13} /><PLbl v="B" t="B" dy={13} />
      <PLbl v="C" t="C" dx={14} dy={4} /><PLbl v="D" t="D" dx={-14} dy={4} />
      <PLbl v="P" t="P" dy={-8} />
    </svg>
  );
}

function PyramidSVG_L2() {
  const cx = (PV.A[0] + PV.C[0]) / 2, cy = (PV.A[1] + PV.C[1]) / 2;
  return (
    <svg viewBox="30 30 230 185" className="w-full max-w-sm mx-auto" style={{ display: "block" }} aria-hidden>
      <PSeg a="A" b="B" color="#34d399" w={2.5} /><PSeg a="B" b="C" color="#34d399" w={2.5} />
      <PSeg a="C" b="D" color="#34d399" w={2.5} dash="4 3" /><PSeg a="D" b="A" color="#34d399" w={2.5} dash="4 3" />
      <PSeg a="P" b="A" /><PSeg a="P" b="B" /><PSeg a="P" b="C" dash="4 3" /><PSeg a="P" b="D" dash="4 3" />
      <line x1={cx} y1={cy} x2={PV.P[0]} y2={PV.P[1]} stroke="#fb7185" strokeWidth={2} strokeDasharray="5 3" />
      <circle cx={cx} cy={cy} r={3} fill="#fb7185" />
      <text x={cx - 14} y={cy + 4} fill="#fb7185" fontSize={11} textAnchor="middle">O</text>
      <text x={(cx + PV.P[0]) / 2 - 12} y={(cy + PV.P[1]) / 2} fill="#fb7185" fontSize={11}>h</text>
      <PLbl v="A" t="A" dy={13} /><PLbl v="B" t="B" dy={13} />
      <PLbl v="C" t="C" dx={14} dy={4} /><PLbl v="D" t="D" dx={-14} dy={4} />
      <PLbl v="P" t="P" dy={-8} />
    </svg>
  );
}

function PyramidSVG_L3() {
  const [mx, my] = [(PV.A[0] + PV.B[0]) / 2, (PV.A[1] + PV.B[1]) / 2];
  return (
    <svg viewBox="30 30 230 185" className="w-full max-w-sm mx-auto" style={{ display: "block" }} aria-hidden>
      <PSeg a="A" b="B" /><PSeg a="B" b="C" /><PSeg a="C" b="D" dash="4 3" /><PSeg a="D" b="A" dash="4 3" />
      <PSeg a="P" b="A" /><PSeg a="P" b="B" color="#a78bfa" w={2.5} />
      <PSeg a="P" b="C" dash="4 3" /><PSeg a="P" b="D" dash="4 3" />
      <line x1={mx} y1={my} x2={PV.P[0]} y2={PV.P[1]} stroke="#f59e0b" strokeWidth={2} />
      <text x={mx + 10} y={my - 14} fill="#f59e0b" fontSize={12} fontWeight={700}>{"\u03B1"}</text>
      <text x={(PV.P[0] + PV.B[0]) / 2 + 12} y={(PV.P[1] + PV.B[1]) / 2} fill="#a78bfa" fontSize={12} fontWeight={700}>L</text>
      <PLbl v="A" t="A" dy={13} /><PLbl v="B" t="B" dy={13} />
      <PLbl v="C" t="C" dx={14} dy={4} /><PLbl v="D" t="D" dx={-14} dy={4} />
      <PLbl v="P" t="P" dy={-8} />
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}>
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>&#10024;</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span>
      </div>
      <p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={glowRgb} />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; הפרומפט המוכן</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" accentRgb={glowRgb} />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; } const res = calculatePromptScore(text, step.contextWords ?? []); setResult(res); if (!res.blocked && res.score >= 75) onPass?.(); };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><Lock size={14} color="#6B7280" /><div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div></div>);
  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(22,163,74,0.15)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}><span>ציון הפרומפט</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div></div>)}
        {!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>}
        {result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#9888;&#65039; {result.hint}</motion.div>}
        {result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#128161; {result.hint}</motion.div>}
        {passed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; פרומפט מצוין! ציון: <strong>{result!.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button></motion.div>)}
        {result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState(""); const [result, setResult] = useState<ScoreResult | null>(null); const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  if (locked) return (<div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span></div>);
  const validate = () => { if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; } const r = calculatePromptScore(text, step.contextWords ?? []); setResult(r); if (!r.blocked && r.score >= 90 && onPass) onPass(); };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>
        {passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }} placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div style={{ display: "flex", flexDirection: "column", gap: 4 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} /></div></div>)}
        {result && !passed && result.hint && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>{result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}</motion.div>}
        {passed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; ניסוח מעולה! הסעיף הבא נפתח.</div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}</button></motion.div>)}
        {!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>}
      </div>
    </div>
  );
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => { setCompleted(prev => { const next = [...prev]; next[i] = true; return next; }); const el = document.getElementById(`basic-step-${i + 1}`); if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200); };
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (<div key={i} id={`basic-step-${i}`}>{i < unlocked ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!completed[i] ? (<button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי סעיף זה</button>) : (<div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>)}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}><Lock size={14} color="#6B7280" /></div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}</div>))}
    </div>
  );
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} borderRgb={borderRgb} />))}</div>);
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlockedIdx = masterPassed ? (passed.findIndex(p => !p) === -1 ? steps.length : passed.findIndex(p => !p)) : -1;
  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["פירמידה", "מקצוע", "אפותמה", "גובה", "נפח", "זווית", "בסיס"]} />
      {steps.map((s, i) => (<TutorStepAdvanced key={i} step={s} locked={!masterPassed || i > unlockedIdx} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} />))}
    </div>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}><span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span><h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2></div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div>
          <button onClick={() => { navigator.clipboard.writeText(ex.problem); setCopiedProblem(true); setTimeout(() => setCopiedProblem(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>{copiedProblem ? <Check size={11} /> : <Copy size={11} />}{copiedProblem ? "הועתק!" : "העתק"}</button>
        </div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (<div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>))}
      </div>
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>
        {ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"volume" | "slant" | "apothem" | "lateral" | null>(null);
  const tabs = [
    { id: "volume" as const,  label: "נפח",           tex: "V = \\frac{1}{3}Bh",                    color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "slant" as const,   label: "מקצוע צדדי", tex: "e = \\sqrt{OA^2 + h^2}",                color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "apothem" as const, label: "אפותמה",       tex: "m = \\sqrt{(\\frac{a}{2})^2 + h^2}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "lateral" as const, label: "שטח צדדי",   tex: "S = \\frac{1}{2}Pm",                    color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => { const isActive = activeTab === t.id; return (
          <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.15)"}`, background: isActive ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
            <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
          </button>); })}
      </div>
      {activeTab === "volume" && (
        <motion.div key="volume" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"V = \\frac{1}{3} \\cdot B \\cdot h"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> נפח הפירמידה הוא שליש מנפח המנסרה המתאימה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>B = שטח הבסיס. לריבוע: <InlineMath>{"B = a^2"}</InlineMath>. למלבן: <InlineMath>{"B = a \\cdot b"}</InlineMath>.</li>
                  <li>h = הגובה מהקדקוד למרכז הבסיס.</li>
                  <li>אל תשכחו את ה-<InlineMath>{"\\frac{1}{3}"}</InlineMath>!</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "slant" && (
        <motion.div key="slant" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"e = \\sqrt{OA^2 + h^2}"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> המקצוע הצדדי הוא הקו מהקדקוד P לפינת הבסיס A.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>OA = מרחק מהמרכז O לפינה A. לריבוע: <InlineMath>{"OA = \\frac{a\\sqrt{2}}{2}"}</InlineMath>.</li>
                  <li>המשולש ישר-הזווית: POA (ניצבים h ו-OA).</li>
                  <li>פיתגורס: <InlineMath>{"e = \\sqrt{OA^2 + h^2}"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>&#128161; טיפ: OA שונה מחצי צלע! לריבוע OA = a&#8730;2/2, לא a/2.</div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "apothem" && (
        <motion.div key="apothem" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"m = \\sqrt{\\left(\\frac{a}{2}\\right)^2 + h^2}"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> האפותמה היא גובה הפאה המשולשת (מהקדקוד P לאמצע צלע הבסיס).
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>המרחק מהמרכז O לאמצע הצלע = <InlineMath>{"\\frac{a}{2}"}</InlineMath> (לריבוע).</li>
                  <li>המשולש ישר-הזווית: h ו-a/2 הם הניצבים.</li>
                  <li>האפותמה m היא ההיפותנוסה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>&#128161; אל תבלבלו: אפותמה = גובה הפאה. מקצוע צדדי = קו לפינה.</div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "lateral" && (
        <motion.div key="lateral" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"S_{\\text{lateral}} = \\frac{1}{2} \\cdot P \\cdot m"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> שטח צדדי = חצי מכפלת היקף הבסיס באפותמה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>P = היקף הבסיס. לריבוע: P = 4a.</li>
                  <li>m = האפותמה (שחישבנו קודם).</li>
                  <li>שטח כולל = שטח צדדי + שטח בסיס.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>&#128161; נוסחה זו תקפה לכל פירמידה ישרה (לא רק בסיס ריבועי).</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "מקצוע צדדי ואפותמה",
    problem: "פירמידה ישרה עם בסיס ריבועי, צלע הבסיס a וגובה h.\n\nא. מצא את אורך המקצוע הצדדי PA (מהקדקוד P לפינת הבסיס A).\nב. מצא את האפותמה — גובה הפאה המשולשת.\nג. מצא את הזווית שבין המקצוע הצדדי PA לבסיס הפירמידה.",
    diagram: <PyramidSVG_L1 />,
    pitfalls: [
      { title: "מבלבלים בין מקצוע צדדי לאפותמה", text: "PA עובר דרך פינת הבסיס, האפותמה דרך אמצע הצלע — משולשים שונים!" },
      { title: "שוכחים שהמרחק מהמרכז לפינה הוא a√2/2 ולא a/2", text: "לריבוע, האלכסון = a√2, לכן חצי האלכסון (מרכז→פינה) = a√2/2." },
      { title: "בלבול בזווית — OPA ולא על הפאה עצמה", text: "הזווית בין PA לבסיס מחושבת במשולש ישר-זווית OPA (O = מרכז, ניצב = h)." },
    ],
    goldenPrompt: "אני תלמיד כיתה יב׳. פירמידה ישרה עם בסיס ריבועי, צלע a וגובה h.\nאני צריך:\n1. למצוא את המקצוע הצדדי PA\n2. למצוא את האפותמה\n3. למצוא את הזווית בין PA לבסיס\n\nאל תפתור עבורי — שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "א", label: "שלב א׳ — מקצוע צדדי PA", coaching: "זהה את המשולש OPA", prompt: "אני תלמיד כיתה יב׳. פירמידה ישרה עם בסיס ריבועי, צלע a וגובה h. אני רוצה למצוא את PA — המקצוע הצדדי.\nמה המרחק OA מהמרכז O לפינה A? באיזה משולש ישר-זווית להשתמש?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["מקצוע", "פיתגורס", "מרכז"], keywordHint: "ציין שצריך משולש ישר-זווית", contextWords: ["מקצוע", "פיתגורס", "מרכז", "OA", "משולש", "ישר-זווית", "פינה"] },
      { phase: "ב", label: "שלב ב׳ — אפותמה", coaching: "השתמש בחצי צלע ובגובה", prompt: "אני תלמיד כיתה יב׳. פירמידה ישרה, צלע בסיס a, גובה h. אני צריך את האפותמה — גובה הפאה המשולשת.\nמה נקודת האמצע M של צלע AB? מה המרחק OM? באיזה משולש ישר-זווית להשתמש?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["אפותמה", "אמצע", "גובה"], keywordHint: "ציין שמדובר באפותמה", contextWords: ["אפותמה", "אמצע", "גובה", "OM", "a/2", "פאה", "משולש"] },
      { phase: "ג", label: "שלב ג׳ — זווית PA עם הבסיס", coaching: "tan = h / OA", prompt: "אני תלמיד כיתה יב׳. מצאתי את PA. עכשיו אני צריך את הזווית בין PA לבסיס הפירמידה.\nבאיזה משולש ישר-זווית הזווית נמצאת? מה ניצב הגובה ומה ניצב הבסיס?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["זווית", "טריגונומטריה", "בסיס"], keywordHint: "ציין שצריך טריגונומטריה", contextWords: ["זווית", "טריגונומטריה", "tan", "בסיס", "OA", "h", "PA"] },
    ],
  },
  {
    id: "medium",
    title: "גובה וזווית מנפח נתון",
    problem: "פירמידה ישרה עם בסיס מלבני.\nנתון: צלעות הבסיס ונפח V.\n\nא. מצא את גובה הפירמידה h מנוסחת הנפח.\nב. מצא את האפותמה לפאה שעל הצלע הארוכה.\nג. מצא את הזווית שבין הפאה הגדולה לבסיס.",
    diagram: <PyramidSVG_L2 />,
    pitfalls: [
      { title: "שוכחים את ⅓ בנוסחת הנפח", text: "V = ⅓·B·h ולא V = B·h. שכחת השליש = גובה שגוי פי 3!" },
      { title: "אפותמה לפאה על הצלע הארוכה — המרחק הוא חצי הצלע הקצרה", text: "אם הבסיס a×b ו-b הצלע הארוכה, האפותמה לפאה שעליה משתמשת ב-a/2 (חצי הצלע הקצרה)." },
      { title: "מבלבלים בין זווית פאה-בסיס לזווית מקצוע-בסיס", text: "זווית פאה-בסיס: במשולש עם האפותמה. זווית מקצוע-בסיס: במשולש עם PA. משולשים שונים!" },
    ],
    goldenPrompt: "אני תלמיד כיתה יב׳. פירמידה ישרה עם בסיס מלבני. נתונים: צלעות הבסיס ונפח V.\nאני צריך:\n1. למצוא את הגובה h מנוסחת הנפח\n2. למצוא את האפותמה לפאה שעל הצלע הארוכה\n3. למצוא את הזווית בין הפאה הגדולה לבסיס\n\nאל תפתור עבורי — שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "א", label: "שלב א׳ — חילוץ גובה מנפח", coaching: "V = ⅓·a·b·h, חלץ h", prompt: "אני תלמיד כיתה יב׳. פירמידה ישרה עם בסיס מלבני, צלעות נתונות ונפח V.\nתנחה אותי: מה נוסחת הנפח של פירמידה? איך מוציאים את h?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["נפח", "גובה", "שליש"], keywordHint: "ציין שצריך נוסחת נפח עם ⅓", contextWords: ["נפח", "גובה", "שליש", "בסיס", "מלבני", "חלץ", "V", "h"] },
      { phase: "ב", label: "שלב ב׳ — אפותמה לפאה הגדולה", coaching: "זהה חצי צלע נכון + גובה", prompt: "אני תלמיד כיתה יב׳. מצאתי את הגובה h. עכשיו אני צריך את האפותמה לפאה שעל הצלע הארוכה.\nתנחה אותי: מה המרחק מהמרכז לאמצע הצלע הארוכה? באיזה משולש ישר-זווית להשתמש?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["אפותמה", "צלע", "משולש"], keywordHint: "ציין שצריך את האפותמה", contextWords: ["אפותמה", "צלע", "אמצע", "מרחק", "משולש", "ישר-זווית", "h"] },
      { phase: "ג", label: "שלב ג׳ — זווית פאה עם הבסיס", coaching: "tan = h / (חצי צלע קצרה)", prompt: "אני תלמיד כיתה יב׳. מצאתי את האפותמה. עכשיו אני צריך את הזווית בין הפאה הגדולה לבסיס.\nתנחה אותי: באיזה משולש ישר-זווית הזווית נמצאת? מי הניצבים?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["זווית", "פאה", "tan"], keywordHint: "ציין שצריך זווית פאה-בסיס", contextWords: ["זווית", "פאה", "בסיס", "tan", "אפותמה", "ניצב", "טריגונומטריה"] },
    ],
  },
  {
    id: "advanced",
    title: "ביטוי לנפח עם L ו-α",
    problem: "פירמידה ישרה עם בסיס ריבועי.\nנתון: מקצוע צדדי L וזווית הפאה עם הבסיס α.\n\nא. בטא את האפותמה וחצי צלע הבסיס כתלות ב-L ו-α.\nב. בטא את הגובה h כתלות ב-L ו-α.\nג. הצב וכתוב ביטוי מלא לנפח V(L, α).",
    diagram: <PyramidSVG_L3 />,
    pitfalls: [
      { title: "בלבול בין cos ל-sin", text: "האפותמה = L·cos(α) כי היא הניצב הצמוד לזווית. הגובה = L·sin(α) כי הוא הניצב הנגדי." },
      { title: "שוכחים שצלע הבסיס a = 2 × האפותמה", text: "האפותמה מגיעה לאמצע הצלע, לכן a = 2m = 2L·cos(α)." },
      { title: "טעות בהצבה לנפח", text: "V = ⅓·a²·h = ⅓·(2m)²·h, לא ⅓·m²·h. אל תשכחו לרבע את 2m!" },
    ],
    goldenPrompt: "",
    steps: [
      { phase: "א", label: "שלב א׳ — אפותמה וחצי צלע", coaching: "השתמש בטריגונומטריה במשולש ישר-זווית", prompt: "אני תלמיד כיתה יב׳. פירמידה ישרה עם בסיס ריבועי. נתון מקצוע צדדי L וזווית הפאה עם הבסיס α.\nתנחה אותי: איך מבטאים את האפותמה ואת חצי צלע הבסיס באמצעות L ו-α? באיזה משולש ישר-זווית להשתמש?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["אפותמה", "cos", "L"], keywordHint: "ציין שצריך טריגונומטריה עם L", contextWords: ["אפותמה", "cos", "sin", "L", "α", "צלע", "משולש", "טריגונומטריה"] },
      { phase: "ב", label: "שלב ב׳ — הגובה h", coaching: "h = L·sin(α) מהמשולש", prompt: "אני תלמיד כיתה יב׳. מצאתי את האפותמה m באמצעות L ו-α. עכשיו אני צריך את הגובה h.\nתנחה אותי: באיזה יחס טריגונומטרי להשתמש כדי למצוא את h? מה הניצב הנגדי?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["גובה", "sin", "ניצב"], keywordHint: "ציין שצריך למצוא את הגובה", contextWords: ["גובה", "sin", "ניצב", "נגדי", "L", "α", "h", "משולש"] },
      { phase: "ג", label: "שלב ג׳ — ביטוי לנפח V(L, α)", coaching: "הצב a=2m ו-h בנוסחת הנפח", prompt: "אני תלמיד כיתה יב׳. מצאתי m, a ו-h כתלות ב-L ו-α. עכשיו אני צריך לכתוב ביטוי מלא לנפח.\nתנחה אותי: איך מציבים את הביטויים בנוסחת V = ⅓·a²·h? מה הביטוי הסופי?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["נפח", "הצב", "ביטוי"], keywordHint: "ציין שצריך להציב בנוסחת הנפח", contextWords: ["נפח", "הצב", "ביטוי", "V", "a²", "h", "L", "α", "שליש"] },
    ],
  },
];

// ─── PyramidLab ───────────────────────────────────────────────────────────────

function PyramidLab() {
  const [A, setA] = useState(10);
  const [H, setH] = useState(12);
  const [sparkle, setSparkle] = useState(false);

  const vol = (1 / 3) * A * A * H;
  const apothem = Math.sqrt((A / 2) ** 2 + H ** 2);
  const slantEdge = Math.sqrt((A * Math.SQRT2 / 2) ** 2 + H ** 2);
  const baseAngle = (Math.atan(H / (A / 2)) * 180) / Math.PI;

  const sc = 200 / Math.max(A, H, 1);
  const SA = A * sc, SH = H * sc;
  const dX = SA * 0.4, dY = SA * 0.28;
  const ox = 30, oy = 260;
  const bA = [ox, oy], bB = [ox + SA, oy], bC = [ox + SA + dX, oy - dY], bD = [ox + dX, oy - dY];
  const cx = (bA[0] + bC[0]) / 2, cy = (bA[1] + bC[1]) / 2;
  const Px = cx, Py = cy - SH;
  const PAD = 24;
  const allX = [bA, bB, bC, bD, [Px, Py]].map(p => p[0]);
  const allY = [bA, bB, bC, bD, [Px, Py]].map(p => p[1]);
  const vx = Math.min(...allX) - PAD, vy = Math.min(...allY) - PAD;
  const vw = Math.max(...allX) - Math.min(...allX) + PAD * 2;
  const vh = Math.max(...allY) - Math.min(...allY) + PAD * 2;
  const ln = (a: number[], b: number[], clr = "#94a3b8", w = 1.5, dash = "") =>
    <line key={`${a[0]}-${a[1]}-${b[0]}-${b[1]}-${clr}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={clr} strokeWidth={w} strokeDasharray={dash} />;

  const handleSlider = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { setter(+e.target.value); setSparkle(true); setTimeout(() => setSparkle(false), 600); };

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת פירמידה</h3>
        {sparkle && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />מתעדכן!</span>}
      </div>
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
        {[{ label: "צלע בסיס (a)", val: A, set: setA, accent: "#16a34a" }, { label: "גובה (h)", val: H, set: setH, accent: "#d97706" }].map(r => (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 2 }}><span>{r.label}</span><span style={{ color: "#2D3436", fontWeight: 700, fontFamily: "monospace" }}>{r.val}</span></div>
            <input type="range" min={1} max={15} step={1} value={r.val} onChange={handleSlider(r.set)} style={{ display: "block", width: "100%", accentColor: r.accent }} />
          </div>
        ))}
      </div>
      <div style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "#fff", height: 320, display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1rem", overflow: "hidden", padding: "1rem" }}>
        <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }} aria-hidden>
          {ln(bA, bB)}{ln(bB, bC)}{ln(bC, bD, "#94a3b8", 1.5, "4 3")}{ln(bD, bA, "#94a3b8", 1.5, "4 3")}
          {ln([Px, Py], bA)}{ln([Px, Py], bB)}{ln([Px, Py], bC, "#94a3b8", 1.5, "4 3")}{ln([Px, Py], bD, "#94a3b8", 1.5, "4 3")}
          {ln([(bA[0] + bB[0]) / 2, (bA[1] + bB[1]) / 2], [Px, Py], "#f59e0b", 2, "5 3")}
          {ln([cx, cy], [Px, Py], "#fb7185", 1.5, "3 3")}
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 8 }}>
        {[
          { label: "נפח", val: vol.toFixed(1), sub: "⅓ · a² · h", color: "#16a34a" },
          { label: "מקצוע צדדי", val: slantEdge.toFixed(2), sub: "√(OA² + h²)", color: "#a78bfa" },
        ].map(r => (<div key={r.label} style={{ borderRadius: 10, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", padding: "10px 8px", textAlign: "center", minWidth: 0 }}><div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>{r.label}</div><div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div><div style={{ color: "#94a3b8", fontSize: 9, marginTop: 3 }}>{r.sub}</div></div>))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {[
          { label: "אפותמה", val: apothem.toFixed(2), sub: "√((a/2)² + h²)", color: "#f59e0b" },
          { label: "זווית פאה", val: baseAngle.toFixed(1) + "°", sub: "arctan(h / (a/2))", color: "#dc2626" },
        ].map(r => (<div key={r.label} style={{ borderRadius: 10, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", padding: "10px 8px", textAlign: "center", minWidth: 0 }}><div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>{r.label}</div><div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div><div style={{ color: "#94a3b8", fontSize: 9, marginTop: 3 }}>{r.sub}</div></div>))}
      </div>
      <LabMessage text="שנה את הסליידרים כדי לראות איך הפירמידה משתנה!" type="success" visible={sparkle} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PyramidPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "22,163,74" : selectedLevel === "medium" ? "234,88,12" : "220,38,38";

  return (
    <main style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties} dir="rtl">
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>הפירמידה הישרה — עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>גבהות, מקצועות, זוויות — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link href="/topic/grade12/space-geometry" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}>
            <span style={{ fontSize: 16 }}>{"\u2190"}</span>חזרה
          </Link>
        </div>
      </div>
      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="grade12/space-geometry/pyramid" />
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => { const active = selectedLevel === tab.id; return (
            <button key={tab.id} onClick={() => setSelectedLevel(tab.id)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-slate-500 hover:text-slate-300"}`}
              style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>{tab.label}</button>); })}
        </div>
        <FormulaBar />
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>
        <PyramidLab />
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="grade12/space-geometry/pyramid" level={selectedLevel} />
        </div>
      </div>
    </main>
  );
}
