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

function BasicParabolaDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>פרבולה פתוחה כלפי מעלה -- קדקוד ונקודות חיתוך</p>
      <svg width="100%" viewBox="0 0 280 200" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={20} y1={160} x2={260} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
        <line x1={140} y1={15} x2={140} y2={185} stroke="#94a3b8" strokeWidth={1.2} />
        <text x={265} y={163} fill="#94a3b8" fontSize={10}>x</text>
        <text x={143} y={13} fill="#94a3b8" fontSize={10}>y</text>
        {/* Parabola (U shape) */}
        <path d="M 50,40 Q 140,210 230,40" fill="none" stroke="#16a34a" strokeWidth={2} />
        {/* Vertex dot */}
        <circle cx={140} cy={155} r={5} fill="#16a34a" opacity={0.9} />
        <text x={140} y={175} textAnchor="middle" fill="#16a34a" fontSize={10} fontWeight={600}>קדקוד</text>
        {/* X-intercept dots */}
        <circle cx={80} cy={104} r={4} fill="#16a34a" opacity={0.7} />
        <circle cx={200} cy={104} r={4} fill="#16a34a" opacity={0.7} />
        {/* Y-intercept dot */}
        <circle cx={140} cy={68} r={4} fill="#64748b" opacity={0.6} />
      </svg>
    </div>
  );
}

function MediumParabolaDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>פרבולה פתוחה כלפי מטה -- ציר סימטריה</p>
      <svg width="100%" viewBox="0 0 280 200" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={20} y1={150} x2={260} y2={150} stroke="#94a3b8" strokeWidth={1.2} />
        <line x1={50} y1={15} x2={50} y2={185} stroke="#94a3b8" strokeWidth={1.2} />
        <text x={265} y={153} fill="#94a3b8" fontSize={10}>x</text>
        <text x={53} y={13} fill="#94a3b8" fontSize={10}>y</text>
        {/* Parabola (inverted U) */}
        <path d="M 30,170 Q 160,-20 270,170" fill="none" stroke="#ea580c" strokeWidth={2} />
        {/* Vertex dot at top */}
        <circle cx={155} cy={40} r={5} fill="#ea580c" opacity={0.9} />
        <text x={155} y={30} textAnchor="middle" fill="#ea580c" fontSize={10} fontWeight={600}>קדקוד</text>
        {/* Axis of symmetry dashed */}
        <line x1={155} y1={20} x2={155} y2={180} stroke="#ea580c" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
        {/* X-intercept dots */}
        <circle cx={68} cy={150} r={4} fill="#ea580c" opacity={0.7} />
        <circle cx={240} cy={150} r={4} fill="#ea580c" opacity={0.7} />
        {/* Y-intercept dot */}
        <circle cx={50} cy={158} r={4} fill="#64748b" opacity={0.6} />
      </svg>
    </div>
  );
}

function AdvancedParabolaDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>שתי פרבולות חותכות -- מציאת נקודות חיתוך</p>
      <svg width="100%" viewBox="0 0 280 210" style={{ maxWidth: "100%" }}>
        {/* Axes */}
        <line x1={20} y1={160} x2={260} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
        <line x1={60} y1={10} x2={60} y2={195} stroke="#94a3b8" strokeWidth={1.2} />
        <text x={265} y={163} fill="#94a3b8" fontSize={10}>x</text>
        <text x={63} y={10} fill="#94a3b8" fontSize={10}>y</text>
        {/* Parabola opening up */}
        <path d="M 30,60 Q 140,220 250,60" fill="none" stroke="#dc2626" strokeWidth={2} />
        <text x={245} y={55} fill="#dc2626" fontSize={9} fontWeight={600}>f</text>
        {/* Line (linear function g) */}
        <line x1={30} y1={155} x2={250} y2={65} stroke="#64748b" strokeWidth={1.5} strokeDasharray="5,3" />
        <text x={252} y={62} fill="#64748b" fontSize={9} fontWeight={600}>g</text>
        {/* Intersection dots */}
        <circle cx={95} cy={138} r={5} fill="#dc2626" opacity={0.85} />
        <circle cx={210} cy={84} r={5} fill="#dc2626" opacity={0.85} />
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
        subjectWords={["פרבולה", "קדקוד", "שורשים", "פרמטרים", "חיתוך", "פונקציה"]}
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
  const [activeTab, setActiveTab] = useState<"general" | "vertex" | "xintercept" | "discriminant" | null>(null);

  const tabs = [
    { id: "general" as const,       label: "צורה כללית",      tex: "y = ax^2 + bx + c",                          color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "vertex" as const,        label: "קדקוד",            tex: "x_v = \\frac{-b}{2a}",                        color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "xintercept" as const,    label: "חיתוך עם ציר x",  tex: "x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}",     color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "discriminant" as const,  label: "דיסקרימיננטה",     tex: "\\Delta = b^2 - 4ac",                          color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: General form */}
      {activeTab === "general" && (
        <motion.div key="general" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"y = ax^2 + bx + c"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הצורה הכללית של פונקציה ריבועית.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"a"}</InlineMath> קובע את כיוון הפתיחה: <InlineMath>{"a > 0"}</InlineMath> כלפי מעלה, <InlineMath>{"a < 0"}</InlineMath> כלפי מטה.</li>
                  <li><InlineMath>{"c"}</InlineMath> הוא חיתוך עם ציר <InlineMath>{"y"}</InlineMath> -- הנקודה <InlineMath>{"(0, c)"}</InlineMath>.</li>
                  <li>ככל ש-<InlineMath>{"|a|"}</InlineMath> גדול יותר, הפרבולה צרה יותר.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: <InlineMath>{"y = 2x^2 - 4x + 1"}</InlineMath> -- פרבולה צרה, פתוחה כלפי מעלה, חותכת את ציר y ב-<InlineMath>{"(0,1)"}</InlineMath>.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Vertex */}
      {activeTab === "vertex" && (
        <motion.div key="vertex" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"x_v = \\frac{-b}{2a},\\quad y_v = f(x_v)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הקדקוד הוא נקודת המינימום או המקסימום של הפרבולה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מוצאים את <InlineMath>{"x_v"}</InlineMath> לפי הנוסחה <InlineMath>{"\\frac{-b}{2a}"}</InlineMath>.</li>
                  <li>מציבים את <InlineMath>{"x_v"}</InlineMath> בפונקציה כדי למצוא את <InlineMath>{"y_v"}</InlineMath>.</li>
                  <li>אם <InlineMath>{"a > 0"}</InlineMath> -- מינימום. אם <InlineMath>{"a < 0"}</InlineMath> -- מקסימום.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: הקדקוד נמצא תמיד על ציר הסימטריה <InlineMath>{"x = \\frac{-b}{2a}"}</InlineMath>.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: X-intercept */}
      {activeTab === "xintercept" && (
        <motion.div key="xintercept" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הנוסחה הריבועית למציאת נקודות חיתוך עם ציר x.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אם <InlineMath>{"\\Delta > 0"}</InlineMath> -- שתי נקודות חיתוך.</li>
                  <li>אם <InlineMath>{"\\Delta = 0"}</InlineMath> -- נקודת חיתוך אחת (הפרבולה משיקה לציר).</li>
                  <li>אם <InlineMath>{"\\Delta < 0"}</InlineMath> -- אין נקודות חיתוך עם ציר x.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: לפני שמציבים בנוסחה, בדקו אם אפשר לפרק לגורמים -- לפעמים זה מהיר יותר!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Discriminant */}
      {activeTab === "discriminant" && (
        <motion.div key="discriminant" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\Delta = b^2 - 4ac"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הדיסקרימיננטה קובעת כמה נקודות חיתוך יש עם ציר x.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"\\Delta > 0"}</InlineMath> -- שני שורשים שונים (שתי נקודות חיתוך).</li>
                  <li><InlineMath>{"\\Delta = 0"}</InlineMath> -- שורש כפול (נקודת השקה).</li>
                  <li><InlineMath>{"\\Delta < 0"}</InlineMath> -- אין שורשים ממשיים (הפרבולה לא חותכת את ציר x).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: חשבו את <InlineMath>{"\\Delta"}</InlineMath> תמיד לפני שמציבים בנוסחה הריבועית -- זה חוסך טעויות.
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
    title: "פרבולה פתוחה כלפי מעלה -- שורשים וקדקוד",
    problem: "נתונה הפונקציה f(x) = x\u00B2 \u2212 4x + 3.\n\n\u05D0. מצאו את נקודות החיתוך עם ציר x.\n\u05D1. מצאו את הקדקוד של הפרבולה.\n\u05D2. מהי נקודת החיתוך עם ציר y?",
    diagram: <BasicParabolaDiagram />,
    pitfalls: [
      { title: "חיתוך עם ציר x", text: "הציבו y=0 ופתרו x\u00B2\u22124x+3=0 -- פירוק לגורמים או נוסחה ריבועית." },
      { title: "קדקוד -- אל תשכחו את y", text: "x = \u2212b/2a = 4/2 = 2 -- אל תשכחו להציב חזרה כדי למצוא y." },
      { title: "חיתוך עם ציר y", text: "הציבו x=0 \u2192 y = c = 3 -- זו תמיד הנקודה (0, c)." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 f(x) = x\u00B2 \u2212 4x + 3.\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA:\n1. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x\n2. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3\n3. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 y\n\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x",
        coaching: "\u05D4\u05E6\u05D9\u05D1\u05D5 y=0 \u05D5\u05E4\u05EA\u05E8\u05D5",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B2 \u2212 4x + 3. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05DE\u05E6\u05D9\u05D1\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05D7\u05D9\u05EA\u05D5\u05DA", "\u05E6\u05D9\u05E8"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05DE\u05D3\u05D5\u05D1\u05E8 \u05D1\u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x",
        contextWords: ["\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D7\u05D9\u05EA\u05D5\u05DA", "\u05E6\u05D9\u05E8", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D4\u05E6\u05D1\u05D4"],
        stationWords: ["\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D7\u05D9\u05EA\u05D5\u05DA"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05E7\u05D3\u05E7\u05D5\u05D3 \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4",
        coaching: "\u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05E0\u05D5\u05E1\u05D7\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B2 \u2212 4x + 3. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05D4\u05E0\u05D5\u05E1\u05D7\u05D4 \u05DC\u05DE\u05E6\u05D9\u05D0\u05EA x \u05E9\u05DC \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3? \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD y? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E0\u05D5\u05E1\u05D7\u05D4", "\u05D4\u05E6\u05D1\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05E0\u05D5\u05E1\u05D7\u05EA \u05E7\u05D3\u05E7\u05D5\u05D3",
        contextWords: ["\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D7\u05D9\u05EA\u05D5\u05DA", "\u05E6\u05D9\u05E8", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D4\u05E6\u05D1\u05D4"],
        stationWords: ["\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D7\u05D9\u05EA\u05D5\u05DA"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 y",
        coaching: "\u05D4\u05E6\u05D9\u05D1\u05D5 x=0",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = x\u00B2 \u2212 4x + 3. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 y. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05DE\u05E6\u05D9\u05D1\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 y? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E6\u05D9\u05E8 y", "\u05D4\u05E6\u05D1\u05D4", "x=0"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05E6\u05D9\u05D1 x=0",
        contextWords: ["\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D7\u05D9\u05EA\u05D5\u05DA", "\u05E6\u05D9\u05E8", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D4\u05E6\u05D1\u05D4"],
        stationWords: ["\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05D7\u05D9\u05EA\u05D5\u05DA"],
      },
    ],
  },
  {
    id: "medium",
    title: "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4 \u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4 -- \u05E1\u05E7\u05D9\u05E6\u05D4",
    problem: "\u05E0\u05EA\u05D5\u05E0\u05D4 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 f(x) = \u2212x\u00B2 + 6x \u2212 5.\n\n\u05D0. \u05D4\u05D0\u05DD \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4 \u05DB\u05DC\u05E4\u05D9 \u05DE\u05E2\u05DC\u05D4 \u05D0\u05D5 \u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4? \u05D4\u05E1\u05D1\u05D9\u05E8\u05D5.\n\u05D1. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3.\n\u05D2. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x.\n\u05D3. \u05E9\u05E8\u05D8\u05D8\u05D5 \u05E1\u05E7\u05D9\u05E6\u05D4 \u05E9\u05DC \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 (\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E7\u05D3\u05E7\u05D5\u05D3, \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05D4\u05E6\u05D9\u05E8\u05D9\u05DD).",
    diagram: <MediumParabolaDiagram />,
    pitfalls: [
      { title: "a \u05E9\u05DC\u05D9\u05DC\u05D9 -- \u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4", text: "a = \u22121 < 0 \u2192 \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4 \u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4 -- \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3 \u05D4\u05D5\u05D0 \u05E0\u05E7\u05D5\u05D3\u05EA \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD." },
      { title: "\u05E1\u05D9\u05DE\u05E0\u05D9\u05DD \u05D1\u05E0\u05D5\u05E1\u05D7\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3", text: "x = \u2212b/2a = \u22126/(2\u00B7(\u22121)) = 3 -- \u05E9\u05D9\u05DE\u05D5 \u05DC\u05D1 \u05DC\u05E1\u05D9\u05DE\u05E0\u05D9\u05DD \u05DB\u05E9-a \u05E9\u05DC\u05D9\u05DC\u05D9!" },
      { title: "\u05D1\u05E1\u05E7\u05D9\u05E6\u05D4 -- \u05DB\u05DC \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA", text: "\u05D1\u05E1\u05E7\u05D9\u05E6\u05D4 -- \u05D5\u05D3\u05D0\u05D5 \u05E9\u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E2\u05D5\u05D1\u05E8\u05EA \u05D3\u05E8\u05DA \u05DB\u05DC \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E9\u05DE\u05E6\u05D0\u05EA\u05DD." },
    ],
    goldenPrompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 f(x) = \u2212x\u00B2 + 6x \u2212 5.\n\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA:\n1. \u05DC\u05D1\u05D3\u05D5\u05E7 \u05D0\u05DD \u05E4\u05EA\u05D5\u05D7\u05D4 \u05DE\u05E2\u05DC\u05D4/\u05DE\u05D8\u05D4\n2. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3\n3. \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x\n4. \u05DC\u05E9\u05E8\u05D8\u05D8 \u05E1\u05E7\u05D9\u05E6\u05D4\n\n\u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05DB\u05D9\u05D5\u05D5\u05DF \u05E4\u05EA\u05D9\u05D7\u05D4",
        coaching: "\u05D1\u05D3\u05E7\u05D5 \u05D0\u05EA \u05E1\u05D9\u05DE\u05DF a",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = \u2212x\u00B2 + 6x \u2212 5. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05D4\u05D1\u05D9\u05DF \u05D0\u05DD \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4 \u05DE\u05E2\u05DC\u05D4 \u05D0\u05D5 \u05DE\u05D8\u05D4. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05D4\u05E2\u05E8\u05DA \u05E9\u05DC a? \u05DE\u05D4 \u05D6\u05D4 \u05D0\u05D5\u05DE\u05E8 \u05E2\u05DC \u05DB\u05D9\u05D5\u05D5\u05DF \u05D4\u05E4\u05EA\u05D9\u05D7\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4", "\u05E4\u05EA\u05D5\u05D7\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05DE\u05D3\u05D5\u05D1\u05E8 \u05D1\u05DB\u05D9\u05D5\u05D5\u05DF \u05E4\u05EA\u05D9\u05D7\u05D4",
        contextWords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4", "\u05E1\u05E7\u05D9\u05E6\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05EA\u05D5\u05D7\u05D4"],
        stationWords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E1\u05E7\u05D9\u05E6\u05D4"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05E7\u05D3\u05E7\u05D5\u05D3",
        coaching: "\u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05E0\u05D5\u05E1\u05D7\u05D4 \u05D5\u05D4\u05E6\u05D9\u05D1\u05D5 \u05D7\u05D6\u05E8\u05D4",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = \u2212x\u00B2 + 6x \u2212 5. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05D4\u05E0\u05D5\u05E1\u05D7\u05D4? \u05DE\u05D4 \u05E2\u05E8\u05DB\u05D9 a \u05D5-b? \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD y? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E0\u05D5\u05E1\u05D7\u05D4", "\u05E1\u05D9\u05DE\u05E0\u05D9\u05DD"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D6\u05D4\u05E8 \u05DE\u05E1\u05D9\u05DE\u05E0\u05D9\u05DD",
        contextWords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4", "\u05E1\u05E7\u05D9\u05E6\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05EA\u05D5\u05D7\u05D4"],
        stationWords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E1\u05E7\u05D9\u05E6\u05D4"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- \u05E9\u05D5\u05E8\u05E9\u05D9\u05DD",
        coaching: "\u05D4\u05E6\u05D9\u05D1\u05D5 y=0 \u05D5\u05E4\u05EA\u05E8\u05D5",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = \u2212x\u00B2 + 6x \u2212 5. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05E6\u05D9\u05E8 x. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05DE\u05E6\u05D9\u05D1\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E9\u05D5\u05E8\u05E9\u05D9\u05DD? \u05D0\u05D9\u05DA \u05E4\u05D5\u05EA\u05E8\u05D9\u05DD \u05DE\u05E9\u05D5\u05D5\u05D0\u05D4 \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9\u05EA \u05E2\u05DD a \u05E9\u05DC\u05D9\u05DC\u05D9? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E0\u05D5\u05E1\u05D7\u05D4", "\u05E6\u05D9\u05E8 x"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05E0\u05D5\u05E1\u05D7\u05D4 \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9\u05EA",
        contextWords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4", "\u05E1\u05E7\u05D9\u05E6\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05EA\u05D5\u05D7\u05D4"],
        stationWords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E1\u05E7\u05D9\u05E6\u05D4"],
      },
      {
        phase: "\u05D3",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D3\u2019 -- \u05E1\u05E7\u05D9\u05E6\u05D4",
        coaching: "\u05E1\u05DE\u05E0\u05D5 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D5\u05E6\u05D9\u05D9\u05E8\u05D5",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E0\u05EA\u05D5\u05E0\u05D4 f(x) = \u2212x\u00B2 + 6x \u2212 5. \u05DE\u05E6\u05D0\u05EA\u05D9 \u05E7\u05D3\u05E7\u05D5\u05D3 \u05D5\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05E9\u05E8\u05D8\u05D8 \u05E1\u05E7\u05D9\u05E6\u05D4 \u05E0\u05DB\u05D5\u05E0\u05D4. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05DC\u05D5 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D7\u05D9\u05D9\u05D1\u05D5\u05EA \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05E1\u05E7\u05D9\u05E6\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E1\u05E7\u05D9\u05E6\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA", "\u05E6\u05D9\u05D9\u05E8"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05E6\u05D9\u05D9\u05E8 \u05E1\u05E7\u05D9\u05E6\u05D4",
        contextWords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05DB\u05DC\u05E4\u05D9 \u05DE\u05D8\u05D4", "\u05E1\u05E7\u05D9\u05E6\u05D4", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05EA\u05D5\u05D7\u05D4"],
        stationWords: ["\u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD", "\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E1\u05E7\u05D9\u05E6\u05D4"],
      },
    ],
  },
  {
    id: "advanced",
    title: "\u05DE\u05E6\u05D9\u05D0\u05EA \u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD \u05D5\u05D7\u05D9\u05EA\u05D5\u05DA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05D5\u05D9\u05E9\u05E8",
    problem: "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 f(x) = ax\u00B2 + bx + c \u05E2\u05D5\u05D1\u05E8\u05EA \u05D3\u05E8\u05DA \u05D4\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA (0, 3), (1, 0) \u05D5-(3, 0).\n\n\u05D0. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05E2\u05E8\u05DB\u05D9 a, b, c.\n\u05D1. \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3.\n\u05D2. \u05E2\u05D1\u05D5\u05E8 \u05D0\u05D9\u05DC\u05D5 \u05E2\u05E8\u05DB\u05D9 x \u05DE\u05EA\u05E7\u05D9\u05D9\u05DD f(x) > 0?\n\u05D3. \u05D4\u05D9\u05E9\u05E8 g(x) = x + 3 \u05D7\u05D5\u05EA\u05DA \u05D0\u05EA \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 -- \u05DE\u05E6\u05D0\u05D5 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA.",
    diagram: <AdvancedParabolaDiagram />,
    pitfalls: [
      { title: "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD \u05E0\u05D5\u05EA\u05E0\u05D9\u05DD -- \u05DB\u05EA\u05D1\u05D5 \u05D1\u05E6\u05D5\u05E8\u05EA \u05D2\u05D5\u05E8\u05DE\u05D9\u05DD", text: "(0,3) \u05E0\u05D5\u05EA\u05DF c=3, (1,0) \u05D5-(3,0) \u05E0\u05D5\u05EA\u05E0\u05D9\u05DD \u05E9\u05D5\u05E8\u05E9\u05D9\u05DD -- \u05D0\u05E4\u05E9\u05E8 \u05DC\u05DB\u05EA\u05D5\u05D1 f(x) = a(x\u22121)(x\u22123) \u05D5\u05DC\u05DE\u05E6\u05D5\u05D0 a \u05DE-c=3." },
      { title: "f(x) > 0 -- \u05EA\u05DC\u05D5\u05D9 \u05D1\u05DB\u05D9\u05D5\u05D5\u05DF \u05D4\u05E4\u05EA\u05D9\u05D7\u05D4", text: "f(x) > 0 \u05E8\u05E7 \u05D1\u05D9\u05DF \u05D4\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD \u05D0\u05D5 \u05DE\u05D7\u05D5\u05E6\u05D4 \u05DC\u05D4\u05DD -- \u05EA\u05DC\u05D5\u05D9 \u05D1\u05DB\u05D9\u05D5\u05D5\u05DF \u05D4\u05E4\u05EA\u05D9\u05D7\u05D4." },
      { title: "\u05D7\u05D9\u05EA\u05D5\u05DA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05D5\u05D9\u05E9\u05E8", text: "\u05D7\u05D9\u05EA\u05D5\u05DA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05D5\u05D9\u05E9\u05E8: ax\u00B2+bx+c = x+3 \u2192 \u05D4\u05E2\u05D1\u05D9\u05E8\u05D5 \u05D4\u05DB\u05DC \u05DC\u05E6\u05D3 \u05D0\u05D7\u05D3 \u05D5\u05E4\u05EA\u05E8\u05D5." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u05D0",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D0\u2019 -- \u05DE\u05E6\u05D9\u05D0\u05EA \u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD",
        coaching: "\u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05DB\u05D3\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 a, b, c",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 f(x) = ax\u00B2 + bx + c \u05E2\u05D5\u05D1\u05E8\u05EA \u05D3\u05E8\u05DA (0,3), (1,0), (3,0). \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA a, b, c. \u05E9\u05D0\u05DC: \u05DE\u05D4 \u05E0\u05D5\u05EA\u05E0\u05EA (0,3) \u05DE\u05D9\u05D3? \u05D5\u05DE\u05D4 \u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05D4\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D2\u05D5\u05E8\u05DE\u05D9\u05DD"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD",
        contextWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05D7\u05D9\u05EA\u05D5\u05DA \u05D9\u05E9\u05E8", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA"],
        stationWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
      {
        phase: "\u05D1",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D1\u2019 -- \u05E7\u05D3\u05E7\u05D5\u05D3",
        coaching: "\u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05E0\u05D5\u05E1\u05D7\u05D4 \u05D0\u05D5 \u05D1\u05DE\u05DE\u05D5\u05E6\u05E2 \u05D4\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA a, b, c. \u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05D0\u05EA x \u05E9\u05DC \u05D4\u05E7\u05D3\u05E7\u05D5\u05D3? \u05DE\u05D4 \u05D4\u05E7\u05E9\u05E8 \u05D1\u05D9\u05DF \u05E7\u05D3\u05E7\u05D5\u05D3 \u05DC\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05E7\u05D3\u05E7\u05D5\u05D3", "\u05E1\u05D9\u05DE\u05D8\u05E8\u05D9\u05D4", "\u05DE\u05DE\u05D5\u05E6\u05E2"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E7\u05D3\u05E7\u05D5\u05D3",
        contextWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05D7\u05D9\u05EA\u05D5\u05DA \u05D9\u05E9\u05E8", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA"],
        stationWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
      {
        phase: "\u05D2",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D2\u2019 -- f(x) > 0",
        coaching: "\u05D1\u05D3\u05E7\u05D5 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E1\u05D9\u05DE\u05DF \u05DC\u05E4\u05D9 \u05DB\u05D9\u05D5\u05D5\u05DF \u05D4\u05E4\u05EA\u05D9\u05D7\u05D4",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05DE\u05E6\u05D0\u05EA\u05D9 \u05D0\u05EA \u05D4\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD \u05D5\u05D4\u05E7\u05D3\u05E7\u05D5\u05D3. \u05E2\u05DB\u05E9\u05D9\u05D5 \u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05DE\u05E6\u05D5\u05D0 \u05E2\u05D1\u05D5\u05E8 \u05D0\u05D9\u05DC\u05D5 x \u05DE\u05EA\u05E7\u05D9\u05D9\u05DD f(x) > 0. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9: \u05D0\u05D9\u05E4\u05D4 \u05DB\u05D9\u05D5\u05D5\u05DF \u05D4\u05E4\u05EA\u05D9\u05D7\u05D4 \u05DE\u05E9\u05E4\u05D9\u05E2 \u05E2\u05DC \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05EA\u05D7\u05D5\u05DD", "\u05E1\u05D9\u05DE\u05DF"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05E4\u05EA\u05D5\u05E8 \u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF",
        contextWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05D7\u05D9\u05EA\u05D5\u05DA \u05D9\u05E9\u05E8", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA"],
        stationWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
      {
        phase: "\u05D3",
        label: "\u05E1\u05E2\u05D9\u05E3 \u05D3\u2019 -- \u05D7\u05D9\u05EA\u05D5\u05DA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05D5\u05D9\u05E9\u05E8",
        coaching: "\u05D4\u05E9\u05D5\u05D5 \u05D0\u05EA \u05E9\u05EA\u05D9 \u05D4\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D5\u05EA \u05D5\u05E4\u05EA\u05E8\u05D5",
        prompt: "\u05D0\u05EA\u05D4 \u05D4\u05DE\u05D5\u05E8\u05D4 \u05D4\u05E4\u05E8\u05D8\u05D9 \u05E9\u05DC\u05D9 \u05DC\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4, \u05DB\u05D9\u05EA\u05D4 \u05D9 3 \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA.\n\u05D4\u05D9\u05E9\u05E8 g(x) = x + 3 \u05D7\u05D5\u05EA\u05DA \u05D0\u05EA \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 f(x) = ax\u00B2 + bx + c. \u05EA\u05E0\u05D7\u05D4 \u05D0\u05D5\u05EA\u05D9 \u05DC\u05DE\u05E6\u05D5\u05D0 \u05D0\u05EA \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05D7\u05D9\u05EA\u05D5\u05DA. \u05E9\u05D0\u05DC: \u05D0\u05D9\u05DA \u05DE\u05E9\u05D5\u05D5\u05D9\u05DD \u05E9\u05EA\u05D9 \u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D5\u05EA? \u05DE\u05D4 \u05E2\u05D5\u05E9\u05D9\u05DD \u05D0\u05D7\u05E8\u05D9 \u05D4\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4? \u05D0\u05DC \u05EA\u05E4\u05EA\u05D5\u05E8 \u05E2\u05D1\u05D5\u05E8\u05D9.\n\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05EA\u05E2\u05E6\u05D5\u05E8 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05E9\u05DC\u05D1 \u05D5\u05EA\u05D7\u05DB\u05D4 \u05E9\u05D0\u05D2\u05D9\u05D3 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
        keywords: ["\u05D7\u05D9\u05EA\u05D5\u05DA", "\u05D9\u05E9\u05E8", "\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4"],
        keywordHint: "\u05E6\u05D9\u05D9\u05E0\u05D5 \u05E9\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05E9\u05D5\u05D5\u05EA \u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05D5\u05D9\u05E9\u05E8",
        contextWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05D0\u05D9 \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF", "\u05D7\u05D9\u05EA\u05D5\u05DA \u05D9\u05E9\u05E8", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4", "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA"],
        stationWords: ["\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9\u05DD", "\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4"],
      },
    ],
  },
];

// ─── Parabola Lab ────────────────────────────────────────────────────────────

function ParabolaLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-4);
  const [c, setC] = useState(3);

  // Computed values
  const xv = a !== 0 ? -b / (2 * a) : 0;
  const yv = a !== 0 ? a * xv * xv + b * xv + c : c;
  const delta = b * b - 4 * a * c;
  const yIntercept = c;

  let x1: number | null = null;
  let x2: number | null = null;
  if (a !== 0 && delta >= 0) {
    const sqrtD = Math.sqrt(delta);
    x1 = (-b - sqrtD) / (2 * a);
    x2 = (-b + sqrtD) / (2 * a);
    if (x1 > x2) { const tmp = x1; x1 = x2; x2 = tmp; }
  }

  // SVG drawing
  const svgW = 320, svgH = 240;
  const xMin = -8, xMax = 8, yMin = -10, yMax = 15;
  const toSvgX = (x: number) => ((x - xMin) / (xMax - xMin)) * svgW;
  const toSvgY = (y: number) => svgH - ((y - yMin) / (yMax - yMin)) * svgH;

  const points: string[] = [];
  for (let px = xMin; px <= xMax; px += 0.1) {
    const py = a * px * px + b * px + c;
    if (py >= yMin - 5 && py <= yMax + 5) {
      points.push(`${toSvgX(px).toFixed(1)},${toSvgY(py).toFixed(1)}`);
    }
  }
  const pathData = points.length > 1 ? `M ${points.join(" L ")}` : "";

  const isDefault = a === 1 && b === -4 && c === 3;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת פרבולה</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          <Sparkles size={14} />
          {delta > 0 ? "\u0394 > 0 -- \u05E9\u05EA\u05D9 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA" : delta === 0 ? "\u0394 = 0 -- \u05E0\u05E7\u05D5\u05D3\u05D4 \u05D0\u05D7\u05EA" : "\u0394 < 0 -- \u05D0\u05D9\u05DF \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA"}
        </span>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Grid */}
          {Array.from({ length: Math.floor(xMax - xMin) + 1 }, (_, i) => xMin + i).map(x => (
            <line key={`gx${x}`} x1={toSvgX(x)} y1={0} x2={toSvgX(x)} y2={svgH} stroke="#e2e8f0" strokeWidth={x === 0 ? 1.5 : 0.5} />
          ))}
          {Array.from({ length: Math.floor(yMax - yMin) + 1 }, (_, i) => yMin + i).map(y => (
            <line key={`gy${y}`} x1={0} y1={toSvgY(y)} x2={svgW} y2={toSvgY(y)} stroke="#e2e8f0" strokeWidth={y === 0 ? 1.5 : 0.5} />
          ))}
          {/* Axes */}
          <line x1={toSvgX(0)} y1={0} x2={toSvgX(0)} y2={svgH} stroke="#94a3b8" strokeWidth={1.5} />
          <line x1={0} y1={toSvgY(0)} x2={svgW} y2={toSvgY(0)} stroke="#94a3b8" strokeWidth={1.5} />
          <text x={svgW - 10} y={toSvgY(0) - 5} fill="#94a3b8" fontSize={10}>x</text>
          <text x={toSvgX(0) + 5} y={12} fill="#94a3b8" fontSize={10}>y</text>
          {/* Parabola curve */}
          {pathData && <path d={pathData} fill="none" stroke="#6366f1" strokeWidth={2.5} />}
          {/* Vertex dot */}
          {a !== 0 && yv >= yMin && yv <= yMax && (
            <circle cx={toSvgX(xv)} cy={toSvgY(yv)} r={5} fill="#ea580c" />
          )}
          {/* X-intercepts */}
          {x1 !== null && x1 >= xMin && x1 <= xMax && (
            <circle cx={toSvgX(x1)} cy={toSvgY(0)} r={4} fill="#dc2626" />
          )}
          {x2 !== null && x2 >= xMin && x2 <= xMax && Math.abs(x2 - (x1 ?? 0)) > 0.01 && (
            <circle cx={toSvgX(x2)} cy={toSvgY(0)} r={4} fill="#dc2626" />
          )}
          {/* Y-intercept */}
          {yIntercept >= yMin && yIntercept <= yMax && (
            <circle cx={toSvgX(0)} cy={toSvgY(yIntercept)} r={4} fill="#16a34a" />
          )}
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>a</span>
            <span style={{ fontFamily: "monospace", color: "#6366f1", fontWeight: 700 }}>{a}</span>
          </div>
          <input type="range" min={-3} max={3} step={0.5} value={a}
            onChange={e => { const v = parseFloat(e.target.value); if (v !== 0) setA(v); }}
            className="w-full" style={{ accentColor: "#6366f1" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>b</span>
            <span style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{b}</span>
          </div>
          <input type="range" min={-6} max={6} step={0.5} value={b}
            onChange={e => setB(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#ea580c" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>c</span>
            <span style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{c}</span>
          </div>
          <input type="range" min={-5} max={5} step={0.5} value={c}
            onChange={e => setC(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u05E7\u05D3\u05E7\u05D5\u05D3</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>({xv.toFixed(1)}, {yv.toFixed(1)})</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u0394</p>
          <p style={{ fontFamily: "monospace", color: delta > 0 ? "#16a34a" : delta === 0 ? "#ea580c" : "#dc2626", fontWeight: 700 }}>{delta.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u05D7\u05D9\u05EA\u05D5\u05DA y</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>(0, {yIntercept.toFixed(1)})</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>
            {x1 !== null && x2 !== null
              ? Math.abs(x1 - x2) < 0.01
                ? `x = ${x1.toFixed(2)}`
                : `${x1.toFixed(2)}, ${x2.toFixed(2)}`
              : "\u05D0\u05D9\u05DF"}
          </p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#6366f1", fontWeight: 600 }}>a = {a}</span> &nbsp;|&nbsp;
        <span style={{ color: "#ea580c", fontWeight: 600 }}>b = {b}</span> &nbsp;|&nbsp;
        <span style={{ color: "#16a34a", fontWeight: 600 }}>c = {c}</span> &nbsp;|&nbsp;
        <span style={{ fontWeight: 600 }}>{a > 0 ? "\u05E4\u05EA\u05D5\u05D7\u05D4 \u05DE\u05E2\u05DC\u05D4 \u2B06" : "\u05E4\u05EA\u05D5\u05D7\u05D4 \u05DE\u05D8\u05D4 \u2B07"}</span>
      </div>

      <LabMessage text="\u05E9\u05E0\u05D5 \u05D0\u05EA a, b, c \u05D5\u05E8\u05D0\u05D5 \u05DB\u05D9\u05E6\u05D3 \u05D4\u05E4\u05E8\u05D1\u05D5\u05DC\u05D4 \u05DE\u05E9\u05EA\u05E0\u05D4" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuadraticFunctionPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4 \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9\u05EA \u05E2\u05DD AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>\u05E7\u05D3\u05E7\u05D5\u05D3, \u05E9\u05D5\u05E8\u05E9\u05D9\u05DD, \u05D7\u05D9\u05EA\u05D5\u05DA \u05E2\u05DD \u05D4\u05E6\u05D9\u05E8\u05D9\u05DD \u05D5\u05E1\u05E7\u05D9\u05E6\u05D4</p>
          </div>
          <Link
            href="/3u/topic/grade10/graphs"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}
          >
            <span style={{ fontSize: 16 }}>{"\u2190"}</span>
            \u05D7\u05D6\u05E8\u05D4
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="3u/grade10/graphs/quadratic" />

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
        <ParabolaLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/graphs/quadratic" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
