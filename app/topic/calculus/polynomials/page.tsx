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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-400",   ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-400",  ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-400",     ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-400",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-400",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-400",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={130} x2={240} y2={130} stroke="#6B7280" strokeWidth={1.2} />
      <line x1={40} y1={130} x2={40} y2={15} stroke="#6B7280" strokeWidth={1.2} />
      <text x={245} y={134} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={36} y={12} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
      {/* Parabola shape — opening up, no numbers */}
      <path d="M 60,30 Q 130,150 210,20" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      {/* Vertex marker */}
      <circle cx={137} cy={120} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={137} y={112} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Label */}
      <text x={215} y={28} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>f</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={140} x2={260} y2={140} stroke="#6B7280" strokeWidth={1.2} />
      <line x1={140} y1={170} x2={140} y2={10} stroke="#6B7280" strokeWidth={1.2} />
      <text x={265} y={144} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={136} y={8} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
      {/* S-shaped cubic — no numbers */}
      <path d="M 50,30 C 80,30 100,60 120,90 C 135,112 145,140 160,140 C 175,140 195,110 210,80 C 225,55 240,35 250,160" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      {/* Extremum markers */}
      <circle cx={105} cy={55} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={105} y={45} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      <circle cx={195} cy={100} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={195} y={90} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* Inflection marker */}
      <circle cx={148} cy={78} r={4} fill="none" stroke="#34d399" strokeWidth={2} strokeDasharray="3,2" />
      <text x={148} y={68} fontSize={11} fill="#34d399" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>?</text>
      {/* Label */}
      <text x={252} y={155} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>f</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={40} y1={140} x2={260} y2={140} stroke="#6B7280" strokeWidth={1.2} />
      <line x1={60} y1={170} x2={60} y2={10} stroke="#6B7280" strokeWidth={1.2} />
      <text x={265} y={144} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={56} y={8} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
      {/* Cubic silhouette — ax^3 + bx^2 shape */}
      <path d="M 45,140 C 55,140 65,138 80,120 C 100,90 120,40 150,35 C 170,33 185,60 210,110 C 225,140 240,160 255,170" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
      {/* Constraint markers — point and extremum */}
      <circle cx={150} cy={35} r={5} fill="none" stroke="#a78bfa" strokeWidth={2} />
      <text x={150} y={25} fontSize={13} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
      <circle cx={80} cy={120} r={4} fill="none" stroke="#34d399" strokeWidth={2} />
      <text x={80} y={110} fontSize={11} fill="#34d399" textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>?</text>
      {/* Parameter labels */}
      <text x={220} y={30} fontSize={11} fill="#64748b" fontFamily="sans-serif">a = ?</text>
      <text x={220} y={46} fontSize={11} fill="#64748b" fontFamily="sans-serif">b = ?</text>
      <text x={252} y={165} fontSize={10} fill="#f59e0b" fontFamily="sans-serif" fontWeight={600}>f</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

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
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(15,23,42,0.8)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(15,23,42,0.5)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(15,23,42,0.4)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(15,23,42,0.8)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(15,23,42,0.5)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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
            <div style={{ height: 6, borderRadius: 3, background: "#1e293b", overflow: "hidden" }}>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(220,38,38,0.15)", border: "2px solid #dc2626", padding: 12, color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>
            &#9888;&#65039; {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(217,119,6,0.12)", border: "2px solid #d97706", padding: 12, color: "#fcd34d", fontSize: 12, lineHeight: 1.6 }}>
            &#128161; {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(22,163,74,0.15)", border: "2px solid #16a34a", padding: 12, color: "#86efac", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              &#9989; פרומפט מצוין! ציון: <strong style={{ color: "#4ade80" }}>{result!.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#86efac", cursor: "pointer", fontWeight: 500 }}>
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
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(15,23,42,0.4)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(15,23,42,0.8)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(220,38,38,0.2)"}` }}>
        {passed
          ? <CheckCircle size={14} color="#34d399" />
          : <span style={{ color: "#fca5a5", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>

      <div style={{ background: "rgba(15,23,42,0.5)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(6,78,59,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: passed ? "#6ee7b7" : "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}>
              <span>ציון</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#1e293b", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: result.blocked ? "#fca5a5" : "#fcd34d", background: result.blocked ? "rgba(220,38,38,0.15)" : "rgba(217,119,6,0.12)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "\u26A0\uFE0F" : "\uD83D\uDCA1"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(22,163,74,0.15)", border: "2px solid #16a34a", padding: 12, color: "#86efac", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#86efac", cursor: "pointer", fontWeight: 500 }}>
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
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.1)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#4ade80", cursor: "pointer" }}>
                  &#10003; סיימתי סעיף זה
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#4ade80", fontWeight: 600 }}>&#9989; הושלם</div>
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
        subjectWords={["נגזרת", "חקירה", "פולינום", "קיצון", "נקודת פיתול", "מונוטוניות"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.1)", background: "rgba(15,23,42,0.6)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } — { s.label }</span>
              <span style={{ fontSize: 16 }}>&#128274;</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(15,23,42,0.8)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ s.phase } — { s.label }</div>
                <div style={{ color: "#2D3436", fontSize: 13, lineHeight: 1.6 }}>{ s.prompt }</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.1)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#4ade80", cursor: "pointer" }}>
                &#10003; סיימתי סעיף זה
              </button>
            </div>
          )}
        </div>
      ))}

      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(22,163,74,0.15)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#127942;</div>
          <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div>
          <div style={{ color: "#86efac", fontSize: 13 }}>עברת בהצלחה את כל הסעיפים.</div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "חקירת פרבולה",
    problem: "נתונה הפונקציה:\nf(x) = x\u00B2 \u2212 4x + 3\n\n\u05D0. מצא את f\u2032(x).\n\u05D1. מצא נקודות קיצון \u2014 קבע אם מינימום או מקסימום.\n\u05D2. מצא תחומי עלייה וירידה.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F השוואת f(x)=0 במקום f\u2032(x)=0", text: "תלמידים רבים פותרים f(x)=0 (שורשים) במקום f\u2032(x)=0 (קיצון). זכרו: נגזרת שווה לאפס נותנת נקודות קיצון, לא נקודות חיתוך עם ציר x." },
      { title: "\u26A0\uFE0F שכחו לסווג את סוג הקיצון", text: "מציאת x שבה f\u2032(x)=0 היא רק חצי מהעבודה. חובה לבדוק האם זה מינימום או מקסימום \u2014 באמצעות הנגזרת השנייה או טבלת סימנים." },
    ],
    goldenPrompt: "היי, אני תלמיד כיתה יא\u2032.\n\u05E6\u05D9\u05E8\u05E4\u05EA\u05D9 \u05DC\u05DA \u05EA\u05E8\u05D2\u05D9\u05DC \u05D1\u05D7\u05E7\u05D9\u05E8\u05EA \u05E4\u05D5\u05DC\u05D9\u05E0\u05D5\u05DD \u2014 f(x) = x\u00B2 \u2212 4x + 3.\n\u05D4\u05E0\u05D4 \u05D4\u05E4\u05E8\u05D5\u05D8\u05D5\u05E7\u05D5\u05DC \u05E9\u05DC\u05E0\u05D5:\n\n1\uFE0F\u20E3 \u05E1\u05E8\u05D9\u05E7\u05D4:\n\u05E7\u05D5\u05D3\u05DD \u05DB\u05DC, \u05EA\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05EA\u05DB\u05EA\u05D5\u05D1 \u05DC\u05D9 \u05E8\u05E7:\n\"\u05D6\u05D9\u05D4\u05D9\u05EA\u05D9 \u05D0\u05EA \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4. \u05DE\u05D7\u05DB\u05D4 \u05DC\u05D4\u05D5\u05E8\u05D0\u05D5\u05EA \u05DC\u05E9\u05DC\u05D1 \u05D0\u2032.\"\n(\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05DB\u05DC\u05D5\u05DD \u05D5\u05D0\u05DC \u05EA\u05E1\u05D1\u05D9\u05E8 \u05DB\u05DC\u05D5\u05DD \u05D1\u05E9\u05DC\u05D1 \u05D4\u05D6\u05D4!)\n\n2\uFE0F\u20E3 \u05EA\u05E4\u05E7\u05D9\u05D3:\n\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05E9\u05DC\u05D9. \u05D6\u05D4 \u05D0\u05D5\u05DE\u05E8 \u05E9\u05D0\u05EA\u05D4 \u05DC\u05D0 \u05E4\u05D5\u05EA\u05E8 \u05D1\u05DE\u05E7\u05D5\u05DE\u05D9.\n\n3\uFE0F\u20E3 \u05E9\u05D9\u05D8\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4:\n\u05D0\u05E0\u05D9 \u05D0\u05E9\u05DC\u05D7 \u05DC\u05DA \u05DB\u05DC \u05E4\u05E2\u05DD \u05E9\u05DC\u05D1 (\u05D0\u2032, \u05D1\u2032 \u05D0\u05D5 \u05D2\u2032).\n\u05D1\u05EA\u05D2\u05D5\u05D1\u05D4, \u05D0\u05EA\u05D4 \u05E9\u05D5\u05D0\u05DC \u05D0\u05D5\u05EA\u05D9 \u05E8\u05E7 \u05E9\u05D0\u05DC\u05D4 \u05D0\u05D7\u05EA \u05DE\u05DB\u05D5\u05D5\u05E0\u05EA \u05E2\u05DC \u05D4\u05E0\u05D5\u05E1\u05D7\u05D4 \u05D0\u05D5 \u05E2\u05DC \u05D4\u05D4\u05E6\u05D1\u05D4.",
    steps: [
      { phase: "\u05E9\u05DC\u05D1 \u05D0\u2032", label: "\u05DE\u05E6\u05D9\u05D0\u05EA f\u2032(x)", coaching: "", prompt: "\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B2 \u2212 4x + 3. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u2014 \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05D0\u05EA \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05DC \u05E4\u05D5\u05DC\u05D9\u05E0\u05D5\u05DD? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.", keywords: [], keywordHint: "", contextWords: ["\u05E0\u05D2\u05D6\u05E8\u05EA", "f'(x)", "\u05D2\u05D6\u05D9\u05E8\u05D4", "\u05DB\u05DC\u05DC", "\u05D7\u05D6\u05E7\u05D4", "\u05DE\u05E7\u05D3\u05DD", "\u05E4\u05D5\u05DC\u05D9\u05E0\u05D5\u05DD"] },
      { phase: "\u05E9\u05DC\u05D1 \u05D1\u2032", label: "\u05DE\u05E6\u05D9\u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF", coaching: "", prompt: "\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B2 \u2212 4x + 3. \u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u2014 \u05D0\u05D9\u05DA \u05DE\u05E9\u05D5\u05D5\u05D9\u05DD \u05E0\u05D2\u05D6\u05E8\u05EA \u05DC\u05D0\u05E4\u05E1 \u05DB\u05D3\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E7\u05D9\u05E6\u05D5\u05DF? \u05D0\u05DC \u05EA\u05D9\u05EA\u05DF \u05DC\u05D9 \u05D0\u05EA \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4.", keywords: [], keywordHint: "", contextWords: ["\u05E7\u05D9\u05E6\u05D5\u05DF", "f'(x)=0", "\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD", "\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E1\u05D9\u05D5\u05D5\u05D2", "\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05E0\u05D9\u05D9\u05D4"] },
      { phase: "\u05E9\u05DC\u05D1 \u05D2\u2032", label: "\u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DC\u05D9\u05D9\u05D4 \u05D5\u05D9\u05E8\u05D9\u05D3\u05D4", coaching: "", prompt: "\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B2 \u2212 4x + 3. \u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05E7\u05D9\u05E6\u05D5\u05DF. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u2014 \u05D0\u05D9\u05DA \u05E7\u05D5\u05D1\u05E2\u05D9\u05DD \u05D4\u05D9\u05DB\u05DF \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05E2\u05D5\u05DC\u05D4 \u05D5\u05D4\u05D9\u05DB\u05DF \u05D9\u05D5\u05E8\u05D3\u05EA? \u05D0\u05DC \u05EA\u05D9\u05EA\u05DF \u05DC\u05D9 \u05D0\u05EA \u05D4\u05EA\u05D7\u05D5\u05DE\u05D9\u05DD.", keywords: [], keywordHint: "", contextWords: ["\u05E2\u05DC\u05D9\u05D9\u05D4", "\u05D9\u05E8\u05D9\u05D3\u05D4", "\u05DE\u05D5\u05E0\u05D5\u05D8\u05D5\u05E0\u05D9\u05D5\u05EA", "\u05E1\u05D9\u05DE\u05DF \u05D4\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05E7\u05D8\u05E2", "\u05D8\u05D1\u05DC\u05EA \u05E1\u05D9\u05DE\u05E0\u05D9\u05DD"] },
    ],
  },
  {
    id: "medium",
    title: "חקירת פולינום מדרגה 3",
    problem: "נתונה הפונקציה:\nf(x) = x\u00B3 \u2212 3x\n\n\u05D0. מצא את f\u2032(x).\n\u05D1. מצא נקודות קיצון וסווג אותן.\n\u05D2. מצא נקודת פיתול.\n\u05D3. שרטט סקיצה של הפונקציה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שתי נקודות קיצון \u2014 לא אחת", text: "בפולינום מדרגה 3, f\u2032(x)=0 יכולה לתת שני פתרונות. אל תעצרו אחרי פתרון אחד \u2014 בדקו את הדיסקרימיננטה." },
      { title: "\u26A0\uFE0F שכחו נקודת פיתול", text: "נקודת פיתול היא המקום שבו f\u2032\u2032(x)=0 והפונקציה משנה קעירות. תלמידים רבים מדלגים על הנגזרת השנייה לחלוטין." },
    ],
    goldenPrompt: "היי, אני תלמיד כיתה יא\u2032.\nצירפתי לך תרגיל בחקירת פולינום מדרגה 3 \u2014 f(x) = x\u00B3 \u2212 3x.\nאני רוצה שתהיה המורה שלי ותעזור לי שלב אחרי שלב בלי לגלות לי את התשובות.\n\nקודם כל, תסרוק את הנתונים, אל תכתוב שום פתרון עדיין.\n\nבכל שלב \u2014 שאל אותי רק שאלה אחת מכווינה.\nחכה לי בין שלב לשלב ואל תמשיך לפני שאני שולח.",
    steps: [
      { phase: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2032", label: "\u05D2\u05D6\u05D9\u05E8\u05EA \u05E4\u05D5\u05DC\u05D9\u05E0\u05D5\u05DD \u05DE\u05D3\u05E8\u05D2\u05D4 3", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["\u05E0\u05D2\u05D6\u05E8\u05EA", "f'(x)", "\u05D2\u05D6\u05D9\u05E8\u05D4", "\u05DB\u05DC\u05DC \u05D4\u05D2\u05D6\u05D9\u05E8\u05D4", "\u05D0\u05D9\u05D1\u05E8", "\u05D7\u05D6\u05E7\u05D4", "\u05DE\u05E7\u05D3\u05DD"] },
      { phase: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2032", label: "\u05DE\u05E6\u05D9\u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF \u05D5\u05E1\u05D9\u05D5\u05D5\u05D2", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["\u05E7\u05D9\u05E6\u05D5\u05DF", "f'(x)=0", "\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD", "\u05E1\u05D9\u05D5\u05D5\u05D2", "\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05E0\u05D9\u05D9\u05D4"] },
      { phase: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2032", label: "\u05DE\u05E6\u05D9\u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05EA \u05E4\u05D9\u05EA\u05D5\u05DC", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["\u05E0\u05E7\u05D5\u05D3\u05EA \u05E4\u05D9\u05EA\u05D5\u05DC", "f''(x)", "\u05E0\u05D2\u05D6\u05E8\u05EA \u05E9\u05E0\u05D9\u05D9\u05D4", "\u05E7\u05E2\u05D9\u05E8\u05D5\u05EA", "\u05E7\u05DE\u05D5\u05E8\u05D4", "\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E7\u05E2\u05D9\u05E8\u05D5\u05EA"] },
      { phase: "\u05E1\u05E2\u05D9\u05E3 \u05D3\u2032", label: "\u05E1\u05E7\u05D9\u05E6\u05EA \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["\u05E1\u05E7\u05D9\u05E6\u05D4", "\u05D2\u05E8\u05E3", "\u05E2\u05DC\u05D9\u05D9\u05D4", "\u05D9\u05E8\u05D9\u05D3\u05D4", "\u05E6\u05D9\u05E8 x", "\u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8\u05D9\u05DD"] },
    ],
  },
  {
    id: "advanced",
    title: "חקירה עם פרמטר",
    problem: "נתונה הפונקציה:\nf(x) = ax\u00B3 + bx\u00B2\n\nידוע שהפונקציה עוברת דרך הנקודה (1,4) ויש לה קיצון ב-x=1.\n\n\u05D0. מצא את a ו-b.\n\u05D1. בצע חקירה מלאה של הפונקציה המתקבלת.\n\u05D2. מצא את השטח הכלוא בין העקומה לציר x.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "\u26A0\uFE0F שתי משוואות \u2014 מערכת", text: "f(1)=4 נותנת משוואה אחת, f\u2032(1)=0 נותנת משוואה שנייה. חובה לפתור מערכת של שתי משוואות עם שני נעלמים." },
      { title: "\u26A0\uFE0F גזירת ax\u00B3 \u2014 לא לשכוח את המקדם", text: "הנגזרת של ax\u00B3 היא 3ax\u00B2, לא ax\u00B2. חובה להכפיל את החזקה במקדם a." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים \u2014 כתוב פרומפט שלם שמסביר ל-AI איך לנהל חקירת פולינום עם פרמטרים. כלול: הגדרת תפקיד, איסור פתרון, בקשת הנחיה, הנושא המתמטי, ודרישת המתנה בין סעיפים.",
    steps: [
      { phase: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2032", label: "\u05DE\u05E6\u05D9\u05D0\u05EA a \u05D5-b \u05DE\u05EA\u05E0\u05D0\u05D9\u05DD", coaching: "", prompt: "נתונה f(x) = ax\u00B3 + bx\u00B2. ידוע ש-f(1)=4 ו-f\u2032(1)=0. תנחה אותי לבנות מערכת משוואות \u2014 אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["\u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05E9\u05D5\u05D5\u05D0\u05D5\u05EA", "\u05EA\u05E0\u05D0\u05D9", "\u05E7\u05D9\u05E6\u05D5\u05DF", "\u05E0\u05D2\u05D6\u05E8\u05EA", "\u05D4\u05E6\u05D1\u05D4"] },
      { phase: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2032", label: "\u05D7\u05E7\u05D9\u05E8\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05E9\u05DC \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4", coaching: "", prompt: "מצאתי את a ו-b. תנחה אותי לבצע חקירה מלאה \u2014 נגזרת, קיצונים, נקודת פיתול, מונוטוניות. אל תגלה תשובות.", keywords: [], keywordHint: "", contextWords: ["\u05D7\u05E7\u05D9\u05E8\u05D4", "\u05DE\u05D5\u05E0\u05D5\u05D8\u05D5\u05E0\u05D9\u05D5\u05EA", "\u05E7\u05D9\u05E6\u05D5\u05DF", "\u05E0\u05E7\u05D5\u05D3\u05EA \u05E4\u05D9\u05EA\u05D5\u05DC", "\u05E1\u05E7\u05D9\u05E6\u05D4"] },
      { phase: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2032", label: "\u05E9\u05D8\u05D7 \u05DB\u05DC\u05D5\u05D0 \u05D1\u05D9\u05DF \u05D4\u05E2\u05E7\u05D5\u05DE\u05D4 \u05DC\u05E6\u05D9\u05E8 x", coaching: "", prompt: "השלמתי את החקירה. תנחה אותי לחשב שטח כלוא בין העקומה לציר x \u2014 באמצעות אינטגרל. אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["\u05E9\u05D8\u05D7", "\u05D0\u05D9\u05E0\u05D8\u05D2\u05E8\u05DC", "\u05E6\u05D9\u05E8 x", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D2\u05D1\u05D5\u05DC\u05D5\u05EA"] },
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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)" }}>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(15,23,42,0.8)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.03)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#4ade80" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#fca5a5", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{"\u26A0\uFE0F"} שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.08)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#fca5a5", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(15,23,42,0.6)", padding: "1.25rem", boxShadow: s.glowShadow }}>
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
  const [activeTab, setActiveTab] = useState<"deriv" | "extremum" | "mono" | null>(null);

  const tabs = [
    { id: "deriv" as const,    label: "כלל הגזירה",   tex: "(x^n)' = nx^{n-1}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "extremum" as const, label: "קיצון",        tex: "f'(x)=0",            color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "mono" as const,     label: "מונוטוניות",   tex: "f'(x) \\gtrless 0",  color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
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

      {/* Expanded: Derivative rule */}
      {activeTab === "deriv" && (
        <motion.div key="deriv" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(x^n)' = n \\cdot x^{n-1}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כדי לגזור <InlineMath>{"x^n"}</InlineMath>, מורידים את החזקה כמקדם ומפחיתים 1 מהחזקה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מורידים את n להיות מקדם.</li>
                  <li>החזקה החדשה: <InlineMath>{"n-1"}</InlineMath>.</li>
                  <li>קבוע (ללא x) נעלם בגזירה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#4ade80", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"(3x^4)' = 12x^3"}</InlineMath>, <InlineMath>{"(5x)' = 5"}</InlineMath>, <InlineMath>{"(7)' = 0"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Extremum */}
      {activeTab === "extremum" && (
        <motion.div key="extremum" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"f'(x_0)=0 \\;\\Rightarrow\\; \\text{extremum candidate}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> נקודת קיצון מתקבלת כאשר הנגזרת מתאפסת. לסיווג:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>פתרו <InlineMath>{"f'(x)=0"}</InlineMath>.</li>
                  <li>בדקו <InlineMath>{"f''(x_0)"}</InlineMath>: חיובי = מינימום, שלילי = מקסימום.</li>
                  <li>אם <InlineMath>{"f''(x_0)=0"}</InlineMath> \u2014 השתמשו בטבלת סימנים.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#fb923c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"f(x)=x^2"}</InlineMath> \u2192 <InlineMath>{"f'(x)=2x=0"}</InlineMath> \u2192 <InlineMath>{"x=0"}</InlineMath>, <InlineMath>{"f''(0)=2>0"}</InlineMath> \u2192 מינימום
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Monotonicity */}
      {activeTab === "mono" && (
        <motion.div key="mono" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"f'(x)>0 \\;\\Rightarrow\\; \\text{increasing}, \\quad f'(x)<0 \\;\\Rightarrow\\; \\text{decreasing}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> מונוטוניות נקבעת לפי סימן הנגזרת בכל קטע:
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"f'(x) > 0"}</InlineMath> \u2192 הפונקציה <strong>עולה</strong> בקטע.</li>
                  <li><InlineMath>{"f'(x) < 0"}</InlineMath> \u2192 הפונקציה <strong>יורדת</strong> בקטע.</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#f87171", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; בנו טבלת סימנים: חלקו את ציר x לקטעים לפי נקודות שבהן f&apos;(x)=0, ובדקו את הסימן בכל קטע.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── ParabolaLab (basic) ────────────────────────────────────────────────────

function ParabolaLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-4);
  const [c, setC] = useState(3);

  const W = 300, H = 200;
  const xMin = -3, xMax = 7, yMin = -5, yMax = 10;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const f = (x: number) => a * x * x + b * x + c;
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

  // Derivative and analysis
  const fpStr = `${2 * a}x ${b >= 0 ? "+" : "\u2212"} ${Math.abs(b)}`;
  const xVertex = a !== 0 ? -b / (2 * a) : 0;
  const yVertex = f(xVertex);
  const direction = a > 0 ? "פונה מעלה (מינימום)" : a < 0 ? "פונה מטה (מקסימום)" : "קו ישר";
  const fpZero = a !== 0 ? `x = ${xVertex.toFixed(2)}` : "\u2014";
  const mono = a > 0
    ? `\u05D9\u05D5\u05E8\u05D3\u05EA: (\u2212\u221E, ${xVertex.toFixed(1)}), \u05E2\u05D5\u05DC\u05D4: (${xVertex.toFixed(1)}, \u221E)`
    : a < 0
    ? `\u05E2\u05D5\u05DC\u05D4: (\u2212\u221E, ${xVertex.toFixed(1)}), \u05D9\u05D5\u05E8\u05D3\u05EA: (${xVertex.toFixed(1)}, \u221E)`
    : "\u2014";

  const curveColor = a > 0 ? "#3b82f6" : a < 0 ? "#f43f5e" : "#6B7280";

  return (
    <section style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת פרבולה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{a}</span>x&sup2; + (<span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{b}</span>)x + <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{c}</span>
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "a (x\u00B2)", val: a, min: -3, max: 3, step: 0.5, set: setA },
          { label: "b (x)", val: b, min: -6, max: 6, step: 1, set: setB },
          { label: "c (קבוע)", val: c, min: -5, max: 10, step: 1, set: setC },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#16A34A", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(15,23,42,0.8)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(100,116,139,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#64748b" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#64748b" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {a !== 0 && toSx(xVertex) >= 0 && toSx(xVertex) <= W && toSy(yVertex) >= 0 && toSy(yVertex) <= H && (
            <circle cx={toSx(xVertex)} cy={toSy(yVertex)} r={5} fill="#f59e0b" />
          )}
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "קודקוד", val: a !== 0 ? `(${xVertex.toFixed(1)}, ${yVertex.toFixed(1)})` : "\u2014" },
          { label: "כיוון", val: direction },
          { label: "f\u2032(x)=0", val: fpZero },
          { label: "מונוטוניות", val: mono },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(22,163,74,0.3)", padding: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        f&apos;(x) = <span style={{ color: "#4ade80", fontFamily: "monospace" }}>{fpStr}</span>
      </p>
    </section>
  );
}

// ─── CubicLab (medium) ──────────────────────────────────────────────────────

function CubicLab() {
  const [a3, setA3] = useState(1);
  const [b1, setB1] = useState(-3);

  const W = 300, H = 200;
  const xMin = -3, xMax = 3, yMin = -6, yMax = 6;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const f = (x: number) => a3 * x * x * x + b1 * x;
  const fp = (x: number) => 3 * a3 * x * x + b1;
  const fpp = (x: number) => 6 * a3 * x;

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

  // Extrema from f'(x) = 3a3*x^2 + b1 = 0
  const disc = -b1 / (3 * a3);
  const hasExtrema = a3 !== 0 && disc > 0;
  const extremaX = hasExtrema ? [Math.sqrt(disc), -Math.sqrt(disc)] : [];
  const extremaCount = extremaX.length;

  // Inflection at f''(x) = 6a3*x = 0 => x=0 always (if a3 != 0)
  const inflectionX = a3 !== 0 ? 0 : null;
  const inflectionY = inflectionX !== null ? f(inflectionX) : null;

  const fpStr = `${3 * a3}x\u00B2 ${b1 >= 0 ? "+" : "\u2212"} ${Math.abs(b1)}`;

  return (
    <section style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת פולינום מדרגה 3</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = <span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{a3}</span>x&sup3; + (<span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{b1}</span>)x
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "a (x\u00B3)", val: a3, min: -3, max: 3, step: 0.5, set: setA3 },
          { label: "b (x)", val: b1, min: -6, max: 6, step: 0.5, set: setB1 },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.35)", background: "rgba(15,23,42,0.8)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(100,116,139,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#64748b" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#64748b" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Extrema markers */}
          {extremaX.map((ex, i) => {
            const sy = toSy(f(ex)), sx = toSx(ex);
            if (sx < 0 || sx > W || sy < 0 || sy > H) return null;
            return <circle key={i} cx={sx} cy={sy} r={5} fill="#f59e0b" />;
          })}
          {/* Inflection marker */}
          {inflectionX !== null && inflectionY !== null && toSy(inflectionY) >= 0 && toSy(inflectionY) <= H && (
            <circle cx={toSx(inflectionX)} cy={toSy(inflectionY)} r={4} fill="#34d399" />
          )}
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "f\u2032(x)", val: fpStr },
          { label: "\u05E0\u05E7\u2032 \u05E7\u05D9\u05E6\u05D5\u05DF", val: `${extremaCount}` },
          { label: "\u05E0\u05E7\u2032 \u05E4\u05D9\u05EA\u05D5\u05DC", val: inflectionX !== null ? `(${inflectionX.toFixed(1)}, ${inflectionY!.toFixed(1)})` : "\u2014" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(234,88,12,0.3)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: "#fb923c", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        {hasExtrema ? `\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF \u05D1-x = \u00B1${Math.sqrt(disc).toFixed(2)}` : "\u05D0\u05D9\u05DF \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E7\u05D9\u05E6\u05D5\u05DF (\u05D4\u05E0\u05D2\u05D6\u05E8\u05EA \u05D0\u05D9\u05E0\u05D4 \u05DE\u05EA\u05D0\u05E4\u05E1\u05EA)"}
      </p>
    </section>
  );
}

// ─── ParameterLab (advanced) ────────────────────────────────────────────────

function ParameterLab() {
  const [aP, setAP] = useState(-8);
  const [bP, setBP] = useState(12);

  const W = 300, H = 200;
  const xMin = -0.5, xMax = 2, yMin = -3, yMax = 8;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const f = (x: number) => aP * x * x * x + bP * x * x;
  const fp = (x: number) => 3 * aP * x * x + 2 * bP * x;

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

  // Constraints check
  const f1 = aP + bP;
  const fp1 = 3 * aP + 2 * bP;
  const passesPoint = Math.abs(f1 - 4) < 0.5;
  const hasExtremum = Math.abs(fp1) < 1;

  return (
    <section style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת פרמטרים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{aP}</span>x&sup3; + <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{bP}</span>x&sup2; &mdash; שנה a ו-b כדי לקיים את התנאים
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "a (x\u00B3)", val: aP, min: -15, max: 5, step: 1, set: setAP },
          { label: "b (x\u00B2)", val: bP, min: -5, max: 20, step: 1, set: setBP },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", padding: "1rem" }}>
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
        <div style={{ borderRadius: 12, border: `2px solid ${passesPoint ? "rgba(22,163,74,0.5)" : "rgba(220,38,38,0.3)"}`, background: passesPoint ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>f(1) = {f1.toFixed(1)}</div>
          <div style={{ color: passesPoint ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: 13 }}>{passesPoint ? "\u2705 \u05E2\u05D5\u05D1\u05E8 \u05D3\u05E8\u05DA (1,4)" : "\u274C \u05DC\u05D0 \u05E2\u05D5\u05D1\u05E8 \u05D3\u05E8\u05DA (1,4)"}</div>
        </div>
        <div style={{ borderRadius: 12, border: `2px solid ${hasExtremum ? "rgba(22,163,74,0.5)" : "rgba(220,38,38,0.3)"}`, background: hasExtremum ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.06)", padding: "10px 14px", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>f&apos;(1) = {fp1.toFixed(1)}</div>
          <div style={{ color: hasExtremum ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: 13 }}>{hasExtremum ? "\u2705 \u05E7\u05D9\u05E6\u05D5\u05DF \u05D1-x=1" : "\u274C \u05D0\u05D9\u05DF \u05E7\u05D9\u05E6\u05D5\u05DF \u05D1-x=1"}</div>
        </div>
      </div>

      {passesPoint && hasExtremum && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 12, background: "rgba(22,163,74,0.12)", border: "2px solid rgba(22,163,74,0.4)", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#4ade80", fontWeight: 700, fontSize: 14 }}>
          &#11088; שני התנאים מתקיימים! a={aP}, b={bP}
        </motion.div>
      )}

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(220,38,38,0.35)", background: "rgba(15,23,42,0.8)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(100,116,139,0.12)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#64748b" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#64748b" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke="#f43f5e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Point (1, f(1)) marker */}
          {toSx(1) >= 0 && toSx(1) <= W && toSy(f(1)) >= 0 && toSy(f(1)) <= H && (
            <circle cx={toSx(1)} cy={toSy(f(1))} r={5} fill={passesPoint ? "#4ade80" : "#f87171"} />
          )}
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "a + b", val: f1.toFixed(0) },
          { label: "3a + 2b", val: fp1.toFixed(0) },
          { label: "\u05EA\u05E0\u05D0\u05D9\u05DD", val: passesPoint && hasExtremum ? "\u05DE\u05EA\u05E7\u05D9\u05D9\u05DE\u05D9\u05DD" : "\u05DC\u05D0 \u05DE\u05EA\u05E7\u05D9\u05D9\u05DE\u05D9\u05DD" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(220,38,38,0.3)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: "#f87171", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        מערכת: a + b = 4, &ensp; 3a + 2b = 0 &ensp;&mdash;&ensp; שנה את הסליידרים עד ששני התנאים מתקיימים
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PolynomialsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>חקירת פולינומים עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>נגזרות, נקודות קיצון, מונוטוניות ואיך לשאול AI את השאלות הנכונות</p>
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

        <SubtopicProgress subtopicId="calculus/polynomials" />

        <FormulaBar />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id as typeof selectedLevel)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-slate-500 hover:text-slate-300"}`}
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
        {selectedLevel === "basic" && <ParabolaLab />}
        {selectedLevel === "medium" && <CubicLab />}
        {selectedLevel === "advanced" && <ParameterLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="calculus/polynomials" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
