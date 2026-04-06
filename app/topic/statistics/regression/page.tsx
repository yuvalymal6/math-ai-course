"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock } from "lucide-react";
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

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  const dots = [
    { x: 40, y: 150 }, { x: 65, y: 125 }, { x: 95, y: 105 },
    { x: 130, y: 80 }, { x: 160, y: 55 },
  ];
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={30} y1={180} x2={240} y2={180} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={180} x2={30} y2={20} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={244} y={184} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={26} y={16} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={5} fill="#3b82f6" opacity={0.8} />
      ))}
      <line x1={30} y1={170} x2={200} y2={35} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" />
      <text x={180} y={55} fontSize={14} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>?</text>
    </svg>
  );
}

function MediumSVG() {
  const dots = [
    { x: 35, y: 155 }, { x: 55, y: 130 }, { x: 75, y: 118 },
    { x: 95, y: 95 }, { x: 120, y: 82 }, { x: 145, y: 60 },
    { x: 170, y: 48 }, { x: 200, y: 32 },
  ];
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={30} y1={180} x2={240} y2={180} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={180} x2={30} y2={20} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={244} y={184} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={26} y={16} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={4.5} fill="#3b82f6" opacity={0.8} />
      ))}
      {/* trend arrow */}
      <line x1={30} y1={165} x2={220} y2={25} stroke="#34d399" strokeWidth={2} strokeDasharray="5 3" />
      <polygon points="220,25 210,35 215,22" fill="#34d399" opacity={0.7} />
      <text x={130} y={200} fontSize={11} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>r = ?</text>
    </svg>
  );
}

