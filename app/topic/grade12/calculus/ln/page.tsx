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
  basic:    { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E8\u05D0\u05E9\u05D5\u05E0\u05D4", badge: "\u05DE\u05EA\u05D7\u05D9\u05DC", badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E9\u05E0\u05D9\u05D9\u05D4",  badge: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9", badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E9\u05DC\u05D9\u05E9\u05D9\u05EA", badge: "\u05DE\u05EA\u05E7\u05D3\u05DD", badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "\u05DE\u05EA\u05D7\u05D9\u05DC",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "\u05DE\u05EA\u05E7\u05D3\u05DD",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── Silent SVG Diagrams ─────────────────────────────────────────────────────

function LnCurveBasic() {
  const W = 260, H = 150;
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = 0.06 + (i / 80) * 4.5;
    const y = Math.log(t);
    const sx = 70 + (t / 4.5) * 175;
    const sy = 100 - y * 30;
    if (sy > 10 && sy < 140) pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={65} y1={100} x2={250} y2={100} stroke="#94a3b8" strokeWidth={1} />
      <line x1={70} y1={10} x2={70} y2={140} stroke="#94a3b8" strokeWidth={1} />
      <line x1={70} y1={10} x2={70} y2={140} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <polyline points={pts.join(" ")} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={109} cy={100} r={4} fill="#a78bfa" />
      <text x={55} y={105} textAnchor="end" fontSize={10} fill="#64748b">O</text>
      <text x={252} y={105} fontSize={10} fill="#64748b">x</text>
      <text x={72} y={15} fontSize={10} fill="#64748b">y</text>
      <text x={109} y={115} textAnchor="middle" fontSize={9} fill="#a78bfa">?</text>
      <text x={200} y={50} fontSize={10} fill="#16a34a" fontStyle="italic">f</text>
    </svg>
  );
}

function LnCurveMedium() {
  const W = 260, H = 150;
  const pts: string[] = [];
  for (let i = 1; i <= 80; i++) {
    const x = 0.15 + (i / 80) * 4.5;
    const y = x * x - 8 * Math.log(x);
    const sx = 55 + (x / 4.5) * 190;
    const sy = 130 - (y + 2) * 10;
    if (sy > 5 && sy < 145) pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  const minX = 2;
  const minY = 4 - 8 * Math.log(2);
  const msx = 55 + (minX / 4.5) * 190;
  const msy = 130 - (minY + 2) * 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={50} y1={110} x2={250} y2={110} stroke="#94a3b8" strokeWidth={1} />
      <line x1={55} y1={5} x2={55} y2={145} stroke="#94a3b8" strokeWidth={1} />
      <line x1={55} y1={5} x2={55} y2={145} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <polyline points={pts.join(" ")} fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={msx} cy={msy} r={4} fill="#a78bfa" />
      <text x={msx} y={msy + 14} textAnchor="middle" fontSize={9} fill="#a78bfa">?</text>
      <text x={200} y={25} fontSize={10} fill="#ea580c" fontStyle="italic">f</text>
      <text x={40} y={115} textAnchor="end" fontSize={10} fill="#64748b">O</text>
    </svg>
  );
}

