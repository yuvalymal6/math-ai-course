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

function BasicDiceDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מרחב מדגם -- קובייה הוגנת</p>
      <svg width="100%" viewBox="0 0 280 120" style={{ maxWidth: "100%" }}>
        {/* Sample space rectangle */}
        <rect x={10} y={10} width={260} height={95} rx={8} fill="none" stroke="#16a34a" strokeWidth={1.5} />
        <text x={25} y={28} fill="#16a34a" fontSize={13} fontWeight={700}>S</text>
        {/* 6 circles for outcomes */}
        {[0, 1, 2, 3, 4, 5].map(i => {
          const cx = 55 + i * 38;
          const cy = 62;
          const isEvent = i === 1 || i === 3 || i === 5; // even indices (representing even numbers)
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={15} fill={isEvent ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)"} stroke={isEvent ? "#16a34a" : "#94a3b8"} strokeWidth={isEvent ? 1.5 : 1} />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fill={isEvent ? "#16a34a" : "#64748b"} fontSize={10} fontWeight={600}>?</text>
            </g>
          );
        })}
        {/* Event A label */}
        <text x={140} y={100} textAnchor="middle" fill="#16a34a" fontSize={10} fontWeight={600}>A = אירוע</text>
      </svg>
    </div>
  );
}

function MediumVennDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>דיאגרמת ון -- שני אירועים</p>
      <svg width="100%" viewBox="0 0 280 160" style={{ maxWidth: "100%" }}>
        {/* Sample space rectangle */}
        <rect x={10} y={10} width={260} height={140} rx={8} fill="none" stroke="#ea580c" strokeWidth={1.5} />
        <text x={25} y={28} fill="#ea580c" fontSize={13} fontWeight={700}>S</text>
        {/* Circle A */}
        <circle cx={110} cy={85} r={48} fill="rgba(234,88,12,0.08)" stroke="#ea580c" strokeWidth={1.5} />
        <text x={78} y={80} fill="#ea580c" fontSize={13} fontWeight={700}>A</text>
        {/* Circle B */}
        <circle cx={170} cy={85} r={48} fill="rgba(234,88,12,0.08)" stroke="#ea580c" strokeWidth={1.5} strokeDasharray="5,3" />
        <text x={198} y={80} fill="#ea580c" fontSize={13} fontWeight={700}>B</text>
        {/* Intersection label */}
        <text x={140} y={90} textAnchor="middle" fill="#c2410c" fontSize={9} fontWeight={600}>A&#8745;B</text>
      </svg>
    </div>
  );
}

function AdvancedVennDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מרחב מדגם -- אירועים ומשלימים</p>
      <svg width="100%" viewBox="0 0 280 170" style={{ maxWidth: "100%" }}>
        {/* Sample space rectangle */}
        <rect x={10} y={10} width={260} height={150} rx={8} fill="none" stroke="#dc2626" strokeWidth={1.5} />
        <text x={25} y={28} fill="#dc2626" fontSize={13} fontWeight={700}>S</text>
        {/* Circle A */}
        <circle cx={115} cy={90} r={42} fill="rgba(220,38,38,0.08)" stroke="#dc2626" strokeWidth={1.5} />
        <text x={100} y={85} fill="#dc2626" fontSize={13} fontWeight={700}>A</text>
        {/* Circle B (larger, overlapping) */}
        <circle cx={175} cy={90} r={50} fill="rgba(220,38,38,0.06)" stroke="#dc2626" strokeWidth={1.2} strokeDasharray="5,3" />
        <text x={200} y={78} fill="#dc2626" fontSize={13} fontWeight={700}>B</text>
        {/* Complement region label */}
        <text x={245} y={148} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight={600} fontStyle="italic">&#256;</text>
        {/* A subset indicator */}
        <text x={135} y={105} textAnchor="middle" fill="#b91c1c" fontSize={8} fontWeight={500}>A&#8838;B</text>
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
        subjectWords={["הסתברות", "מרחב מדגם", "חיתוך", "איחוד", "משלים", "כדור"]}
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
  const [activeTab, setActiveTab] = useState<"probability" | "union" | "disjoint" | "complement" | null>(null);

  const tabs = [
    { id: "probability" as const, label: "הסתברות",        tex: "P(A)",                          color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "union" as const,       label: "איחוד",          tex: "P(A \\cup B)",                  color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "disjoint" as const,    label: "חיתוך (זרים)",   tex: "P(A \\cap B)",                  color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "complement" as const,  label: "משלים",          tex: "P(\\bar{A})",                   color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Probability */}
      {activeTab === "probability" && (
        <motion.div key="probability" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A) = \\frac{|A|}{|S|}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הסתברות = מספר התוצאות הרצויות חלקי מספר התוצאות האפשריות.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"|S|"}</InlineMath> = מספר התוצאות במרחב המדגם (כל התוצאות האפשריות).</li>
                  <li><InlineMath>{"|A|"}</InlineMath> = מספר התוצאות הרצויות (שמקיימות את האירוע).</li>
                  <li>תמיד מתקיים: <InlineMath>{"0 \\leq P(A) \\leq 1"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: בקובייה הוגנת, <InlineMath>{"|S| = 6"}</InlineMath>. אם A = מספר זוגי, אז <InlineMath>{"|A| = 3"}</InlineMath> ולכן <InlineMath>{"P(A) = \\frac{3}{6} = \\frac{1}{2}"}</InlineMath>.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Union */}
      {activeTab === "union" && (
        <motion.div key="union" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A \\cup B) = P(A) + P(B) - P(A \\cap B)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> ההסתברות ש-A או B יקרו (או שניהם).
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מחברים את שתי ההסתברויות.</li>
                  <li>מפחיתים את החיתוך כדי לא לספור אותו פעמיים.</li>
                  <li>אם A ו-B זרים: <InlineMath>{"P(A \\cap B) = 0"}</InlineMath> ואז <InlineMath>{"P(A \\cup B) = P(A) + P(B)"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימו לב: חיבור בלי הפחתה = ספירה כפולה של החיתוך!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Disjoint / Intersection */}
      {activeTab === "disjoint" && (
        <motion.div key="disjoint" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A \\cap B) = 0 \\quad \\text{(אירועים זרים)}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> אם A ו-B זרים, הם לא יכולים לקרות יחד.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אירועים זרים = <InlineMath>{"A \\cap B = \\emptyset"}</InlineMath>.</li>
                  <li>אם הם לא זרים, צריך לחשב את <InlineMath>{"P(A \\cap B)"}</InlineMath> בנפרד.</li>
                  <li>לבדוק אם זרים: האם יש תוצאה שמקיימת את שניהם?</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: &quot;זוגי&quot; ו-&quot;אי-זוגי&quot; הם זרים. &quot;זוגי&quot; ו-&quot;גדול מ-3&quot; אינם זרים (4 ו-6 מקיימים שניהם).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Complement */}
      {activeTab === "complement" && (
        <motion.div key="complement" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(\\bar{A}) = 1 - P(A)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> ההסתברות שהאירוע לא יקרה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"\\bar{A}"}</InlineMath> = המשלים של A = כל מה שלא A.</li>
                  <li>תמיד: <InlineMath>{"P(A) + P(\\bar{A}) = 1"}</InlineMath>.</li>
                  <li>שימושי במיוחד ב&quot;לפחות אחד&quot; = <InlineMath>{"1 - P(\\text{אף אחד})"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: כשהשאלה שואלת &quot;לפחות אחד&quot;, קל יותר לחשב את ההפך (אף אחד) ולהפחית מ-1.
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
    title: "הסתברות בסיסית -- קובייה הוגנת",
    problem: "מטילים קובייה הוגנת פעם אחת.\n\nא. מהו מרחב המדגם? כמה תוצאות יש?\nב. מהי ההסתברות לקבל מספר זוגי?\nג. מהי ההסתברות לקבל מספר גדול מ-4?",
    diagram: <BasicDiceDiagram />,
    pitfalls: [
      { title: "מרחב המדגם של קובייה", text: "מרחב המדגם של קובייה הוגנת הוא {1,2,3,4,5,6} -- לא לשכוח שיש 6 תוצאות." },
      { title: "מספר זוגי: {2,4,6}", text: "מספר זוגי: {2,4,6} -- 3 תוצאות מתוך 6, לא 2 מתוך 6." },
      { title: "'גדול מ-4' לא כולל 4", text: "'גדול מ-4' זה {5,6} -- לא כולל את 4 עצמו!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמטילים קובייה הוגנת פעם אחת.\nאני צריך:\n1. למצוא את מרחב המדגם\n2. לחשב הסתברות למספר זוגי\n3. לחשב הסתברות למספר גדול מ-4\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- מרחב המדגם",
        coaching: "רשום את כל התוצאות האפשריות",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמטילים קובייה הוגנת פעם אחת. תנחה אותי למצוא את מרחב המדגם. שאל אותי: מה כל התוצאות האפשריות? כמה יש? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מרחב מדגם", "קובייה", "תוצאות"],
        keywordHint: "ציין שמדובר במרחב מדגם של קובייה",
        contextWords: ["הסתברות", "קובייה", "מרחב מדגם", "זוגי", "תוצאות", "אפשריות"],
        stationWords: ["הסתברות", "מרחב מדגם", "קובייה"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- הסתברות למספר זוגי",
        coaching: "זהה את התוצאות הזוגיות וחשב",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמטילים קובייה הוגנת. תנחה אותי לחשב את ההסתברות לקבל מספר זוגי. שאל אותי: מה התוצאות הזוגיות? כמה הן? מה הנוסחה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["זוגי", "הסתברות", "נוסחה"],
        keywordHint: "ציין שמדובר בהסתברות למספר זוגי",
        contextWords: ["הסתברות", "קובייה", "מרחב מדגם", "זוגי", "תוצאות", "אפשריות"],
        stationWords: ["הסתברות", "מרחב מדגם", "קובייה"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- הסתברות לגדול מ-4",
        coaching: "זהה את התוצאות הגדולות מ-4",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמטילים קובייה הוגנת. תנחה אותי לחשב את ההסתברות לקבל מספר גדול מ-4. שאל אותי: אילו מספרים גדולים מ-4? האם 4 נכלל? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["גדול", "הסתברות", "מספר"],
        keywordHint: "ציין שמדובר בהסתברות למספר גדול מ-4",
        contextWords: ["הסתברות", "קובייה", "מרחב מדגם", "זוגי", "תוצאות", "אפשריות"],
        stationWords: ["הסתברות", "מרחב מדגם", "קובייה"],
      },
    ],
  },
  {
    id: "medium",
    title: "הסתברות בקלפים -- איחוד וחיתוך",
    problem: "מחפיסת קלפים רגילה (52 קלפים) שולפים קלף אחד באקראי.\nA = הקלף הוא לב (\u2665), B = הקלף הוא דמות (J, Q, K).\n\nא. חשבו את P(A) ואת P(B).\nב. חשבו את P(A\u2229B) -- ההסתברות שהקלף הוא לב וגם דמות.\nג. חשבו את P(A\u222AB) -- ההסתברות שהקלף הוא לב או דמות.\nד. האם A ו-B אירועים זרים? הסבירו.",
    diagram: <MediumVennDiagram />,
    pitfalls: [
      { title: "ספירה נכונה", text: "בחפיסה יש 13 לבבות ו-12 דמויות (3 בכל סוג \u00D7 4 סוגים) -- ודאו שספרתם נכון." },
      { title: "נוסחת האיחוד", text: "P(A\u222AB) \u2260 P(A) + P(B) כי יש חפיפה! צריך להפחית P(A\u2229B)." },
      { title: "לא זרים!", text: "A ו-B לא זרים -- יש דמויות שהן לבבות (J\u2665, Q\u2665, K\u2665)." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמחפיסת קלפים רגילה (52 קלפים) שולפים קלף אחד באקראי.\nA = לב, B = דמות (J, Q, K).\nאני צריך:\n1. לחשב P(A) ו-P(B)\n2. לחשב P(A\u2229B) -- חיתוך\n3. לחשב P(A\u222AB) -- איחוד\n4. לבדוק אם A ו-B זרים\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- P(A) ו-P(B)",
        coaching: "ספרו כמה לבבות וכמה דמויות בחפיסה",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמחפיסת 52 קלפים שולפים קלף. A = לב, B = דמות. תנחה אותי לחשב P(A) ו-P(B). שאל: כמה לבבות יש? כמה דמויות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["קלפים", "לב", "דמות"],
        keywordHint: "ציין שמדובר בקלפים -- לבבות ודמויות",
        contextWords: ["איחוד", "חיתוך", "קלפים", "זרים", "לב", "דמות"],
        stationWords: ["איחוד", "חיתוך", "קלפים"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- חיתוך P(A\u2229B)",
        coaching: "כמה קלפים הם גם לב וגם דמות?",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nחישבתי P(A) ו-P(B). עכשיו אני צריך P(A\u2229B) -- קלף שהוא גם לב וגם דמות. תנחה אותי: מה הקלפים שמקיימים את שני התנאים? כמה הם? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חיתוך", "גם", "לב"],
        keywordHint: "ציין שמדובר בחיתוך שני אירועים",
        contextWords: ["איחוד", "חיתוך", "קלפים", "זרים", "לב", "דמות"],
        stationWords: ["איחוד", "חיתוך", "קלפים"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- איחוד P(A\u222AB)",
        coaching: "השתמש בנוסחת האיחוד",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nחישבתי P(A), P(B) ו-P(A\u2229B). עכשיו אני צריך P(A\u222AB). תנחה אותי: מה הנוסחה? למה לא מספיק לחבר P(A)+P(B)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["איחוד", "נוסחה", "חפיפה"],
        keywordHint: "ציין שצריך נוסחת איחוד",
        contextWords: ["איחוד", "חיתוך", "קלפים", "זרים", "לב", "דמות"],
        stationWords: ["איחוד", "חיתוך", "קלפים"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- האם זרים?",
        coaching: "בדקו אם יש קלף שמקיים את שני האירועים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nאני צריך לבדוק אם A (לב) ו-B (דמות) הם אירועים זרים. תנחה אותי: מה הגדרת אירועים זרים? האם יש קלף שהוא גם לב וגם דמות? מה המשמעות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["זרים", "חיתוך", "קלף"],
        keywordHint: "ציין שצריך לבדוק אם האירועים זרים",
        contextWords: ["איחוד", "חיתוך", "קלפים", "זרים", "לב", "דמות"],
        stationWords: ["איחוד", "חיתוך", "קלפים"],
      },
    ],
  },
  {
    id: "advanced",
    title: "הסתברות -- משלים ושליפות עם החזרה",
    problem: "בכד יש כדורים: 5 אדומים, 3 כחולים ו-2 ירוקים. שולפים כדור אחד באקראי.\nA = הכדור אדום, B = הכדור לא ירוק.\n\nא. חשבו את P(A), P(B), P(\u0100).\nב. חשבו את P(A\u2229B) ואת P(A\u222AB).\nג. שולפים שני כדורים עם החזרה -- מהי ההסתברות ששניהם אדומים?\nד. שולפים שני כדורים עם החזרה -- מהי ההסתברות שלפחות אחד אדום?",
    diagram: <AdvancedVennDiagram />,
    pitfalls: [
      { title: "B = לא ירוק", text: "B = לא ירוק = אדום או כחול = 8 מתוך 10 -- אל תשכחו לספור את כל מה שלא ירוק." },
      { title: "A\u2286B", text: "P(A\u2229B) = P(A) כי כל כדור אדום הוא גם לא ירוק -- A\u2286B." },
      { title: "לפחות אחד = משלים", text: "לפחות אחד אדום = 1 \u2212 P(אף אחד לא אדום) = 1 \u2212 (1/2)\u00B2 -- השתמשו במשלים!" },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- P(A), P(B), P(\u0100)",
        coaching: "ספרו את הכדורים וחשבו הסתברויות בסיסיות",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבכד 5 אדומים, 3 כחולים, 2 ירוקים. A = אדום, B = לא ירוק. תנחה אותי לחשב P(A), P(B) ו-P(\u0100). שאל: כמה כדורים בסה\"כ? מה המשלים של A? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["הסתברות", "כדור", "משלים"],
        keywordHint: "ציין שמדובר בהסתברות ומשלים",
        contextWords: ["משלים", "עם החזרה", "לפחות", "כדור", "הסתברות", "אדום"],
        stationWords: ["הסתברות", "משלים", "כדור"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- חיתוך ואיחוד",
        coaching: "שימו לב: A נכלל ב-B",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nA = אדום, B = לא ירוק. חישבתי P(A) ו-P(B). תנחה אותי לחשב P(A\u2229B) ו-P(A\u222AB). שאל: האם כל כדור אדום הוא גם לא ירוק? מה זה אומר על הקשר בין A ל-B? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חיתוך", "איחוד", "נכלל"],
        keywordHint: "ציין שA נכלל ב-B",
        contextWords: ["משלים", "עם החזרה", "לפחות", "כדור", "הסתברות", "אדום"],
        stationWords: ["הסתברות", "משלים", "כדור"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- שניהם אדומים עם החזרה",
        coaching: "עם החזרה = ניסויים בלתי תלויים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nשולפים שני כדורים עם החזרה מכד עם 5 אדומים, 3 כחולים, 2 ירוקים. תנחה אותי לחשב את ההסתברות ששניהם אדומים. שאל: מה המשמעות של 'עם החזרה'? למה מכפילים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["החזרה", "כפל", "אדום"],
        keywordHint: "ציין שמדובר בשליפה עם החזרה",
        contextWords: ["משלים", "עם החזרה", "לפחות", "כדור", "הסתברות", "אדום"],
        stationWords: ["הסתברות", "משלים", "כדור"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- לפחות אחד אדום",
        coaching: "השתמשו במשלים: 1 - P(אף אחד לא אדום)",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nשולפים שני כדורים עם החזרה. תנחה אותי לחשב את ההסתברות שלפחות אחד אדום. שאל: למה עדיף לחשב דרך המשלים? מה ההפך של 'לפחות אחד אדום'? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["לפחות", "משלים", "הפך"],
        keywordHint: "ציין שצריך להשתמש במשלים",
        contextWords: ["משלים", "עם החזרה", "לפחות", "כדור", "הסתברות", "אדום"],
        stationWords: ["הסתברות", "משלים", "כדור"],
      },
    ],
  },
];

// ─── Probability Lab ─────────────────────────────────────────────────────────

function ProbabilityLab() {
  const [red, setRed]   = useState(5);
  const [blue, setBlue] = useState(3);
  const green = 2;
  const total = red + blue + green;

  const pRed   = red / total;
  const pBlue  = blue / total;
  const pGreen = green / total;
  const pNotGreen = (red + blue) / total;
  const pRedOrBlue = pRed + pBlue; // disjoint so no subtraction needed

  // Generate ball positions in a jar-like layout
  const allBalls: { cx: number; cy: number; color: string }[] = [];
  const cols = 5;
  const ballR = 10;
  const gapX = 28;
  const gapY = 26;
  const startX = 60;
  const startY = 30;

  for (let i = 0; i < red; i++) {
    const row = Math.floor(allBalls.length / cols);
    const col = allBalls.length % cols;
    allBalls.push({ cx: startX + col * gapX, cy: startY + row * gapY, color: "#dc2626" });
  }
  for (let i = 0; i < blue; i++) {
    const row = Math.floor(allBalls.length / cols);
    const col = allBalls.length % cols;
    allBalls.push({ cx: startX + col * gapX, cy: startY + row * gapY, color: "#2563eb" });
  }
  for (let i = 0; i < green; i++) {
    const row = Math.floor(allBalls.length / cols);
    const col = allBalls.length % cols;
    allBalls.push({ cx: startX + col * gapX, cy: startY + row * gapY, color: "#16a34a" });
  }

  const svgH = startY + Math.ceil(total / cols) * gapY + 15;
  const isDefault = red === 5 && blue === 3;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת הסתברות</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />סה&quot;כ: {total} כדורים</span>
      </div>

      {/* SVG Jar */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 220 ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Jar outline */}
          <rect x={38} y={10} width={145} height={svgH - 18} rx={16} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,3" />
          {/* Balls */}
          {allBalls.map((b, i) => (
            <g key={i}>
              <circle cx={b.cx} cy={b.cy} r={ballR} fill={b.color} opacity={0.85} />
              <circle cx={b.cx - 3} cy={b.cy - 3} r={2.5} fill="rgba(255,255,255,0.5)" />
            </g>
          ))}
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>כדורים אדומים</span>
            <span style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{red}</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={red}
            onChange={e => setRed(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>כדורים כחולים</span>
            <span style={{ fontFamily: "monospace", color: "#2563eb", fontWeight: 700 }}>{blue}</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={blue}
            onChange={e => setBlue(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#2563eb" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(אדום)</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{pRed.toFixed(3)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(כחול)</p>
          <p style={{ fontFamily: "monospace", color: "#2563eb", fontWeight: 700 }}>{pBlue.toFixed(3)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(לא ירוק)</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{pNotGreen.toFixed(3)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>סה&quot;כ כדורים</p>
          <p style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{total}</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#dc2626", fontWeight: 600 }}>P(אדום) = {red}/{total}</span> &nbsp;|&nbsp;
        <span style={{ color: "#2563eb", fontWeight: 600 }}>P(כחול) = {blue}/{total}</span> &nbsp;|&nbsp;
        <span style={{ color: "#16a34a", fontWeight: 600 }}>P(ירוק) = {green}/{total}</span> &nbsp;|&nbsp;
        <span style={{ color: "#ea580c", fontWeight: 600 }}>P(אדום\u222Aכחול) = {(red + blue)}/{total}</span>
      </div>

      <LabMessage text="שנו את מספר הכדורים וראו כיצד ההסתברויות משתנות" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BasicProbabilityPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>הסתברות בסיסית עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מרחב מדגם, אירועים פשוטים, חיתוך, איחוד ומשלים</p>
          </div>
          <Link
            href="/3u/topic/grade10/probability"
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

        <SubtopicProgress subtopicId="3u/grade10/probability/basic" />

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
        <ProbabilityLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/probability/basic" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
