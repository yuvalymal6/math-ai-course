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

// ─── Silent SVG Diagrams ─────────────────────────────────────────────────────

function BellCurveBasic() {
  const w = 260, h = 160, cx = 130, cy = 140;
  const curve = `M 20,${cy} C 50,${cy} 70,30 ${cx},28 C 190,30 210,${cy} 240,${cy}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <path d={`M ${cx},${cy} C 160,${cy} 170,60 ${cx + 40},50 L ${cx + 40},${cy} Z`} fill="#16a34a" fillOpacity={0.15} />
      <path d={curve} fill="none" stroke="#16a34a" strokeWidth={2.5} />
      <line x1={10} y1={cy} x2={250} y2={cy} stroke="#94a3b8" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={cx} y2={24} stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" />
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fill="#1e293b" fontWeight={700}>μ</text>
      <text x={cx + 55} y={cy + 14} textAnchor="middle" fontSize={11} fill="#64748b">μ+σ</text>
      <text x={cx - 55} y={cy + 14} textAnchor="middle" fontSize={11} fill="#64748b">μ−σ</text>
    </svg>
  );
}

function BellCurveMedium() {
  const w = 260, h = 160, cx = 130, cy = 140;
  const curve = `M 20,${cy} C 50,${cy} 70,30 ${cx},28 C 190,30 210,${cy} 240,${cy}`;
  const z1x = 85, z2x = 185;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <path d={`M ${z1x},${cy} C ${z1x + 15},${cy} ${z1x + 20},55 ${cx},28 C ${cx + 20},55 ${z2x - 15},${cy} ${z2x},${cy} Z`} fill="#ea580c" fillOpacity={0.15} />
      <path d={curve} fill="none" stroke="#ea580c" strokeWidth={2.5} />
      <line x1={10} y1={cy} x2={250} y2={cy} stroke="#94a3b8" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={cx} y2={24} stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={z1x} y1={cy} x2={z1x} y2={70} stroke="#ea580c" strokeWidth={1.5} strokeDasharray="4,3" />
      <line x1={z2x} y1={cy} x2={z2x} y2={70} stroke="#ea580c" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fill="#1e293b" fontWeight={700}>μ</text>
      <text x={z1x} y={cy + 14} textAnchor="middle" fontSize={11} fill="#ea580c" fontWeight={600}>z&#x2081;</text>
      <text x={z2x} y={cy + 14} textAnchor="middle" fontSize={11} fill="#ea580c" fontWeight={600}>z&#x2082;</text>
    </svg>
  );
}

function BellCurveAdvanced() {
  const w = 280, h = 160, cy = 140;
  const cx1 = 110, cx2 = 170;
  const curve1 = `M 10,${cy} C 40,${cy} 60,30 ${cx1},28 C 160,30 180,${cy} 210,${cy}`;
  const curve2 = `M 70,${cy} C 100,${cy} 120,30 ${cx2},28 C 220,30 240,${cy} 270,${cy}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      <path d={curve1} fill="#dc2626" fillOpacity={0.06} stroke="#dc2626" strokeWidth={2.5} />
      <path d={curve2} fill="#7c3aed" fillOpacity={0.06} stroke="#7c3aed" strokeWidth={2.5} />
      <line x1={5} y1={cy} x2={275} y2={cy} stroke="#94a3b8" strokeWidth={1} />
      <line x1={cx1} y1={cy} x2={cx1} y2={24} stroke="#dc2626" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={cx2} y1={cy} x2={cx2} y2={24} stroke="#7c3aed" strokeWidth={1} strokeDasharray="4,3" />
      <text x={cx1} y={cy + 14} textAnchor="middle" fontSize={11} fill="#dc2626" fontWeight={700}>μ&#x2081;</text>
      <text x={cx2} y={cy + 14} textAnchor="middle" fontSize={11} fill="#7c3aed" fontWeight={700}>μ&#x2082;</text>
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
        subjectWords={["התפלגות", "נורמלית", "ממוצע", "סטיית תקן", "ציון תקן", "z", "טבלה"]}
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

      {/* Advanced gate */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── FormulaBar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"zscore" | "rule" | "range" | "symmetry" | null>(null);

  const tabs = [
    { id: "zscore" as const,   label: "ציון תקן",   tex: "z = \\frac{x - \\mu}{\\sigma}",    color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "rule" as const,     label: "68-95-99.7",  tex: "68\\%,\\;95\\%,\\;99.7\\%",        color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "range" as const,    label: "תחום",        tex: "P(a<X<b)",                          color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "symmetry" as const, label: "סימטריה",     tex: "\\Phi(-z) = 1 - \\Phi(z)",          color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {activeTab === "zscore" && (
        <motion.div key="zscore" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"z = \\frac{x - \\mu}{\\sigma}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> ציון התקן מודד כמה סטיות תקן ערך מסוים רחוק מהממוצע.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"x"}</InlineMath> — הערך הנתון (למשל ציון מבחן).</li>
                  <li><InlineMath>{"\\mu"}</InlineMath> — הממוצע של ההתפלגות.</li>
                  <li><InlineMath>{"\\sigma"}</InlineMath> — סטיית התקן.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; z חיובי = מעל הממוצע. z שלילי = מתחת לממוצע. z = 0 = בדיוק על הממוצע.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "rule" && (
        <motion.div key="rule" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\mu \\pm 1\\sigma \\to 68\\% \\quad \\mu \\pm 2\\sigma \\to 95\\% \\quad \\mu \\pm 3\\sigma \\to 99.7\\%"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כלל אצבע להתפלגות נורמלית:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>68% מהנתונים בין <InlineMath>{"\\mu - \\sigma"}</InlineMath> ל-<InlineMath>{"\\mu + \\sigma"}</InlineMath>.</li>
                  <li>95% מהנתונים בין <InlineMath>{"\\mu - 2\\sigma"}</InlineMath> ל-<InlineMath>{"\\mu + 2\\sigma"}</InlineMath>.</li>
                  <li>99.7% מהנתונים בין <InlineMath>{"\\mu - 3\\sigma"}</InlineMath> ל-<InlineMath>{"\\mu + 3\\sigma"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: שימושי לשאלות &quot;בין אילו ערכים נמצאים X% מהנתונים?&quot;
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "range" && (
        <motion.div key="range" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(a < X < b) = \\Phi(z_b) - \\Phi(z_a)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> חישוב הסתברות בתחום מסוים:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>חשבו <InlineMath>{"z_a"}</InlineMath> ו-<InlineMath>{"z_b"}</InlineMath> עבור שני הגבולות.</li>
                  <li>מצאו <InlineMath>{"\\Phi(z_a)"}</InlineMath> ו-<InlineMath>{"\\Phi(z_b)"}</InlineMath> מטבלת z.</li>
                  <li>חסרו: <InlineMath>{"\\Phi(z_b) - \\Phi(z_a)"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימו לב: תמיד <InlineMath>{"\\Phi"}</InlineMath> הגבוה פחות <InlineMath>{"\\Phi"}</InlineMath> הנמוך!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "symmetry" && (
        <motion.div key="symmetry" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\Phi(-z) = 1 - \\Phi(z)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> ההתפלגות הנורמלית סימטרית סביב הממוצע:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אם z שלילי, השתמשו בנוסחה: <InlineMath>{"\\Phi(-z) = 1 - \\Phi(z)"}</InlineMath>.</li>
                  <li>אין צורך בטבלה לערכים שליליים — מספיק לדעת את <InlineMath>{"\\Phi(z)"}</InlineMath> לערכים חיוביים.</li>
                  <li>&quot;גבוה מ-x&quot; = <InlineMath>{"1 - \\Phi(z)"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: <InlineMath>{"\\Phi(z)"}</InlineMath> נותן P(Z &lt; z) — כלומר הסתברות מצד שמאל. לצד ימין: <InlineMath>{"1 - \\Phi(z)"}</InlineMath>.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── NormalLab ─────────────────────────────────────────────────────────────────

function NormalLab() {
  const [mu, setMu] = useState(70);
  const [sigma, setSigma] = useState(10);

  const S = 280, H = 180, baseline = 160, peakY = 20;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * 6 - 3;
    const gauss = Math.exp(-0.5 * t * t);
    const px = 30 + (i / 100) * (S - 60);
    const py = baseline - gauss * (baseline - peakY);
    pts.push({ x: px, y: py });
  }
  const curvePath = pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");

  const valToX = (v: number) => {
    const t = (v - mu) / sigma;
    const frac = (t + 3) / 6;
    return 30 + frac * (S - 60);
  };

  const muX = valToX(mu);
  const s1L = valToX(mu - sigma);
  const s1R = valToX(mu + sigma);
  const s2L = valToX(mu - 2 * sigma);
  const s2R = valToX(mu + 2 * sigma);

  const shade1Pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * 6 - 3;
    if (t >= -1 && t <= 1) {
      const gauss = Math.exp(-0.5 * t * t);
      const px = 30 + (i / 100) * (S - 60);
      const py = baseline - gauss * (baseline - peakY);
      shade1Pts.push({ x: px, y: py });
    }
  }
  const shade1Path = shade1Pts.length > 0
    ? `M ${shade1Pts[0].x},${baseline} ` + shade1Pts.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${shade1Pts[shade1Pts.length - 1].x},${baseline} Z`
    : "";

  const shade2Pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * 6 - 3;
    if ((t >= -2 && t < -1) || (t > 1 && t <= 2)) {
      const gauss = Math.exp(-0.5 * t * t);
      const px = 30 + (i / 100) * (S - 60);
      const py = baseline - gauss * (baseline - peakY);
      shade2Pts.push({ x: px, y: py });
    }
  }
  const shade2L: { x: number; y: number }[] = [];
  const shade2R: { x: number; y: number }[] = [];
  for (const p of shade2Pts) {
    if (p.x < muX) shade2L.push(p);
    else shade2R.push(p);
  }
  const makeShade = (arr: { x: number; y: number }[]) =>
    arr.length > 1
      ? `M ${arr[0].x},${baseline} ` + arr.map(p => `L ${p.x},${p.y}`).join(" ") + ` L ${arr[arr.length - 1].x},${baseline} Z`
      : "";

  const changed = mu !== 70 || sigma !== 10;

  return (
    <section style={{
      border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem",
      background: "rgba(255,255,255,0.82)", marginTop: "2rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת התפלגות נורמלית</h3>
        {changed && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />משתנה!</span>}
      </div>

      <svg viewBox={`0 0 ${S} ${H + 20}`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {shade2L.length > 1 && <path d={makeShade(shade2L)} fill="#a78bfa" fillOpacity={0.15} />}
        {shade2R.length > 1 && <path d={makeShade(shade2R)} fill="#a78bfa" fillOpacity={0.15} />}
        {shade1Path && <path d={shade1Path} fill="#22c55e" fillOpacity={0.2} />}
        <path d={curvePath} fill="none" stroke="#22c55e" strokeWidth={2.5} />
        <line x1={20} y1={baseline} x2={S - 10} y2={baseline} stroke="#94a3b8" strokeWidth={1} />
        <line x1={muX} y1={baseline} x2={muX} y2={peakY - 5} stroke="#64748b" strokeWidth={1} strokeDasharray="4,3" />
        <line x1={s1L} y1={baseline} x2={s1L} y2={baseline - 8} stroke="#22c55e" strokeWidth={1.5} />
        <line x1={s1R} y1={baseline} x2={s1R} y2={baseline - 8} stroke="#22c55e" strokeWidth={1.5} />
        <line x1={s2L} y1={baseline} x2={s2L} y2={baseline - 6} stroke="#a78bfa" strokeWidth={1.2} />
        <line x1={s2R} y1={baseline} x2={s2R} y2={baseline - 6} stroke="#a78bfa" strokeWidth={1.2} />
        <text x={muX} y={baseline + 14} textAnchor="middle" fontSize={11} fill="#1e293b" fontWeight={700}>μ</text>
        <text x={s1L} y={baseline + 14} textAnchor="middle" fontSize={9} fill="#64748b">μ−σ</text>
        <text x={s1R} y={baseline + 14} textAnchor="middle" fontSize={9} fill="#64748b">μ+σ</text>
        <text x={s2L} y={baseline + 14} textAnchor="middle" fontSize={9} fill="#a78bfa">μ−2σ</text>
        <text x={s2R} y={baseline + 14} textAnchor="middle" fontSize={9} fill="#a78bfa">μ+2σ</text>
        <text x={muX} y={baseline - 45} textAnchor="middle" fontSize={10} fill="#22c55e" fontWeight={600}>68%</text>
        <text x={muX} y={baseline - 55} textAnchor="middle" fontSize={9} fill="#a78bfa">95%</text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 8px", marginBottom: 20 }}>
        {([
          { label: "ממוצע μ", val: mu, set: setMu, min: 40, max: 100, step: 1, color: "#22c55e" },
          { label: "סטיית תקן σ", val: sigma, set: setSigma, min: 5, max: 25, step: 1, color: "#7c3aed" },
        ] as const).map(({ label, val, set, min, max, step, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              <span>{label}</span><span style={{ color, fontWeight: 700 }}>{val}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={val}
              onChange={e => (set as (v: number) => void)(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: color } as React.CSSProperties} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "μ", val: mu.toString(), color: "#22c55e" },
          { label: "σ", val: sigma.toString(), color: "#7c3aed" },
          { label: "μ−σ", val: (mu - sigma).toString(), color: "#64748b" },
          { label: "μ+σ", val: (mu + sigma).toString(), color: "#64748b" },
          { label: "μ−2σ", val: (mu - 2 * sigma).toString(), color: "#a78bfa" },
          { label: "μ+2σ", val: (mu + 2 * sigma).toString(), color: "#a78bfa" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#22c55e", fontWeight: 600 }}>68%</span> מהנתונים בין μ−σ ל-μ+σ &nbsp;|&nbsp; <span style={{ color: "#a78bfa", fontWeight: 600 }}>95%</span> בין μ−2σ ל-μ+2σ
      </div>

      <LabMessage text="שנה את הסליידרים כדי לראות איך ההתפלגות משתנה!" type="success" visible={changed} />
    </section>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "ציון תקן ואחוזון",
    problem: "ציוני מבחן מתפלגים נורמלית.\nממוצע: μ\nסטיית תקן: σ\n\nתלמיד קיבל ציון x.\n\nא. חשב את ציון ה-z של התלמיד.\nב. מהו האחוזון שלו? (השתמש בטבלת z)\nג. כמה אחוז מהתלמידים קיבלו ציון גבוה יותר?\nד. בין אילו ציונים נמצאים 68% מהתלמידים?",
    diagram: <BellCurveBasic />,
    pitfalls: [
      { title: "z שלילי לא אומר 'ציון רע'", text: "z שלילי רק אומר שהתלמיד מתחת לממוצע. אם הממוצע 90 וקיבלת 85, z שלילי אבל הציון עדיין גבוה." },
      { title: "בלבול בין 'גבוה יותר' ל'נמוך יותר'", text: "טבלת z נותנת P(Z < z). אם רוצים 'גבוה יותר' צריך 1\u2212\u03A6(z). טעות קלאסית: לקרוא ישירות מהטבלה ולשכוח להשלים ל-1." },
      { title: "שוכחים את כלל 68-95-99.7", text: "כשנשאלים 'בין אילו ערכים נמצאים 68%?' \u2014 התשובה היא \u03BC\u00B1\u03C3. אל תנסו לחשב מטבלת z \u2014 השתמשו בכלל ישירות." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא\u2019. ציוני מבחן מתפלגים נורמלית עם ממוצע \u03BC וסטיית תקן \u03C3. תלמיד קיבל ציון x.\nאני צריך:\n1. לחשב ציון z באמצעות z=(x\u2212\u03BC)/\u03C3\n2. למצוא את האחוזון מטבלת z\n3. לחשב כמה אחוז קיבלו ציון גבוה יותר (1\u2212\u03A6(z))\n4. למצוא את טווח 68% (\u03BC\u00B1\u03C3)\n\nאל תפתור עבורי \u2014 שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "שלב א\u2019 \u2014 נוסחת ציון תקן",
        coaching: "הצב בנוסחה z = (x \u2212 \u03BC) / \u03C3",
        prompt: "אני תלמיד כיתה יא\u2019. ציוני מבחן מתפלגים נורמלית עם ממוצע \u03BC וסטיית תקן \u03C3. תלמיד קיבל ציון x. תנחה אותי: מה הנוסחה לחישוב ציון תקן z? הסבר כל מרכיב: x, \u03BC, \u03C3. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["ציון תקן", "נוסחה", "z"],
        keywordHint: "ציין שמדובר בנוסחת ציון תקן",
        contextWords: ["z", "ציון תקן", "נוסחה", "ממוצע", "סטיית תקן", "הצב", "x"],
      },
      {
        phase: "\u05D1",
        label: "שלב ב\u2019 \u2014 חשב את z",
        coaching: "הצב את הערכים בנוסחה ופרש את הסימן",
        prompt: "אני תלמיד כיתה יא\u2019. מבחן עם ממוצע \u03BC וסטיית תקן \u03C3. תלמיד קיבל x. תנחה אותי להציב בנוסחה z=(x\u2212\u03BC)/\u03C3. מה הסימן של z אומר על מיקום התלמיד ביחס לממוצע? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["הצב", "z", "סימן"],
        keywordHint: "ציין שצריך להציב ולפרש",
        contextWords: ["הצב", "z", "סימן", "חיובי", "שלילי", "ממוצע", "מיקום"],
      },
      {
        phase: "\u05D2",
        label: "שלב ג\u2019 \u2014 טבלת z ואחוזון",
        coaching: "מצא \u03A6(z) בטבלה וחשב 1\u2212\u03A6(z)",
        prompt: "אני תלמיד כיתה יא\u2019. מצאתי z עבור ציון התלמיד. תנחה אותי: איך אני קורא את טבלת z כדי למצוא \u03A6(z)? מה ההבדל בין \u03A6(z) ל-1\u2212\u03A6(z)? מתי משתמשים בכל אחד? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["טבלה", "\u03A6", "אחוזון"],
        keywordHint: "ציין שצריך לקרוא מטבלת z",
        contextWords: ["טבלה", "\u03A6", "z", "ערך", "הסתברות", "אחוזון", "קריאה"],
      },
      {
        phase: "\u05D3",
        label: "שלב ד\u2019 \u2014 כלל 68-95-99.7",
        coaching: "השתמש בכלל לזהות את טווח 68%",
        prompt: "אני תלמיד כיתה יא\u2019. ציוני מבחן עם ממוצע \u03BC וסטיית תקן \u03C3. תנחה אותי: מהו כלל 68-95-99.7? בין אילו ערכים נמצאים 68% מהנתונים? ואיפה 95%? הסבר בלי לתת תשובה סופית. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["68", "כלל", "\u03C3"],
        keywordHint: "ציין את כלל 68-95-99.7",
        contextWords: ["68", "95", "99.7", "כלל", "\u03C3", "ממוצע", "טווח"],
      },
    ],
  },
  {
    id: "medium",
    title: "הסתברות בתחום \u2014 שני גבולות",
    problem: "גובה תלמידים בכיתה מתפלג נורמלית.\nממוצע: \u03BC\nסטיית תקן: \u03C3\n\nא. מהו האחוז בין שני גבהים נתונים a ו-b?\nב. חשב z עבור כל ערך.\nג. מצא P(a < X < b) = \u03A6(z_b) \u2212 \u03A6(z_a).\nד. אמת באמצעות סימטריה: \u03A6(\u2212z) = 1 \u2212 \u03A6(z).",
    diagram: <BellCurveMedium />,
    pitfalls: [
      { title: "שוכחים לחסר \u03A6 של z הקטן", text: "P(a<X<b) = \u03A6(z_b)\u2212\u03A6(z_a). אם מחשבים רק \u03A6 אחד \u2014 מקבלים הסתברות שגויה. תמיד צריך חיסור של שני ערכים." },
      { title: "לא משתמשים בסימטריה כש-z שלילי", text: "אם z שלילי, השתמשו ב-\u03A6(\u2212z)=1\u2212\u03A6(z) במקום לחפש ערכים שליליים בטבלה. רוב הטבלאות מכילות רק ערכים חיוביים." },
      { title: "מבלבלים בין z_a ל-z_b", text: "ודאו ש-z_b > z_a. אם התוצאה שלילית \u2014 הפכתם את הסדר. P(a<X<b) חייבת להיות חיובית." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא\u2019. גובה תלמידים מתפלג נורמלית עם ממוצע \u03BC וסטיית תקן \u03C3. אני רוצה למצוא את האחוז בין גובה a לגובה b.\nשלבים:\n1. חשב z_a ו-z_b\n2. מצא \u03A6(z_a) ו-\u03A6(z_b) מטבלת z\n3. חשב P(a<X<b) = \u03A6(z_b)\u2212\u03A6(z_a)\n4. אמת עם כלל הסימטריה\n\nאל תפתור עבורי \u2014 שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "שלב א\u2019 \u2014 חשב z לכל ערך",
        coaching: "הצב a ו-b בנוסחת z",
        prompt: "אני תלמיד כיתה יא\u2019. גובה תלמידים מתפלג נורמלית עם ממוצע \u03BC וסטיית תקן \u03C3. נתונים שני גבהים a ו-b. תנחה אותי לחשב z_a ו-z_b לפי הנוסחה z=(x\u2212\u03BC)/\u03C3. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["z", "נוסחה", "ערך"],
        keywordHint: "ציין שצריך לחשב z לכל ערך",
        contextWords: ["z", "ציון תקן", "נוסחה", "ממוצע", "סטיית תקן", "a", "b"],
      },
      {
        phase: "\u05D1",
        label: "שלב ב\u2019 \u2014 קרא \u03A6 מטבלת z",
        coaching: "מצא את הערכים בטבלה",
        prompt: "אני תלמיד כיתה יא\u2019. חישבתי z_a ו-z_b. תנחה אותי איך לקרוא \u03A6(z) מטבלת z: איך מוצאים שורה ועמודה? מה עושים אם z שלילי? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["טבלה", "\u03A6", "קריאה"],
        keywordHint: "ציין שצריך לקרוא מהטבלה",
        contextWords: ["טבלה", "\u03A6", "z", "ערך", "הסתברות", "שורה", "עמודה"],
      },
      {
        phase: "\u05D2",
        label: "שלב ג\u2019 \u2014 חשב הסתברות בתחום",
        coaching: "חסר \u03A6(z_a) מ-\u03A6(z_b)",
        prompt: "אני תלמיד כיתה יא\u2019. מצאתי \u03A6(z_a) ו-\u03A6(z_b). תנחה אותי: איך מחשבים P(a<X<b)? למה צריך חיסור ולא רק ערך אחד? מה קורה אם הסדר הפוך? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["הסתברות", "חיסור", "תחום"],
        keywordHint: "ציין שצריך חיסור של שני ערכי \u03A6",
        contextWords: ["הסתברות", "תחום", "חיסור", "\u03A6", "P", "z_a", "z_b"],
      },
      {
        phase: "\u05D3",
        label: "שלב ד\u2019 \u2014 אמת עם סימטריה",
        coaching: "השתמש ב-\u03A6(\u2212z) = 1 \u2212 \u03A6(z) לאימות",
        prompt: "אני תלמיד כיתה יא\u2019. חישבתי P(a<X<b). תנחה אותי לאמת את התשובה באמצעות כלל הסימטריה: \u03A6(\u2212z) = 1 \u2212 \u03A6(z). מתי הכלל שימושי? איך הוא עוזר לבדוק שלא טעיתי? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סימטריה", "\u03A6", "אימות"],
        keywordHint: "ציין שצריך אימות עם סימטריה",
        contextWords: ["סימטריה", "\u03A6", "שלילי", "אימות", "1\u2212\u03A6", "כלל", "בדיקה"],
      },
    ],
  },
  {
    id: "advanced",
    title: "השוואת התפלגויות \u2014 שתי קבוצות",
    problem: "שתי קבוצות נבחנו במבחן.\nקבוצה א\u2019: ממוצע \u03BC\u2081, סטיית תקן \u03C3\nקבוצה ב\u2019: ממוצע \u03BC\u2082, סטיית תקן \u03C3\n\nתלמיד מקבוצה א\u2019 קיבל ציון x.\nתלמידה מקבוצה ב\u2019 קיבלה ציון y.\n\nא. חשב z לכל אחד.\nב. מי השיג תוצאה יחסית טובה יותר?\nג. מצא את האחוזון של כל אחד.\nד. מה הסיכוי שתלמיד אקראי מקבוצה א\u2019 ישיג יותר מ-x?",
    diagram: <BellCurveAdvanced />,
    pitfalls: [
      { title: "משווים ציונים גולמיים במקום z", text: "אי אפשר להשוות x ו-y ישירות כי ההתפלגויות שונות. רק ציוני z מאפשרים השוואה הוגנת בין קבוצות." },
      { title: "אותו \u03C3 לא אומר אותה התפלגות", text: "גם אם \u03C3 זהה, ממוצעים שונים יוצרים התפלגויות שונות. z=1 בקבוצה א\u2019 \u2260 z=1 בקבוצה ב\u2019 בציון גולמי." },
      { title: "z גבוה יותר = ביצוע יחסי טוב יותר", text: "מי ש-z שלו גבוה יותר \u2014 ביצע יחסית טוב יותר ביחס לקבוצה שלו. גם אם הציון הגולמי שלו נמוך." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u05D0",
        label: "שלב א\u2019 \u2014 חשב z לכל תלמיד",
        coaching: "הצב כל ציון בנוסחה עם הממוצע המתאים",
        prompt: "אני תלמיד כיתה יא\u2019. שתי קבוצות עם ממוצעים שונים \u03BC\u2081 ו-\u03BC\u2082 וסטיית תקן \u03C3 זהה. תלמיד מקבוצה א\u2019 קיבל x ותלמידה מקבוצה ב\u2019 קיבלה y. תנחה אותי לחשב z לכל אחד. שים לב: כל אחד ביחס לממוצע של הקבוצה שלו. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["z", "קבוצה", "ממוצע"],
        keywordHint: "ציין שצריך לחשב z לכל קבוצה בנפרד",
        contextWords: ["z", "ציון תקן", "ממוצע", "קבוצה", "\u03BC\u2081", "\u03BC\u2082", "\u03C3"],
      },
      {
        phase: "\u05D1",
        label: "שלב ב\u2019 \u2014 השווה באמצעות z",
        coaching: "z גבוה יותר = ביצוע יחסי טוב יותר",
        prompt: "אני תלמיד כיתה יא\u2019. חישבתי z לכל תלמיד. תנחה אותי: למה אי אפשר להשוות ציונים גולמיים? מה z גבוה יותר אומר? מי ביצע יחסית טוב יותר? הסבר בלי לתת את התשובה. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["השווה", "z", "יחסי"],
        keywordHint: "ציין שצריך השוואה יחסית דרך z",
        contextWords: ["השווה", "z", "יחסי", "גבוה", "תוצאה", "קבוצה", "ביצוע"],
      },
      {
        phase: "\u05D2",
        label: "שלב ג\u2019 \u2014 מצא אחוזון לכל אחד",
        coaching: "חפש \u03A6(z) בטבלה לכל תלמיד",
        prompt: "אני תלמיד כיתה יא\u2019. חישבתי z לשני התלמידים. תנחה אותי למצוא את האחוזון של כל אחד מטבלת z. מה המשמעות של ההבדל באחוזונים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אחוזון", "\u03A6", "טבלה"],
        keywordHint: "ציין שצריך למצוא אחוזון מטבלה",
        contextWords: ["אחוזון", "טבלה", "\u03A6", "z", "אחוז", "מיקום", "קבוצה"],
      },
      {
        phase: "\u05D3",
        label: "שלב ד\u2019 \u2014 הסתברות מעל ערך",
        coaching: "חשב 1\u2212\u03A6(z) עבור תלמיד מקבוצה א\u2019",
        prompt: "אני תלמיד כיתה יא\u2019. אני צריך למצוא P(X > x) עבור קבוצה א\u2019. תנחה אותי: מה הקשר בין \u03A6(z) ל-P(X > x)? למה התשובה היא 1\u2212\u03A6(z)? הסבר בלי לתת מספרים. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["הסתברות", "1\u2212\u03A6", "גבוה"],
        keywordHint: "ציין שצריך 1\u2212\u03A6(z)",
        contextWords: ["הסתברות", "1\u2212\u03A6", "גבוה", "z", "סיכוי", "מעל", "קבוצה"],
      },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NormalDistributionPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>התפלגות נורמלית עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>ציון תקן, אחוזונים, טבלת z — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/probability"
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

        <SubtopicProgress subtopicId="probability/normal" />

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
        <NormalLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="probability/normal" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