function AdvancedSVG() {
  const dots = [
    { x: 35, y: 145 }, { x: 55, y: 95 }, { x: 75, y: 60 },
    { x: 100, y: 40 }, { x: 125, y: 38 }, { x: 150, y: 50 },
    { x: 175, y: 80 }, { x: 200, y: 125 },
  ];
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={30} y1={180} x2={240} y2={180} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={30} y1={180} x2={30} y2={20} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={244} y={184} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={26} y={16} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={4.5} fill="#3b82f6" opacity={0.8} />
      ))}
      {/* linear fit — bad */}
      <line x1={30} y1={115} x2={220} y2={70} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 3" />
      {/* curved fit — good */}
      <path d="M 30 150 Q 100 15 220 130" fill="none" stroke="#34d399" strokeWidth={2} strokeDasharray="5 3" />
    </svg>
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
        subjectWords={["רגרסיה", "מתאם", "שיפוע", "חיתוך", "r\u00B2", "חיזוי"]}
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

      {/* Advanced gate — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"slope" | "intercept" | "correlation" | null>(null);

  const tabs = [
    { id: "slope" as const,       label: "שיפוע",        tex: "b = r \\cdot \\frac{S_y}{S_x}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "intercept" as const,   label: "חיתוך",        tex: "a = \\bar{y} - b\\bar{x}",       color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "correlation" as const, label: "מקדם מתאם",    tex: "r = \\frac{\\sum(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2 \\cdot \\sum(y_i-\\bar{y})^2}}", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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
              <span style={{ color: isActive ? t.color : "#6B7280", fontSize: 10 }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {/* Expanded: Slope */}
      {activeTab === "slope" && (
        <motion.div key="slope" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"b = r \\cdot \\frac{S_y}{S_x}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> השיפוע <InlineMath>{"b"}</InlineMath> של ישר הרגרסיה נקבע לפי:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"r"}</InlineMath> -- מקדם המתאם (בין -1 ל-1).</li>
                  <li><InlineMath>{"S_y"}</InlineMath> -- סטיית התקן של y.</li>
                  <li><InlineMath>{"S_x"}</InlineMath> -- סטיית התקן של x.</li>
                  <li>סימן <InlineMath>{"b"}</InlineMath> תמיד זהה לסימן <InlineMath>{"r"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"r=0.8"}</InlineMath>, <InlineMath>{"S_y=4"}</InlineMath>, <InlineMath>{"S_x=2"}</InlineMath> &rarr; <InlineMath>{"b = 0.8 \\cdot \\frac{4}{2} = 1.6"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Intercept */}
      {activeTab === "intercept" && (
        <motion.div key="intercept" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"a = \\bar{y} - b\\bar{x}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> החיתוך <InlineMath>{"a"}</InlineMath> הוא הערך של <InlineMath>{"\\hat{y}"}</InlineMath> כאשר <InlineMath>{"x=0"}</InlineMath>:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>ישר הרגרסיה תמיד עובר דרך הנקודה <InlineMath>{"(\\bar{x}, \\bar{y})"}</InlineMath>.</li>
                  <li>לכן <InlineMath>{"a = \\bar{y} - b\\bar{x}"}</InlineMath>.</li>
                  <li>שימו לב: <InlineMath>{"a"}</InlineMath> לא תמיד בעל משמעות מעשית.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"\\bar{x}=3"}</InlineMath>, <InlineMath>{"\\bar{y}=7"}</InlineMath>, <InlineMath>{"b=1.6"}</InlineMath> &rarr; <InlineMath>{"a = 7 - 1.6 \\cdot 3 = 2.2"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Correlation */}
      {activeTab === "correlation" && (
        <motion.div key="correlation" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"r = \\frac{\\sum(x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum(x_i - \\bar{x})^2 \\cdot \\sum(y_i - \\bar{y})^2}}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> מקדם המתאם <InlineMath>{"r"}</InlineMath> מודד קשר לינארי:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"r = 1"}</InlineMath> -- קשר לינארי חיובי מושלם.</li>
                  <li><InlineMath>{"r = -1"}</InlineMath> -- קשר לינארי שלילי מושלם.</li>
                  <li><InlineMath>{"r = 0"}</InlineMath> -- אין קשר לינארי.</li>
                  <li><InlineMath>{"r^2"}</InlineMath> -- אחוז השונות שהישר מסביר.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"r=0.85"}</InlineMath> &rarr; <InlineMath>{"r^2 = 0.7225"}</InlineMath> -- הישר מסביר ~72% מהשונות.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── RegressionLab (basic) ───────────────────────────────────────────────────

const LAB_DATA = [
  { x: 1, y: 2.1 }, { x: 2, y: 3.8 }, { x: 3, y: 5.2 },
  { x: 4, y: 6.5 }, { x: 5, y: 8.9 }, { x: 6, y: 10.1 },
  { x: 7, y: 12.8 }, { x: 8, y: 14.2 },
];

function RegressionLab() {
  const [slope, setSlope] = useState(1.5);
  const [intercept, setIntercept] = useState(0.5);

  const n = LAB_DATA.length;
  const xMean = LAB_DATA.reduce((s, d) => s + d.x, 0) / n;
  const yMean = LAB_DATA.reduce((s, d) => s + d.y, 0) / n;
  const ssTot = LAB_DATA.reduce((s, d) => s + (d.y - yMean) ** 2, 0);
  const ssRes = LAB_DATA.reduce((s, d) => {
    const yHat = intercept + slope * d.x;
    return s + (d.y - yHat) ** 2;
  }, 0);
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const yHatMean = intercept + slope * xMean;

  const S = 260;
  const pad = 30;
  const xMin = 0, xMax = 10, yMin = -2, yMax = 18;
  const toSx = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (S - 2 * pad);
  const toSy = (y: number) => (S - pad) - ((y - yMin) / (yMax - yMin)) * (S - 2 * pad);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת רגרסיה לינארית</h3>
      <p style={{ textAlign: "center", fontSize: 14, fontFamily: "monospace", color: "#2D3436", marginBottom: "2rem", direction: "ltr" }}>
        <InlineMath>{`\\hat{y} = ${intercept.toFixed(1)} + ${slope.toFixed(1)}x`}</InlineMath>
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "שיפוע b", val: slope, set: setSlope, min: -2, max: 3, step: 0.1, color: "#16A34A" },
          { label: "חותך a", val: intercept, set: setIntercept, min: -10, max: 10, step: 0.5, color: "#7c3aed" },
        ].map(sl => (
          <div key={sl.label} style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: sl.color, fontFamily: "monospace", fontWeight: 700 }}>{sl.val.toFixed(1)}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: sl.color }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", maxWidth: 320 }} aria-hidden>
          {[0, 2, 4, 6, 8, 10].map(v => {
            const sx = toSx(v);
            return <line key={`gx${v}`} x1={sx} y1={pad} x2={sx} y2={S - pad} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} />;
          })}
          {[0, 4, 8, 12, 16].map(v => {
            const sy = toSy(v);
            return <line key={`gy${v}`} x1={pad} y1={sy} x2={S - pad} y2={sy} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} />;
          })}
          <line x1={pad} y1={S - pad} x2={S - pad} y2={S - pad} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={pad} y1={S - pad} x2={pad} y2={pad} stroke="#94a3b8" strokeWidth={1.2} />
          <text x={S - pad} y={S - pad + 16} fontSize={11} fill="#64748b" textAnchor="end">x</text>
          <text x={pad - 8} y={pad} fontSize={11} fill="#64748b" textAnchor="middle">y</text>
          {LAB_DATA.map((d, i) => (
            <circle key={i} cx={toSx(d.x)} cy={toSy(d.y)} r={5} fill="#3b82f6" opacity={0.8} />
          ))}
          {LAB_DATA.map((d, i) => {
            const yHat = intercept + slope * d.x;
            return (
              <line key={`r${i}`} x1={toSx(d.x)} y1={toSy(d.y)} x2={toSx(d.x)} y2={toSy(yHat)}
                stroke="#a78bfa" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
            );
          })}
          <line
            x1={toSx(xMin)} y1={toSy(intercept + slope * xMin)}
            x2={toSx(xMax)} y2={toSy(intercept + slope * xMax)}
            stroke="#16A34A" strokeWidth={2.5} />
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "שיפוע b", val: slope.toFixed(2), color: "#16A34A" },
          { label: "חותך a", val: intercept.toFixed(1), color: "#7c3aed" },
          { label: "r\u00B2", val: rSquared.toFixed(3), color: rSquared > 0.8 ? "#16a34a" : rSquared > 0.5 ? "#d97706" : "#dc2626" },
          { label: "\u0177(\u0304x)", val: yHatMean.toFixed(2), color: "#2D3436" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(22,163,74,0.25)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        ככל ש-r&sup2; קרוב ל-1, הישר מסביר יותר מהשונות
      </p>
    </section>
  );
}

