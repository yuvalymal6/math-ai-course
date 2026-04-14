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

function BasicCircleDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מעגל -- מרכז ורדיוס</p>
      <svg width="100%" viewBox="0 0 280 200" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={30} y1={170} x2={260} y2={170} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={50} y1={190} x2={50} y2={20} stroke="#cbd5e1" strokeWidth={1} />
        <text x={264} y={174} fill="#94a3b8" fontSize={11}>x</text>
        <text x={44} y={16} fill="#94a3b8" fontSize={11}>y</text>
        {/* Circle */}
        <circle cx={155} cy={100} r={65} fill="none" stroke="#16a34a" strokeWidth={1.8} />
        {/* Center dot */}
        <circle cx={155} cy={100} r={3.5} fill="#16a34a" />
        <text x={161} y={96} fill="#16a34a" fontSize={12} fontWeight={700}>O</text>
        {/* Radius dashed */}
        <line x1={155} y1={100} x2={220} y2={100} stroke="#16a34a" strokeWidth={1.3} strokeDasharray="4,3" />
        <text x={185} y={93} fill="#16a34a" fontSize={11} fontWeight={600}>R</text>
      </svg>
    </div>
  );
}

function MediumCircleDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>מעגל, משיק ונקודת השקה</p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        {/* Circle */}
        <circle cx={130} cy={120} r={60} fill="none" stroke="#ea580c" strokeWidth={1.8} />
        {/* Center */}
        <circle cx={130} cy={120} r={3.5} fill="#ea580c" />
        <text x={136} y={116} fill="#ea580c" fontSize={12} fontWeight={700}>O</text>
        {/* Tangent point T on circle */}
        <circle cx={178} cy={82} r={3.5} fill="#ea580c" />
        <text x={183} y={78} fill="#ea580c" fontSize={12} fontWeight={700}>T</text>
        {/* Radius to T */}
        <line x1={130} y1={120} x2={178} y2={82} stroke="#ea580c" strokeWidth={1.2} strokeDasharray="4,3" />
        {/* Tangent line through T */}
        <line x1={145} y1={40} x2={240} y2={130} stroke="#ea580c" strokeWidth={1.5} />
        {/* Point P outside */}
        <circle cx={230} cy={122} r={3.5} fill="#ea580c" />
        <text x={235} y={118} fill="#ea580c" fontSize={12} fontWeight={700}>P</text>
        {/* Right angle marker at T */}
        <polyline points="170,76 164,82 170,88" fill="none" stroke="#64748b" strokeWidth={1} />
      </svg>
    </div>
  );
}

function AdvancedCircleDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>שני מעגלים ומרחק בין מרכזים</p>
      <svg width="100%" viewBox="0 0 320 200" style={{ maxWidth: "100%" }}>
        {/* Larger circle */}
        <circle cx={140} cy={105} r={70} fill="none" stroke="#dc2626" strokeWidth={1.8} />
        <circle cx={140} cy={105} r={3.5} fill="#dc2626" />
        <text x={126} y={100} fill="#dc2626" fontSize={12} fontWeight={700}>O&#8321;</text>
        {/* Smaller circle */}
        <circle cx={200} cy={95} r={40} fill="none" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5,3" />
        <circle cx={200} cy={95} r={3.5} fill="#dc2626" />
        <text x={206} y={90} fill="#dc2626" fontSize={12} fontWeight={700}>O&#8322;</text>
        {/* Distance between centers */}
        <line x1={140} y1={105} x2={200} y2={95} stroke="#dc2626" strokeWidth={1.2} strokeDasharray="4,3" />
        <text x={163} y={88} fill="#dc2626" fontSize={10} fontWeight={600}>d</text>
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
        subjectWords={["מעגל", "מרכז", "רדיוס", "משוואה", "ישר", "חיתוך"]}
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
  const [activeTab, setActiveTab] = useState<"canonical" | "general" | "distance" | "tangent" | null>(null);

  const tabs = [
    { id: "canonical" as const, label: "משוואה קנונית",   tex: "(x-a)^2+(y-b)^2=R^2", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "general" as const,   label: "משוואה כללית",    tex: "x^2+y^2+Dx+Ey+F=0",   color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "distance" as const,  label: "מרחק ממרכז",      tex: "d=\\sqrt{\\cdots}",     color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "tangent" as const,   label: "משיק",            tex: "\\ell \\perp R",         color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Canonical */}
      {activeTab === "canonical" && (
        <motion.div key="canonical" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(x - a)^2 + (y - b)^2 = R^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> משוואת מעגל בצורה קנונית (סטנדרטית).
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>המרכז הוא הנקודה <InlineMath>{"(a, b)"}</InlineMath>.</li>
                  <li>הרדיוס הוא <InlineMath>{"R"}</InlineMath> (שורש של אגף ימין).</li>
                  <li>שימו לב לסימנים: אם כתוב <InlineMath>{"(x+3)"}</InlineMath> אז <InlineMath>{"a = -3"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; מרכז <InlineMath>{"(a, b)"}</InlineMath> ורדיוס <InlineMath>{"R"}</InlineMath> -- כל המידע על המעגל בנוסחה אחת.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: General */}
      {activeTab === "general" && (
        <motion.div key="general" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"x^2 + y^2 + Dx + Ey + F = 0"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> משוואה כללית של מעגל. ממנה מוצאים מרכז ורדיוס:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"a = -\\frac{D}{2}"}</InlineMath>, &nbsp;<InlineMath>{"b = -\\frac{E}{2}"}</InlineMath></li>
                  <li><InlineMath>{"R = \\sqrt{a^2 + b^2 - F}"}</InlineMath></li>
                  <li>תנאי קיום: <InlineMath>{"a^2 + b^2 - F > 0"}</InlineMath></li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; מעבר מכללית לקנונית = השלמה לריבוע ב-x וב-y.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Distance */}
      {activeTab === "distance" && (
        <motion.div key="distance" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"d = \\sqrt{(x_0 - a)^2 + (y_0 - b)^2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> מרחק נקודה <InlineMath>{"(x_0, y_0)"}</InlineMath> ממרכז המעגל <InlineMath>{"(a, b)"}</InlineMath>:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"d < R"}</InlineMath> -- הנקודה בתוך המעגל.</li>
                  <li><InlineMath>{"d = R"}</InlineMath> -- הנקודה על המעגל.</li>
                  <li><InlineMath>{"d > R"}</InlineMath> -- הנקודה מחוץ למעגל.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; השוו את <InlineMath>{"d"}</InlineMath> ל-<InlineMath>{"R"}</InlineMath> כדי לקבוע את מיקום הנקודה ביחס למעגל.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Tangent */}
      {activeTab === "tangent" && (
        <motion.div key="tangent" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"(x_0 - a)(x - a) + (y_0 - b)(y - b) = R^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> משוואת המשיק למעגל בנקודה <InlineMath>{"(x_0, y_0)"}</InlineMath> שעל המעגל:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הנקודה <InlineMath>{"(x_0, y_0)"}</InlineMath> חייבת להיות על המעגל.</li>
                  <li>המשיק מאונך לרדיוס בנקודת ההשקה.</li>
                  <li>מכפלת שיפועים של רדיוס ומשיק = <InlineMath>{"-1"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; לפני שכותבים משיק -- ודאו שהנקודה באמת על המעגל!
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
    title: "מעגל -- מרכז, רדיוס ומיקום נקודה",
    problem: "נתונה משוואת המעגל: x\u00B2 + y\u00B2 \u2212 6x + 4y \u2212 12 = 0.\n\n\u05D0. מצאו את מרכז המעגל ואת הרדיוס.\n\u05D1. בדקו האם הנקודה A(5, 1) נמצאת על המעגל, בתוכו או מחוצה לו.\n\u05D2. מצאו את נקודות החיתוך של המעגל עם ציר x.",
    diagram: <BasicCircleDiagram />,
    pitfalls: [
      { title: "השלמה לריבוע: x\u00B2\u22126x = (x\u22123)\u00B2\u22129 ו-y\u00B2+4y = (y+2)\u00B2\u22124", text: "אל תשכחו את הסימנים -- כשמשלימים לריבוע, המספר שמפחיתים הוא תמיד חיובי." },
      { title: "R\u00B2 = 9 + 4 + 12 = 25, לכן R = 5", text: "אל תשכחו להוסיף את F עם הסימן ההפוך (F = \u221212, לכן מוסיפים +12)." },
      { title: "חיתוך עם ציר x: הציבו y = 0 ופתרו", text: "הציבו y = 0 במשוואת המעגל וקבלו משוואה ריבועית ב-x. אל תציבו y = R!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nנתונה משוואת המעגל: x\u00B2 + y\u00B2 \u2212 6x + 4y \u2212 12 = 0.\nאני צריך:\n1. למצוא מרכז ורדיוס (השלמה לריבוע)\n2. לבדוק מיקום נקודה ביחס למעגל\n3. למצוא חיתוך עם ציר x\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- מרכז ורדיוס",
        coaching: "בצע השלמה לריבוע ב-x וב-y",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nנתונה משוואת מעגל: x\u00B2 + y\u00B2 \u2212 6x + 4y \u2212 12 = 0. תנחה אותי למצוא מרכז ורדיוס בעזרת השלמה לריבוע. שאל: איך משלימים לריבוע את x\u00B2 \u2212 6x? מה קורה עם הסימנים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מעגל", "מרכז", "רדיוס"],
        keywordHint: "ציין שמדובר במציאת מרכז ורדיוס של מעגל",
        contextWords: ["מעגל", "מרכז", "רדיוס", "השלמה לריבוע", "חיתוך", "ציר"],
        stationWords: ["מעגל", "מרכז", "רדיוס"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- מיקום נקודה",
        coaching: "חשב מרחק מהמרכז והשווה ל-R",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nמצאתי את מרכז המעגל ואת הרדיוס. הנקודה A(5, 1). תנחה אותי לבדוק אם היא בתוך המעגל, עליו או מחוצה לו. שאל: איך מחשבים מרחק? למה משווים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מרחק", "נקודה", "השוואה"],
        keywordHint: "ציין שצריך לחשב מרחק ולהשוות לרדיוס",
        contextWords: ["מעגל", "מרכז", "רדיוס", "השלמה לריבוע", "חיתוך", "ציר"],
        stationWords: ["מעגל", "מרכז", "רדיוס"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- חיתוך עם ציר x",
        coaching: "הצב y = 0 ופתור משוואה ריבועית",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nאני צריך למצוא את נקודות החיתוך של המעגל עם ציר x. תנחה אותי: מה מציבים? איזו משוואה מקבלים? איך פותרים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חיתוך", "ציר", "הצב"],
        keywordHint: "ציין שמציבים y = 0 ופותרים",
        contextWords: ["מעגל", "מרכז", "רדיוס", "השלמה לריבוע", "חיתוך", "ציר"],
        stationWords: ["מעגל", "מרכז", "רדיוס"],
      },
    ],
  },
  {
    id: "medium",
    title: "מעגל -- משוואה ומשיק",
    problem: "מעגל עם מרכז O(2, \u22123) ורדיוס R = 5.\n\n\u05D0. כתבו את משוואת המעגל בצורה קנונית ובצורה כללית.\n\u05D1. הנקודה T(5, 1) נמצאת על המעגל. מצאו את משוואת המשיק במעגל בנקודה T.\n\u05D2. מצאו את שיפוע הרדיוס OT.\n\u05D3. ודאו שהמשיק מאונך לרדיוס OT.",
    diagram: <MediumCircleDiagram />,
    pitfalls: [
      { title: "צורה קנונית: (x\u22122)\u00B2 + (y+3)\u00B2 = 25", text: "שימו לב: y \u2212 (\u22123) = y + 3. הסימן בנוסחה הפוך לסימן הקואורדינטה." },
      { title: "שיפוע OT = (1\u2212(\u22123))/(5\u22122) = 4/3", text: "שיפוע המשיק צריך להיות \u22123/4 (מכפלת שיפועים של ניצבים = \u22121)." },
      { title: "לפני שכותבים משיק -- ודאו שהנקודה על המעגל!", text: "הציבו T(5,1) במשוואת המעגל: (5\u22122)\u00B2 + (1+3)\u00B2 = 9 + 16 = 25. אם לא יוצא R\u00B2, הנקודה לא על המעגל." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nמעגל עם מרכז O(2, \u22123) ורדיוס R = 5.\nאני צריך:\n1. לכתוב משוואה קנונית וכללית\n2. למצוא משוואת משיק בנקודה T(5, 1)\n3. למצוא שיפוע OT ולוודא ניצבות\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- משוואה קנונית וכללית",
        coaching: "הצב מרכז ורדיוס בנוסחה, ואז פתח סוגריים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nמעגל עם מרכז O(2, \u22123) ורדיוס 5. תנחה אותי לכתוב את המשוואה בצורה קנונית ואז לפתוח סוגריים לצורה כללית. שאל: מה הנוסחה? איך מציבים מרכז שלילי? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["קנונית", "כללית", "משוואה"],
        keywordHint: "ציין שצריך לכתוב את המשוואה בשתי צורות",
        contextWords: ["משיק", "קנונית", "שיפוע", "ניצב", "רדיוס", "מעגל"],
        stationWords: ["משיק", "קנונית", "מעגל"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- משוואת המשיק",
        coaching: "השתמש בנוסחת המשיק או מצא שיפוע ומשוואת ישר",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nמעגל (x\u22122)\u00B2 + (y+3)\u00B2 = 25. הנקודה T(5, 1) על המעגל. תנחה אותי למצוא את משוואת המשיק. שאל: איך מוודאים שהנקודה על המעגל? מה שיפוע הרדיוס OT? מה שיפוע המשיק? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["משיק", "שיפוע", "ניצב"],
        keywordHint: "ציין שהמשיק ניצב לרדיוס",
        contextWords: ["משיק", "קנונית", "שיפוע", "ניצב", "רדיוס", "מעגל"],
        stationWords: ["משיק", "קנונית", "מעגל"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- שיפוע הרדיוס OT",
        coaching: "חשב שיפוע OT מנוסחת שיפוע",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nמרכז O(2, \u22123) ונקודה T(5, 1). תנחה אותי לחשב את שיפוע OT. שאל: מה הנוסחה? איך מחשבים כשיש ערכים שליליים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שיפוע", "OT", "נוסחה"],
        keywordHint: "ציין שצריך לחשב שיפוע בנוסחה",
        contextWords: ["משיק", "קנונית", "שיפוע", "ניצב", "רדיוס", "מעגל"],
        stationWords: ["משיק", "קנונית", "מעגל"],
      },
      {
        phase: "\u05D3",
        label: "סעיף ד\u2019 -- אימות ניצבות",
        coaching: "בדוק שמכפלת שיפועים = \u22121",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nשיפוע הרדיוס OT ושיפוע המשיק ידועים. תנחה אותי לוודא שהם מאונכים. שאל: מה התנאי לניצבות? מה מכפלת השיפועים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["ניצב", "מכפלה", "שיפועים"],
        keywordHint: "ציין שמכפלת שיפועי ניצבים = \u22121",
        contextWords: ["משיק", "קנונית", "שיפוע", "ניצב", "רדיוס", "מעגל"],
        stationWords: ["משיק", "קנונית", "מעגל"],
      },
    ],
  },
  {
    id: "advanced",
    title: "מעגל -- מציאה מתנאים",
    problem: "מעגל עובר דרך הנקודות A(1, 2) ו-B(5, 4), ומרכזו על הישר y = x.\n\n\u05D0. מצאו את מרכז המעגל.\n\u05D1. חשבו את הרדיוס.\n\u05D2. כתבו את משוואת המעגל.\n\u05D3. מצאו את נקודות החיתוך של המעגל עם הישר y = x + 1.",
    diagram: <AdvancedCircleDiagram />,
    pitfalls: [
      { title: "המרכז על y = x, כלומר (a, a)", text: "המרחק מ-(a, a) ל-A שווה למרחק מ-(a, a) ל-B, כי שתיהן על המעגל." },
      { title: "(a\u22121)\u00B2 + (a\u22122)\u00B2 = (a\u22125)\u00B2 + (a\u22124)\u00B2", text: "פתחו סוגריים ופתרו -- איברי a\u00B2 מצטמצמים ונשארת משוואה מדרגה ראשונה." },
      { title: "חיתוך עם ישר: הציבו y = x + 1 במשוואת המעגל", text: "קבלו משוואה ריבועית ב-x בלבד ופתרו. זכרו לחשב גם את y עבור כל x." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- מציאת המרכז",
        coaching: "השתמש בתנאי: מרכז על y = x ומרחקים שווים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nמעגל עובר דרך A(1, 2) ו-B(5, 4), מרכזו על y = x. תנחה אותי למצוא את המרכז. שאל: אם המרכז (a, a), מה התנאי על המרחקים? איזו משוואה נקבל? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מרכז", "מרחק", "ישר"],
        keywordHint: "ציין שהמרכז על y = x ושהמרחקים שווים",
        contextWords: ["מרכז", "ישר", "מרחק", "משוואה", "חיתוך", "נקודות"],
        stationWords: ["מרכז", "ישר", "מעגל"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- חישוב הרדיוס",
        coaching: "חשב מרחק מהמרכז לאחת הנקודות",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nמצאתי את מרכז המעגל. תנחה אותי לחשב את הרדיוס. שאל: איך מחשבים מרחק? באיזו נקודה להשתמש? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["רדיוס", "מרחק", "נקודה"],
        keywordHint: "ציין שהרדיוס = מרחק מהמרכז לנקודה על המעגל",
        contextWords: ["מרכז", "ישר", "מרחק", "משוואה", "חיתוך", "נקודות"],
        stationWords: ["מרכז", "ישר", "מעגל"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- משוואת המעגל",
        coaching: "הצב מרכז ורדיוס בנוסחה הקנונית",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nיש לי מרכז ורדיוס. תנחה אותי לכתוב את משוואת המעגל בצורה קנונית. שאל: מה הנוסחה? מה מציבים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["משוואה", "קנונית", "הצב"],
        keywordHint: "ציין שמציבים מרכז ורדיוס בנוסחה",
        contextWords: ["מרכז", "ישר", "מרחק", "משוואה", "חיתוך", "נקודות"],
        stationWords: ["מרכז", "ישר", "מעגל"],
      },
      {
        phase: "\u05D3",
        label: "סעיף ד\u2019 -- חיתוך עם ישר",
        coaching: "הצב y = x + 1 במשוואת המעגל",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nאני צריך למצוא חיתוך של המעגל עם y = x + 1. תנחה אותי: מה מציבים ואיפה? איזו משוואה מקבלים? מה עושים עם הפתרונות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חיתוך", "הצבה", "ריבועית"],
        keywordHint: "ציין שמציבים את משוואת הישר במשוואת המעגל",
        contextWords: ["מרכז", "ישר", "מרחק", "משוואה", "חיתוך", "נקודות"],
        stationWords: ["מרכז", "ישר", "מעגל"],
      },
    ],
  },
];

// ─── Circle Lab ──────────────────────────────────────────────────────────────

function CircleLab() {
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const [r, setR]   = useState(3);

  // Computed values
  const D = -2 * cx;
  const E = -2 * cy;
  const F = cx * cx + cy * cy - r * r;
  const area = Math.PI * r * r;
  const circumference = 2 * Math.PI * r;

  // SVG coordinate system: map math coords to SVG coords
  const svgW = 300, svgH = 300;
  const scale = 25; // pixels per unit
  const originX = svgW / 2;
  const originY = svgH / 2;
  const toSvgX = (x: number) => originX + x * scale;
  const toSvgY = (y: number) => originY - y * scale;

  const isDefault = cx === 0 && cy === 0 && r === 3;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת מעגל</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />R = {r.toFixed(1)}</span>
      </div>

      {/* SVG -- coordinate grid with circle */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Grid lines */}
          {Array.from({ length: 11 }, (_, i) => i - 5).map(v => (
            <React.Fragment key={`grid-${v}`}>
              <line x1={toSvgX(v)} y1={0} x2={toSvgX(v)} y2={svgH} stroke={v === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={v === 0 ? 1.2 : 0.5} />
              <line x1={0} y1={toSvgY(v)} x2={svgW} y2={toSvgY(v)} stroke={v === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={v === 0 ? 1.2 : 0.5} />
              {v !== 0 && (
                <>
                  <text x={toSvgX(v)} y={originY + 14} textAnchor="middle" fill="#94a3b8" fontSize={8}>{v}</text>
                  <text x={originX - 10} y={toSvgY(v) + 3} textAnchor="middle" fill="#94a3b8" fontSize={8}>{v}</text>
                </>
              )}
            </React.Fragment>
          ))}
          {/* Axis labels */}
          <text x={svgW - 10} y={originY - 6} fill="#64748b" fontSize={10} fontWeight={600}>x</text>
          <text x={originX + 8} y={14} fill="#64748b" fontSize={10} fontWeight={600}>y</text>

          {/* Circle */}
          <circle cx={toSvgX(cx)} cy={toSvgY(cy)} r={r * scale} fill="rgba(22,163,74,0.06)" stroke="#16a34a" strokeWidth={1.8} />
          {/* Center dot */}
          <circle cx={toSvgX(cx)} cy={toSvgY(cy)} r={3.5} fill="#16a34a" />
          <text x={toSvgX(cx) + 8} y={toSvgY(cy) - 6} fill="#16a34a" fontSize={10} fontWeight={700}>O({cx},{cy})</text>
          {/* Radius line */}
          <line x1={toSvgX(cx)} y1={toSvgY(cy)} x2={toSvgX(cx + r)} y2={toSvgY(cy)} stroke="#16a34a" strokeWidth={1.3} strokeDasharray="4,3" />
          <text x={toSvgX(cx + r / 2)} y={toSvgY(cy) - 6} textAnchor="middle" fill="#16a34a" fontSize={9} fontWeight={600}>R</text>
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>מרכז x</span>
            <span style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{cx.toFixed(1)}</span>
          </div>
          <input type="range" min={-5} max={5} step={0.5} value={cx}
            onChange={e => setCx(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>מרכז y</span>
            <span style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{cy.toFixed(1)}</span>
          </div>
          <input type="range" min={-5} max={5} step={0.5} value={cy}
            onChange={e => setCy(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#7c3aed" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>רדיוס R</span>
            <span style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{r.toFixed(1)}</span>
          </div>
          <input type="range" min={1} max={8} step={0.5} value={r}
            onChange={e => setR(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        </div>
      </div>

      {/* Equations display */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>צורה קנונית</p>
          <p style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700, fontSize: 12 }}>
            (x{cx >= 0 ? `\u2212${cx}` : `+${Math.abs(cx)}`}){"\u00B2"} + (y{cy >= 0 ? `\u2212${cy}` : `+${Math.abs(cy)}`}){"\u00B2"} = {(r * r).toFixed(1)}
          </p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>צורה כללית</p>
          <p style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700, fontSize: 12 }}>
            x{"\u00B2"} + y{"\u00B2"}{D >= 0 ? ` + ${D.toFixed(0)}x` : ` \u2212 ${Math.abs(D).toFixed(0)}x`}{E >= 0 ? ` + ${E.toFixed(0)}y` : ` \u2212 ${Math.abs(E).toFixed(0)}y`}{F >= 0 ? ` + ${F.toFixed(1)}` : ` \u2212 ${Math.abs(F).toFixed(1)}`} = 0
          </p>
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>מרכז</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>({cx.toFixed(1)}, {cy.toFixed(1)})</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>R</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{r.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>{"\u03C0"}R{"\u00B2"} (שטח)</p>
          <p style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{area.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>2{"\u03C0"}R (היקף)</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{circumference.toFixed(1)}</p>
        </div>
      </div>

      <LabMessage text="שנו את המרכז והרדיוס וראו כיצד המשוואה משתנה" type="success" visible={isDefault} />
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מעגל עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>משוואת מעגל, מרכז ורדיוס, משיק למעגל</p>
          </div>
          <Link
            href="/3u/topic/grade12/analytic"
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

        <SubtopicProgress subtopicId="3u/grade12/analytic/circle" />

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
        <CircleLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade12/analytic/circle" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
