"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock } from "lucide-react";
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
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={130} x2={240} y2={130} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={130} y1={20} x2={130} y2={200} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={244} y={134} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={126} y={16} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Circle shape */}
      <circle cx={160} cy={100} r={55} fill="none" stroke="#f59e0b" strokeWidth={2.2} />
      {/* Center dot */}
      <circle cx={160} cy={100} r={4} fill="#a78bfa" />
      <text x={168} y={96} fontSize={11} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>O</text>
      {/* Radius line */}
      <line x1={160} y1={100} x2={215} y2={100} stroke="#34d399" strokeWidth={1.8} strokeDasharray="5,3" />
      <text x={185} y={93} fontSize={10} fill="#34d399" fontFamily="sans-serif" fontWeight={600}>r</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={130} x2={240} y2={130} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={130} y1={20} x2={130} y2={200} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={244} y={134} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={126} y={16} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Circle */}
      <circle cx={140} cy={110} r={50} fill="none" stroke="#f59e0b" strokeWidth={2.2} />
      {/* Center with ? */}
      <circle cx={140} cy={110} r={4} fill="#a78bfa" />
      <text x={144} y={104} fontSize={13} fill="#a78bfa" fontFamily="sans-serif" fontWeight={700}>?</text>
      {/* External point with dotted line to center */}
      <circle cx={210} cy={65} r={4} fill="#64748b" />
      <text x={216} y={62} fontSize={10} fill="#64748b" fontFamily="sans-serif" fontWeight={600}>Q</text>
      <line x1={140} y1={110} x2={210} y2={65} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={30} y1={150} x2={240} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={50} y1={20} x2={50} y2={200} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={244} y={154} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">x</text>
      <text x={46} y={16} fontSize={10} fill="#94a3b8" fontFamily="sans-serif">y</text>
      {/* Circle through 3 points */}
      <circle cx={145} cy={105} r={60} fill="none" stroke="#f59e0b" strokeWidth={2.2} />
      {/* 3 points */}
      <circle cx={95} cy={135} r={4.5} fill="#34d399" />
      <text x={82} y={148} fontSize={10} fill="#34d399" fontFamily="sans-serif" fontWeight={700}>A</text>
      <circle cx={200} cy={120} r={4.5} fill="#34d399" />
      <text x={206} y={116} fontSize={10} fill="#34d399" fontFamily="sans-serif" fontWeight={700}>B</text>
      <circle cx={130} cy={48} r={4.5} fill="#34d399" />
      <text x={136} y={44} fontSize={10} fill="#34d399" fontFamily="sans-serif" fontWeight={700}>C</text>
      {/* Tangent line at A */}
      <line x1={60} y1={160} x2={130} y2={110} stroke="#a78bfa" strokeWidth={1.8} />
      <text x={62} y={172} fontSize={10} fill="#a78bfa" fontFamily="sans-serif" fontWeight={600}>משיק</text>
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
        subjectWords={["מעגל", "מרכז", "רדיוס", "משיק", "משוואה", "השלמה לריבוע"]}
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
  const [activeTab, setActiveTab] = useState<"standard" | "general" | "tangent" | null>(null);

  const tabs = [
    { id: "standard" as const, label: "משוואה תקנית", tex: "(x-a)^2+(y-b)^2=r^2", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "general" as const,  label: "משוואה כללית",  tex: "x^2+y^2+Dx+Ey+F=0",  color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "tangent" as const,  label: "משיק למעגל",    tex: "m_r \\cdot m_t = -1",  color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: Standard equation */}
      {activeTab === "standard" && (
        <motion.div key="standard" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(x-a)^2 + (y-b)^2 = r^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> משוואה תקנית של מעגל עם מרכז <InlineMath>{"(a,b)"}</InlineMath> ורדיוס <InlineMath>{"r"}</InlineMath>.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"a"}</InlineMath> ו-<InlineMath>{"b"}</InlineMath> הם קואורדינטות המרכז.</li>
                  <li>שימו לב לסימנים: מרכז <InlineMath>{"(3,-2)"}</InlineMath> נותן <InlineMath>{"(x-3)^2+(y+2)^2"}</InlineMath>.</li>
                  <li>בצד ימין כותבים <InlineMath>{"r^2"}</InlineMath>, לא <InlineMath>{"r"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: מרכז <InlineMath>{"(2,-3)"}</InlineMath>, רדיוס 4 &rarr; <InlineMath>{"(x-2)^2+(y+3)^2=16"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: General equation */}
      {activeTab === "general" && (
        <motion.div key="general" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"x^2+y^2+Dx+Ey+F=0"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> מהמשוואה הכללית מוצאים מרכז ורדיוס ע&quot;י השלמה לריבוע:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מרכז: <InlineMath>{"\\left(-\\frac{D}{2},\\;-\\frac{E}{2}\\right)"}</InlineMath></li>
                  <li>רדיוס: <InlineMath>{"r = \\sqrt{\\frac{D^2}{4}+\\frac{E^2}{4}-F}"}</InlineMath></li>
                  <li>תנאי קיום: <InlineMath>{"\\frac{D^2}{4}+\\frac{E^2}{4}-F > 0"}</InlineMath></li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"x^2+y^2-4x+6y-3=0"}</InlineMath> &rarr; מרכז <InlineMath>{"(2,-3)"}</InlineMath>, <InlineMath>{"r=4"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Tangent */}
      {activeTab === "tangent" && (
        <motion.div key="tangent" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"m_{\\text{radius}} \\cdot m_{\\text{tangent}} = -1"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> המשיק למעגל בנקודה מסוימת מאונך לרדיוס באותה נקודה:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>חשבו את שיפוע הרדיוס מהמרכז לנקודה.</li>
                  <li>שיפוע המשיק = <InlineMath>{"-\\frac{1}{m_r}"}</InlineMath> (ניצב).</li>
                  <li>כתבו משוואת ישר עם השיפוע החדש והנקודה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: שיפוע רדיוס = 2 &rarr; שיפוע משיק = <InlineMath>{"-\\frac{1}{2}"}</InlineMath>
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
    title: "משוואת מעגל -- מרכז ורדיוס",
    problem: "נתון מעגל עם מרכז (3, -2) ורדיוס r = 5.\n\nא. כתבו את משוואת המעגל בצורה תקנית.\nב. פתחו את המשוואה לצורה כללית.\nג. בדקו אם הנקודה P(8, -2) נמצאת על המעגל.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "טעות סימנים במרכז", text: "כשהמרכז הוא (3,-2), הסימנים מתהפכים בנוסחה: (x-3) ו-(y+2). תלמידים רבים כותבים (x+3) או (y-2) בטעות." },
      { title: "בלבול בין r ל-r\u00B2", text: "בצד ימין של המשוואה התקנית כותבים את r\u00B2, לא את r. אם r=5 אז כותבים 25, לא 5." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳. נתון מעגל עם מרכז (3,-2) ורדיוס 5.\nאני צריך:\n1. לכתוב את המשוואה התקנית (x-a)\u00B2+(y-b)\u00B2=r\u00B2\n2. לפתח לצורה כללית x\u00B2+y\u00B2+Dx+Ey+F=0\n3. לבדוק אם P(8,-2) על המעגל\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- כתיבת המשוואה התקנית",
        coaching: "הצב את ערכי המרכז והרדיוס בנוסחה הכללית",
        prompt: "נתון מעגל עם מרכז (3,-2) ורדיוס 5. תנחה אותי איך להציב בנוסחה (x-a)\u00B2+(y-b)\u00B2=r\u00B2. שים לב שאני מבין מה קורה עם הסימנים. אל תפתור עבורי.",
        keywords: ["מרכז", "רדיוס", "נוסחה"],
        keywordHint: "ציין שמדובר בנוסחה תקנית",
        contextWords: ["מעגל", "מרכז", "רדיוס", "נוסחה", "תקנית", "הצב"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- פיתוח לצורה כללית",
        coaching: "פתח סוגריים ואסוף איברים",
        prompt: "יש לי את המשוואה התקנית של המעגל עם מרכז (3,-2) ורדיוס 5. תדריך אותי איך לפתוח סוגריים ולעבור לצורה x\u00B2+y\u00B2+Dx+Ey+F=0. אל תפתור.",
        keywords: ["סוגריים", "כללית", "פיתוח"],
        keywordHint: "ציין שצריך לפתח את הסוגריים",
        contextWords: ["מעגל", "סוגריים", "כללית", "פיתוח", "D", "E", "F"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- בדיקת נקודה על המעגל",
        coaching: "הצב את קואורדינטות הנקודה במשוואה",
        prompt: "משוואת המעגל עם מרכז (3,-2) ורדיוס 5. תנחה אותי איך לבדוק האם הנקודה P(8,-2) נמצאת על המעגל. תסביר מה צריך לבדוק. אל תפתור.",
        keywords: ["הצב", "נקודה", "מעגל"],
        keywordHint: "הצב את הנקודה במשוואה",
        contextWords: ["מעגל", "נקודה", "הצב", "בדוק", "מרחק", "רדיוס"],
      },
    ],
  },
  {
    id: "medium",
    title: "מציאת מרכז ורדיוס ממשוואה כללית",
    problem: "נתונה משוואת מעגל בצורה כללית:\nx\u00B2 + y\u00B2 - 6x + 4y - 12 = 0\n\nא. מצאו את מרכז המעגל ואת הרדיוס בעזרת השלמה לריבוע.\nב. קבעו אם הנקודה Q(7, 1) נמצאת בתוך המעגל, מחוצה לו, או עליו.\nג. חשבו את המרחק מהמרכז ל-Q ופרשו את התוצאה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "טעות בהשלמה לריבוע", text: "בהשלמה לריבוע של -6x חייבים להוסיף ולחסר (6/2)\u00B2=9 -- תלמידים שוכחים לחלק ב-2 לפני הריבוע, או שוכחים לחסר." },
      { title: "בלבול פנים/חוץ", text: "אם d\u00B2 < r\u00B2 הנקודה בפנים, אם d\u00B2 = r\u00B2 על המעגל, אם d\u00B2 > r\u00B2 בחוץ. תלמידים מתבלבלים בכיוון של אי-השוויון." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא׳. נתונה משוואת מעגל: x\u00B2+y\u00B2-6x+4y-12=0.\nאני צריך:\n1. לבצע השלמה לריבוע ולמצוא מרכז ורדיוס\n2. לבדוק אם Q(7,1) בפנים/על/מחוץ למעגל\n3. לחשב מרחק מהמרכז ל-Q ולפרש\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- השלמה לריבוע",
        coaching: "קבץ את איברי x ואת איברי y בנפרד",
        prompt: "נתונה משוואה x\u00B2+y\u00B2-6x+4y-12=0. תנחה אותי צעד אחר צעד בהשלמה לריבוע כדי למצוא מרכז ורדיוס. אל תפתור.",
        keywords: ["השלמה", "ריבוע", "מרכז"],
        keywordHint: "ציין שצריך השלמה לריבוע",
        contextWords: ["השלמה", "ריבוע", "מרכז", "רדיוס", "קיבוץ", "מעגל"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- מיקום נקודה ביחס למעגל",
        coaching: "חשב d\u00B2 מהמרכז לנקודה Q",
        prompt: "מצאתי את מרכז המעגל מהמשוואה x\u00B2+y\u00B2-6x+4y-12=0. תדריך אותי איך לקבוע אם Q(7,1) בפנים, בחוץ, או על המעגל. אל תפתור.",
        keywords: ["מרחק", "פנים", "חוץ"],
        keywordHint: "ציין שצריך להשוות מרחקים",
        contextWords: ["מרחק", "d\u00B2", "r\u00B2", "פנים", "חוץ", "מעגל", "נקודה"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- חישוב מרחק ופרשנות",
        coaching: "חשב את המרחק המדויק ופרש",
        prompt: "מצאתי את מרכז ורדיוס המעגל מהמשוואה x\u00B2+y\u00B2-6x+4y-12=0 ואת הנקודה Q(7,1). תנחה אותי לחשב את המרחק מהמרכז ל-Q ולפרש את התוצאה ביחס לרדיוס. אל תפתור.",
        keywords: ["מרחק", "רדיוס", "פרשנות"],
        keywordHint: "ציין שצריך לחשב מרחק",
        contextWords: ["מרחק", "מרכז", "רדיוס", "פרשנות", "השוואה", "מעגל"],
      },
    ],
  },
  {
    id: "advanced",
    title: "מעגל דרך 3 נקודות",
    problem: "מצאו את משוואת המעגל העובר דרך שלוש הנקודות:\nA(1, 3),  B(5, 1),  C(-1, -1)\n\nא. הציבו כל נקודה במשוואה הכללית x\u00B2+y\u00B2+Dx+Ey+F=0 וקבלו 3 משוואות.\nב. פתרו את המערכת ומצאו D, E, F.\nג. כתבו את המרכז והרדיוס.\nד. מצאו את משוואת המשיק למעגל בנקודה A.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "טעות בהצבת נקודות", text: "כשמציבים A(1,3) חייבים לחשב 1\u00B2+3\u00B2 = 10, לא 1+3=4. תלמידים מתבלבלים בין הצבה לריבוע להצבה ישירה." },
      { title: "שכחת ניצב במשיק", text: "המשיק ניצב לרדיוס -- חייבים לחשב את שיפוע הרדיוס מהמרכז לנקודה, ואז לקחת את המינוס ההופכי. תלמידים משתמשים בשיפוע הרדיוס עצמו." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "שלב א׳ -- הצבת 3 נקודות",
        coaching: "הציבו כל נקודה בנוסחה הכללית",
        prompt: "נתונות A(1,3), B(5,1), C(-1,-1). תנחה אותי להציב כל נקודה במשוואה x\u00B2+y\u00B2+Dx+Ey+F=0 כדי לקבל 3 משוואות ב-D,E,F. אל תפתור.",
        keywords: ["הצב", "משוואה", "נקודה"],
        keywordHint: "ציין שצריך להציב",
        contextWords: ["מעגל", "הצב", "משוואה", "D", "E", "F", "נקודה"],
      },
      {
        phase: "ב",
        label: "שלב ב׳ -- פתרון המערכת",
        coaching: "פתרו מערכת 3 משוואות ב-3 נעלמים",
        prompt: "קיבלתי 3 משוואות מהצבת A(1,3), B(5,1), C(-1,-1) במשוואה x\u00B2+y\u00B2+Dx+Ey+F=0. תדריך אותי איך לפתור את המערכת ולמצוא D, E, F. אל תפתור.",
        keywords: ["מערכת", "פתור", "משוואות"],
        keywordHint: "ציין שצריך לפתור מערכת",
        contextWords: ["מערכת", "פתור", "משוואות", "D", "E", "F", "חיסור"],
      },
      {
        phase: "ג",
        label: "שלב ג׳ -- מרכז ורדיוס",
        coaching: "חלצו מרכז ורדיוס מ-D, E, F",
        prompt: "מצאתי D, E, F ממערכת המשוואות שהתקבלה מ-A(1,3), B(5,1), C(-1,-1). תנחה אותי למצוא את המרכז והרדיוס מהנוסחאות. אל תפתור.",
        keywords: ["מרכז", "רדיוס"],
        keywordHint: "ציין שצריך למצוא מרכז",
        contextWords: ["מרכז", "רדיוס", "D", "E", "מעגל", "השלמה"],
      },
      {
        phase: "ד",
        label: "שלב ד׳ -- משיק בנקודה A",
        coaching: "מצאו שיפוע רדיוס ואז ניצב",
        prompt: "מצאתי את מרכז המעגל העובר דרך A(1,3), B(5,1), C(-1,-1). תנחה אותי למצוא את משוואת המשיק למעגל בנקודה A. תסביר למה המשיק ניצב לרדיוס. אל תפתור.",
        keywords: ["משיק", "ניצב", "שיפוע"],
        keywordHint: "ציין שצריך משיק",
        contextWords: ["משיק", "ניצב", "שיפוע", "רדיוס", "מרכז", "משוואה"],
      },
    ],
  },
];

// ─── CircleLab (basic) ────────────────────────────────────────────────────────

function CircleLab() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(-1);
  const [R, setR] = useState(3);

  const S = 260;
  const xMin = -8, xMax = 8, yMin = -8, yMax = 8;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * S;
  const toSy = (y: number) => S - ((y - yMin) / (yMax - yMin)) * S;
  const scale = S / (xMax - xMin);
  const cxS = toSx(a), cyS = toSy(b), rS = R * scale;
  const ox = toSx(0), oy = toSy(0);
  const rSq = R * R;

  const xPart = a === 0 ? "x\u00B2" : a > 0 ? `(x - ${a})\u00B2` : `(x + ${Math.abs(a)})\u00B2`;
  const yPart = b === 0 ? "y\u00B2" : b > 0 ? `(y - ${b})\u00B2` : `(y + ${Math.abs(b)})\u00B2`;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת מעגלים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem", fontFamily: "monospace", direction: "ltr" }}>
        {xPart} + {yPart} = <span style={{ color: "#16A34A", fontWeight: 700 }}>{rSq}</span>
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "a (מרכז x)", val: a, min: -5, max: 5, step: 1, set: setA, color: "#16A34A" },
          { label: "b (מרכז y)", val: b, min: -5, max: 5, step: 1, set: setB, color: "#7c3aed" },
          { label: "R (רדיוס)",  val: R, min: 1,  max: 6, step: 0.5, set: setR, color: "#b45309" },
        ].map(sl => (
          <div key={sl.label} style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: sl.color, fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: sl.color }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", maxWidth: 320 }} aria-hidden>
          {[-6, -4, -2, 2, 4, 6].map(v => {
            const sx = toSx(v), sy = toSy(v);
            return <g key={v}><line x1={sx} y1={0} x2={sx} y2={S} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} /><line x1={0} y1={sy} x2={S} y2={sy} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} /></g>;
          })}
          <line x1={0} y1={oy} x2={S} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={ox} y1={0} x2={ox} y2={S} stroke="#94a3b8" strokeWidth={1.2} />
          <circle cx={cxS} cy={cyS} r={rS} fill="rgba(22,163,74,0.08)" stroke="#16A34A" strokeWidth={2.5} />
          <line x1={cxS} y1={cyS} x2={cxS + rS} y2={cyS} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />
          <circle cx={cxS} cy={cyS} r={5} fill="#16A34A" />
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: 12 }}>
        {[
          { label: "מרכז", val: `(${a}, ${b})`, color: "#16A34A" },
          { label: "רדיוס", val: R.toString(), color: "#b45309" },
          { label: "r\u00B2", val: rSq.toString(), color: "#7c3aed" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(22,163,74,0.25)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "0.5rem" }}>
        שנו את הסליידרים כדי לראות איך המשוואה התקנית משתנה
      </p>
    </section>
  );
}

