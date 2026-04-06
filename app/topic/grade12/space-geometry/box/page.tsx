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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG diagrams (silent -- no numbers, no answers) ──────────────────────────

// Vertices for a fixed oblique-projection box
const V = {
  A:  [55, 190] as [number, number], B:  [215, 190] as [number, number],
  C:  [260, 158] as [number, number], D:  [100, 158] as [number, number],
  A1: [55,  82] as [number, number], B1: [215,  82] as [number, number],
  C1: [260,  50] as [number, number], D1: [100,  50] as [number, number],
} as const;
type VK = keyof typeof V;

function Seg({ a, b, color = "#94a3b8", w = 1.5, dash }: { a: VK; b: VK; color?: string; w?: number; dash?: string }) {
  const [x1, y1] = V[a], [x2, y2] = V[b];
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeDasharray={dash} />;
}
function Lbl({ v, t, dx = 0, dy = 0, color = "#6B7280" }: { v: VK; t: string; dx?: number; dy?: number; color?: string }) {
  const [x, y] = V[v];
  return <text x={x + dx} y={y + dy} fill={color} fontSize={11} textAnchor="middle">{t}</text>;
}

// Level 1 SVG — highlights face diagonal B→D (amber) and space diagonal B→D′ (violet)
function BoxSVG_L1() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 340 230" style={{ width: "100%", maxWidth: 280, display: "block" }} aria-hidden>
        <Seg a="A" b="B" /><Seg a="B" b="C" /><Seg a="C" b="D" dash="4 3" /><Seg a="D" b="A" dash="4 3" />
        <Seg a="A1" b="B1" /><Seg a="B1" b="C1" /><Seg a="C1" b="D1" /><Seg a="D1" b="A1" />
        <Seg a="A" b="A1" /><Seg a="B" b="B1" /><Seg a="C" b="C1" /><Seg a="D" b="D1" dash="4 3" />
        {/* Face diagonal B→D (amber) */}
        <Seg a="B" b="D" color="#f59e0b" w={2} dash="5 3" />
        {/* Space diagonal B→D′ (violet) */}
        <Seg a="B" b="D1" color="#a78bfa" w={2.5} />
        <Lbl v="A" t="A" dy={14} /><Lbl v="B" t="B" dy={14} />
        <Lbl v="C" t="C" dx={14} dy={4} /><Lbl v="D" t="D" dx={-14} dy={4} />
        <Lbl v="A1" t="A′" dy={-8} /><Lbl v="B1" t="B′" dy={-8} />
        <Lbl v="C1" t="C′" dx={16} dy={-4} /><Lbl v="D1" t="D′" dx={-16} dy={-4} />
      </svg>
    </div>
  );
}

// Level 2 SVG — highlights square base (emerald) and vertical height (rose)
function BoxSVG_L2() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 340 230" style={{ width: "100%", maxWidth: 280, display: "block" }} aria-hidden>
        {/* Base square — emerald */}
        <Seg a="A" b="B" color="#34d399" w={2.5} />
        <Seg a="B" b="C" color="#34d399" w={2.5} />
        <Seg a="C" b="D" color="#34d399" w={2.5} dash="4 3" />
        <Seg a="D" b="A" color="#34d399" w={2.5} dash="4 3" />
        {/* Top face */}
        <Seg a="A1" b="B1" /><Seg a="B1" b="C1" /><Seg a="C1" b="D1" /><Seg a="D1" b="A1" />
        {/* Verticals */}
        <Seg a="A" b="A1" /><Seg a="B" b="B1" /><Seg a="C" b="C1" /><Seg a="D" b="D1" dash="4 3" />
        {/* Height arrow A→A′ (rose) */}
        <Seg a="A" b="A1" color="#fb7185" w={2.5} />
        <Lbl v="A" t="A" dy={14} /><Lbl v="B" t="B" dy={14} />
        <Lbl v="C" t="C" dx={14} dy={4} /><Lbl v="D" t="D" dx={-14} dy={4} />
        <Lbl v="A1" t="A′" dy={-8} /><Lbl v="B1" t="B′" dy={-8} />
        <Lbl v="C1" t="C′" dx={16} dy={-4} /><Lbl v="D1" t="D′" dx={-16} dy={-4} />
        {/* h label */}
        <text x={30} y={138} fill="#fb7185" fontSize={12} fontWeight={700} textAnchor="middle">h</text>
      </svg>
    </div>
  );
}