function LnCurveAdvanced() {
  const W = 260, H = 150;
  const pts: string[] = [];
  const asx = 80;
  for (let i = 0; i <= 80; i++) {
    const t = 0.04 + (i / 80) * 4;
    const y = Math.log(t);
    const sx = asx + 5 + (t / 4) * 160;
    const sy = 95 - y * 28;
    if (sy > 8 && sy < 142) pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  const zeroX = asx + 5 + (1 / 4) * 160;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={50} y1={95} x2={250} y2={95} stroke="#94a3b8" strokeWidth={1} />
      <line x1={55} y1={8} x2={55} y2={142} stroke="#94a3b8" strokeWidth={1} />
      <line x1={asx} y1={8} x2={asx} y2={142} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <polyline points={pts.join(" ")} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={zeroX} cy={95} r={4} fill="#a78bfa" />
      <text x={zeroX} y={110} textAnchor="middle" fontSize={9} fill="#a78bfa">?</text>
      <text x={asx - 3} y={142} textAnchor="middle" fontSize={9} fill="#f59e0b">x=?</text>
      <text x={210} y={40} fontSize={10} fill="#dc2626" fontStyle="italic">f</text>
      <text x={55} y={8} fontSize={9} fill="#64748b">a</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>&#10024;</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E8\u05D0\u05E9\u05D9</span>
      </div>
      <p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05DC\u05D0" accentRgb={glowRgb} />
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05D4\u05DE\u05D5\u05DB\u05DF</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05DE\u05D5\u05E7\u05D3" accentRgb={glowRgb} />
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
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "\u05D4\u05E0\u05D9\u05E1\u05D5\u05D7 \u05E7\u05E6\u05E8 \u05DE\u05D3\u05D9 -- \u05DB\u05EA\u05D5\u05D1 \u05DC\u05E4\u05D7\u05D5\u05EA 20 \u05EA\u05D5\u05D5\u05D9\u05DD." }); return; }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };
  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <Lock size={14} color="#6B7280" />
      <div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div>
    </div>
  );
  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(22,163,74,0.15)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="\u05E0\u05E1\u05D7 \u05DB\u05D0\u05DF \u05D0\u05EA \u05D4\u05E9\u05D0\u05DC\u05D4 \u05E9\u05DC\u05DA \u05DC-AI (\u05D1\u05E7\u05E9 \u05D4\u05DB\u05D5\u05D5\u05E0\u05D4, \u05DC\u05D0 \u05E4\u05EA\u05E8\u05D5\u05DF)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}><span>\u05E6\u05D9\u05D5\u05DF \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div>
          </div>
        )}
        {!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; \u05D1\u05D3\u05D9\u05E7\u05EA AI \u05DE\u05D3\u05D5\u05DE\u05D4</button>}
        {result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#9888;&#65039; {result.hint}</motion.div>}
        {result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#128161; {result.hint}</motion.div>}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05E6\u05D5\u05D9\u05DF! \u05E6\u05D9\u05D5\u05DF: <strong>{result!.score}/100</strong></div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7 \u05DC-AI"}</button>
          </motion.div>
        )}
        {result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1</button>}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span>
    </div>
  );
  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "\u05D4\u05E0\u05D9\u05E1\u05D5\u05D7 \u05E7\u05E6\u05E8 \u05DE\u05D3\u05D9 -- \u05DB\u05EA\u05D5\u05D1 \u05DC\u05E4\u05D7\u05D5\u05EA 20 \u05EA\u05D5\u05D5\u05D9\u05DD." }); return; }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>
        {passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="\u05DB\u05EA\u05D5\u05D1 \u05D0\u05EA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E9\u05DC\u05DA \u05DC\u05E1\u05E2\u05D9\u05E3 \u05D6\u05D4..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>\u05E6\u05D9\u05D5\u05DF</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} /></div>
          </div>
        )}
        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}
          </motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; \u05E0\u05D9\u05E1\u05D5\u05D7 \u05DE\u05E2\u05D5\u05DC\u05D4! \u05D4\u05E1\u05E2\u05D9\u05E3 \u05D4\u05D1\u05D0 \u05E0\u05E4\u05EA\u05D7.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7 \u05E0\u05D9\u05E1\u05D5\u05D7"}</button>
          </motion.div>
        )}
        {!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; \u05D1\u05D3\u05D9\u05E7\u05EA AI \u05DE\u05D3\u05D5\u05DE\u05D4</button>}
      </div>
    </div>
  );
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

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
      <GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; \u05E1\u05D9\u05D9\u05DE\u05EA\u05D9 \u05E1\u05E2\u05D9\u05E3 \u05D6\u05D4</button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; \u05D4\u05D5\u05E9\u05DC\u05DD</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}><Lock size={14} color="#6B7280" /></div>
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
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlockedIdx = masterPassed ? (passed.findIndex(p => !p) === -1 ? steps.length : passed.findIndex(p => !p)) : -1;
  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="\u05E1\u05E8\u05D5\u05E7 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05E2\u05E6\u05D5\u05E8"
        subjectWords={["\u05DC\u05D5\u05D2\u05E8\u05D9\u05EA\u05DD", "ln", "\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05EA\u05D7\u05D5\u05DD", "\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4", "\u05E9\u05E8\u05E9\u05E8\u05EA", "\u05E4\u05E8\u05DE\u05D8\u05E8"]} />
      {steps.map((s, i) => (
        <TutorStepAdvanced key={i} step={s} locked={!masterPassed || i > unlockedIdx} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} />
      ))}
    </div>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; \u05D4\u05E9\u05D0\u05DC\u05D4</div>
          <button onClick={() => { navigator.clipboard.writeText(ex.problem); setCopiedProblem(true); setTimeout(() => setCopiedProblem(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}{copiedProblem ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7"}
          </button>
        </div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA \u05E0\u05E4\u05D5\u05E6\u05D5\u05EA</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; \u05DE\u05D3\u05E8\u05D9\u05DA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8\u05D9\u05DD</div>
        {ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── FormulaBar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"deriv" | "chain" | "props" | "integral" | null>(null);
  const tabs = [
    { id: "deriv" as const, label: "\u05E0\u05D2\u05D6\u05E8\u05EA ln", tex: "(\\ln x)' = \\frac{1}{x}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "chain" as const, label: "\u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA", tex: "(\\ln u)' = \\frac{u'}{u}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "props" as const, label: "\u05EA\u05DB\u05D5\u05E0\u05D5\u05EA", tex: "\\ln(ab) = \\ln a + \\ln b", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "integral" as const, label: "\u05D0\u05D9\u05E0\u05D8\u05D2\u05E8\u05DC", tex: "\\int \\frac{1}{x}dx = \\ln|x|+C", color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>\u05E0\u05D5\u05E1\u05D7\u05D0\u05D5\u05EA</div>
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.15)"}`, background: isActive ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>
      {activeTab === "deriv" && (
        <motion.div key="deriv" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"(\\ln x)' = \\frac{1}{x}, \\quad x > 0"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05DC \u05DC\u05D5\u05D2\u05E8\u05D9\u05EA\u05DD \u05D8\u05D1\u05E2\u05D9 \u05D4\u05D9\u05D0 \u05D4\u05D4\u05D5\u05E4\u05DB\u05D9 \u05E9\u05DC x.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>\u05DE\u05D5\u05D2\u05D3\u05E8\u05EA \u05E8\u05E7 \u05E2\u05D1\u05D5\u05E8 <InlineMath>{"x > 0"}</InlineMath>.</li>
                  <li>\u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05EA\u05DE\u05D9\u05D3 \u05D7\u05D9\u05D5\u05D1\u05D9\u05EA \u05D1\u05EA\u05D7\u05D5\u05DD \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4.</li>
                  <li>\u05DB\u05E9-<InlineMath>{"x \\to 0^+"}</InlineMath> \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05D5\u05D0\u05E4\u05EA \u05DC\u05D0\u05D9\u05E0\u05E1\u05D5\u05E3.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "chain" && (
        <motion.div key="chain" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"(\\ln u)' = \\frac{u'}{u}"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA \u05DC\u05DC\u05D5\u05D2\u05E8\u05D9\u05EA\u05DD:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>\u05D2\u05D6\u05E8\u05D5 \u05D0\u05EA \u05D4\u05D1\u05D9\u05D8\u05D5\u05D9 \u05D4\u05E4\u05E0\u05D9\u05DE\u05D9 <InlineMath>{"u(x)"}</InlineMath>.</li>
                  <li>\u05D7\u05DC\u05E7\u05D5 \u05D0\u05EA \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05D1\u05D1\u05D9\u05D8\u05D5\u05D9 \u05D4\u05E4\u05E0\u05D9\u05DE\u05D9.</li>
                  <li>\u05D4\u05EA\u05D5\u05E6\u05D0\u05D4: <InlineMath>{"\\frac{u'}{u}"}</InlineMath> \u2014 \u05E0\u05D2\u05D6\u05E8\u05EA \u05D4\u05E4\u05E0\u05D9\u05DE\u05D9 \u05D7\u05DC\u05E7\u05D9 \u05D4\u05E4\u05E0\u05D9\u05DE\u05D9.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>&#128161; \u05D8\u05D9\u05E4: \u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05DC\u05D2\u05D6\u05D5\u05E8 \u05D0\u05EA <InlineMath>{"u'"}</InlineMath> \u2014 \u05D6\u05D5 \u05D4\u05D8\u05E2\u05D5\u05EA \u05D4\u05E0\u05E4\u05D5\u05E6\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8!</div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "props" && (
        <motion.div key="props" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\ln(ab) = \\ln a + \\ln b \\quad \\ln\\frac{a}{b} = \\ln a - \\ln b \\quad \\ln a^n = n\\ln a"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05EA\u05DB\u05D5\u05E0\u05D5\u05EA \u05D1\u05E1\u05D9\u05E1\u05D9\u05D5\u05EA \u05E9\u05DC \u05DC\u05D5\u05D2\u05E8\u05D9\u05EA\u05DD:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"\\ln 1 = 0"}</InlineMath> \u2014 \u05DB\u05D9 <InlineMath>{"e^0 = 1"}</InlineMath>.</li>
                  <li><InlineMath>{"\\ln e = 1"}</InlineMath> \u2014 \u05DB\u05D9 <InlineMath>{"e^1 = e"}</InlineMath>.</li>
                  <li><InlineMath>{"e^{\\ln x} = x"}</InlineMath> \u2014 \u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D5\u05EA \u05D4\u05D5\u05E4\u05DB\u05D9\u05D5\u05EA.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "integral" && (
        <motion.div key="integral" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\int \\frac{1}{x}dx = \\ln|x| + C"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D4\u05D0\u05D9\u05E0\u05D8\u05D2\u05E8\u05DC \u05E9\u05DC 1/x:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>\u05E9\u05D9\u05DE\u05D5 \u05DC\u05D1: \u05E2\u05E8\u05DA \u05DE\u05D5\u05D7\u05DC\u05D8 <InlineMath>{"|x|"}</InlineMath> \u05DB\u05D9 \u05D4\u05DC\u05D5\u05D2\u05E8\u05D9\u05EA\u05DD \u05DE\u05D5\u05D2\u05D3\u05E8 \u05E8\u05E7 \u05DC\u05D7\u05D9\u05D5\u05D1\u05D9\u05D9\u05DD.</li>
                  <li>\u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 +C \u05D1\u05D0\u05D9\u05E0\u05D8\u05D2\u05E8\u05DC \u05DC\u05D0 \u05DE\u05E1\u05D5\u05D9\u05DD!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>&#128161; \u05D1\u05D1\u05D2\u05E8\u05D5\u05EA: \u05E9\u05DB\u05D7\u05EA +C \u05E2\u05D5\u05DC\u05D4 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA!</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── LnLab ───────────────────────────────────────────────────────────────────

function LnLab() {
  const [aInt, setAInt] = useState(10);
  const [bInt, setBInt] = useState(0);
  const a = aInt / 10;
  const b = bInt;
  const asymptote = a !== 0 ? -b / a : 0;
  const xStart = asymptote + 0.05;
  const xEnd = asymptote + 7;
  const yMin = -3, yMax = 3;
  const W = 320, H = 200;
  const toSX = (x: number) => 40 + ((x - xStart) / (xEnd - xStart)) * 265;
  const toSY = (y: number) => 170 - ((y - yMin) / (yMax - yMin)) * 150;
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
  const xIntercept = a !== 0 ? (1 - b) / a : null;
  const xInterceptSX = xIntercept !== null && xIntercept > xStart && xIntercept < xEnd ? toSX(xIntercept) : null;
  const changed = aInt !== 10 || bInt !== 0;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; \u05DE\u05E2\u05D1\u05D3\u05EA ln(ax + b)</h3>
        {changed && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />\u05DE\u05E9\u05EA\u05E0\u05D4!</span>}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        <line x1={35} y1={toSY(0)} x2={W - 8} y2={toSY(0)} stroke="#94a3b8" strokeWidth={1} />
        <line x1={40} y1={10} x2={40} y2={H - 8} stroke="#94a3b8" strokeWidth={1} />
        {axX > 35 && axX < W - 5 && <line x1={axX} y1={8} x2={axX} y2={H - 8} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5,3" />}
        {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
        {xInterceptSX !== null && <circle cx={xInterceptSX} cy={toSY(0)} r={3.5} fill="#a78bfa" />}
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 8px", marginBottom: 20 }}>
        {([
          { label: "a", val: a.toFixed(1), set: setAInt, min: 2, max: 30, step: 1, value: aInt, color: "#22c55e" },
          { label: "b", val: b.toString(), set: setBInt, min: -6, max: 6, step: 1, value: bInt, color: "#f59e0b" },
        ] as const).map(({ label, val, set, min, max, step, value, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              <span>{label}</span><span style={{ color, fontWeight: 700 }}>{val}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={e => (set as (v: number) => void)(Number(e.target.value))}
              style={{ width: "100%", accentColor: color } as React.CSSProperties} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
          <div style={{ color: "#64748b", marginBottom: 4 }}>\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4</div>
          <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: 11 }}>x = {asymptote.toFixed(2)}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
          <div style={{ color: "#64748b", marginBottom: 4 }}>\u05D7\u05D9\u05EA\u05D5\u05DA x</div>
          <div style={{ fontWeight: 700, color: "#a78bfa", fontSize: 11 }}>{xIntercept !== null ? `x = ${xIntercept.toFixed(2)}` : "\u2014"}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
          <div style={{ color: "#64748b", marginBottom: 4 }}>\u05EA\u05D7\u05D5\u05DD</div>
          <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 11 }}>x &gt; {asymptote.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#f59e0b", fontWeight: 600 }}>\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4</span> = \u2212b/a &nbsp;|&nbsp; <span style={{ color: "#a78bfa", fontWeight: 600 }}>\u05D7\u05D9\u05EA\u05D5\u05DA x</span>: ax+b=1 &rarr; x=(1\u2212b)/a
      </div>

      <LabMessage text="\u05E9\u05E0\u05D4 \u05D0\u05EA \u05D4\u05E1\u05DC\u05D9\u05D9\u05D3\u05E8\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05D9\u05DA \u05D4\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4 \u05D6\u05D6\u05D4!" type="success" visible={changed} />
    </section>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "\u05EA\u05D7\u05D5\u05DD \u05D4\u05D2\u05D3\u05E8\u05D4 \u05D5\u05E0\u05D2\u05D6\u05E8\u05EA",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 f(x) = ln(2x \u2212 6).\n\n\u05D0. \u05DE\u05E6\u05D0 \u05D0\u05EA \u05EA\u05D7\u05D5\u05DD \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4 \u05E9\u05DC f.\n\u05D1. \u05DE\u05E6\u05D0 \u05D0\u05EA f\u2032(x) \u05D1\u05E2\u05D6\u05E8\u05EA \u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA.\n\u05D2. \u05D7\u05E9\u05D1 \u05D0\u05EA f\u2032(4) \u05D5\u05E4\u05E8\u05E9 \u05D0\u05EA \u05D4\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D4\u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9\u05EA.",
    diagram: <LnCurveBasic />,
    pitfalls: [
      { title: "\u05E9\u05D5\u05DB\u05D7\u05D9\u05DD \u05E9\u05D4\u05D1\u05D9\u05D8\u05D5\u05D9 \u05D1\u05EA\u05D5\u05DA ln \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D7\u05D9\u05D5\u05D1\u05D9 \u05DE\u05DE\u05E9", text: "\u05D4\u05D3\u05E8\u05D9\u05E9\u05D4: 2x \u2212 6 > 0, \u05DC\u05D0 \u2265 0. \u05DC\u05D5\u05D2\u05E8\u05D9\u05EA\u05DD \u05E9\u05DC \u05D0\u05E4\u05E1 \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8." },
      { title: "\u05E9\u05D5\u05DB\u05D7\u05D9\u05DD \u05DC\u05D2\u05D6\u05D5\u05E8 \u05D0\u05EA \u05D4\u05D1\u05D9\u05D8\u05D5\u05D9 \u05D4\u05E4\u05E0\u05D9\u05DE\u05D9 \u05D1\u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA", text: "(ln u)\u2032 = u\u2032/u. \u05E6\u05E8\u05D9\u05DA \u05DC\u05D2\u05D6\u05D5\u05E8 \u05D2\u05DD \u05D0\u05EA \u05D4\u05D1\u05D9\u05D8\u05D5\u05D9 \u05D4\u05E4\u05E0\u05D9\u05DE\u05D9 (2x\u22126)\u2032 \u05D5\u05DC\u05D4\u05DB\u05E4\u05D9\u05DC \u05D1\u05DE\u05D5\u05E0\u05D4." },
      { title: "\u05DE\u05D1\u05DC\u05D1\u05DC\u05D9\u05DD \u05D1\u05D9\u05DF \u05E2\u05E8\u05DA \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05DC\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9\u05EA", text: "f\u2032(4) \u05D4\u05D5\u05D0 \u05E9\u05D9\u05E4\u05D5\u05E2 \u05D4\u05DE\u05E9\u05D9\u05E7 \u05D1\u05E0\u05E7\u05D5\u05D3\u05D4, \u05DC\u05D0 \u05E2\u05E8\u05DA \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4. \u05D0\u05DC \u05EA\u05D1\u05DC\u05D1\u05DC\u05D5 \u05D1\u05D9\u05DF f(4) \u05DC-f\u2032(4)." },
    ],
    goldenPrompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. \u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = ln(2x \u2212 6).\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA:\n1. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05EA\u05D7\u05D5\u05DD \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4\n2. \u05DC\u05D2\u05D6\u05D5\u05E8 \u05D1\u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA\n3. \u05DC\u05D4\u05E6\u05D9\u05D1 \u05D5\u05DC\u05E4\u05E8\u05E9 \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9\u05EA\n\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9 \u2014 \u05E9\u05D0\u05DC \u05D0\u05D5\u05EA\u05D9 \u05E9\u05D0\u05DC\u05D5\u05EA \u05DE\u05DB\u05D5\u05D5\u05E0\u05D5\u05EA.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    steps: [
      { phase: "\u05D0", label: "\u05E9\u05DC\u05D1 \u05D0\u2019 \u2014 \u05EA\u05D7\u05D5\u05DD \u05D4\u05D2\u05D3\u05E8\u05D4", coaching: "\u05E4\u05EA\u05D5\u05E8 \u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF 2x\u22126>0", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. \u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = ln(2x \u2212 6). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05DE\u05D4 \u05D4\u05D3\u05E8\u05D9\u05E9\u05D4 \u05DC\u05EA\u05D7\u05D5\u05DD \u05D4\u05D2\u05D3\u05E8\u05D4 \u05E9\u05DC ln? \u05D0\u05D9\u05D6\u05D4 \u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF \u05E6\u05E8\u05D9\u05DA \u05DC\u05E4\u05EA\u05D5\u05E8? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05EA\u05D7\u05D5\u05DD", "ln", "\u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D3\u05D5\u05D1\u05E8 \u05D1\u05EA\u05D7\u05D5\u05DD \u05D4\u05D2\u05D3\u05E8\u05D4", contextWords: ["\u05EA\u05D7\u05D5\u05DD", "ln", "\u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05D7\u05D9\u05D5\u05D1\u05D9", "\u05DC\u05D5\u05D2\u05E8\u05D9\u05EA\u05DD", "\u05DE\u05D5\u05D2\u05D3\u05E8"] },
      { phase: "\u05D1", label: "\u05E9\u05DC\u05D1 \u05D1\u2019 \u2014 \u05E0\u05D2\u05D6\u05E8\u05EA \u05D1\u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA", coaching: "\u05D2\u05D6\u05D5\u05E8 \u05D1\u05D9\u05D8\u05D5\u05D9 \u05E4\u05E0\u05D9\u05DE\u05D9 \u05D5\u05D7\u05DC\u05E7", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. f(x) = ln(2x \u2212 6). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA f\u2032(x) \u05D1\u05E2\u05D6\u05E8\u05EA \u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA. \u05DE\u05D4 \u05D4\u05D1\u05D9\u05D8\u05D5\u05D9 \u05D4\u05E4\u05E0\u05D9\u05DE\u05D9? \u05DE\u05D4 \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05DC\u05D5? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E9\u05E8\u05E9\u05E8\u05EA", "\u05E4\u05E0\u05D9\u05DE\u05D9"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D3\u05D5\u05D1\u05E8 \u05D1\u05E0\u05D2\u05D6\u05E8\u05EA \u05D5\u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA", contextWords: ["\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E9\u05E8\u05E9\u05E8\u05EA", "\u05E4\u05E0\u05D9\u05DE\u05D9", "ln", "u\u2032", "\u05D1\u05D9\u05D8\u05D5\u05D9"] },
      { phase: "\u05D2", label: "\u05E9\u05DC\u05D1 \u05D2\u2019 \u2014 \u05E2\u05E8\u05DA \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05D1\u05E0\u05E7\u05D5\u05D3\u05D4", coaching: "\u05D4\u05E6\u05D1 \u05D5\u05E4\u05E8\u05E9 \u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9\u05EA", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. \u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA f\u2032(x) \u05E9\u05DC f(x) = ln(2x \u2212 6). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D4\u05E6\u05D9\u05D1 x=4 \u05D1\u05E0\u05D2\u05D6\u05E8\u05EA. \u05DE\u05D4 \u05D4\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D4\u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9\u05EA \u05E9\u05DC \u05D4\u05E2\u05E8\u05DA \u05D4\u05D6\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05D4\u05E6\u05D1", "\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E9\u05D9\u05E4\u05D5\u05E2"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05E6\u05D9\u05D1 \u05D5\u05DC\u05E4\u05E8\u05E9", contextWords: ["\u05D4\u05E6\u05D1", "\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E9\u05D9\u05E4\u05D5\u05E2", "\u05DE\u05E9\u05D9\u05E7", "\u05D2\u05D9\u05D0\u05D5\u05DE\u05D8\u05E8\u05D9\u05EA", "\u05E0\u05E7\u05D5\u05D3\u05D4"] },
    ],
  },
  {
    id: "medium",
    title: "\u05E7\u05D9\u05E6\u05D5\u05DF \u05D5\u05DE\u05D5\u05E0\u05D5\u05D8\u05D5\u05E0\u05D9\u05D5\u05EA",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 f(x) = x\u00B2 \u2212 8ln(x).\n\n\u05D0. \u05DE\u05E6\u05D0 \u05D0\u05EA \u05EA\u05D7\u05D5\u05DD \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4 \u05D5\u05D4\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4 \u05D4\u05D0\u05E0\u05DB\u05D9\u05EA.\n\u05D1. \u05D7\u05E9\u05D1 \u05D0\u05EA f\u2032(x) \u05D5\u05DE\u05E6\u05D0 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF.\n\u05D2. \u05E7\u05D1\u05E2 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DC\u05D9\u05D9\u05D4 \u05D5\u05D9\u05E8\u05D9\u05D3\u05D4.\n\u05D3. \u05E1\u05D5\u05D5\u05D2 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05E7\u05D9\u05E6\u05D5\u05DF \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA f\u2032\u2032(x).",
    diagram: <LnCurveMedium />,
    pitfalls: [
      { title: "\u05E9\u05D5\u05DB\u05D7\u05D9\u05DD \u05E9\u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05DC ln(x) \u05D4\u05D9\u05D0 1/x \u05D5\u05DC\u05D0 1", text: "\u05E0\u05D2\u05D6\u05E8\u05EA (x\u00B2)\u2032 = 2x \u05D5\u05E0\u05D2\u05D6\u05E8\u05EA (ln x)\u2032 = 1/x. \u05D0\u05DC \u05EA\u05D1\u05DC\u05D1\u05DC\u05D5 \u05D1\u05D9\u05E0\u05D9\u05D4\u05DD!" },
      { title: "\u05DC\u05D0 \u05DC\u05D7\u05DC\u05E7 \u05D1-x \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D1\u05D5\u05D3\u05E7\u05D9\u05DD \u05EA\u05D7\u05D5\u05DD", text: "\u05DB\u05E9\u05E4\u05D5\u05EA\u05E8\u05D9\u05DD f\u2032(x)=0 \u05D5\u05DE\u05DB\u05E4\u05D9\u05DC\u05D9\u05DD, \u05D7\u05D9\u05D9\u05D1\u05D9\u05DD \u05DC\u05D5\u05D5\u05D3\u05D0 \u05E9\u05D4\u05E4\u05EA\u05E8\u05D5\u05DF \u05D1\u05EA\u05D7\u05D5\u05DD \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4. \u05DB\u05D0\u05DF x>0." },
      { title: "\u05DE\u05D1\u05DC\u05D1\u05DC\u05D9\u05DD \u05D1\u05D9\u05DF \u05E1\u05D9\u05D5\u05D5\u05D2 \u05D1\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05E0\u05D9\u05D9\u05D4 \u05DC\u05E1\u05D9\u05D5\u05D5\u05D2 \u05D1\u05D8\u05D1\u05DC\u05EA \u05E1\u05D9\u05DE\u05E0\u05D9\u05DD", text: "f\u2032\u2032(x) > 0 \u2192 \u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD. f\u2032\u2032(x) < 0 \u2192 \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD. \u05D0\u05DC \u05EA\u05D7\u05DC\u05D9\u05E4\u05D5 \u05D0\u05EA \u05D4\u05E9\u05D9\u05D8\u05D5\u05EA!" },
    ],
    goldenPrompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. \u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B2 \u2212 8ln(x).\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA:\n1. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05EA\u05D7\u05D5\u05DD \u05D4\u05D2\u05D3\u05E8\u05D4 \u05D5\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4\n2. \u05DC\u05D2\u05D6\u05D5\u05E8 \u05D5\u05DC\u05DE\u05E6\u05D5\u05D0 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF\n3. \u05DC\u05E7\u05D1\u05D5\u05E2 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DC\u05D9\u05D9\u05D4/\u05D9\u05E8\u05D9\u05D3\u05D4\n4. \u05DC\u05E1\u05D5\u05D5\u05D2 \u05D1\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05E0\u05D9\u05D9\u05D4\n\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9 \u2014 \u05E9\u05D0\u05DC \u05D0\u05D5\u05EA\u05D9 \u05E9\u05D0\u05DC\u05D5\u05EA \u05DE\u05DB\u05D5\u05D5\u05E0\u05D5\u05EA.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    steps: [
      { phase: "\u05D0", label: "\u05E9\u05DC\u05D1 \u05D0\u2019 \u2014 \u05EA\u05D7\u05D5\u05DD \u05D5\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4", coaching: "\u05DE\u05E6\u05D0 \u05D0\u05D9\u05E4\u05D4 ln(x) \u05DE\u05D5\u05D2\u05D3\u05E8", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. f(x) = x\u00B2 \u2212 8ln(x). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05DE\u05D4 \u05EA\u05D7\u05D5\u05DD \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4 \u05E9\u05DC ln(x)? \u05D4\u05D0\u05DD \u05D9\u05E9 \u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4 \u05D0\u05E0\u05DB\u05D9\u05EA? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05EA\u05D7\u05D5\u05DD", "ln", "\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05EA\u05D7\u05D5\u05DD \u05D5\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4", contextWords: ["\u05EA\u05D7\u05D5\u05DD", "ln", "\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4", "\u05D0\u05E0\u05DB\u05D9\u05EA", "\u05DE\u05D5\u05D2\u05D3\u05E8", "x"] },
      { phase: "\u05D1", label: "\u05E9\u05DC\u05D1 \u05D1\u2019 \u2014 \u05E0\u05D2\u05D6\u05E8\u05EA \u05D5\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF", coaching: "\u05D2\u05D6\u05D5\u05E8 \u05DB\u05DC \u05D0\u05D9\u05D1\u05E8 \u05D1\u05E0\u05E4\u05E8\u05D3 \u05D5\u05D4\u05E9\u05D5\u05D5\u05D4 \u05DC-0", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. f(x) = x\u00B2 \u2212 8ln(x). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA f\u2032(x). \u05D0\u05D9\u05DA \u05D2\u05D5\u05D6\u05E8\u05D9\u05DD \u05DB\u05DC \u05D0\u05D9\u05D1\u05E8? \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05D0\u05D9\u05E4\u05D4 f\u2032(x)=0? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E7\u05D9\u05E6\u05D5\u05DF", "f\u2032"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E0\u05D2\u05D6\u05E8\u05EA \u05D5\u05E7\u05D9\u05E6\u05D5\u05DF", contextWords: ["\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E7\u05D9\u05E6\u05D5\u05DF", "f\u2032", "\u05D0\u05D9\u05D1\u05E8", "\u05D2\u05D6\u05D5\u05E8", "\u05D4\u05E9\u05D5\u05D5\u05D4"] },
      { phase: "\u05D2", label: "\u05E9\u05DC\u05D1 \u05D2\u2019 \u2014 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DC\u05D9\u05D9\u05D4 \u05D5\u05D9\u05E8\u05D9\u05D3\u05D4", coaching: "\u05D1\u05D3\u05D5\u05E7 \u05E1\u05D9\u05DE\u05DF f\u2032 \u05D1\u05EA\u05D7\u05D5\u05DE\u05D9\u05DD", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. \u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05E7\u05D9\u05E6\u05D5\u05DF \u05E9\u05DC f(x) = x\u00B2 \u2212 8ln(x). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05E7\u05D5\u05D1\u05E2\u05D9\u05DD \u05D0\u05D9\u05E4\u05D4 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05E2\u05D5\u05DC\u05D4/\u05D9\u05D5\u05E8\u05D3\u05EA? \u05D0\u05D9\u05DA \u05D1\u05D5\u05D3\u05E7\u05D9\u05DD \u05E1\u05D9\u05DE\u05DF f\u2032? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05E2\u05DC\u05D9\u05D9\u05D4", "\u05D9\u05E8\u05D9\u05D3\u05D4", "\u05E1\u05D9\u05DE\u05DF"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05EA\u05D7\u05D5\u05DE\u05D9 \u05DE\u05D5\u05E0\u05D5\u05D8\u05D5\u05E0\u05D9\u05D5\u05EA", contextWords: ["\u05E2\u05DC\u05D9\u05D9\u05D4", "\u05D9\u05E8\u05D9\u05D3\u05D4", "\u05E1\u05D9\u05DE\u05DF", "\u05DE\u05D5\u05E0\u05D5\u05D8\u05D5\u05E0\u05D9\u05D5\u05EA", "f\u2032", "\u05EA\u05D7\u05D5\u05DD"] },
      { phase: "\u05D3", label: "\u05E9\u05DC\u05D1 \u05D3\u2019 \u2014 \u05E1\u05D9\u05D5\u05D5\u05D2 \u05D4\u05E7\u05D9\u05E6\u05D5\u05DF", coaching: "\u05D7\u05E9\u05D1 f\u2032\u2032 \u05D5\u05E7\u05D1\u05E2", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. \u05DE\u05E6\u05D0\u05EA\u05D9 \u05E0\u05E7\u05D5\u05D3\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF \u05E9\u05DC f(x) = x\u00B2 \u2212 8ln(x). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05DE\u05E1\u05D5\u05D5\u05D2\u05D9\u05DD \u05D0\u05DD \u05D6\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD \u05D0\u05D5 \u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD? \u05D0\u05D9\u05DA \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1-f\u2032\u2032(x) \u05DC\u05E1\u05D9\u05D5\u05D5\u05D2? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05E1\u05D9\u05D5\u05D5\u05D2", "f\u2032\u2032", "\u05E7\u05D9\u05E6\u05D5\u05DF"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E1\u05D9\u05D5\u05D5\u05D2 \u05D1\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05E0\u05D9\u05D9\u05D4", contextWords: ["\u05E1\u05D9\u05D5\u05D5\u05D2", "f\u2032\u2032", "\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05E0\u05D9\u05D9\u05D4", "\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D9\u05E6\u05D5\u05DF"] },
    ],
  },
  {
    id: "advanced",
    title: "\u05D7\u05E7\u05D9\u05E8\u05EA \u05E4\u05E8\u05DE\u05D8\u05E8",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 f(x) = ln(ax \u2212 4).\n\u05D9\u05D3\u05D5\u05E2 \u05E9\u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05E2\u05D5\u05D1\u05E8\u05EA \u05D1\u05E0\u05E7\u05D5\u05D3\u05D4 (3, 0).\n\n\u05D0. \u05DE\u05E6\u05D0 \u05D0\u05EA \u05E2\u05E8\u05DA \u05D4\u05E4\u05E8\u05DE\u05D8\u05E8 a.\n\u05D1. \u05DE\u05E6\u05D0 \u05D0\u05EA \u05EA\u05D7\u05D5\u05DD \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4 \u05D5\u05D4\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4.\n\u05D2. \u05D7\u05E9\u05D1 \u05D0\u05EA f\u2032(x) \u05D5\u05DE\u05E6\u05D0 \u05D0\u05EA \u05E9\u05D9\u05E4\u05D5\u05E2 \u05D4\u05DE\u05E9\u05D9\u05E7 \u05D1\u05E0\u05E7\u05D5\u05D3\u05D4 (3, 0).\n\u05D3. \u05E8\u05E9\u05D5\u05DD \u05D0\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05DE\u05E9\u05D9\u05E7 \u05D1\u05E0\u05E7\u05D5\u05D3\u05D4 \u05D6\u05D5.",
    diagram: <LnCurveAdvanced />,
    pitfalls: [
      { title: "\u05E9\u05D5\u05DB\u05D7\u05D9\u05DD \u05E9 ln(1) = 0 \u05D4\u05D5\u05D0 \u05D4\u05DE\u05E4\u05EA\u05D7 \u05DC\u05DE\u05E6\u05D9\u05D0\u05EA a", text: "\u05D0\u05DD \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05E2\u05D5\u05D1\u05E8\u05EA \u05D1-(3,0) \u05D0\u05D6 f(3)=0 \u05DB\u05DC\u05D5\u05DE\u05E8 ln(3a\u22124)=0, \u05DB\u05DC\u05D5\u05DE\u05E8 3a\u22124=1." },
      { title: "\u05DC\u05D0 \u05D1\u05D5\u05D3\u05E7\u05D9\u05DD \u05EA\u05D7\u05D5\u05DD \u05D0\u05D7\u05E8\u05D9 \u05DE\u05E6\u05D9\u05D0\u05EA a", text: "\u05D0\u05D7\u05E8\u05D9 \u05E9\u05DE\u05D5\u05E6\u05D0\u05D9\u05DD a, \u05D7\u05D9\u05D9\u05D1\u05D9\u05DD \u05DC\u05D5\u05D5\u05D3\u05D0 \u05E9\u05D4\u05EA\u05D7\u05D5\u05DD \u05D4\u05D5\u05D2\u05D3\u05E8 \u05DB-ax\u22124>0 \u05D5\u05DC\u05D1\u05D3\u05D5\u05E7 \u05E9\u05D4\u05E0\u05E7\u05D5\u05D3\u05D4 \u05D1\u05EA\u05D7\u05D5\u05DD." },
      { title: "\u05DE\u05D1\u05DC\u05D1\u05DC\u05D9\u05DD \u05D1\u05D9\u05DF \u05E9\u05D9\u05E4\u05D5\u05E2 \u05DC\u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05DE\u05E9\u05D9\u05E7", text: "\u05E9\u05D9\u05E4\u05D5\u05E2 = f\u2032(3). \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05DE\u05E9\u05D9\u05E7: y \u2212 f(3) = f\u2032(3)(x \u2212 3). \u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05E9-f(3)=0 \u05D1\u05DE\u05E7\u05E8\u05D4 \u05D4\u05D6\u05D4." },
    ],
    goldenPrompt: "",
    steps: [
      { phase: "\u05D0", label: "\u05E9\u05DC\u05D1 \u05D0\u2019 \u2014 \u05DE\u05E6\u05D0 \u05D0\u05EA a", coaching: "\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1-f(3)=0 \u05D5-ln(1)=0", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. f(x) = ln(ax \u2212 4) \u05E2\u05D5\u05D1\u05E8\u05EA \u05D1-(3,0). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05DD f(3)=0, \u05DE\u05D4 \u05D6\u05D4 \u05D0\u05D5\u05DE\u05E8 \u05E2\u05DC \u05D4\u05D1\u05D9\u05D8\u05D5\u05D9 \u05E9\u05D1\u05EA\u05D5\u05DA ln? \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD a? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05E4\u05E8\u05DE\u05D8\u05E8", "\u05D4\u05E6\u05D1\u05D4", "ln"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05E4\u05E8\u05DE\u05D8\u05E8", contextWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8", "\u05D4\u05E6\u05D1\u05D4", "ln", "\u05E0\u05E7\u05D5\u05D3\u05D4", "a", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4"] },
      { phase: "\u05D1", label: "\u05E9\u05DC\u05D1 \u05D1\u2019 \u2014 \u05EA\u05D7\u05D5\u05DD \u05D5\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4", coaching: "\u05D1\u05D3\u05D5\u05E7 ax\u22124>0 \u05E2\u05DD \u05D4-a \u05E9\u05DE\u05E6\u05D0\u05EA", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. \u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA a \u05E2\u05D1\u05D5\u05E8 f(x) = ln(ax \u2212 4). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05DE\u05D4 \u05EA\u05D7\u05D5\u05DD \u05D4\u05D4\u05D2\u05D3\u05E8\u05D4 \u05E2\u05DD a \u05E9\u05DE\u05E6\u05D0\u05EA\u05D9? \u05D0\u05D9\u05E4\u05D4 \u05D4\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05EA\u05D7\u05D5\u05DD", "\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4", "a"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05EA\u05D7\u05D5\u05DD \u05D5\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4", contextWords: ["\u05EA\u05D7\u05D5\u05DD", "\u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D4", "\u05D0\u05E0\u05DB\u05D9\u05EA", "a", "\u05D4\u05D2\u05D3\u05E8\u05D4", "\u05E4\u05E8\u05DE\u05D8\u05E8"] },
      { phase: "\u05D2", label: "\u05E9\u05DC\u05D1 \u05D2\u2019 \u2014 \u05E9\u05D9\u05E4\u05D5\u05E2 \u05D4\u05DE\u05E9\u05D9\u05E7", coaching: "\u05D2\u05D6\u05D5\u05E8 \u05D1\u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA \u05D5\u05D4\u05E6\u05D1", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. f(x) = ln(ax \u2212 4) \u05E2\u05DD a \u05E9\u05DE\u05E6\u05D0\u05EA\u05D9. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D7\u05E9\u05D1 f\u2032(x) \u05D1\u05DB\u05DC\u05DC \u05E9\u05E8\u05E9\u05E8\u05EA \u05D5\u05DC\u05D4\u05E6\u05D9\u05D1 x=3 \u05DC\u05DE\u05E6\u05D9\u05D0\u05EA \u05D4\u05E9\u05D9\u05E4\u05D5\u05E2. \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05E9\u05D9\u05E4\u05D5\u05E2", "\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E9\u05E8\u05E9\u05E8\u05EA"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05D9\u05E4\u05D5\u05E2 \u05D5\u05E0\u05D2\u05D6\u05E8\u05EA", contextWords: ["\u05E9\u05D9\u05E4\u05D5\u05E2", "\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E9\u05E8\u05E9\u05E8\u05EA", "\u05D4\u05E6\u05D1", "f\u2032", "\u05DE\u05E9\u05D9\u05E7"] },
      { phase: "\u05D3", label: "\u05E9\u05DC\u05D1 \u05D3\u2019 \u2014 \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05DE\u05E9\u05D9\u05E7", coaching: "\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1-y\u2212y\u2080=m(x\u2212x\u2080)", prompt: "\u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u2019. \u05D9\u05D3\u05D5\u05E2 f(3)=0 \u05D5\u05D4\u05E9\u05D9\u05E4\u05D5\u05E2 f\u2032(3). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05E8\u05E9\u05D5\u05DD \u05D0\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05DE\u05E9\u05D9\u05E7 \u05D1\u05E0\u05E7\u05D5\u05D3\u05D4 (3,0). \u05D0\u05D9\u05D6\u05D5 \u05E0\u05D5\u05E1\u05D7\u05D4 \u05DE\u05EA\u05D0\u05D9\u05DE\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.", keywords: ["\u05DE\u05E9\u05D9\u05E7", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D4"], keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05DE\u05E9\u05D9\u05E7", contextWords: ["\u05DE\u05E9\u05D9\u05E7", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D4", "\u05E9\u05D9\u05E4\u05D5\u05E2", "y", "\u05E0\u05D5\u05E1\u05D7\u05D4"] },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LnPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "22,163,74" : selectedLevel === "medium" ? "234,88,12" : "220,38,38";

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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D5\u05EA \u05DC\u05D5\u05D2\u05E8\u05D9\u05EA\u05DE\u05D9\u05D5\u05EA ln x \u05E2\u05DD AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>\u05EA\u05D7\u05D5\u05DD \u05D4\u05D2\u05D3\u05E8\u05D4 \u2022 \u05E0\u05D2\u05D6\u05E8\u05EA \u2022 \u05D7\u05E7\u05D9\u05E8\u05D4 \u2022 \u05D0\u05E1\u05D9\u05DE\u05E4\u05D8\u05D5\u05D8\u05D5\u05EA</p>
          </div>
          <Link href="/topic/grade12/calculus"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}>
            <span style={{ fontSize: 16 }}>{"\u2190"}</span>\u05D7\u05D6\u05E8\u05D4
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="grade12/calculus/ln" />

        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-slate-500 hover:text-slate-300"}`}
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

        <LnLab />

        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="grade12/calculus/ln" level={selectedLevel} />
        </div>
      </div>
    </main>
  );
}