// ─── CorrelationLab (medium) ─────────────────────────────────────────────────

function CorrelationLab() {
  const [r, setR] = useState(0.7);

  // Generate scatter dots based on r value
  const baseDotsX = [0.1, 0.2, 0.3, 0.35, 0.45, 0.5, 0.6, 0.65, 0.75, 0.8, 0.85, 0.9];
  const baseSeed  = [0.12, 0.35, 0.28, 0.55, 0.42, 0.68, 0.51, 0.78, 0.62, 0.85, 0.72, 0.91];
  const dots = baseDotsX.map((bx, i) => {
    const noise = (baseSeed[i] - 0.5) * (1 - Math.abs(r));
    const yLinear = r >= 0 ? bx : 1 - bx;
    const y = Math.max(0.05, Math.min(0.95, yLinear + noise));
    return { x: bx, y };
  });

  const rSq = r * r;
  const strengthLabel = Math.abs(r) > 0.8 ? "חזק מאוד" : Math.abs(r) > 0.6 ? "חזק" : Math.abs(r) > 0.4 ? "בינוני" : Math.abs(r) > 0.2 ? "חלש" : "אין קשר";
  const dirLabel = r > 0.05 ? "חיובי" : r < -0.05 ? "שלילי" : "אפסי";

  const S = 260;
  const pad = 30;
  const toSx = (x: number) => pad + x * (S - 2 * pad);
  const toSy = (y: number) => (S - pad) - y * (S - 2 * pad);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת מקדם מתאם</h3>
      <p style={{ textAlign: "center", fontSize: 14, color: "#6B7280", marginBottom: "2rem" }}>
        שנה את r כדי לראות איך הפיזור משתנה
      </p>

      {/* Slider */}
      <div style={{ maxWidth: 360, margin: "0 auto", marginBottom: "2rem" }}>
        <div style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>r (מקדם מתאם)</span>
            <span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{r.toFixed(2)}</span>
          </div>
          <input type="range" min={-1} max={1} step={0.05} value={r} onChange={e => setR(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", maxWidth: 320 }} aria-hidden>
          <line x1={pad} y1={S - pad} x2={S - pad} y2={S - pad} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={pad} y1={S - pad} x2={pad} y2={pad} stroke="#94a3b8" strokeWidth={1.2} />
          <text x={S - pad} y={S - pad + 16} fontSize={11} fill="#64748b" textAnchor="end">x</text>
          <text x={pad - 8} y={pad} fontSize={11} fill="#64748b" textAnchor="middle">y</text>
          {dots.map((d, i) => (
            <circle key={i} cx={toSx(d.x)} cy={toSy(d.y)} r={5} fill="#3b82f6" opacity={0.8} />
          ))}
          {/* trend line if |r| > 0.1 */}
          {Math.abs(r) > 0.1 && (
            <line x1={toSx(0.05)} y1={toSy(r >= 0 ? 0.05 : 0.95)} x2={toSx(0.95)} y2={toSy(r >= 0 ? 0.95 : 0.05)} stroke="#EA580C" strokeWidth={2} strokeDasharray="6 4" opacity={0.6} />
          )}
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "r", val: r.toFixed(2), color: "#EA580C" },
          { label: "r\u00B2", val: rSq.toFixed(3), color: "#7c3aed" },
          { label: "עוצמה", val: strengthLabel, color: "#2D3436" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(234,88,12,0.25)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        כיוון הקשר: {dirLabel} | <InlineMath>{`r^2 = ${rSq.toFixed(2)}`}</InlineMath> -- הישר מסביר {(rSq * 100).toFixed(0)}% מהשונות
      </p>
    </section>
  );
}

// ─── ModelCompareLab (advanced) ──────────────────────────────────────────────

function ModelCompareLab() {
  const [curve, setCurve] = useState(0.3);

  // Data points forming a parabola-like shape
  const dataPoints = [
    { x: 1, y: 12 }, { x: 2, y: 7 }, { x: 3, y: 4 },
    { x: 4, y: 3 }, { x: 5, y: 3.5 }, { x: 6, y: 5 },
    { x: 7, y: 8 }, { x: 8, y: 13 },
  ];

  const nPts = dataPoints.length;
  const xM = dataPoints.reduce((s, d) => s + d.x, 0) / nPts;
  const yM = dataPoints.reduce((s, d) => s + d.y, 0) / nPts;

  // Linear fit
  const sxy = dataPoints.reduce((s, d) => s + (d.x - xM) * (d.y - yM), 0);
  const sxx = dataPoints.reduce((s, d) => s + (d.x - xM) ** 2, 0);
  const linB = sxy / sxx;
  const linA = yM - linB * xM;
  const ssTot = dataPoints.reduce((s, d) => s + (d.y - yM) ** 2, 0);
  const ssResLin = dataPoints.reduce((s, d) => s + (d.y - (linA + linB * d.x)) ** 2, 0);
  const r2Lin = ssTot > 0 ? Math.max(0, 1 - ssResLin / ssTot) : 0;

  // Quadratic fit: y = curve*(x - 4.5)^2 + base
  const quadBase = dataPoints.reduce((s, d) => s + (d.y - curve * (d.x - 4.5) ** 2), 0) / nPts;
  const ssResCurve = dataPoints.reduce((s, d) => {
    const yHat = curve * (d.x - 4.5) ** 2 + quadBase;
    return s + (d.y - yHat) ** 2;
  }, 0);
  const r2Curve = ssTot > 0 ? Math.max(0, 1 - ssResCurve / ssTot) : 0;

  const betterFit = r2Curve > r2Lin ? "ריבועי" : "לינארי";

  const S = 260;
  const pad = 30;
  const xMinV = 0, xMaxV = 9, yMinV = -1, yMaxV = 18;
  const toSx = (x: number) => pad + ((x - xMinV) / (xMaxV - xMinV)) * (S - 2 * pad);
  const toSy = (y: number) => (S - pad) - ((y - yMinV) / (yMaxV - yMinV)) * (S - 2 * pad);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת השוואת מודלים</h3>
      <p style={{ textAlign: "center", fontSize: 14, color: "#6B7280", marginBottom: "2rem" }}>
        שנה את פרמטר העקמומיות כדי להשוות ישר מול פרבולה
      </p>

      {/* Slider */}
      <div style={{ maxWidth: 360, margin: "0 auto", marginBottom: "2rem" }}>
        <div style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>עקמומיות</span>
            <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{curve.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={1.5} step={0.05} value={curve} onChange={e => setCurve(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(220,38,38,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", maxWidth: 320 }} aria-hidden>
          <line x1={pad} y1={S - pad} x2={S - pad} y2={S - pad} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={pad} y1={S - pad} x2={pad} y2={pad} stroke="#94a3b8" strokeWidth={1.2} />
          <text x={S - pad} y={S - pad + 16} fontSize={11} fill="#64748b" textAnchor="end">x</text>
          <text x={pad - 8} y={pad} fontSize={11} fill="#64748b" textAnchor="middle">y</text>
          {/* data dots */}
          {dataPoints.map((d, i) => (
            <circle key={i} cx={toSx(d.x)} cy={toSy(d.y)} r={5} fill="#3b82f6" opacity={0.8} />
          ))}
          {/* linear fit */}
          <line x1={toSx(xMinV)} y1={toSy(linA + linB * xMinV)} x2={toSx(xMaxV)} y2={toSy(linA + linB * xMaxV)} stroke="#64748b" strokeWidth={1.8} strokeDasharray="5 3" />
          {/* quadratic fit */}
          <path
            d={Array.from({ length: 50 }, (_, i) => {
              const xVal = xMinV + (i / 49) * (xMaxV - xMinV);
              const yVal = curve * (xVal - 4.5) ** 2 + quadBase;
              return `${i === 0 ? "M" : "L"} ${toSx(xVal).toFixed(1)} ${toSy(yVal).toFixed(1)}`;
            }).join(" ")}
            fill="none" stroke="#34d399" strokeWidth={2.2}
          />
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, marginBottom: "1.5rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 20, borderTop: "2px dashed #64748b", display: "inline-block" }} />
          <span style={{ color: "#64748b" }}>לינארי</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 20, borderTop: "2.5px solid #34d399", display: "inline-block" }} />
          <span style={{ color: "#34d399" }}>ריבועי</span>
        </span>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "r\u00B2 לינארי", val: r2Lin.toFixed(3), color: "#64748b" },
          { label: "r\u00B2 ריבועי", val: r2Curve.toFixed(3), color: "#34d399" },
          { label: "מתאים יותר", val: betterFit, color: "#DC2626" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(220,38,38,0.25)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        כשהנתונים לא לינאריים, מודל ריבועי עשוי להתאים טוב יותר -- בדקו את r&sup2;
      </p>
    </section>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "ישר הרגרסיה הראשון שלי",
    problem: "נתונים 5 זוגות נתונים (xi, yi):\n(1, 3), (2, 5), (3, 7.5), (4, 9), (5, 12)\n\nא. חשב את הממוצעים x\u0304 ו-y\u0304.\nב. חשב את שיפוע ישר הרגרסיה b.\nג. חשב את החותך a.\nד. כתוב את משוואת ישר הרגרסיה ונבא את y עבור x = 7.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "מבלבלים בין r לבין b", text: "r הוא מקדם המתאם (בין -1 ל-1), ואילו b הוא השיפוע. הם קשורים אבל לא זהים. אל תחליפו ביניהם בחישוב." },
      { title: "שוכחים לחשב ממוצעים לפני השיפוע", text: "חייבים למצוא את x\u0304 ו-y\u0304 קודם -- הם נכנסים לנוסחת השיפוע ולנוסחת החותך. דילוג על שלב זה גורר שגיאה בכל ההמשך." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳. נתונים 5 זוגות: (1,3), (2,5), (3,7.5), (4,9), (5,12).\nאני צריך:\n1. לחשב ממוצעים x\u0304 ו-y\u0304\n2. לחשב שיפוע b\n3. לחשב חותך a\n4. לכתוב את משוואת הישר ולנבא y עבור x=7\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- חישוב ממוצעים",
        coaching: "חשב ממוצע x וממוצע y",
        prompt: "נתונים 5 זוגות: (1,3), (2,5), (3,7.5), (4,9), (5,12). תנחה אותי איך לחשב את הממוצעים x\u0304 ו-y\u0304. מאיזה נתונים אני צריך לצאת? אל תפתור עבורי.",
        keywords: ["ממוצע", "x", "y"],
        keywordHint: "ציין שצריך לחשב ממוצעים",
        contextWords: ["ממוצע", "סכום", "נתונים", "זוגות", "חלוקה", "ערכים"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- חישוב השיפוע b",
        coaching: "הצב בנוסחת השיפוע",
        prompt: "חישבתי את הממוצעים מהנתונים (1,3), (2,5), (3,7.5), (4,9), (5,12). תנחה אותי לחשב את השיפוע b. מאיזה נתונים אני צריך? אל תפתור עבורי.",
        keywords: ["שיפוע", "b", "נוסחה"],
        keywordHint: "ציין שצריך לחשב שיפוע",
        contextWords: ["שיפוע", "סטייה", "מתאם", "נוסחה", "חישוב", "b"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- חישוב החותך a",
        coaching: "הצב ממוצעים ושיפוע בנוסחת a",
        prompt: "מצאתי את b ואת הממוצעים מהנתונים (1,3), (2,5), (3,7.5), (4,9), (5,12). תנחה אותי לחשב את החותך a. מה הקשר בין a לממוצעים? אל תפתור.",
        keywords: ["חותך", "a", "ממוצע"],
        keywordHint: "ציין שצריך לחשב חותך",
        contextWords: ["חותך", "ממוצע", "ישר", "הצב", "נוסחה", "a"],
      },
      {
        phase: "ד",
        label: "שלב ד׳ -- משוואת הישר וניבוי",
        coaching: "כתוב את הישר ונבא y עבור x=7",
        prompt: "מצאתי a ו-b מהנתונים (1,3), (2,5), (3,7.5), (4,9), (5,12). תנחה אותי לכתוב את משוואת ישר הרגרסיה ולנבא y עבור x=7. האם הניבוי אמין? אל תפתור.",
        keywords: ["משוואה", "ניבוי", "ישר"],
        keywordHint: "ציין שצריך משוואת ישר",
        contextWords: ["משוואה", "ניבוי", "ישר", "רגרסיה", "הצב", "x"],
      },
    ],
  },
  {
    id: "medium",
    title: "פרשנות מקדם המתאם",
    problem: "חוקר בדק קשר בין שעות למידה שבועיות לציון במבחן.\nנמצא מקדם מתאם: r = 0.85\n\nא. תאר את עוצמת הקשר ואת כיוונו.\nב. חשב את r\u00B2 ופרש את התוצאה.\nג. האם ניתן להסיק שלמידה גורמת לציון גבוה? נמק.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "מקדם מתאם גבוה אינו הוכחה לסיבתיות", text: "גם אם r קרוב ל-1, זה לא אומר שמשתנה אחד גורם לשני. קורלציה אינה סיבתיות -- יכול להיות משתנה שלישי מתערב." },
      { title: "שוכחים לפרש r\u00B2 כאחוז שונות", text: "r\u00B2 הוא שיעור השונות שהמודל מסביר. תלמידים לרוב מחשבים אותו אבל לא מפרשים -- התשובה חייבת לכלול פרשנות מילולית." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳. נתון r=0.85 בין שעות למידה לציון.\nאני צריך:\n1. לתאר כיוון ועוצמה של הקשר\n2. לחשב ולפרש r\u00B2\n3. לדון בסיבתיות מול קורלציה\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- עוצמה וכיוון",
        coaching: "תאר את סוג הקשר",
        prompt: "נתון r=0.85 בין שעות למידה לציון. תנחה אותי לתאר את הקשר -- מה אני צריך לבדוק לגבי הסימן ולגבי הגודל המוחלט? אל תפתור.",
        keywords: ["מתאם", "כיוון", "עוצמה"],
        keywordHint: "ציין מתאם, כיוון ועוצמה",
        contextWords: ["מתאם", "פרשנות", "עוצמה", "כיוון", "סיבתיות", "שונות מוסברת"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- חישוב ופרשנות r\u00B2",
        coaching: "חשב r\u00B2 ופרש",
        prompt: "מקדם המתאם הוא r=0.85. תנחה אותי לחשב r\u00B2 ולפרש את התוצאה. מה המשמעות של המספר שאקבל? אל תפתור.",
        keywords: ["r\u00B2", "שונות", "פרשנות"],
        keywordHint: "ציין r\u00B2 ושונות",
        contextWords: ["מתאם", "פרשנות", "עוצמה", "כיוון", "סיבתיות", "שונות מוסברת"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- סיבתיות מול קורלציה",
        coaching: "האם קורלציה = סיבתיות?",
        prompt: "נמצא r=0.85 בין שעות למידה לציון. תנחה אותי להבין אם אפשר להסיק סיבתיות. מה ההבדל בין קורלציה לסיבתיות? אל תפתור.",
        keywords: ["סיבתיות", "קורלציה"],
        keywordHint: "ציין סיבתיות וקורלציה",
        contextWords: ["מתאם", "פרשנות", "עוצמה", "כיוון", "סיבתיות", "שונות מוסברת"],
      },
    ],
  },
  {
    id: "advanced",
    title: "השוואת מודלים",
    problem: "נתוני מכירות חודשיות לאורך שנה מראים דפוס לא-לינארי.\nחישוב ישר רגרסיה נתן r = 0.42.\n\nא. חשב את ישר הרגרסיה הלינארי.\nב. חשב את r עבור המודל הלינארי ופרש.\nג. הצע מודל לא-לינארי (ריבועי / עונתי) והסבר למה הוא מתאים.\nד. דון: מתי אקסטרפולציה (ניבוי מחוץ לטווח) מסוכנת?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "מניחים שישר רגרסיה מתאים תמיד", text: "r נמוך עם דפוס בשאריות = סימן שהקשר לא לינארי. צריך לבדוק שאריות לפני שמקבלים את המודל." },
      { title: "מנבאים הרחק מטווח הנתונים", text: "אקסטרפולציה מסוכנת -- מודל שנבנה על נתוני שנה אחת לא בהכרח תקף לניבוי 3 שנים קדימה." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- חישוב הרגרסיה הלינארית",
        coaching: "חשב ישר רגרסיה רגיל",
        prompt: "נתוני מכירות חודשיות לאורך שנה עם r=0.42. תנחה אותי לחשב את ישר הרגרסיה הלינארי. מה צריך לדעת כדי למצוא a ו-b? אל תפתור.",
        keywords: ["רגרסיה", "שיפוע", "חותך"],
        keywordHint: "ציין שיפוע וחותך",
        contextWords: ["רגרסיה", "שיפוע", "חותך", "ישר", "ממוצע", "נתונים"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- פרשנות r",
        coaching: "מה אומר r=0.42?",
        prompt: "קיבלתי r=0.42 למודל הלינארי של מכירות חודשיות. תנחה אותי לפרש את התוצאה -- האם ההתאמה טובה? מה r\u00B2 אומר? אל תפתור.",
        keywords: ["מתאם", "r\u00B2", "התאמה"],
        keywordHint: "ציין מתאם והתאמה",
        contextWords: ["מתאם", "התאמה", "לינארי", "שאריות", "r\u00B2", "פרשנות"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- מודל חלופי",
        coaching: "הצע מודל לא-לינארי",
        prompt: "r=0.42 למודל לינארי של מכירות חודשיות עם דפוס עונתי. תנחה אותי להציע מודל חלופי -- ריבועי או עונתי. למה הוא יתאים יותר? אל תפתור.",
        keywords: ["מודל", "ריבועי", "עונתי"],
        keywordHint: "ציין מודל חלופי",
        contextWords: ["מודל", "עונתי", "ריבועי", "התאמה", "לינארי", "חלופי"],
      },
      {
        phase: "ד",
        label: "שלב ד׳ -- סכנת אקסטרפולציה",
        coaching: "מתי לא ניתן לנבא?",
        prompt: "יש לי מודל המבוסס על נתוני מכירות של שנה אחת. תנחה אותי להבין מתי ניבוי מחוץ לטווח הנתונים מסוכן. מה זו אקסטרפולציה ולמה היא בעייתית? אל תפתור.",
        keywords: ["אקסטרפולציה", "ניבוי", "טווח"],
        keywordHint: "ציין אקסטרפולציה",
        contextWords: ["אקסטרפולציה", "ניבוי", "טווח", "סכנה", "מודל", "נתונים"],
      },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegressionPage() {
  const [activeId, setActiveId] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === activeId)!;
  const st = STATION[activeId];

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ background: "#F3EFE0", borderBottom: "1px solid rgba(60,54,42,0.15)", marginBottom: "2rem" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>רגרסיה לינארית עם AI</h1>
            <p style={{ color: "#6B7280", fontSize: 13, margin: "3px 0 0" }}>ישר רגרסיה, מקדם מתאם, ניבוי -- ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/statistics"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>&#8592;</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0 1.5rem" }}>
        {/* SubtopicProgress */}
        <SubtopicProgress subtopicId="statistics/regression" />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", marginTop: "1.25rem" }}>
          {TABS.map(tab => {
            const s2 = STATION[tab.id];
            const active = activeId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13,
                  border: `2px solid ${active ? s2.accentColor : "rgba(60,54,42,0.15)"}`,
                  background: active ? `rgba(${s2.glowRgb},0.1)` : "rgba(255,255,255,0.6)",
                  color: active ? s2.accentColor : "#6B7280",
                  boxShadow: active ? s2.glowShadow : "none",
                  transition: "all 0.2s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Formula Bar */}
        <FormulaBar />

        {/* Exercise Card */}
        <motion.div key={activeId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Labs */}
        {activeId === "basic"    && <RegressionLab />}
        {activeId === "medium"   && <CorrelationLab />}
        {activeId === "advanced" && <ModelCompareLab />}

        {/* LabMessage */}
        <LabMessage text="שנה את הסליידרים כדי לחקור את המודל" type="info" visible={true} />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="statistics/regression" level={activeId} />
        </div>
      </div>
    </main>
  );
}
