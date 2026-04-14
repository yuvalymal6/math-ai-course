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
  // 30-60-90 and 45-45-90 triangles side by side, no numbers
  return (
    <svg viewBox="0 0 340 160" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* 30-60-90 triangle */}
      <polygon points="30,140 130,140 130,40" fill="none" stroke="#94a3b8" strokeWidth={1.8} />
      <rect x={124} y={134} width={6} height={6} fill="none" stroke="#94a3b8" strokeWidth={1} />
      {/* angle arcs */}
      <path d="M 50,140 A 20,20 0 0,0 42,125" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={56} y={133} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?</text>
      <path d="M 130,60 A 20,20 0 0,1 115,68" fill="none" stroke="#a78bfa" strokeWidth={1.5} />
      <text x={112} y={60} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">?</text>
      {/* side labels */}
      <text x={78} y={155} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={137} y={95} fontSize={9} fill="#64748b" textAnchor="start" fontFamily="sans-serif">?</text>
      <text x={68} y={85} fontSize={9} fill="#64748b" textAnchor="end" fontFamily="sans-serif">?</text>
      <text x={80} y={20} fontSize={11} fill="#94a3b8" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">30-60-90</text>

      {/* 45-45-90 triangle */}
      <polygon points="200,140 300,140 300,40" fill="none" stroke="#94a3b8" strokeWidth={1.8} />
      <rect x={294} y={134} width={6} height={6} fill="none" stroke="#94a3b8" strokeWidth={1} />
      {/* angle arcs */}
      <path d="M 220,140 A 20,20 0 0,0 212,125" fill="none" stroke="#34d399" strokeWidth={1.5} />
      <text x={226} y={133} fontSize={10} fill="#34d399" fontFamily="sans-serif">?</text>
      <path d="M 300,60 A 20,20 0 0,1 285,68" fill="none" stroke="#34d399" strokeWidth={1.5} />
      <text x={282} y={60} fontSize={10} fill="#34d399" fontFamily="sans-serif">?</text>
      {/* side labels */}
      <text x={248} y={155} fontSize={9} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={307} y={95} fontSize={9} fill="#64748b" textAnchor="start" fontFamily="sans-serif">?</text>
      <text x={238} y={85} fontSize={9} fill="#64748b" textAnchor="end" fontFamily="sans-serif">?</text>
      <text x={250} y={20} fontSize={11} fill="#94a3b8" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">45-45-90</text>
    </svg>
  );
}

function MediumSVG() {
  // Right triangle with both acute angles marked alpha and 90-alpha
  return (
    <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points="40,150 220,150 220,40" fill="none" stroke="#94a3b8" strokeWidth={1.8} />
      <rect x={214} y={144} width={6} height={6} fill="none" stroke="#94a3b8" strokeWidth={1} />
      {/* angle alpha at bottom-left */}
      <path d="M 65,150 A 25,25 0 0,0 55,132" fill="none" stroke="#EA580C" strokeWidth={2} />
      <text x={72} y={140} fontSize={12} fill="#EA580C" fontWeight={700} fontFamily="sans-serif" fontStyle="italic">{"\u03B1"}</text>
      {/* angle 90-alpha at top-right */}
      <path d="M 220,65 A 25,25 0 0,1 202,72" fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={190} y={62} fontSize={10} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">90-{"\u03B1"}</text>
      {/* right angle mark */}
      <text x={230} y={155} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">90°</text>
      {/* side labels — no numbers */}
      <text x={130} y={168} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="sans-serif" fontStyle="italic">a</text>
      <text x={230} y={100} fontSize={11} fill="#64748b" textAnchor="start" fontFamily="sans-serif" fontStyle="italic">b</text>
      <text x={118} y={88} fontSize={11} fill="#64748b" textAnchor="end" fontFamily="sans-serif" fontStyle="italic">c</text>
      {/* vertex labels */}
      <text x={30} y={158} fontSize={11} fill="#94a3b8" fontWeight={600} fontFamily="sans-serif">A</text>
      <text x={224} y={158} fontSize={11} fill="#94a3b8" fontWeight={600} fontFamily="sans-serif">B</text>
      <text x={224} y={35} fontSize={11} fill="#94a3b8" fontWeight={600} fontFamily="sans-serif">C</text>
    </svg>
  );
}

