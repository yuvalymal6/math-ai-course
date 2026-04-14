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
  basic:    { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E8\u05D0\u05E9\u05D5\u05E0\u05D4", badge: "\u05DE\u05EA\u05D7\u05D9\u05DC",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E9\u05E0\u05D9\u05D9\u05D4",  badge: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "\u05EA\u05D7\u05E0\u05D4 \u05E9\u05DC\u05D9\u05E9\u05D9\u05EA", badge: "\u05DE\u05EA\u05E7\u05D3\u05DD",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "\u05DE\u05EA\u05D7\u05D9\u05DC",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "\u05DE\u05EA\u05E7\u05D3\u05DD",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG diagrams (silent -- no numbers, no answers) ──────────────────────────

function BasicParabolaDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>\u05DE\u05E1\u05DC\u05D5\u05DC \u05DB\u05D3\u05D5\u05E8 -- \u05DE\u05E1\u05DC\u05D5\u05DC \u05D6\u05E8\u05D9\u05E7\u05D4</p>
      <svg width="100%" viewBox="0 0 300 200" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={40} y1={170} x2={270} y2={170} stroke="#cbd5e1" strokeWidth={1.2} />
        <line x1={40} y1={190} x2={40} y2={20} stroke="#cbd5e1" strokeWidth={1.2} />
        <text x={274} y={174} fill="#94a3b8" fontSize={11}>\u05DE\u05E8\u05D7\u05E7</text>
        <text x={28} y={16} fill="#94a3b8" fontSize={11}>\u05D2\u05D5\u05D1\u05D4</text>
        {/* Parabola opening downward */}
        <path
          d="M 40,170 Q 80,160 110,100 Q 140,30 155,30 Q 170,30 200,100 Q 230,160 270,170"
          fill="none" stroke="#16a34a" strokeWidth={2}
        />
        {/* Vertex dot */}
        <circle cx={155} cy={30} r={4} fill="#16a34a" />
        <text x={160} y={24} fill="#16a34a" fontSize={10} fontWeight={600}>\u05E7\u05D3\u05E7\u05D5\u05D3</text>
        {/* X-intercept dots */}
        <circle cx={40} cy={170} r={3.5} fill="#16a34a" />
        <circle cx={270} cy={170} r={3.5} fill="#16a34a" />
      </svg>
    </div>
  );
}

function MediumParabolaDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E2\u05DC\u05D5\u05EA -- \u05DE\u05D5\u05D3\u05DC \u05E2\u05DC\u05D5\u05EA \u05D9\u05D9\u05E6\u05D5\u05E8</p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={40} y1={190} x2={270} y2={190} stroke="#cbd5e1" strokeWidth={1.2} />
        <line x1={40} y1={210} x2={40} y2={20} stroke="#cbd5e1" strokeWidth={1.2} />
        <text x={274} y={194} fill="#94a3b8" fontSize={11}>x</text>
        <text x={28} y={16} fill="#94a3b8" fontSize={11}>C(x)</text>
        {/* Parabola opening upward */}
        <path
          d="M 50,60 Q 80,160 120,190 Q 150,200 155,200 Q 160,200 190,190 Q 230,160 260,60"
          fill="none" stroke="#ea580c" strokeWidth={2}
        />
        {/* Vertex dot at bottom */}
        <circle cx={155} cy={200} r={4} fill="#ea580c" />
        <text x={160} y={214} fill="#ea580c" fontSize={10} fontWeight={600}>\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD</text>
        {/* Y-intercept */}
        <circle cx={40} cy={55} r={3.5} fill="#ea580c" />
        <text x={46} y={52} fill="#ea580c" fontSize={10}>C(0)</text>
        {/* Horizontal dashed line */}
        <line x1={50} y1={120} x2={260} y2={120} stroke="#ea580c" strokeWidth={1.2} strokeDasharray="5,4" />
        {/* Intersection dots */}
        <circle cx={88} cy={120} r={3} fill="#ea580c" />
        <circle cx={222} cy={120} r={3} fill="#ea580c" />
      </svg>
    </div>
  );
}

function AdvancedParabolaDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>\u05D2\u05E9\u05E8 \u05D1\u05E6\u05D5\u05E8\u05EA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 -- \u05DE\u05E6\u05D9\u05D0\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05D4</p>
      <svg width="100%" viewBox="0 0 320 200" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={30} y1={170} x2={290} y2={170} stroke="#cbd5e1" strokeWidth={1.2} />
        <line x1={30} y1={190} x2={30} y2={20} stroke="#cbd5e1" strokeWidth={1.2} />
        <text x={294} y={174} fill="#94a3b8" fontSize={11}>x</text>
        <text x={18} y={16} fill="#94a3b8" fontSize={11}>y</text>
        {/* Parabola opening downward through 3 marked points */}
        <path
          d="M 30,170 Q 80,120 120,60 Q 150,20 160,20 Q 170,20 200,60 Q 240,120 290,170"
          fill="none" stroke="#dc2626" strokeWidth={2}
        />
        {/* Three marked points (dots) */}
        <circle cx={30} cy={170} r={4} fill="#dc2626" />
        <text x={20} y={164} fill="#dc2626" fontSize={10} fontWeight={700}>A</text>
        <circle cx={160} cy={20} r={4} fill="#dc2626" />
        <text x={166} y={16} fill="#dc2626" fontSize={10} fontWeight={700}>B</text>
        <circle cx={290} cy={170} r={4} fill="#dc2626" />
        <text x={278} y={164} fill="#dc2626" fontSize={10} fontWeight={700}>C</text>
        {/* Vertical dashed line through vertex */}
        <line x1={160} y1={170} x2={160} y2={20} stroke="#dc2626" strokeWidth={1.2} strokeDasharray="4,3" />
        {/* Horizontal line */}
        <line x1={50} y1={90} x2={270} y2={90} stroke="#64748b" strokeWidth={1} strokeDasharray="5,4" />
      </svg>
    </div>
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
  const [text, setText]     = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);

  const validate = () => {
    if (text.trim().length < 20) {
      setResult({ score: 0, blocked: false, hint: "\u05D4\u05E0\u05D9\u05E1\u05D5\u05D7 \u05E7\u05E6\u05E8 \u05DE\u05D3\u05D9 -- \u05DB\u05EA\u05D5\u05D1 \u05DC\u05E4\u05D7\u05D5\u05EA 20 \u05EA\u05D5\u05D5\u05D9\u05DD." });
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
          placeholder="\u05E0\u05E1\u05D7 \u05DB\u05D0\u05DF \u05D0\u05EA \u05D4\u05E9\u05D0\u05DC\u05D4 \u05E9\u05DC\u05DA \u05DC-AI (\u05D1\u05E7\u05E9 \u05D4\u05DB\u05D5\u05D5\u05E0\u05D4, \u05DC\u05D0 \u05E4\u05EA\u05E8\u05D5\u05DF)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}>
              <span>\u05E6\u05D9\u05D5\u05DF \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; \u05D1\u05D3\u05D9\u05E7\u05EA AI \u05DE\u05D3\u05D5\u05DE\u05D4
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
              &#9989; \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05E6\u05D5\u05D9\u05DF! \u05E6\u05D9\u05D5\u05DF: <strong>{result!.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7 \u05DC-AI"}
            </button>
          </motion.div>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1</button>
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
      setResult({ score: 0, blocked: false, hint: "\u05D4\u05E0\u05D9\u05E1\u05D5\u05D7 \u05E7\u05E6\u05E8 \u05DE\u05D3\u05D9 -- \u05DB\u05EA\u05D5\u05D1 \u05DC\u05E4\u05D7\u05D5\u05EA 20 \u05EA\u05D5\u05D5\u05D9\u05DD." });
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
          placeholder="\u05DB\u05EA\u05D5\u05D1 \u05D0\u05EA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E9\u05DC\u05DA \u05DC\u05E1\u05E2\u05D9\u05E3 \u05D6\u05D4..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}>
              <span>\u05E6\u05D9\u05D5\u05DF</span>
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
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; \u05E0\u05D9\u05E1\u05D5\u05D7 \u05DE\u05E2\u05D5\u05DC\u05D4! \u05D4\u05E1\u05E2\u05D9\u05E3 \u05D4\u05D1\u05D0 \u05E0\u05E4\u05EA\u05D7.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7 \u05E0\u05D9\u05E1\u05D5\u05D7"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; \u05D1\u05D3\u05D9\u05E7\u05EA AI \u05DE\u05D3\u05D5\u05DE\u05D4
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
                  &#10003; \u05E1\u05D9\u05D9\u05DE\u05EA\u05D9 \u05E1\u05E2\u05D9\u05E3 \u05D6\u05D4
                </button>
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
        requiredPhrase="\u05E1\u05E8\u05D5\u05E7 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05E2\u05E6\u05D5\u05E8"
        subjectWords={["\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D2\u05D5\u05D1\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA", "\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD"]}
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; \u05D4\u05E9\u05D0\u05DC\u05D4</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7"}
          </button>
        </div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA \u05E0\u05E4\u05D5\u05E6\u05D5\u05EA</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; \u05DE\u05D3\u05E8\u05D9\u05DA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8\u05D9\u05DD</div>
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
  const [activeTab, setActiveTab] = useState<"general" | "vertex" | "vertexForm" | "discriminant" | null>(null);

  const tabs = [
    { id: "general" as const,      label: "\u05E6\u05D5\u05E8\u05D4 \u05DB\u05DC\u05DC\u05D9\u05EA",    tex: "y=ax^2+bx+c",                        color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "vertex" as const,       label: "\u05E7\u05D3\u05E7\u05D5\u05D3",           tex: "x_v=\\frac{-b}{2a}",                  color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "vertexForm" as const,   label: "\u05E6\u05D5\u05E8\u05EA \u05E7\u05D3\u05E7\u05D5\u05D3",    tex: "y=a(x-p)^2+q",                       color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "discriminant" as const, label: "\u05D3\u05D9\u05E1\u05E7\u05E8\u05D9\u05DE\u05D9\u05E0\u05E0\u05D8\u05D4",      tex: "\\Delta=b^2-4ac",                     color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>\u05E0\u05D5\u05E1\u05D7\u05D0\u05D5\u05EA</div>

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

      {/* Expanded: General form */}
      {activeTab === "general" && (
        <motion.div key="general" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"y = ax^2 + bx + c"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D4\u05E6\u05D5\u05E8\u05D4 \u05D4\u05DB\u05DC\u05DC\u05D9\u05EA \u05E9\u05DC \u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9\u05EA:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"a"}</InlineMath> \u05E7\u05D5\u05D1\u05E2 \u05DB\u05D9\u05D5\u05D5\u05DF \u05E4\u05EA\u05D9\u05D7\u05D4: <InlineMath>{"a > 0"}</InlineMath> \u2014 \u05DC\u05DE\u05E2\u05DC\u05D4, <InlineMath>{"a < 0"}</InlineMath> \u2014 \u05DC\u05DE\u05D8\u05D4.</li>
                  <li><InlineMath>{"c"}</InlineMath> = \u05E0\u05E7\u05D5\u05D3\u05EA \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 <InlineMath>{"y"}</InlineMath> (\u05D4\u05E6\u05D9\u05D1\u05D5 <InlineMath>{"x=0"}</InlineMath>).</li>
                  <li>\u05D4\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD \u05E0\u05DE\u05E6\u05D0\u05D9\u05DD \u05DE\u05D4\u05E6\u05D1\u05EA <InlineMath>{"y = 0"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; <InlineMath>{"a"}</InlineMath> \u05E7\u05D5\u05D1\u05E2 \u05D2\u05DD \u05D0\u05EA \u05E8\u05D5\u05D7\u05D1 \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4: <InlineMath>{"|a|"}</InlineMath> \u05D2\u05D3\u05D5\u05DC \u2192 \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E6\u05E8\u05D4.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Vertex */}
      {activeTab === "vertex" && (
        <motion.div key="vertex" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"x_v = \\frac{-b}{2a},\\quad y_v = f(x_v)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3 \u05D4\u05D5\u05D0 \u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05E7\u05D9\u05E6\u05D5\u05DF \u05E9\u05DC \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>\u05DB\u05E9 <InlineMath>{"a < 0"}</InlineMath> \u2014 \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3 \u05D4\u05D5\u05D0 \u05E0\u05E7\u05D5\u05D3\u05EA \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD.</li>
                  <li>\u05DB\u05E9 <InlineMath>{"a > 0"}</InlineMath> \u2014 \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3 \u05D4\u05D5\u05D0 \u05E0\u05E7\u05D5\u05D3\u05EA \u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD.</li>
                  <li>\u05E7\u05D5\u05D3\u05DD \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD <InlineMath>{"x_v"}</InlineMath>, \u05D0\u05D7&quot;\u05DB \u05DE\u05E6\u05D9\u05D1\u05D9\u05DD \u05D1\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05DC\u05E7\u05D1\u05DC\u05EA <InlineMath>{"y_v"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05D3\u05D9\u05D5\u05E7 \u05D1\u05D0\u05DE\u05E6\u05E2 \u05D1\u05D9\u05DF \u05E9\u05E0\u05D9 \u05D4\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD (\u05D0\u05DD \u05E7\u05D9\u05D9\u05DE\u05D9\u05DD).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Vertex form */}
      {activeTab === "vertexForm" && (
        <motion.div key="vertexForm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"y = a(x - p)^2 + q"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05E6\u05D5\u05E8\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3 \u05E9\u05DC \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>\u05D4\u05E7\u05D3\u05E7\u05D5\u05D3 \u05D4\u05D5\u05D0 \u05D4\u05E0\u05E7\u05D5\u05D3\u05D4 <InlineMath>{"(p, q)"}</InlineMath>.</li>
                  <li><InlineMath>{"a"}</InlineMath> \u05E7\u05D5\u05D1\u05E2 \u05D0\u05EA \u05E8\u05D5\u05D7\u05D1 \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05D5\u05DB\u05D9\u05D5\u05D5\u05DF \u05D4\u05E4\u05EA\u05D9\u05D7\u05D4.</li>
                  <li>\u05E9\u05D9\u05DE\u05D5 \u05DC\u05D1 \u05DC\u05E1\u05D9\u05DE\u05E0\u05D9\u05DD: <InlineMath>{"(x - p)"}</InlineMath> \u2014 \u05D0\u05DD <InlineMath>{"p"}</InlineMath> \u05E9\u05DC\u05D9\u05DC\u05D9, \u05D4\u05E1\u05D5\u05D2\u05E8\u05D9\u05D9\u05DD \u05D7\u05D9\u05D5\u05D1\u05D9\u05D9\u05DD.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; \u05DE\u05E2\u05D1\u05E8 \u05DE\u05E6\u05D5\u05E8\u05D4 \u05DB\u05DC\u05DC\u05D9\u05EA \u05DC\u05E6\u05D5\u05E8\u05EA \u05E7\u05D3\u05E7\u05D5\u05D3 = \u05D4\u05E9\u05DC\u05DE\u05D4 \u05DC\u05E8\u05D9\u05D1\u05D5\u05E2.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Discriminant */}
      {activeTab === "discriminant" && (
        <motion.div key="discriminant" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\Delta = b^2 - 4ac"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D4\u05D3\u05D9\u05E1\u05E7\u05E8\u05D9\u05DE\u05D9\u05E0\u05E0\u05D8\u05D4 \u05E7\u05D5\u05D1\u05E2\u05EA \u05D0\u05EA \u05DE\u05E1\u05E4\u05E8 \u05D4\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"\\Delta > 0"}</InlineMath> \u2014 \u05E9\u05E0\u05D9 \u05E9\u05D5\u05E8\u05E9\u05D9\u05DD \u05E9\u05D5\u05E0\u05D9\u05DD.</li>
                  <li><InlineMath>{"\\Delta = 0"}</InlineMath> \u2014 \u05E9\u05D5\u05E8\u05E9 \u05D0\u05D7\u05D3 (\u05DB\u05E4\u05D5\u05DC).</li>
                  <li><InlineMath>{"\\Delta < 0"}</InlineMath> \u2014 \u05D0\u05D9\u05DF \u05E9\u05D5\u05E8\u05E9\u05D9\u05DD \u05DE\u05DE\u05E9\u05D9\u05D9\u05DD (\u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05DC\u05D0 \u05D7\u05D5\u05EA\u05DB\u05EA \u05D0\u05EA \u05E6\u05D9\u05E8 x).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; \u05E9\u05D5\u05E8\u05E9\u05D9\u05DD: <InlineMath>{"x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}"}</InlineMath>
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
    title: "\u05DE\u05D5\u05D3\u05DC \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9 -- \u05D6\u05E8\u05D9\u05E7\u05EA \u05DB\u05D3\u05D5\u05E8",
    problem: "\u05DB\u05D3\u05D5\u05E8 \u05E0\u05D6\u05E8\u05E7 \u05DB\u05DC\u05E4\u05D9 \u05DE\u05E2\u05DC\u05D4. \u05D2\u05D5\u05D1\u05D4\u05D5 (\u05D1\u05DE\u05D8\u05E8\u05D9\u05DD) \u05D0\u05D7\u05E8\u05D9 t \u05E9\u05E0\u05D9\u05D5\u05EA \u05D4\u05D5\u05D0: h(t) = \u22125t\u00B2 + 20t.\n\n\u05D0. \u05DE\u05D4\u05D5 \u05D4\u05D2\u05D5\u05D1\u05D4 \u05D4\u05D4\u05EA\u05D7\u05DC\u05EA\u05D9 \u05E9\u05DC \u05D4\u05DB\u05D3\u05D5\u05E8 (\u05D1-t=0)?\n\u05D1. \u05DE\u05EA\u05D9 \u05D4\u05DB\u05D3\u05D5\u05E8 \u05DE\u05D2\u05D9\u05E2 \u05DC\u05D2\u05D5\u05D1\u05D4 \u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9? \u05DE\u05D4\u05D5 \u05D4\u05D2\u05D5\u05D1\u05D4?\n\u05D2. \u05DE\u05EA\u05D9 \u05D4\u05DB\u05D3\u05D5\u05E8 \u05D7\u05D5\u05D6\u05E8 \u05DC\u05E7\u05E8\u05E7\u05E2?",
    diagram: <BasicParabolaDiagram />,
    pitfalls: [
      { title: "h(0) = 0 \u2014 \u05D4\u05DB\u05D3\u05D5\u05E8 \u05D9\u05D5\u05E6\u05D0 \u05DE\u05D2\u05D5\u05D1\u05D4 \u05D4\u05E7\u05E8\u05E7\u05E2", text: "\u05D0\u05DD c \u2260 0, \u05D4\u05D2\u05D5\u05D1\u05D4 \u05D4\u05D4\u05EA\u05D7\u05DC\u05EA\u05D9 \u05E9\u05D5\u05E0\u05D4 \u05DE\u05D0\u05E4\u05E1." },
      { title: "\u05D2\u05D5\u05D1\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9 = \u05E7\u05D3\u05E7\u05D5\u05D3: t = \u2212b/2a = \u221220/(2\u00B7(\u22125)) = 2", text: "\u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05E9-a \u05E9\u05DC\u05D9\u05DC\u05D9." },
      { title: "\u05D7\u05D5\u05D6\u05E8 \u05DC\u05E7\u05E8\u05E7\u05E2: h(t) = 0 \u2192 \u22125t\u00B2 + 20t = 0 \u2192 t(\u22125t + 20) = 0 \u2192 t = 0 \u05D0\u05D5 t = 4", text: "" },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DB\u05D3\u05D5\u05E8 \u05E0\u05D6\u05E8\u05E7 \u05DB\u05DC\u05E4\u05D9 \u05DE\u05E2\u05DC\u05D4. \u05D2\u05D5\u05D1\u05D4\u05D5 \u05D0\u05D7\u05E8\u05D9 t \u05E9\u05E0\u05D9\u05D5\u05EA: h(t) = \u22125t\u00B2 + 20t.\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA:\n1. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D2\u05D5\u05D1\u05D4 \u05D4\u05EA\u05D7\u05DC\u05EA\u05D9\n2. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D2\u05D5\u05D1\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9 \u05D5\u05DE\u05EA\u05D9 \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD \u05D0\u05DC\u05D9\u05D5\n3. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05DE\u05EA\u05D9 \u05D4\u05DB\u05D3\u05D5\u05E8 \u05D7\u05D5\u05D6\u05E8 \u05DC\u05E7\u05E8\u05E7\u05E2\n\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05D2\u05D5\u05D1\u05D4 \u05D4\u05EA\u05D7\u05DC\u05EA\u05D9",
        coaching: "\u05D4\u05E6\u05D1 t = 0 \u05D1\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DB\u05D3\u05D5\u05E8 \u05E0\u05D6\u05E8\u05E7 \u05DB\u05DC\u05E4\u05D9 \u05DE\u05E2\u05DC\u05D4, h(t) = \u22125t\u00B2 + 20t. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05D2\u05D5\u05D1\u05D4 \u05D4\u05D4\u05EA\u05D7\u05DC\u05EA\u05D9 (\u05D1-t=0). \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05DE\u05E6\u05D9\u05D1\u05D9\u05DD? \u05DE\u05D4 \u05D4\u05EA\u05D5\u05E6\u05D0\u05D4 \u05D0\u05D5\u05DE\u05E8\u05EA? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05D2\u05D5\u05D1\u05D4", "\u05D4\u05E6\u05D1\u05D4", "\u05D4\u05EA\u05D7\u05DC\u05EA\u05D9"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05E6\u05D9\u05D1\u05D9\u05DD t=0 \u05DC\u05DE\u05E6\u05D9\u05D0\u05EA \u05D2\u05D5\u05D1\u05D4 \u05D4\u05EA\u05D7\u05DC\u05EA\u05D9",
        contextWords: ["\u05D2\u05D5\u05D1\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E9\u05D5\u05E8\u05E9", "\u05D6\u05DE\u05DF", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05D2\u05D5\u05D1\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9",
        coaching: "\u05DE\u05E6\u05D0 \u05D0\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3 \u05D5\u05D4\u05E6\u05D1 \u05D1\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\nh(t) = \u22125t\u00B2 + 20t. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05DE\u05EA\u05D9 \u05D4\u05DB\u05D3\u05D5\u05E8 \u05DE\u05D2\u05D9\u05E2 \u05DC\u05D2\u05D5\u05D1\u05D4 \u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9 \u05D5\u05DE\u05D4 \u05D4\u05D2\u05D5\u05D1\u05D4. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05E7\u05D3\u05E7\u05D5\u05D3? \u05DE\u05D4 \u05D4\u05E0\u05D5\u05E1\u05D7\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E0\u05D5\u05E1\u05D7\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05E7\u05D3\u05E7\u05D5\u05D3 \u05DC\u05D2\u05D5\u05D1\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9",
        contextWords: ["\u05D2\u05D5\u05D1\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E9\u05D5\u05E8\u05E9", "\u05D6\u05DE\u05DF", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- \u05D7\u05D6\u05E8\u05D4 \u05DC\u05E7\u05E8\u05E7\u05E2",
        coaching: "\u05E4\u05EA\u05D5\u05E8 h(t) = 0",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05DE\u05EA\u05D9 \u05D4\u05DB\u05D3\u05D5\u05E8 \u05D7\u05D5\u05D6\u05E8 \u05DC\u05E7\u05E8\u05E7\u05E2 (h(t)=0). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05E4\u05D5\u05EA\u05E8\u05D9\u05DD \u05D0\u05EA \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4? \u05D0\u05D9\u05D6\u05D4 \u05EA\u05E9\u05D5\u05D1\u05D4 \u05E8\u05DC\u05D5\u05D5\u05E0\u05D8\u05D9\u05EA? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E9\u05D5\u05E8\u05E9", "\u05E7\u05E8\u05E7\u05E2", "\u05E4\u05EA\u05D5\u05E8"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05E4\u05D5\u05EA\u05E8\u05D9\u05DD h(t)=0",
        contextWords: ["\u05D2\u05D5\u05D1\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E9\u05D5\u05E8\u05E9", "\u05D6\u05DE\u05DF", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
    ],
  },
  {
    id: "medium",
    title: "\u05DE\u05D5\u05D3\u05DC \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9 -- \u05E2\u05DC\u05D5\u05EA \u05D9\u05D9\u05E6\u05D5\u05E8",
    problem: "\u05E2\u05DC\u05D5\u05EA \u05D9\u05D9\u05E6\u05D5\u05E8 x \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA (\u05D1\u05D0\u05DC\u05E4\u05D9 \u20AA) \u05E0\u05D9\u05EA\u05E0\u05EA \u05E2\u05F4\u05D9: C(x) = 2x\u00B2 \u2212 40x + 250.\n\n\u05D0. \u05DE\u05D4\u05D9 \u05E2\u05DC\u05D5\u05EA \u05D4\u05D9\u05D9\u05E6\u05D5\u05E8 \u05E9\u05DC 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA?\n\u05D1. \u05DB\u05DE\u05D4 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05E6\u05E8\u05D9\u05DA \u05DC\u05D9\u05D9\u05E6\u05E8 \u05DB\u05D3\u05D9 \u05E9\u05D4\u05E2\u05DC\u05D5\u05EA \u05EA\u05D4\u05D9\u05D4 \u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05EA? \u05DE\u05D4\u05D9 \u05D4\u05E2\u05DC\u05D5\u05EA \u05D4\u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05EA?\n\u05D2. \u05E2\u05D1\u05D5\u05E8 \u05D0\u05D9\u05DC\u05D5 \u05DB\u05DE\u05D5\u05D9\u05D5\u05EA \u05D9\u05D9\u05E6\u05D5\u05E8 \u05D4\u05E2\u05DC\u05D5\u05EA \u05E0\u05DE\u05D5\u05DB\u05D4 \u05DE-200 \u05D0\u05DC\u05E3 \u20AA?\n\u05D3. \u05D0\u05DD \u05EA\u05E7\u05E6\u05D9\u05D1 \u05D4\u05D9\u05D9\u05E6\u05D5\u05E8 \u05D4\u05D5\u05D0 330 \u05D0\u05DC\u05E3 \u20AA \u2014 \u05DB\u05DE\u05D4 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05DC\u05DB\u05DC \u05D4\u05D9\u05D5\u05EA\u05E8 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D9\u05D9\u05E6\u05E8?",
    diagram: <MediumParabolaDiagram />,
    pitfalls: [
      { title: "C(5) = 2\u00B725 \u2212 40\u00B75 + 250 = 50 \u2212 200 + 250 = 100", text: "\u05D7\u05E9\u05D1\u05D5 \u05D1\u05D6\u05D4\u05D9\u05E8\u05D5\u05EA." },
      { title: "\u05E2\u05DC\u05D5\u05EA \u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05EA \u05D1\u05E7\u05D3\u05E7\u05D5\u05D3: x = 40/(2\u00B72) = 10 \u2192 C(10) = 200 \u2212 400 + 250 = 50", text: "" },
      { title: "C(x) < 200 \u2192 2x\u00B2\u221240x+50 < 0 \u2192 x\u00B2\u221220x+25 < 0", text: "\u05E4\u05EA\u05E8\u05D5 \u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E2\u05DC\u05D5\u05EA \u05D9\u05D9\u05E6\u05D5\u05E8 x \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA: C(x) = 2x\u00B2 \u2212 40x + 250.\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA:\n1. \u05DC\u05D7\u05E9\u05D1 C(5)\n2. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E2\u05DC\u05D5\u05EA \u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05EA \u05D1\u05E7\u05D3\u05E7\u05D5\u05D3\n3. \u05DC\u05E4\u05EA\u05D5\u05E8 \u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF C(x) < 200\n4. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05DB\u05DE\u05D5\u05EA \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9\u05EA \u05DC\u05EA\u05E7\u05E6\u05D9\u05D1 330\n\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05D7\u05D9\u05E9\u05D5\u05D1 C(5)",
        coaching: "\u05D4\u05E6\u05D1 x=5 \u05D1\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\nC(x) = 2x\u00B2 \u2212 40x + 250. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05E2\u05DC\u05D5\u05EA \u05D4\u05D9\u05D9\u05E6\u05D5\u05E8 \u05E9\u05DC 5 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05DE\u05E6\u05D9\u05D1\u05D9\u05DD? \u05D0\u05D9\u05DA \u05DE\u05D7\u05E9\u05D1\u05D9\u05DD \u05D1\u05D6\u05D4\u05D9\u05E8\u05D5\u05EA? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E2\u05DC\u05D5\u05EA", "\u05D4\u05E6\u05D1\u05D4", "\u05D9\u05D7\u05D9\u05D3\u05D5\u05EA"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05E6\u05D9\u05D1\u05D9\u05DD x=5 \u05D1\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05EA \u05D4\u05E2\u05DC\u05D5\u05EA",
        contextWords: ["\u05E2\u05DC\u05D5\u05EA", "\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05EA\u05E7\u05E6\u05D9\u05D1", "\u05D9\u05D9\u05E6\u05D5\u05E8"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05E2\u05DC\u05D5\u05EA \u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05EA",
        coaching: "\u05DE\u05E6\u05D0 \u05E7\u05D3\u05E7\u05D5\u05D3 \u05D5\u05D4\u05E6\u05D1 \u05D1\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\nC(x) = 2x\u00B2 \u2212 40x + 250. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05DB\u05DE\u05D4 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05DC\u05D9\u05D9\u05E6\u05E8 \u05DC\u05E2\u05DC\u05D5\u05EA \u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05EA. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05E7\u05D3\u05E7\u05D5\u05D3? \u05DE\u05D4 \u05D4\u05E0\u05D5\u05E1\u05D7\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E0\u05D5\u05E1\u05D7\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05E7\u05D3\u05E7\u05D5\u05D3 \u05DC\u05E2\u05DC\u05D5\u05EA \u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05EA",
        contextWords: ["\u05E2\u05DC\u05D5\u05EA", "\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05EA\u05E7\u05E6\u05D9\u05D1", "\u05D9\u05D9\u05E6\u05D5\u05E8"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- \u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF",
        coaching: "\u05E4\u05EA\u05D5\u05E8 C(x) < 200",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\nC(x) = 2x\u00B2 \u2212 40x + 250. \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E2\u05D1\u05D5\u05E8 \u05D0\u05D9\u05DC\u05D5 \u05DB\u05DE\u05D5\u05D9\u05D5\u05EA \u05D4\u05E2\u05DC\u05D5\u05EA \u05E0\u05DE\u05D5\u05DB\u05D4 \u05DE-200. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05DE\u05E2\u05D1\u05D9\u05E8\u05D9\u05DD \u05DC\u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF? \u05D0\u05D9\u05DA \u05E4\u05D5\u05EA\u05E8\u05D9\u05DD? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05EA\u05D5\u05E8"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05E4\u05D5\u05EA\u05E8\u05D9\u05DD \u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9",
        contextWords: ["\u05E2\u05DC\u05D5\u05EA", "\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05EA\u05E7\u05E6\u05D9\u05D1", "\u05D9\u05D9\u05E6\u05D5\u05E8"],
      },
      {
        phase: "\u05D3",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D3\u2019 -- \u05EA\u05E7\u05E6\u05D9\u05D1 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9",
        coaching: "\u05E4\u05EA\u05D5\u05E8 C(x) \u2264 330",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05EA\u05E7\u05E6\u05D9\u05D1 \u05D4\u05D9\u05D9\u05E6\u05D5\u05E8 330 \u05D0\u05DC\u05E3, C(x) = 2x\u00B2 \u2212 40x + 250. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05DB\u05DE\u05D4 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05DC\u05DB\u05DC \u05D4\u05D9\u05D5\u05EA\u05E8 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D9\u05D9\u05E6\u05E8. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05D6\u05D5 \u05DE\u05E9\u05D5\u05D5\u05D0\u05D4 \u05DC\u05E4\u05EA\u05D5\u05E8? \u05D0\u05D9\u05D6\u05D4 \u05EA\u05E9\u05D5\u05D1\u05D4 \u05E8\u05DC\u05D5\u05D5\u05E0\u05D8\u05D9\u05EA? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05EA\u05E7\u05E6\u05D9\u05D1", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05D9\u05D7\u05D9\u05D3\u05D5\u05EA"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05E4\u05D5\u05EA\u05E8\u05D9\u05DD C(x) \u2264 330",
        contextWords: ["\u05E2\u05DC\u05D5\u05EA", "\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05EA\u05E7\u05E6\u05D9\u05D1", "\u05D9\u05D9\u05E6\u05D5\u05E8"],
      },
    ],
  },
  {
    id: "advanced",
    title: "\u05DE\u05D5\u05D3\u05DC \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9 -- \u05D2\u05E9\u05E8 \u05D1\u05E6\u05D5\u05E8\u05EA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4",
    problem: "\u05D2\u05E9\u05E8 \u05D1\u05E6\u05D5\u05E8\u05EA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E2\u05D5\u05D1\u05E8 \u05D3\u05E8\u05DA \u05E9\u05DC\u05D5\u05E9 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA: A(0, 0), B(10, 12), C(20, 0).\n\n\u05D0. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 y = ax\u00B2 + bx + c.\n\u05D1. \u05DE\u05D4\u05D5 \u05D4\u05D2\u05D5\u05D1\u05D4 \u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9 \u05E9\u05DC \u05D4\u05D2\u05E9\u05E8? \u05D1\u05D0\u05D9\u05D6\u05D5 \u05E0\u05E7\u05D5\u05D3\u05D4?\n\u05D2. \u05DE\u05E9\u05D0\u05D9\u05EA \u05D1\u05D2\u05D5\u05D1\u05D4 8 \u05DE\u05D8\u05E8 \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05E2\u05D1\u05D5\u05E8 \u05DE\u05EA\u05D7\u05EA \u05DC\u05D2\u05E9\u05E8. \u05D1\u05D0\u05D9\u05DC\u05D5 \u05DE\u05E7\u05D5\u05DE\u05D5\u05EA \u05E2\u05DC \u05E6\u05D9\u05E8 x \u05D4\u05D9\u05D0 \u05D9\u05DB\u05D5\u05DC\u05D4 \u05DC\u05E2\u05D1\u05D5\u05E8?\n\u05D3. \u05D0\u05DD \u05E8\u05D5\u05E6\u05D9\u05DD \u05DC\u05D4\u05D2\u05D3\u05D9\u05DC \u05D0\u05EA \u05D2\u05D5\u05D1\u05D4 \u05D4\u05D2\u05E9\u05E8 \u05DC-16 \u05DE\u05D8\u05E8 \u05DE\u05D1\u05DC\u05D9 \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05EA \u05E8\u05D5\u05D7\u05D1\u05D5 \u2014 \u05DE\u05D4\u05D9 \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4 \u05D4\u05D7\u05D3\u05E9\u05D4?",
    diagram: <AdvancedParabolaDiagram />,
    pitfalls: [
      { title: "A(0,0) \u2192 c = 0. C(20,0) \u2192 400a + 20b = 0. B(10,12) \u2192 100a + 10b = 12", text: "\u05DE\u05E2\u05E8\u05DB\u05EA \u05E9\u05EA\u05D9 \u05DE\u05E9\u05D5\u05D5\u05D0\u05D5\u05EA." },
      { title: "\u05D4\u05D2\u05D5\u05D1\u05D4 \u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9 \u05D1\u05E7\u05D3\u05E7\u05D5\u05D3: x = 10 (\u05E6\u05D9\u05E8 \u05E1\u05D9\u05DE\u05D8\u05E8\u05D9\u05D4 \u05D1\u05D9\u05DF \u05D4\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD 0 \u05D5-20)", text: "" },
      { title: "\u05DE\u05E9\u05D0\u05D9\u05EA \u05D1\u05D2\u05D5\u05D1\u05D4 8: \u05E4\u05EA\u05E8\u05D5 ax\u00B2 + bx \u2265 8", text: "\u05DB\u05DC\u05D5\u05DE\u05E8, \u05DE\u05E6\u05D0\u05D5 \u05D4\u05D9\u05DB\u05DF \u05D4\u05D2\u05E9\u05E8 \u05D2\u05D1\u05D5\u05D4 \u05DE-8 \u05DE\u05D8\u05E8." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05DE\u05E6\u05D9\u05D0\u05EA \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4",
        coaching: "\u05D4\u05E6\u05D1 3 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D5\u05E4\u05EA\u05D5\u05E8 \u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05D5\u05EA",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D2\u05E9\u05E8 \u05D1\u05E6\u05D5\u05E8\u05EA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E2\u05D5\u05D1\u05E8 \u05D3\u05E8\u05DA A(0,0), B(10,12), C(20,0). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA a, b, c. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05E0\u05D5\u05EA\u05DF \u05DC\u05E0\u05D5 \u05D4\u05E0\u05EA\u05D5\u05DF A(0,0)? \u05D0\u05D9\u05D6\u05D5 \u05DE\u05E9\u05D5\u05D5\u05D0\u05D5\u05EA \u05E0\u05E7\u05D1\u05DC \u05DE\u05E9\u05D0\u05E8 \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05DE\u05E2\u05E8\u05DB\u05EA"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05E6\u05D9\u05D1\u05D9\u05DD 3 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D5\u05E4\u05D5\u05EA\u05E8\u05D9\u05DD \u05DE\u05E2\u05E8\u05DB\u05EA",
        contextWords: ["\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05D2\u05E9\u05E8", "\u05D2\u05D5\u05D1\u05D4", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05D2\u05D5\u05D1\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9",
        coaching: "\u05DE\u05E6\u05D0 \u05E7\u05D3\u05E7\u05D5\u05D3 \u05D5\u05D4\u05E6\u05D1 \u05D1\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05D2\u05D5\u05D1\u05D4 \u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9 \u05E9\u05DC \u05D4\u05D2\u05E9\u05E8. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05E7\u05D3\u05E7\u05D5\u05D3? \u05D0\u05D9\u05DA \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05E1\u05D9\u05DE\u05D8\u05E8\u05D9\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D2\u05D5\u05D1\u05D4", "\u05E1\u05D9\u05DE\u05D8\u05E8\u05D9\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05E7\u05D3\u05E7\u05D5\u05D3 \u05DC\u05D2\u05D5\u05D1\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9",
        contextWords: ["\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05D2\u05E9\u05E8", "\u05D2\u05D5\u05D1\u05D4", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- \u05DE\u05E9\u05D0\u05D9\u05EA \u05DE\u05EA\u05D7\u05EA \u05DC\u05D2\u05E9\u05E8",
        coaching: "\u05E4\u05EA\u05D5\u05E8 y \u2265 8",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E9\u05D0\u05D9\u05EA \u05D1\u05D2\u05D5\u05D1\u05D4 8 \u05DE\u05D8\u05E8 \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05E2\u05D1\u05D5\u05E8 \u05DE\u05EA\u05D7\u05EA \u05DC\u05D2\u05E9\u05E8. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05D6\u05D5 \u05DE\u05E9\u05D5\u05D5\u05D0\u05D4/\u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF \u05DC\u05E4\u05EA\u05D5\u05E8? \u05DE\u05D4 \u05D4\u05DE\u05E9\u05DE\u05E2\u05D5\u05EA? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05DE\u05E9\u05D0\u05D9\u05EA", "\u05D2\u05D5\u05D1\u05D4", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05E4\u05D5\u05EA\u05E8\u05D9\u05DD \u05D0\u05D9\u05E4\u05D4 \u05D4\u05D2\u05E9\u05E8 \u05D2\u05D1\u05D5\u05D4 \u05DE-8",
        contextWords: ["\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05D2\u05E9\u05E8", "\u05D2\u05D5\u05D1\u05D4", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
      {
        phase: "\u05D3",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D3\u2019 -- \u05DE\u05E9\u05D5\u05D5\u05D0\u05D4 \u05D7\u05D3\u05E9\u05D4",
        coaching: "\u05E9\u05E0\u05D4 \u05D0\u05EA a \u05DB\u05DA \u05E9\u05D4\u05D2\u05D5\u05D1\u05D4 \u05D4\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9 \u05D9\u05D4\u05D9\u05D4 16",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E8\u05D5\u05E6\u05D9\u05DD \u05DC\u05D4\u05D2\u05D3\u05D9\u05DC \u05D0\u05EA \u05D2\u05D5\u05D1\u05D4 \u05D4\u05D2\u05E9\u05E8 \u05DC-16 \u05DE\u05D8\u05E8 \u05DE\u05D1\u05DC\u05D9 \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05EA \u05E8\u05D5\u05D7\u05D1\u05D5. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05D6\u05D4 \u05E4\u05E8\u05DE\u05D8\u05E8 \u05DE\u05E9\u05EA\u05E0\u05D4? \u05D0\u05D9\u05D6\u05D4 \u05E0\u05E9\u05D0\u05E8\u05D9\u05DD \u05E7\u05D1\u05D5\u05E2\u05D9\u05DD? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E4\u05E8\u05DE\u05D8\u05E8", "\u05D2\u05D5\u05D1\u05D4", "\u05E8\u05D5\u05D7\u05D1"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05E9\u05E0\u05D9\u05DD \u05E4\u05E8\u05DE\u05D8\u05E8 \u05DC\u05D2\u05D5\u05D1\u05D4 \u05D7\u05D3\u05E9 \u05D1\u05DC\u05D9 \u05DC\u05E9\u05E0\u05D5\u05EA \u05E8\u05D5\u05D7\u05D1",
        contextWords: ["\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05D2\u05E9\u05E8", "\u05D2\u05D5\u05D1\u05D4", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
    ],
  },
];

// ─── Parabola Model Lab ─────────────────────────────────────────────────────

function ParabolaModelLab() {
  const [maxH, setMaxH] = useState(12);
  const [baseW, setBaseW] = useState(20);
  const [vShift, setVShift] = useState(0);

  // Compute a, b, c from parameters
  // Parabola: y = a(x - p)^2 + q where p = baseW/2, q = maxH + vShift
  // Roots at x=0 and x=baseW => a = -(maxH)/(baseW/2)^2 => a = -4*maxH/baseW^2
  const p = baseW / 2;
  const q = maxH + vShift;
  const a = -maxH / (p * p);
  const b = -2 * a * p;
  const c = vShift;

  // Roots (solving y = 0): ax^2 + bx + c = 0
  const disc = b * b - 4 * a * c;
  let root1 = 0, root2 = baseW;
  if (disc >= 0 && a !== 0) {
    root1 = (-b - Math.sqrt(disc)) / (2 * a);
    root2 = (-b + Math.sqrt(disc)) / (2 * a);
    if (root1 > root2) { const tmp = root1; root1 = root2; root2 = tmp; }
  }

  // Area under parabola (from root1 to root2 analytically = 2/3 * base * height)
  const effectiveBase = root2 - root1;
  const area = (2 / 3) * effectiveBase * q;

  // SVG mapping
  const svgW = 320, svgH = 240;
  const margin = 40;
  const plotW = svgW - 2 * margin;
  const plotH = svgH - 2 * margin;
  const xMin = Math.min(root1, -2) - 2;
  const xMax = Math.max(root2, baseW + 2) + 2;
  const yMin = Math.min(vShift, 0) - 2;
  const yMax = q + 4;
  const toSvgX = (x: number) => margin + ((x - xMin) / (xMax - xMin)) * plotW;
  const toSvgY = (y: number) => svgH - margin - ((y - yMin) / (yMax - yMin)) * plotH;

  // Generate parabola path
  const pts: string[] = [];
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const y = a * x * x + b * x + c;
    pts.push(`${toSvgX(x).toFixed(1)},${toSvgY(y).toFixed(1)}`);
  }
  const pathD = "M " + pts.join(" L ");

  const isDefault = maxH === 12 && baseW === 20 && vShift === 0;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; \u05DE\u05E2\u05D1\u05D3\u05EA \u05DE\u05D5\u05D3\u05DC \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />\u05D2\u05D5\u05D1\u05D4 = {q.toFixed(1)}</span>
      </div>

      {/* SVG -- parabola */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Axes */}
          <line x1={margin} y1={toSvgY(0)} x2={svgW - margin} y2={toSvgY(0)} stroke="#94a3b8" strokeWidth={1} />
          <line x1={toSvgX(0)} y1={margin} x2={toSvgX(0)} y2={svgH - margin} stroke="#94a3b8" strokeWidth={1} />
          <text x={svgW - margin + 5} y={toSvgY(0) - 4} fill="#64748b" fontSize={10} fontWeight={600}>x</text>
          <text x={toSvgX(0) + 6} y={margin - 4} fill="#64748b" fontSize={10} fontWeight={600}>y</text>

          {/* Parabola */}
          <path d={pathD} fill="none" stroke="#16a34a" strokeWidth={2} />

          {/* Vertex dot */}
          <circle cx={toSvgX(p)} cy={toSvgY(q)} r={4} fill="#16a34a" />
          <text x={toSvgX(p) + 6} y={toSvgY(q) - 6} fill="#16a34a" fontSize={9} fontWeight={700}>({p.toFixed(1)}, {q.toFixed(1)})</text>

          {/* Root dots */}
          {disc >= 0 && (
            <>
              <circle cx={toSvgX(root1)} cy={toSvgY(0)} r={3.5} fill="#ea580c" />
              <text x={toSvgX(root1)} y={toSvgY(0) + 14} textAnchor="middle" fill="#ea580c" fontSize={8} fontWeight={600}>{root1.toFixed(1)}</text>
              <circle cx={toSvgX(root2)} cy={toSvgY(0)} r={3.5} fill="#ea580c" />
              <text x={toSvgX(root2)} y={toSvgY(0) + 14} textAnchor="middle" fill="#ea580c" fontSize={8} fontWeight={600}>{root2.toFixed(1)}</text>
            </>
          )}

          {/* Axis of symmetry dashed */}
          <line x1={toSvgX(p)} y1={toSvgY(0)} x2={toSvgX(p)} y2={toSvgY(q)} stroke="#7c3aed" strokeWidth={1} strokeDasharray="4,3" />
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>\u05D2\u05D5\u05D1\u05D4 \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9</span>
            <span style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{maxH}</span>
          </div>
          <input type="range" min={5} max={30} step={1} value={maxH}
            onChange={e => setMaxH(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>\u05E8\u05D5\u05D7\u05D1 \u05D1\u05E1\u05D9\u05E1</span>
            <span style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{baseW}</span>
          </div>
          <input type="range" min={10} max={40} step={2} value={baseW}
            onChange={e => setBaseW(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#7c3aed" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>\u05D4\u05D6\u05D6\u05D4 \u05D0\u05E0\u05DB\u05D9\u05EA</span>
            <span style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{vShift}</span>
          </div>
          <input type="range" min={-5} max={10} step={1} value={vShift}
            onChange={e => setVShift(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>a</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{a.toFixed(3)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u05E7\u05D3\u05E7\u05D5\u05D3</p>
          <p style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>({p.toFixed(1)}, {q.toFixed(1)})</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{disc >= 0 ? `${root1.toFixed(1)}, ${root2.toFixed(1)}` : "\u05D0\u05D9\u05DF"}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u05E9\u05D8\u05D7 \u05DE\u05EA\u05D7\u05EA</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{area > 0 ? area.toFixed(1) : "\u2014"}</p>
        </div>
      </div>

      <LabMessage text="\u05E9\u05E0\u05D5 \u05D0\u05EA \u05D2\u05D5\u05D1\u05D4 \u05D4\u05D2\u05E9\u05E8 \u05D5\u05E8\u05D5\u05D7\u05D1\u05D5 \u05D5\u05E8\u05D0\u05D5 \u05DB\u05D9\u05E6\u05D3 \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4 \u05DE\u05E9\u05EA\u05E0\u05D4" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParabolaModelPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>\u05DE\u05D5\u05D3\u05DC \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05DB\u05DE\u05D5\u05D3\u05DC \u05DE\u05E2\u05D5\u05DC\u05DD \u05D4\u05D0\u05DE\u05D9\u05EA\u05D9, \u05DE\u05E6\u05D9\u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D5\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD</p>
          </div>
          <Link
            href="/3u/topic/grade12/parabola"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}
          >
            <span style={{ fontSize: 16 }}>{"\u2190"}</span>
            \u05D7\u05D6\u05E8\u05D4
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="3u/grade12/parabola/model" />

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
        <ParabolaModelLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade12/parabola/model" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