// ─── GeneralFormLab (medium) ──────────────────────────────────────────────────

function GeneralFormLab() {
  const [D, setD] = useState(-6);
  const [E, setE] = useState(4);
  const [F, setF] = useState(-12);

  const cx = -D / 2;
  const cy = -E / 2;
  const rSq = (D * D) / 4 + (E * E) / 4 - F;
  const valid = rSq > 0;
  const r = valid ? Math.sqrt(rSq) : 0;

  const S = 260;
  const xMin = -8, xMax = 8, yMin = -8, yMax = 8;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * S;
  const toSy = (y: number) => S - ((y - yMin) / (yMax - yMin)) * S;
  const scale = S / (xMax - xMin);
  const cxS = toSx(cx), cyS = toSy(cy), rS = r * scale;
  const ox = toSx(0), oy = toSy(0);

  const condition = rSq > 0 ? "r\u00B2 > 0 -- מעגל תקין" : rSq === 0 ? "r\u00B2 = 0 -- נקודה" : "r\u00B2 < 0 -- לא קיים";

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת צורה כללית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem", fontFamily: "monospace", direction: "ltr" }}>
        x&sup2; + y&sup2; + (<span style={{ color: "#EA580C", fontWeight: 700 }}>{D}</span>)x + (<span style={{ color: "#EA580C", fontWeight: 700 }}>{E}</span>)y + (<span style={{ color: "#EA580C", fontWeight: 700 }}>{F}</span>) = 0
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "D", val: D, min: -10, max: 10, step: 1, set: setD },
          { label: "E", val: E, min: -10, max: 10, step: 1, set: setE },
          { label: "F", val: F, min: -20, max: 20, step: 1, set: setF },
        ].map(sl => (
          <div key={sl.label} style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#EA580C", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", maxWidth: 320 }} aria-hidden>
          {[-6, -4, -2, 2, 4, 6].map(v => {
            const sx = toSx(v), sy = toSy(v);
            return <g key={v}><line x1={sx} y1={0} x2={sx} y2={S} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} /><line x1={0} y1={sy} x2={S} y2={sy} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} /></g>;
          })}
          <line x1={0} y1={oy} x2={S} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={ox} y1={0} x2={ox} y2={S} stroke="#94a3b8" strokeWidth={1.2} />
          {valid && (
            <>
              <circle cx={cxS} cy={cyS} r={rS} fill="rgba(234,88,12,0.08)" stroke="#EA580C" strokeWidth={2.5} />
              <circle cx={cxS} cy={cyS} r={5} fill="#EA580C" />
            </>
          )}
          {!valid && (
            <text x={S / 2} y={S / 2} fontSize={14} fill="#dc2626" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>מעגל לא קיים</text>
          )}
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "מרכז", val: `(${cx.toFixed(1)}, ${cy.toFixed(1)})`, color: "#EA580C" },
          { label: "רדיוס", val: valid ? r.toFixed(2) : "--", color: "#b45309" },
          { label: "תנאי קיום", val: condition, color: valid ? "#16a34a" : "#dc2626" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(234,88,12,0.25)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 11, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        שנו D, E, F וראו איך המרכז והרדיוס משתנים. נסו למצוא ערכים שגורמים למעגל להיעלם.
      </p>
    </section>
  );
}

