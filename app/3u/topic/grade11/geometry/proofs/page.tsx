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

function BasicParallelogramDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מקבילית ABCD עם אלכסונים</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        {/* Parallelogram edges */}
        <line x1={70} y1={160} x2={230} y2={160} stroke="#16a34a" strokeWidth={2.2} />
        <line x1={120} y1={40} x2={280} y2={40} stroke="#16a34a" strokeWidth={2.2} />
        <line x1={70} y1={160} x2={120} y2={40} stroke="#16a34a" strokeWidth={2.2} />
        <line x1={230} y1={160} x2={280} y2={40} stroke="#16a34a" strokeWidth={2.2} />
        {/* Diagonals dashed */}
        <line x1={70} y1={160} x2={280} y2={40} stroke="#64748b" strokeWidth={1.5} strokeDasharray="6,4" />
        <line x1={120} y1={40} x2={230} y2={160} stroke="#64748b" strokeWidth={1.5} strokeDasharray="6,4" />
        {/* Intersection point O */}
        <circle cx={175} cy={100} r={4} fill="#64748b" />
        <text x={175} y={92} textAnchor="middle" fill="#64748b" fontSize={13} fontWeight={700}>O</text>
        {/* Vertex labels */}
        <text x={55} y={172} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>A</text>
        <text x={240} y={172} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>B</text>
        <text x={290} y={38} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>C</text>
        <text x={110} y={32} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>D</text>
      </svg>
    </div>
  );
}

function MediumIsoscelesDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>משולש שווה שוקיים ABC עם חציון AD</p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        {/* Triangle */}
        <line x1={150} y1={30} x2={60} y2={190} stroke="#ea580c" strokeWidth={2.2} />
        <line x1={150} y1={30} x2={240} y2={190} stroke="#ea580c" strokeWidth={2.2} />
        <line x1={60} y1={190} x2={240} y2={190} stroke="#ea580c" strokeWidth={2.2} />
        {/* Tick marks for equal sides AB=AC */}
        <line x1={100} y1={105} x2={108} y2={113} stroke="#ea580c" strokeWidth={2} />
        <line x1={104} y1={101} x2={112} y2={109} stroke="#ea580c" strokeWidth={2} />
        <line x1={192} y1={113} x2={200} y2={105} stroke="#ea580c" strokeWidth={2} />
        <line x1={188} y1={109} x2={196} y2={101} stroke="#ea580c" strokeWidth={2} />
        {/* Median AD dashed */}
        <line x1={150} y1={30} x2={150} y2={190} stroke="#64748b" strokeWidth={1.5} strokeDasharray="6,4" />
        {/* Base angle arcs */}
        <path d="M 80 190 A 20 20 0 0 1 72 175" fill="none" stroke="#ea580c" strokeWidth={1.5} />
        <path d="M 220 190 A 20 20 0 0 0 228 175" fill="none" stroke="#ea580c" strokeWidth={1.5} />
        {/* Midpoint D marker */}
        <circle cx={150} cy={190} r={3} fill="#64748b" />
        {/* Vertex labels */}
        <text x={150} y={20} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>A</text>
        <text x={45} y={198} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>B</text>
        <text x={255} y={198} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>C</text>
        <text x={150} y={210} textAnchor="middle" fill="#64748b" fontSize={13} fontWeight={700}>D</text>
      </svg>
    </div>
  );
}

function AdvancedParallelLinesDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>ישרים מקבילים וחותך -- זוויות</p>
      <svg width="100%" viewBox="0 0 320 220" style={{ maxWidth: "100%" }}>
        {/* Parallel line l1 */}
        <line x1={20} y1={50} x2={300} y2={50} stroke="#dc2626" strokeWidth={2} />
        <text x={305} y={54} fill="#dc2626" fontSize={12} fontWeight={700}>&#8467;&#8321;</text>
        {/* Parallel line l2 */}
        <line x1={20} y1={180} x2={300} y2={180} stroke="#dc2626" strokeWidth={2} />
        <text x={305} y={184} fill="#dc2626" fontSize={12} fontWeight={700}>&#8467;&#8322;</text>
        {/* Transversal t */}
        <line x1={100} y1={20} x2={200} y2={210} stroke="#64748b" strokeWidth={1.8} />
        <text x={95} y={16} fill="#64748b" fontSize={12} fontWeight={700}>t</text>
        {/* Points P and Q */}
        <circle cx={130} cy={50} r={4} fill="#dc2626" />
        <text x={118} y={42} textAnchor="middle" fill="#dc2626" fontSize={13} fontWeight={700}>P</text>
        <circle cx={173} cy={180} r={4} fill="#dc2626" />
        <text x={185} y={195} textAnchor="middle" fill="#dc2626" fontSize={13} fontWeight={700}>Q</text>
        {/* Point M between the lines */}
        <circle cx={180} cy={115} r={4} fill="#a78bfa" />
        <text x={194} y={112} textAnchor="middle" fill="#a78bfa" fontSize={13} fontWeight={700}>M</text>
        {/* Lines to M */}
        <line x1={130} y1={50} x2={180} y2={115} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />
        <line x1={173} y1={180} x2={180} y2={115} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />
        {/* Alternate interior angle arcs at P */}
        <path d="M 145 50 A 15 15 0 0 1 135 62" fill="none" stroke="#f59e0b" strokeWidth={1.8} />
        {/* Alternate interior angle arcs at Q */}
        <path d="M 158 180 A 15 15 0 0 0 168 168" fill="none" stroke="#34d399" strokeWidth={1.8} />
        {/* Parallel markers */}
        <line x1={155} y1={46} x2={160} y2={50} stroke="#dc2626" strokeWidth={1.5} />
        <line x1={155} y1={50} x2={160} y2={54} stroke="#dc2626" strokeWidth={1.5} />
        <line x1={155} y1={176} x2={160} y2={180} stroke="#dc2626" strokeWidth={1.5} />
        <line x1={155} y1={180} x2={160} y2={184} stroke="#dc2626" strokeWidth={1.5} />
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
        subjectWords={["הוכחה", "מקבילים", "זוויות", "משולש", "חותך", "ניצב"]}
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
  const [activeTab, setActiveTab] = useState<"parallelogram" | "isosceles" | "line" | "triangle" | null>(null);

  const tabs = [
    { id: "parallelogram" as const, label: "מקבילית",            tex: "AB \\parallel CD", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "isosceles" as const,     label: "שווה שוקיים",        tex: "\\angle B = \\angle C", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "line" as const,          label: "זוויות על ישר",      tex: "\\alpha + \\beta = 180°", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "triangle" as const,      label: "סכום זוויות",        tex: "\\alpha+\\beta+\\gamma=180°", color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Parallelogram */}
      {activeTab === "parallelogram" && (
        <motion.div key="parallelogram" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\text{AB} \\parallel \\text{CD},\\; \\text{AB} = \\text{CD}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> תכונות מקבילית:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>צלעות נגדיות מקבילות ושוות.</li>
                  <li>אלכסוני מקבילית חוצים זה את זה.</li>
                  <li>זוויות נגדיות שוות, זוויות סמוכות משלימות ל-180&#176;.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; אלכסוני מקבילית חוצים זה את זה -- כלומר נקודת החיתוך מחלקת כל אלכסון לשני חלקים שווים.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Isosceles */}
      {activeTab === "isosceles" && (
        <motion.div key="isosceles" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\angle B = \\angle C \\Leftrightarrow AB = AC"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> משולש שווה שוקיים:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אם שתי צלעות שוות -- זוויות הבסיס שוות.</li>
                  <li>אם זוויות הבסיס שוות -- הצלעות שמולן שוות (שווה שוקיים).</li>
                  <li>החציון לבסיס הוא גם גובה וגם חוצה זווית.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; זוויות בסיס שוות &#8660; שוקיים שוות -- זה עובד לשני הכיוונים!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Angles on a line */}
      {activeTab === "line" && (
        <motion.div key="line" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\alpha + \\beta = 180^\\circ"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> זוויות סמוכות על ישר:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>שתי זוויות סמוכות על ישר משלימות ל-180&#176;.</li>
                  <li>שימושי בהוכחות עם ישרים מקבילים וחותך.</li>
                  <li>זוויות קודקודיות שוות (מתקבל מכלל זה).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; זוויות סמוכות על ישר = 180&#176;. זה הבסיס להרבה הוכחות גיאומטריות.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Triangle angle sum */}
      {activeTab === "triangle" && (
        <motion.div key="triangle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\alpha + \\beta + \\gamma = 180^\\circ"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> סכום זוויות במשולש:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סכום שלוש הזוויות בכל משולש שווה ל-180&#176;.</li>
                  <li>אם ידועות שתי זוויות -- השלישית נקבעת חד-ערכית.</li>
                  <li>זווית חיצונית של משולש שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; סכום הזוויות במשולש = 180&#176;. זה המשפט הבסיסי ביותר בגיאומטריה.
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
    title: "הוכחת תכונות מקבילית",
    problem: "ABCD מקבילית.\n\nא. הוכיחו שהאלכסונים AC ו-BD חוצים זה את זה.\nב. אם הנקודה E היא אמצע AC -- הוכיחו ש-BE הוא חציון במשולש ABC.\nג. הוכיחו שהמשולשים \u25B3ABD ו-\u25B3CDB חופפים.",
    diagram: <BasicParallelogramDiagram />,
    pitfalls: [
      { title: "לא מספיק לכתוב \u0022כי זו מקבילית\u0022", text: "צריך לנמק כל שלב בהוכחה -- לציין איזה משפט או תכונה משמשים בכל מעבר." },
      { title: "חפיפה דורשת 3 תנאים", text: "ודאו שציינתם את משפט החפיפה המתאים (צ.ז.צ / ז.צ.ז / צ.צ.צ) והראיתם שכל שלושת התנאים מתקיימים." },
      { title: "AO = OC דורש נימוק", text: "אלכסוני מקבילית חוצים זה את זה -- זה לא מובן מאליו, צריך לנמק מדוע." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nABCD מקבילית. צריך להוכיח:\n1. שהאלכסונים חוצים זה את זה\n2. ש-BE חציון במשולש ABC (כש-E אמצע AC)\n3. שהמשולשים ABD ו-CDB חופפים\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- אלכסונים חוצים",
        coaching: "הוכח שנקודת החיתוך מחלקת כל אלכסון לשני חלקים שווים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nABCD מקבילית. תנחה אותי להוכיח שהאלכסונים AC ו-BD חוצים זה את זה. שאל אותי: אילו משולשים נוצרים מהאלכסונים? איזה משפט חפיפה מתאים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05D0\u05DC\u05DB\u05E1\u05D5\u05DF", "\u05D7\u05D5\u05E6\u05D4", "\u05D7\u05E4\u05D9\u05E4\u05D4"],
        keywordHint: "ציין שמדובר באלכסונים שחוצים זה את זה וחפיפה",
        contextWords: ["מקבילית", "אלכסון", "חפיפה", "חוצה", "משולש", "הוכחה"],
        stationWords: ["מקבילית", "אלכסון", "הוכחה"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- BE חציון",
        coaching: "השתמש בעובדה ש-E אמצע AC",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nABCD מקבילית והנקודה E היא אמצע AC. תנחה אותי להוכיח ש-BE הוא חציון במשולש ABC. שאל: מה ההגדרה של חציון? מה צריך להראות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05D7\u05E6\u05D9\u05D5\u05DF", "\u05D0\u05DE\u05E6\u05E2", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
        keywordHint: "ציין שצריך להראות ש-E אמצע הצלע",
        contextWords: ["מקבילית", "אלכסון", "חפיפה", "חוצה", "משולש", "הוכחה"],
        stationWords: ["מקבילית", "אלכסון", "הוכחה"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- חפיפת משולשים",
        coaching: "מצא 3 זוגות שווים ובחר משפט חפיפה",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nABCD מקבילית. תנחה אותי להוכיח שהמשולשים ABD ו-CDB חופפים. שאל: מה משותף לשני המשולשים? אילו צלעות שוות בגלל שזו מקבילית? איזה משפט חפיפה מתאים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05D7\u05E4\u05D9\u05E4\u05D4", "\u05DE\u05E9\u05D5\u05DC\u05E9\u05D9\u05DD", "\u05E6\u05DC\u05E2\u05D5\u05EA"],
        keywordHint: "ציין שצריך למצוא 3 זוגות שווים",
        contextWords: ["מקבילית", "אלכסון", "חפיפה", "חוצה", "משולש", "הוכחה"],
        stationWords: ["מקבילית", "אלכסון", "הוכחה"],
      },
    ],
  },
  {
    id: "medium",
    title: "הוכחות במשולש שווה שוקיים",
    problem: "במשולש ABC, הצלעות AB ו-AC שוות (משולש שווה שוקיים). הנקודה D היא אמצע BC.\n\nא. הוכיחו שהמשולשים \u25B3ABD ו-\u25B3ACD חופפים.\nב. הוכיחו ש-AD מאונך ל-BC.\nג. הוכיחו ש-AD חוצה את הזווית A.\nד. אם E נקודה על AD כך ש-AE = ED -- הוכיחו ש-BE = CE.",
    diagram: <MediumIsoscelesDiagram />,
    pitfalls: [
      { title: "AD משותף לשני המשולשים", text: "זו צלע משותפת -- אל תשכחו לציין אותה כאחד משלושת התנאים בחפיפה." },
      { title: "ניצבות דורשת הוכחה", text: "כדי להוכיח ש-AD ניצב ל-BC -- צריך להראות שזווית ADB = 90\u00B0. לא מספיק לומר \u0022נראה ניצב\u0022." },
      { title: "בסעיף ד -- השתמשו בתוצאות קודמות", text: "השתמשו בחפיפת \u25B3ABD \u2245 \u25B3ACD שכבר הוכחתם כדי לקצר את ההוכחה." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש ABC שווה שוקיים (AB = AC), הנקודה D אמצע BC.\nצריך להוכיח:\n1. \u25B3ABD \u2245 \u25B3ACD\n2. AD \u22A5 BC\n3. AD חוצה את זווית A\n4. אם E על AD כך ש-AE = ED, אז BE = CE\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- חפיפת משולשים",
        coaching: "מצא 3 זוגות שווים: AB=AC, BD=DC, AD משותף",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש ABC שווה שוקיים (AB=AC), D אמצע BC. תנחה אותי להוכיח ש-\u25B3ABD ו-\u25B3ACD חופפים. שאל: מה שלושת הזוגות השווים? איזה משפט חפיפה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05D7\u05E4\u05D9\u05E4\u05D4", "\u05DE\u05E9\u05D5\u05EA\u05E3", "\u05E6\u05DC\u05E2\u05D5\u05EA"],
        keywordHint: "ציין שצריך חפיפה עם צלע משותפת",
        contextWords: ["שווה שוקיים", "חפיפה", "אמצע", "ניצב", "חוצה זווית", "משותף"],
        stationWords: ["שווה שוקיים", "חפיפה", "הוכחה"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- AD ניצב ל-BC",
        coaching: "השתמש בחפיפה שהוכחת: זוויות מתאימות שוות וסכומן 180\u00B0",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nהוכחתי ש-\u25B3ABD \u2245 \u25B3ACD. עכשיו תנחה אותי להוכיח ש-AD מאונך ל-BC. שאל: מה נובע מהחפיפה לגבי הזוויות ADB ו-ADC? מה סכומן? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05E0\u05D9\u05E6\u05D1", "\u05D6\u05D5\u05D5\u05D9\u05EA", "90"],
        keywordHint: "ציין שצריך להראות שזווית = 90 מעלות",
        contextWords: ["שווה שוקיים", "חפיפה", "אמצע", "ניצב", "חוצה זווית", "משותף"],
        stationWords: ["שווה שוקיים", "חפיפה", "הוכחה"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- AD חוצה זווית A",
        coaching: "מהחפיפה: זווית BAD = זווית CAD",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nהוכחתי ש-\u25B3ABD \u2245 \u25B3ACD. תנחה אותי להוכיח ש-AD חוצה את זווית A. שאל: מה נובע מהחפיפה לגבי הזוויות BAD ו-CAD? מה המשמעות של \u0022חוצה זווית\u0022? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05D7\u05D5\u05E6\u05D4 \u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E9\u05D5\u05D5\u05EA", "\u05D7\u05E4\u05D9\u05E4\u05D4"],
        keywordHint: "ציין שצריך להוכיח שזוויות שוות",
        contextWords: ["שווה שוקיים", "חפיפה", "אמצע", "ניצב", "חוצה זווית", "משותף"],
        stationWords: ["שווה שוקיים", "חפיפה", "הוכחה"],
      },
      {
        phase: "\u05D3",
        label: "סעיף ד\u2019 -- BE = CE",
        coaching: "השתמש בחפיפה קודמת ובנקודה E",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש ABC שווה שוקיים, D אמצע BC, ו-E נקודה על AD כך ש-AE=ED. תנחה אותי להוכיח ש-BE=CE. שאל: אילו משולשים כדאי להשוות? מה ידוע מהסעיפים הקודמים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05D7\u05E4\u05D9\u05E4\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D4", "\u05E9\u05D5\u05D5\u05D4"],
        keywordHint: "ציין שצריך חפיפה עם הנקודה E",
        contextWords: ["שווה שוקיים", "חפיפה", "אמצע", "ניצב", "חוצה זווית", "משותף"],
        stationWords: ["שווה שוקיים", "חפיפה", "הוכחה"],
      },
    ],
  },
  {
    id: "advanced",
    title: "ישרים מקבילים, חותך וזוויות",
    problem: "ישרים \u2113\u2081 ו-\u2113\u2082 מקבילים. ישר t חותך אותם בנקודות P ו-Q בהתאמה. הנקודה M נמצאת בין \u2113\u2081 ל-\u2113\u2082 כך ש-\u2220MPQ + \u2220MQP = 180\u00B0 \u2212 \u2220PMQ.\n\nא. הוכיחו שסכום הזוויות במשולש PMQ שווה ל-180\u00B0.\nב. הוכיחו שאם \u2220MP\u2113\u2081 = \u2220MQ\u2113\u2082 (זוויות מתחלפות), אז PM = QM.\nג. הנקודה N נמצאת על \u2113\u2081 כך ש-NQ \u22A5 \u2113\u2082. הוכיחו ש-\u2220PNQ = \u2220NPQ + \u2220NQP \u2212 90\u00B0.\nד. הראו שאם PM חוצה את \u2220QP\u2113\u2081 ו-QM חוצה את \u2220PQ\u2113\u2082, אז \u2220PMQ = 90\u00B0.",
    diagram: <AdvancedParallelLinesDiagram />,
    pitfalls: [
      { title: "זוויות מתחלפות שוות רק כשהישרים מקבילים", text: "ודאו שציינתם את הנתון שהישרים מקבילים -- בלי זה אי אפשר להשתמש בתכונה." },
      { title: "בסעיף ד -- סכום זוויות הבסיס", text: "השתמשו בעובדה שסכום הזוויות ליד החותך = 180\u00B0, ואז חציין = 90\u00B0." },
      { title: "PM = QM דרך זוויות שוות", text: "כשמוכיחים PM = QM -- צריך להראות שהמשולש שווה שוקיים דרך זוויות שוות בבסיס." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- סכום זוויות במשולש",
        coaching: "הראה שהנתון שקול לסכום זוויות = 180\u00B0",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nישרים מקבילים \u2113\u2081 ו-\u2113\u2082, חותך t בנקודות P ו-Q. נקודה M ביניהם כך ש-\u2220MPQ + \u2220MQP = 180\u00B0 \u2212 \u2220PMQ. תנחה אותי להוכיח שסכום הזוויות במשולש PMQ = 180\u00B0. שאל: מה קורה אם מעבירים את \u2220PMQ לצד השני? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05E1\u05DB\u05D5\u05DD \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA", "\u05DE\u05E9\u05D5\u05DC\u05E9", "180"],
        keywordHint: "ציין שצריך להוכיח סכום זוויות = 180",
        contextWords: ["מקבילים", "חותך", "זוויות מתחלפות", "סכום זוויות", "חוצה", "משולש"],
        stationWords: ["מקבילים", "זוויות", "הוכחה"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- PM = QM",
        coaching: "זוויות מתחלפות שוות \u2192 משולש שווה שוקיים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nישרים מקבילים, חותך בנקודות P ו-Q, נקודה M ביניהם. נתון: \u2220MP\u2113\u2081 = \u2220MQ\u2113\u2082. תנחה אותי להוכיח ש-PM = QM. שאל: מה הקשר בין הזוויות המתחלפות לזוויות במשולש PMQ? אם זוויות הבסיס שוות -- מה נובע? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05E9\u05D5\u05D5\u05D4 \u05E9\u05D5\u05E7\u05D9\u05D9\u05DD", "\u05DE\u05EA\u05D7\u05DC\u05E4\u05D5\u05EA", "\u05E9\u05D5\u05D5\u05D5\u05EA"],
        keywordHint: "ציין שצריך זוויות מתחלפות ושווה שוקיים",
        contextWords: ["מקבילים", "חותך", "זוויות מתחלפות", "סכום זוויות", "חוצה", "משולש"],
        stationWords: ["מקבילים", "זוויות", "הוכחה"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- \u2220PNQ",
        coaching: "השתמש בסכום זוויות במשולש ובניצבות",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nN על \u2113\u2081 כך ש-NQ \u22A5 \u2113\u2082. תנחה אותי להוכיח ש-\u2220PNQ = \u2220NPQ + \u2220NQP \u2212 90\u00B0. שאל: מה ידוע על הזווית NQ\u2113\u2082? מה סכום הזוויות במשולש PNQ? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05E0\u05D9\u05E6\u05D1", "\u05E1\u05DB\u05D5\u05DD", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
        keywordHint: "ציין שצריך סכום זוויות עם ניצבות",
        contextWords: ["מקבילים", "חותך", "זוויות מתחלפות", "סכום זוויות", "חוצה", "משולש"],
        stationWords: ["מקבילים", "זוויות", "הוכחה"],
      },
      {
        phase: "\u05D3",
        label: "סעיף ד\u2019 -- \u2220PMQ = 90\u00B0",
        coaching: "חוצי זוויות + סכום זוויות = 180\u00B0 ליד החותך",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nPM חוצה את \u2220QP\u2113\u2081 ו-QM חוצה את \u2220PQ\u2113\u2082. תנחה אותי להוכיח ש-\u2220PMQ = 90\u00B0. שאל: מה סכום \u2220QP\u2113\u2081 + \u2220PQ\u2113\u2082? ואם לוקחים חצי מכל אחת? מה סכום הזוויות במשולש PMQ? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["\u05D7\u05D5\u05E6\u05D4", "90", "\u05E1\u05DB\u05D5\u05DD"],
        keywordHint: "ציין שצריך חוצי זוויות וסכום",
        contextWords: ["מקבילים", "חותך", "זוויות מתחלפות", "סכום זוויות", "חוצה", "משולש"],
        stationWords: ["מקבילים", "זוויות", "הוכחה"],
      },
    ],
  },
];

// ─── Geometry Proof Lab ─────────────────────────────────────────────────────

function GeometryProofLab() {
  const [angleA, setAngleA] = useState(80);
  const [baseLen, setBaseLen] = useState(120);

  // Calculate isosceles triangle
  const angleB = (180 - angleA) / 2;
  const angleC = angleB;

  // Triangle geometry based on angleA and baseLen
  const halfBase = baseLen / 2;
  const height = halfBase / Math.tan((angleB * Math.PI) / 180);
  const sideLen = halfBase / Math.sin((angleB * Math.PI) / 180);

  // SVG coordinates
  const svgW = 300, svgH = 220;
  const cx = svgW / 2;
  const baseY = 190;
  const topY = Math.max(20, baseY - Math.min(height * 0.9, 165));
  const bx = cx - Math.min(halfBase * 0.85, 130);
  const cxPt = cx + Math.min(halfBase * 0.85, 130);

  const isDefault = angleA === 80 && baseLen === 120;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת משולש שווה שוקיים</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />אינטראקטיבי</span>
      </div>

      {/* SVG Triangle */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Triangle */}
          <line x1={cx} y1={topY} x2={bx} y2={baseY} stroke="#ea580c" strokeWidth={2.2} />
          <line x1={cx} y1={topY} x2={cxPt} y2={baseY} stroke="#ea580c" strokeWidth={2.2} />
          <line x1={bx} y1={baseY} x2={cxPt} y2={baseY} stroke="#ea580c" strokeWidth={2.2} />
          {/* Height dashed */}
          <line x1={cx} y1={topY} x2={cx} y2={baseY} stroke="#64748b" strokeWidth={1.2} strokeDasharray="5,3" />
          {/* Right angle marker at D */}
          <rect x={cx} y={baseY - 8} width={8} height={8} fill="none" stroke="#64748b" strokeWidth={1} />
          {/* Tick marks for equal sides */}
          <line x1={(cx + bx) / 2 - 3} y1={(topY + baseY) / 2 - 3} x2={(cx + bx) / 2 + 3} y2={(topY + baseY) / 2 + 3} stroke="#ea580c" strokeWidth={2} />
          <line x1={(cx + bx) / 2 - 6} y1={(topY + baseY) / 2} x2={(cx + bx) / 2} y2={(topY + baseY) / 2 + 6} stroke="#ea580c" strokeWidth={2} />
          <line x1={(cx + cxPt) / 2 - 3} y1={(topY + baseY) / 2 + 3} x2={(cx + cxPt) / 2 + 3} y2={(topY + baseY) / 2 - 3} stroke="#ea580c" strokeWidth={2} />
          <line x1={(cx + cxPt) / 2} y1={(topY + baseY) / 2 + 6} x2={(cx + cxPt) / 2 + 6} y2={(topY + baseY) / 2} stroke="#ea580c" strokeWidth={2} />
          {/* Angle arcs */}
          <path d={`M ${cx - 12} ${topY + 18} A 15 15 0 0 1 ${cx + 12} ${topY + 18}`} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
          <path d={`M ${bx + 18} ${baseY} A 18 18 0 0 0 ${bx + 12} ${baseY - 14}`} fill="none" stroke="#34d399" strokeWidth={1.5} />
          <path d={`M ${cxPt - 18} ${baseY} A 18 18 0 0 1 ${cxPt - 12} ${baseY - 14}`} fill="none" stroke="#34d399" strokeWidth={1.5} />
          {/* Vertex labels */}
          <text x={cx} y={topY - 6} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>A</text>
          <text x={bx - 10} y={baseY + 4} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>B</text>
          <text x={cxPt + 10} y={baseY + 4} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>C</text>
          <text x={cx + 10} y={baseY + 14} fill="#64748b" fontSize={11} fontWeight={600}>D</text>
          {/* Angle value labels */}
          <text x={cx} y={topY + 30} textAnchor="middle" fill="#a78bfa" fontSize={10} fontWeight={700}>{angleA.toFixed(0)}\u00B0</text>
          <text x={bx + 28} y={baseY - 10} textAnchor="middle" fill="#34d399" fontSize={10} fontWeight={700}>{angleB.toFixed(1)}\u00B0</text>
          <text x={cxPt - 28} y={baseY - 10} textAnchor="middle" fill="#34d399" fontSize={10} fontWeight={700}>{angleC.toFixed(1)}\u00B0</text>
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>זווית A</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{angleA}\u00B0</span>
          </div>
          <input type="range" min={30} max={150} step={1} value={angleA}
            onChange={e => setAngleA(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#a78bfa" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>אורך בסיס</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{baseLen}</span>
          </div>
          <input type="range" min={50} max={200} step={1} value={baseLen}
            onChange={e => setBaseLen(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#ea580c" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>זווית A</p>
          <p style={{ fontFamily: "monospace", color: "#a78bfa", fontWeight: 700 }}>{angleA}\u00B0</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>זווית B (= C)</p>
          <p style={{ fontFamily: "monospace", color: "#34d399", fontWeight: 700 }}>{angleB.toFixed(1)}\u00B0</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>אורך בסיס</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{baseLen}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>גובה</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{height.toFixed(1)}</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#ea580c", fontWeight: 600 }}>שוק = {sideLen.toFixed(1)}</span> &nbsp;|&nbsp;
        <span style={{ color: "#a78bfa", fontWeight: 600 }}>A = {angleA}\u00B0</span> &nbsp;|&nbsp;
        <span style={{ color: "#34d399", fontWeight: 600 }}>B = C = {angleB.toFixed(1)}\u00B0</span> &nbsp;|&nbsp;
        סכום: {(angleA + angleB + angleC).toFixed(1)}\u00B0
      </div>

      <LabMessage text="שנו את הזווית וראו כיצד זוויות הבסיס משתנות -- שימו לב שהן תמיד שוות!" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GeometryProofsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>הוכחות גיאומטריות עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מקבילית, משולש שווה שוקיים, ישרים מקבילים וזוויות</p>
          </div>
          <Link
            href="/3u/topic/grade11/geometry"
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

        <SubtopicProgress subtopicId="3u/grade11/geometry/proofs" />

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
        <GeometryProofLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/geometry/proofs" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
