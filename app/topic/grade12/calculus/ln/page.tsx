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
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  title: string;
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל", badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני", badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם", badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic" as const,    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium" as const,   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── Silent SVG Diagrams ─────────────────────────────────────────────────────

function LnCurveBasic() {
  const W = 260, H = 150;
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = 0.06 + (i / 80) * 4.5;
    const y = Math.log(t);
    const sx = 70 + (t / 4.5) * 175;
    const sy = 100 - y * 30;
    if (sy > 10 && sy < 140) pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={65} y1={100} x2={250} y2={100} stroke="#94a3b8" strokeWidth={1} />
      <line x1={70} y1={10} x2={70} y2={140} stroke="#94a3b8" strokeWidth={1} />
      <line x1={70} y1={10} x2={70} y2={140} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <polyline points={pts.join(" ")} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={109} cy={100} r={4} fill="#a78bfa" />
      <text x={55} y={105} textAnchor="end" fontSize={10} fill="#64748b">O</text>
      <text x={252} y={105} fontSize={10} fill="#64748b">x</text>
      <text x={72} y={15} fontSize={10} fill="#64748b">y</text>
      <text x={109} y={115} textAnchor="middle" fontSize={9} fill="#a78bfa">?</text>
      <text x={200} y={50} fontSize={10} fill="#16a34a" fontStyle="italic">f</text>
    </svg>
  );
}

function LnCurveMedium() {
  const W = 260, H = 150;
  const pts: string[] = [];
  for (let i = 1; i <= 80; i++) {
    const x = 0.15 + (i / 80) * 4.5;
    const y = x * x - 8 * Math.log(x);
    const sx = 55 + (x / 4.5) * 190;
    const sy = 130 - (y + 2) * 10;
    if (sy > 5 && sy < 145) pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  const minX = 2;
  const minY = 4 - 8 * Math.log(2);
  const msx = 55 + (minX / 4.5) * 190;
  const msy = 130 - (minY + 2) * 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={50} y1={110} x2={250} y2={110} stroke="#94a3b8" strokeWidth={1} />
      <line x1={55} y1={5} x2={55} y2={145} stroke="#94a3b8" strokeWidth={1} />
      <line x1={55} y1={5} x2={55} y2={145} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <polyline points={pts.join(" ")} fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={msx} cy={msy} r={4} fill="#a78bfa" />
      <text x={msx} y={msy + 14} textAnchor="middle" fontSize={9} fill="#a78bfa">?</text>
      <text x={200} y={25} fontSize={10} fill="#ea580c" fontStyle="italic">f</text>
      <text x={40} y={115} textAnchor="end" fontSize={10} fill="#64748b">O</text>
    </svg>
  );
}

