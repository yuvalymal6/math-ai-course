"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
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
  prompt: string;
  contextWords?: string[];
  keywords?: string[];
  keywordHint?: string;
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה",  badge: "מתחיל",  badgeCls: "bg-green-600 text-white", accentCls: "text-green-700", accentColor: "#2D5A27", borderHex: "#2D5A27", borderRgb: "45,90,39",  glowBorder: "rgba(45,90,39,0.35)",  glowShadow: "0 4px 16px rgba(45,90,39,0.12)",  glowRgb: "45,90,39"  },
  medium:   { stationName: "תחנה שנייה",   badge: "בינוני", badgeCls: "bg-amber-600 text-white", accentCls: "text-amber-700", accentColor: "#92400E", borderHex: "#92400E", borderRgb: "146,64,14", glowBorder: "rgba(146,64,14,0.35)", glowShadow: "0 4px 16px rgba(146,64,14,0.12)", glowRgb: "146,64,14" },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-800 text-white",   accentCls: "text-red-800",   accentColor: "#991b1b", borderHex: "#991b1b", borderRgb: "153,27,27", glowBorder: "rgba(153,27,27,0.35)", glowShadow: "0 4px 16px rgba(153,27,27,0.12)", glowRgb: "153,27,27" },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700", border: "border-green-600", bg: "bg-green-600/10", glowColor: "rgba(45,90,39,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-amber-700", border: "border-amber-600", bg: "bg-amber-600/10", glowColor: "rgba(146,64,14,0.3)" },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-800",   border: "border-red-800",   bg: "bg-red-800/10",   glowColor: "rgba(153,27,27,0.3)" },
];

// ─── Silent SVG diagrams ─────────────────────────────────────────────────────

