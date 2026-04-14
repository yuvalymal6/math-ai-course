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
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* 3D coordinate axes */}
      <line x1={130} y1={180} x2={130} y2={40} stroke="#94a3b8" strokeWidth={1.5} />
      <polygon points="130,35 126,45 134,45" fill="#94a3b8" />
      <text x={136} y={42} fontSize={11} fill="#64748b" fontFamily="sans-serif">z</text>

      <line x1={130} y1={180} x2={230} y2={180} stroke="#94a3b8" strokeWidth={1.5} />
      <polygon points="235,180 225,176 225,184" fill="#94a3b8" />
      <text x={237} y={184} fontSize={11} fill="#64748b" fontFamily="sans-serif">y</text>

      <line x1={130} y1={180} x2={60} y2={210} stroke="#94a3b8" strokeWidth={1.5} />
      <polygon points="55,212 65,214 62,206" fill="#94a3b8" />
      <text x={48} y={218} fontSize={11} fill="#64748b" fontFamily="sans-serif">x</text>

      {/* Points A, B, C */}
      <circle cx={90} cy={195} r={4} fill="#f59e0b" />
      <text x={78} y={205} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">A</text>

      <circle cx={180} cy={180} r={4} fill="#f59e0b" />
      <text x={184} y={175} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">B</text>

      <circle cx={130} cy={90} r={4} fill="#f59e0b" />
      <text x={136} y={86} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">C</text>

      {/* Vectors AB and AC */}
      <line x1={90} y1={195} x2={180} y2={180} stroke="#34d399" strokeWidth={2} markerEnd="url(#arrowGreen)" />
      <line x1={90} y1={195} x2={130} y2={90} stroke="#a78bfa" strokeWidth={2} markerEnd="url(#arrowViolet)" />

      <defs>
        <marker id="arrowGreen" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
          <polygon points="0,0 8,3 0,6" fill="#34d399" />
        </marker>
        <marker id="arrowViolet" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
          <polygon points="0,0 8,3 0,6" fill="#a78bfa" />
        </marker>
      </defs>

      {/* Labels for vectors */}
      <text x={140} y={200} fontSize={10} fill="#34d399" fontWeight={600} fontFamily="sans-serif">AB</text>
      <text x={95} y={140} fontSize={10} fill="#a78bfa" fontWeight={600} fontFamily="sans-serif">AC</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 240" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Square base ABCD */}
      <polygon points="70,190 190,190 210,160 90,160" fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      {/* Hidden edges (dashed) */}
      <line x1={90} y1={160} x2={70} y2={190} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />

      {/* Apex S */}
      <line x1={140} y1={50} x2={70} y2={190} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={140} y1={50} x2={190} y2={190} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={140} y1={50} x2={210} y2={160} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={140} y1={50} x2={90} y2={160} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />

      {/* Height SO (dashed, violet) */}
      <line x1={140} y1={50} x2={140} y2={175} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,3" />

      {/* Center O mark */}
      <circle cx={140} cy={175} r={3} fill="#a78bfa" />

      {/* Base diagonal hints (faint) */}
      <line x1={70} y1={190} x2={210} y2={160} stroke="#64748b" strokeWidth={0.8} strokeDasharray="3,3" />
      <line x1={190} y1={190} x2={90} y2={160} stroke="#64748b" strokeWidth={0.8} strokeDasharray="3,3" />

      {/* Labels */}
      <text x={55} y={198} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={192} y={200} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={214} y={158} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">C</text>
      <text x={76} y={155} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={144} y={45} fontSize={12} fill="#34d399" fontWeight={700} fontFamily="sans-serif">S</text>
      <text x={145} y={185} fontSize={11} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">O</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Plane (parallelogram) */}
      <polygon points="30,160 120,190 250,150 160,120" fill="rgba(148,163,184,0.1)" stroke="#94a3b8" strokeWidth={1.5} />

      {/* Normal vector arrow from plane center */}
      <line x1={140} y1={155} x2={140} y2={60} stroke="#34d399" strokeWidth={2} markerEnd="url(#arrowN)" />
      <text x={146} y={55} fontSize={11} fill="#34d399" fontWeight={700} fontFamily="sans-serif">n</text>

      {/* Point P above plane */}
      <circle cx={200} cy={50} r={4} fill="#f59e0b" />
      <text x={207} y={48} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">P</text>

      {/* Perpendicular from P to plane (dashed violet) */}
      <line x1={200} y1={50} x2={200} y2={142} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,3" />
      <circle cx={200} cy={142} r={3} fill="#a78bfa" />
      <text x={206} y={150} fontSize={10} fill="#a78bfa" fontWeight={600} fontFamily="sans-serif">H</text>

      {/* Right angle mark at foot */}
      <polyline points="194,142 194,136 200,136" fill="none" stroke="#a78bfa" strokeWidth={1} />

      {/* Distance label */}
      <text x={205} y={98} fontSize={10} fill="#a78bfa" fontWeight={600} fontFamily="sans-serif">d</text>

      <defs>
        <marker id="arrowN" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
          <polygon points="0,0 8,3 0,6" fill="#34d399" />
        </marker>
      </defs>
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

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

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
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
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
        subjectWords={["וקטור", "מכפלה סקלרית", "מכפלה וקטורית", "מישור", "נורמל", "זווית"]}
      />
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
    title: "וקטורים בסיסיים במרחב",
    problem: "נתונות שלוש נקודות במרחב: A(1,0,0), B(0,1,0), C(0,0,1).\n\nא. מצאו את הוקטורים AB ו-AC.\nב. חשבו את |AB| ואת |AC| (אורכי הוקטורים).\nג. חשבו את המכפלה הסקלרית AB·AC ומצאו את הזווית בין שני הוקטורים.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "חיסור קואורדינטות בסדר הפוך", text: "כדי למצוא וקטור AB צריך לחסר: B - A (נקודת הסיום פחות נקודת ההתחלה). תלמידים רבים מחסרים A - B וזו טעות שהופכת את הכיוון!" },
      { title: "שכחת שלב ה-arccos", text: "המכפלה הסקלרית נותנת ערך מספרי. כדי לקבל זווית, צריך לחלק ב-|u||v| ולהפעיל arccos. תלמידים רבים עוצרים אחרי המכפלה הסקלרית ושוכחים את השלב האחרון." },
      { title: "טעות בחישוב אורך וקטור", text: "אורך וקטור (a,b,c) הוא שורש של a²+b²+c². אל תשכחו את השורש! ואל תשכחו לחבר את שלושת הריבועים — לא רק שניים." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב', 5 יחידות, ומצרף/ת שאלה בוקטורים במרחב. הנקודות הן A(1,0,0), B(0,1,0), C(0,0,1). צריך למצוא וקטורים, אורכים, מכפלה סקלרית וזווית.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת וקטורים AB ו-AC", coaching: "", prompt: "נתונות נקודות A(1,0,0), B(0,1,0), C(0,0,1). תנחה אותי כיצד מוצאים וקטור AB — מחסרים קואורדינטות של נקודת הסיום מנקודת ההתחלה. אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["וקטור", "חיסור", "קואורדינטות", "נקודה", "כיוון", "AB"] },
      { phase: "סעיף ב׳", label: "חישוב אורכי הוקטורים", coaching: "", prompt: "נתונות נקודות A(1,0,0), B(0,1,0), C(0,0,1). מצאתי את הוקטורים AB ו-AC. תדריך אותי כיצד מחשבים אורך וקטור במרחב — שורש סכום ריבועי הרכיבים.", keywords: [], keywordHint: "", contextWords: ["אורך", "וקטור", "שורש", "ריבוע", "רכיבים", "גודל"] },
      { phase: "סעיף ג׳", label: "מכפלה סקלרית וזווית", coaching: "", prompt: "נתונות נקודות A(1,0,0), B(0,1,0), C(0,0,1). תכווין אותי לחשב את המכפלה הסקלרית AB·AC ואז להשתמש בנוסחה עם cos כדי למצוא את הזווית.", keywords: [], keywordHint: "", contextWords: ["מכפלה סקלרית", "cosinus", "זווית", "arccos", "נוסחה", "מכפלה"] },
    ],
  },
  {
    id: "medium",
    title: "פירמידה — גובה ונפח",
    problem: "נתונה פירמידה ABCDS עם בסיס ריבועי ABCD וקודקוד S שנמצא ישירות מעל מרכז הבסיס O.\n\nא. בטאו את הוקטור SO באמצעות נקודת אמצע האלכסונים של הבסיס.\nב. הוכיחו כי SO ניצב ל-AB באמצעות מכפלה סקלרית (הראו ש-SO·AB = 0).\nג. חשבו את נפח הפירמידה: V = ⅓ · שטח בסיס · גובה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "בלבול בין גובה אמיתי לגובה משופע", text: "הגובה של הפירמידה הוא המרחק האנכי ממרכז הבסיס לקודקוד (SO). גובה משופע הוא המרחק מנקודה על הצלע לקודקוד — זה לא אותו הדבר! בנוסחת הנפח משתמשים בגובה האנכי בלבד." },
      { title: "נוסחת הנפח: שליש ולא חצי", text: "נפח פירמידה הוא V = ⅓ · שטח בסיס · גובה. תלמידים רבים כותבים ½ כמו בשטח משולש — וזו טעות! ⅓ ולא ½." },
      { title: "שכחת הוכחת ניצבות", text: "כדי להוכיח שוקטור ניצב לוקטור אחר, צריך להראות שהמכפלה הסקלרית שלהם שווה 0. לא מספיק לומר שהוא 'נראה מאונך' — צריך חישוב!" },
    ],
    goldenPrompt: `אני בכיתה יב', 5 יחידות, מצרף/ת תרגיל בוקטורים במרחב — פירמידה עם בסיס ריבועי. צריך לבטא את וקטור הגובה, להוכיח ניצבות ולחשב נפח.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על וקטורים, מכפלה סקלרית וניצבות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "ביטוי וקטור SO", coaching: "", prompt: "נתונה פירמידה עם בסיס ריבועי ABCD וקודקוד S מעל מרכז הבסיס O. תנחה אותי כיצד מוצאים את נקודת מרכז הבסיס O (חיתוך אלכסונים) ומבטאים את הוקטור SO.", keywords: [], keywordHint: "", contextWords: ["וקטור", "מרכז", "אלכסון", "נקודה", "חיסור", "SO"] },
      { phase: "סעיף ב׳", label: "הוכחת ניצבות SO ⊥ AB", coaching: "", prompt: "נתונה פירמידה ABCDS. מצאתי את SO. תדריך אותי להוכיח ש-SO ניצב ל-AB — דרך מכפלה סקלרית ששווה לאפס.", keywords: [], keywordHint: "", contextWords: ["מכפלה סקלרית", "ניצב", "אפס", "הוכחה", "AB", "SO"] },
      { phase: "סעיף ג׳", label: "חישוב נפח הפירמידה", coaching: "", prompt: "נתונה פירמידה עם בסיס ריבועי וגובה SO. תכווין אותי לחשב את הנפח — V = ⅓ · שטח בסיס · גובה. איך מוצאים את שטח הבסיס ואת הגובה?", keywords: [], keywordHint: "", contextWords: ["נפח", "שטח", "בסיס", "גובה", "שליש", "פירמידה"] },
    ],
  },
  {
    id: "advanced",
    title: "זווית בין מישורים ומרחק נקודה ממישור",
    problem: "נתון מישור ונקודה P שאינה על המישור.\n\nא. מצאו את הוקטור הנורמלי למישור באמצעות מכפלה וקטורית של שני וקטורים במישור.\nב. חשבו את הזווית בין שני מישורים באמצעות הוקטורים הנורמליים שלהם.\nג. מצאו את המרחק מנקודה P למישור.\nד. מצאו את רגל האנך מנקודה P למישור.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "כיוון המכפלה הוקטורית", text: "u x v ≠ v x u — המכפלה הוקטורית אינה חילופית! כיוון הנורמל מתהפך אם מחליפים את סדר הוקטורים. שימו לב לסדר הנכון בנוסחה." },
      { title: "שכחת ערך מוחלט במרחק", text: "בנוסחת המרחק מנקודה למישור יש ערך מוחלט במונה: d = |ax₀+by₀+cz₀+d| / √(a²+b²+c²). בלי הערך המוחלט, המרחק עלול לצאת שלילי — וזה חסר משמעות!" },
      { title: "בלבול בין זווית חדה לקהה", text: "הזווית בין שני מישורים היא תמיד חדה (בין 0° ל-90°). אם ה-arccos נותן זווית קהה, צריך לקחת את המשלים שלה ל-180°." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מוצאים נורמל למישור, מחשבים מרחק נקודה ממישור, ומוצאים זווית בין מישורים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת נורמל למישור", coaching: "", prompt: "נתונים שני וקטורים במישור. תנחה אותי כיצד מחשבים מכפלה וקטורית כדי למצוא את הוקטור הנורמלי למישור.", keywords: [], keywordHint: "", contextWords: ["מכפלה וקטורית", "נורמל", "מישור", "וקטור", "ניצב", "רכיבים"] },
      { phase: "סעיף ב׳", label: "זווית בין מישורים", coaching: "", prompt: "נתונים שני מישורים עם נורמלים. תדריך אותי לחשב את הזווית בין המישורים באמצעות מכפלה סקלרית של הנורמלים.", keywords: [], keywordHint: "", contextWords: ["זווית", "נורמל", "מכפלה סקלרית", "cosinus", "arccos", "מישורים"] },
      { phase: "סעיף ג׳", label: "מרחק נקודה ממישור", coaching: "", prompt: "נתון מישור ax+by+cz+d=0 ונקודה P. תכווין אותי להשתמש בנוסחת המרחק של נקודה ממישור — עם ערך מוחלט ושורש.", keywords: [], keywordHint: "", contextWords: ["מרחק", "נקודה", "מישור", "נוסחה", "ערך מוחלט", "שורש"] },
      { phase: "סעיף ד׳", label: "רגל האנך למישור", coaching: "", prompt: "נתונה נקודה P ומישור. תנחה אותי למצוא את רגל האנך — נקודת ההטלה של P על המישור, באמצעות הנורמל והמרחק.", keywords: [], keywordHint: "", contextWords: ["רגל אנך", "הטלה", "נורמל", "נקודה", "מישור", "פרמטר"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>וקטורים במרחב — פירמידה (Vectors in Space — Pyramid)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "וקטורים בסיסיים — חיסור נקודות, אורך וקטור, מכפלה סקלרית, וזווית בין וקטורים."}
            {ex.id === "medium" && "פירמידה עם בסיס ריבועי — ביטוי וקטור הגובה, הוכחת ניצבות, וחישוב נפח."}
            {ex.id === "advanced" && "מכפלה וקטורית, נורמל למישור, זווית בין מישורים, ומרחק נקודה ממישור."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: Vectors basics */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>נוסחאות מרכזיות</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>וקטור</span>
              <span>AB = B - A (חיסור קואורדינטות)</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מכפלה סקלרית</span>
              <span>u·v = u₁v₁ + u₂v₂ + u₃v₃ = |u||v|cos θ</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>אורך</span>
              <span>|v| = √(v₁² + v₂² + v₃²)</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>פירמידה ומישורים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>נפח פירמידה</span>
                  <span>V = ⅓ · שטח בסיס · גובה</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>ניצבות</span>
                  <span>u ⊥ v אם ורק אם u·v = 0</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>מישורים ונורמלים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מכפלה וקטורית</span>
                  <span>u×v = נורמל למישור שנפרש ע״י u ו-v</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 100 }}>מרחק</span>
                  <span>d = |ax₀+by₀+cz₀+d| / √(a²+b²+c²)</span>
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
        {ex.id === "basic"  && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── DotProductLab (basic) ──────────────────────────────────────────────────

function DotProductLab() {
  const [u1, setU1] = useState(3);
  const [u2, setU2] = useState(1);
  const [v1, setV1] = useState(1);
  const [v2, setV2] = useState(3);
  const st = STATION.basic;

  const dot = u1 * v1 + u2 * v2;
  const magU = Math.sqrt(u1 * u1 + u2 * u2);
  const magV = Math.sqrt(v1 * v1 + v2 * v2);
  const cosAngle = magU > 0 && magV > 0 ? dot / (magU * magV) : 0;
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

  const scale = 18;
  const cx = 140, cy = 130;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מכפלה סקלרית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את רכיבי הוקטורים u ו-v וצפו כיצד המכפלה הסקלרית והזווית משתנות בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "u₁", val: u1, set: setU1, min: -5, max: 5 },
          { label: "u₂", val: u2, set: setU2, min: -5, max: 5 },
          { label: "v₁", val: v1, set: setV1, min: -5, max: 5 },
          { label: "v₂", val: v2, set: setV2, min: -5, max: 5 },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 220" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Grid lines */}
          <line x1={cx} y1={20} x2={cx} y2={210} stroke="#e2e8f0" strokeWidth={0.5} />
          <line x1={20} y1={cy} x2={260} y2={cy} stroke="#e2e8f0" strokeWidth={0.5} />

          {/* Axes */}
          <line x1={cx} y1={20} x2={cx} y2={210} stroke="#94a3b8" strokeWidth={1} />
          <line x1={20} y1={cy} x2={260} y2={cy} stroke="#94a3b8" strokeWidth={1} />

          {/* Vector u (green) */}
          <line x1={cx} y1={cy} x2={cx + u1 * scale} y2={cy - u2 * scale} stroke="#16A34A" strokeWidth={2.5} markerEnd="url(#arrowU)" />
          <text x={cx + u1 * scale + (u1 >= 0 ? 6 : -14)} y={cy - u2 * scale - 6} fontSize={11} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">u</text>

          {/* Vector v (violet) */}
          <line x1={cx} y1={cy} x2={cx + v1 * scale} y2={cy - v2 * scale} stroke="#a78bfa" strokeWidth={2.5} markerEnd="url(#arrowV)" />
          <text x={cx + v1 * scale + (v1 >= 0 ? 6 : -14)} y={cy - v2 * scale - 6} fontSize={11} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">v</text>

          {/* Angle arc */}
          {magU > 0 && magV > 0 && (
            <path
              d={(() => {
                const r = 30;
                const a1 = Math.atan2(-u2, u1);
                const a2 = Math.atan2(-v2, v1);
                const startX = cx + r * Math.cos(a1);
                const startY = cy + r * Math.sin(a1);
                const endX = cx + r * Math.cos(a2);
                const endY = cy + r * Math.sin(a2);
                const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
                const sweep = (a2 - a1 + 2 * Math.PI) % (2 * Math.PI) > Math.PI ? 0 : 1;
                return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} ${sweep} ${endX} ${endY}`;
              })()}
              fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={0.7}
            />
          )}

          <defs>
            <marker id="arrowU" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
              <polygon points="0,0 8,3 0,6" fill="#16A34A" />
            </marker>
            <marker id="arrowV" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
              <polygon points="0,0 8,3 0,6" fill="#a78bfa" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "u · v", val: dot.toFixed(1) },
          { label: "|u|", val: magU.toFixed(2) },
          { label: "|v|", val: magV.toFixed(2) },
          { label: "זווית (°)", val: isNaN(angle) ? "—" : angle.toFixed(1) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כשהמכפלה הסקלרית = 0, הוקטורים ניצבים (90°). מכפלה שלילית = זווית קהה.</p>
    </section>
  );
}

