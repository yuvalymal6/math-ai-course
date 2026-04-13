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
  return (
    <svg viewBox="0 0 260 130" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Speech bubble */}
      <rect x={30} y={10} width={200} height={70} rx={18} fill="none" stroke="#94a3b8" strokeWidth={1.8} />
      <polygon points="120,80 135,100 150,80" fill="none" stroke="#94a3b8" strokeWidth={1.8} />
      {/* Question mark inside bubble */}
      <text x={90} y={52} fontSize={28} fill="#16A34A" fontWeight={700} fontFamily="sans-serif" opacity={0.7}>?</text>
      {/* Arrow */}
      <line x1={130} y1={50} x2={170} y2={50} stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrowBasic)" />
      <defs>
        <marker id="arrowBasic" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#f59e0b" />
        </marker>
      </defs>
      {/* x + 7 = ? placeholder (no actual numbers) */}
      <text x={180} y={55} fontSize={16} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>
        <tspan>x + </tspan>
        <tspan fill="#94a3b8">_ </tspan>
        <tspan>= </tspan>
        <tspan fill="#94a3b8">_</tspan>
      </text>
      {/* Label */}
      <text x={130} y={122} fontSize={10} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">תרגום טקסט למשוואה</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 140" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Father figure */}
      <circle cx={80} cy={35} r={14} fill="none" stroke="#EA580C" strokeWidth={1.8} opacity={0.7} />
      <line x1={80} y1={49} x2={80} y2={85} stroke="#EA580C" strokeWidth={1.8} opacity={0.7} />
      <line x1={80} y1={85} x2={65} y2={110} stroke="#EA580C" strokeWidth={1.8} opacity={0.7} />
      <line x1={80} y1={85} x2={95} y2={110} stroke="#EA580C" strokeWidth={1.8} opacity={0.7} />
      <line x1={80} y1={60} x2={60} y2={75} stroke="#EA580C" strokeWidth={1.8} opacity={0.7} />
      <line x1={80} y1={60} x2={100} y2={75} stroke="#EA580C" strokeWidth={1.8} opacity={0.7} />
      <text x={80} y={125} fontSize={11} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">אבא: ?</text>

      {/* Son figure (shorter) */}
      <circle cx={180} cy={48} r={12} fill="none" stroke="#f59e0b" strokeWidth={1.8} opacity={0.7} />
      <line x1={180} y1={60} x2={180} y2={90} stroke="#f59e0b" strokeWidth={1.8} opacity={0.7} />
      <line x1={180} y1={90} x2={167} y2={110} stroke="#f59e0b" strokeWidth={1.8} opacity={0.7} />
      <line x1={180} y1={90} x2={193} y2={110} stroke="#f59e0b" strokeWidth={1.8} opacity={0.7} />
      <line x1={180} y1={72} x2={163} y2={84} stroke="#f59e0b" strokeWidth={1.8} opacity={0.7} />
      <line x1={180} y1={72} x2={197} y2={84} stroke="#f59e0b" strokeWidth={1.8} opacity={0.7} />
      <text x={180} y={125} fontSize={11} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">בן: ?</text>

      {/* Connection arrow between them */}
      <line x1={105} y1={65} x2={155} y2={65} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4,3" />
      <text x={130} y={60} fontSize={10} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">הפרש?</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 130" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Notebook icon */}
      <rect x={30} y={20} width={40} height={55} rx={4} fill="none" stroke="#DC2626" strokeWidth={1.8} opacity={0.65} />
      <line x1={38} y1={32} x2={62} y2={32} stroke="#DC2626" strokeWidth={1} opacity={0.4} />
      <line x1={38} y1={42} x2={62} y2={42} stroke="#DC2626" strokeWidth={1} opacity={0.4} />
      <line x1={38} y1={52} x2={62} y2={52} stroke="#DC2626" strokeWidth={1} opacity={0.4} />
      <line x1={38} y1={62} x2={55} y2={62} stroke="#DC2626" strokeWidth={1} opacity={0.4} />
      {/* Price tag on notebook */}
      <circle cx={72} cy={22} r={10} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={72} y={26} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>

      {/* Pen icon */}
      <line x1={145} y1={25} x2={145} y2={70} stroke="#a78bfa" strokeWidth={3} strokeLinecap="round" opacity={0.65} />
      <polygon points="145,70 140,80 150,80" fill="#a78bfa" opacity={0.65} />
      <circle cx={145} cy={22} r={3} fill="#a78bfa" opacity={0.65} />
      {/* Price tag on pen */}
      <circle cx={160} cy={30} r={10} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={160} y={34} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>

      {/* Equals / total */}
      <text x={205} y={55} fontSize={16} fill="#94a3b8" fontFamily="sans-serif" fontWeight={600}>=</text>
      <rect x={225} y={35} width={40} height={30} rx={8} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={245} y={55} fontSize={14} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">?</text>

      {/* Label */}
      <text x={140} y={115} fontSize={10} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">תרגום בעיה מילולית למערכת משוואות</text>
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
        subjectWords={["משוואה", "נעלם", "תרגום", "בעיה מילולית", "הגדרה", "פתרון"]}
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
    title: "מספר ועוד 7",
    problem: "חשבו על מספר. הוסיפו לו 7. התוצאה היא 23. מהו המספר?\n\nא. הגדירו משתנה — מה x מייצג?\nב. כתבו משוואה מתוך הטקסט.\nג. פתרו את המשוואה.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "כתיבת המשוואה הפוכה", text: "תלמידים רבים כותבים 23 + 7 = x במקום x + 7 = 23. חשוב לקרוא את הטקסט בזהירות ולתרגם כל חלק בנפרד: 'מספר' = x, 'הוסיפו לו 7' = x + 7, 'התוצאה היא 23' = שווה 23." },
      { title: "שכחת מה x מייצג", text: "לפני שפותרים — חובה לכתוב 'יהי x = המספר שחשבנו עליו'. בלי הגדרה ברורה קל להתבלבל ולשכוח מה בעצם מחפשים." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י', 3 יחידות, ומצרף/ת בעיה מילולית בנושא תרגום טקסט למשוואה. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "הגדרת משתנה", coaching: "", prompt: "בבעיה כתוב 'חשבו על מספר'. תנחה אותי כיצד להגדיר משתנה — מה x מייצג כאן, ולמה חשוב לכתוב את ההגדרה לפני הכל.", keywords: [], keywordHint: "", contextWords: ["משתנה", "x", "הגדרה", "מספר", "מייצג", "יהי"] },
      { phase: "סעיף ב׳", label: "בניית משוואה מהטקסט", coaching: "", prompt: "בבעיה כתוב 'הוסיפו לו 7, התוצאה היא 23'. תדריך אותי לתרגם כל חלק בנפרד למשוואה — איך הופכים מילים לסימנים מתמטיים.", keywords: [], keywordHint: "", contextWords: ["משוואה", "תרגום", "חיבור", "שווה", "הוסיפו", "תוצאה"] },
      { phase: "סעיף ג׳", label: "פתרון המשוואה", coaching: "", prompt: "כתבתי את המשוואה מהסעיף הקודם. תנחה אותי לפתור אותה — באיזו פעולה הפוכה להשתמש כדי לבודד את x.", keywords: [], keywordHint: "", contextWords: ["פתרון", "חיסור", "בידוד", "x", "פעולה הפוכה", "אגף"] },
    ],
  },
  {
    id: "medium",
    title: "גילאים",
    problem: "אבא גדול מבנו ב-25 שנה. סכום גילאיהם הוא 53.\nמצאו את גיל כל אחד.\n\nא. הגדירו משתנים — מי יהיה x? מה הגיל של השני?\nב. כתבו משוואה מהנתון 'סכום גילאיהם הוא 53'.\nג. פתרו ובדקו — האם שני הגילאים הגיוניים?",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "הגדרת שני משתנים נפרדים", text: "כשכתוב 'אבא גדול מבנו ב-25' אין צורך בשני משתנים! מספיק להגדיר x = גיל הבן, ואז גיל האבא = x + 25. שימוש ב-x ו-y בנפרד מסבך את הפתרון שלא לצורך." },
      { title: "לא בודקים שהתשובה הגיונית", text: "אחרי שמוצאים את x, חובה לבדוק: האם גיל הבן חיובי? האם גיל האבא גדול מגיל הבן? האם ההפרש אכן 25? תשובה מתמטית נכונה יכולה להיות לא הגיונית במציאות." },
    ],
    goldenPrompt: `אני בכיתה י', 3 יחידות, מצרף/ת בעיה מילולית בנושא גילאים שדורשת תרגום טקסט למשוואה.

אל תיתן לי את הפתרון — שאל אותי שאלות מנחות על הגדרת משתנה, בניית משוואה מתוך הטקסט, ובדיקת סבירות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "הגדרת משתנים", coaching: "", prompt: "בבעיה כתוב 'אבא גדול מבנו ב-25 שנה'. תנחה אותי כיצד להגדיר משתנה אחד בלבד כך שגם גיל הבן וגם גיל האבא יהיו מבוטאים באמצעותו.", keywords: [], keywordHint: "", contextWords: ["משתנה", "x", "הגדרה", "גיל", "הפרש", "ביטוי"] },
      { phase: "סעיף ב׳", label: "בניית משוואה", coaching: "", prompt: "הגדרתי x = גיל הבן. תדריך אותי לכתוב משוואה מהמשפט 'סכום גילאיהם הוא 53' — כיצד מתרגמים 'סכום' ו'הוא' לסימנים.", keywords: [], keywordHint: "", contextWords: ["משוואה", "סכום", "שווה", "חיבור", "תרגום", "סכום גילאים"] },
      { phase: "סעיף ג׳", label: "פתרון ובדיקה", coaching: "", prompt: "כתבתי את המשוואה. תנחה אותי לפתור ואז לבדוק — האם שני הגילאים חיוביים והגיוניים? האם ההפרש ביניהם באמת 25?", keywords: [], keywordHint: "", contextWords: ["פתרון", "בדיקה", "סבירות", "חיובי", "הגיוני", "הפרש"] },
    ],
  },
  {
    id: "advanced",
    title: "מחיר ותשלום",
    problem: "קנית מחברות ועטים. 4 מחברות ו-3 עטים עלו 35₪. מחברת יקרה מעט ב-2₪.\nכמה עולה כל פריט?\n\nא. הגדירו משתנים — מה כל אחד מייצג?\nב. כתבו שתי משוואות מתוך הטקסט.\nג. פתרו את מערכת המשוואות.\nד. בדקו: האם 4 × מחיר מחברת + 3 × מחיר עט = 35?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "תרגום שגוי של 'יקרה מעט ב-2₪'", text: "המשפט 'מחברת יקרה מעט ב-2₪' אומר שמחיר מחברת = מחיר עט + 2. תלמידים רבים כותבים את ההפרש הפוך (עט = מחברת + 2) או מבלבלים מי יקר יותר." },
      { title: "שכחה לבדוק את שתי המשוואות", text: "בבעיה עם מערכת משוואות, חובה לבדוק שהפתרון מקיים את שתי המשוואות — לא רק אחת. הציבו את הערכים בחזרה בשתיהן." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מתרגמים בעיה מילולית עם שני נעלמים למערכת משוואות? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הגדרת משתנים", coaching: "", prompt: "בבעיה יש מחברות ועטים. תנחה אותי כיצד להגדיר שני משתנים — מה כל אחד מייצג ולמה חשובה הגדרה ברורה.", keywords: [], keywordHint: "", contextWords: ["משתנה", "נעלם", "הגדרה", "מחיר", "מחברת", "עט"] },
      { phase: "סעיף ב׳", label: "בניית שתי משוואות", coaching: "", prompt: "מתוך הבעיה: '4 מחברות ו-3 עטים עלו 35₪' ו'מחברת יקרה מעט ב-2₪'. תדריך אותי לתרגם כל משפט למשוואה נפרדת.", keywords: [], keywordHint: "", contextWords: ["משוואה", "תרגום", "מערכת", "עלות", "הפרש", "יקרה"] },
      { phase: "סעיף ג׳", label: "פתרון מערכת", coaching: "", prompt: "כתבתי שתי משוואות עם שני נעלמים. תנחה אותי לבחור שיטת פתרון — הצבה או חיסור — ולפתור שלב אחר שלב.", keywords: [], keywordHint: "", contextWords: ["מערכת משוואות", "הצבה", "פתרון", "נעלם", "שיטה", "בידוד"] },
      { phase: "סעיף ד׳", label: "בדיקת הפתרון", coaching: "", prompt: "מצאתי ערכים למחיר מחברת ולמחיר עט. תנחה אותי להציב בחזרה בשתי המשוואות ולוודא שהכל מתאים.", keywords: [], keywordHint: "", contextWords: ["בדיקה", "הצבה", "מקיים", "משוואה", "אימות", "נכון"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📝 תרגום מילולי למתמטי (Word Problem Translation)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "הגדרת משתנה, תרגום משפט פשוט למשוואה, ופתרון — הצעד הראשון בבעיות מילוליות."}
            {ex.id === "medium" && "בעיית גילאים — הגדרת משתנה אחד לשני גדלים, בניית משוואה מסכום, ובדיקת סבירות."}
            {ex.id === "advanced" && "בעיה עם שני נעלמים — תרגום טקסט למערכת משוואות, פתרון ובדיקה."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: כללי תרגום */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>כללי תרגום</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>משתנה</span>
              <span>יהי x = ... (הגדרה ברורה של מה מחפשים).</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>משוואה</span>
              <span>תרגום כל חלק בטקסט לסימן מתמטי.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>בדיקה</span>
              <span>הצבת התשובה חזרה בטקסט המקורי לוידוא.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>טיפים מתקדמים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>משתנה אחד</span>
                  <span>כשיש קשר בין שני גדלים — מספיק משתנה אחד.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>סבירות</span>
                  <span>בדקו שהתשובה הגיונית בהקשר של הבעיה.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>מערכת משוואות</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>2 משוואות</span>
                  <span>כל משפט בטקסט נותן משוואה אחרת.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>הצבה</span>
                  <span>בודדים משתנה אחד ומציבים בשנייה.</span>
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

// ─── SimpleEquationLab (basic) ──────────────────────────────────────────────

function SimpleEquationLab() {
  const [x, setX] = useState(10);
  const st = STATION.basic;
  const TARGET = 23;
  const ADD = 7;
  const result = x + ADD;
  const isCorrect = result === TARGET;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משוואה פשוטה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזיזו את הסליידר כדי למצוא את הערך של x כך ש-x + 7 = 23.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>ערך x</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{x}</span>
          </div>
          <input type="range" min={0} max={30} step={1} value={x} onChange={(e) => setX(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Dynamic SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 300 80" className="w-full max-w-md mx-auto" aria-hidden>
          {/* x box */}
          <rect x={20} y={15} width={60} height={50} rx={12} fill={isCorrect ? "rgba(22,163,74,0.15)" : "rgba(22,163,74,0.06)"} stroke={isCorrect ? "#16A34A" : "#94a3b8"} strokeWidth={1.5} />
          <text x={50} y={47} fontSize={20} fill={isCorrect ? "#16A34A" : "#2D3436"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{x}</text>

          {/* + 7 */}
          <text x={100} y={47} fontSize={18} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">+</text>
          <rect x={115} y={15} width={45} height={50} rx={12} fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth={1.2} />
          <text x={137.5} y={47} fontSize={18} fill="#f59e0b" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{ADD}</text>

          {/* = */}
          <text x={180} y={47} fontSize={18} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">=</text>

          {/* Result */}
          <rect x={195} y={15} width={60} height={50} rx={12} fill={isCorrect ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.06)"} stroke={isCorrect ? "#16A34A" : "#dc2626"} strokeWidth={1.5} strokeDasharray={isCorrect ? "none" : "4,3"} />
          <text x={225} y={47} fontSize={20} fill={isCorrect ? "#16A34A" : "#dc2626"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{result}</text>

          {/* Target indicator */}
          <text x={275} y={32} fontSize={10} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">יעד</text>
          <text x={275} y={52} fontSize={16} fill="#94a3b8" textAnchor="middle" fontFamily="monospace" fontWeight={700}>{TARGET}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "x", val: String(x) },
          { label: "x + 7", val: String(result) },
          { label: "יעד", val: String(TARGET) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: isCorrect ? "#16A34A" : "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16, fontWeight: isCorrect ? 700 : 400 }}>
        {isCorrect ? "מצוין! x = 16 אכן מקיים x + 7 = 23" : "הזיזו את הסליידר עד שהתוצאה תתאים ליעד..."}
      </p>
    </section>
  );
}

// ─── AgesLab (medium) ───────────────────────────────────────────────────────

function AgesLab() {
  const [sonAge, setSonAge] = useState(10);
  const st = STATION.medium;
  const DIFF = 25;
  const TARGET_SUM = 53;
  const fatherAge = sonAge + DIFF;
  const sum = sonAge + fatherAge;
  const isCorrect = sum === TARGET_SUM;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת גילאים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזיזו את הסליידר כדי למצוא את גיל הבן כך שסכום הגילאים יהיה 53.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>גיל הבן (x)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sonAge}</span>
          </div>
          <input type="range" min={1} max={40} step={1} value={sonAge} onChange={(e) => setSonAge(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* Dynamic SVG — stick figures with age labels */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 130" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Father */}
          <circle cx={80} cy={28} r={14} fill="none" stroke={isCorrect ? "#16A34A" : "#EA580C"} strokeWidth={1.8} opacity={0.7} />
          <line x1={80} y1={42} x2={80} y2={78} stroke={isCorrect ? "#16A34A" : "#EA580C"} strokeWidth={1.8} opacity={0.7} />
          <line x1={80} y1={78} x2={65} y2={100} stroke={isCorrect ? "#16A34A" : "#EA580C"} strokeWidth={1.8} opacity={0.7} />
          <line x1={80} y1={78} x2={95} y2={100} stroke={isCorrect ? "#16A34A" : "#EA580C"} strokeWidth={1.8} opacity={0.7} />
          <line x1={80} y1={55} x2={60} y2={68} stroke={isCorrect ? "#16A34A" : "#EA580C"} strokeWidth={1.8} opacity={0.7} />
          <line x1={80} y1={55} x2={100} y2={68} stroke={isCorrect ? "#16A34A" : "#EA580C"} strokeWidth={1.8} opacity={0.7} />
          <text x={80} y={118} fontSize={13} fill={isCorrect ? "#16A34A" : "#EA580C"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{fatherAge}</text>

          {/* Son */}
          <circle cx={190} cy={38} r={12} fill="none" stroke={isCorrect ? "#16A34A" : "#f59e0b"} strokeWidth={1.8} opacity={0.7} />
          <line x1={190} y1={50} x2={190} y2={80} stroke={isCorrect ? "#16A34A" : "#f59e0b"} strokeWidth={1.8} opacity={0.7} />
          <line x1={190} y1={80} x2={177} y2={100} stroke={isCorrect ? "#16A34A" : "#f59e0b"} strokeWidth={1.8} opacity={0.7} />
          <line x1={190} y1={80} x2={203} y2={100} stroke={isCorrect ? "#16A34A" : "#f59e0b"} strokeWidth={1.8} opacity={0.7} />
          <line x1={190} y1={62} x2={173} y2={74} stroke={isCorrect ? "#16A34A" : "#f59e0b"} strokeWidth={1.8} opacity={0.7} />
          <line x1={190} y1={62} x2={207} y2={74} stroke={isCorrect ? "#16A34A" : "#f59e0b"} strokeWidth={1.8} opacity={0.7} />
          <text x={190} y={118} fontSize={13} fill={isCorrect ? "#16A34A" : "#f59e0b"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{sonAge}</text>

          {/* Sum indicator */}
          <text x={135} y={60} fontSize={11} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">סכום</text>
          <text x={135} y={78} fontSize={16} fill={isCorrect ? "#16A34A" : "#6B7280"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{sum}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "גיל הבן", val: String(sonAge) },
          { label: "גיל האבא", val: String(fatherAge) },
          { label: "סכום", val: String(sum) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: isCorrect ? "#16A34A" : st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: isCorrect ? "#16A34A" : "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16, fontWeight: isCorrect ? 700 : 400 }}>
        {isCorrect ? "מצוין! גיל הבן 14, גיל האבא 39 — סכום 53 והפרש 25!" : "הזיזו את הסליידר עד שסכום הגילאים יגיע ל-53..."}
      </p>
    </section>
  );
}

// ─── ShoppingLab (advanced) ─────────────────────────────────────────────────

function ShoppingLab() {
  const [notebookPrice, setNotebookPrice] = useState(5);
  const [penPrice, setPenPrice] = useState(3);
  const st = STATION.advanced;

  const totalCost = 4 * notebookPrice + 3 * penPrice;
  const priceDiff = notebookPrice - penPrice;
  const totalCorrect = totalCost === 35;
  const diffCorrect = priceDiff === 2;
  const allCorrect = totalCorrect && diffCorrect;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת קניות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>מצאו את מחיר המחברת והעט כך ש-4 מחברות + 3 עטים = 35₪ ומחברת יקרה ב-2₪.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 500, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>מחיר מחברת</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{notebookPrice}₪</span>
          </div>
          <input type="range" min={1} max={15} step={1} value={notebookPrice} onChange={(e) => setNotebookPrice(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>מחיר עט</span>
            <span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{penPrice}₪</span>
          </div>
          <input type="range" min={1} max={15} step={1} value={penPrice} onChange={(e) => setPenPrice(+e.target.value)} style={{ width: "100%", accentColor: "#a78bfa" }} />
        </div>
      </div>

      {/* Dynamic SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 320 120" className="w-full max-w-md mx-auto" aria-hidden>
          {/* 4 Notebooks */}
          {[0, 1, 2, 3].map(i => (
            <g key={`nb${i}`}>
              <rect x={15 + i * 35} y={15} width={28} height={40} rx={3} fill={allCorrect ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.08)"} stroke={allCorrect ? "#16A34A" : "#DC2626"} strokeWidth={1.2} opacity={0.7} />
              <line x1={20 + i * 35} y1={25} x2={38 + i * 35} y2={25} stroke={allCorrect ? "#16A34A" : "#DC2626"} strokeWidth={0.5} opacity={0.4} />
              <line x1={20 + i * 35} y1={32} x2={38 + i * 35} y2={32} stroke={allCorrect ? "#16A34A" : "#DC2626"} strokeWidth={0.5} opacity={0.4} />
              <line x1={20 + i * 35} y1={39} x2={35 + i * 35} y2={39} stroke={allCorrect ? "#16A34A" : "#DC2626"} strokeWidth={0.5} opacity={0.4} />
            </g>
          ))}

          {/* + */}
          <text x={162} y={40} fontSize={16} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">+</text>

          {/* 3 Pens */}
          {[0, 1, 2].map(i => (
            <g key={`pen${i}`}>
              <line x1={180 + i * 30} y1={18} x2={180 + i * 30} y2={50} stroke={allCorrect ? "#16A34A" : "#a78bfa"} strokeWidth={2.5} strokeLinecap="round" opacity={0.65} />
              <polygon points={`${180 + i * 30},50 ${176 + i * 30},58 ${184 + i * 30},58`} fill={allCorrect ? "#16A34A" : "#a78bfa"} opacity={0.65} />
            </g>
          ))}

          {/* = total */}
          <text x={260} y={40} fontSize={16} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">=</text>
          <rect x={275} y={18} width={35} height={35} rx={10} fill={totalCorrect ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.06)"} stroke={totalCorrect ? "#16A34A" : "#94a3b8"} strokeWidth={1.2} />
          <text x={292.5} y={42} fontSize={16} fill={totalCorrect ? "#16A34A" : "#2D3436"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{totalCost}</text>

          {/* Diff indicator */}
          <text x={80} y={85} fontSize={10} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">הפרש מחירים:</text>
          <text x={80} y={102} fontSize={14} fill={diffCorrect ? "#16A34A" : "#dc2626"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{priceDiff}₪</text>
          <text x={80} y={115} fontSize={9} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">(צריך: 2₪)</text>

          <text x={230} y={85} fontSize={10} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">סה"כ עלות:</text>
          <text x={230} y={102} fontSize={14} fill={totalCorrect ? "#16A34A" : "#dc2626"} textAnchor="middle" fontFamily="monospace" fontWeight={700}>{totalCost}₪</text>
          <text x={230} y={115} fontSize={9} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">(צריך: 35₪)</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "4n + 3p", val: `${totalCost}₪`, ok: totalCorrect },
          { label: "הפרש (n - p)", val: `${priceDiff}₪`, ok: diffCorrect },
          { label: "תקין?", val: allCorrect ? "כן!" : "לא", ok: allCorrect },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid ${row.ok ? "rgba(22,163,74,0.4)" : `rgba(${st.glowRgb},0.4)`}`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.ok ? "#16A34A" : st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: allCorrect ? "#16A34A" : "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16, fontWeight: allCorrect ? 700 : 400 }}>
        {allCorrect ? "מצוין! מחברת = 5₪, עט = 3₪ — שתי המשוואות מתקיימות!" : "כוונו את שני הסליידרים עד ששתי המשוואות מתקיימות בו-זמנית..."}
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
  const [activeTab, setActiveTab] = useState<"variable" | "equation" | "check" | null>(null);

  const tabs = [
    { id: "variable" as const, label: "הגדרת משתנה", tex: "x = ?", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "equation" as const, label: "בניית משוואה", tex: "a + b = c", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "check" as const, label: "בדיקה", tex: "\\checkmark", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>כלים לתרגום בעיות מילוליות</div>

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

      {/* Expanded: Variable definition */}
      {activeTab === "variable" && (
        <motion.div key="variable" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\text{Let } x = \\text{...}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מתי משתמשים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>קוראים את הבעיה ומזהים מה לא ידוע.</li>
                  <li>כותבים: "יהי x = ..." עם הסבר ברור.</li>
                  <li>אם יש שני נעלמים עם קשר — מבטאים את השני באמצעות x.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: "אבא גדול מבנו ב-25" — יהי x = גיל הבן, גיל האבא = x + 25
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Building equation */}
      {activeTab === "equation" && (
        <motion.div key="equation" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#EA580C", fontSize: 16, fontWeight: 700 }}>
              תרגום מילים לסימנים
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מילון תרגום:</strong>
                <div dir="rtl" style={{ margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div>"הוסיפו" / "יותר מ" / "סכום" → <InlineMath>{"+"}</InlineMath></div>
                  <div>"פחות מ" / "הפרש" / "גרעו" → <InlineMath>{"-"}</InlineMath></div>
                  <div>"כפול" / "פי" / "מכפלה" → <InlineMath>{"\\times"}</InlineMath></div>
                  <div>"התוצאה היא" / "שווה ל" / "הוא" → <InlineMath>{"="}</InlineMath></div>
                </div>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: "הוסיפו לו 7, התוצאה 23" → x + 7 = 23
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Check */}
      {activeTab === "check" && (
        <motion.div key="check" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              בדיקה — חזרה לטקסט המקורי
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך בודקים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מציבים את x שמצאנו בחזרה במשוואה.</li>
                  <li>קוראים שוב את הטקסט המקורי ובודקים שהתשובה הגיונית.</li>
                  <li>שואלים: האם התשובה חיובית? האם היא הגיונית בהקשר?</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: x = 16. בדיקה: 16 + 7 = 23. וגם: "חשבנו על 16, הוספנו 7, יצא 23" — מתאים!
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WordProblemTranslationPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>תרגום מילולי למתמטי עם AI — כיתה י׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>הגדרת משתנה, בניית משוואה מטקסט, ובדיקת פתרון — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade10/word-problems"
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

        <SubtopicProgress subtopicId="3u/grade10/word-problems/translation" />

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
        {selectedLevel === "basic" && <SimpleEquationLab />}
        {selectedLevel === "medium" && <AgesLab />}
        {selectedLevel === "advanced" && <ShoppingLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/word-problems/translation" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