function LnCurveAdvanced() {
  const W = 260, H = 150;
  const pts: string[] = [];
  const asx = 80;
  for (let i = 0; i <= 80; i++) {
    const t = 0.04 + (i / 80) * 4;
    const y = Math.log(t);
    const sx = asx + 5 + (t / 4) * 160;
    const sy = 95 - y * 28;
    if (sy > 8 && sy < 142) pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  const zeroX = asx + 5 + (1 / 4) * 160;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={50} y1={95} x2={250} y2={95} stroke="#94a3b8" strokeWidth={1} />
      <line x1={55} y1={8} x2={55} y2={142} stroke="#94a3b8" strokeWidth={1} />
      <line x1={asx} y1={8} x2={asx} y2={142} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
      <polyline points={pts.join(" ")} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={zeroX} cy={95} r={4} fill="#a78bfa" />
      <text x={zeroX} y={110} textAnchor="middle" fontSize={9} fill="#a78bfa">?</text>
      <text x={asx - 3} y={142} textAnchor="middle" fontSize={9} fill="#f59e0b">x=?</text>
      <text x={210} y={40} fontSize={10} fill="#dc2626" fontStyle="italic">f</text>
      <text x={55} y={8} fontSize={9} fill="#64748b">a</text>
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
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);
  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };
  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <Lock size={14} color="#6B7280" />
      <div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div>
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
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}><span>ציון הפרומפט</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div>
          </div>
        )}
        {!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>}
        {result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#9888;&#65039; {result.hint}</motion.div>}
        {result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>&#128161; {result.hint}</motion.div>}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; פרומפט מצוין! ציון: <strong>{result!.score}/100</strong></div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button>
          </motion.div>
        )}
        {result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;
  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.6)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <Lock size={14} color="#6B7280" /><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} -- {step.label}</span>
    </div>
  );
  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי -- כתוב לפחות 20 תווים." }); return; }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>
        {passed ? <CheckCircle2 size={14} color="#16a34a" /> : <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" readOnly={passed} onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.85)", border: `1px solid ${passed ? "rgba(22,163,74,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}><span>ציון</span><span style={{ fontWeight: 800 }}>{result.score}/100</span></div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} /></div>
          </div>
        )}
        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "⚠️" : "💡"} {result.hint}
          </motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#14532d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}</button>
          </motion.div>
        )}
        {!passed && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.8)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>&#129302; בדיקת AI מדומה</button>}
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
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>&#10003; סיימתי סעיף זה</button>
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
        <TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} borderRgb={borderRgb} />
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
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["לוגריתם", "ln", "נגזרת", "תחום", "אסימפטוטה", "שרשרת", "פרמטר"]} />
      {steps.map((s, i) => (
        <TutorStepAdvanced key={i} step={s} locked={!masterPassed || i > unlockedIdx} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} />
      ))}
    </div>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: s.glowShadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.6)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; השאלה</div>
          <button onClick={() => { navigator.clipboard.writeText(ex.problem); setCopiedProblem(true); setTimeout(() => setCopiedProblem(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#16a34a" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}{copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>&#9888;&#65039; שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.25)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#b91c1c", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; מדריך הפרומפטים</div>
        {ex.id === "basic" && <LadderBase steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── FormulaBar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"deriv" | "chain" | "props" | "integral" | null>(null);
  const tabs = [
    { id: "deriv" as const, label: "נגזרת ln", tex: "(\\ln x)' = \\frac{1}{x}", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "chain" as const, label: "כלל שרשרת", tex: "(\\ln u)' = \\frac{u'}{u}", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "props" as const, label: "תכונות", tex: "\\ln(ab) = \\ln a + \\ln b", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "integral" as const, label: "אינטגרל", tex: "\\int \\frac{1}{x}dx = \\ln|x|+C", color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.15)"}`, background: isActive ? `${t.color}15` : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>
      {activeTab === "deriv" && (
        <motion.div key="deriv" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"(\\ln x)' = \\frac{1}{x}, \\quad x > 0"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הנגזרת של לוגריתם טבעי היא ההופכי של x.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מוגדרת רק עבור <InlineMath>{"x > 0"}</InlineMath>.</li>
                  <li>הנגזרת תמיד חיובית בתחום ההגדרה.</li>
                  <li>כש-<InlineMath>{"x \\to 0^+"}</InlineMath> הנגזרת שואפת לאינסוף.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "chain" && (
        <motion.div key="chain" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"(\\ln u)' = \\frac{u'}{u}"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כלל שרשרת ללוגריתם:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>גזרו את הביטוי הפנימי <InlineMath>{"u(x)"}</InlineMath>.</li>
                  <li>חלקו את הנגזרת בביטוי הפנימי.</li>
                  <li>התוצאה: <InlineMath>{"\\frac{u'}{u}"}</InlineMath> — נגזרת הפנימי חלקי הפנימי.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>&#128161; טיפ: אל תשכחו לגזור את <InlineMath>{"u'"}</InlineMath> — זו הטעות הנפוצה ביותר!</div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "props" && (
        <motion.div key="props" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\ln(ab) = \\ln a + \\ln b \\quad \\ln\\frac{a}{b} = \\ln a - \\ln b \\quad \\ln a^n = n\\ln a"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> תכונות בסיסיות של לוגריתם:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"\\ln 1 = 0"}</InlineMath> — כי <InlineMath>{"e^0 = 1"}</InlineMath>.</li>
                  <li><InlineMath>{"\\ln e = 1"}</InlineMath> — כי <InlineMath>{"e^1 = e"}</InlineMath>.</li>
                  <li><InlineMath>{"e^{\\ln x} = x"}</InlineMath> — פונקציות הופכיות.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {activeTab === "integral" && (
        <motion.div key="integral" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\int \\frac{1}{x}dx = \\ln|x| + C"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> האינטגרל של 1/x:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>שימו לב: ערך מוחלט <InlineMath>{"|x|"}</InlineMath> כי הלוגריתם מוגדר רק לחיוביים.</li>
                  <li>אל תשכחו +C באינטגרל לא מסוים!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>&#128161; בבגרות: שכחת +C עולה נקודות!</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── LnLab ───────────────────────────────────────────────────────────────────

function LnLab() {
  const [aInt, setAInt] = useState(10);
  const [bInt, setBInt] = useState(0);
  const a = aInt / 10;
  const b = bInt;
  const asymptote = a !== 0 ? -b / a : 0;
  const xStart = asymptote + 0.05;
  const xEnd = asymptote + 7;
  const yMin = -3, yMax = 3;
  const W = 320, H = 200;
  const toSX = (x: number) => 40 + ((x - xStart) / (xEnd - xStart)) * 265;
  const toSY = (y: number) => 170 - ((y - yMin) / (yMax - yMin)) * 150;
  const pts: string[] = [];
  for (let i = 0; i <= 140; i++) {
    const x = xStart + (i / 140) * (xEnd - xStart);
    const arg = a * x + b;
    if (arg <= 0) continue;
    const y = Math.log(arg);
    if (y < yMin || y > yMax) continue;
    pts.push(`${toSX(x).toFixed(1)},${toSY(y).toFixed(1)}`);
  }
  const axX = toSX(asymptote);
  const xIntercept = a !== 0 ? (1 - b) / a : null;
  const xInterceptSX = xIntercept !== null && xIntercept > xStart && xIntercept < xEnd ? toSX(xIntercept) : null;
  const changed = aInt !== 10 || bInt !== 0;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת ln(ax + b)</h3>
        {changed && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />משתנה!</span>}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        <line x1={35} y1={toSY(0)} x2={W - 8} y2={toSY(0)} stroke="#94a3b8" strokeWidth={1} />
        <line x1={40} y1={10} x2={40} y2={H - 8} stroke="#94a3b8" strokeWidth={1} />
        {axX > 35 && axX < W - 5 && <line x1={axX} y1={8} x2={axX} y2={H - 8} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5,3" />}
        {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
        {xInterceptSX !== null && <circle cx={xInterceptSX} cy={toSY(0)} r={3.5} fill="#a78bfa" />}
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 8px", marginBottom: 20 }}>
        {([
          { label: "a", val: a.toFixed(1), set: setAInt, min: 2, max: 30, step: 1, value: aInt, color: "#22c55e" },
          { label: "b", val: b.toString(), set: setBInt, min: -6, max: 6, step: 1, value: bInt, color: "#f59e0b" },
        ] as const).map(({ label, val, set, min, max, step, value, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              <span>{label}</span><span style={{ color, fontWeight: 700 }}>{val}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={e => (set as (v: number) => void)(Number(e.target.value))}
              style={{ width: "100%", accentColor: color } as React.CSSProperties} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        <div style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
          <div style={{ color: "#64748b", marginBottom: 4 }}>אסימפטוטה</div>
          <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: 11 }}>x = {asymptote.toFixed(2)}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
          <div style={{ color: "#64748b", marginBottom: 4 }}>חיתוך x</div>
          <div style={{ fontWeight: 700, color: "#a78bfa", fontSize: 11 }}>{xIntercept !== null ? `x = ${xIntercept.toFixed(2)}` : "—"}</div>
        </div>
        <div style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
          <div style={{ color: "#64748b", marginBottom: 4 }}>תחום</div>
          <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 11 }}>x &gt; {asymptote.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#f59e0b", fontWeight: 600 }}>אסימפטוטה</span> = −b/a &nbsp;|&nbsp; <span style={{ color: "#a78bfa", fontWeight: 600 }}>חיתוך x</span>: ax+b=1 &rarr; x=(1−b)/a
      </div>

      <LabMessage text="שנה את הסליידרים כדי לראות איך האסימפטוטה זזה!" type="success" visible={changed} />
    </section>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "תחום הגדרה ונגזרת",
    problem: "נתונה הפונקציה f(x) = ln(2x − 6).\n\nא. מצא את תחום ההגדרה של f.\nב. מצא את f′(x) בעזרת כלל שרשרת.\nג. חשב את f′(4) ופרש את המשמעות הגיאומטרית.",
    diagram: <LnCurveBasic />,
    pitfalls: [
      { title: "שוכחים שהביטוי בתוך ln חייב להיות חיובי ממש", text: "הדרישה: 2x − 6 > 0, לא ≥ 0. לוגריתם של אפס לא מוגדר." },
      { title: "שוכחים לגזור את הביטוי הפנימי בכלל שרשרת", text: "(ln u)′ = u′/u. צריך לגזור גם את הביטוי הפנימי (2x−6)′ ולהכפיל במונה." },
      { title: "מבלבלים בין ערך הנגזרת למשמעות גיאומטרית", text: "f′(4) הוא שיפוע המשיק בנקודה, לא ערך הפונקציה. אל תבלבלו בין f(4) ל-f′(4)." },
    ],
    goldenPrompt: "אני תלמיד כיתה יב’. נתונה f(x) = ln(2x − 6).\nאני צריך:\n1. למצוא את תחום ההגדרה\n2. לגזור בכלל שרשרת\n3. להציב ולפרש גיאומטרית\n\nאל תפתור עבורי — שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "א", label: "שלב א’ — תחום הגדרה", coaching: "פתור אי-שוויון 2x−6>0", prompt: "אני תלמיד כיתה יב’. נתונה f(x) = ln(2x − 6). תנחה אותי: מה הדרישה לתחום הגדרה של ln? איזה אי-שוויון צריך לפתור? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["תחום", "ln", "אי-שוויון"], keywordHint: "ציין שמדובר בתחום הגדרה", contextWords: ["תחום", "ln", "אי-שוויון", "חיובי", "לוגריתם", "מוגדר"] },
      { phase: "ב", label: "שלב ב’ — נגזרת בכלל שרשרת", coaching: "גזור ביטוי פנימי וחלק", prompt: "אני תלמיד כיתה יב’. f(x) = ln(2x − 6). תנחה אותי לחשב את f′(x) בעזרת כלל שרשרת. מה הביטוי הפנימי? מה הנגזרת שלו? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["נגזרת", "שרשרת", "פנימי"], keywordHint: "ציין שמדובר בנגזרת וכלל שרשרת", contextWords: ["נגזרת", "שרשרת", "פנימי", "ln", "u′", "ביטוי"] },
      { phase: "ג", label: "שלב ג’ — ערך הנגזרת בנקודה", coaching: "הצב ופרש גיאומטרית", prompt: "אני תלמיד כיתה יב’. מצאתי את f′(x) של f(x) = ln(2x − 6). תנחה אותי להציב x=4 בנגזרת. מה המשמעות הגיאומטרית של הערך הזה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["הצב", "נגזרת", "שיפוע"], keywordHint: "ציין שצריך להציב ולפרש", contextWords: ["הצב", "נגזרת", "שיפוע", "משיק", "גיאומטרית", "נקודה"] },
    ],
  },
  {
    id: "medium",
    title: "קיצון ומונוטוניות",
    problem: "נתונה הפונקציה f(x) = x² − 8ln(x).\n\nא. מצא את תחום ההגדרה והאסימפטוטה האנכית.\nב. חשב את f′(x) ומצא נקודות קיצון.\nג. קבע תחומי עלייה וירידה.\nד. סווג את נקודת הקיצון באמצעות f′′(x).",
    diagram: <LnCurveMedium />,
    pitfalls: [
      { title: "שוכחים שהנגזרת של ln(x) היא 1/x ולא 1", text: "נגזרת (x²)′ = 2x ונגזרת (ln x)′ = 1/x. אל תבלבלו ביניהם!" },
      { title: "לא לחלק ב-x לפני שבודקים תחום", text: "כשפותרים f′(x)=0 ומכפילים, חייבים לוודא שהפתרון בתחום ההגדרה. כאן x>0." },
      { title: "מבלבלים בין סיווג בנגזרת שנייה לסיווג בטבלת סימנים", text: "f′′(x) > 0 → מינימום. f′′(x) < 0 → מקסימום. אל תחליפו את השיטות!" },
    ],
    goldenPrompt: "אני תלמיד כיתה יב’. נתונה f(x) = x² − 8ln(x).\nאני צריך:\n1. למצוא תחום הגדרה ואסימפטוטה\n2. לגזור ולמצוא נקודות קיצון\n3. לקבוע תחומי עלייה/ירידה\n4. לסווג בנגזרת שנייה\n\nאל תפתור עבורי — שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      { phase: "א", label: "שלב א’ — תחום ואסימפטוטה", coaching: "מצא איפה ln(x) מוגדר", prompt: "אני תלמיד כיתה יב’. f(x) = x² − 8ln(x). תנחה אותי: מה תחום ההגדרה של ln(x)? האם יש אסימפטוטה אנכית? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["תחום", "ln", "אסימפטוטה"], keywordHint: "ציין תחום ואסימפטוטה", contextWords: ["תחום", "ln", "אסימפטוטה", "אנכית", "מוגדר", "x"] },
      { phase: "ב", label: "שלב ב’ — נגזרת ונקודות קיצון", coaching: "גזור כל איבר בנפרד והשווה ל-0", prompt: "אני תלמיד כיתה יב’. f(x) = x² − 8ln(x). תנחה אותי לחשב את f′(x). איך גוזרים כל איבר? איך מוצאים איפה f′(x)=0? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["נגזרת", "קיצון", "f′"], keywordHint: "ציין נגזרת וקיצון", contextWords: ["נגזרת", "קיצון", "f′", "איבר", "גזור", "השווה"] },
      { phase: "ג", label: "שלב ג’ — תחומי עלייה וירידה", coaching: "בדוק סימן f′ בתחומים", prompt: "אני תלמיד כיתה יב’. מצאתי את נקודת הקיצון של f(x) = x² − 8ln(x). תנחה אותי: איך קובעים איפה הפונקציה עולה/יורדת? איך בודקים סימן f′? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["עלייה", "ירידה", "סימן"], keywordHint: "ציין תחומי מונוטוניות", contextWords: ["עלייה", "ירידה", "סימן", "מונוטוניות", "f′", "תחום"] },
      { phase: "ד", label: "שלב ד’ — סיווג הקיצון", coaching: "חשב f′′ וקבע", prompt: "אני תלמיד כיתה יב’. מצאתי נקודת קיצון של f(x) = x² − 8ln(x). תנחה אותי: איך מסווגים אם זה מקסימום או מינימום? איך משתמשים ב-f′′(x) לסיווג? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["סיווג", "f′′", "קיצון"], keywordHint: "ציין סיווג בנגזרת שנייה", contextWords: ["סיווג", "f′′", "נגזרת שנייה", "מקסימום", "מינימום", "קיצון"] },
    ],
  },
  {
    id: "advanced",
    title: "חקירת פרמטר",
    problem: "נתונה הפונקציה f(x) = ln(ax − 4).\nידוע שהפונקציה עוברת בנקודה (3, 0).\n\nא. מצא את ערך הפרמטר a.\nב. מצא את תחום ההגדרה והאסימפטוטה.\nג. חשב את f′(x) ומצא את שיפוע המשיק בנקודה (3, 0).\nד. רשום את משוואת המשיק בנקודה זו.",
    diagram: <LnCurveAdvanced />,
    pitfalls: [
      { title: "שוכחים ש ln(1) = 0 הוא המפתח למציאת a", text: "אם הפונקציה עוברת ב-(3,0) אז f(3)=0 כלומר ln(3a−4)=0, כלומר 3a−4=1." },
      { title: "לא בודקים תחום אחרי מציאת a", text: "אחרי שמוצאים a, חייבים לוודא שהתחום הוגדר כ-ax−4>0 ולבדוק שהנקודה בתחום." },
      { title: "מבלבלים בין שיפוע למשוואת משיק", text: "שיפוע = f′(3). משוואת משיק: y − f(3) = f′(3)(x − 3). אל תשכחו ש-f(3)=0 במקרה הזה." },
    ],
    goldenPrompt: "",
    steps: [
      { phase: "א", label: "שלב א’ — מצא את a", coaching: "השתמש ב-f(3)=0 ו-ln(1)=0", prompt: "אני תלמיד כיתה יב’. f(x) = ln(ax − 4) עוברת ב-(3,0). תנחה אותי: אם f(3)=0, מה זה אומר על הביטוי שבתוך ln? איך מוצאים a? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["פרמטר", "הצבה", "ln"], keywordHint: "ציין שצריך למצוא את הפרמטר", contextWords: ["פרמטר", "הצבה", "ln", "נקודה", "a", "משוואה"] },
      { phase: "ב", label: "שלב ב’ — תחום ואסימפטוטה", coaching: "בדוק ax−4>0 עם ה-a שמצאת", prompt: "אני תלמיד כיתה יב’. מצאתי את a עבור f(x) = ln(ax − 4). תנחה אותי: מה תחום ההגדרה עם a שמצאתי? איפה האסימפטוטה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["תחום", "אסימפטוטה", "a"], keywordHint: "ציין תחום ואסימפטוטה", contextWords: ["תחום", "אסימפטוטה", "אנכית", "a", "הגדרה", "פרמטר"] },
      { phase: "ג", label: "שלב ג’ — שיפוע המשיק", coaching: "גזור בכלל שרשרת והצב", prompt: "אני תלמיד כיתה יב’. f(x) = ln(ax − 4) עם a שמצאתי. תנחה אותי לחשב f′(x) בכלל שרשרת ולהציב x=3 למציאת השיפוע. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["שיפוע", "נגזרת", "שרשרת"], keywordHint: "ציין שיפוע ונגזרת", contextWords: ["שיפוע", "נגזרת", "שרשרת", "הצב", "f′", "משיק"] },
      { phase: "ד", label: "שלב ד’ — משוואת המשיק", coaching: "השתמש ב-y−y₀=m(x−x₀)", prompt: "אני תלמיד כיתה יב’. ידוע f(3)=0 והשיפוע f′(3). תנחה אותי לרשום את משוואת המשיק בנקודה (3,0). איזו נוסחה מתאימה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.", keywords: ["משיק", "משוואה", "נקודה"], keywordHint: "ציין משוואת המשיק", contextWords: ["משיק", "משוואה", "נקודה", "שיפוע", "y", "נוסחה"] },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LnPage() {
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
        textarea:focus, input[type="text"]:focus { outline: none !important; border-color: rgba(var(--lvl-rgb), 0.65) !important; box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important; }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important; }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>פונקציות לוגריתמיות ln x עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>תחום הגדרה • נגזרת • חקירה • אסימפטוטות</p>
          </div>
          <Link href="/topic/grade12/calculus"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}>
            <span style={{ fontSize: 16 }}>{"←"}</span>חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="grade12/calculus/ln" />

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

        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        <LnLab />

        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="grade12/calculus/ln" level={selectedLevel} />
        </div>
      </div>
    </main>
  );
}