// ─── PyramidLab (medium) ────────────────────────────────────────────────────

function PyramidLab() {
  const [side, setSide] = useState(6);
  const [height, setHeight] = useState(8);
  const st = STATION.medium;

  const baseArea = side * side;
  const volume = (1 / 3) * baseArea * height;
  const halfDiag = (side * Math.sqrt(2)) / 2;
  const slantH = Math.sqrt(height * height + (side / 2) * (side / 2));

  // Isometric-ish pyramid drawing
  const svgW = 260, svgH = 220;
  const bx = svgW / 2, by = 190;
  const s2 = side * 6; // scale for display
  const h2 = height * 8;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת פירמידה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את צלע הבסיס ואת הגובה — וצפו כיצד הנפח משתנה.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "צלע בסיס (a)", val: side, set: setSide, min: 1, max: 12 },
          { label: "גובה (h)", val: height, set: setHeight, min: 1, max: 15 },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={0.5} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 220" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Base quadrilateral (isometric) */}
          {(() => {
            const hs = Math.min(s2, 50);
            const A = { x: bx - hs, y: by };
            const B = { x: bx + hs, y: by };
            const C = { x: bx + hs * 0.6, y: by - hs * 0.5 };
            const D = { x: bx - hs * 0.6, y: by - hs * 0.5 };
            const hDisp = Math.min(h2, 130);
            const S = { x: bx, y: by - hs * 0.25 - hDisp };
            const O = { x: bx, y: by - hs * 0.25 };
            return (
              <>
                {/* Base */}
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#94a3b8" strokeWidth={1.5} />
                <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="#94a3b8" strokeWidth={1.5} />
                <line x1={C.x} y1={C.y} x2={D.x} y2={D.y} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
                <line x1={D.x} y1={D.y} x2={A.x} y2={A.y} stroke="#94a3b8" strokeWidth={1.5} />

                {/* Edges to apex */}
                <line x1={A.x} y1={A.y} x2={S.x} y2={S.y} stroke="#94a3b8" strokeWidth={1.5} />
                <line x1={B.x} y1={B.y} x2={S.x} y2={S.y} stroke="#94a3b8" strokeWidth={1.5} />
                <line x1={C.x} y1={C.y} x2={S.x} y2={S.y} stroke="#94a3b8" strokeWidth={1.5} />
                <line x1={D.x} y1={D.y} x2={S.x} y2={S.y} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />

                {/* Height SO */}
                <line x1={S.x} y1={S.y} x2={O.x} y2={O.y} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,3" />
                <circle cx={O.x} cy={O.y} r={2.5} fill="#a78bfa" />

                {/* Labels */}
                <text x={A.x - 12} y={A.y + 12} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">A</text>
                <text x={B.x + 4} y={B.y + 12} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">B</text>
                <text x={C.x + 4} y={C.y - 4} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">C</text>
                <text x={D.x - 12} y={D.y - 4} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">D</text>
                <text x={S.x + 6} y={S.y - 4} fontSize={11} fill="#34d399" fontWeight={700} fontFamily="sans-serif">S</text>
                <text x={O.x + 6} y={O.y + 4} fontSize={10} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">O</text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "שטח בסיס", val: baseArea.toFixed(1) },
          { label: "נפח (V)", val: volume.toFixed(1) },
          { label: "גובה משופע", val: slantH.toFixed(2) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>נפח = ⅓ ולא ½! שימו לב להבדל בין גובה אנכי לגובה משופע.</p>
    </section>
  );
}

// ─── PlaneDistanceLab (advanced) ────────────────────────────────────────────

function PlaneDistanceLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const [c, setC] = useState(2);
  const st = STATION.advanced;

  // Fixed point P and plane d constant
  const px = 3, py = 4, pz = 5;
  const d = -6;

  const normalMag = Math.sqrt(a * a + b * b + c * c);
  const dist = normalMag > 0 ? Math.abs(a * px + b * py + c * pz + d) / normalMag : 0;

  // Foot of perpendicular
  const t = normalMag > 0 ? (a * px + b * py + c * pz + d) / (normalMag * normalMag) : 0;
  const footX = px - a * t;
  const footY = py - b * t;
  const footZ = pz - c * t;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מרחק נקודה ממישור</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את רכיבי הנורמל (a,b,c) — הנקודה P(3,4,5) והמישור d=-6 קבועים. צפו כיצד המרחק ורגל האנך משתנים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {[
          { label: "a (נורמל x)", val: a, set: setA },
          { label: "b (נורמל y)", val: b, set: setB },
          { label: "c (נורמל z)", val: c, set: setC },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{s.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span>
            </div>
            <input type="range" min={-5} max={5} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 200" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Plane (parallelogram) */}
          <polygon points="30,140 130,165 250,130 150,105" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" strokeWidth={1.5} />

          {/* Normal arrow from center of plane */}
          {(() => {
            const pcx = 140, pcy = 135;
            const nLen = normalMag > 0 ? 40 : 0;
            const nx = a / (normalMag || 1);
            const ny = c / (normalMag || 1); // map c to vertical for 2D display
            return (
              <line x1={pcx} y1={pcy} x2={pcx + nx * 15} y2={pcy - nLen} stroke="#34d399" strokeWidth={2} markerEnd="url(#arrNorm)" />
            );
          })()}

          {/* Point P */}
          <circle cx={200} cy={45} r={4} fill="#f59e0b" />
          <text x={207} y={43} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">P</text>

          {/* Perpendicular from P to plane */}
          <line x1={200} y1={45} x2={200} y2={128} stroke="#a78bfa" strokeWidth={2} strokeDasharray="6,3" />
          <circle cx={200} cy={128} r={3} fill="#a78bfa" />
          <text x={206} y={138} fontSize={10} fill="#a78bfa" fontWeight={600} fontFamily="sans-serif">H</text>

          {/* Right angle mark */}
          <polyline points="194,128 194,122 200,122" fill="none" stroke="#a78bfa" strokeWidth={1} />

          {/* Distance label */}
          <text x={204} y={88} fontSize={10} fill="#a78bfa" fontWeight={600} fontFamily="sans-serif">d</text>

          <text x={140} y={155} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">n = ({a},{b},{c})</text>

          <defs>
            <marker id="arrNorm" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
              <polygon points="0,0 8,3 0,6" fill="#34d399" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "נורמל |n|", val: normalMag.toFixed(2) },
          { label: "מרחק d", val: dist.toFixed(2) },
          { label: "רגל אנך H", val: `(${footX.toFixed(1)}, ${footY.toFixed(1)}, ${footZ.toFixed(1)})` },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: row.label === "רגל אנך H" ? 13 : 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שנו את כיוון הנורמל וצפו כיצד המרחק ונקודת ההטלה משתנים. כשהנורמל = (0,0,0), אין מישור מוגדר!</p>
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
  const [activeTab, setActiveTab] = useState<"dot" | "cross" | "dist" | null>(null);

  const tabs = [
    { id: "dot" as const, label: "מכפלה סקלרית", tex: "\\vec{u} \\cdot \\vec{v}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "cross" as const, label: "מכפלה וקטורית", tex: "\\vec{u} \\times \\vec{v}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "dist" as const, label: "מרחק נקודה ממישור", tex: "d", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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
              <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {/* Expanded: Dot Product */}
      {activeTab === "dot" && (
        <motion.div key="dot" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\vec{u} \\cdot \\vec{v} = |\\vec{u}||\\vec{v}|\\cos\\theta = u_1v_1 + u_2v_2 + u_3v_3"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מכפילים רכיב-רכיב: <InlineMath>{"u_1 \\cdot v_1"}</InlineMath>, <InlineMath>{"u_2 \\cdot v_2"}</InlineMath>, <InlineMath>{"u_3 \\cdot v_3"}</InlineMath>.</li>
                  <li>סוכמים את שלושת המכפלות.</li>
                  <li>לזווית: <InlineMath>{"\\cos\\theta = \\frac{\\vec{u} \\cdot \\vec{v}}{|\\vec{u}||\\vec{v}|}"}</InlineMath> ואז <InlineMath>{"\\theta = \\arccos(\\ldots)"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                תזכורת: אם u·v = 0 → הוקטורים ניצבים (90°)
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Cross Product */}
      {activeTab === "cross" && (
        <motion.div key="cross" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\vec{u} \\times \\vec{v} = (u_2v_3 - u_3v_2,\\; u_3v_1 - u_1v_3,\\; u_1v_2 - u_2v_1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה זה נותן?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>וקטור חדש שניצב לשני הוקטורים המקוריים.</li>
                  <li>הוקטור הזה הוא הנורמל למישור שנפרש ע״י u ו-v.</li>
                  <li>אורכו = שטח המקבילית שנפרשת ע״י u ו-v.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                זכרו: u×v ≠ v×u — הסדר חשוב! (הכיוון מתהפך)
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Distance */}
      {activeTab === "dist" && (
        <motion.div key="dist" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"d = \\frac{|ax_0 + by_0 + cz_0 + d|}{\\sqrt{a^2 + b^2 + c^2}}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך משתמשים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>משוואת המישור: <InlineMath>{"ax + by + cz + d = 0"}</InlineMath>.</li>
                  <li>הנקודה: <InlineMath>{"P(x_0, y_0, z_0)"}</InlineMath>.</li>
                  <li>מציבים במונה (עם ערך מוחלט!) ומחלקים באורך הנורמל.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                חשוב: אל תשכחו את הערך המוחלט במונה — מרחק הוא תמיד חיובי!
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PyramidSpacePage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>וקטורים במרחב — פירמידה עם AI — כיתה יב׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>וקטורים בסיסיים, פירמידה, נורמל למישור, מרחק נקודה ממישור — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade12/vectors"
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

        <SubtopicProgress subtopicId="5u/grade12/vectors/pyramid-space" />

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
        {selectedLevel === "basic" && <DotProductLab />}
        {selectedLevel === "medium" && <PyramidLab />}
        {selectedLevel === "advanced" && <PlaneDistanceLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade12/vectors/pyramid-space" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