// ─── TangentLab (advanced) ────────────────────────────────────────────────────

function TangentLab() {
  const [angle, setAngle] = useState(45);
  const [R, setR] = useState(4);

  const rad = (angle * Math.PI) / 180;
  const px = R * Math.cos(rad);
  const py = R * Math.sin(rad);

  // Slope of radius from (0,0) to (px, py)
  const slopeR = px !== 0 ? py / px : Infinity;
  // Slope of tangent = -1/slopeR
  const slopeT = slopeR === 0 ? Infinity : px !== 0 ? -px / py : 0;

  const S = 260;
  const range = 8;
  const xMin = -range, xMax = range, yMin = -range, yMax = range;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * S;
  const toSy = (y: number) => S - ((y - yMin) / (yMax - yMin)) * S;
  const scale = S / (xMax - xMin);
  const ox = toSx(0), oy = toSy(0);
  const rS = R * scale;
  const pxS = toSx(px), pyS = toSy(py);

  // Tangent line segment
  const tangLen = 4;
  let tx1: number, ty1: number, tx2: number, ty2: number;
  if (slopeT === Infinity || Math.abs(slopeT) > 1000) {
    tx1 = toSx(px); ty1 = toSy(py - tangLen);
    tx2 = toSx(px); ty2 = toSy(py + tangLen);
  } else {
    tx1 = toSx(px - tangLen / Math.sqrt(1 + slopeT * slopeT));
    ty1 = toSy(py - slopeT * tangLen / Math.sqrt(1 + slopeT * slopeT));
    tx2 = toSx(px + tangLen / Math.sqrt(1 + slopeT * slopeT));
    ty2 = toSy(py + slopeT * tangLen / Math.sqrt(1 + slopeT * slopeT));
  }

  const slopeRStr = slopeR === Infinity ? "\u221E" : slopeR.toFixed(2);
  const slopeTStr = slopeT === Infinity ? "\u221E" : slopeT.toFixed(2);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; מעבדת משיק</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        מעגל ברדיוס <span style={{ color: "#DC2626", fontWeight: 700 }}>{R}</span> עם משיק בזווית <span style={{ color: "#DC2626", fontWeight: 700 }}>{angle}&deg;</span>
      </p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "זווית הנקודה (\u00B0)", val: angle, min: 0, max: 355, step: 5, set: setAngle },
          { label: "רדיוס R", val: R, min: 1, max: 6, step: 0.5, set: setR },
        ].map(sl => (
          <div key={sl.label} style={{ borderRadius: 16, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.6)", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: "#DC2626", fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e => sl.set(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(220,38,38,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", maxWidth: 320 }} aria-hidden>
          {[-6, -4, -2, 2, 4, 6].map(v => {
            const sx = toSx(v), sy = toSy(v);
            return <g key={v}><line x1={sx} y1={0} x2={sx} y2={S} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} /><line x1={0} y1={sy} x2={S} y2={sy} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} /></g>;
          })}
          <line x1={0} y1={oy} x2={S} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={ox} y1={0} x2={ox} y2={S} stroke="#94a3b8" strokeWidth={1.2} />
          {/* Circle */}
          <circle cx={ox} cy={oy} r={rS} fill="rgba(220,38,38,0.06)" stroke="#DC2626" strokeWidth={2.5} />
          {/* Radius line */}
          <line x1={ox} y1={oy} x2={pxS} y2={pyS} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />
          {/* Tangent line */}
          <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#a78bfa" strokeWidth={2.5} />
          {/* Point on circle */}
          <circle cx={pxS} cy={pyS} r={5} fill="#DC2626" />
          {/* Center */}
          <circle cx={ox} cy={oy} r={4} fill="#64748b" />
          {/* Right angle marker */}
          <rect x={pxS - 4} y={pyS - 4} width={8} height={8} fill="none" stroke="#34d399" strokeWidth={1.5} transform={`rotate(${-angle + 45}, ${pxS}, ${pyS})`} />
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "נקודה", val: `(${px.toFixed(1)}, ${py.toFixed(1)})`, color: "#DC2626" },
          { label: "שיפוע רדיוס", val: slopeRStr, color: "#f59e0b" },
          { label: "שיפוע משיק", val: slopeTStr, color: "#a78bfa" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(220,38,38,0.25)", padding: 14 }}>
            <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        שימו לב: מכפלת שיפועי הרדיוס והמשיק תמיד שווה ל-(-1) -- הם ניצבים זה לזה
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CirclePage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משוואת המעגל עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>משוואה תקנית, צורה כללית, מעגל דרך 3 נקודות ומשיק -- ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/analytic"
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

        <SubtopicProgress subtopicId="analytic/circle" />

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

        {/* Lab per level */}
        {selectedLevel === "basic" && <CircleLab />}
        {selectedLevel === "medium" && <GeneralFormLab />}
        {selectedLevel === "advanced" && <TangentLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="analytic/circle" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
