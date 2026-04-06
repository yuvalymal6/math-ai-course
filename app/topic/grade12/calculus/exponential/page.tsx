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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-400",   ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-400",  ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-400",     ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-400",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-400",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-400",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── Silent SVG diagrams ─────────────────────────────────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={130} x2={240} y2={130} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={40} y1={130} x2={40} y2={15} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={245} y={134} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={36} y={12} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Exponential curve shape */}
      <path d="M 50,125 Q 100,123 140,115 Q 170,100 195,60 Q 210,30 225,15" fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" />
      {/* Tangent line at a point */}
      <line x1={120} y1={130} x2={215} y2={48} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />
      {/* Contact point */}
      <circle cx={170} cy={85} r={5} fill="none" stroke="#f59e0b" strokeWidth={2} />
      <text x={170} y={76} fontSize={13} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Vertical dashed drop */}
      <line x1={170} y1={130} x2={170} y2={85} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
      <text x={228} y={20} fontSize={10} fill="#34d399" fontFamily="sans-serif" fontWeight={600}>f</text>
      <text x={218} y={55} fontSize={9} fill="#f59e0b" fontFamily="sans-serif">משיק</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={140} x2={260} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={140} y1={170} x2={140} y2={10} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={265} y={144} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={136} y={8} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Curve shape like (x-3)e^x — dips below x-axis, has a local min */}
      <path d="M 50,50 Q 80,80 110,120 Q 130,150 155,155 Q 175,152 195,130 Q 220,90 245,30" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      {/* Local minimum marker */}
      <circle cx={155} cy={155} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={155} y={168} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Vertical dashed drop */}
      <line x1={155} y1={140} x2={155} y2={155} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
      <text x={248} y={35} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>f</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={40} y1={140} x2={260} y2={140} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={60} y1={170} x2={60} y2={10} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={265} y={144} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={56} y={8} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Exponential-like curve with parameter ambiguity */}
      <path d="M 50,140 C 70,138 90,120 120,80 C 145,45 170,30 200,25 C 220,22 240,20 255,15" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      {/* Origin marker */}
      <circle cx={60} cy={140} r={4} fill="none" stroke="#34d399" strokeWidth={2} />
      {/* Extremum marker */}
      <circle cx={120} cy={80} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={120} y={70} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Parameter labels */}
      <text x={200} y={50} fontSize={11} fill="#64748b" fontFamily="sans-serif">a = ?</text>
      <text x={200} y={66} fontSize={11} fill="#64748b" fontFamily="sans-serif">b = ?</text>
      <text x={250} y={20} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>f</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ──────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(148,163,184,0.25)", color: "#2D3436", fontWeight: 500, cursor: "pointer" }}
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
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
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
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
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
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>&#128274;</span>
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
    </div>
  );

  const scoreBarColor = !result ? "#64748b" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
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
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.05)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; בדיקת AI מדומה
          </button>
        )}

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(220,38,38,0.15)", border: "2px solid #dc2626", padding: 12, color: "#991b1b", fontSize: 12, lineHeight: 1.6 }}>
            &#9888;&#65039; {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(217,119,6,0.12)", border: "2px solid #d97706", padding: 12, color: "#92400e", fontSize: 12, lineHeight: 1.6 }}>
            &#128161; {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(22,163,74,0.15)", border: "2px solid #16a34a", padding: 12, color: "#166534", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              &#9989; פרומפט מצוין! ציון: <strong style={{ color: "#16a34a" }}>{result!.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#166534", cursor: "pointer", fontWeight: 500 }}>
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

      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
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
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: result.blocked ? "#991b1b" : "#92400e", background: result.blocked ? "rgba(220,38,38,0.15)" : "rgba(217,119,6,0.12)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(22,163,74,0.15)", border: "2px solid #16a34a", padding: 12, color: "#166534", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#166534", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; בדיקת AI מדומה
          </button>
        )}
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
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.1)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#16a34a", cursor: "pointer" }}>
                  &#10003; סיימתי סעיף זה
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
        subjectWords={["מעריכית", "eˣ", "נגזרת", "חקירה", "אינטגרל", "פרמטר"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.1)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{s.phase} — {s.label}</span>
              <span style={{ fontSize: 16 }}>&#128274;</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.75)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#16a34a", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.phase} — {s.label}</div>
                <div style={{ color: "#2D3436", fontSize: 13, lineHeight: 1.6 }}>{s.prompt}</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.1)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#16a34a", cursor: "pointer" }}>
                &#10003; סיימתי סעיף זה
              </button>
            </div>
          )}
        </div>
      ))}

      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(22,163,74,0.15)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#127942;</div>
          <div style={{ color: "#16a34a", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את כל הסעיפים.</div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Data ───────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "נגזרת eˣ ומשיק",
    problem: "נתונה הפונקציה:\nf(x) = e^(2x\u22124)\n\n\u05D0. מצא את f\u2032(x) באמצעות כלל השרשרת.\n\u05D1. מצא את שיפוע המשיק לגרף הפונקציה בנקודה x=2.\n\u05D2. כתוב את משוואת המשיק לגרף הפונקציה בנקודה x=2.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שכחת כלל השרשרת", text: "הנגזרת של e^(g(x)) היא לא סתם e^(g(x)). חובה להכפיל בנגזרת הפונקציה הפנימית g\u2032(x). זו הטעות הנפוצה ביותר בבגרות." },
      { title: "\u26A0\uFE0F חישוב f(2) לפני כתיבת משוואת המשיק", text: "כדי לכתוב משוואת משיק צריך גם את ערך הפונקציה בנקודה וגם את השיפוע. תלמידים שוכחים לחשב את f(2) ומשתמשים רק בנגזרת." },
    ],
    goldenPrompt: "היי, אני תלמיד כיתה יב\u2032.\n\u05E6\u05D9\u05E8\u05E4\u05EA\u05D9 לך תרגיל על נגזרת פונקציה מעריכית ומשיק \u2014 f(x) = e^(2x\u22124).\n\u05D4\u05E0\u05D4 הפרוטוקול שלנו:\n\n1\uFE0F\u20E3 סריקה:\nקודם כל, תסרוק את הנתונים ותכתוב לי רק:\n\u201Cזיהיתי את הפונקציה. מחכה להוראות לשלב א\u2032.\u201D\n(אל תפתור כלום ואל תסביר כלום בשלב הזה!)\n\n2\uFE0F\u20E3 תפקיד:\nאתה המורה שלי. זה אומר שאתה לא פותר במקומי.\n\n3\uFE0F\u20E3 שיטת עבודה:\nאני אשלח לך כל פעם שלב (א\u2032, ב\u2032 או ג\u2032).\nבתגובה, אתה שואל אותי רק שאלה אחת מכווינה על הנוסחה או השלב הבא.\nחכה לי בין שלב לשלב ואל תמשיך לפני שאני שולח.",
    steps: [
      { phase: "שלב א\u2032", label: "גזירת f(x) = e^(2x\u22124) בכלל השרשרת", coaching: "", prompt: "נתונה f(x) = e^(2x\u22124). תנחה אותי \u2014 איך מפעילים כלל שרשרת כדי לגזור פונקציה מעריכית מורכבת? אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["נגזרת", "כלל שרשרת", "פונקציה פנימית", "מעריכית", "גזירה", "e"] },
      { phase: "שלב ב\u2032", label: "שיפוע המשיק בנקודה", coaching: "", prompt: "נתונה f(x) = e^(2x\u22124). מצאתי את הנגזרת. תנחה אותי \u2014 איך מציבים נקודה בנגזרת כדי למצוא שיפוע משיק? אל תיתן תשובה סופית.", keywords: [], keywordHint: "", contextWords: ["שיפוע", "משיק", "הצבה", "נגזרת", "נקודה", "e"] },
      { phase: "שלב ג\u2032", label: "משוואת המשיק", coaching: "", prompt: "נתונה f(x) = e^(2x\u22124). מצאתי את השיפוע. תנחה אותי \u2014 מהי הנוסחה לכתיבת משוואת משיק? אני צריך גם את ערך הפונקציה בנקודה. אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["משוואת משיק", "נוסחה", "ערך הפונקציה", "שיפוע", "נקודת מגע", "ישר"] },
    ],
  },
  {
    id: "medium",
    title: "חקירת (x\u22123)e\u02E3",
    problem: "נתונה הפונקציה:\nf(x) = (x\u22123)\u00B7e\u02E3\n\n\u05D0. מצא את f\u2032(x) באמצעות כלל נגזרת המכפלה.\n\u05D1. מצא נקודות קיצון וסווג אותן (מינימום/מקסימום).\n\u05D2. קבע תחומי עלייה וירידה.\n\u05D3. שרטט סקיצה של הפונקציה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שוכחים ש-e\u02E3 > 0 תמיד", text: "כשמשווים את הנגזרת לאפס, e\u02E3 לעולם לא מתאפס \u2014 הוא תמיד חיובי. לכן רק הגורם השני (הפולינומי) קובע מתי הנגזרת מתאפסת." },
      { title: "\u26A0\uFE0F טעות בנגזרת המכפלה", text: "כלל המכפלה: (fg)\u2032 = f\u2032g + fg\u2032. תלמידים רבים שוכחים אחד משני האיברים, במיוחד כשאחד הגורמים הוא e\u02E3." },
    ],
    goldenPrompt: "היי, אני תלמיד כיתה יב\u2032.\nצירפתי לך תרגיל בחקירת פונקציה מעריכית \u2014 f(x) = (x\u22123)\u00B7e\u02E3.\nאני רוצה שתהיה המורה שלי ותעזור לי שלב אחרי שלב בלי לגלות לי את התשובות.\n\nקודם כל, תסרוק את הנתונים, אל תכתוב שום פתרון עדיין.\n\nבכל שלב \u2014 שאל אותי רק שאלה אחת מכווינה.\nחכה לי בין שלב לשלב ואל תמשיך לפני שאני שולח.",
    steps: [
      { phase: "סעיף א\u2032", label: "גזירה בכלל נגזרת המכפלה", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["נגזרת", "כלל המכפלה", "מעריכית", "e", "גזירה", "מכפלה"] },
      { phase: "סעיף ב\u2032", label: "מציאת נקודות קיצון וסיווג", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["קיצון", "נגזרת שנייה", "מינימום", "מקסימום", "סיווג", "e"] },
      { phase: "סעיף ג\u2032", label: "תחומי עלייה וירידה", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["עלייה", "ירידה", "מונוטוניות", "סימן הנגזרת", "קטע", "מעריכית"] },
      { phase: "סעיף ד\u2032", label: "סקיצת הפונקציה", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["סקיצה", "גרף", "ציר x", "התנהגות", "אסימפטוטה", "מעריכית"] },
    ],
  },
  {
    id: "advanced",
    title: "חקירה עם פרמטר ואינטגרל",
    problem: "נתונה הפונקציה:\nf(x) = (ax+b)\u00B7e\u02E3\n\nידוע שהפונקציה עוברת דרך ראשית הצירים ויש לה קיצון בנקודה x=\u22121.\n\n\u05D0. מצא את a ו-b מהתנאים הנתונים.\n\u05D1. בצע חקירה מלאה של הפונקציה המתקבלת (נגזרת, קיצון, מונוטוניות, סקיצה).\n\u05D2. חשב את השטח הכלוא בין גרף הפונקציה לציר x.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שתי משוואות \u2014 מערכת", text: "f(0)=0 נותנת משוואה אחת, f\u2032(\u22121)=0 נותנת משוואה שנייה. חובה לפתור מערכת של שתי משוואות עם שני נעלמים \u2014 אל תנחשו ערכים." },
      { title: "\u26A0\uFE0F אינטגרל של מכפלה בe\u02E3", text: "האינטגרל של (ax+b)e\u02E3 דורש אינטגרציה בחלקים. תלמידים רבים מנסים לחלק ולהפריד \u2014 זו טעות. השתמשו בנוסחה: \u222Bu\u00B7e\u02E3dx = (u\u22121)e\u02E3 + C." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים \u2014 כתוב פרומפט שלם שמסביר ל-AI איך לנהל חקירת פונקציה מעריכית עם פרמטרים ואינטגרל. כלול: הגדרת תפקיד, איסור פתרון, בקשת הנחיה, הנושא המתמטי, ודרישת המתנה בין סעיפים.",
    steps: [
      { phase: "סעיף א\u2032", label: "מציאת a ו-b מתנאים", coaching: "", prompt: "נתונה f(x) = (ax+b)\u00B7e\u02E3. ידוע ש-f(0)=0 ו-f\u2032(\u22121)=0. תנחה אותי לבנות מערכת משוואות \u2014 אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["מערכת משוואות", "תנאי", "קיצון", "נגזרת", "הצבה", "פרמטר"] },
      { phase: "סעיף ב\u2032", label: "חקירה מלאה של הפונקציה", coaching: "", prompt: "מצאתי את a ו-b. תנחה אותי לבצע חקירה מלאה \u2014 נגזרת, קיצונים, מונוטוניות, סקיצה. אל תגלה תשובות.", keywords: [], keywordHint: "", contextWords: ["חקירה", "מונוטוניות", "קיצון", "סקיצה", "מעריכית", "e"] },
      { phase: "סעיף ג\u2032", label: "שטח כלוא בין העקומה לציר x", coaching: "", prompt: "השלמתי את החקירה. תנחה אותי לחשב שטח כלוא בין העקומה לציר x \u2014 באמצעות אינטגרל. אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["שטח", "אינטגרל", "ציר x", "שורשים", "גבולות", "אינטגרציה בחלקים"] },
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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)" }}>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.03)", padding: "1.5rem", marginBottom: "2rem" }}>
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
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{"\u26A0\uFE0F"} שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "0.85rem 1rem", marginBottom: 8 }}>
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

