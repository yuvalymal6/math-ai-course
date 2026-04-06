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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",   ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",  ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",     ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={130} x2={240} y2={130} stroke="#6B7280" strokeWidth={1.2} />
      <line x1={40} y1={130} x2={40} y2={15} stroke="#6B7280" strokeWidth={1.2} />
      <text x={245} y={134} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={36} y={12} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
      {/* Root curve shape — starting from a point, rising */}
      <path d="M 90,130 C 110,130 130,100 160,75 C 190,52 220,40 235,35" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      {/* Start point marker */}
      <circle cx={90} cy={130} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={90} y={118} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Forbidden zone */}
      <rect x={40} y={15} width={50} height={115} fill="#94a3b8" opacity={0.08} />
      <text x={60} y={80} fontSize={9} fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">לא מוגדר</text>
      <text x={235} y={30} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>f</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={140} x2={260} y2={140} stroke="#6B7280" strokeWidth={1.2} />
      <line x1={140} y1={170} x2={140} y2={10} stroke="#6B7280" strokeWidth={1.2} />
      <text x={265} y={144} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={136} y={8} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
      {/* Symmetric V-shape — two branches rising from two points */}
      <path d="M 55,140 C 60,130 65,100 80,70 C 95,42 110,25 125,15" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M 225,140 C 220,130 215,100 200,70 C 185,42 170,25 155,15" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      {/* Start point markers */}
      <circle cx={55} cy={140} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={55} y={128} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      <circle cx={225} cy={140} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={225} y={128} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Forbidden zone in middle */}
      <rect x={55} y={10} width={170} height={130} fill="#94a3b8" opacity={0.05} />
      <text x={235} y={20} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>f</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={140} x2={260} y2={140} stroke="#6B7280" strokeWidth={1.2} />
      <line x1={60} y1={170} x2={60} y2={10} stroke="#6B7280" strokeWidth={1.2} />
      <text x={265} y={144} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={56} y={8} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
      {/* Root curve with parameters */}
      <path d="M 85,140 C 100,130 130,90 170,60 C 200,40 230,30 250,25" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      {/* Start point */}
      <circle cx={85} cy={140} r={5} fill="none" stroke="#34d399" strokeWidth={2} />
      <text x={85} y={128} fontSize={11} fill="#34d399" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>?</text>
      {/* Parameter labels */}
      <text x={210} y={25} fontSize={11} fill="#64748b" fontFamily="sans-serif">a = ?</text>
      <text x={210} y={42} fontSize={11} fill="#64748b" fontFamily="sans-serif">b = ?</text>
      <text x={252} y={20} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>f</text>
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

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>&#10024;</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן &#9997;&#65039;</div>
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
      <span style={{ fontSize: 16 }}>&#128274;</span>
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
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה &#129302;
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
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              &#9989; פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result!.score}/100</strong>
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

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span>&#128274;</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
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
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(220,38,38,0.2)"}` }}>
        {passed
          ? <CheckCircle size={14} color="#34d399" />
          : <span style={{ color: "#DC2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.4)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>
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
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(220,38,38,0.35)", color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
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
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  סיימתי סעיף זה &#10003;
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>&#128274;</div>
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
        subjectWords={["שורש", "תחום", "נגזרת", "חקירה", "שרשרת", "מונוטוניות"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } — { s.label }</span>
              <span style={{ fontSize: 16 }}>&#128274;</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ s.phase } — { s.label }</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{ s.prompt }</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                סיימתי סעיף זה &#10003;
              </button>
            </div>
          )}
        </div>
      ))}

      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#127942;</div>
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
    title: "חקירת פונקציית שורש",
    problem: "נתונה הפונקציה:\nf(x) = \u221A(x \u2212 4)\n\n\u05D0. מצא את תחום ההגדרה.\n\u05D1. מצא את f\u2032(x).\n\u05D2. האם הפונקציה עולה או יורדת? היכן היא מוגדרת?",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שכחת שהתנאי הוא \u2265 ולא >", text: "הביטוי מתחת לשורש חייב להיות אי-שלילי (\u2265 0), לא חיובי ממש. הנקודה שבה הביטוי שווה 0 כן שייכת לתחום." },
      { title: "\u26A0\uFE0F נגזרת שורש \u2014 לא לשכוח את המכנה", text: "הנגזרת של \u221Au היא u\u2032/(2\u221Au). תלמידים רבים שוכחים את ה-2 במכנה או את הנגזרת הפנימית." },
    ],
    goldenPrompt: "היי, אני תלמיד כיתה יא\u2032.\n\u05E6\u05D9\u05E8\u05E4\u05EA\u05D9 לך תרגיל על פונקציית שורש \u2014 f(x) = \u221A(x\u22124).\nהנה הפרוטוקול שלנו:\n\n1\uFE0F\u20E3 סריקה:\nקודם כל, תסרוק את הנתונים ותכתוב לי רק:\n\"\u05D6\u05D9\u05D4\u05D9\u05EA\u05D9. מחכה להוראות לסעיף א\u2032.\"\n(אל תפתור כלום ואל תסביר כלום בשלב הזה!)\n\n2\uFE0F\u20E3 תפקיד:\nאתה המורה שלי \u2014 אל תיתן לי תשובות, שאל אותי שאלות מכווינות.\n\n3\uFE0F\u20E3 שיטת עבודה:\nבכל שלב \u2014 שאלה מכווינה אחת בלבד. חכה לתגובה שלי לפני שממשיך.",
    steps: [
      { phase: "שלב א\u2032", label: "מציאת תחום \u2014 מתי הביטוי מתחת לשורש מוגדר?", coaching: "", prompt: "נתונה f(x) = \u221A(x\u22124). תנחה אותי \u2014 מה התנאי על הביטוי מתחת לשורש כדי שהפונקציה תהיה מוגדרת? אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["תחום", "אי-שוויון", "שורש", "מוגדר", "אי-שלילי", "x\u22124"] },
      { phase: "שלב ב\u2032", label: "כתיבת תחום בסימון קבוצתי", coaching: "", prompt: "נתונה f(x) = \u221A(x\u22124). מצאתי את התנאי על x. תנחה אותי \u2014 איך כותבים את התחום בסימון קבוצתי או בסימון קטע? אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["סימון", "קטע", "קבוצתי", "תחום", "\u221E", "סוגר"] },
      { phase: "שלב ג\u2032", label: "גזירת פונקציית שורש", coaching: "", prompt: "נתונה f(x) = \u221A(x\u22124). תנחה אותי \u2014 איך גוזרים פונקציית שורש? מה הנוסחה הכללית לנגזרת של \u221Au? אל תיתן לי את התשובה הסופית.", keywords: [], keywordHint: "", contextWords: ["נגזרת", "שורש", "כלל", "גזירה", "מכנה", "f\u2032(x)"] },
    ],
  },
  {
    id: "medium",
    title: "חקירה עם תחום מורחב",
    problem: "נתונה הפונקציה:\nf(x) = \u221A(x\u00B2 \u2212 9)\n\n\u05D0. מצא את תחום ההגדרה (פתור x\u00B2\u22129 \u2265 0).\n\u05D1. מצא את f\u2032(x) בעזרת כלל השרשרת.\n\u05D2. מצא נקודות קיצון.\n\u05D3. שרטט סקיצה של הפונקציה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שוכחים את הענף השמאלי", text: "x\u00B2\u22129 \u2265 0 מתקיים גם עבור ערכי x שליליים, לא רק חיוביים. תחום ההגדרה מורכב משני קטעים נפרדים!" },
      { title: "\u26A0\uFE0F כלל השרשרת \u2014 לא לשכוח את הנגזרת הפנימית", text: "כשגוזרים \u221A(g(x)), חובה לכפול ב-g\u2032(x). תלמידים רבים שוכחים את הנגזרת הפנימית של x\u00B2\u22129." },
    ],
    goldenPrompt: "היי, אני תלמיד כיתה יא\u2032.\nאני צריך חקירה מלאה של f(x) = \u221A(x\u00B2\u22129).\nאתה המורה שלי \u2014 אל תיתן לי תשובות, שאל שאלות מכווינות בלבד.\n\nקודם כל, סרוק את הפונקציה ואל תכתוב שום פתרון.\nחכה לי בין שלב לשלב.",
    steps: [
      { phase: "סעיף א\u2032", label: "פתירת האי-שוויון x\u00B2\u22129 \u2265 0", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["אי-שוויון", "תחום", "פירוק", "שורשים", "x\u00B2\u22129", "סימן"] },
      { phase: "סעיף ב\u2032", label: "כתיבת התחום המלא בסימון קבוצתי", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["תחום", "איחוד", "קטעים", "סימון קבוצתי", "\u221E", "\u222A"] },
      { phase: "סעיף ג\u2032", label: "גזירה בכלל השרשרת", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["כלל השרשרת", "נגזרת", "f\u2032(x)", "נגזרת פנימית", "מכנה", "שורש"] },
      { phase: "סעיף ד\u2032", label: "קיצון ומונוטוניות", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["קיצון", "מונוטוניות", "עולה", "יורדת", "סימן", "f\u2032(x)"] },
    ],
  },
  {
    id: "advanced",
    title: "פונקציית שורש עם פרמטרים",
    problem: "נתונה הפונקציה:\nf(x) = \u221A(ax + b)\n\nידוע:\n\u2022 הפונקציה עוברת דרך הנקודה (3, 2)\n\u2022 f\u2032(3) = 1/2\n\n\u05D0. מצא את a ו-b.\n\u05D1. בצע חקירה מלאה של הפונקציה.\n\u05D2. מצא את השטח מתחת לעקומה בקטע [2, 5].",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שני תנאים \u2014 מערכת משוואות", text: "f(3)=2 נותנת משוואה אחת, ו-f\u2032(3)=1/2 נותנת משוואה שנייה. חובה להשתמש בשתיהן כדי למצוא שני נעלמים." },
      { title: "\u26A0\uFE0F ריבוע שני הצדדים \u2014 לא לשכוח", text: "כשמציבים f(3)=2, מקבלים \u221A(3a+b)=2. כדי להיפטר מהשורש חובה לרבע את שני צדי המשוואה." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים \u2014 כתוב פרומפט שלם שמסביר ל-AI איך לנהל חקירת פונקציית שורש עם פרמטרים. כלול: הגדרת תפקיד, איסור פתרון, בקשת הנחיה, הנושא המתמטי, ודרישת המתנה בין סעיפים.",
    steps: [
      { phase: "סעיף א\u2032", label: "בניית משוואות מהתנאים", coaching: "", prompt: "נתונה f(x) = \u221A(ax+b). ידוע ש-f(3)=2 ו-f\u2032(3)=1/2. תנחה אותי לבנות מערכת משוואות \u2014 אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["מערכת משוואות", "תנאי", "הצבה", "נגזרת", "ריבוע", "שורש"] },
      { phase: "סעיף ב\u2032", label: "חקירה מלאה של הפונקציה", coaching: "", prompt: "מצאתי את a ו-b. תנחה אותי לבצע חקירה מלאה \u2014 תחום, מונוטוניות, נקודות מיוחדות. אל תגלה תשובות.", keywords: [], keywordHint: "", contextWords: ["חקירה", "תחום", "מונוטוניות", "נגזרת", "שרשרת", "סקיצה"] },
      { phase: "סעיף ג\u2032", label: "חישוב שטח מתחת לעקומה", coaching: "", prompt: "השלמתי את החקירה. תנחה אותי לחשב שטח מתחת לעקומה בקטע נתון \u2014 באמצעות אינטגרל. אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["שטח", "אינטגרל", "קטע", "גבולות", "אנטי-נגזרת", "חישוב"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
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

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"domain" | "chain" | "props" | null>(null);

  const tabs = [
    { id: "domain" as const, label: "תחום",       tex: "g(x) \\geq 0",                              color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "chain" as const,  label: "נגזרת שרשרת", tex: "\\frac{g'(x)}{2\\sqrt{g(x)}}",              color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "props" as const,  label: "תכונות",      tex: "f(x) \\geq 0",                              color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
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

      {/* Domain */}
      {activeTab === "domain" && (
        <motion.div key="domain" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\sqrt{g(x)} \\;\\Rightarrow\\; g(x) \\geq 0"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כדי שפונקציית שורש תהיה מוגדרת, הביטוי מתחת לשורש חייב להיות אי-שלילי.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>כתוב את האי-שוויון: <InlineMath>{"g(x) \\geq 0"}</InlineMath>.</li>
                  <li>פתור את האי-שוויון כדי לקבל את התחום.</li>
                  <li>כתוב בסימון קטע או סימון קבוצתי.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#16A34A", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"\\sqrt{x-3}"}</InlineMath> &#8594; <InlineMath>{"x-3 \\geq 0"}</InlineMath> &#8594; <InlineMath>{"x \\geq 3"}</InlineMath> &#8594; תחום: <InlineMath>{"[3, \\infty)"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Chain rule */}
      {activeTab === "chain" && (
        <motion.div key="chain" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\left[\\sqrt{g(x)}\\right]' = \\frac{g'(x)}{2\\sqrt{g(x)}}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> גזירת פונקציית שורש מורכבת דורשת כלל שרשרת:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>גזור את הפונקציה החיצונית: <InlineMath>{"(\\sqrt{u})' = \\frac{1}{2\\sqrt{u}}"}</InlineMath>.</li>
                  <li>כפול בנגזרת הפנימית: <InlineMath>{"g'(x)"}</InlineMath>.</li>
                  <li>התוצאה: <InlineMath>{"\\frac{g'(x)}{2\\sqrt{g(x)}}"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#EA580C", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"(\\sqrt{x^2-9})' = \\frac{2x}{2\\sqrt{x^2-9}} = \\frac{x}{\\sqrt{x^2-9}}"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Properties */}
      {activeTab === "props" && (
        <motion.div key="props" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\sqrt{g(x)} \\geq 0 \\;\\;\\text{always}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> תכונות מרכזיות של פונקציית שורש:
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>פונקציית שורש היא תמיד <strong>אי-שלילית</strong> (הגרף מעל ציר x).</li>
                  <li><InlineMath>{"\\sqrt{x}"}</InlineMath> <strong>עולה</strong> בכל תחום ההגדרה שלה.</li>
                  <li>קצב העלייה <strong>הולך ויורד</strong> \u2014 העקומה קעורה כלפי מטה.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; נקודת ההתחלה (שבה הביטוי = 0) היא גם <strong>מינימום מוחלט</strong> של הפונקציה.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── RootLab (basic) ─────────────────────────────────────────────────────────

function RootLab() {
  const [h, setH] = useState(2);

  const W = 300, H = 200;
  const xMin = -2, xMax = 12, yMin = -0.5, yMax = 4;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const steps = 500, dx = (xMax - xMin) / steps;
  const segs: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps; i++) {
    const xi = xMin + i * dx;
    const inner = xi - h;
    if (inner < 0) { moved = false; continue; }
    const yi = Math.sqrt(inner);
    if (yi > yMax) { moved = false; continue; }
    segs.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }

  const ox = toSx(0), oy = toSy(0);
  const hx = toSx(h);
  const forbiddenWidth = Math.max(0, Math.min(hx, W));
  const dotVisible = hx >= 0 && hx <= W;
  const fmt = (v: number) => v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
  const fh1 = h + 1 <= xMax ? Math.sqrt(1).toFixed(2) : "\u2014";

  return (
    <section style={{ border: "1px solid rgba(22,163,74,0.3)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת תחום פונקציית שורש</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = &#8730;(x &#8722; <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{fmt(h)}</span>)
        {" "}\u2014 שנה את h וראה כיצד התחום זז
      </p>

      {/* Slider */}
      <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1.25rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>הזזה <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 600 }}>h</span></span>
          <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{fmt(h)}</span>
        </div>
        <input type="range" min="-2" max="8" step="0.5" value={h} onChange={(e) => setH(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#16A34A" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
          <span>\u22122</span><span>0</span><span>+8</span>
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 320 }} aria-hidden>
          {forbiddenWidth > 0 && (
            <rect x={0} y={0} width={forbiddenWidth} height={H} fill="#94a3b8" opacity={0.1} />
          )}
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(100,116,139,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
          {hx >= 0 && hx <= W && (
            <line x1={hx} y1={0} x2={hx} y2={H} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          )}
          <path d={segs.join(" ")} fill="none" stroke="#16A34A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {dotVisible && (
            <circle cx={hx} cy={toSy(0)} r={5} fill="#16A34A" />
          )}
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(22,163,74,0.3)", padding: 14 }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>תחום מתחיל ב-</div>
          <div style={{ color: "#16A34A", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{fmt(h)}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(22,163,74,0.3)", padding: 14 }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>f({fmt(h)})</div>
          <div style={{ color: "#16A34A", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>0</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(22,163,74,0.3)", padding: 14 }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>f({fmt(h + 1)})</div>
          <div style={{ color: "#16A34A", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{fh1}</div>
        </div>
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        הנקודה הירוקה היא נקודת ההתחלה \u2014 גם נקודת מינימום מוחלטת של הפונקציה
      </p>
    </section>
  );
}

// ─── ChainRootLab (medium) ───────────────────────────────────────────────────

function ChainRootLab() {
  const [a, setA] = useState(1);
  const [c, setC] = useState(-9);

  const W = 300, H = 200;
  const xMin = -8, xMax = 8, yMin = -0.5, yMax = 6;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const g = (x: number) => a * x * x + c;
  const f = (x: number) => { const v = g(x); return v >= 0 ? Math.sqrt(v) : NaN; };

  const steps2 = 600, dx = (xMax - xMin) / steps2;
  const segs: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps2; i++) {
    const xi = xMin + i * dx;
    const yi = f(xi);
    if (!isFinite(yi) || isNaN(yi) || yi > yMax) { moved = false; continue; }
    segs.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }

  const ox = toSx(0), oy = toSy(0);
  const isSymmetric = true; // ax^2+c is always symmetric about y-axis
  const domainBound = a > 0 && c < 0 ? Math.sqrt(-c / a) : a < 0 && c > 0 ? Math.sqrt(c / (-a)) : null;
  const domainText = a > 0 && c >= 0
    ? "(\u2212\u221E, \u221E)"
    : a > 0 && c < 0 && domainBound
    ? `(\u2212\u221E, \u2212${domainBound.toFixed(1)}] \u222A [${domainBound.toFixed(1)}, \u221E)`
    : a <= 0 && c > 0 && domainBound
    ? `[\u2212${domainBound.toFixed(1)}, ${domainBound.toFixed(1)}]`
    : a === 0 && c >= 0
    ? "(\u2212\u221E, \u221E)"
    : "\u2205";

  // Derivative at x=1
  const g1 = g(1);
  const fpAt1 = g1 > 0 ? ((2 * a * 1) / (2 * Math.sqrt(g1))).toFixed(2) : "\u2014";

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.3)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת שרשרת</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = &#8730;(<span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{a}</span>x&#178; + (<span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{c}</span>))
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "a (x\u00B2)", val: a, min: -3, max: 5, step: 0.5, set: setA },
          { label: "c (קבוע)", val: c, min: -16, max: 10, step: 1, set: setC },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.3)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(100,116,139,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#64748b" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#64748b" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke="#EA580C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "תחום", val: domainText },
          { label: "סימטריה", val: isSymmetric ? "סימטרית ל-y" : "\u2014" },
          { label: "f\u2032(1)", val: fpAt1 },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(234,88,12,0.3)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: "#EA580C", fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        שנה את a ו-c כדי לראות כיצד התחום והצורה משתנים
      </p>
    </section>
  );
}

// ─── ParameterRootLab (advanced) ─────────────────────────────────────────────

function ParameterRootLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-1);

  const W = 300, H = 200;
  const xMin = -1, xMax = 10, yMin = -0.5, yMax = 5;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const inner = (x: number) => a * x + b;
  const f = (x: number) => { const v = inner(x); return v >= 0 ? Math.sqrt(v) : NaN; };
  const fp = (x: number) => { const v = inner(x); return v > 0 ? a / (2 * Math.sqrt(v)) : NaN; };

  const steps2 = 500, dx = (xMax - xMin) / steps2;
  const segs: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps2; i++) {
    const xi = xMin + i * dx;
    const yi = f(xi);
    if (!isFinite(yi) || isNaN(yi) || yi > yMax || yi < yMin) { moved = false; continue; }
    segs.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }

  const ox = toSx(0), oy = toSy(0);

  // Constraint checks
  const f3val = f(3);
  const fp3val = fp(3);
  const passesF3 = isFinite(f3val) && !isNaN(f3val) && Math.abs(f3val - 2) < 0.15;
  const passesFp3 = isFinite(fp3val) && !isNaN(fp3val) && Math.abs(fp3val - 0.5) < 0.1;

  return (
    <section style={{ border: "1px solid rgba(220,38,38,0.3)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת פרמטרים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = &#8730;(<span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{a}</span>x + (<span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{b}</span>)) &mdash; שנה a ו-b כדי לקיים את התנאים
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "a", val: a, min: -2, max: 8, step: 0.5, set: setA },
          { label: "b", val: b, min: -16, max: 8, step: 0.5, set: setB },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
          </div>
        ))}
      </div>

      {/* Constraint indicators */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ borderRadius: 12, border: `2px solid ${passesF3 ? "rgba(22,163,74,0.5)" : "rgba(220,38,38,0.3)"}`, background: passesF3 ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.05)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>f(3) = {isFinite(f3val) && !isNaN(f3val) ? f3val.toFixed(2) : "\u2014"}</div>
          <div style={{ color: passesF3 ? "#15803d" : "#DC2626", fontWeight: 700, fontSize: 13 }}>{passesF3 ? "\u2705 f(3)=2" : "\u274C f(3)\u22602"}</div>
        </div>
        <div style={{ borderRadius: 12, border: `2px solid ${passesFp3 ? "rgba(22,163,74,0.5)" : "rgba(220,38,38,0.3)"}`, background: passesFp3 ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.05)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>f&apos;(3) = {isFinite(fp3val) && !isNaN(fp3val) ? fp3val.toFixed(2) : "\u2014"}</div>
          <div style={{ color: passesFp3 ? "#15803d" : "#DC2626", fontWeight: 700, fontSize: 13 }}>{passesFp3 ? "\u2705 f\u2032(3)=0.5" : "\u274C f\u2032(3)\u22600.5"}</div>
        </div>
      </div>

      {passesF3 && passesFp3 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid rgba(22,163,74,0.4)", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#14532d", fontWeight: 700, fontSize: 14 }}>
          &#11088; שני התנאים מתקיימים! a={a}, b={b}
        </motion.div>
      )}

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(100,116,139,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#64748b" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#64748b" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Point (3, f(3)) marker */}
          {isFinite(f3val) && !isNaN(f3val) && toSx(3) >= 0 && toSx(3) <= W && toSy(f3val) >= 0 && toSy(f3val) <= H && (
            <circle cx={toSx(3)} cy={toSy(f3val)} r={5} fill={passesF3 ? "#15803d" : "#DC2626"} />
          )}
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "3a + b", val: (3 * a + b).toFixed(1) },
          { label: "a / (2\u221A(3a+b))", val: isFinite(fp3val) && !isNaN(fp3val) ? fp3val.toFixed(2) : "\u2014" },
          { label: "תנאים", val: passesF3 && passesFp3 ? "מתקיימים" : "לא מתקיימים" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(220,38,38,0.3)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: "#DC2626", fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        שנה את הסליידרים עד ששני התנאים מתקיימים: f(3)=2 ו-f&apos;(3)=0.5
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RootPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>פונקציות שורש עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>תחום, נגזרת שרשרת ומונוטוניות \u2014 ואיך לנסח ל-AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/calculus"
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

        <SubtopicProgress subtopicId="calculus/root" />

        <FormulaBar />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
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

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab per level */}
        {selectedLevel === "basic" && <RootLab />}
        {selectedLevel === "medium" && <ChainRootLab />}
        {selectedLevel === "advanced" && <ParameterRootLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="calculus/root" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
