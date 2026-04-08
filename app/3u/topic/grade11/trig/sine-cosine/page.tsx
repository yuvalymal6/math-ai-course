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

function BasicTriangleDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>
        \u05DE\u05E9\u05D5\u05DC\u05E9 ABC -- \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD
      </p>
      <svg width="100%" viewBox="0 0 280 220" style={{ maxWidth: "100%" }}>
        {/* Triangle */}
        <polygon points="140,30 40,190 240,190" fill="none" stroke="#16a34a" strokeWidth={2} />
        {/* Vertex labels */}
        <text x={140} y={22} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>A</text>
        <text x={28} y={200} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>B</text>
        <text x={252} y={200} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>C</text>
        {/* Side labels */}
        <text x={140} y={206} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>a</text>
        <text x={200} y={105} textAnchor="middle" fill="#f59e0b" fontSize={12} fontWeight={700}>b</text>
        <text x={80} y={105} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>c</text>
        {/* Angle arc at A */}
        <path d="M 130,50 A 20,20 0 0,1 150,50" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
        <text x={140} y={60} textAnchor="middle" fill="#f59e0b" fontSize={9} fontWeight={600}>A</text>
        {/* Highlighted side a (opposite to A) -- amber */}
        <line x1={40} y1={190} x2={240} y2={190} stroke="#f59e0b" strokeWidth={3} opacity={0.6} />
      </svg>
    </div>
  );
}

function MediumTriangleDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>
        \u05DE\u05E9\u05D5\u05DC\u05E9 ABC -- \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD
      </p>
      <svg width="100%" viewBox="0 0 280 220" style={{ maxWidth: "100%" }}>
        {/* Triangle */}
        <polygon points="70,40 30,190 260,190" fill="none" stroke="#ea580c" strokeWidth={2} />
        {/* Vertex labels */}
        <text x={70} y={30} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>A</text>
        <text x={18} y={200} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>B</text>
        <text x={272} y={200} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>C</text>
        {/* Side labels */}
        <text x={145} y={206} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>a</text>
        <text x={175} y={110} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>b</text>
        <text x={42} y={110} textAnchor="middle" fill="#64748b" fontSize={12} fontWeight={600}>c</text>
        {/* Angle arcs */}
        <path d="M 60,58 A 18,18 0 0,1 80,58" fill="none" stroke="#ea580c" strokeWidth={1.5} />
        <text x={70} y={68} textAnchor="middle" fill="#ea580c" fontSize={9} fontWeight={600}>A</text>
        <path d="M 42,178 A 14,14 0 0,0 38,190" fill="none" stroke="#64748b" strokeWidth={1.2} />
        <text x={48} y={180} textAnchor="middle" fill="#64748b" fontSize={9}>B</text>
        <path d="M 248,190 A 14,14 0 0,0 252,178" fill="none" stroke="#64748b" strokeWidth={1.2} />
        <text x={244} y={180} textAnchor="middle" fill="#64748b" fontSize={9}>C</text>
        {/* Highlighted angle A -- different color for "the angle being found" */}
        <path d="M 55,65 A 28,28 0 0,1 85,65" fill="none" stroke="#f59e0b" strokeWidth={2.5} opacity={0.5} />
      </svg>
    </div>
  );
}

function AdvancedQuadDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>
        \u05DE\u05E8\u05D5\u05D1\u05E2 ABCD \u05E2\u05DD \u05D0\u05DC\u05DB\u05E1\u05D5\u05DF BD
      </p>
      <svg width="100%" viewBox="0 0 300 240" style={{ maxWidth: "100%" }}>
        {/* Quadrilateral ABCD */}
        <polygon points="60,50 240,40 270,200 40,180" fill="none" stroke="#dc2626" strokeWidth={2} />
        {/* Diagonal BD */}
        <line x1={240} y1={40} x2={40} y2={180} stroke="#dc2626" strokeWidth={2} strokeDasharray="6,3" opacity={0.7} />
        {/* Vertex labels */}
        <text x={50} y={42} textAnchor="middle" fill="#dc2626" fontSize={14} fontWeight={700}>A</text>
        <text x={252} y={32} textAnchor="middle" fill="#dc2626" fontSize={14} fontWeight={700}>B</text>
        <text x={282} y={210} textAnchor="middle" fill="#dc2626" fontSize={14} fontWeight={700}>C</text>
        <text x={28} y={190} textAnchor="middle" fill="#dc2626" fontSize={14} fontWeight={700}>D</text>
        {/* Some side labels */}
        <text x={150} y={34} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>AB</text>
        <text x={130} y={125} textAnchor="middle" fill="#f59e0b" fontSize={12} fontWeight={700}>BD</text>
        <text x={265} y={125} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>BC</text>
        {/* Angle arc at B (ABD) */}
        <path d="M 222,54 A 18,18 0 0,0 228,72" fill="none" stroke="#f59e0b" strokeWidth={1.8} />
        {/* Angle arc at B (DBC) */}
        <path d="M 228,72 A 18,18 0 0,0 254,58" fill="none" stroke="#a78bfa" strokeWidth={1.8} />
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
        subjectWords={["\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05DE\u05E9\u05D5\u05DC\u05E9", "\u05E9\u05D8\u05D7", "\u05E6\u05DC\u05E2", "\u05D6\u05D5\u05D5\u05D9\u05EA"]}
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
  const [activeTab, setActiveTab] = useState<"sine" | "cosine" | "area" | "angle" | null>(null);

  const tabs = [
    { id: "sine" as const,   label: "\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",    tex: "\\frac{a}{\\sin A}",          color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "cosine" as const, label: "\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",  tex: "a^2 = b^2+c^2-2bc\\cos A", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "area" as const,   label: "\u05E9\u05D8\u05D7 \u05DE\u05E9\u05D5\u05DC\u05E9",     tex: "S=\\tfrac{1}{2}ab\\sin C",   color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "angle" as const,  label: "\u05D6\u05D5\u05D5\u05D9\u05EA \u05DE\u05E6\u05DC\u05E2\u05D5\u05EA",    tex: "\\cos A=\\tfrac{b^2+c^2-a^2}{2bc}", color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Sine Rule */}
      {activeTab === "sine" && (
        <motion.div key="sine" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D9\u05D7\u05E1 \u05E6\u05DC\u05E2 \u05DC\u05E1\u05D9\u05E0\u05D5\u05E1 \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05DE\u05D5\u05DC\u05D4 \u05E7\u05D1\u05D5\u05E2.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>\u05DB\u05DC \u05E6\u05DC\u05E2 \u05DE\u05D5\u05DC \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05DE\u05D5\u05DC\u05D4 -- \u05D0 \u05DE\u05D5\u05DC A, \u05D1 \u05DE\u05D5\u05DC B, \u05D2 \u05DE\u05D5\u05DC C.</li>
                  <li>\u05DE\u05E9\u05DE\u05E9 \u05DB\u05E9\u05D9\u05D3\u05D5\u05E2\u05D5\u05EA \u05E6\u05DC\u05E2 \u05D5\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05DE\u05D5\u05DC\u05D4, \u05D0\u05D5 \u05E9\u05EA\u05D9 \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA \u05D5\u05E6\u05DC\u05E2.</li>
                  <li>\u05DC\u05D0 \u05E2\u05D5\u05D1\u05D3 \u05DB\u05E9\u05D9\u05D3\u05D5\u05E2\u05D5\u05EA \u05E9\u05EA\u05D9 \u05E6\u05DC\u05E2\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3 -- \u05D7\u05D9\u05D9\u05D1\u05D9\u05DD \u05D2\u05DD \u05D6\u05D5\u05D5\u05D9\u05EA.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; \u05D8\u05D9\u05E4: \u05D0\u05DD \u05D9\u05D3\u05D5\u05E2\u05D5\u05EA \u05E9\u05EA\u05D9 \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA \u05D5\u05E6\u05DC\u05E2 \u05D0\u05D7\u05EA -- \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD \u05D4\u05D5\u05D0 \u05D4\u05DB\u05DC\u05D9 \u05D4\u05DE\u05EA\u05D0\u05D9\u05DD.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Cosine Rule */}
      {activeTab === "cosine" && (
        <motion.div key="cosine" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"a^2 = b^2 + c^2 - 2bc\\cos A"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D4\u05DB\u05DC\u05DC\u05D4 \u05E9\u05DC \u05E4\u05D9\u05EA\u05D2\u05D5\u05E8\u05E1 \u05DC\u05DE\u05E9\u05D5\u05DC\u05E9 \u05DB\u05DC\u05DC\u05D9.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>\u05DE\u05E9\u05DE\u05E9 \u05DB\u05E9\u05D9\u05D3\u05D5\u05E2\u05D5\u05EA \u05E9\u05EA\u05D9 \u05E6\u05DC\u05E2\u05D5\u05EA \u05D5\u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05D1\u05D9\u05E0\u05D9\u05D4\u05DF.</li>
                  <li>\u05DB\u05E9 <InlineMath>{"A=90^\\circ"}</InlineMath>, \u05DE\u05EA\u05E7\u05D1\u05DC <InlineMath>{"\\cos 90^\\circ=0"}</InlineMath> \u05D5\u05D7\u05D5\u05D6\u05E8\u05D9\u05DD \u05DC\u05E4\u05D9\u05EA\u05D2\u05D5\u05E8\u05E1.</li>
                  <li>\u05DE\u05D0\u05E4\u05E9\u05E8 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E6\u05DC\u05E2 \u05DB\u05E9\u05D9\u05D3\u05D5\u05E2\u05D5\u05EA \u05E9\u05DC\u05D5\u05E9 \u05E6\u05DC\u05E2\u05D5\u05EA, \u05D0\u05D5 \u05E6\u05DC\u05E2 \u05D5\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05D1\u05D9\u05E0\u05D9\u05D4\u05DF.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; \u05D8\u05D9\u05E4: \u05D0\u05DD <InlineMath>{"A>90^\\circ"}</InlineMath> \u05D0\u05D6 <InlineMath>{"\\cos A < 0"}</InlineMath> \u05D5\u05D4\u05D1\u05D9\u05D8\u05D5\u05D9 <InlineMath>{"-2bc\\cos A"}</InlineMath> \u05D4\u05D5\u05E4\u05DA \u05DC\u05D7\u05D9\u05D5\u05D1\u05D9 -- \u05D0\u05D6 <InlineMath>{"a^2 > b^2+c^2"}</InlineMath>.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Area */}
      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\frac{1}{2}ab\\sin C"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05E9\u05D8\u05D7 \u05DC\u05E4\u05D9 \u05E9\u05EA\u05D9 \u05E6\u05DC\u05E2\u05D5\u05EA \u05D5\u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05D1\u05D9\u05E0\u05D9\u05D4\u05DF.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>C \u05D4\u05D9\u05D0 \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9<strong>\u05D1\u05D9\u05DF</strong> \u05E9\u05EA\u05D9 \u05D4\u05E6\u05DC\u05E2\u05D5\u05EA a \u05D5-b.</li>
                  <li>\u05D4\u05E0\u05D5\u05E1\u05D7\u05D4 \u05E2\u05D5\u05D1\u05D3\u05EA \u05DC\u05DB\u05DC \u05D6\u05D5\u05D2 \u05E6\u05DC\u05E2\u05D5\u05EA \u05D5\u05D6\u05D5\u05D5\u05D9\u05EA \u05D1\u05D9\u05E0\u05D9\u05D4\u05DF.</li>
                  <li>\u05DC\u05D0 \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05DE\u05D5\u05DC \u05E6\u05DC\u05E2 -- \u05E8\u05E7 \u05D1\u05D6\u05D5\u05D5\u05D9\u05EA \u05D4\u05DB\u05DC\u05D5\u05D0\u05D4.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; \u05D8\u05E2\u05D5\u05EA \u05E0\u05E4\u05D5\u05E6\u05D4: \u05D0\u05DD \u05D9\u05D3\u05D5\u05E2\u05D5\u05EA a, b \u05D5\u05D4\u05D6\u05D5\u05D5\u05D9\u05EA A \u05E9\u05DE\u05D5\u05DC a -- \u05D6\u05D5 <strong>\u05DC\u05D0</strong> \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05D1\u05D9\u05E0\u05D9\u05D4\u05DF!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Angle from sides */}
      {activeTab === "angle" && (
        <motion.div key="angle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\cos A = \\frac{b^2 + c^2 - a^2}{2bc}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05DE\u05E6\u05D9\u05D0\u05EA \u05D6\u05D5\u05D5\u05D9\u05EA \u05DB\u05E9\u05D9\u05D3\u05D5\u05E2\u05D5\u05EA 3 \u05E6\u05DC\u05E2\u05D5\u05EA.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>\u05D4\u05E6\u05DC\u05E2 a \u05D4\u05D9\u05D0 \u05D4\u05E6\u05DC\u05E2 \u05E9<strong>\u05DE\u05D5\u05DC</strong> \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA A.</li>
                  <li>\u05D0\u05DD \u05D4\u05EA\u05D5\u05E6\u05D0\u05D4 \u05E9\u05DC\u05D9\u05DC\u05D9\u05EA -- \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E7\u05D4\u05D4. \u05D0\u05DD \u05D7\u05D9\u05D5\u05D1\u05D9\u05EA -- \u05D7\u05D3\u05D4.</li>
                  <li>\u05D6\u05D5 \u05E4\u05E9\u05D5\u05D8 \u05D4\u05E2\u05D1\u05E8\u05D4 \u05E9\u05DC \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD -- \u05D1\u05D5\u05D3\u05D3\u05D5 <InlineMath>{"\\cos A"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; \u05D8\u05D9\u05E4: \u05D0\u05DD <InlineMath>{"b^2+c^2 > a^2"}</InlineMath> \u2192 \u05D7\u05D3\u05D4. \u05D0\u05DD <InlineMath>{"b^2+c^2 = a^2"}</InlineMath> \u2192 \u05D9\u05E9\u05E8\u05D4. \u05D0\u05DD <InlineMath>{"b^2+c^2 < a^2"}</InlineMath> \u2192 \u05E7\u05D4\u05D4.
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
    title: "\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD -- \u05DE\u05E6\u05D9\u05D0\u05EA \u05E6\u05DC\u05E2 \u05D5\u05E9\u05D8\u05D7",
    problem: "\u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 ABC \u05D9\u05D3\u05D5\u05E2: \u2220A = 40\u00B0, \u2220B = 75\u00B0, a = 8 \u05E1\"\u05DE.\n\n\u05D0. \u05D7\u05E9\u05D1\u05D5 \u05D0\u05EA \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA C.\n\u05D1. \u05D7\u05E9\u05D1\u05D5 \u05D0\u05EA \u05D0\u05D5\u05E8\u05DA \u05D4\u05E6\u05DC\u05E2 b \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD.\n\u05D2. \u05D7\u05E9\u05D1\u05D5 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9.",
    diagram: <BasicTriangleDiagram />,
    pitfalls: [
      { title: "\u05E1\u05DB\u05D5\u05DD \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA \u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 = 180\u00B0", text: "\u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA C \u05DC\u05E4\u05E0\u05D9 \u05E9\u05DE\u05DE\u05E9\u05D9\u05DB\u05D9\u05DD -- \u05D1\u05DC\u05D9 C \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD." },
      { title: "\u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD: a/sinA = b/sinB", text: "\u05D5\u05D3\u05D0\u05D5 \u05E9\u05D4\u05E6\u05DC\u05E2 \u05DE\u05D5\u05DC \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05D4\u05E0\u05DB\u05D5\u05E0\u05D4 -- a \u05DE\u05D5\u05DC A, b \u05DE\u05D5\u05DC B." },
      { title: "\u05E9\u05D8\u05D7 = \u00BD\u00B7a\u00B7b\u00B7sinC", text: "\u05E6\u05E8\u05D9\u05DA \u05D0\u05EA \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05D1\u05D9\u05DF \u05E9\u05EA\u05D9 \u05D4\u05E6\u05DC\u05E2\u05D5\u05EA, \u05DC\u05D0 \u05DB\u05DC \u05D6\u05D5\u05D5\u05D9\u05EA." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 ABC \u05D9\u05D3\u05D5\u05E2: \u2220A = 40\u00B0, \u2220B = 75\u00B0, a = 8 \u05E1\"\u05DE.\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA:\n1. \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA C\n2. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA b \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD\n3. \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9\n\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05D7\u05D9\u05E9\u05D5\u05D1 \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA C",
        coaching: "\u05E1\u05DB\u05D5\u05DD \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA \u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 = 180\u00B0",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 ABC \u05D9\u05D3\u05D5\u05E2: \u2220A = 40\u00B0, \u2220B = 75\u00B0. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA C. \u05E9\u05D0\u05DC \u05D0\u05D5\u05EA\u05D9: \u05DE\u05D4 \u05E1\u05DB\u05D5\u05DD \u05D4\u05D6\u05D5\u05D5\u05D9\u05D5\u05EA \u05D1\u05DE\u05E9\u05D5\u05DC\u05E9? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E1\u05DB\u05D5\u05DD", "\u05D6\u05D5\u05D5\u05D9\u05D5\u05EA", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D3\u05D5\u05D1\u05E8 \u05D1\u05E1\u05DB\u05D5\u05DD \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA \u05D1\u05DE\u05E9\u05D5\u05DC\u05E9",
        contextWords: ["\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E6\u05DC\u05E2", "\u05E1\u05DB\u05D5\u05DD \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA", "\u05E9\u05D8\u05D7", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05DE\u05E6\u05D9\u05D0\u05EA b \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
        coaching: "\u05D4\u05E6\u05D1 \u05D1\u05E0\u05D5\u05E1\u05D7\u05D4 a/sinA = b/sinB \u05D5\u05D1\u05D5\u05D3\u05D3 b",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E6\u05D0\u05EA\u05D9 \u05E9-C = 65\u00B0. \u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA b \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD \u05DB\u05E9 a = 8 \u05D5-\u2220A = 40\u00B0 \u05D5-\u2220B = 75\u00B0. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05DC\u05D4\u05E6\u05D9\u05D1 \u05D1\u05E0\u05D5\u05E1\u05D7\u05D4 a/sinA = b/sinB? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E6\u05DC\u05E2", "\u05D4\u05E6\u05D1\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
        contextWords: ["\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E6\u05DC\u05E2", "\u05E1\u05DB\u05D5\u05DD \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA", "\u05E9\u05D8\u05D7", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9",
        coaching: "\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E0\u05D5\u05E1\u05D7\u05EA S = \u00BD\u00B7a\u00B7b\u00B7sinC",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA a \u05D5-b. \u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05D6\u05D5 \u05E0\u05D5\u05E1\u05D7\u05D4 \u05DE\u05EA\u05D0\u05D9\u05DE\u05D4? \u05D0\u05D9\u05D6\u05D5 \u05D6\u05D5\u05D5\u05D9\u05EA \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 -- \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05D1\u05D9\u05DF \u05E9\u05EA\u05D9 \u05D4\u05E6\u05DC\u05E2\u05D5\u05EA? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E9\u05D8\u05D7", "\u05E1\u05D9\u05E0\u05D5\u05E1", "\u05D6\u05D5\u05D5\u05D9\u05EA"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D7\u05E9\u05D1\u05D9\u05DD \u05E9\u05D8\u05D7 \u05E2\u05DD \u05E1\u05D9\u05E0\u05D5\u05E1",
        contextWords: ["\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E6\u05DC\u05E2", "\u05E1\u05DB\u05D5\u05DD \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA", "\u05E9\u05D8\u05D7", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
      },
    ],
  },
  {
    id: "medium",
    title: "\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD -- \u05DE\u05E6\u05D9\u05D0\u05EA \u05E6\u05DC\u05E2 \u05D5\u05D6\u05D5\u05D5\u05D9\u05EA",
    problem: "\u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 ABC \u05D9\u05D3\u05D5\u05E2: b = 7, c = 10, \u2220A = 60\u00B0.\n\n\u05D0. \u05D7\u05E9\u05D1\u05D5 \u05D0\u05EA \u05D0\u05D5\u05E8\u05DA \u05D4\u05E6\u05DC\u05E2 a \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD.\n\u05D1. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA B \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD.\n\u05D2. \u05D7\u05E9\u05D1\u05D5 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9.\n\u05D3. \u05D4\u05D0\u05DD \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9 \u05D7\u05D3-\u05D6\u05D5\u05D5\u05D9\u05EA, \u05D9\u05E9\u05E8-\u05D6\u05D5\u05D5\u05D9\u05EA \u05D0\u05D5 \u05E7\u05D4\u05D4-\u05D6\u05D5\u05D5\u05D9\u05EA? \u05E0\u05DE\u05E7\u05D5.",
    diagram: <MediumTriangleDiagram />,
    pitfalls: [
      { title: "a\u00B2 = b\u00B2 + c\u00B2 \u2212 2bc\u00B7cosA", text: "\u05D0\u05DC \u05EA\u05E9\u05DB\u05D7\u05D5 \u05D0\u05EA \u05D4\u05DE\u05D9\u05E0\u05D5\u05E1 \u05DC\u05E4\u05E0\u05D9 2bc\u00B7cosA -- \u05D4\u05D4\u05D5\u05E8\u05D3\u05D4 \u05D4\u05D9\u05D0 \u05D7\u05DC\u05E7 \u05DE\u05D4\u05E0\u05D5\u05E1\u05D7\u05D4." },
      { title: "cos60\u00B0 = 0.5", text: "\u05E2\u05E8\u05DA \u05DE\u05D3\u05D5\u05D9\u05E7, \u05D0\u05DC \u05EA\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05DE\u05D7\u05E9\u05D1\u05D5\u05DF \u05DE\u05D9\u05D5\u05EA\u05E8 -- \u05E4\u05E9\u05D5\u05D8 \u05EA\u05E6\u05D9\u05D1\u05D5 0.5." },
      { title: "\u05D1\u05E1\u05E2\u05D9\u05E3 \u05D3 -- \u05D4\u05E9\u05D5\u05D5\u05D0\u05EA a\u00B2 \u05DE\u05D5\u05DC b\u00B2+c\u00B2", text: "\u05D0\u05DD a\u00B2 < b\u00B2+c\u00B2 \u2192 \u05D7\u05D3, a\u00B2 = \u2192 \u05D9\u05E9\u05E8, a\u00B2 > \u2192 \u05E7\u05D4\u05D4." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 ABC \u05D9\u05D3\u05D5\u05E2: b = 7, c = 10, \u2220A = 60\u00B0.\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA:\n1. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA a \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD\n2. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA B \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD\n3. \u05DC\u05D7\u05E9\u05D1 \u05E9\u05D8\u05D7\n4. \u05DC\u05E7\u05D1\u05D5\u05E2 \u05D0\u05DD \u05D7\u05D3/\u05D9\u05E9\u05E8/\u05E7\u05D4\u05D4\n\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05DE\u05E6\u05D9\u05D0\u05EA a \u05D1\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
        coaching: "\u05D4\u05E6\u05D1 b,c,A \u05D1\u05E0\u05D5\u05E1\u05D7\u05D4 a\u00B2 = b\u00B2+c\u00B2\u22122bc\u00B7cosA",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 ABC \u05D9\u05D3\u05D5\u05E2: b = 7, c = 10, \u2220A = 60\u00B0. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA a \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05DA \u05DE\u05E6\u05D9\u05D1\u05D9\u05DD \u05D1\u05E0\u05D5\u05E1\u05D7\u05D4? \u05DE\u05D4 cos60\u00B0? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E6\u05DC\u05E2", "\u05D4\u05E6\u05D1\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
        contextWords: ["\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E6\u05DC\u05E2", "\u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E9\u05D8\u05D7", "\u05D7\u05D3 \u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E7\u05D4\u05D4"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05DE\u05E6\u05D9\u05D0\u05EA B \u05D1\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
        coaching: "\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1-a/sinA = b/sinB \u05DC\u05DE\u05E6\u05D5\u05D0 sinB \u05D5\u05D0\u05D6 B",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA a. \u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA B \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1-a/sinA = b/sinB \u05DB\u05D3\u05D9 \u05DC\u05D1\u05D5\u05D3\u05D3 sinB? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05D6\u05D5\u05D5\u05D9\u05EA", "\u05D1\u05D5\u05D3\u05D3"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D1\u05D5\u05D3\u05D3\u05D9\u05DD \u05D6\u05D5\u05D5\u05D9\u05EA \u05D1\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
        contextWords: ["\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E6\u05DC\u05E2", "\u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E9\u05D8\u05D7", "\u05D7\u05D3 \u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E7\u05D4\u05D4"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9",
        coaching: "S = \u00BD\u00B7b\u00B7c\u00B7sinA",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9 ABC \u05DB\u05E9\u05D9\u05D3\u05D5\u05E2 b = 7, c = 10, \u2220A = 60\u00B0. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05D6\u05D5 \u05E0\u05D5\u05E1\u05D7\u05D4 \u05DC\u05E9\u05D8\u05D7 \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9? \u05DE\u05D4 \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05D4\u05E0\u05DB\u05D5\u05E0\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E9\u05D8\u05D7", "\u05E1\u05D9\u05E0\u05D5\u05E1", "\u05E6\u05DC\u05E2\u05D5\u05EA"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D7\u05E9\u05D1\u05D9\u05DD \u05E9\u05D8\u05D7 \u05E2\u05DD \u05E6\u05DC\u05E2\u05D5\u05EA \u05D5\u05E1\u05D9\u05E0\u05D5\u05E1",
        contextWords: ["\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E6\u05DC\u05E2", "\u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E9\u05D8\u05D7", "\u05D7\u05D3 \u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E7\u05D4\u05D4"],
      },
      {
        phase: "\u05D3",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D3\u2019 -- \u05E1\u05D9\u05D5\u05D2 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9",
        coaching: "\u05D4\u05E9\u05D5\u05D5\u05D4 a\u00B2 \u05DE\u05D5\u05DC b\u00B2+c\u00B2",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA a \u05D5\u05D7\u05D9\u05E9\u05D1\u05EA\u05D9 \u05D0\u05EA \u05D4\u05E9\u05D8\u05D7. \u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05E7\u05D1\u05D5\u05E2 \u05D0\u05DD \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9 \u05D7\u05D3-\u05D6\u05D5\u05D5\u05D9\u05EA, \u05D9\u05E9\u05E8-\u05D6\u05D5\u05D5\u05D9\u05EA \u05D0\u05D5 \u05E7\u05D4\u05D4-\u05D6\u05D5\u05D5\u05D9\u05EA. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05D1\u05D5\u05D3\u05E7\u05D9\u05DD \u05E1\u05D5\u05D2 \u05DE\u05E9\u05D5\u05DC\u05E9 \u05DC\u05E4\u05D9 a\u00B2 \u05DE\u05D5\u05DC b\u00B2+c\u00B2? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05D7\u05D3", "\u05E7\u05D4\u05D4", "\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05E9\u05D5\u05D5\u05D9\u05DD \u05DC\u05E7\u05D1\u05D5\u05E2 \u05E1\u05D5\u05D2 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9",
        contextWords: ["\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E6\u05DC\u05E2", "\u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E9\u05D8\u05D7", "\u05D7\u05D3 \u05D6\u05D5\u05D5\u05D9\u05EA", "\u05E7\u05D4\u05D4"],
      },
    ],
  },
  {
    id: "advanced",
    title: "\u05DE\u05E8\u05D5\u05D1\u05E2 \u05E2\u05DD \u05D0\u05DC\u05DB\u05E1\u05D5\u05DF -- \u05E9\u05D9\u05DC\u05D5\u05D1 \u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD \u05D5\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
    problem: "\u05D1\u05DE\u05E8\u05D5\u05D1\u05E2 ABCD, \u05D4\u05D0\u05DC\u05DB\u05E1\u05D5\u05DF BD \u05DE\u05D7\u05DC\u05E7 \u05D0\u05D5\u05EA\u05D5 \u05DC\u05E9\u05E0\u05D9 \u05DE\u05E9\u05D5\u05DC\u05E9\u05D9\u05DD. \u05D9\u05D3\u05D5\u05E2: AB = 6, BD = 8, \u2220ABD = 50\u00B0, BC = 9, \u2220DBC = 35\u00B0.\n\n\u05D0. \u05D7\u05E9\u05D1\u05D5 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05DE\u05E9\u05D5\u05DC\u05E9 ABD.\n\u05D1. \u05D7\u05E9\u05D1\u05D5 \u05D0\u05EA \u05D0\u05D5\u05E8\u05DA AD \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD.\n\u05D2. \u05D7\u05E9\u05D1\u05D5 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05DE\u05E9\u05D5\u05DC\u05E9 BCD.\n\u05D3. \u05DE\u05D4\u05D5 \u05D4\u05E9\u05D8\u05D7 \u05D4\u05DB\u05D5\u05DC\u05DC \u05E9\u05DC \u05D4\u05DE\u05E8\u05D5\u05D1\u05E2 ABCD?",
    diagram: <AdvancedQuadDiagram />,
    pitfalls: [
      { title: "\u05E9\u05D8\u05D7 \u25B3ABD = \u00BD\u00B7AB\u00B7BD\u00B7sin(\u2220ABD)", text: "\u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05D1\u05D9\u05DF \u05E9\u05EA\u05D9 \u05D4\u05E6\u05DC\u05E2\u05D5\u05EA \u05D4\u05D9\u05D3\u05D5\u05E2\u05D5\u05EA." },
      { title: "\u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 BCD -- \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05D1\u05D9\u05DF BC \u05DC-BD \u05D4\u05D9\u05D0 \u2220DBC = 35\u00B0", text: "\u05DC\u05D0 \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA C \u05E9\u05DC \u05D4\u05DE\u05E8\u05D5\u05D1\u05E2." },
      { title: "\u05E9\u05D8\u05D7 \u05D4\u05DE\u05E8\u05D5\u05D1\u05E2 = \u05E1\u05DB\u05D5\u05DD \u05E9\u05D8\u05D7\u05D9 \u05E9\u05E0\u05D9 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9\u05D9\u05DD", text: "\u05D0\u05DC \u05EA\u05D7\u05E9\u05D1\u05D5 \u05E4\u05E2\u05DE\u05D9\u05D9\u05DD \u05D0\u05EA \u05D4\u05D0\u05DC\u05DB\u05E1\u05D5\u05DF." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05E9\u05D8\u05D7 \u05DE\u05E9\u05D5\u05DC\u05E9 ABD",
        coaching: "S = \u00BD\u00B7AB\u00B7BD\u00B7sin(\u2220ABD)",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D1\u05DE\u05E8\u05D5\u05D1\u05E2 ABCD, \u05D4\u05D0\u05DC\u05DB\u05E1\u05D5\u05DF BD \u05DE\u05D7\u05DC\u05E7 \u05D0\u05D5\u05EA\u05D5 \u05DC\u05E9\u05E0\u05D9 \u05DE\u05E9\u05D5\u05DC\u05E9\u05D9\u05DD. \u05D9\u05D3\u05D5\u05E2: AB = 6, BD = 8, \u2220ABD = 50\u00B0. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05DE\u05E9\u05D5\u05DC\u05E9 ABD. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05D6\u05D5 \u05E0\u05D5\u05E1\u05D7\u05D4 \u05DC\u05E9\u05D8\u05D7? \u05D0\u05D9\u05D6\u05D5 \u05D6\u05D5\u05D5\u05D9\u05EA \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E9\u05D8\u05D7", "\u05E1\u05D9\u05E0\u05D5\u05E1", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D7\u05E9\u05D1\u05D9\u05DD \u05E9\u05D8\u05D7 \u05DE\u05E9\u05D5\u05DC\u05E9 \u05E2\u05DD \u05E1\u05D9\u05E0\u05D5\u05E1",
        contextWords: ["\u05DE\u05E8\u05D5\u05D1\u05E2", "\u05D0\u05DC\u05DB\u05E1\u05D5\u05DF", "\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E9\u05D8\u05D7", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05DE\u05E6\u05D9\u05D0\u05EA AD \u05D1\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
        coaching: "AD\u00B2 = AB\u00B2 + BD\u00B2 \u2212 2\u00B7AB\u00B7BD\u00B7cos(\u2220ABD)",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 ABD \u05D9\u05D3\u05D5\u05E2: AB = 6, BD = 8, \u2220ABD = 50\u00B0. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA AD \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05DA \u05DE\u05E6\u05D9\u05D1\u05D9\u05DD \u05D1\u05E0\u05D5\u05E1\u05D7\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E6\u05DC\u05E2", "\u05D4\u05E6\u05D1\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05E6\u05D9\u05D1\u05D9\u05DD \u05D1\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD",
        contextWords: ["\u05DE\u05E8\u05D5\u05D1\u05E2", "\u05D0\u05DC\u05DB\u05E1\u05D5\u05DF", "\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E9\u05D8\u05D7", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- \u05E9\u05D8\u05D7 \u05DE\u05E9\u05D5\u05DC\u05E9 BCD",
        coaching: "S = \u00BD\u00B7BC\u00B7BD\u00B7sin(\u2220DBC)",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05DE\u05E9\u05D5\u05DC\u05E9 BCD. \u05D9\u05D3\u05D5\u05E2: BC = 9, BD = 8, \u2220DBC = 35\u00B0. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05D6\u05D5 \u05E6\u05DC\u05E2\u05D5\u05EA \u05D5\u05D0\u05D9\u05D6\u05D5 \u05D6\u05D5\u05D5\u05D9\u05EA \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E9\u05D8\u05D7", "\u05E6\u05DC\u05E2\u05D5\u05EA", "\u05D6\u05D5\u05D5\u05D9\u05EA"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D7\u05E9\u05D1\u05D9\u05DD \u05E9\u05D8\u05D7 \u05E2\u05DD \u05E6\u05DC\u05E2\u05D5\u05EA \u05D5\u05D6\u05D5\u05D5\u05D9\u05EA",
        contextWords: ["\u05DE\u05E8\u05D5\u05D1\u05E2", "\u05D0\u05DC\u05DB\u05E1\u05D5\u05DF", "\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E9\u05D8\u05D7", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
      },
      {
        phase: "\u05D3",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D3\u2019 -- \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E8\u05D5\u05D1\u05E2",
        coaching: "\u05E9\u05D8\u05D7 ABCD = \u05E9\u05D8\u05D7 ABD + \u05E9\u05D8\u05D7 BCD",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9\u05D0 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D7\u05D9\u05E9\u05D1\u05EA\u05D9 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05E9\u05E0\u05D9 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9\u05D9\u05DD. \u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05E9\u05D8\u05D7 \u05D4\u05DE\u05E8\u05D5\u05D1\u05E2 ABCD. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05DE\u05D7\u05D1\u05E8\u05D9\u05DD \u05D0\u05EA \u05D4\u05E9\u05D8\u05D7\u05D9\u05DD? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E1\u05DB\u05D5\u05DD", "\u05E9\u05D8\u05D7\u05D9\u05DD", "\u05DE\u05E8\u05D5\u05D1\u05E2"],
        keywordHint: "\u05E6\u05D9\u05D9\u05DF \u05E9\u05DE\u05D7\u05D1\u05E8\u05D9\u05DD \u05E9\u05D8\u05D7\u05D9 \u05DE\u05E9\u05D5\u05DC\u05E9\u05D9\u05DD",
        contextWords: ["\u05DE\u05E8\u05D5\u05D1\u05E2", "\u05D0\u05DC\u05DB\u05E1\u05D5\u05DF", "\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD", "\u05E9\u05D8\u05D7", "\u05DE\u05E9\u05D5\u05DC\u05E9"],
      },
    ],
  },
];

// ─── Trig Lab ────────────────────────────────────────────────────────────────

function TrigLab() {
  const [sideA, setSideA] = useState(7);
  const [sideB, setSideB] = useState(10);
  const [angleC, setAngleC] = useState(60);

  const cRad = (angleC * Math.PI) / 180;
  const sideC = Math.sqrt(sideA * sideA + sideB * sideB - 2 * sideA * sideB * Math.cos(cRad));
  const area = 0.5 * sideA * sideB * Math.sin(cRad);

  // Angle A via sine rule: sinA/a = sinC/c
  const sinA = (sideA * Math.sin(cRad)) / sideC;
  const angleA = Math.asin(Math.min(1, Math.max(-1, sinA))) * (180 / Math.PI);
  const angleB = 180 - angleC - angleA;

  // Triangle SVG coordinates
  const svgW = 300, svgH = 220, pad = 30;
  // Place C at bottom-left, B at bottom-right, A at top
  const scale = (svgW - 2 * pad) / Math.max(sideA, sideB, sideC) * 0.8;
  const Cx = pad + 20;
  const Cy = svgH - pad;
  const Bx = Cx + sideA * scale;
  const By = Cy;
  const Ax = Cx + sideB * scale * Math.cos(cRad);
  const Ay = Cy - sideB * scale * Math.sin(cRad);

  const isDefault = Math.abs(sideA - 7) < 0.3 && Math.abs(sideB - 10) < 0.3 && Math.abs(angleC - 60) < 1;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; \u05E1\u05D9\u05DE\u05D5\u05DC\u05D8\u05D5\u05E8 \u05DE\u05E9\u05D5\u05DC\u05E9</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />c = {sideC.toFixed(2)}</span>
      </div>

      {/* SVG Triangle */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Triangle */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="rgba(22,163,74,0.06)" stroke="#16a34a" strokeWidth={2} />
          {/* Vertex labels */}
          <text x={Ax} y={Ay - 8} textAnchor="middle" fill="#16a34a" fontSize={13} fontWeight={700}>A</text>
          <text x={Bx + 10} y={By + 4} textAnchor="start" fill="#16a34a" fontSize={13} fontWeight={700}>B</text>
          <text x={Cx - 10} y={Cy + 4} textAnchor="end" fill="#16a34a" fontSize={13} fontWeight={700}>C</text>
          {/* Side labels */}
          <text x={(Bx + Cx) / 2} y={By + 18} textAnchor="middle" fill="#ea580c" fontSize={11} fontWeight={600}>a = {sideA}</text>
          <text x={(Ax + Cx) / 2 - 14} y={(Ay + Cy) / 2} textAnchor="end" fill="#64748b" fontSize={11} fontWeight={600}>b = {sideB}</text>
          <text x={(Ax + Bx) / 2 + 14} y={(Ay + By) / 2} textAnchor="start" fill="#7c3aed" fontSize={11} fontWeight={600}>c = {sideC.toFixed(1)}</text>
          {/* Angle arc at C */}
          <path d={`M ${Cx + 18},${Cy} A 18,18 0 0,0 ${Cx + 18 * Math.cos(cRad)},${Cy - 18 * Math.sin(cRad)}`} fill="none" stroke="#dc2626" strokeWidth={1.5} />
          <text x={Cx + 28 * Math.cos(cRad / 2)} y={Cy - 28 * Math.sin(cRad / 2)} textAnchor="middle" fill="#dc2626" fontSize={9} fontWeight={600}>{angleC}\u00B0</text>
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>\u05E6\u05DC\u05E2 a</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{sideA}</span>
          </div>
          <input type="range" min={3} max={15} step={0.5} value={sideA}
            onChange={e => setSideA(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#ea580c" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>\u05E6\u05DC\u05E2 b</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{sideB}</span>
          </div>
          <input type="range" min={3} max={15} step={0.5} value={sideB}
            onChange={e => setSideB(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>\u05D6\u05D5\u05D5\u05D9\u05EA C</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{angleC}\u00B0</span>
          </div>
          <input type="range" min={10} max={170} step={1} value={angleC}
            onChange={e => setAngleC(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u05E6\u05DC\u05E2 c</p>
          <p style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{sideC.toFixed(2)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u05E9\u05D8\u05D7</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{area.toFixed(2)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u2220A</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{angleA.toFixed(1)}\u00B0</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u2220B</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{angleB.toFixed(1)}\u00B0</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#16a34a", fontWeight: 600 }}>a={sideA}, b={sideB}, C={angleC}\u00B0</span> &nbsp;|&nbsp;
        c = <span style={{ color: "#7c3aed", fontWeight: 600 }}>{sideC.toFixed(2)}</span> &nbsp;|&nbsp;
        S = <span style={{ color: "#ea580c", fontWeight: 600 }}>{area.toFixed(2)}</span> &nbsp;|&nbsp;
        {angleC < 90 ? "\u05D7\u05D3-\u05D6\u05D5\u05D5\u05D9\u05EA" : angleC === 90 ? "\u05D9\u05E9\u05E8-\u05D6\u05D5\u05D5\u05D9\u05EA" : "\u05E7\u05D4\u05D4-\u05D6\u05D5\u05D5\u05D9\u05EA"}
      </div>

      <LabMessage text="\u05E9\u05E0\u05D5 \u05D0\u05EA \u05D4\u05E6\u05DC\u05E2\u05D5\u05EA \u05D5\u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05D5\u05E8\u05D0\u05D5 \u05DB\u05D9\u05E6\u05D3 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9 \u05DE\u05E9\u05EA\u05E0\u05D4" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SineCosinePage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>\u05DE\u05E9\u05E4\u05D8 \u05D4\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD \u05D5\u05D4\u05E7\u05D5\u05E1\u05D9\u05E0\u05D5\u05E1\u05D9\u05DD</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>\u05DE\u05E6\u05D9\u05D0\u05EA \u05E6\u05DC\u05E2\u05D5\u05EA, \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA \u05D5\u05E9\u05D8\u05D7\u05D9 \u05DE\u05E9\u05D5\u05DC\u05E9\u05D9\u05DD</p>
          </div>
          <Link
            href="/3u/topic/grade11/trig"
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

        <SubtopicProgress subtopicId="3u/grade11/trig/sine-cosine" />

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
        <TrigLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/trig/sine-cosine" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