function BasicSVG() {
  const count = 7, W = 260, cx = 20, cy = 42, gap = (W - 2 * cx) / (count - 1);
  return (
    <svg viewBox={`0 0 ${W} 74`} className="w-full max-w-xs mx-auto" aria-hidden>
      <line x1={cx} y1={cy} x2={W - cx} y2={cy} stroke="#CBD5E0" strokeWidth={1.2} />
      {Array.from({ length: count }, (_, i) => {
        const x = cx + i * gap;
        const r = 5 + i * 1.5;
        const isFirst = i === 0;
        const isLast = i === count - 1;
        return (
          <g key={i}>
            <circle cx={x} cy={cy} r={isLast ? r + 2 : r} fill={isLast ? "#fef3c7" : "white"} stroke={isLast ? "#f59e0b" : "#a78bfa"} strokeWidth={isLast ? 2.5 : isFirst ? 2 : 1.5} />
            {(isFirst || isLast) && (
              <text x={x} y={cy + (isLast ? r + 2 : r) + 13} fill="#b45309" fontSize={10} textAnchor="middle" fontWeight="bold">
                {isFirst ? "a\u2081" : "a\u2099"}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MediumSVG() {
  const W = 260, cx = 40, cy = 38, gap = (W - 2 * cx) / 3;
  const circles = ["a\u2081", "a\u2082", "a\u2083", "a\u2084"];
  return (
    <svg viewBox={`0 0 ${W} 76`} className="w-full max-w-xs mx-auto" aria-hidden>
      <line x1={cx} y1={cy} x2={W - cx} y2={cy} stroke="#CBD5E0" strokeWidth={1.2} />
      {/* Amber bracket: pair 1 */}
      <path d={`M ${cx - 6} ${cy + 13} Q ${cx + gap / 2} ${cy + 26} ${cx + gap + 6} ${cy + 13}`} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
      <text x={cx + gap / 2} y={cy + 38} fill="#f59e0b" fontSize={12} textAnchor="middle" fontWeight="bold">?</text>
      {/* Violet bracket: pair 2 */}
      <path d={`M ${cx + gap - 6} ${cy + 13} Q ${cx + gap * 1.5} ${cy + 26} ${cx + gap * 2 + 6} ${cy + 13}`} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
      <text x={cx + gap * 1.5} y={cy + 38} fill="#a78bfa" fontSize={12} textAnchor="middle" fontWeight="bold">?</text>
      {circles.map((label, i) => {
        const x = cx + i * gap;
        const inP1 = i === 0 || i === 1;
        const inP2 = i === 1 || i === 2;
        const shared = i === 1;
        return (
          <g key={i}>
            <circle cx={x} cy={cy} r={11} fill={shared ? "#fef3c7" : inP1 ? "#fef9eb" : inP2 ? "#f5f3ff" : "white"} stroke={shared ? "#f59e0b" : inP1 ? "#f59e0b" : inP2 ? "#a78bfa" : "#CBD5E0"} strokeWidth={inP1 || inP2 ? 2 : 1.2} />
            <text x={x} y={cy - 17} fill="#94a3b8" fontSize={9} textAnchor="middle">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function AdvancedSVG() {
  const W = 280, padX = 22, cy1 = 45, cy2 = 108;
  const countA = 7, gapA = (W - 2 * padX) / (countA - 1);
  const countB = 8, gapB = (W - 2 * padX) / (countB - 1);
  return (
    <svg viewBox={`0 0 ${W} 138`} className="w-full max-w-sm mx-auto" aria-hidden>
      <text x={padX} y={18} fill="#991b1b" fontSize={9} fontWeight="bold">A \u2014 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA</text>
      <line x1={padX} y1={cy1} x2={W - padX} y2={cy1} stroke="#CBD5E0" strokeWidth={1.2} />
      {Array.from({ length: countA }, (_, i) => {
        const x = padX + i * gapA, r = 5 + i * 1.4;
        return (
          <g key={i}>
            <circle cx={x} cy={cy1} r={r} fill="white" stroke="#a78bfa" strokeWidth={1.5} />
            {i === 0 && <text x={x} y={cy1 + r + 14} fill="#64748b" fontSize={8} textAnchor="middle">a\u2081</text>}
          </g>
        );
      })}
      <text x={padX} y={cy2 - 16} fill="#1e40af" fontSize={9} fontWeight="bold">B \u2014 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA</text>
      <line x1={padX} y1={cy2} x2={W - padX} y2={cy2} stroke="#CBD5E0" strokeWidth={1.2} />
      {Array.from({ length: countB }, (_, i) => {
        const x = padX + i * gapB;
        return (
          <g key={i}>
            <circle cx={x} cy={cy2} r={6} fill="white" stroke="#93c5fd" strokeWidth={1.5} />
            {i === 0 && <text x={x} y={cy2 + 20} fill="#64748b" fontSize={8} textAnchor="middle">b\u2081</text>}
          </g>
        );
      })}
      <text x={W / 2} y={136} fill="#94a3b8" fontSize={8} textAnchor="middle">\u05E9\u05EA\u05D9 \u05E1\u05D3\u05E8\u05D5\u05EA \u2014 A \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA, B \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ──────────────────────────────────────────────────────

function CopyBtn({ text, label = "\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E8\u05D0\u05E9\u05D9", borderRgb = "45,90,39" }: { prompt: string; title?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.92)", padding: "1.5rem 1.75rem", marginBottom: 20, border: `2px solid rgba(${borderRgb},0.6)`, boxShadow: `0 0 20px rgba(${borderRgb},0.22), 0 0 40px rgba(${borderRgb},0.08), 0 4px 12px rgba(${borderRgb},0.1)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid rgba(${borderRgb},0.2)` }}>
        <span>\u2728</span>
        <span style={{ color: `rgb(${borderRgb})`, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.75, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05DC\u05D0" />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "45,90,39", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `2px solid rgba(${glowRgb},0.55)`, marginBottom: 10, boxShadow: `0 0 16px rgba(${glowRgb},0.2)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.82)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: `rgb(${glowRgb})`, fontSize: 11, fontWeight: 800 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.45)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>\u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05D4\u05DE\u05D5\u05DB\u05DF \u270D\uFE0F</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `2px solid rgba(${borderRgb},0.4)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="\u05D4\u05E2\u05EA\u05E7 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05DE\u05D5\u05E7\u05D3" />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, borderRgb = "146,64,14", locked = false, onPass }: {
  step: PromptStep; borderRgb?: string; locked?: boolean; onPass?: () => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result !== null && !result.blocked && result.score >= 75;

  if (locked) return (
    <div style={{ borderRadius: 12, border: `2px solid rgba(${borderRgb},0.2)`, background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span>\uD83D\uDD12</span>
      <span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} \u2014 {step.label}</span>
    </div>
  );

  const validate = () => {
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 75) onPass?.();
  };

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: passed ? "1px solid rgba(245,158,11,0.55)" : `2px solid rgba(${borderRgb},0.5)`, marginBottom: 10, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : `0 0 12px rgba(${borderRgb},0.1)`, transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.82)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: `rgb(${borderRgb})`, fontSize: 11, fontWeight: 800 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.45)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="\u05E0\u05E1\u05D7 \u05DB\u05D0\u05DF \u05D0\u05EA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E9\u05DC\u05DA \u05DC-AI (\u05D1\u05E7\u05E9 \u05D4\u05DB\u05D5\u05D5\u05E0\u05D4, \u05DC\u05D0 \u05E4\u05EA\u05E8\u05D5\u05DF)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
              <span>\u05E6\u05D9\u05D5\u05DF \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            \uD83E\uDD16 \u05D1\u05D3\u05D9\u05E7\u05EA AI \u05DE\u05D3\u05D5\u05DE\u05D4
          </button>
        )}

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            \u26A0\uFE0F {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            \uD83D\uDCA1 {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              \u2705 \u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05DE\u05E6\u05D5\u05D9\u05DF! \u05E6\u05D9\u05D5\u05DF: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7 \u05DC-AI"}
            </button>
          </motion.div>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1</button>
        )}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, unlocked, onValidated, borderRgb = "153,27,27" }: { step: PromptStep; unlocked: boolean; onValidated: () => void; borderRgb?: string }) {
  const [text, setText] = useState("");
  const [fb, setFb] = useState<"idle" | "short" | "nokw" | "pass">("idle");
  const [copied, setCopied] = useState(false);
  if (!unlocked) return (
    <div style={{ borderRadius: 12, border: `2px solid rgba(${borderRgb},0.25)`, background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span>\uD83D\uDD12</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} \u2014 {step.label}</span>
    </div>
  );
  const passed = fb === "pass";
  const validate = () => {
    if (text.trim().length < 30) { setFb("short"); return; }
    if ((step.keywords ?? []).length > 0 && (step.keywords ?? []).some(kw => !text.includes(kw))) { setFb("nokw"); return; }
    setFb("pass"); onValidated();
  };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: passed ? "1px solid rgba(52,211,153,0.35)" : `2px solid rgba(${borderRgb},0.5)`, marginBottom: 10, transition: "border-color 0.3s", boxShadow: passed ? "none" : `0 0 12px rgba(${borderRgb},0.1)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.82)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: `rgb(${borderRgb})`, fontSize: 11, fontWeight: 800 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.45)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setFb("idle"); } }}
          placeholder="\u05DB\u05EA\u05D5\u05D1 \u05D0\u05EA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E9\u05DC\u05DA \u05DC\u05E1\u05E2\u05D9\u05E3 \u05D6\u05D4..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(6,78,59,0.1)" : "rgba(255,255,255,0.85)", border: passed ? "1px solid rgba(52,211,153,0.25)" : `2px solid rgba(${borderRgb},0.35)`, color: passed ? "#065f46" : "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        {fb === "idle" && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `2px solid rgba(${borderRgb},0.5)`, color: "#2D3436", cursor: "pointer" }}>\uD83E\uDD16 \u05D1\u05D3\u05D9\u05E7\u05EA AI \u05DE\u05D3\u05D5\u05DE\u05D4</button>}
        {fb === "short" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 10, background: "rgba(127,29,29,0.08)", border: "1px solid rgba(239,68,68,0.3)", padding: "8px 12px", color: "#DC2626", fontSize: 12 }}>\u26A0\uFE0F \u05D4\u05E0\u05D9\u05E1\u05D5\u05D7 \u05E7\u05E6\u05E8 \u05DE\u05D3\u05D9 \u2014 \u05DB\u05EA\u05D5\u05D1 \u05D9\u05D5\u05EA\u05E8 \u05E4\u05E8\u05D8\u05D9\u05DD.</motion.div>}
        {fb === "nokw" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 10, background: "rgba(120,53,15,0.08)", border: "1px solid rgba(245,158,11,0.3)", padding: "8px 12px", color: "#92400E", fontSize: 12 }}>\uD83D\uDCA1 \u05DB\u05DE\u05E2\u05D8! \u05D7\u05E1\u05E8\u05D9\u05DD \u2014 {step.keywordHint}.</motion.div>}
        {fb === "pass" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 10, background: "rgba(6,78,59,0.08)", border: "1px solid rgba(52,211,153,0.3)", padding: "8px 12px", color: "#065f46", fontSize: 12 }}>\u2705 \u05DE\u05E2\u05D5\u05DC\u05D4! \u05D4\u05E9\u05DC\u05D1 \u05D4\u05D1\u05D0 \u05E0\u05E4\u05EA\u05D7.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "1px solid rgba(52,211,153,0.3)", color: "#065f46", cursor: "pointer" }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7 \u05D0\u05EA \u05D4\u05E0\u05D9\u05E1\u05D5\u05D7 \u05E9\u05DC\u05DA"}
            </button>
          </motion.div>
        )}
        {(fb === "short" || fb === "nokw") && <button onClick={() => setFb("idle")} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1</button>}
      </div>
    </div>
  );
}

// ─── Ladders ─────────────────────────────────────────────────────────────────

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
      <GoldenPromptCard prompt={goldenPrompt} title="\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8 \u05E8\u05D0\u05E9\u05D9" borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  \u05E1\u05D9\u05D9\u05DE\u05EA\u05D9 \u05E1\u05E2\u05D9\u05E3 \u05D6\u05D4 \u2713
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>\u2705 \u05D4\u05D5\u05E9\u05DC\u05DD</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>\uD83D\uDD12</div>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LadderMedium({ steps, goldenPrompt, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; borderRgb: string }) {
  const [unlockedCount, setUnlockedCount] = useState(1);
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <TutorStepMedium key={i} step={s} borderRgb={borderRgb}
          locked={i >= unlockedCount}
          onPass={() => setUnlockedCount(v => Math.max(v, i + 2))} />
      ))}
    </div>
  );
}

function LadderAdvanced({ steps, borderRgb }: { steps: PromptStep[]; borderRgb: string }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#991b1b"
        accentRgb="153,27,27"
        requiredPhrase="\u05E1\u05E8\u05D5\u05E7 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05E2\u05E6\u05D5\u05E8"
        subjectWords={["\u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA", "\u05E1\u05D3\u05E8\u05D4 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA", "\u05DE\u05E0\u05D4", "\u05D4\u05E4\u05E8\u05E9", "\u05E1\u05DB\u05D5\u05DD", "\u05D0\u05D9\u05D1\u05E8 \u05DB\u05DC\u05DC\u05D9"]}
      />

      {steps.map((s, i) => (
        <TutorStepAdvanced key={i} step={s} borderRgb={borderRgb}
          unlocked={masterPassed && i < unlockedCount}
          onValidated={() => setUnlockedCount(v => Math.max(v, i + 2))} />
      ))}

      {allPassed && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>\uD83C\uDFC6</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3 \u2014 \u05D4\u05E9\u05DC\u05DE\u05EA \u05D0\u05EA \u05D4\u05E8\u05DE\u05D4 \u05D4\u05DE\u05EA\u05E7\u05D3\u05DE\u05EA!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>\u05E2\u05D1\u05E8\u05EA \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D0\u05EA \u05D0\u05E8\u05D1\u05E2\u05EA \u05D4\u05E1\u05E2\u05D9\u05E4\u05D9\u05DD. \u05D0\u05EA\u05D4 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D1\u05D7\u05D9\u05E0\u05EA \u05D4\u05D1\u05D2\u05E8\u05D5\u05EA.</div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u05E9\u05D1\u05D4 a\u2081 = 3 \u05D5-a\u2086 = 96.\n\n\u05DE\u05E6\u05D0:\n\u05D0. \u05D0\u05EA \u05DE\u05E0\u05EA \u05D4\u05E1\u05D3\u05E8\u05D4 (q)\n\u05D1. \u05DB\u05EA\u05D5\u05D1 \u05D0\u05EA \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05DB\u05DC\u05DC\u05D9 a\u2099\n\u05D2. \u05D7\u05E9\u05D1 \u05D0\u05EA S\u2086 (\u05E1\u05DB\u05D5\u05DD 6 \u05D4\u05D0\u05D9\u05D1\u05E8\u05D9\u05DD \u05D4\u05E8\u05D0\u05E9\u05D5\u05E0\u05D9\u05DD)",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F \u05D7\u05D9\u05DC\u05D5\u05E5 \u05D4\u05DE\u05E0\u05D4 (q) \u05DE\u05D4\u05E0\u05D5\u05E1\u05D7\u05D4", text: "\u05DB\u05E9\u05DE\u05D1\u05D5\u05D3\u05D3\u05D9\u05DD \u05D0\u05EA q \u05DE\u05EA\u05D5\u05DA a\u2099 = a\u2081\u00B7q\u207F\u207B\u00B9, \u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D4\u05D4\u05E4\u05D5\u05DB\u05D4 \u05DC\u05D7\u05D6\u05E7\u05D4 \u05D4\u05D9\u05D0 \u05E9\u05D5\u05E8\u05E9, \u05DC\u05D0 \u05D7\u05D9\u05DC\u05D5\u05E7 \u05E4\u05E9\u05D5\u05D8." },
      { title: "\uD83D\uDD0D \u05D4\u05DE\u05E2\u05E8\u05D9\u05DA \u05D1\u05E0\u05D5\u05E1\u05D7\u05EA \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05DB\u05DC\u05DC\u05D9", text: "\u05D4\u05D7\u05D6\u05E7\u05D4 \u05E2\u05DC \u05D4\u05DE\u05E0\u05D4 q \u05DE\u05D9\u05D9\u05E6\u05D2\u05EA \u05D0\u05EA \u05DE\u05E1\u05E4\u05E8 \u05D4\u201C\u05E7\u05E4\u05D9\u05E6\u05D5\u05EA\u201D \u05DE\u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF. \u05DC\u05DB\u05DF, \u05E2\u05D1\u05D5\u05E8 \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4-n, \u05EA\u05DE\u05D9\u05D3 \u05D9\u05D4\u05D9\u05D5 n\u22121 \u05E7\u05E4\u05D9\u05E6\u05D5\u05EA." },
    ],
    goldenPrompt: "\u05D4\u05D9\u05D9, \u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05D1\u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u05F3, \u05DC\u05D5\u05DE\u05D3 \u05E2\u05DB\u05E9\u05D9\u05D5 \u05E1\u05D3\u05E8\u05D5\u05EA \u05D4\u05E0\u05D3\u05E1\u05D9\u05D5\u05EA.\n\u05E6\u05D9\u05E8\u05E4\u05EA\u05D9 \u05DC\u05DA \u05EA\u05E8\u05D2\u05D9\u05DC \u05E2\u05DC \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u2014 \u05DE\u05E0\u05D4 \u05D5\u05D0\u05D9\u05D1\u05E8 \u05DB\u05DC\u05DC\u05D9.\n\u05D0\u05E0\u05D9 \u05E8\u05D5\u05E6\u05D4 \u05E9\u05EA\u05E9\u05DE\u05E9 \u05DB\u05DE\u05D5\u05E8\u05D4 \u05E4\u05E8\u05D8\u05D9 \u05D5\u05DE\u05DB\u05D5\u05D5\u05DF. \u05D4\u05E0\u05D4 \u05D4\u05E4\u05E8\u05D5\u05D8\u05D5\u05E7\u05D5\u05DC \u05E9\u05DC\u05E0\u05D5:\n\n1\uFE0F\u20E3 \u05E1\u05E8\u05D9\u05E7\u05D4:\n\u05E7\u05D5\u05D3\u05DD \u05DB\u05DC, \u05EA\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05EA\u05DB\u05EA\u05D5\u05D1 \u05DC\u05D9 \u05E8\u05E7:\n\u201C\u05D6\u05D9\u05D4\u05D9\u05EA\u05D9 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD. \u05DE\u05D7\u05DB\u05D4 \u05DC\u05D4\u05D5\u05E8\u05D0\u05D5\u05EA \u05DC\u05E9\u05DC\u05D1 \u05D0\u05F3.\u201D\n(\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05DB\u05DC\u05D5\u05DD \u05D5\u05D0\u05DC \u05EA\u05E1\u05D1\u05D9\u05E8 \u05DB\u05DC\u05D5\u05DD \u05D1\u05E9\u05DC\u05D1 \u05D4\u05D6\u05D4!)\n\n2\uFE0F\u20E3 \u05EA\u05E4\u05E7\u05D9\u05D3:\n\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05E9\u05DC\u05D9. \u05D6\u05D4 \u05D0\u05D5\u05DE\u05E8 \u05E9\u05D0\u05EA\u05D4 \u05DC\u05D0 \u05E4\u05D5\u05EA\u05E8 \u05D1\u05DE\u05E7\u05D5\u05DE\u05D9.\n\n3\uFE0F\u20E3 \u05E9\u05D9\u05D8\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4:\n\u05D0\u05E0\u05D9 \u05D0\u05E9\u05DC\u05D7 \u05DC\u05DA \u05DB\u05DC \u05E4\u05E2\u05DD \u05E9\u05DC\u05D1 (\u05D0\u05F3, \u05D1\u05F3 \u05D0\u05D5 \u05D2\u05F3).\n\u05D1\u05EA\u05D2\u05D5\u05D1\u05D4, \u05D0\u05EA\u05D4 \u05E9\u05D5\u05D0\u05DC \u05D0\u05D5\u05EA\u05D9 \u05E8\u05E7 \u05E9\u05D0\u05DC\u05D4 \u05D0\u05D7\u05EA \u05DE\u05DB\u05D5\u05D5\u05E0\u05EA \u05E2\u05DC \u05D4\u05E0\u05D5\u05E1\u05D7\u05D4 \u05D0\u05D5 \u05D4\u05E9\u05DC\u05D1 \u05D4\u05D1\u05D0.\n\u05D7\u05DB\u05D4 \u05DC\u05D9 \u05D1\u05D9\u05DF \u05E9\u05DC\u05D1 \u05DC\u05E9\u05DC\u05D1 \u05D5\u05D0\u05DC \u05EA\u05DE\u05E9\u05D9\u05DA \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D0\u05E0\u05D9 \u05E9\u05D5\u05DC\u05D7.",
    steps: [
      {
        phase: "\uD83D\uDD0D \u05E1\u05E2\u05D9\u05E3 \u05D0\u05F3",
        label: "\u05DE\u05E6\u05D9\u05D0\u05EA \u05D4\u05DE\u05E0\u05D4 q",
        prompt: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u05E2\u05DD a\u2081=3 \u05D5-a\u2086=96. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u2014 \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05D0\u05EA q? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.",
      },
      {
        phase: "\uD83E\uDDED \u05E1\u05E2\u05D9\u05E3 \u05D1\u05F3",
        label: "\u05DB\u05EA\u05D9\u05D1\u05EA \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05DB\u05DC\u05DC\u05D9 a\u2099",
        prompt: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u05E2\u05DD a\u2081=3. \u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA q. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u2014 \u05D0\u05D9\u05DA \u05DB\u05D5\u05EA\u05D1\u05D9\u05DD \u05D0\u05EA \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05DB\u05DC\u05DC\u05D9 \u05E9\u05DC \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA? \u05D0\u05DC \u05EA\u05D9\u05EA\u05DF \u05EA\u05E9\u05D5\u05D1\u05D4 \u05E1\u05D5\u05E4\u05D9\u05EA.",
      },
      {
        phase: "\uD83D\uDD22 \u05E1\u05E2\u05D9\u05E3 \u05D2\u05F3",
        label: "\u05D7\u05D9\u05E9\u05D5\u05D1 S\u2086",
        prompt: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u05E2\u05DD a\u2081=3 \u05D5-q \u05E9\u05DE\u05E6\u05D0\u05EA\u05D9. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u2014 \u05D0\u05D9\u05DA \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05D1\u05E0\u05D5\u05E1\u05D7\u05EA \u05D4\u05E1\u05DB\u05D5\u05DD \u05DB\u05D3\u05D9 \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA S\u2086? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.",
      },
    ],
  },
  {
    id: "medium",
    problem: "\u05D1\u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u05D9\u05D3\u05D5\u05E2 \u05DB\u05D9:\na\u2081 + a\u2082 = 12\na\u2082 + a\u2083 = 24\n\n\u05DE\u05E6\u05D0:\n\u05D0. \u05D1\u05E0\u05D4 \u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05D5\u05EA \u05DE\u05E9\u05E0\u05D9 \u05D4\u05E1\u05DB\u05D5\u05DE\u05D9\u05DD\n\u05D1. \u05DE\u05E6\u05D0 \u05D0\u05EA a\u2081 \u05D5-q\n\u05D2. \u05D4\u05D5\u05DB\u05D7 \u05E9\u05D4\u05E1\u05D3\u05E8\u05D4 \u05E2\u05D5\u05DC\u05D4 \u05DE\u05D5\u05E0\u05D5\u05D8\u05D5\u05E0\u05D9\u05EA",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "\uD83D\uDCA1 \u05D6\u05D9\u05D4\u05D5\u05D9 \u05D4\u05D9\u05D7\u05E1 \u05D1\u05D9\u05DF \u05D4\u05E1\u05DB\u05D5\u05DE\u05D9\u05DD", text: "\u05DB\u05E9\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05E0\u05D9 \u05E1\u05DB\u05D5\u05DE\u05D9\u05DD \u05E8\u05E6\u05D5\u05E4\u05D9\u05DD \u05E9\u05DC \u05D6\u05D5\u05D2\u05D5\u05EA \u05D0\u05D9\u05D1\u05E8\u05D9\u05DD, \u05D7\u05E9\u05D1\u05D5: \u05DE\u05D4 \u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 \u05E9\u05DE\u05E2\u05D1\u05D9\u05E8\u05D4 \u05DE\u05E1\u05DB\u05D5\u05DD \u05D0\u05D7\u05D3 \u05DC\u05E9\u05E0\u05D9? \u05D4\u05E7\u05E9\u05E8 \u05D4\u05D6\u05D4 \u05D4\u05D5\u05D0 \u05D4\u05DE\u05E0\u05D4." },
      { title: "\u26A0\uFE0F \u05D4\u05D5\u05DB\u05D7\u05EA \u05E1\u05D3\u05E8\u05D4 \u05E2\u05D5\u05DC\u05D4", text: "\u05DB\u05D3\u05D9 \u05DC\u05D4\u05D5\u05DB\u05D9\u05D7 \u05E9\u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u05E2\u05D5\u05DC\u05D4, \u05D1\u05D3\u05E7\u05D5 \u05E9\u05E0\u05D9 \u05EA\u05E0\u05D0\u05D9\u05DD: \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF \u05D7\u05D9\u05D5\u05D1\u05D9, \u05D5\u05D4\u05DE\u05E0\u05D4 \u05D2\u05D3\u05D5\u05DC\u05D4 \u05DE-1." },
    ],
    goldenPrompt: "\u05D4\u05D9\u05D9, \u05D0\u05E0\u05D9 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05D1\u05DB\u05D9\u05EA\u05D4 \u05D9\u05D1\u05F3, \u05DC\u05D5\u05DE\u05D3 \u05E1\u05D3\u05E8\u05D5\u05EA \u05D4\u05E0\u05D3\u05E1\u05D9\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05DF: a\u2081+a\u2082=12 \u05D5-a\u2082+a\u2083=24.\n\u05D0\u05E0\u05D9 \u05E8\u05D5\u05E6\u05D4 \u05E9\u05EA\u05DB\u05D5\u05D5\u05DF \u05D0\u05D5\u05EA\u05D9 \u05E9\u05DC\u05D1 \u05D0\u05D7\u05E8\u05D9 \u05E9\u05DC\u05D1 \u2014 \u05E8\u05E7 \u05E9\u05D0\u05DC\u05D4 \u05D0\u05D7\u05EA \u05D1\u05DB\u05DC \u05E4\u05E2\u05DD.\n\u05EA\u05D7\u05DC \u05D1\u05D4\u05D1\u05E0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD, \u05D5\u05D0\u05D6 \u05E0\u05DE\u05E6\u05D0 \u05D0\u05EA q \u05D5-a\u2081.\n\u05D7\u05E9\u05D5\u05D1: \u05DC\u05D0\u05D7\u05E8 \u05E9\u05E1\u05D9\u05D9\u05DE\u05EA \u05DC\u05D4\u05D3\u05E8\u05D9\u05DA \u05D0\u05D5\u05EA\u05D9 \u05E2\u05DC \u05DB\u05DC \u05E9\u05DC\u05D1, \u05E2\u05E6\u05D5\u05E8 \u05D5\u05D4\u05DE\u05EA\u05DF \u05DC\u05E9\u05D0\u05DC\u05D4 \u05D4\u05D1\u05D0\u05D4 \u05E9\u05DC\u05D9. \u05D0\u05DC \u05EA\u05E2\u05D1\u05D5\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DC\u05E1\u05E2\u05D9\u05E3 \u05D4\u05D1\u05D0.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4/\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3.\n\u05D0\u05DC \u05EA\u05DE\u05D4\u05E8, \u05EA\u05E1\u05D1\u05D9\u05E8 \u05DC\u05D9 \u05E2\u05DC \u05DB\u05DC \u05E9\u05DC\u05D1. \u05D1\u05E1\u05D9\u05D5\u05DD \u05D4\u05E1\u05E8\u05D9\u05E7\u05D4, \u05EA\u05D2\u05D9\u05D1 \u05D0\u05DA \u05D5\u05E8\u05E7: \u201C\u05D0\u05E0\u05D9 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.\u201D",
    steps: [
      {
        phase: "\uD83D\uDD0D \u05E1\u05E2\u05D9\u05E3 \u05D0\u05F3",
        label: "\u05D1\u05E0\u05D9\u05D9\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05D5\u05EA",
        prompt: "",
        contextWords: [
          "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "\u05DE\u05E2\u05E8\u05DB\u05EA", "\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD",
          "\u05DC\u05D7\u05DC\u05E7", "\u05D7\u05DC\u05D5\u05E7\u05D4", "\u05D7\u05D9\u05DC\u05D5\u05E7", "\u05D9\u05D7\u05E1", "\u05E9\u05D1\u05E8",
          "\u05DC\u05D4\u05E6\u05D9\u05D1", "\u05D4\u05E6\u05D1\u05D4",
          "\u05DC\u05E6\u05DE\u05E6\u05DD", "\u05E6\u05DE\u05E6\u05D5\u05DD", "\u05DC\u05D1\u05D8\u05DC",
          "a1", "q", "\u05DE\u05E0\u05D4", "\u05E8\u05D0\u05E9\u05D5\u05DF", "\u05D0\u05D9\u05D1\u05E8",
          "\u05D2\u05D5\u05E8\u05DD", "\u05DE\u05E9\u05D5\u05EA\u05E3", "\u05D1\u05D9\u05D3\u05D5\u05D3", "\u05DC\u05D1\u05D5\u05D3\u05D3",
          "\u05E0\u05E2\u05DC\u05DE", "\u05E4\u05D9\u05E8\u05D5\u05E7",
        ],
      },
      {
        phase: "\uD83E\uDDED \u05E1\u05E2\u05D9\u05E3 \u05D1\u05F3",
        label: "\u05DE\u05E6\u05D0 \u05D0\u05EA a\u2081 \u05D5-q",
        prompt: "",
        contextWords: [
          "\u05E0\u05E2\u05DC\u05DE", "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4",
          "\u05DC\u05D4\u05E6\u05D9\u05D1", "\u05D4\u05E6\u05D1\u05D4",
          "a1", "q", "\u05DE\u05E0\u05D4", "\u05D0\u05D9\u05D1\u05E8",
          "\u05DC\u05D7\u05E9\u05D1", "\u05D7\u05D9\u05E9\u05D5\u05D1",
        ],
      },
      {
        phase: "\uD83D\uDD22 \u05E1\u05E2\u05D9\u05E3 \u05D2\u05F3",
        label: "\u05D4\u05D5\u05DB\u05D7 \u05E9\u05D4\u05E1\u05D3\u05E8\u05D4 \u05E2\u05D5\u05DC\u05D4 \u05DE\u05D5\u05E0\u05D5\u05D8\u05D5\u05E0\u05D9\u05EA",
        prompt: "",
        contextWords: [
          "\u05E2\u05D5\u05DC", "\u05D2\u05D3\u05DC", "\u05E6\u05D5\u05DE\u05D7",
          "\u05D7\u05D9\u05D5\u05D1\u05D9", "\u05D7\u05D9\u05D5\u05D1\u05D9\u05EA",
          "q", "\u05DE\u05E0\u05D4", "\u05D2\u05D3\u05D5\u05DC", "\u05D9\u05D5\u05EA\u05E8 \u05DE",
          "\u05D4\u05D5\u05DB\u05D7", "\u05DC\u05D4\u05D5\u05DB\u05D9\u05D7", "\u05D4\u05D5\u05DB\u05D7\u05D4",
          "\u05DE\u05D2\u05DE\u05D4", "\u05E2\u05E8\u05DA", "\u05EA\u05E0\u05D0\u05D9",
          "\u05E1\u05D9\u05D1\u05D4", "\u05DC\u05DE\u05D4", "\u05DE\u05D3\u05D5\u05E2",
        ],
      },
    ],
  },
  {
    id: "advanced",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA A \u05E9\u05D1\u05D4 \u05D4\u05DE\u05E0\u05D4 \u05D4\u05D9\u05D0 q \u05D5\u05D9\u05E9 \u05D1\u05D4 10 \u05D0\u05D9\u05D1\u05E8\u05D9\u05DD.\n\u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05E9\u05D9\u05E9\u05D9 \u05D1\u05E1\u05D3\u05E8\u05D4 \u05D2\u05D3\u05D5\u05DC \u05E4\u05D9 81 \u05DE\u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05E9\u05E0\u05D9.\n\u05E1\u05DB\u05D5\u05DD \u05E9\u05E0\u05D9 \u05D4\u05D0\u05D9\u05D1\u05E8\u05D9\u05DD \u05D4\u05D0\u05DE\u05E6\u05E2\u05D9\u05D9\u05DD \u05D1\u05E1\u05D3\u05E8\u05D4 A \u05D4\u05D5\u05D0 1,296, \u05D5\u05DB\u05DC \u05D0\u05D9\u05D1\u05E8\u05D9\u05D4 \u05D7\u05D9\u05D5\u05D1\u05D9\u05D9\u05DD.\n\n\u05E0\u05EA\u05D5\u05E0\u05D4 \u05E1\u05D3\u05E8\u05D4 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA B. \u05E1\u05DB\u05D5\u05DD \u05E1\u05D3\u05E8\u05D4 A \u05D2\u05D3\u05D5\u05DC \u05E4\u05D9 11 \u05DE\u05E1\u05DB\u05D5\u05DD \u05E1\u05D3\u05E8\u05D4 B.\n\u05D1\u05E1\u05D3\u05E8\u05D4 B \u05D9\u05E9 32 \u05D0\u05D9\u05D1\u05E8\u05D9\u05DD, \u05D5\u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05E9\u05E0\u05D9 \u05D1\u05D4 \u05D2\u05D3\u05D5\u05DC \u05E4\u05D9 16 \u05DE\u05D4\u05E4\u05E8\u05E9 \u05D4\u05E1\u05D3\u05E8\u05D4 (d).\n\n\u05DE\u05E6\u05D0:\n\u05D0. \u05D0\u05EA \u05E9\u05E0\u05D9 \u05D4\u05E2\u05E8\u05DB\u05D9\u05DD \u05D4\u05D0\u05E4\u05E9\u05E8\u05D9\u05D9\u05DD \u05E9\u05DC q (\u05D5\u05D0\u05D9\u05D6\u05D4 \u05E0\u05E4\u05E1\u05DC \u05D5\u05DE\u05D3\u05D5\u05E2)\n\u05D1. \u05D0\u05EA \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF (a\u2081) \u05E9\u05DC \u05E1\u05D3\u05E8\u05D4 A\n\u05D2. \u05D0\u05EA \u05E1\u05DB\u05D5\u05DD \u05E1\u05D3\u05E8\u05D4 B\n\u05D3. \u05D0\u05EA \u05D4\u05E4\u05E8\u05E9 \u05D4\u05E1\u05D3\u05E8\u05D4 (d) \u05E9\u05DC \u05E1\u05D3\u05E8\u05D4 B",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "\uD83D\uDCA1 \u05E9\u05E0\u05D9 \u05E2\u05E8\u05DB\u05D9 q \u2014 \u05DE\u05D9 \u05E0\u05E4\u05E1\u05DC?", text: "\u05D4\u05E0\u05EA\u05D5\u05DF \u05E7\u05D5\u05D1\u05E2 \u05E9\u05DB\u05DC \u05D0\u05D9\u05D1\u05E8\u05D9 \u05D4\u05E1\u05D3\u05E8\u05D4 \u05D7\u05D9\u05D5\u05D1\u05D9\u05D9\u05DD \u2014 \u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05D6\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05E4\u05E1\u05D5\u05DC \u05D0\u05EA \u05D0\u05D7\u05EA \u05D4\u05EA\u05E9\u05D5\u05D1\u05D5\u05EA." },
      { title: "\u26A0\uFE0F \u05DE\u05D9\u05D4\u05DD \u05D4\u05D0\u05D9\u05D1\u05E8\u05D9\u05DD \u05D4\u05D0\u05DE\u05E6\u05E2\u05D9\u05D9\u05DD \u05D1\u05E1\u05D3\u05E8\u05D4 \u05E9\u05DC 10 \u05D0\u05D9\u05D1\u05E8\u05D9\u05DD?", text: "\u05D1\u05E1\u05D3\u05E8\u05D4 \u05E9\u05DC 10 \u05D0\u05D9\u05D1\u05E8\u05D9\u05DD \u05D0\u05D9\u05DF \u05D0\u05D9\u05D1\u05E8 \u05D0\u05DE\u05E6\u05E2\u05D9 \u05D9\u05D7\u05D9\u05D3. \u05DE\u05D9\u05D4\u05DD \u05E9\u05E0\u05D9 \u05D4\u05D0\u05D9\u05D1\u05E8\u05D9\u05DD \u05D4\u05D0\u05DE\u05E6\u05E2\u05D9\u05D9\u05DD?" },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u2694\uFE0F \u05E1\u05E2\u05D9\u05E3 \u05D0\u05F3",
        label: "\u05DE\u05E6\u05D0 \u05D0\u05EA q (\u05E9\u05E0\u05D9 \u05E2\u05E8\u05DB\u05D9\u05DD, \u05D5\u05D4\u05E1\u05D1\u05E8 \u05DE\u05D9 \u05E0\u05E4\u05E1\u05DC)",
        prompt: "",
        contextWords: [
          "\u05DE\u05E0\u05D4", "q", "\u05D9\u05D7\u05E1", "\u05D7\u05DC\u05D5\u05E7\u05D4",
          "a6", "a2", "\u05E9\u05D5\u05E8\u05E9", "\u05D7\u05D6\u05E7\u05D4", "\u05E8\u05D1\u05D9\u05E2\u05D9",
          "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4",
          "\u05D7\u05D9\u05D5\u05D1\u05D9\u05D9\u05DD", "\u05D7\u05D9\u05D5\u05D1\u05D9", "\u05E4\u05E1\u05D9\u05DC", "\u05E9\u05DC\u05D9\u05DC\u05D9",
        ],
        keywords: ["\u05DE\u05E0\u05D4"],
        keywordHint: "\u05D4\u05D6\u05DB\u05E8 \u05D0\u05EA \u05D4\u05DE\u05D5\u05E0\u05D7 \u201C\u05DE\u05E0\u05D4\u201D",
      },
      {
        phase: "\u2694\uFE0F \u05E1\u05E2\u05D9\u05E3 \u05D1\u05F3",
        label: "\u05DE\u05E6\u05D0 \u05D0\u05EA a\u2081 \u05E9\u05DC \u05E1\u05D3\u05E8\u05D4 A",
        prompt: "",
        contextWords: [
          "a1", "a5", "a6", "\u05D0\u05DE\u05E6\u05E2\u05D9\u05D9\u05DD", "\u05D0\u05DE\u05E6\u05E2\u05D9",
          "\u05D7\u05DE\u05D9\u05E9\u05D9", "\u05E9\u05D9\u05E9\u05D9", "\u05E1\u05DB\u05D5\u05DD",
          "\u05D4\u05E6\u05D1\u05D4", "\u05E0\u05D5\u05E1\u05D7\u05D4", "\u05DC\u05D1\u05D5\u05D3\u05D3", "\u05DC\u05D7\u05E9\u05D1",
        ],
        keywords: ["\u05D0\u05DE\u05E6\u05E2\u05D9"],
        keywordHint: "\u05D4\u05D6\u05DB\u05E8 \u05D0\u05EA \u05D4\u05DE\u05D5\u05E0\u05D7 \u201C\u05D0\u05DE\u05E6\u05E2\u05D9\u201D",
      },
      {
        phase: "\u2694\uFE0F \u05E1\u05E2\u05D9\u05E3 \u05D2\u05F3",
        label: "\u05DE\u05E6\u05D0 \u05D0\u05EA \u05E1\u05DB\u05D5\u05DD \u05E1\u05D3\u05E8\u05D4 B",
        prompt: "",
        contextWords: [
          "\u05E1\u05DB\u05D5\u05DD", "Sn", "SA", "\u05D2\u05D3\u05D5\u05DC \u05E4\u05D9",
          "\u05DC\u05D7\u05DC\u05E7", "\u05D7\u05DC\u05D5\u05E7\u05D4", "\u05D9\u05D7\u05E1", "\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA",
        ],
        keywords: ["\u05E1\u05DB\u05D5\u05DD"],
        keywordHint: "\u05D4\u05D6\u05DB\u05E8 \u05D0\u05EA \u05D4\u05DE\u05D5\u05E0\u05D7 \u201C\u05E1\u05DB\u05D5\u05DD\u201D",
      },
      {
        phase: "\u2694\uFE0F \u05E1\u05E2\u05D9\u05E3 \u05D3\u05F3",
        label: "\u05DE\u05E6\u05D0 \u05D0\u05EA d \u05E9\u05DC \u05E1\u05D3\u05E8\u05D4 B",
        prompt: "",
        contextWords: [
          "\u05D4\u05E4\u05E8\u05E9", "d", "b2",
          "\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4", "b1", "\u05E4\u05EA\u05E8\u05D5\u05DF",
          "\u05DC\u05D4\u05E6\u05D9\u05D1", "\u05DC\u05E4\u05EA\u05D5\u05E8",
        ],
        keywords: ["\u05D4\u05E4\u05E8\u05E9"],
        keywordHint: "\u05D4\u05D6\u05DB\u05E8 \u05D0\u05EA \u05D4\u05DE\u05D5\u05E0\u05D7 \u201C\u05D4\u05E4\u05E8\u05E9\u201D",
      },
    ],
  },
];

// ─── ExerciseCard ────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+\u05E1\u05E2\u05D9\u05E3/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ borderRadius: 32, border: `2px solid rgba(${s.borderRgb},0.5)`, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", padding: "2.5rem", marginBottom: "2rem", marginLeft: "auto", marginRight: "auto", boxShadow: `0 10px 15px -3px rgba(60,54,42,0.1), 0 0 24px rgba(${s.borderRgb},0.08)` }}>

      {/* Formula bar */}
      {ex.id !== "advanced" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-start", justifyContent: "space-between", borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.4)`, background: "rgba(255,255,255,0.88)", padding: "1rem 1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.75rem", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>\u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05DB\u05DC\u05DC\u05D9</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>a\u2099 = a\u2081 \u00B7 q\u207F\u207B\u00B9</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>\u05E1\u05DB\u05D5\u05DD n \u05D0\u05D9\u05D1\u05E8\u05D9\u05DD</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>S\u2099 = a\u2081(q\u207F-1)/(q-1)</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>\u05E1\u05DB\u05D5\u05DD \u05D0\u05D9\u05E0\u05E1\u05D5\u05E4\u05D9</div>
              <div style={{ color: s.accentColor, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>S\u221E = a\u2081/(1\u2212q)</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.4)`, background: "rgba(255,255,255,0.88)", padding: "1rem 1.5rem", marginBottom: "2rem" }}>
          <div style={{ color: "#991b1b", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>\u05DE\u05EA\u05E7\u05D3\u05DD \u2014 \u05E0\u05D5\u05E1\u05D7\u05D0\u05D5\u05EA: \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA A + \u05E1\u05D3\u05E8\u05D4 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA B</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
            <div>
              <div style={{ color: "#6B7280", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>\u05D4\u05E0\u05D3\u05E1\u05D9\u05EA A</div>
              {[
                { label: "\u05D0\u05D9\u05D1\u05E8 \u05DB\u05DC\u05DC\u05D9", f: "a\u2099 = a\u2081 \u00B7 q\u207F\u207B\u00B9" },
                { label: "\u05E1\u05DB\u05D5\u05DD", f: "S\u2099 = a\u2081(q\u207F-1)/(q-1)" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ color: "#6B7280", fontSize: 10 }}>{r.label}:</span>
                  <span style={{ color: "#991b1b", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>{r.f}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 1, background: "rgba(153,27,27,0.15)", alignSelf: "stretch" }} />
            <div>
              <div style={{ color: "#6B7280", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA B</div>
              {[
                { label: "\u05D0\u05D9\u05D1\u05E8 \u05DB\u05DC\u05DC\u05D9", f: "b\u2099 = b\u2081 + (n\u22121)d" },
                { label: "\u05E1\u05DB\u05D5\u05DD", f: "S\u2099 = (n/2)(2b\u2081 + (n\u22121)d)" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ color: "#6B7280", fontSize: 10 }}>{r.label}:</span>
                  <span style={{ color: "#1e40af", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>{r.f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.45)`, background: "rgba(255,255,255,0.88)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.5)`, background: "rgba(255,255,255,0.88)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>\uD83D\uDCDD \u05D4\u05E9\u05D0\u05DC\u05D4</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "\u05D4\u05D5\u05E2\u05EA\u05E7!" : "\u05D4\u05E2\u05EA\u05E7"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>\u26A0\uFE0F \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA \u05E0\u05E4\u05D5\u05E6\u05D5\u05EA</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.45)`, background: "rgba(255,255,255,0.88)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: `rgb(${s.borderRgb})`, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>\uD83E\uDDE0 \u05DE\u05D3\u05E8\u05D9\u05DA \u05D4\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8\u05D9\u05DD</div>
        {ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} borderRgb={s.borderRgb} />}
    </section>
  );
}

// ─── Formula Bar ─────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"general" | "sum" | "infinite" | null>(null);

  const tabs = [
    { id: "general" as const, label: "\u05D0\u05D9\u05D1\u05E8 \u05DB\u05DC\u05DC\u05D9", tex: "a_n = a_1 \\cdot q^{n-1}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "sum" as const, label: "\u05E1\u05DB\u05D5\u05DD n \u05D0\u05D9\u05D1\u05E8\u05D9\u05DD", tex: "S_n = \\frac{a_1(q^n - 1)}{q - 1}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "infinite" as const, label: "\u05E1\u05DB\u05D5\u05DD \u05D0\u05D9\u05E0\u05E1\u05D5\u05E4\u05D9", tex: "S_\\infty = \\frac{a_1}{1-q}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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
                background: isActive ? `${t.color}15` : "rgba(255,255,255,0.02)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {activeTab === "general" && (
        <motion.div key="general" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"a_n = a_1 \\cdot q^{n-1}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05DB\u05DC\u05DC\u05D9 \u05E9\u05DC \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u05DE\u05EA\u05E7\u05D1\u05DC \u05E2\u05DC \u05D9\u05D3\u05D9 \u05D4\u05DB\u05E4\u05DC\u05EA \u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF \u05D1\u05DE\u05E0\u05D4 q, \u05E9\u05D5\u05D1 \u05D5\u05E9\u05D5\u05D1. \u05D4\u05DE\u05E2\u05E8\u05D9\u05DA n\u22121 \u05DE\u05D9\u05D9\u05E6\u05D2 \u05D0\u05EA \u05DE\u05E1\u05E4\u05E8 \u05D4\u201C\u05E7\u05E4\u05D9\u05E6\u05D5\u05EA\u201D \u05DE\u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF.
              </div>
              <div style={{ marginTop: 10, color: "#16a34a", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                \uD83D\uDCA1 \u05D3\u05D5\u05D2\u05DE\u05D4: <InlineMath>{"a_1 = 3,\\; q = 2 \\Rightarrow a_5 = 3 \\cdot 2^4 = 48"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "sum" && (
        <motion.div key="sum" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S_n = \\frac{a_1(q^n - 1)}{q - 1} \\quad (q \\neq 1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05E0\u05D5\u05E1\u05D7\u05EA \u05D4\u05E1\u05DB\u05D5\u05DD \u05DE\u05D0\u05E4\u05E9\u05E8\u05EA \u05DC\u05D7\u05E9\u05D1 \u05D0\u05EA \u05E1\u05DB\u05D5\u05DD n \u05D4\u05D0\u05D9\u05D1\u05E8\u05D9\u05DD \u05D4\u05E8\u05D0\u05E9\u05D5\u05E0\u05D9\u05DD \u05D1\u05DE\u05DB\u05D4 \u05D0\u05D7\u05EA. \u05D4\u05E0\u05D5\u05E1\u05D7\u05D4 \u05EA\u05E7\u05E4\u05D4 \u05E8\u05E7 \u05DB\u05E9 q \u2260 1.
              </div>
              <div style={{ marginTop: 10, color: "#EA580C", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                \uD83D\uDCA1 \u05D3\u05D5\u05D2\u05DE\u05D4: <InlineMath>{"a_1 = 2,\\; q = 3,\\; n = 4 \\Rightarrow S_4 = \\frac{2(81-1)}{2} = 80"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "infinite" && (
        <motion.div key="infinite" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S_\\infty = \\frac{a_1}{1 - q} \\quad (|q| < 1)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>\u05D4\u05E1\u05D1\u05E8:</strong> \u05DB\u05D0\u05E9\u05E8 \u05D4\u05E2\u05E8\u05DA \u05D4\u05DE\u05D5\u05D7\u05DC\u05D8 \u05E9\u05DC \u05D4\u05DE\u05E0\u05D4 \u05E7\u05D8\u05DF \u05DE-1, \u05D4\u05E1\u05D3\u05E8\u05D4 \u05DE\u05EA\u05DB\u05E0\u05E1\u05EA \u05DC\u05E1\u05DB\u05D5\u05DD \u05E1\u05D5\u05E4\u05D9. \u05D6\u05D4\u05D5 \u05EA\u05E0\u05D0\u05D9 \u05D4\u05D4\u05EA\u05DB\u05E0\u05E1\u05D5\u05EA \u2014 |q| &lt; 1.
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                \uD83D\uDCA1 \u05D3\u05D5\u05D2\u05DE\u05D4: <InlineMath>{"a_1 = 6,\\; q = \\frac{1}{2} \\Rightarrow S_\\infty = \\frac{6}{1 - 0.5} = 12"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── GeoSeriesLab (basic) ────────────────────────────────────────────────────

function GeoSeriesLab() {
  const [a1, setA1] = useState(3);
  const [q, setQ] = useState(2);
  const [n, setN] = useState(6);
  const safeQ = q === 1 ? 1.001 : q;
  const terms = Array.from({ length: n }, (_, i) => Math.round(a1 * Math.pow(q, i) * 100) / 100);
  const an = n > 0 ? Math.round(a1 * Math.pow(q, n - 1) * 100) / 100 : a1;
  const Sn = n === 0 ? 0 : q === 1 ? a1 * n : Math.round((a1 * (1 - Math.pow(safeQ, n)) / (1 - safeQ)) * 100) / 100;
  const isConverging = Math.abs(q) < 1 && q !== 0;

  const W = 280, H = 130, padX = 30, padY = 15;
  const maxAbs = Math.max(...terms.map(Math.abs), 1);
  const barW = n > 0 ? Math.min(30, (W - 2 * padX) / n - 4) : 30;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>\uD83D\uDD2C \u05DE\u05E2\u05D1\u05D3\u05EA \u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>\u05E9\u05E0\u05D4 \u05D0\u05EA a\u2081, q \u05D5-n \u2014 \u05E8\u05D0\u05D4 \u05D0\u05EA \u05D4\u05D0\u05D9\u05D1\u05E8\u05D9\u05DD \u05D5\u05D4\u05E1\u05DB\u05D5\u05DD \u05DE\u05EA\u05E2\u05D3\u05DB\u05E0\u05D9\u05DD \u05D1\u05DC\u05D9\u05D9\u05D1</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.88)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1.25rem" }}>
        {[
          { title: "\u05D0\u05D9\u05D1\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF", varSym: "a\u2081", val: a1, set: setA1, min: -10, max: 10 },
          { title: "\u05DE\u05E0\u05D4", varSym: "q", val: q, set: setQ, min: -5, max: 5 },
          { title: "\u05DE\u05E1\u05E4\u05E8 \u05D0\u05D9\u05D1\u05E8\u05D9\u05DD", varSym: "n", val: n, set: setN, min: 1, max: 12 },
        ].map((row) => (
          <div key={row.varSym}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{row.title} <span style={{ color: "#2D5A27", fontFamily: "monospace", fontWeight: 600 }}>({row.varSym})</span></span>
              <span style={{ color: "#2D5A27", fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={1} value={row.val} onChange={(e) => row.set(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
          </div>
        ))}
      </div>

      {/* Bar chart SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          <line x1={padX} y1={H / 2} x2={W - padX} y2={H / 2} stroke="#94a3b8" strokeWidth={1} />
          {terms.map((t, i) => {
            const barH = maxAbs === 0 ? 0 : (Math.abs(t) / maxAbs) * (H / 2 - padY);
            const x = padX + i * ((W - 2 * padX) / n) + 2;
            const isPos = t >= 0;
            return (
              <g key={i}>
                <rect
                  x={x} y={isPos ? H / 2 - barH : H / 2}
                  width={barW} height={barH}
                  fill={isPos ? "rgba(22,163,74,0.6)" : "rgba(220,38,38,0.5)"}
                  rx={3}
                />
                {i < 3 && (
                  <text x={x + barW / 2} y={H / 2 + (isPos ? 14 : -6)} fill="#64748b" fontSize={8} textAnchor="middle">
                    {i === 0 ? "a\u2081" : i === 1 ? "a\u2082" : "a\u2083"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "a\u2099", val: an, sub: "\u05D4\u05D0\u05D9\u05D1\u05E8 \u05D4\u05D0\u05D7\u05E8\u05D5\u05DF" },
          { label: "S\u2099", val: Sn, sub: "\u05E1\u05DB\u05D5\u05DD \u05D4\u05E1\u05D3\u05E8\u05D4" },
          { label: "q", val: q, sub: "\u05DE\u05E0\u05EA \u05D4\u05E1\u05D3\u05E8\u05D4" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(22,163,74,0.3)", padding: 14 }}>
            <div style={{ color: "#2D5A27", fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: "#16a34a", fontWeight: 700, fontSize: 18 }}>{row.val}</div>
            <div style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>{row.sub}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        {isConverging ? "\uD83D\uDFE2 \u05E1\u05D3\u05E8\u05D4 \u05DE\u05EA\u05DB\u05E0\u05E1\u05EA!" : "\uD83D\uDD34 \u05E1\u05D3\u05E8\u05D4 \u05DE\u05EA\u05E4\u05E6\u05DC\u05EA"}
      </p>
    </section>
  );
}

// ─── SumPairsLab (medium) ────────────────────────────────────────────────────

function SumPairsLab() {
  const [a1, setA1] = useState(4);
  const [q, setQ] = useState(2);

  const a2 = a1 * q;
  const a3 = a1 * q * q;
  const sum1 = a1 + a2;
  const sum2 = a2 + a3;
  const ratio = sum1 !== 0 ? Math.round((sum2 / sum1) * 100) / 100 : 0;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>\uD83D\uDD2C \u05DE\u05E2\u05D1\u05D3\u05EA \u05E1\u05DB\u05D5\u05DE\u05D9\u05DD \u05E8\u05E6\u05D5\u05E4\u05D9\u05DD</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>\u05E9\u05E0\u05D4 \u05D0\u05EA a\u2081 \u05D5-q \u2014 \u05E8\u05D0\u05D4 \u05D0\u05EA \u05D4\u05E7\u05E9\u05E8 \u05D1\u05D9\u05DF \u05D4\u05E1\u05DB\u05D5\u05DE\u05D9\u05DD</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "a\u2081", val: a1, min: -10, max: 10, set: setA1 },
          { label: "q", val: q, min: -5, max: 5, set: setQ },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.88)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#92400E", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        ))}
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "a\u2081+a\u2082", val: sum1, sub: "\u05E1\u05DB\u05D5\u05DD \u05E8\u05D0\u05E9\u05D5\u05DF" },
          { label: "a\u2082+a\u2083", val: sum2, sub: "\u05E1\u05DB\u05D5\u05DD \u05E9\u05E0\u05D9" },
          { label: "\u05D9\u05D7\u05E1", val: ratio, sub: "(a\u2082+a\u2083)/(a\u2081+a\u2082)" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(234,88,12,0.3)", padding: 14 }}>
            <div style={{ color: "#92400E", fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: "#EA580C", fontWeight: 700, fontSize: 18 }}>{row.val}</div>
            <div style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>{row.sub}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        \u05E9\u05D9\u05DE\u05D5 \u05DC\u05D1: \u05D4\u05D9\u05D7\u05E1 \u05D1\u05D9\u05DF \u05D4\u05E1\u05DB\u05D5\u05DE\u05D9\u05DD \u05E9\u05D5\u05D5\u05D4 \u05EA\u05DE\u05D9\u05D3 \u05DC-q!
      </p>
    </section>
  );
}

// ─── DualSeriesLab (advanced) ────────────────────────────────────────────────

function DualSeriesLab() {
  const [qA, setQA] = useState(3);
  const [dB, setDB] = useState(5);

  const a1A = 2;
  const nA = 10;
  const termsA = Array.from({ length: nA }, (_, i) => Math.round(a1A * Math.pow(qA, i) * 100) / 100);
  const SA = qA === 1 ? a1A * nA : Math.round((a1A * (1 - Math.pow(qA, nA)) / (1 - qA)) * 100) / 100;

  const b1B = 10;
  const nB = 10;
  const termsB = Array.from({ length: nB }, (_, i) => Math.round((b1B + i * dB) * 100) / 100);
  const SB = Math.round((nB / 2) * (2 * b1B + (nB - 1) * dB) * 100) / 100;

  const commonCount = termsA.filter(ta => termsB.some(tb => Math.abs(ta - tb) < 0.01)).length;

  const W = 280, H = 100, padX = 20;
  const maxA = Math.max(...termsA.map(Math.abs), 1);
  const maxB = Math.max(...termsB.map(Math.abs), 1);
  const barWA = Math.min(20, (W / 2 - padX * 2) / nA - 2);
  const barWB = Math.min(20, (W / 2 - padX * 2) / nB - 2);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>\uD83D\uDD2C \u05DE\u05E2\u05D1\u05D3\u05EA \u05E9\u05EA\u05D9 \u05E1\u05D3\u05E8\u05D5\u05EA</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>\u05E9\u05E0\u05D4 \u05D0\u05EA q (\u05D4\u05E0\u05D3\u05E1\u05D9\u05EA) \u05D5-d (\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA) \u2014 \u05D4\u05E9\u05D5\u05D5\u05D4 \u05D1\u05D9\u05DF \u05D4\u05E1\u05D3\u05E8\u05D5\u05EA</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "q (\u05D4\u05E0\u05D3\u05E1\u05D9\u05EA A)", val: qA, min: -4, max: 5, set: setQA },
          { label: "d (\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA B)", val: dB, min: -10, max: 20, set: setDB },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.88)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#991b1b", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
          </div>
        ))}
      </div>

      {/* Side-by-side bar charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        <div style={{ borderRadius: 16, border: "1px solid rgba(153,27,27,0.3)", background: "rgba(255,255,255,0.75)", padding: "1rem", textAlign: "center" }}>
          <div style={{ color: "#991b1b", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>A \u2014 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA</div>
          <svg viewBox={`0 0 ${W / 2} ${H}`} style={{ width: "100%", maxWidth: 180 }} aria-hidden>
            <line x1={5} y1={H - 10} x2={W / 2 - 5} y2={H - 10} stroke="#94a3b8" strokeWidth={0.8} />
            {termsA.slice(0, 8).map((t, i) => {
              const barH = maxA === 0 ? 0 : (Math.abs(t) / maxA) * (H - 20);
              return <rect key={i} x={5 + i * (barWA + 2)} y={H - 10 - barH} width={barWA} height={barH} fill="rgba(153,27,27,0.55)" rx={2} />;
            })}
          </svg>
        </div>
        <div style={{ borderRadius: 16, border: "1px solid rgba(30,64,175,0.3)", background: "rgba(255,255,255,0.75)", padding: "1rem", textAlign: "center" }}>
          <div style={{ color: "#1e40af", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>B \u2014 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA</div>
          <svg viewBox={`0 0 ${W / 2} ${H}`} style={{ width: "100%", maxWidth: 180 }} aria-hidden>
            <line x1={5} y1={H - 10} x2={W / 2 - 5} y2={H - 10} stroke="#94a3b8" strokeWidth={0.8} />
            {termsB.slice(0, 8).map((t, i) => {
              const barH = maxB === 0 ? 0 : (Math.abs(t) / maxB) * (H - 20);
              return <rect key={i} x={5 + i * (barWB + 2)} y={H - 10 - barH} width={barWB} height={barH} fill="rgba(30,64,175,0.55)" rx={2} />;
            })}
          </svg>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "S_A", val: SA > 999999 ? ">999K" : SA, sub: "\u05E1\u05DB\u05D5\u05DD \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA" },
          { label: "S_B", val: SB, sub: "\u05E1\u05DB\u05D5\u05DD \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA" },
          { label: "\u05DE\u05E9\u05D5\u05EA\u05E4\u05D9\u05DD", val: commonCount, sub: "\u05D0\u05D9\u05D1\u05E8\u05D9\u05DD \u05D6\u05D4\u05D9\u05DD" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(153,27,27,0.3)", padding: 14 }}>
            <div style={{ color: "#991b1b", fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: "#DC2626", fontWeight: 700, fontSize: 18 }}>{row.val}</div>
            <div style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>{row.sub}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        \u05E9\u05E0\u05D4 \u05D0\u05EA \u05D4\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05DE\u05EA\u05D9 \u05D4\u05E1\u05D3\u05E8\u05D5\u05EA \u05E0\u05E4\u05D2\u05E9\u05D5\u05EA
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeriesGeometricPage() {
  const [activeTab, setActiveTab] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === activeTab)!;

  const labMap: Record<string, React.ReactNode> = {
    basic: <GeoSeriesLab />,
    medium: <SumPairsLab />,
    advanced: <DualSeriesLab />,
  };

  return (
    <div style={{ background: "#F3EFE0", minHeight: "100vh", width: "100%" }}>
      <main style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem" }} dir="rtl">

        {/* Back + Title */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link
            href="/topic/grade12/series"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", transition: "background 0.15s" }}
          >
            <span style={{ fontSize: 16 }}>&larr;</span>
            \u05D7\u05D6\u05E8\u05D4 \u05DC\u05E1\u05D3\u05E8\u05D5\u05EA
          </Link>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "bold", marginTop: "0.75rem", color: "#1A1A1A" }}>\u05E1\u05D3\u05E8\u05D4 \u05D4\u05E0\u05D3\u05E1\u05D9\u05EA \u2014 \u05E2\u05DD AI</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>\u05DE\u05E0\u05D4, \u05D0\u05D9\u05D1\u05E8 \u05DB\u05DC\u05DC\u05D9, \u05E1\u05DB\u05D5\u05DD \u05D5\u05E1\u05DB\u05D5\u05DD \u05D0\u05D9\u05E0\u05E1\u05D5\u05E4\u05D9 \u2014 \u05D5\u05D0\u05D9\u05DA \u05DC\u05E9\u05D0\u05D5\u05DC AI \u05D0\u05EA \u05D4\u05E9\u05D0\u05DC\u05D5\u05EA \u05D4\u05E0\u05DB\u05D5\u05E0\u05D5\u05EA</p>
        </div>

        {/* SubtopicProgress */}
        <SubtopicProgress subtopicId="grade12/series-geometric" />

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "1.5rem", marginTop: "1.5rem" }}>
          {TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`rounded-2xl px-4 py-3 text-center transition-all cursor-pointer border-2 ${active ? `${t.border} ${t.bg}` : "border-transparent"}`}
                style={{ background: active ? undefined : "rgba(255,255,255,0.5)", boxShadow: active ? `0 0 14px ${t.glowColor}` : "none" }}>
                <div className={`font-extrabold text-base ${active ? t.textColor : "text-gray-400"}`}>{t.label}</div>
              </button>
            );
          })}
        </div>

        {/* Formula Bar */}
        <FormulaBar />

        {/* Exercise Card */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab */}
        {labMap[activeTab]}

        {/* MarkComplete */}
        <div style={{ marginTop: "2rem" }}>
          <MarkComplete subtopicId="grade12/series-geometric" level={activeTab} />
        </div>

        {/* Footer back link */}
        <div style={{ textAlign: "center", marginTop: "2.5rem", paddingBottom: "2rem" }}>
          <Link href="/topic/grade12/series" style={{ color: "#6B7280", fontSize: 13, textDecoration: "underline" }}>
            &larr; \u05D7\u05D6\u05E8\u05D4 \u05DC\u05E1\u05D3\u05E8\u05D5\u05EA
          </Link>
        </div>

      </main>
    </div>
  );
}