function AdvancedSVG() {
  // Unit circle outline with quadrant labels and ? markers
  const cx = 140, cy = 130, r = 90;
  return (
    <svg viewBox="0 0 280 260" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={cx - r - 20} y1={cy} x2={cx + r + 20} y2={cy} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={cx} y1={cy - r - 20} x2={cx} y2={cy + r + 20} stroke="#94a3b8" strokeWidth={1.2} />
      {/* Circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#DC2626" strokeWidth={1.8} opacity={0.5} />
      {/* Quadrant labels */}
      <text x={cx + 45} y={cy - 45} fontSize={14} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">I</text>
      <text x={cx - 45} y={cy - 45} fontSize={14} fill="#a78bfa" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">II</text>
      <text x={cx - 45} y={cy + 55} fontSize={14} fill="#64748b" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">III</text>
      <text x={cx + 45} y={cy + 55} fontSize={14} fill="#f59e0b" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">IV</text>
      {/* ? markers at special positions */}
      <circle cx={cx + r} cy={cy} r={3} fill="#DC2626" />
      <text x={cx + r + 8} y={cy - 5} fontSize={10} fill="#DC2626" fontFamily="sans-serif">?</text>
      <circle cx={cx} cy={cy - r} r={3} fill="#a78bfa" />
      <text x={cx + 8} y={cy - r - 5} fontSize={10} fill="#a78bfa" fontFamily="sans-serif">?</text>
      <circle cx={cx - r} cy={cy} r={3} fill="#64748b" />
      <text x={cx - r - 12} y={cy - 5} fontSize={10} fill="#64748b" fontFamily="sans-serif">?</text>
      <circle cx={cx} cy={cy + r} r={3} fill="#f59e0b" />
      <text x={cx + 8} y={cy + r + 12} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* Axis labels */}
      <text x={cx + r + 18} y={cy + 15} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">0°</text>
      <text x={cx + 5} y={cy - r - 8} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">90°</text>
      <text x={cx - r - 28} y={cy + 15} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">180°</text>
      <text x={cx + 5} y={cy + r + 18} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">270°</text>
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
        subjectWords={["סינוס", "קוסינוס", "טנגנס", "זווית", "משוואה", "משלימות"]}
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
    title: "זוויות מיוחדות — 30°, 45°, 60°",
    problem: "א. חשבו את sin 30°, cos 30°, tan 30° בעזרת המשולש 30-60-90.\nב. חשבו את sin 45°, cos 45°, tan 45° בעזרת המשולש 45-45-90.\nג. וודאו: sin²30° + cos²30° = 1.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "בלבול בין sin 30° ל-cos 30°", text: "sin 30° = ½ ו-cos 30° = √3/2. תלמידים רבים מחליפים ביניהם! זכרו: sin = ניצב מול הזווית חלקי יתר, cos = ניצב צמוד חלקי יתר. במשולש 30-60-90 הצלע הקצרה ביותר מול הזווית הקטנה ביותר." },
      { title: "שוכחים ש-tan = sin/cos", text: "אין צורך לזכור את ערכי הטנגנס בנפרד! tan α = sin α / cos α תמיד. למשל: tan 30° = sin 30° / cos 30° = (½)/(√3/2) = 1/√3." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 5 יחידות, ומצרף/ת שאלה בטריגונומטריה על ערכי סינוס, קוסינוס וטנגנס בזוויות מיוחדות. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "ערכי 30° מהמשולש 30-60-90", coaching: "", prompt: "במשולש ישר זווית עם זוויות 30° ו-60°, תנחה אותי לגזור את sin 30°, cos 30° ו-tan 30° מתוך יחסי הצלעות.", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "30", "משולש", "ניצב", "יתר", "צלע"] },
      { phase: "סעיף ב׳", label: "ערכי 45° מהמשולש 45-45-90", coaching: "", prompt: "במשולש ישר זווית שווה שוקיים (45-45-90), תסביר לי כיצד מחשבים sin 45°, cos 45° ו-tan 45° מתוך יחסי הצלעות.", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "45", "שווה", "שוקיים", "יתר", "צלע"] },
      { phase: "סעיף ג׳", label: "אימות הזהות sin²+cos²=1", coaching: "", prompt: "תכווין אותי לחשב sin²30° + cos²30° ולהראות שהתוצאה שווה 1. למה זה תמיד עובד?", keywords: [], keywordHint: "", contextWords: ["sin²", "cos²", "זהות", "פיתגורס", "1", "הוכחה"] },
    ],
  },
  {
    id: "medium",
    title: "זוויות משלימות ל-90°",
    problem: "א. הוכיחו שמתקיים sin α = cos(90°−α).\nב. נתון sin 37° = 0.6. מצאו את cos 53° ללא מחשבון.\nג. פשטו: sin²α + cos²α לכל זווית (הוכיחו באמצעות משפט פיתגורס שהתוצאה שווה 1).",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "בלבול בין משלימות (90°) למשלימות (180°)", text: "זוויות משלימות ל-90° (complementary) הן הקשר sin α = cos(90°−α). אל תבלבלו עם זוויות מישלימות ל-180° (supplementary) שזה עניין שונה לגמרי!" },
      { title: "חושבים ש-sin²α פירושו sin(α²)", text: "sin²α פירושו (sin α)² — קודם מחשבים sin α ואז מעלים בריבוע. זה לא sin של α². למשל: sin²30° = (sin 30°)² = (½)² = ¼." },
    ],
    goldenPrompt: `אני בכיתה י', 5 יחידות, מצרף/ת תרגיל בטריגונומטריה בנושא זוויות משלימות ל-90° והזהות הפיתגוראית.

אל תיתן לי את הפתרון — שאל אותי שאלות מנחות על הקשר בין sin ו-cos של זוויות משלימות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "הוכחת sin α = cos(90°−α)", coaching: "", prompt: "במשולש ישר זווית עם זווית α, תנחה אותי להוכיח שהניצב מול α (sin α) הוא גם הניצב צמוד ל-(90°−α) (cos(90°−α)).", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "משלימות", "ניצב", "90", "משולש", "הוכחה"] },
      { phase: "סעיף ב׳", label: "cos 53° מתוך sin 37°", coaching: "", prompt: "נתון sin 37° = 0.6. תדריך אותי למצוא cos 53° בלי מחשבון — בעזרת הקשר בין זוויות משלימות ל-90°.", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "37", "53", "משלימות", "90"] },
      { phase: "סעיף ג׳", label: "הוכחת sin²α + cos²α = 1", coaching: "", prompt: "תכווין אותי להוכיח ש-sin²α + cos²α = 1 לכל זווית, באמצעות משפט פיתגורס על משולש ישר זווית.", keywords: [], keywordHint: "", contextWords: ["sin²", "cos²", "פיתגורס", "זהות", "יתר", "הוכחה"] },
    ],
  },
  {
    id: "advanced",
    title: "משוואות טריגונומטריות פשוטות",
    problem: "א. פתרו sin x = ½ עבור 0° ≤ x ≤ 180°.\nב. פתרו cos x = −√3/2 עבור 0° ≤ x ≤ 360°.\nג. פתרו tan x = 1 עבור 0° ≤ x ≤ 360°.\nד. כמה פתרונות יש למשוואה sin x = 0.8 בתחום 0° ≤ x ≤ 360°? הסבירו.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "שוכחים פתרון ברביע השני", text: "כש-sin x = ½, יש פתרון גם ברביע I (30°) וגם ברביע II (150°). הסינוס חיובי גם ברביע II! תמיד בדקו באילו רביעים הפונקציה חיובית/שלילית." },
      { title: "בלבול בסימן הטנגנס ברביעים", text: "tan חיובי ברביעים I ו-III, שלילי ברביעים II ו-IV. כש-tan x = 1, יש שני פתרונות: 45° (רביע I) ו-225° (רביע III). אל תשכחו את הרביע השלישי!" },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד פותרים משוואות טריגונומטריות פשוטות ובודקים פתרונות בכל הרביעים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "sin x = ½ בתחום 0°-180°", coaching: "", prompt: "נתונה המשוואה sin x = ½ בתחום 0°-180°. תנחה אותי: באיזו זווית מיוחדת sin שווה ½? האם יש פתרון נוסף ברביע II?", keywords: [], keywordHint: "", contextWords: ["סינוס", "sin", "30", "רביע", "תחום", "משוואה"] },
      { phase: "סעיף ב׳", label: "cos x = −√3/2 בתחום 0°-360°", coaching: "", prompt: "נתונה cos x = −√3/2 בתחום 0°-360°. תדריך אותי: באיזו זווית cos = √3/2 (חיובי)? היכן הקוסינוס שלילי?", keywords: [], keywordHint: "", contextWords: ["קוסינוס", "cos", "שלילי", "רביע", "150", "210"] },
      { phase: "סעיף ג׳", label: "tan x = 1 בתחום 0°-360°", coaching: "", prompt: "נתונה tan x = 1 בתחום 0°-360°. תנחה אותי: מתי tan חיובי ומה הזווית הבסיסית? כמה פתרונות יש?", keywords: [], keywordHint: "", contextWords: ["טנגנס", "tan", "45", "225", "רביע", "חיובי"] },
      { phase: "סעיף ד׳", label: "מספר פתרונות sin x = 0.8", coaching: "", prompt: "כמה פתרונות יש ל-sin x = 0.8 בתחום 0°-360°? תסביר לי למה יש שני פתרונות ואיך למצוא אותם.", keywords: [], keywordHint: "", contextWords: ["סינוס", "פתרונות", "רביע", "180", "שני", "חיובי"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 ערכי sin, cos, tan</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "זוויות מיוחדות 30°, 45°, 60° — גזירת ערכי הפונקציות מתוך משולשים מיוחדים."}
            {ex.id === "medium" && "זוויות משלימות ל-90° — הקשר בין סינוס וקוסינוס, והזהות הפיתגוראית."}
            {ex.id === "advanced" && "משוואות טריגונומטריות פשוטות — מציאת זוויות לפי ערך הפונקציה בכל הרביעים."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: יחסות בסיסיות */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>יחסות טריגונומטריות</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>sin</span>
              <span>ניצב מול הזווית חלקי יתר.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>cos</span>
              <span>ניצב צמוד לזווית חלקי יתר.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>tan</span>
              <span>sin / cos = ניצב מול חלקי ניצב צמוד.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>קשרים חשובים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>משלימות</span>
                  <span>sin α = cos(90°−α) ולהפך.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>זהות</span>
                  <span>sin²α + cos²α = 1 תמיד.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>סימני רביעים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>sin +</span>
                  <span>רביעים I, II (0°-180°)</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>cos +</span>
                  <span>רביעים I, IV (0°-90°, 270°-360°)</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>tan +</span>
                  <span>רביעים I, III (0°-90°, 180°-270°)</span>
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

// ─── SpecialAnglesLab (basic) — angle slider + dynamic triangle ─────────────

function SpecialAnglesLab() {
  const [angle, setAngle] = useState(30);
  const st = STATION.basic;

  const rad = (angle * Math.PI) / 180;
  const sinVal = Math.sin(rad);
  const cosVal = Math.cos(rad);
  const tanVal = angle === 90 ? Infinity : Math.tan(rad);
  const identity = sinVal * sinVal + cosVal * cosVal;

  // Triangle geometry for SVG
  const triW = 180, triH = 140;
  const baseX = 40, baseY = 150;
  const topX = baseX;
  const adjLen = triW * cosVal;
  const oppLen = triH * sinVal;
  const topY = baseY - oppLen;
  const rightX = baseX + adjLen;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת זוויות מיוחדות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הזווית בעזרת הסליידר וצפו כיצד ערכי sin, cos, tan משתנים בזמן אמת.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{angle}°</span>
          </div>
          <input type="range" min={1} max={89} step={1} value={angle} onChange={(e) => setAngle(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Dynamic SVG triangle */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Triangle */}
          <polygon
            points={`${baseX},${baseY} ${rightX},${baseY} ${rightX},${topY}`}
            fill="none" stroke="#94a3b8" strokeWidth={1.8}
          />
          {/* Right angle mark */}
          <rect x={rightX - 8} y={baseY - 8} width={8} height={8} fill="none" stroke="#94a3b8" strokeWidth={1} />
          {/* Angle arc */}
          <path
            d={`M ${baseX + 20},${baseY} A 20,20 0 0,0 ${baseX + 20 * Math.cos(rad)},${baseY - 20 * Math.sin(rad)}`}
            fill="none" stroke="#f59e0b" strokeWidth={2}
          />
          <text x={baseX + 30} y={baseY - 8} fontSize={12} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">{angle}°</text>
          {/* Labels */}
          <text x={(baseX + rightX) / 2} y={baseY + 16} fontSize={10} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">cos {angle}° = {cosVal.toFixed(3)}</text>
          <text x={rightX + 8} y={(baseY + topY) / 2} fontSize={10} fill="#6B7280" textAnchor="start" fontFamily="sans-serif">sin {angle}° = {sinVal.toFixed(3)}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "sin", val: sinVal.toFixed(4) },
          { label: "cos", val: cosVal.toFixed(4) },
          { label: "tan", val: tanVal === Infinity ? "∞" : tanVal.toFixed(4) },
          { label: "sin²+cos²", val: identity.toFixed(4) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>sin² + cos² שווה תמיד 1 — לכל זווית!</p>
    </section>
  );
}

// ─── ComplementaryLab (medium) — alpha slider ───────────────────────────────

function ComplementaryLab() {
  const [alpha, setAlpha] = useState(37);
  const st = STATION.medium;

  const rad = (alpha * Math.PI) / 180;
  const comp = 90 - alpha;
  const radComp = (comp * Math.PI) / 180;

  const sinA = Math.sin(rad);
  const cosA = Math.cos(rad);
  const sinComp = Math.sin(radComp);
  const cosComp = Math.cos(radComp);

  // Triangle geometry
  const bx = 40, by = 150, triW = 180, triH = 130;
  const rx = bx + triW * cosA;
  const ty = by - triH * sinA;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת זוויות משלימות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את α וצפו כיצד sin α = cos(90°−α) תמיד!</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>{"\u03B1"}</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{alpha}° (90°−α = {comp}°)</span>
          </div>
          <input type="range" min={1} max={89} step={1} value={alpha} onChange={(e) => setAlpha(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Dynamic SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 300 180" className="w-full max-w-sm mx-auto" aria-hidden>
          <polygon points={`${bx},${by} ${rx},${by} ${rx},${ty}`} fill="none" stroke="#94a3b8" strokeWidth={1.8} />
          <rect x={rx - 8} y={by - 8} width={8} height={8} fill="none" stroke="#94a3b8" strokeWidth={1} />
          {/* Alpha arc */}
          <path d={`M ${bx + 22},${by} A 22,22 0 0,0 ${bx + 22 * Math.cos(rad)},${by - 22 * Math.sin(rad)}`} fill="none" stroke="#EA580C" strokeWidth={2} />
          <text x={bx + 32} y={by - 8} fontSize={11} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">{"\u03B1"}={alpha}°</text>
          {/* Complement arc */}
          <path d={`M ${rx},${ty + 22} A 22,22 0 0,0 ${rx - 22 * Math.sin(rad)},${ty + 22 * Math.cos(rad)}`} fill="none" stroke="#a78bfa" strokeWidth={2} />
          <text x={rx - 40} y={ty + 16} fontSize={10} fill="#a78bfa" fontWeight={700} fontFamily="sans-serif">{comp}°</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: `sin ${alpha}°`, val: sinA.toFixed(4), color: "#EA580C" },
          { label: `cos ${alpha}°`, val: cosA.toFixed(4), color: "#EA580C" },
          { label: `sin ${comp}°`, val: sinComp.toFixed(4), color: "#a78bfa" },
          { label: `cos ${comp}°`, val: cosComp.toFixed(4), color: "#a78bfa" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>sin {alpha}° = cos {comp}° = {sinA.toFixed(4)} — תמיד!</p>
    </section>
  );
}

// ─── UnitCircleLab (advanced) — angle 0-360 + unit circle ──────────────────

function UnitCircleLab() {
  const [angle, setAngle] = useState(45);
  const st = STATION.advanced;

  const rad = (angle * Math.PI) / 180;
  const sinVal = Math.sin(rad);
  const cosVal = Math.cos(rad);
  const tanVal = Math.abs(cosVal) < 0.001 ? (sinVal > 0 ? Infinity : -Infinity) : sinVal / cosVal;
  const quadrant = angle <= 90 ? "I" : angle <= 180 ? "II" : angle <= 270 ? "III" : "IV";

  const cx = 140, cy = 140, r = 100;
  const px = cx + r * Math.cos(rad);
  const py = cy - r * Math.sin(rad);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מעגל היחידה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>סובבו את הזווית על מעגל היחידה וצפו בערכי sin, cos, tan ובסימניהם.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{angle}°</span>
          </div>
          <input type="range" min={0} max={360} step={1} value={angle} onChange={(e) => setAngle(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Unit circle SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 280" className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Axes */}
          <line x1={cx - r - 15} y1={cy} x2={cx + r + 15} y2={cy} stroke="#94a3b8" strokeWidth={1} />
          <line x1={cx} y1={cy - r - 15} x2={cx} y2={cy + r + 15} stroke="#94a3b8" strokeWidth={1} />
          {/* Circle */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(220,38,38,0.3)" strokeWidth={1.5} />
          {/* Quadrant labels */}
          <text x={cx + 50} y={cy - 50} fontSize={12} fill="rgba(220,38,38,0.5)" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">I</text>
          <text x={cx - 50} y={cy - 50} fontSize={12} fill="rgba(167,139,250,0.5)" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">II</text>
          <text x={cx - 50} y={cy + 55} fontSize={12} fill="rgba(100,116,139,0.5)" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">III</text>
          <text x={cx + 50} y={cy + 55} fontSize={12} fill="rgba(245,158,11,0.5)" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">IV</text>
          {/* Radius to point */}
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#DC2626" strokeWidth={2} />
          {/* Point on circle */}
          <circle cx={px} cy={py} r={5} fill="#DC2626" />
          {/* Projections */}
          <line x1={px} y1={py} x2={px} y2={cy} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
          <line x1={px} y1={cy} x2={cx} y2={cy} stroke="#34d399" strokeWidth={1.5} strokeDasharray="4,3" />
          {/* sin label */}
          <text x={px + 8} y={(py + cy) / 2} fontSize={10} fill="#f59e0b" fontWeight={600} fontFamily="sans-serif">sin</text>
          {/* cos label */}
          <text x={(px + cx) / 2} y={cy + 14} fontSize={10} fill="#34d399" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">cos</text>
          {/* Angle arc */}
          {angle > 0 && (
            <path
              d={`M ${cx + 20},${cy} A 20,20 0 ${angle > 180 ? 1 : 0},0 ${cx + 20 * Math.cos(rad)},${cy - 20 * Math.sin(rad)}`}
              fill="none" stroke="#DC2626" strokeWidth={1.5}
            />
          )}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "sin", val: sinVal.toFixed(4), color: "#f59e0b" },
          { label: "cos", val: cosVal.toFixed(4), color: "#34d399" },
          { label: "tan", val: Math.abs(tanVal) > 1000 ? "∞" : tanVal.toFixed(4), color: "#DC2626" },
          { label: "רביע", val: quadrant, color: "#a78bfa" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {sinVal >= 0 && cosVal >= 0 ? "רביע I — sin, cos, tan כולם חיוביים." :
         sinVal >= 0 && cosVal < 0 ? "רביע II — sin חיובי, cos שלילי, tan שלילי." :
         sinVal < 0 && cosVal < 0 ? "רביע III — sin שלילי, cos שלילי, tan חיובי." :
         "רביע IV — sin שלילי, cos חיובי, tan שלילי."}
      </p>
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
  const [activeTab, setActiveTab] = useState<"ratios" | "special" | "identities" | null>(null);

  const tabs = [
    { id: "ratios" as const, label: "יחסות", tex: "\\frac{a}{c}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "special" as const, label: "זוויות מיוחדות", tex: "30°, 45°, 60°", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "identities" as const, label: "זהויות", tex: "\\sin^2\\!+\\cos^2", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Ratios */}
      {activeTab === "ratios" && (
        <motion.div key="ratios" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 8 }}>
              <DisplayMath>{"\\sin\\alpha = \\frac{\\text{opposite}}{\\text{hypotenuse}}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 8 }}>
              <DisplayMath>{"\\cos\\alpha = \\frac{\\text{adjacent}}{\\text{hypotenuse}}"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} = \\frac{\\text{opposite}}{\\text{adjacent}}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> במשולש ישר זווית, סינוס = הניצב שמול הזווית חלקי היתר, קוסינוס = הניצב שצמוד לזווית חלקי היתר, וטנגנס = סינוס חלקי קוסינוס.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Special Angles */}
      {activeTab === "special" && (
        <motion.div key="special" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#EA580C", fontSize: 14, fontWeight: 700 }}>טבלת ערכים — למד לגזור, לא לשנן!</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "center" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(234,88,12,0.2)" }}>
                    <th style={{ padding: "8px 6px", color: "#6B7280", fontWeight: 600 }}></th>
                    <th style={{ padding: "8px 6px", color: "#EA580C", fontWeight: 700 }}>30°</th>
                    <th style={{ padding: "8px 6px", color: "#EA580C", fontWeight: 700 }}>45°</th>
                    <th style={{ padding: "8px 6px", color: "#EA580C", fontWeight: 700 }}>60°</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(60,54,42,0.1)" }}>
                    <td style={{ padding: "8px 6px", color: "#1A1A1A", fontWeight: 700 }}>sin</td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}><InlineMath>{"\\frac{1}{2}"}</InlineMath></td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}><InlineMath>{"\\frac{\\sqrt{2}}{2}"}</InlineMath></td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}><InlineMath>{"\\frac{\\sqrt{3}}{2}"}</InlineMath></td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(60,54,42,0.1)" }}>
                    <td style={{ padding: "8px 6px", color: "#1A1A1A", fontWeight: 700 }}>cos</td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}><InlineMath>{"\\frac{\\sqrt{3}}{2}"}</InlineMath></td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}><InlineMath>{"\\frac{\\sqrt{2}}{2}"}</InlineMath></td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}><InlineMath>{"\\frac{1}{2}"}</InlineMath></td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 6px", color: "#1A1A1A", fontWeight: 700 }}>tan</td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}><InlineMath>{"\\frac{1}{\\sqrt{3}}"}</InlineMath></td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}>1</td>
                    <td style={{ padding: "8px 6px", color: "#2D3436" }}><InlineMath>{"\\sqrt{3}"}</InlineMath></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", marginTop: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>טיפ:</strong> במקום לשנן — גזרו מהמשולשים! משולש 30-60-90 (צלעות 1:√3:2) ומשולש 45-45-90 (צלעות 1:1:√2). שימו לב: sin עולה מ-30° ל-60°, cos יורד.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Identities */}
      {activeTab === "identities" && (
        <motion.div key="identities" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 8 }}>
              <DisplayMath>{"\\sin^2\\alpha + \\cos^2\\alpha = 1"}</DisplayMath>
            </div>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\sin\\alpha = \\cos(90°-\\alpha)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הזהות sin²α + cos²α = 1 נובעת ישירות ממשפט פיתגורס: במשולש ישר זווית עם יתר c, מתקיים a² + b² = c², ואם מחלקים ב-c² מקבלים (a/c)² + (b/c)² = 1, כלומר sin² + cos² = 1. הזהות sin α = cos(90°−α) נובעת מכך שהניצב מול α הוא הניצב צמוד ל-(90°−α).
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrigValuesPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>ערכי sin, cos, tan עם AI — כיתה י׳ (5 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>זוויות מיוחדות, זוויות משלימות, משוואות טריגונומטריות — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/5u/topic/grade10/trig-functions"
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

        <SubtopicProgress subtopicId="5u/grade10/trig-functions/values" />

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
        {selectedLevel === "basic" && <SpecialAnglesLab />}
        {selectedLevel === "medium" && <ComplementaryLab />}
        {selectedLevel === "advanced" && <UnitCircleLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="5u/grade10/trig-functions/values" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
