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

function BasicSimilarityDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>שני משולשים דומים</p>
      <svg width="100%" viewBox="0 0 340 160" style={{ maxWidth: "100%" }}>
        {/* Larger triangle ABC */}
        <polygon points="30,140 170,140 100,30" fill="none" stroke="#16a34a" strokeWidth={1.8} />
        <text x={22} y={152} fill="#16a34a" fontSize={13} fontWeight={700}>B</text>
        <text x={172} y={152} fill="#16a34a" fontSize={13} fontWeight={700}>C</text>
        <text x={94} y={24} fill="#16a34a" fontSize={13} fontWeight={700}>A</text>
        {/* Angle arcs on ABC */}
        <path d="M 45,140 A 15,15 0 0,0 42,128" fill="none" stroke="#f59e0b" strokeWidth={1.2} />
        <path d="M 155,140 A 15,15 0 0,1 152,128" fill="none" stroke="#a78bfa" strokeWidth={1.2} />

        {/* Smaller triangle DEF */}
        <polygon points="210,140 300,140 255,75" fill="none" stroke="#16a34a" strokeWidth={1.8} />
        <text x={202} y={152} fill="#16a34a" fontSize={13} fontWeight={700}>E</text>
        <text x={302} y={152} fill="#16a34a" fontSize={13} fontWeight={700}>F</text>
        <text x={249} y={69} fill="#16a34a" fontSize={13} fontWeight={700}>D</text>
        {/* Matching angle arcs on DEF */}
        <path d="M 223,140 A 12,12 0 0,0 221,130" fill="none" stroke="#f59e0b" strokeWidth={1.2} />
        <path d="M 288,140 A 12,12 0 0,1 286,130" fill="none" stroke="#a78bfa" strokeWidth={1.2} />

        {/* Similarity symbol */}
        <text x={185} y={105} textAnchor="middle" fill="#16a34a" fontSize={16} fontWeight={700}>~</text>
      </svg>
    </div>
  );
}

function MediumSimilarityDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>קו מקביל לצלע במשולש</p>
      <svg width="100%" viewBox="0 0 280 180" style={{ maxWidth: "100%" }}>
        {/* Large triangle ABC */}
        <polygon points="140,15 30,165 250,165" fill="none" stroke="#ea580c" strokeWidth={1.8} />
        <text x={134} y={12} fill="#ea580c" fontSize={13} fontWeight={700}>A</text>
        <text x={18} y={175} fill="#ea580c" fontSize={13} fontWeight={700}>B</text>
        <text x={252} y={175} fill="#ea580c" fontSize={13} fontWeight={700}>C</text>

        {/* Points D on AB, E on AC */}
        <circle cx={96} cy={78} r={3} fill="#ea580c" />
        <text x={82} y={74} fill="#ea580c" fontSize={12} fontWeight={700}>D</text>
        <circle cx={184} cy={78} r={3} fill="#ea580c" />
        <text x={189} y={74} fill="#ea580c" fontSize={12} fontWeight={700}>E</text>

        {/* DE parallel to BC */}
        <line x1={96} y1={78} x2={184} y2={78} stroke="#ea580c" strokeWidth={1.5} strokeDasharray="5,3" />

        {/* Parallel arrows indicator */}
        <text x={140} y={126} textAnchor="middle" fill="#64748b" fontSize={10}>DE ∥ BC</text>
      </svg>
    </div>
  );
}

function AdvancedSimilarityDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>משולשים עם קודקוד משותף ואנך</p>
      <svg width="100%" viewBox="0 0 300 190" style={{ maxWidth: "100%" }}>
        {/* Triangle ABC */}
        <polygon points="50,170 250,170 150,20" fill="none" stroke="#dc2626" strokeWidth={1.8} />
        <text x={36} y={180} fill="#dc2626" fontSize={13} fontWeight={700}>B</text>
        <text x={252} y={180} fill="#dc2626" fontSize={13} fontWeight={700}>C</text>
        <text x={144} y={16} fill="#dc2626" fontSize={13} fontWeight={700}>A</text>

        {/* M = midpoint of BC */}
        <circle cx={150} cy={170} r={3} fill="#dc2626" />
        <text x={144} y={186} fill="#dc2626" fontSize={12} fontWeight={700}>M</text>

        {/* D on AB (foot of perpendicular from M) */}
        <circle cx={100} cy={95} r={3} fill="#dc2626" />
        <text x={84} y={92} fill="#dc2626" fontSize={12} fontWeight={700}>D</text>

        {/* MD perpendicular to AB */}
        <line x1={150} y1={170} x2={100} y2={95} stroke="#dc2626" strokeWidth={1.2} strokeDasharray="4,3" />

        {/* Right angle marker at D */}
        <polyline points="106,102 113,108 107,115" fill="none" stroke="#64748b" strokeWidth={1} />

        {/* Angle arcs indicating equal angles */}
        <path d="M 140,35 A 20,20 0 0,1 157,40" fill="none" stroke="#f59e0b" strokeWidth={1.3} />
        <path d="M 145,155 A 14,14 0 0,0 155,160" fill="none" stroke="#f59e0b" strokeWidth={1.3} />
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
        subjectWords={["דמיון", "משולש", "יחס", "שטח", "זוויות", "הוכחה"]}
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
  const [activeTab, setActiveTab] = useState<"aa" | "sss" | "sas" | "area" | null>(null);

  const tabs = [
    { id: "aa" as const,   label: "ז.ז.",       tex: "\\angle = \\angle",                color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "sss" as const,  label: "צ.צ.צ.",      tex: "\\frac{a}{d}=\\frac{b}{e}=k",     color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "sas" as const,  label: "צ.ז.צ.",      tex: "\\frac{a}{d}=\\frac{c}{f},\\angle", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "area" as const, label: "יחס שטחים",   tex: "k^2",                              color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: AA */}
      {activeTab === "aa" && (
        <motion.div key="aa" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\angle A = \\angle D,\\; \\angle B = \\angle E \\Rightarrow \\triangle ABC \\sim \\triangle DEF"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> מספיק ששתי זוויות שוות כדי להוכיח דמיון.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אם שתי זוויות שוות, גם השלישית שווה (סכום זוויות במשולש = 180).</li>
                  <li>זהו תנאי הדמיון הנפוץ ביותר -- ז.ז. (זווית-זווית).</li>
                  <li>חשוב לציין אילו זוויות שוות ומדוע (זוויות מתאימות, חוצה זווית וכו&apos;).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: חפשו זוויות קודקודיות, מתחלפות, מתאימות -- כל זוג זוויות שוות מקרב אתכם להוכחה.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: SSS */}
      {activeTab === "sss" && (
        <motion.div key="sss" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{AB}{DE} = \\frac{BC}{EF} = \\frac{AC}{DF} = k"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> אם יחס כל שלוש הצלעות שווה -- המשולשים דומים.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>חשבו את היחס בין כל זוג צלעות מתאימות.</li>
                  <li>ודאו שכל שלושת היחסים שווים לאותו <InlineMath>{"k"}</InlineMath>.</li>
                  <li>צלעות מתאימות הן אלו שמול זוויות שוות.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימו לב: סדר הצלעות חשוב! הקטנה מול הקטנה, הגדולה מול הגדולה.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: SAS */}
      {activeTab === "sas" && (
        <motion.div key="sas" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{AB}{DE} = \\frac{AC}{DF},\\; \\angle A = \\angle D"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> יחס שתי צלעות שווה והזווית שביניהן שווה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הזווית חייבת להיות הזווית <strong>הכלואה</strong> בין שתי הצלעות.</li>
                  <li>לא מספיק שזווית כלשהי שווה -- חייבת להיות בין הצלעות שיחסן שווה.</li>
                  <li>תנאי זה שקול ל-ז.ז. כאשר יש מידע על צלעות אבל לא על כל הזוויות.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימו לב: הזווית חייבת להיות בין הצלעות! זווית אחרת לא מספיקה.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Area ratio */}
      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{S_1}{S_2} = k^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> יחס השטחים שווה לריבוע יחס הדמיון.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אם יחס הדמיון הוא <InlineMath>{"k"}</InlineMath>, אז יחס השטחים הוא <InlineMath>{"k^2"}</InlineMath>.</li>
                  <li>יחס ההיקפים שווה ל-<InlineMath>{"k"}</InlineMath> (לינארי).</li>
                  <li>שגיאה נפוצה: לשכוח לרבע את <InlineMath>{"k"}</InlineMath> ולהשתמש ב-<InlineMath>{"k"}</InlineMath> ישירות לשטחים.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: אם <InlineMath>{"k = \\frac{1}{2}"}</InlineMath> אז יחס השטחים = <InlineMath>{"\\frac{1}{4}"}</InlineMath>, לא <InlineMath>{"\\frac{1}{2}"}</InlineMath>!
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
    title: "דמיון משולשים -- זיהוי יחס דמיון ומציאת צלעות",
    problem: "משולשים ABC ו-DEF דומים. ידוע: AB = 6, BC = 8, AC = 10, DE = 3.\n\nא. מהו יחס הדמיון k?\nב. מצאו את אורכי הצלעות EF ו-DF.\nג. אם שטח משולש ABC הוא 24, מהו שטח משולש DEF?",
    diagram: <BasicSimilarityDiagram />,
    pitfalls: [
      { title: "יחס הדמיון k = DE/AB = 3/6 = 1/2", text: "ודאו שאתם מחלקים צלע מתאימה בצלע מתאימה -- DE מול AB, לא DE מול BC." },
      { title: "EF = BC \u00D7 k = 8 \u00D7 1/2 = 4", text: "הצלעות המתאימות הן אלו שמול זוויות שוות -- חשוב לשמור על הסדר." },
      { title: "יחס שטחים = k\u00B2 = (1/2)\u00B2 = 1/4, לא k = 1/2!", text: "שטח הוא גודל דו-ממדי, לכן מרבעים את יחס הדמיון. שגיאה נפוצה מאוד!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמשולשים ABC ו-DEF דומים. AB = 6, BC = 8, AC = 10, DE = 3.\nאני צריך:\n1. למצוא את יחס הדמיון k\n2. למצוא את EF ו-DF\n3. לחשב שטח DEF אם שטח ABC = 24\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- יחס הדמיון k",
        coaching: "מצא את היחס בין צלעות מתאימות",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמשולשים ABC ו-DEF דומים. AB = 6, DE = 3. תנחה אותי למצוא את יחס הדמיון k. שאל אותי: מהן צלעות מתאימות? איך מחשבים את k? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["דמיון", "יחס", "צלעות"],
        keywordHint: "ציין שמדובר ביחס דמיון בין צלעות מתאימות",
        contextWords: ["דמיון", "יחס", "צלעות", "שטח", "משולשים", "k"],
        stationWords: ["דמיון", "יחס", "משולשים"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- מציאת EF ו-DF",
        coaching: "הכפל כל צלע ב-k",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nמצאתי את יחס הדמיון k. עכשיו אני צריך למצוא את EF ו-DF. תנחה אותי: אילו צלעות מתאימות ל-BC ול-AC? איך משתמשים ב-k? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["צלעות", "מתאימות", "k"],
        keywordHint: "ציין שמשתמשים ביחס k למציאת הצלעות",
        contextWords: ["דמיון", "יחס", "צלעות", "שטח", "משולשים", "k"],
        stationWords: ["דמיון", "יחס", "משולשים"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- שטח משולש DEF",
        coaching: "יחס שטחים = ריבוע יחס הדמיון",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nשטח ABC = 24 ויחס הדמיון k = 1/2. תנחה אותי לחשב את שטח DEF. שאל: מה הקשר בין יחס דמיון ליחס שטחים? למה לא פשוט כופלים ב-k? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שטח", "ריבוע", "יחס"],
        keywordHint: "ציין שיחס שטחים = ריבוע יחס הדמיון",
        contextWords: ["דמיון", "יחס", "צלעות", "שטח", "משולשים", "k"],
        stationWords: ["דמיון", "יחס", "משולשים"],
      },
    ],
  },
  {
    id: "medium",
    title: "דמיון משולשים -- הוכחה עם קו מקביל",
    problem: "במשולש ABC, הנקודה D על AB והנקודה E על AC, כך ש-DE \u2225 BC.\n\nא. הוכיחו שמשולש ADE דומה למשולש ABC (ציינו את תנאי הדמיון).\nב. אם AD = 4, DB = 6 ו-DE = 5, מצאו את BC.\nג. מצאו את יחס השטחים S(ADE)/S(ABC).\nד. אם שטח הטרפז BCED הוא 84, מצאו את שטח משולש ADE.",
    diagram: <MediumSimilarityDiagram />,
    pitfalls: [
      { title: "DE \u2225 BC \u2192 זוויות מתאימות שוות", text: "\u2220ADE = \u2220ABC ו-\u2220AED = \u2220ACB (זוויות מתאימות בין מקבילים) \u2192 דמיון ז.ז." },
      { title: "k = AD/AB = 4/10 = 2/5", text: "המכנה הוא AB = AD + DB = 10, לא DB! שגיאה נפוצה -- שוכחים לחבר." },
      { title: "שטח הטרפז = שטח ABC \u2212 שטח ADE", text: "S(ADE) = S(ABC) \u2212 84. השתמשו ביחס השטחים k\u00B2 = 4/25 כדי לפתור." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבמשולש ABC, D על AB ו-E על AC, DE \u2225 BC.\nAD = 4, DB = 6, DE = 5.\nאני צריך:\n1. להוכיח דמיון ADE ~ ABC\n2. למצוא BC\n3. לחשב יחס שטחים\n4. למצוא שטח ADE אם שטח טרפז BCED = 84\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- הוכחת דמיון",
        coaching: "זהה זוויות שוות בעזרת קו מקביל",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nDE \u2225 BC במשולש ABC. תנחה אותי להוכיח ש-ADE ~ ABC. שאל: אילו זוויות שוות כשיש קו מקביל? מה תנאי הדמיון? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מקביל", "זוויות", "ז.ז."],
        keywordHint: "ציין שDE מקביל ל-BC ויוצר זוויות שוות",
        contextWords: ["מקביל", "זוויות מתאימות", "ז.ז.", "טרפז", "שטח", "יחס"],
        stationWords: ["מקביל", "זוויות", "דמיון"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- מציאת BC",
        coaching: "חשב את k = AD/AB ואז BC = DE/k",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nהוכחתי דמיון. AD = 4, DB = 6, DE = 5. תנחה אותי למצוא את BC. שאל: מה AB? מהו k? איך מוצאים BC מ-DE ו-k? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["יחס", "AB", "BC"],
        keywordHint: "ציין שצריך למצוא את AB ואז את k",
        contextWords: ["מקביל", "זוויות מתאימות", "ז.ז.", "טרפז", "שטח", "יחס"],
        stationWords: ["מקביל", "זוויות", "דמיון"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- יחס שטחים",
        coaching: "יחס שטחים = k\u00B2",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nיחס הדמיון k = 2/5. תנחה אותי לחשב את יחס השטחים S(ADE)/S(ABC). שאל: מה הנוסחה? למה מרבעים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שטח", "יחס", "ריבוע"],
        keywordHint: "ציין שיחס שטחים שווה ל-k בריבוע",
        contextWords: ["מקביל", "זוויות מתאימות", "ז.ז.", "טרפז", "שטח", "יחס"],
        stationWords: ["מקביל", "זוויות", "דמיון"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- שטח ADE מתוך שטח הטרפז",
        coaching: "שטח ABC = שטח ADE + שטח טרפז",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nשטח טרפז BCED = 84. יחס שטחים = 4/25. תנחה אותי למצוא את שטח ADE. שאל: מה הקשר בין שטח ADE, שטח ABC ושטח הטרפז? איך משלבים את יחס השטחים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["טרפז", "שטח", "משוואה"],
        keywordHint: "ציין שצריך לבנות משוואה עם שטח הטרפז",
        contextWords: ["מקביל", "זוויות מתאימות", "ז.ז.", "טרפז", "שטח", "יחס"],
        stationWords: ["מקביל", "זוויות", "דמיון"],
      },
    ],
  },
  {
    id: "advanced",
    title: "דמיון משולשים -- הוכחה מורכבת עם אנך ואמצע",
    problem: "במשולש ABC, הנקודה M היא אמצע BC. ממנה מורידים אנך MD לצלע AB (D על AB). ידוע: \u2220BAC = \u2220DMB.\n\nא. הוכיחו ש-\u25B3ABC \u223C \u25B3MBD (ציינו תנאי דמיון).\nב. אם AB = 12 ו-BM = 8, מצאו את BD.\nג. חשבו את יחס השטחים S(MBD)/S(ABC).\nד. אם שטח משולש ABC הוא 72, מצאו את שטח משולש MBD.",
    diagram: <AdvancedSimilarityDiagram />,
    pitfalls: [
      { title: "\u2220B משותפת + \u2220BAC = \u2220DMB (נתון) \u2192 דמיון ז.ז.", text: "אל תשכחו לזהות את הזוויות המתאימות -- \u2220B משותפת לשני המשולשים, וזהו המפתח." },
      { title: "מדמיון: AB/MB = BC/BD", text: "\u2192 12/8 = BC/BD. צריך גם לדעת ש-BM = BC/2, ולכן BC = 16." },
      { title: "יחס דמיון k = BM/AB = 8/12 = 2/3", text: "יחס שטחים = (2/3)\u00B2 = 4/9. שטח MBD = 72 \u00D7 4/9 = 32." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- הוכחת דמיון ז.ז.",
        coaching: "זהה זווית משותפת וזווית שווה מהנתון",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבמשולש ABC, M אמצע BC, MD אנך ל-AB, \u2220BAC = \u2220DMB. תנחה אותי להוכיח ש-\u25B3ABC \u223C \u25B3MBD. שאל: מהי הזווית המשותפת? מהן הזוויות השוות? מה תנאי הדמיון? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["דמיון", "זווית", "משותפת"],
        keywordHint: "ציין שיש זווית משותפת ונתון על זוויות שוות",
        contextWords: ["דמיון", "אמצע", "אנך", "זוויות", "שטחים", "יחס"],
        stationWords: ["דמיון", "אנך", "זוויות"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- מציאת BD",
        coaching: "השתמש ביחס בין צלעות מתאימות מהדמיון",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nהוכחתי ש-\u25B3ABC \u223C \u25B3MBD. AB = 12, BM = 8. תנחה אותי למצוא BD. שאל: מהן הצלעות המתאימות? מה היחס AB/MB? איך מוצאים BD? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["צלעות", "יחס", "BD"],
        keywordHint: "ציין שצריך להשתמש ביחס מהדמיון",
        contextWords: ["דמיון", "אמצע", "אנך", "זוויות", "שטחים", "יחס"],
        stationWords: ["דמיון", "אנך", "זוויות"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- יחס שטחים",
        coaching: "חשב את k ואז k\u00B2",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nיחס הדמיון k = BM/AB = 8/12 = 2/3. תנחה אותי לחשב את יחס השטחים S(MBD)/S(ABC). שאל: מה הקשר בין k ליחס השטחים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שטחים", "ריבוע", "k"],
        keywordHint: "ציין שיחס שטחים = k בריבוע",
        contextWords: ["דמיון", "אמצע", "אנך", "זוויות", "שטחים", "יחס"],
        stationWords: ["דמיון", "אנך", "זוויות"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- שטח MBD",
        coaching: "הכפל את שטח ABC ביחס השטחים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nשטח ABC = 72, יחס שטחים = 4/9. תנחה אותי לחשב את שטח MBD. שאל: איך מחשבים שטח של משולש דומה מתוך השטח הידוע? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שטח", "MBD", "חישוב"],
        keywordHint: "ציין שצריך להכפיל שטח ABC ביחס השטחים",
        contextWords: ["דמיון", "אמצע", "אנך", "זוויות", "שטחים", "יחס"],
        stationWords: ["דמיון", "אנך", "זוויות"],
      },
    ],
  },
];

// ─── Similarity Lab ─────────────────────────────────────────────────────────

function SimilarityLab() {
  const [k, setK] = useState(0.5);
  const [angleA, setAngleA] = useState(60);

  // Original triangle (fixed base = 200)
  const base = 200;
  const angleArad = (angleA * Math.PI) / 180;
  // Using law of sines style: place B at origin, C at (base,0), A computed from angle
  const angleBrad = ((180 - angleA) / 2) * (Math.PI / 180); // isoceles-ish for simplicity
  const h = base * Math.sin(angleBrad) * Math.sin(angleArad) / Math.sin(Math.PI - angleBrad - angleArad + angleBrad);
  // Simpler: fixed approach
  const sideAB = base * 0.8;
  const ax = sideAB * Math.cos(angleArad * 0.6);
  const ay = sideAB * Math.sin(angleArad * 0.6);

  // Original triangle vertices (B at origin-ish)
  const origB = { x: 30, y: 150 };
  const origC = { x: 30 + base, y: 150 };
  const origA = { x: 30 + ax, y: 150 - ay };

  // Scaled triangle
  const scaledBase = base * k;
  const scaledAx = ax * k;
  const scaledAy = ay * k;
  const scaledB = { x: 30, y: 150 };
  const scaledC = { x: 30 + scaledBase, y: 150 };
  const scaledA = { x: 30 + scaledAx, y: 150 - scaledAy };

  // Computed values
  const origSideBC = base;
  const origSideAB_val = Math.sqrt(ax * ax + ay * ay);
  const origSideAC = Math.sqrt((base - ax) ** 2 + ay ** 2);
  const scaledSideBC = origSideBC * k;
  const scaledSideAB_val = origSideAB_val * k;
  const scaledSideAC = origSideAC * k;
  const areaRatio = k * k;
  const perimRatio = k;

  const isDefault = Math.abs(k - 0.5) < 0.01 && angleA === 60;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת דמיון משולשים</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />k = {k.toFixed(1)}</span>
      </div>

      {/* SVG -- two triangles */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox="0 0 280 170" style={{ maxWidth: "100%" }}>
          {/* Original triangle */}
          <polygon
            points={`${origB.x},${origB.y} ${origC.x},${origC.y} ${origA.x},${origA.y}`}
            fill="rgba(22,163,74,0.06)" stroke="#16a34a" strokeWidth={1.8}
          />
          <text x={origB.x - 6} y={origB.y + 14} fill="#16a34a" fontSize={10} fontWeight={700}>B</text>
          <text x={origC.x + 2} y={origC.y + 14} fill="#16a34a" fontSize={10} fontWeight={700}>C</text>
          <text x={origA.x - 2} y={origA.y - 6} fill="#16a34a" fontSize={10} fontWeight={700}>A</text>

          {/* Scaled triangle (offset to the right for clarity) */}
          <polygon
            points={`${scaledB.x},${scaledB.y} ${scaledC.x},${scaledC.y} ${scaledA.x},${scaledA.y}`}
            fill="rgba(124,58,237,0.08)" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="4,2"
          />
          <text x={scaledB.x - 6} y={scaledB.y + 14} fill="#7c3aed" fontSize={9} fontWeight={600}>E</text>
          <text x={scaledC.x + 2} y={scaledC.y + 14} fill="#7c3aed" fontSize={9} fontWeight={600}>F</text>
          <text x={scaledA.x - 2} y={scaledA.y - 6} fill="#7c3aed" fontSize={9} fontWeight={600}>D</text>
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>יחס דמיון k</span>
            <span style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{k.toFixed(1)}</span>
          </div>
          <input type="range" min={0.2} max={2.0} step={0.1} value={k}
            onChange={e => setK(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#7c3aed" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>זווית A</span>
            <span style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{angleA}&deg;</span>
          </div>
          <input type="range" min={30} max={120} step={1} value={angleA}
            onChange={e => setAngleA(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>k</p>
          <p style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{k.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>k\u00B2 (יחס שטחים)</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{areaRatio.toFixed(2)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>צלע דומה (BC)</p>
          <p style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{scaledSideBC.toFixed(0)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>יחס היקפים</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{perimRatio.toFixed(1)}</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#16a34a", fontWeight: 600 }}>משולש מקורי</span>: BC = {origSideBC.toFixed(0)} &nbsp;|&nbsp;
        <span style={{ color: "#7c3aed", fontWeight: 600 }}>משולש דומה</span>: BC&apos; = {scaledSideBC.toFixed(0)} &nbsp;|&nbsp;
        <span style={{ color: "#dc2626", fontWeight: 600 }}>יחס שטחים = {areaRatio.toFixed(2)}</span>
      </div>

      <LabMessage text="שנו את יחס הדמיון וראו כיצד המשולש הדומה משתנה" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimilarityPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>דמיון משולשים עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>תנאי דמיון, יחס דמיון, יחס שטחים</p>
          </div>
          <Link
            href="/3u/topic/grade10/geometry"
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

        <SubtopicProgress subtopicId="3u/grade10/geometry/similarity" />

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
        <SimilarityLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/geometry/similarity" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