// ─── Formula Bar ─────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"exp_deriv" | "product" | "integral" | null>(null);

  const tabs = [
    { id: "exp_deriv" as const, label: "נגזרת e\u02E3",     tex: "(e^x)' = e^x",                 color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "product" as const,   label: "כלל המכפלה",  tex: "(fg)' = f'g + fg'",             color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "integral" as const,  label: "אינטגרל",     tex: "\\int e^x dx = e^x + C",        color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: e^x derivative + chain rule */}
      {activeTab === "exp_deriv" && (
        <motion.div key="exp_deriv" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(e^x)' = e^x \\qquad (e^{g(x)})' = g'(x) \\cdot e^{g(x)}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הנגזרת של <InlineMath>{"e^x"}</InlineMath> היא <InlineMath>{"e^x"}</InlineMath> עצמה. כאשר יש פונקציה פנימית, מפעילים כלל שרשרת:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מזהים את הפונקציה הפנימית <InlineMath>{"g(x)"}</InlineMath>.</li>
                  <li>גוזרים את <InlineMath>{"g(x)"}</InlineMath> בנפרד.</li>
                  <li>מכפילים: <InlineMath>{"g'(x) \\cdot e^{g(x)}"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#16a34a", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"(e^{3x+1})' = 3 \\cdot e^{3x+1}"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Product rule */}
      {activeTab === "product" && (
        <motion.div key="product" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(f \\cdot g)' = f'g + fg'"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כשגוזרים מכפלה של שתי פונקציות, גוזרים כל אחת לחוד ומחברים:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>גוזרים את הראשונה ומכפילים בשנייה כמו שהיא.</li>
                  <li>משאירים את הראשונה ומכפילים בנגזרת השנייה.</li>
                  <li>מחברים את שני המחוברים.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#EA580C", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"((x-3)e^x)' = 1 \\cdot e^x + (x-3) \\cdot e^x = e^x(x-2)"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Integral */}
      {activeTab === "integral" && (
        <motion.div key="integral" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\int e^x \\, dx = e^x + C \\qquad \\int e^{ax+b} \\, dx = \\frac{1}{a} e^{ax+b} + C"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> האינטגרל של <InlineMath>{"e^x"}</InlineMath> הוא <InlineMath>{"e^x + C"}</InlineMath>. כאשר יש ביטוי לינארי בחזקה:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מזהים את המקדם של x בחזקה (a).</li>
                  <li>מחלקים ב-a.</li>
                  <li>לא לשכוח +C באינטגרל לא מסוים!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"\\int e^{2x+1} dx = \\frac{1}{2} e^{2x+1} + C"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── ExpTangentLab (basic) ───────────────────────────────────────────────────

function ExpTangentLab() {
  const [a, setA] = useState(10);  // /10 -> actual
  const [b, setB] = useState(0);

  const A = a / 10;
  const B = b;

  const fAt = (x: number) => Math.exp(A * x + B);
  const f0 = fAt(0);
  const fp0 = A * f0;

  const W = 300, H = 200;
  const xMin = -2, xMax = 3, yMin = -1, yMax = 12;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const steps = 400, dx = (xMax - xMin) / steps;
  const segs: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps; i++) {
    const xi = xMin + i * dx, yi = fAt(xi);
    if (yi < yMin || yi > yMax) { moved = false; continue; }
    segs.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }

  // Tangent at x=0: y = fp0*(x - 0) + f0
  const tLen = 1.2;
  const tx1 = -tLen, ty1 = fp0 * tx1 + f0;
  const tx2 = tLen, ty2 = fp0 * tx2 + f0;

  const ox = toSx(0), oy = toSy(0);
  const px = toSx(0), py = toSy(f0);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת משיק לפונקציה מעריכית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = e^(<span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{A.toFixed(1)}</span>x + <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{B}</span>)
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "a (מקדם)", val: a, min: -20, max: 20, set: setA, disp: A.toFixed(1) },
          { label: "b (קבוע)", val: b, min: -5, max: 5, set: setB, disp: String(B) },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{sl.disp}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(148,163,184,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Tangent at x=0 */}
          <line x1={toSx(tx1)} y1={toSy(ty1)} x2={toSx(tx2)} y2={toSy(ty2)} stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
          {/* Contact point */}
          <circle cx={px} cy={py} r={5} fill="#f59e0b" />
          <line x1={px} y1={toSy(0)} x2={px} y2={py} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "f(0)", val: f0 > 999 ? ">999" : f0.toFixed(3) },
          { label: "f\u2032(0)", val: fp0 > 999 ? ">999" : fp0.toFixed(3) },
          { label: "שיפוע משיק", val: fp0 > 999 ? ">999" : fp0.toFixed(3) },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(22,163,74,0.3)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: "#16a34a", fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        שנה את a ו-b כדי לראות איך המשיק בנקודה x=0 משתנה
      </p>
    </section>
  );
}

// ─── ProductExpLab (medium) ──────────────────────────────────────────────────

function ProductExpLab() {
  const [c, setC] = useState(-30); // /10 -> actual

  const C_val = c / 10; // coefficient: (x + C_val)*e^x
  // f'(x) = e^x(x + C_val + 1) = 0  =>  x = -(C_val + 1)
  const extX = -(C_val + 1);
  const extY = (extX + C_val) * Math.exp(extX);
  const fpp = (2 + C_val + extX) * Math.exp(extX); // f''(extX) = e^extX * (x + C_val + 2) at x=extX = e^extX * (1)
  const extType = fpp > 0.001 ? "מינימום" : fpp < -0.001 ? "מקסימום" : "לא מוגדר";

  const W = 300, H = 200;
  const xMin = -6, xMax = 4, yMin = -8, yMax = 8;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const f = (x: number) => (x + C_val) * Math.exp(x);
  const steps = 400, dx = (xMax - xMin) / steps;
  const segs: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps; i++) {
    const xi = xMin + i * dx, yi = f(xi);
    if (yi < yMin || yi > yMax) { moved = false; continue; }
    segs.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }

  const ox = toSx(0), oy = toSy(0);
  const extSx = toSx(extX), extSy = toSy(extY);
  const extVisible = extSx >= 0 && extSx <= W && extSy >= 0 && extSy <= H;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת חקירה — מכפלה באקספוננט</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = (x + <span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{C_val.toFixed(1)}</span>)e&#x02E3;
      </p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto", marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>c (קבוע)</span>
            <span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{C_val.toFixed(1)}</span>
          </div>
          <input type="range" min={-50} max={20} step={1} value={c} onChange={(e) => setC(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(148,163,184,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {extVisible && <circle cx={extSx} cy={extSy} r={5} fill="#a78bfa" />}
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "x קיצון", val: extX.toFixed(2) },
          { label: "f\u2032\u2032(x\u2080)", val: fpp.toFixed(3) },
          { label: "סוג", val: extType },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(234,88,12,0.3)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: "#EA580C", fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        שנה את c כדי לראות איך נקודת הקיצון זזה
      </p>
    </section>
  );
}

// ─── ParameterExpLab (advanced) ──────────────────────────────────────────────

function ParameterExpLab() {
  const [a, setA] = useState(10);  // /10
  const [b, setB] = useState(0);   // /10

  const A = a / 10;
  const B = b / 10;

  // f(x) = (Ax + B)e^x
  // f(0) = B*e^0 = B
  // f'(x) = (A)e^x + (Ax+B)e^x = e^x(Ax + A + B)
  // f'(-1) = e^(-1)(-A + A + B) = B*e^(-1)
  const f0 = B;
  const fp_neg1 = B * Math.exp(-1);
  const f0_ok = Math.abs(f0) < 0.05;
  const fp_neg1_ok = Math.abs(fp_neg1) < 0.05;

  const W = 300, H = 200;
  const xMin = -4, xMax = 3, yMin = -3, yMax = 5;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const fAt = (x: number) => (A * x + B) * Math.exp(x);
  const steps = 400, dx = (xMax - xMin) / steps;
  const segs: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps; i++) {
    const xi = xMin + i * dx, yi = fAt(xi);
    if (yi < yMin || yi > yMax) { moved = false; continue; }
    segs.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }

  const ox = toSx(0), oy = toSy(0);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת פרמטרים — (ax+b)e&#x02E3;</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = (<span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{A.toFixed(1)}</span>x + <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{B.toFixed(1)}</span>)e&#x02E3;
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "a", val: a, min: -30, max: 30, set: setA, disp: A.toFixed(1) },
          { label: "b", val: b, min: -30, max: 30, set: setB, disp: B.toFixed(1) },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{sl.disp}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
          </div>
        ))}
      </div>

      {/* Constraint indicators */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        <div style={{ borderRadius: 12, padding: "10px 14px", border: `2px solid ${f0_ok ? "#16a34a" : "rgba(60,54,42,0.15)"}`, background: f0_ok ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.03)", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>f(0) = 0 ?</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: f0_ok ? "#16a34a" : "#DC2626" }}>{f0_ok ? "\u2713" : "\u2717"} {f0.toFixed(2)}</div>
        </div>
        <div style={{ borderRadius: 12, padding: "10px 14px", border: `2px solid ${fp_neg1_ok ? "#16a34a" : "rgba(60,54,42,0.15)"}`, background: fp_neg1_ok ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.03)", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>f&apos;(-1) = 0 ?</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: fp_neg1_ok ? "#16a34a" : "#DC2626" }}>{fp_neg1_ok ? "\u2713" : "\u2717"} {fp_neg1.toFixed(3)}</div>
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(220,38,38,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(148,163,184,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Origin marker */}
          {Math.abs(fAt(0)) < 0.3 && <circle cx={toSx(0)} cy={toSy(fAt(0))} r={4} fill="#34d399" />}
        </svg>
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center" }}>
        כוונן את a ו-b כך ששני התנאים יתקיימו: f(0)=0 ו-f&apos;(-1)=0
      </p>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ExponentialCalculusPage() {
  const [activeTab, setActiveTab] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === activeTab)!;

  const labMap: Record<string, React.ReactNode> = {
    basic: <ExpTangentLab />,
    medium: <ProductExpLab />,
    advanced: <ParameterExpLab />,
  };

  return (
    <div style={{ background: "#F3EFE0", minHeight: "100vh", width: "100%" }}>
      <main style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem" }} dir="rtl">

        {/* Back + Title */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link
            href="/topic/grade12/calculus"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", transition: "background 0.15s" }}
          >
            <span style={{ fontSize: 16 }}>&larr;</span>
            חזרה לחשבון דיפרנציאלי
          </Link>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "bold", marginTop: "0.75rem", color: "#1A1A1A" }}>פונקציות מעריכיות e&#x02E3; — עם AI</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>נגזרת, משיק, קיצון, חקירה ואינטגרל — ואיך לשאול AI את השאלות הנכונות</p>
        </div>

        {/* SubtopicProgress */}
        <SubtopicProgress subtopicId="grade12/calculus/exponential" />

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
        <ExerciseCard ex={ex} />

        {/* Lab */}
        {labMap[activeTab]}

        {/* MarkComplete */}
        <div style={{ marginTop: "2rem" }}>
          <MarkComplete subtopicId="grade12/calculus/exponential" level={activeTab} />
        </div>

        {/* Footer back link */}
        <div style={{ textAlign: "center", marginTop: "2.5rem", paddingBottom: "2rem" }}>
          <Link href="/topic/grade12/calculus" style={{ color: "#6B7280", fontSize: 13, textDecoration: "underline" }}>
            &larr; חזרה לחשבון דיפרנציאלי
          </Link>
        </div>

      </main>
    </div>
  );
}
