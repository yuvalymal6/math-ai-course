"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle ABC — larger */}
      <polygon points="40,150 160,150 100,40" fill="none" stroke="#16A34A" strokeWidth={2} />
      <text x={30} y={162} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={162} y={162} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={94} y={32} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Angle arcs at A */}
      <path d="M 55,150 A 15,15 0 0,0 47,138" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      {/* Angle arcs at B */}
      <path d="M 145,150 A 15,15 0 0,1 153,138" fill="none" stroke="#a78bfa" strokeWidth={1.5} />

      {/* Triangle DEF — smaller */}
      <polygon points="200,150 280,150 240,80" fill="none" stroke="#16A34A" strokeWidth={2} />
      <text x={190} y={162} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={282} y={162} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">E</text>
      <text x={234} y={72} fontSize={12} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">F</text>
      {/* Angle arcs at D */}
      <path d="M 215,150 A 15,15 0 0,0 207,138" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      {/* Angle arcs at E */}
      <path d="M 265,150 A 15,15 0 0,1 273,138" fill="none" stroke="#a78bfa" strokeWidth={1.5} />
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Triangle ABC — larger */}
      <polygon points="30,160 170,160 100,30" fill="none" stroke="#EA580C" strokeWidth={2} />
      <text x={20} y={172} fontSize={12} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={172} y={172} fontSize={12} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={94} y={22} fontSize={12} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">C</text>
      {/* Tick marks on AB */}
      <line x1={95} y1={158} x2={95} y2={152} stroke="#EA580C" strokeWidth={1.5} />
      <line x1={100} y1={158} x2={100} y2={152} stroke="#EA580C" strokeWidth={1.5} />
      {/* Tick marks on AC */}
      <line x1={62} y1={92} x2={56} y2={96} stroke="#EA580C" strokeWidth={1.5} />

      {/* Triangle DEF — smaller, proportional */}
      <polygon points="210,160 300,160 255,75" fill="none" stroke="#EA580C" strokeWidth={2} />
      <text x={200} y={172} fontSize={12} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">D</text>
      <text x={302} y={172} fontSize={12} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">E</text>
      <text x={249} y={67} fontSize={12} fill="#EA580C" fontWeight={700} fontFamily="sans-serif">F</text>
      {/* Tick marks on DE */}
      <line x1={252} y1={158} x2={252} y2={152} stroke="#EA580C" strokeWidth={1.5} />
      <line x1={257} y1={158} x2={257} y2={152} stroke="#EA580C" strokeWidth={1.5} />
      {/* Tick marks on DF */}
      <line x1={230} y1={115} x2={224} y2={119} stroke="#EA580C" strokeWidth={1.5} />

      {/* k label */}
      <text x={160} y={100} fontSize={11} fill="#6B7280" fontFamily="sans-serif" textAnchor="middle">k</text>
      <line x1={140} y1={96} x2={180} y2={96} stroke="#6B7280" strokeWidth={0.5} strokeDasharray="3,2" />
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Big triangle ABC */}
      <polygon points="140,20 40,180 240,180" fill="none" stroke="#DC2626" strokeWidth={2} />
      <text x={136} y={14} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">A</text>
      <text x={24} y={190} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">B</text>
      <text x={244} y={190} fontSize={12} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">C</text>

      {/* Points D on AB and E on AC */}
      <circle cx={100} cy={84} r={3} fill="#f59e0b" />
      <text x={86} y={80} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">D</text>
      <circle cx={180} cy={84} r={3} fill="#f59e0b" />
      <text x={186} y={80} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">E</text>

      {/* Parallel line DE */}
      <line x1={100} y1={84} x2={180} y2={84} stroke="#f59e0b" strokeWidth={2} />

      {/* BC line (base) */}
      {/* Already drawn as part of the triangle */}

      {/* Parallel markers on DE and BC */}
      <line x1={136} y1={81} x2={140} y2={87} stroke="#34d399" strokeWidth={1.5} />
      <line x1={140} y1={81} x2={144} y2={87} stroke="#34d399" strokeWidth={1.5} />
      <line x1={136} y1={177} x2={140} y2={183} stroke="#34d399" strokeWidth={1.5} />
      <line x1={140} y1={177} x2={144} y2={183} stroke="#34d399" strokeWidth={1.5} />

      {/* Label DE || BC */}
      <text x={200} y={60} fontSize={10} fill="#64748b" fontFamily="sans-serif">DE || BC</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "16,185,129", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span>✨</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "16,185,129", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
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
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
    </div>
  );

  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה 🤖
          </button>
        )}

        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
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

  const ROSE = { border: "rgba(244,63,94,0.35)", dim: "rgba(244,63,94,0.2)", text: "#fda4af" };

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span>🔒</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
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
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : ROSE.border}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(244,63,94,0.2)"}` }}>
        {passed
          ? <CheckCircle size={14} color="#34d399" />
          : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>
              <span>ציון</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${ROSE.border}`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה 🤖
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
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  סיימתי סעיף זה
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>🔒</div>
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
        subjectWords={["דמיון", "משולש", "יחס", "מקביל", "שטח", "זוויות"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } — { s.label }</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ s.phase } — { s.label }</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{ s.prompt }</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                סיימתי סעיף זה
              </button>
            </div>
          )}
        </div>
      ))}

      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את כל הסעיפים.</div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "זיהוי משולשים דומים",
    problem: "נתונים שני משולשים ABC ו-DEF.\nבמשולש ABC: זווית A = 50°, זווית B = 70°.\nבמשולש DEF: זווית D = 50°, זווית E = 70°.\n\nא. הוכיחו שהמשולשים דומים (לפי תנאי AA).\nב. כתבו את יחס הדמיון k.\nג. מצאו צלע חסרה במשולש DEF בעזרת יחס הדמיון.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שיוך שגוי של קודקודים", text: "כשכותבים דמיון בין משולשים, הסדר קריטי! ABC ~ DEF פירושו A מתאים ל-D, B ל-E, C ל-F. טעות בסדר גוררת יחסי צלעות שגויים." },
      { title: "שכחת בדיקת התאמת זוויות", text: "לפני שטוענים AA צריך לוודא שכל זווית במשולש אחד שווה בדיוק לזווית המתאימה במשולש השני — לא מספיק שיש שתי זוויות שוות כלשהן." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא', 3 יחידות, ומצרף/ת שאלה בגיאומטריה בנושא משולשים דומים. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "הוכחת דמיון AA", coaching: "", prompt: "נתונים שני משולשים ABC ו-DEF. זוויות A=50°, B=70° ובמשולש DEF: D=50°, E=70°. תנחה אותי להוכיח דמיון לפי תנאי AA — שתי זוגות זוויות שוות.", keywords: [], keywordHint: "", contextWords: ["דמיון", "זוויות", "AA", "שווה", "משולש", "תנאי"] },
      { phase: "סעיף ב׳", label: "כתיבת יחס דמיון k", coaching: "", prompt: "המשולשים ABC ו-DEF דומים. תסביר לי כיצד כותבים את יחס הדמיון k — איזה צלעות מחלקים באלה.", keywords: [], keywordHint: "", contextWords: ["יחס", "דמיון", "צלע", "k", "חילוק", "מתאימות"] },
      { phase: "סעיף ג׳", label: "מציאת צלע חסרה", coaching: "", prompt: "יחס הדמיון בין משולשים ABC ו-DEF הוא k. תכווין אותי למצוא צלע חסרה בעזרת הכפלה או חילוק ביחס k.", keywords: [], keywordHint: "", contextWords: ["צלע", "חסרה", "יחס", "הכפלה", "חילוק", "k"] },
    ],
  },
  {
    id: "medium",
    title: "יחס דמיון ושטחים",
    problem: "משולש ABC דומה למשולש DEF עם יחס דמיון k.\nנתונים: AB = a, BC = b, AC = c, ושטח משולש ABC = S.\n\nא. מצאו את צלעות משולש DEF בעזרת יחס הדמיון k.\nב. חשבו את שטח משולש DEF (יחס השטחים = k²).\nג. מצאו את יחס ההיקפים בין שני המשולשים.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שימוש ב-k במקום k² לשטח", text: "יחס הצלעות הוא k, אבל יחס השטחים הוא k² — לא k! אם k=2, השטח גדול פי 4 ולא פי 2. זו טעות קלאסית שחוזרת בבגרויות." },
      { title: "בלבול בין יחס צלעות ליחס שטחים", text: "יחס ההיקפים שווה ל-k (כמו הצלעות), אבל יחס השטחים הוא k². תלמידים רבים מחליפים ביניהם." },
    ],
    goldenPrompt: `אני בכיתה יא', 3 יחידות, מצרף/ת תרגיל בגיאומטריה בנושא יחס דמיון ושטחים של משולשים דומים.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על יחס צלעות, יחס שטחים, ויחס היקפים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת צלעות DEF", coaching: "", prompt: "משולש ABC דומה למשולש DEF עם יחס k. נתונות צלעות ABC. תנחה אותי למצוא את צלעות DEF על ידי הכפלה ב-k.", keywords: [], keywordHint: "", contextWords: ["צלע", "יחס", "דמיון", "k", "הכפלה", "מתאימות"] },
      { phase: "סעיף ב׳", label: "חישוב שטח DEF", coaching: "", prompt: "משולש ABC דומה למשולש DEF עם יחס k, ושטח ABC ידוע. תדריך אותי לחשב את שטח DEF בעזרת יחס שטחים k².", keywords: [], keywordHint: "", contextWords: ["שטח", "יחס", "ריבוע", "k²", "דמיון", "חישוב"] },
      { phase: "סעיף ג׳", label: "יחס היקפים", coaching: "", prompt: "משולש ABC דומה למשולש DEF עם יחס k. תכווין אותי להבין מדוע יחס ההיקפים שווה ל-k ולא ל-k².", keywords: [], keywordHint: "", contextWords: ["היקף", "יחס", "צלעות", "סכום", "k", "דמיון"] },
    ],
  },
  {
    id: "advanced",
    title: "דמיון במשולש עם קו מקביל",
    problem: "במשולש ABC, הנקודה D נמצאת על צלע AB והנקודה E נמצאת על צלע AC, כך ש-DE || BC.\nנתונים: AD, DB, AE.\n\nא. הוכיחו שמשולש ADE דומה למשולש ABC.\nב. מצאו את EC בעזרת יחס הדמיון.\nג. מצאו את יחס השטחים של משולש ADE למשולש ABC.\nד. מצאו את יחס שטח הטרפז BCED לשטח משולש ABC.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "שכחת נימוק למקביליות", text: "דמיון בעזרת קו מקביל מבוסס על משפט תאלס — DE || BC יוצר זוויות מתאימות שוות. בלי נימוק ברור למה הזוויות שוות, ההוכחה לא שלמה." },
      { title: "טעות ביחס לשטח הטרפז", text: "שטח הטרפז BCED = שטח ABC פחות שטח ADE. תלמידים רבים מנסים לחשב את שטח הטרפז ישירות במקום להשתמש בהפרש." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד משתמשים בקו מקביל לצלע במשולש כדי להוכיח דמיון? מהו יחס השטחים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הוכחת דמיון ADE ~ ABC", coaching: "", prompt: "במשולש ABC, קו DE מקביל ל-BC כש-D על AB ו-E על AC. תנחה אותי להוכיח שמשולש ADE דומה למשולש ABC לפי זוויות מתאימות.", keywords: [], keywordHint: "", contextWords: ["דמיון", "מקביל", "זוויות", "מתאימות", "משולש", "תאלס"] },
      { phase: "סעיף ב׳", label: "מציאת EC", coaching: "", prompt: "במשולש ABC, DE || BC, נתונים AD, DB, AE. תדריך אותי למצוא את EC בעזרת יחס הדמיון AD/AB.", keywords: [], keywordHint: "", contextWords: ["EC", "יחס", "דמיון", "צלע", "חילוק", "מקביל"] },
      { phase: "סעיף ג׳", label: "יחס שטחים ADE/ABC", coaching: "", prompt: "משולש ADE דומה למשולש ABC עם יחס k. תכווין אותי לחשב את יחס השטחים k² בין שני המשולשים.", keywords: [], keywordHint: "", contextWords: ["שטח", "יחס", "ריבוע", "k²", "דמיון", "משולש"] },
      { phase: "סעיף ד׳", label: "שטח טרפז BCED", coaching: "", prompt: "שטח משולש ADE הוא k² משטח ABC. תנחה אותי לחשב את יחס שטח הטרפז BCED לשטח ABC כהפרש 1 - k².", keywords: [], keywordHint: "", contextWords: ["טרפז", "הפרש", "שטח", "יחס", "BCED", "k²"] },
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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>📐 משולשים דומים (Similar Triangles)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "זיהוי דמיון לפי תנאי AA — שתי זוגות זוויות שוות, וכתיבת יחס דמיון."}
            {ex.id === "medium" && "יחס דמיון, יחס שטחים ויחס היקפים — הקשר בין k ל-k²."}
            {ex.id === "advanced" && "דמיון במשולש עם קו מקביל — משפט תאלס, יחס שטחים וטרפז."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: Similarity conditions */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📏 תנאי דמיון</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AA</span>
              <span>שתי זוגות זוויות שוות — מספיק לדמיון.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>SAS</span>
              <span>יחס שווה בין שתי צלעות + זווית שביניהן שווה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>SSS</span>
              <span>יחס שווה בין כל שלוש הצלעות.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📐 יחסי דמיון</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>k (צלעות)</span>
                  <span>יחס הצלעות המתאימות שווה ל-k.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>k² (שטח)</span>
                  <span>יחס השטחים שווה לריבוע יחס הדמיון.</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Advanced extras */}
        {ex.id === "advanced" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🔬 קו מקביל לצלע במשולש</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>תאלס</span>
                  <span>DE || BC יוצר משולשים דומים ADE ~ ABC.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>טרפז</span>
                  <span>שטח BCED = שטח ABC - שטח ADE.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── SimilarityLab (basic) ──────────────────────────────────────────────────

function SimilarityLab() {
  const [k, setK] = useState(1.5);
  const st = STATION.basic;

  // Base triangle sides
  const baseA = 60, baseB = 80, baseC = 100;
  const sideA = baseA * k, sideB = baseB * k, sideC = baseC * k;

  // Draw two triangles
  const fixedPts = "40,130 120,130 80,50";
  const scale = k;
  // Scaled triangle offset to the right
  const cx2 = 220, cy2 = 130;
  const pts2 = `${cx2 - 40 * scale},${cy2} ${cx2 + 40 * scale},${cy2} ${cx2},${cy2 - 80 * scale}`;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת יחס דמיון</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את מקדם הדמיון k וצפו כיצד המשולש השני גדל או קטן — הזוויות נשארות זהות!</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>יחס דמיון k</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{k.toFixed(2)}</span>
          </div>
          <input type="range" min={0.5} max={3} step={0.05} value={k} onChange={(e) => setK(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 360 160" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Fixed triangle */}
          <polygon points={fixedPts} fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.6} />
          <text x={80} y={145} fontSize={10} fill="#16A34A" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">מקור</text>

          {/* Scaled triangle */}
          <polygon points={pts2} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.7} />
          <text x={cx2} y={145} fontSize={10} fill="#f59e0b" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">{`k = ${k.toFixed(2)}`}</text>

          {/* Angle arcs on both — show they match */}
          <path d="M 52,130 A 12,12 0 0,0 46,120" fill="none" stroke="#a78bfa" strokeWidth={1.5} />
          <path d={`M ${cx2 - 40 * scale + 12},${cy2} A 12,12 0 0,0 ${cx2 - 40 * scale + 6},${cy2 - 10}`} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "k", val: k.toFixed(2) },
          { label: "צלע A × k", val: sideA.toFixed(0) },
          { label: "צלע B × k", val: sideB.toFixed(0) },
          { label: "צלע C × k", val: sideC.toFixed(0) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הזוויות זהות תמיד — רק הגודל משתנה!</p>
    </section>
  );
}

// ─── AreaRatioLab (medium) ──────────────────────────────────────────────────

function AreaRatioLab() {
  const [k, setK] = useState(1.5);
  const st = STATION.medium;

  const area1 = 100;
  const area2 = area1 * k * k;

  // Triangles
  const baseSize = 40;
  const h1 = 70;
  const cx1 = 90, cy1 = 140;
  const cx2 = 260, cy2 = 140;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת יחס שטחים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את k וצפו: יחס השטחים תמיד k² — לא k!</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>יחס דמיון k</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{k.toFixed(2)}</span>
          </div>
          <input type="range" min={0.5} max={3} step={0.05} value={k} onChange={(e) => setK(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 360 160" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Triangle 1 — fixed */}
          <polygon
            points={`${cx1 - baseSize},${cy1} ${cx1 + baseSize},${cy1} ${cx1},${cy1 - h1}`}
            fill="#EA580C" fillOpacity={0.2} stroke="#EA580C" strokeWidth={2}
          />
          <text x={cx1} y={cy1 + 14} fontSize={10} fill="#EA580C" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">S = {area1}</text>

          {/* Triangle 2 — scaled */}
          <polygon
            points={`${cx2 - baseSize * k},${cy2} ${cx2 + baseSize * k},${cy2} ${cx2},${cy2 - h1 * k}`}
            fill="#f59e0b" fillOpacity={0.15} stroke="#f59e0b" strokeWidth={2}
          />
          <text x={cx2} y={cy2 + 14} fontSize={10} fill="#f59e0b" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">S = {area2.toFixed(0)}</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "k", val: k.toFixed(2) },
          { label: "k²", val: (k * k).toFixed(2) },
          { label: "שטח 1", val: String(area1) },
          { label: "שטח 2", val: area2.toFixed(0) },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>יחס שטחים הוא תמיד k² — לא k! שימו לב להבדל.</p>
    </section>
  );
}

// ─── ParallelLineLab (advanced) ─────────────────────────────────────────────

function ParallelLineLab() {
  const [pos, setPos] = useState(40); // percentage 0-100
  const st = STATION.advanced;

  const t = pos / 100; // ratio AD/AB

  // Triangle points
  const ax = 160, ay = 20;
  const bx = 40, by = 170;
  const cx = 280, cy = 170;

  // D on AB, E on AC
  const dx = ax + (bx - ax) * t;
  const dy = ay + (by - ay) * t;
  const ex = ax + (cx - ax) * t;
  const ey = ay + (cy - ay) * t;

  const ratioK = t;
  const areaRatio = t * t;
  const trapezoidFraction = 1 - areaRatio;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת קו מקביל במשולש</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הזיזו את D על הצלע AB וצפו כיצד יחס הדמיון ויחס השטחים משתנים.</p>

      {/* Slider */}
      <div style={{ maxWidth: 400, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>מיקום D על AB (%)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{pos}%</span>
          </div>
          <input type="range" min={5} max={95} step={1} value={pos} onChange={(e) => setPos(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 320 200" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Big triangle ABC */}
          <polygon points={`${ax},${ay} ${bx},${by} ${cx},${cy}`} fill="none" stroke="#94a3b8" strokeWidth={1.5} />

          {/* Small triangle ADE — filled */}
          <polygon points={`${ax},${ay} ${dx},${dy} ${ex},${ey}`} fill="#DC2626" fillOpacity={0.12} stroke="#DC2626" strokeWidth={2} />

          {/* Trapezoid BCED — filled */}
          <polygon points={`${dx},${dy} ${bx},${by} ${cx},${cy} ${ex},${ey}`} fill="#f59e0b" fillOpacity={0.08} stroke="none" />

          {/* DE parallel line */}
          <line x1={dx} y1={dy} x2={ex} y2={ey} stroke="#f59e0b" strokeWidth={2} />

          {/* BC */}
          <line x1={bx} y1={by} x2={cx} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />

          {/* Parallel markers */}
          <line x1={(dx + ex) / 2 - 3} y1={(dy + ey) / 2 - 3} x2={(dx + ex) / 2 + 1} y2={(dy + ey) / 2 + 3} stroke="#34d399" strokeWidth={1.5} />
          <line x1={(dx + ex) / 2 + 1} y1={(dy + ey) / 2 - 3} x2={(dx + ex) / 2 + 5} y2={(dy + ey) / 2 + 3} stroke="#34d399" strokeWidth={1.5} />
          <line x1={(bx + cx) / 2 - 3} y1={(by + cy) / 2 - 3} x2={(bx + cx) / 2 + 1} y2={(by + cy) / 2 + 3} stroke="#34d399" strokeWidth={1.5} />
          <line x1={(bx + cx) / 2 + 1} y1={(by + cy) / 2 - 3} x2={(bx + cx) / 2 + 5} y2={(by + cy) / 2 + 3} stroke="#34d399" strokeWidth={1.5} />

          {/* Labels */}
          <text x={ax} y={ay - 6} fontSize={12} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
          <text x={bx - 10} y={by + 4} fontSize={12} fill="#94a3b8" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
          <text x={cx + 10} y={cy + 4} fontSize={12} fill="#94a3b8" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">C</text>
          <circle cx={dx} cy={dy} r={3.5} fill="#f59e0b" />
          <text x={dx - 14} y={dy + 4} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">D</text>
          <circle cx={ex} cy={ey} r={3.5} fill="#f59e0b" />
          <text x={ex + 8} y={ey + 4} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">E</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "AD/AB (k)", val: ratioK.toFixed(2) },
          { label: "שטח ADE/ABC (k²)", val: (areaRatio * 100).toFixed(1) + "%" },
          { label: "שטח טרפז/ABC", val: (trapezoidFraction * 100).toFixed(1) + "%" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כש-D באמצע AB: יחס שטח ADE/ABC = 25% בלבד (כי k² = 0.25).</p>
    </section>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",  border: "border-green-600",  bg: "bg-green-600/10",  glowColor: "rgba(22,163,74,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700", border: "border-orange-600", bg: "bg-orange-600/10", glowColor: "rgba(234,88,12,0.3)"  },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",    border: "border-red-700",    bg: "bg-red-700/10",    glowColor: "rgba(220,38,38,0.3)"  },
];

// ─── Formula Bar ──────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"conditions" | "sideRatio" | "areaRatio" | null>(null);

  const tabs = [
    { id: "conditions" as const, label: "📐 תנאי דמיון", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "sideRatio" as const, label: "📏 יחס צלעות", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "areaRatio" as const, label: "📊 יחס שטחים", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

      {/* Tab buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{
                flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.1)"}`,
                background: isActive ? `${t.color}0D` : "rgba(60,54,42,0.03)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Expanded: Similarity Conditions */}
      {activeTab === "conditions" && (
        <motion.div key="conditions" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div style={{ color: "#16A34A", fontSize: 15, fontWeight: 700, textAlign: "center", marginBottom: 14 }}>תנאי דמיון משולשים</div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <ol dir="rtl" style={{ margin: 0, paddingInlineStart: 18 }}>
                  <li><strong>AA (זווית-זווית):</strong> שתי זוגות זוויות שוות בין שני משולשים.</li>
                  <li><strong>SAS (צלע-זווית-צלע):</strong> יחס שווה בין שתי צלעות + זווית שביניהן שווה.</li>
                  <li><strong>SSS (צלע-צלע-צלע):</strong> יחס שווה בין כל שלוש הצלעות.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                AA הוא התנאי השכיח ביותר — מספיק להראות שתי זוויות שוות (השלישית בהכרח שווה כי סכום הזוויות = 180).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Side Ratio */}
      {activeTab === "sideRatio" && (
        <motion.div key="sideRatio" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{AB}{DE} = \\frac{BC}{EF} = \\frac{AC}{DF} = k"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כשמשולשים דומים, היחס בין כל זוג צלעות מתאימות שווה וקבוע — זהו יחס הדמיון k.
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: אם AB=6, DE=3 אז k=2. כלומר BC = k * EF, ו-AC = k * DF.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Area Ratio */}
      {activeTab === "areaRatio" && (
        <motion.div key="areaRatio" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{S_1}{S_2} = k^2"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> יחס השטחים בין משולשים דומים שווה לריבוע יחס הדמיון. שטח הוא מידה דו-ממדית, ולכן k מוכפל פעמיים.
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: אם k=3 (המשולש גדול פי 3), שטחו גדול פי 9 (כי 3² = 9).
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimilarTrianglesPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"], input[type="password"] {
          outline: none !important;
        }
        textarea:focus, input[type="text"]:focus {
          outline: none !important;
          border-color: rgba(var(--lvl-rgb), 0.65) !important;
          box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important;
        }
        input[type="range"] {
          outline: none !important;
        }
        input[type="range"]:focus {
          outline: none !important;
        }
        button:focus, button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important;
        }
        button:focus:not(:focus-visible) {
          box-shadow: none !important;
        }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משולשים דומים עם AI — כיתה יא׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>זיהוי דמיון, יחס צלעות, יחס שטחים וקו מקביל — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade11/geometry"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="3u/grade11/geometry/similar-triangles" />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id as typeof selectedLevel)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Formula Bar */}
        <FormulaBar />

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <SimilarityLab />}
        {selectedLevel === "medium" && <AreaRatioLab />}
        {selectedLevel === "advanced" && <ParallelLineLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/geometry/similar-triangles" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