// Level 3 SVG — space diagonal A→C′ (violet), NO numeric side labels
function BoxSVG_L3() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 340 230" style={{ width: "100%", maxWidth: 280, display: "block" }} aria-hidden>
        <Seg a="A" b="B" /><Seg a="B" b="C" /><Seg a="C" b="D" dash="4 3" /><Seg a="D" b="A" dash="4 3" />
        <Seg a="A1" b="B1" /><Seg a="B1" b="C1" /><Seg a="C1" b="D1" /><Seg a="D1" b="A1" />
        <Seg a="A" b="A1" /><Seg a="B" b="B1" /><Seg a="C" b="C1" /><Seg a="D" b="D1" dash="4 3" />
        {/* Space diagonal A→C′ (violet) */}
        <Seg a="A" b="C1" color="#a78bfa" w={2.5} />
        <Lbl v="A" t="A" dy={14} /><Lbl v="B" t="B" dy={14} />
        <Lbl v="C" t="C" dx={14} dy={4} /><Lbl v="D" t="D" dx={-14} dy={4} />
        <Lbl v="A1" t="A′" dy={-8} /><Lbl v="B1" t="B′" dy={-8} />
        <Lbl v="C1" t="C′" dx={16} dy={-4} /><Lbl v="D1" t="D′" dx={-16} dy={-4} />
      </svg>
    </div>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb = "22,163,74" }: { text: string; label?: string; accentRgb?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}
    >
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
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <Lock size={14} color="#6B7280" />
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
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
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; בדיקת AI מדומה
          </button>
        )}

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            &#9888;&#65039; {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            &#128161; {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              &#9989; פרומפט מצוין! ציון: <strong>{result!.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
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

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span>
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
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>
        {passed
          ? <CheckCircle2 size={14} color="#16a34a" />
          : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}>
              <span>ציון</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; בדיקת AI מדומה
          </button>
        )}
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
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  &#10003; סיימתי סעיף זה
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>
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
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlockedIdx = masterPassed ? (passed.findIndex(p => !p) === -1 ? steps.length : passed.findIndex(p => !p)) : -1;

  return (
    <div>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#991b1b"
        accentRgb="153,27,27"
        requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["תיבה", "אלכסון", "מרחבי", "פאה", "פיתגורס", "זווית", "גוף"]}
      />
      {steps.map((s, i) => (
        <TutorStepAdvanced
          key={i} step={s}
          locked={!masterPassed || i > unlockedIdx}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
        />
      ))}
    </div>
  );
}

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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced gate -- outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"face" | "space" | "volume" | "surface" | null>(null);

  const tabs = [
    { id: "face" as const,    label: "אלכסון פאה",    tex: "d = \\sqrt{a^2 + b^2}",          color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "space" as const,   label: "אלכסון מרחבי",  tex: "D = \\sqrt{a^2 + b^2 + c^2}",   color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "volume" as const,  label: "נפח",            tex: "V = a \\cdot b \\cdot c",         color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "surface" as const, label: "שטח פנים",       tex: "S = 2(ab+bc+ac)",                color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{
                flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.15)"}`,
                background: isActive ? `${t.color}15` : "rgba(255,255,255,0.5)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {/* Expanded: Face diagonal */}
      {activeTab === "face" && (
        <motion.div key="face" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"d = \\sqrt{a^2 + b^2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> אלכסון פאה הוא אלכסון על אחד ממלבני התיבה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>בחרו מלבן (בסיס או פאה צדדית).</li>
                  <li>הפעילו משפט פיתגורס על שתי הצלעות הסמוכות.</li>
                  <li>אלכסון הבסיס: <InlineMath>{"d = \\sqrt{a^2 + b^2}"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: אלכסון פאה שונה מאלכסון מרחבי -- הוא נמצא על פני הגוף בלבד.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Space diagonal */}
      {activeTab === "space" && (
        <motion.div key="space" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"D = \\sqrt{a^2 + b^2 + c^2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> האלכסון המרחבי חוצה את התיבה מקודקוד לקודקוד הנגדי.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>חשבו קודם את אלכסון הבסיס <InlineMath>{"d = \\sqrt{a^2 + b^2}"}</InlineMath>.</li>
                  <li>בנו משולש ישר-זווית חדש: ניצב אחד = <InlineMath>{"d"}</InlineMath>, ניצב שני = גובה <InlineMath>{"c"}</InlineMath>.</li>
                  <li>פיתגורס שוב: <InlineMath>{"D = \\sqrt{d^2 + c^2} = \\sqrt{a^2 + b^2 + c^2}"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: תמיד עבדו בשני שלבים -- קודם אלכסון בסיס, ואז פיתגורס שוב עם הגובה.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Volume */}
      {activeTab === "volume" && (
        <motion.div key="volume" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"V = a \\cdot b \\cdot c"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> נפח התיבה הוא מכפלת שלוש הצלעות.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אם הבסיס ריבועי (<InlineMath>{"a = b"}</InlineMath>): <InlineMath>{"V = a^2 \\cdot c"}</InlineMath>.</li>
                  <li>ניתן לחלץ צלע חסרה: <InlineMath>{"c = \\frac{V}{a \\cdot b}"}</InlineMath>.</li>
                  <li>שימושי כשנתון הנפח וצריך למצוא גובה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; אל תבלבלו בין נפח (<InlineMath>{"V = abc"}</InlineMath>) לשטח פנים (<InlineMath>{"S = 2(ab+bc+ac)"}</InlineMath>).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Surface area */}
      {activeTab === "surface" && (
        <motion.div key="surface" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = 2(ab + bc + ac)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> שטח הפנים הוא סכום שטחי 6 המלבנים (3 זוגות):
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>2 פאות בסיס: <InlineMath>{"2 \\cdot a \\cdot b"}</InlineMath>.</li>
                  <li>2 פאות קדמיות/אחוריות: <InlineMath>{"2 \\cdot b \\cdot c"}</InlineMath>.</li>
                  <li>2 פאות צדדיות: <InlineMath>{"2 \\cdot a \\cdot c"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; אם הבסיס ריבועי (<InlineMath>{"a = b"}</InlineMath>): <InlineMath>{"S = 2(a^2 + 2ac) = 2a^2 + 4ac"}</InlineMath>.
              </div>
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
    title: "תיבה ABCD-A′B′C′D′ -- אלכסונים וזווית",
    problem: "תיבה ABCD-A′B′C′D′ שבה: AB = 6, BC = 8, AA′ = 10.\n\nא. מצא את אורך אלכסון הבסיס BD.\nב. מצא את אורך האלכסון המרחבי BD′.\nג. מצא את הזווית שבין BD′ לבסיס התיבה.",
    diagram: <BoxSVG_L1 />,
    pitfalls: [
      { title: "מבלבלים בין אלכסון פאה לאלכסון מרחבי", text: "אלכסון פאה על המלבן בלבד, אלכסון מרחבי חוצה את הגוף" },
      { title: "שוכחים באיזה משולש ישר-זווית להשתמש", text: "תמיד צריך לזהות את הניצבים" },
      { title: "בלבול ביחס הטריגונומטרי", text: "tan = ניצב נגד / ניצב צמוד, לא להפוך" },
    ],
    goldenPrompt: "אני תלמיד כיתה יב׳. אני פותר תרגיל על תיבה ABCD-A′B′C′D′ שבה AB=6, BC=8, AA′=10.\nאני צריך:\n1. למצוא את אורך אלכסון הבסיס BD\n2. למצוא את אורך האלכסון המרחבי BD′\n3. למצוא את הזווית שבין BD′ לבסיס התיבה\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- אלכסון הבסיס BD",
        coaching: "זהה את המשולש ישר-הזווית בבסיס",
        prompt: "אני תלמיד כיתה יב׳. אני רוצה למצוא את BD בבסיס המלבני ABCD שבו AB=6 ו-BC=8.\nבאיזה משולש ישר-זווית אשתמש? מה הם הניצבים ומה ההיפותנוסה?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["פיתגורס", "ניצב", "היפותנוסה"],
        keywordHint: "ציין שמדובר בפיתגורס",
        contextWords: ["פיתגורס", "משולש", "ישר-זווית", "ניצב", "היפותנוסה", "אלכסון", "בסיס"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- האלכסון המרחבי BD′",
        coaching: "השתמש באלכסון הבסיס ובגובה לבניית משולש חדש",
        prompt: "אני תלמיד כיתה יב׳. מצאתי את אלכסון הבסיס BD. עכשיו אני צריך למצוא את האלכסון המרחבי BD′.\nDD′ הוא הגובה AA′=10. איזה משולש ישר-זווית מכיל את BD′? מה הניצבים?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מרחבי", "גובה", "משולש"],
        keywordHint: "ציין שמדובר באלכסון מרחבי",
        contextWords: ["מרחבי", "גובה", "משולש", "ישר-זווית", "פיתגורס", "BD", "DD′"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- הזווית בין BD′ לבסיס",
        coaching: "השתמש בטריגונומטריה -- היטל וגובה",
        prompt: "אני תלמיד כיתה יב׳. מצאתי את BD ואת BD′. ההיטל של BD′ על הבסיס הוא BD.\nאיך אמצא את הזווית α בין BD′ לבסיס? איזה יחס טריגונומטרי אשתמש (tan, sin, cos)?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["זווית", "טריגונומטרי", "היטל"],
        keywordHint: "ציין שצריך טריגונומטריה",
        contextWords: ["זווית", "טריגונומטרי", "היטל", "tan", "בסיס", "גובה", "α"],
      },
    ],
  },
  {
    id: "medium",
    title: "תיבה עם בסיס ריבועי -- נפח ואלכסון",
    problem: "תיבה עם בסיס ריבועי, צלע הבסיס a, נפח V.\n\nא. הוצא את גובה התיבה h מנוסחת הנפח.\nב. חשב את אלכסון הבסיס.\nג. חשב את האלכסון המרחבי.\nד. חשב את שטח הפנים הכולל.",
    diagram: <BoxSVG_L2 />,
    pitfalls: [
      { title: "שוכחים שבסיס ריבועי אומר a=b", text: "בנוסחאות צריך להציב a²" },
      { title: "מבלבלים בין נפח לשטח פנים", text: "V = a²·h, S = 2(a² + 2ah)" },
      { title: "שוכחים לחלץ שורש בסוף", text: "אלכסון מרחבי = √(...), לא (...) עצמו" },
    ],
    goldenPrompt: "אני תלמיד כיתה יב׳. אני פותר תרגיל על תיבה עם בסיס ריבועי.\nנתון: אורך צלע הבסיס a, נפח V.\nאני צריך:\n1. להוציא את גובה התיבה h מנוסחת הנפח\n2. לחשב את אלכסון הבסיס\n3. לחשב את האלכסון המרחבי\n4. לחשב את שטח הפנים הכולל\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- חילוץ גובה מנוסחת נפח",
        coaching: "V = a²·h, חלץ את h",
        prompt: "אני תלמיד כיתה יב׳. יש לי תיבה עם בסיס ריבועי, צלע a ונפח V.\nתנחה אותי: איך מוציאים את h מהנוסחה V = a²·h? תשאל אם אני מבין למה הבסיס a².\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נפח", "גובה", "חלץ"],
        keywordHint: "ציין שצריך לחלץ גובה מנפח",
        contextWords: ["נפח", "גובה", "חלץ", "ריבועי", "בסיס", "נוסחה", "V", "h", "a"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- אלכסון הבסיס",
        coaching: "בסיס ריבועי: אלכסון = a√2",
        prompt: "אני תלמיד כיתה יב׳. מצאתי את הגובה h. עכשיו אני צריך את אלכסון הבסיס הריבועי.\nתנחה אותי: איך מחשבים אלכסון של ריבוע? באיזו נוסחה להשתמש?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אלכסון", "ריבוע", "פיתגורס"],
        keywordHint: "ציין שמחשבים אלכסון של ריבוע",
        contextWords: ["אלכסון", "ריבוע", "פיתגורס", "שורש", "בסיס", "a", "d"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- האלכסון המרחבי",
        coaching: "D = √(d² + h²) = √(a² + a² + h²)",
        prompt: "אני תלמיד כיתה יב׳. מצאתי את אלכסון הבסיס d ואת הגובה h. עכשיו אני צריך את האלכסון המרחבי D.\nתנחה אותי: באיזה משולש ישר-זווית להשתמש? מי הניצבים?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מרחבי", "משולש", "שורש"],
        keywordHint: "ציין שצריך משולש ישר-זווית חדש",
        contextWords: ["מרחבי", "משולש", "ישר-זווית", "ניצב", "שורש", "גובה", "אלכסון", "D"],
      },
      {
        phase: "ד",
        label: "שלב ד׳ -- שטח הפנים הכולל",
        coaching: "S = 2(a² + 2ah) כאשר הבסיס ריבועי",
        prompt: "אני תלמיד כיתה יב׳. עכשיו אני צריך לחשב את שטח הפנים הכולל של התיבה עם בסיס ריבועי צלע a וגובה h.\nתנחה אותי: כמה זוגות פאות יש? מה השטח של כל זוג?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שטח", "פנים", "פאות"],
        keywordHint: "ציין שצריך שטח פנים",
        contextWords: ["שטח", "פנים", "פאות", "זוגות", "בסיס", "צדדי", "a", "h"],
      },
    ],
  },
  {
    id: "advanced",
    title: "תיבה עם יחס צלעות -- ביטוי סמלי",
    problem: "תיבה ABCD-A′B′C′D′ שבה יחס הצלעות: AB : BC : AA′ = a : 2a : 3a.\n\nא. רשום ביטוי לאלכסון המרחבי d כפונקציה של a.\nב. פשט את הביטוי.\nג. מצא את a כך ש-d = 7√2.",
    diagram: <BoxSVG_L3 />,
    pitfalls: [
      { title: "לא מפשטים √(a² + 4a² + 9a²) = √(14a²) = a√14", text: "" },
      { title: "שוכחים ש-a חייב להיות חיובי", text: "a > 0 תמיד" },
      { title: "טעות אלגברית בחילוץ a", text: "חלקו ב-√14, לא מכפילים" },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- ביטוי לאלכסון המרחבי",
        coaching: "הציב a, 2a, 3a בנוסחת האלכסון המרחבי",
        prompt: "אני תלמיד כיתה יב׳. יש לי תיבה עם צלעות a, 2a ו-3a. אני צריך לרשום ביטוי לאורך האלכסון המרחבי d כפונקציה של a.\nתנחה אותי: איך מציבים את הצלעות בנוסחה d = √(a² + b² + c²)?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אלכסון", "מרחבי", "ביטוי"],
        keywordHint: "ציין שמרכיבים ביטוי לאלכסון",
        contextWords: ["אלכסון", "מרחבי", "ביטוי", "הצב", "a", "נוסחה", "שורש", "תיבה"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- פישוט הביטוי",
        coaching: "√(a² + 4a² + 9a²) = √(14a²) = a√14",
        prompt: "אני תלמיד כיתה יב׳. קיבלתי ביטוי עם שורש שמכיל חיבור של ביטויים ב-a². אני צריך לפשט.\nתנחה אותי: איך מכנסים תחת השורש ואיך מוציאים a מהשורש?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["פישוט", "שורש", "כינוס"],
        keywordHint: "ציין שצריך לפשט ולכנס",
        contextWords: ["פישוט", "שורש", "כינוס", "a²", "הוצאה", "מחוץ", "14", "פיתגורס"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- חילוץ a כאשר d = 7√2",
        coaching: "a√14 = 7√2, חלץ a",
        prompt: "אני תלמיד כיתה יב׳. פישטתי ומצאתי d = a√14. עכשיו צריך למצוא a כך ש-d = 7√2.\nתנחה אותי: איך פותרים משוואה a√14 = 7√2? מה עושים כדי לבודד את a?\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חילוץ", "משוואה", "בודד"],
        keywordHint: "ציין שצריך לפתור משוואה",
        contextWords: ["חילוץ", "משוואה", "בודד", "a", "שורש", "חלוקה", "14", "7"],
      },
    ],
  },
];

// ─── SpaceGeometryLab ─────────────────────────────────────────────────────────

function SpaceGeometryLab() {
  const [L, setL] = useState(6);
  const [W, setW] = useState(8);
  const [H, setH] = useState(10);
  const [sparkle, setSparkle] = useState(false);

  const fd  = Math.sqrt(L * L + W * W);
  const sd  = Math.sqrt(L * L + W * W + H * H);
  const ang = (Math.atan(H / fd) * 180) / Math.PI;
  const vol = L * W * H;
  const surf = 2 * (L * W + W * H + L * H);

  // Scale so the tallest dimension spans ~200 px inside viewBox
  const sc = 200 / Math.max(L, W, H, 1);
  const SL = L * sc, SH = H * sc, dX = W * sc * 0.5, dY = W * sc * 0.35;

  const ox = 30, oy = 260;
  const P = {
    A:  [ox,       oy      ], B:  [ox + SL,       oy      ],
    C:  [ox+SL+dX, oy - dY ], D:  [ox + dX,       oy - dY ],
    A1: [ox,       oy - SH ], B1: [ox + SL,       oy - SH ],
    C1: [ox+SL+dX, oy-dY-SH], D1: [ox + dX,       oy-dY-SH],
  };

  const PAD = 20;
  const xs = Object.values(P).map(p => p[0]);
  const ys = Object.values(P).map(p => p[1]);
  const vx = Math.min(...xs) - PAD;
  const vy = Math.min(...ys) - PAD;
  const vw = Math.max(...xs) - Math.min(...xs) + PAD * 2;
  const vh = Math.max(...ys) - Math.min(...ys) + PAD * 2;

  const ln = (a: number[], b: number[], clr = "#94a3b8", w = 1.5, dash = "") =>
    <line key={`${a[0]}-${a[1]}-${b[0]}-${b[1]}-${clr}`}
      x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
      stroke={clr} strokeWidth={w} strokeDasharray={dash} />;

  const handleSlider = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(+e.target.value);
    setSparkle(true);
    setTimeout(() => setSparkle(false), 600);
  };

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדה -- שנה ממדים</h3>
        {sparkle && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />מתעדכן!</span>}
      </div>

      {/* Sliders */}
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
        {[
          { label: "אורך (L)", val: L, set: setL, accent: "#16a34a" },
          { label: "רוחב (W)", val: W, set: setW, accent: "#16a34a" },
          { label: "גובה (H)", val: H, set: setH, accent: "#d97706" },
        ].map(r => (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 2 }}>
              <span>{r.label}</span>
              <span style={{ color: "#2D3436", fontWeight: 700, fontFamily: "monospace" }}>{r.val}</span>
            </div>
            <input type="range" min={1} max={12} step={1} value={r.val}
              onChange={handleSlider(r.set)}
              style={{ display: "block", width: "100%", accentColor: r.accent }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{
        borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "#fff",
        height: 320, display: "flex", justifyContent: "center", alignItems: "center",
        marginBottom: "1rem", overflow: "hidden", padding: "1rem",
      }}>
        <svg
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "100%" }}
          aria-hidden
        >
          {ln(P.A,  P.B )}{ln(P.B,  P.C )}{ln(P.C,  P.D, "#94a3b8",1.5,"4 3")}{ln(P.D,  P.A, "#94a3b8",1.5,"4 3")}
          {ln(P.A1, P.B1)}{ln(P.B1, P.C1)}{ln(P.C1, P.D1)}{ln(P.D1, P.A1)}
          {ln(P.A,  P.A1)}{ln(P.B,  P.B1)}{ln(P.C,  P.C1)}{ln(P.D,  P.D1,"#94a3b8",1.5,"4 3")}
          {/* Face diagonal (amber dashed) and space diagonal (violet) */}
          {ln(P.A,  P.C, "#f59e0b", 2, "5 3")}
          {ln(P.A,  P.C1,"#a78bfa", 2.5)}
        </svg>
      </div>

      {/* Result tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
        {[
          { label: "אלכסון בסיס",   val: fd.toFixed(2),          sub: "√(L²+W²)",       color: "#f59e0b" },
          { label: "אלכסון מרחבי",  val: sd.toFixed(2),          sub: "√(L²+W²+H²)",    color: "#a78bfa" },
          { label: "זווית עם בסיס", val: ang.toFixed(1) + "°",   sub: "arctan(H / d₀)",  color: "#16a34a" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 10, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", padding: "10px 6px", textAlign: "center", minWidth: 0 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div>
            <div style={{ color: "#94a3b8", fontSize: 9, marginTop: 3 }}>{r.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {[
          { label: "נפח",       val: vol.toFixed(1),   sub: "L·W·H",          color: "#dc2626" },
          { label: "שטח פנים",  val: surf.toFixed(1),  sub: "2(LW+WH+LH)",    color: "#7c3aed" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 10, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", padding: "10px 6px", textAlign: "center", minWidth: 0 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div>
            <div style={{ color: "#94a3b8", fontSize: 9, marginTop: 3 }}>{r.sub}</div>
          </div>
        ))}
      </div>

      <LabMessage text="מעולה! הערכים מתעדכנים בזמן אמת -- שנה את הסליידרים וראה את ההשפעה." type="success" visible={sparkle} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoxPage() {
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
        textarea:focus, input[type="text"]:focus {
          outline: none !important;
          border-color: rgba(var(--lvl-rgb), 0.65) !important;
          box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important;
        }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important;
        }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>התיבה והמנסרה -- עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>אלכסונים, זוויות ומשוואות -- ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/grade12/space-geometry"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}
          >
            <span style={{ fontSize: 16 }}>{"\u2190"}</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="grade12/space-geometry/box" />

        {/* Level Selector */}
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

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab */}
        <SpaceGeometryLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="grade12/space-geometry/box" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
