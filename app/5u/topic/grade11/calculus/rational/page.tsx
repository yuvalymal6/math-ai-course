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
    <svg viewBox="0 0 280 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* axes */}
      <line x1={40} y1={90} x2={260} y2={90} stroke="#94a3b8" strokeWidth={1} />
      <line x1={140} y1={15} x2={140} y2={170} stroke="#94a3b8" strokeWidth={1} />
      {/* hyperbola left branch */}
      <path d="M 50 145 Q 75 125, 90 110 Q 105 98, 115 95" stroke="#16A34A" strokeWidth={2} fill="none" />
      {/* hyperbola right branch */}
      <path d="M 175 85 Q 190 82, 210 78 Q 235 72, 260 55" stroke="#16A34A" strokeWidth={2} fill="none" />
      {/* vertical asymptote */}
      <line x1={145} y1={15} x2={145} y2={170} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />
      <text x={150} y={28} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* horizontal asymptote */}
      <line x1={40} y1={88} x2={260} y2={88} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,4" />
      <text x={250} y={82} fontSize={11} fill="#a78bfa" fontFamily="sans-serif">?</text>
      {/* labels */}
      <text x={265} y={94} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={144} y={12} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
      <text x={80} y={140} fontSize={10} fill="#64748b" fontFamily="sans-serif">f</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* axes */}
      <line x1={30} y1={100} x2={300} y2={100} stroke="#94a3b8" strokeWidth={1} />
      <line x1={160} y1={10} x2={160} y2={190} stroke="#94a3b8" strokeWidth={1} />
      {/* left branch (beyond left VA) */}
      <path d="M 35 55 Q 50 60, 60 68 Q 70 80, 75 95" stroke="#EA580C" strokeWidth={2} fill="none" />
      {/* middle branch (between VAs) */}
      <path d="M 95 105 Q 110 115, 130 135 Q 145 150, 155 165" stroke="#EA580C" strokeWidth={2} fill="none" />
      <path d="M 165 35 Q 175 50, 190 65 Q 205 80, 220 95" stroke="#EA580C" strokeWidth={2} fill="none" />
      {/* right branch */}
      <path d="M 240 105 Q 255 108, 270 107 Q 285 106, 300 105" stroke="#EA580C" strokeWidth={2} fill="none" />
      {/* vertical asymptote 1 */}
      <line x1={85} y1={10} x2={85} y2={190} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />
      <text x={89} y={22} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* vertical asymptote 2 */}
      <line x1={230} y1={10} x2={230} y2={190} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />
      <text x={234} y={22} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* horizontal asymptote */}
      <line x1={30} y1={102} x2={300} y2={102} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,4" />
      <text x={290} y={96} fontSize={11} fill="#a78bfa" fontFamily="sans-serif">?</text>
      {/* intercept marks */}
      <circle cx={130} cy={100} r={4} fill="none" stroke="#34d399" strokeWidth={2} />
      <text x={126} y={115} fontSize={9} fill="#34d399" fontFamily="sans-serif">?</text>
      <circle cx={200} cy={100} r={4} fill="none" stroke="#34d399" strokeWidth={2} />
      <text x={196} y={115} fontSize={9} fill="#34d399" fontFamily="sans-serif">?</text>
      {/* labels */}
      <text x={304} y={104} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={164} y={14} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 190" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* axes */}
      <line x1={30} y1={95} x2={260} y2={95} stroke="#94a3b8" strokeWidth={1} />
      <line x1={140} y1={10} x2={140} y2={180} stroke="#94a3b8" strokeWidth={1} />
      {/* simplified curve (looks like y=x/(x+a)) */}
      <path d="M 40 130 Q 60 120, 80 112 Q 100 104, 115 98" stroke="#DC2626" strokeWidth={2} fill="none" />
      <path d="M 165 92 Q 185 88, 210 85 Q 240 82, 260 78" stroke="#DC2626" strokeWidth={2} fill="none" />
      {/* hole (empty circle) */}
      <circle cx={115} cy={98} r={5} fill="#F3EFE0" stroke="#a78bfa" strokeWidth={2} />
      <text x={108} y={90} fontSize={9} fill="#a78bfa" fontFamily="sans-serif">חור</text>
      {/* vertical asymptote */}
      <line x1={140} y1={10} x2={140} y2={180} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />
      <text x={145} y={22} fontSize={11} fill="#f59e0b" fontFamily="sans-serif">?</text>
      {/* horizontal asymptote */}
      <line x1={30} y1={85} x2={260} y2={85} stroke="#64748b" strokeWidth={1.2} strokeDasharray="5,3" />
      <text x={250} y={80} fontSize={10} fill="#64748b" fontFamily="sans-serif">?</text>
      {/* param label */}
      <text x={45} y={170} fontSize={11} fill="#a78bfa" fontFamily="sans-serif" fontWeight={600}>a = ?</text>
      {/* labels */}
      <text x={264} y={99} fontSize={10} fill="#64748b" fontFamily="sans-serif">x</text>
      <text x={144} y={14} fontSize={10} fill="#64748b" fontFamily="sans-serif">y</text>
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

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

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
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" readOnly={passed}
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
        subjectWords={["רציונלית", "אסימפטוטה", "חור", "תחום", "פרמטר", "חקירה"]}
      />
      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{s.phase} — {s.label}</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.phase} — {s.label}</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{s.prompt}</div>
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
    title: "תחום הגדרה ואסימפטוטה אנכית",
    problem: "נתונה הפונקציה f(x) = (2x+1)/(x-3)\n\nא. מצאו את תחום ההגדרה של הפונקציה (היכן המכנה שונה מאפס).\nב. מצאו את האסימפטוטה האנכית.\nג. מצאו את האסימפטוטה האופקית (התנהגות כאשר x שואף לאינסוף).",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "שוכחים להוציא את אפסי המכנה מהתחום", text: "תחום ההגדרה של פונקציה רציונלית הוא כל הממשיים חוץ מהנקודות שבהן המכנה מתאפס. תלמידים רבים כותבים 'כל הממשיים' בלי לבדוק את המכנה — וזו טעות!" },
      { title: "בלבול בין אסימפטוטה אנכית לאופקית", text: "אסימפטוטה אנכית היא קו x=a כאשר המכנה מתאפס (והמונה לא). אסימפטוטה אופקית היא קו y=L שהפונקציה מתקרבת אליו כש-x שואף לאינסוף. אל תערבבו בין השניים!" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יא׳, 5 יחידות, ומצרף/ת שאלה על פונקציה רציונלית — תחום הגדרה ואסימפטוטות. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת תחום ההגדרה", coaching: "", prompt: "נתונה f(x) = (2x+1)/(x-3). תנחה אותי למצוא את תחום ההגדרה — היכן המכנה מתאפס ומה צריך להוציא מהתחום.", keywords: [], keywordHint: "", contextWords: ["תחום", "מכנה", "אפס", "שונה", "הגדרה", "רציונלית"] },
      { phase: "סעיף ב׳", label: "אסימפטוטה אנכית", coaching: "", prompt: "נתונה f(x) = (2x+1)/(x-3). תסביר לי כיצד מוצאים אסימפטוטה אנכית — מתי המכנה מתאפס והמונה לא.", keywords: [], keywordHint: "", contextWords: ["אסימפטוטה", "אנכית", "מכנה", "אפס", "מונה", "x"] },
      { phase: "סעיף ג׳", label: "אסימפטוטה אופקית", coaching: "", prompt: "נתונה f(x) = (2x+1)/(x-3). תכווין אותי למצוא את האסימפטוטה האופקית — מה קורה כש-x שואף לאינסוף ומה היחס בין מעלות המונה והמכנה.", keywords: [], keywordHint: "", contextWords: ["אסימפטוטה", "אופקית", "אינסוף", "מעלה", "מקדם", "גבול"] },
    ],
  },
  {
    id: "medium",
    title: "חקירה מלאה של פונקציה רציונלית",
    problem: "נתונה הפונקציה f(x) = (x²-4)/(x²-1)\n\nא. מצאו תחום הגדרה, אסימפטוטות אנכיות ואסימפטוטה אופקית.\nב. מצאו נקודות חיתוך עם הצירים (מונה=0 עבור ציר x, הצבת x=0 עבור ציר y).\nג. קבעו את סימן f(x) בכל קטע.\nד. שרטטו סקיצה של הפונקציה.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "שוכחים לפרק את הביטויים", text: "x²-4 = (x-2)(x+2) ו-x²-1 = (x-1)(x+1). בלי פירוק לגורמים לא ניתן למצוא אפסים ואסימפטוטות בצורה מדויקת. תמיד פרקו קודם!" },
      { title: "לא בודקים שינוי סימן ליד אסימפטוטות", text: "ליד כל אסימפטוטה אנכית הפונקציה יכולה לשאוף ל-+∞ או ל--∞. צריך לבדוק את הסימן משני הצדדים של כל אסימפטוטה כדי לשרטט נכון." },
    ],
    goldenPrompt: `אני בכיתה יא׳, 5 יחידות, מצרף/ת תרגיל בחקירה מלאה של פונקציה רציונלית — תחום, אסימפטוטות, נקודות חיתוך, סימן וסקיצה.

אל תיתן לי את הפתרון — שאל אותי שאלות מנחות על פירוק לגורמים, מציאת אפסים, וניתוח סימנים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "תחום ואסימפטוטות", coaching: "", prompt: "נתונה f(x) = (x²-4)/(x²-1). תנחה אותי למצוא תחום הגדרה, לפרק את המכנה לגורמים, ולמצוא אסימפטוטות אנכיות ואופקית.", keywords: [], keywordHint: "", contextWords: ["תחום", "אסימפטוטה", "פירוק", "גורמים", "מכנה", "אופקית"] },
      { phase: "סעיף ב׳", label: "נקודות חיתוך", coaching: "", prompt: "נתונה f(x) = (x²-4)/(x²-1). תדריך אותי למצוא חיתוך עם ציר x (מונה=0) ועם ציר y (הצבת x=0). תזכיר שצריך לפרק x²-4.", keywords: [], keywordHint: "", contextWords: ["חיתוך", "ציר", "מונה", "אפס", "הצבה", "נקודה"] },
      { phase: "סעיף ג׳", label: "טבלת סימנים", coaching: "", prompt: "נתונה f(x) = (x²-4)/(x²-1). תכווין אותי לבנות טבלת סימנים — לחלק את ציר x לקטעים לפי אפסי מונה ומכנה ולבדוק סימן בכל קטע.", keywords: [], keywordHint: "", contextWords: ["סימן", "קטע", "טבלה", "חיובי", "שלילי", "גורם"] },
      { phase: "סעיף ד׳", label: "סקיצה", coaching: "", prompt: "נתונה f(x) = (x²-4)/(x²-1). תנחה אותי לשרטט סקיצה — לשלב את האסימפטוטות, נקודות החיתוך וטבלת הסימנים לגרף אחד.", keywords: [], keywordHint: "", contextWords: ["סקיצה", "גרף", "שרטוט", "אסימפטוטה", "חיתוך", "סימן"] },
    ],
  },
  {
    id: "advanced",
    title: "חור בגרף ופרמטר",
    problem: "נתונה הפונקציה f(x) = (x²-ax)/(x²-a²) כאשר a פרמטר.\n\nא. פשטו את הביטוי — מצאו את ה\"חור\" (נקודת אי-רציפות סליקה).\nב. עבור a=2, בצעו חקירה מלאה.\nג. עבור אילו ערכי a לפונקציה יש בדיוק אסימפטוטה אנכית אחת?\nד. אם משנים את המונה ל-x³-ax, מהי האסימפטוטה האלכסונית?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "שוכחים שצמצום גורם משותף יוצר חור", text: "כאשר מונה ומכנה מתאפסים באותה נקודה, אפשר לצמצם — אבל הנקודה לא חוזרת לתחום! זו נקודת אי-רציפות סליקה (חור). צריך לציין אותה בנפרד." },
      { title: "לא בודקים ערכי a שמשנים את מבנה הפונקציה", text: "כאשר a=0, המונה והמכנה מתאפסים גם ב-x=0 — המבנה משתנה לגמרי. תמיד בדקו מקרי קצה של הפרמטר!" },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מזהים חור בפונקציה רציונלית, ומה ההבדל בין חור לאסימפטוטה? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "פישוט ומציאת חור", coaching: "", prompt: "נתונה f(x) = (x²-ax)/(x²-a²). תנחה אותי לפרק מונה ומכנה, לצמצם גורם משותף, ולמצוא את החור.", keywords: [], keywordHint: "", contextWords: ["פירוק", "צמצום", "חור", "גורם", "מונה", "מכנה"] },
      { phase: "סעיף ב׳", label: "חקירה עבור a=2", coaching: "", prompt: "עבור a=2, הפונקציה היא f(x) = x(x-2)/((x-2)(x+2)). תדריך אותי בחקירה מלאה — תחום, אסימפטוטות, חיתוך וסקיצה.", keywords: [], keywordHint: "", contextWords: ["חקירה", "תחום", "אסימפטוטה", "חיתוך", "סקיצה", "a=2"] },
      { phase: "סעיף ג׳", label: "ערכי a לאסימפטוטה אחת", coaching: "", prompt: "נתונה f(x) = (x²-ax)/(x²-a²). תכווין אותי לנתח — עבור אילו ערכי a יש בדיוק אסימפטוטה אנכית אחת ולא שתיים.", keywords: [], keywordHint: "", contextWords: ["פרמטר", "אסימפטוטה", "אנכית", "אחת", "ערך", "a"] },
      { phase: "סעיף ד׳", label: "אסימפטוטה אלכסונית", coaching: "", prompt: "אם המונה הוא x³-ax והמכנה x²-a², תסביר לי מתי יש אסימפטוטה אלכסונית ואיך מוצאים אותה בחילוק פולינומים.", keywords: [], keywordHint: "", contextWords: ["אלכסונית", "חילוק", "מעלה", "פולינום", "אסימפטוטה", "שארית"] },
    ],
  },
];

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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>פונקציות רציונליות (Rational Functions)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "תחום הגדרה, אסימפטוטה אנכית ואופקית — הכלים הבסיסיים לניתוח פונקציה רציונלית."}
            {ex.id === "medium" && "חקירה מלאה: תחום, אסימפטוטות, נקודות חיתוך, טבלת סימנים וסקיצה."}
            {ex.id === "advanced" && "חור בגרף, פרמטר משתנה, ואסימפטוטה אלכסונית — שאלות ברמת בגרות גבוהה."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: מושגי יסוד */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מושגי יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>תחום הגדרה</span>
              <span>כל ערכי x שבהם המכנה שונה מאפס.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>אס׳ אנכית</span>
              <span>x=a כאשר המכנה מתאפס והמונה לא.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>אס׳ אופקית</span>
              <span>y=L שהפונקציה מתקרבת אליה ב-x→±∞.</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>כלים מתקדמים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>טבלת סימנים</span>
                  <span>חלוקה לקטעים לפי אפסי מונה/מכנה + בדיקת סימן.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>חיתוך צירים</span>
                  <span>ציר x: מונה=0. ציר y: הצבת x=0.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>חור ופרמטר</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>חור</span>
                  <span>נקודה שבה מונה ומכנה מתאפסים → צמצום.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 120 }}>אס׳ אלכסונית</span>
                  <span>כשמעלת המונה גדולה ב-1 מהמכנה → חילוק פולינומים.</span>
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
        {ex.id === "basic"  && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── AsymptoteLab (basic) ────────────────────────────────────────────────────

function AsymptoteLab() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const st = STATION.basic;

  // f(x) = (x + a) / (x - b)
  const vertAsym = b;
  const horizAsym = 1; // leading coeff ratio = 1/1
  const domain = `x ≠ ${b}`;

  // Plot points
  const pts: { x: number; y: number }[] = [];
  for (let px = -8; px <= 8; px += 0.15) {
    if (Math.abs(px - b) < 0.25) continue;
    const y = (px + a) / (px - b);
    if (Math.abs(y) < 12) pts.push({ x: px, y });
  }

  const svgW = 300, svgH = 200;
  const mapX = (x: number) => svgW / 2 + x * 16;
  const mapY = (y: number) => svgH / 2 - y * 12;

  const leftPts = pts.filter(p => p.x < b - 0.25);
  const rightPts = pts.filter(p => p.x > b + 0.25);
  const toPath = (arr: typeof pts) => arr.length < 2 ? "" : "M " + arr.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(" L ");

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת אסימפטוטות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את a ו-b בפונקציה f(x) = (x+a)/(x-b) וצפו כיצד האסימפטוטות זזות.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "a (הזזת מונה)", val: a, set: setA, min: -5, max: 5 },
          { label: "b (הזזת מכנה)", val: b, set: setB, min: -5, max: 5 },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          {/* axes */}
          <line x1={0} y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="#94a3b8" strokeWidth={1} />
          <line x1={svgW / 2} y1={0} x2={svgW / 2} y2={svgH} stroke="#94a3b8" strokeWidth={1} />
          {/* vertical asymptote */}
          <line x1={mapX(b)} y1={0} x2={mapX(b)} y2={svgH} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />
          {/* horizontal asymptote */}
          <line x1={0} y1={mapY(horizAsym)} x2={svgW} y2={mapY(horizAsym)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,4" />
          {/* curve */}
          <path d={toPath(leftPts)} stroke={st.accentColor} strokeWidth={2} fill="none" />
          <path d={toPath(rightPts)} stroke={st.accentColor} strokeWidth={2} fill="none" />
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "אס׳ אנכית", val: `x = ${vertAsym}` },
          { label: "אס׳ אופקית", val: `y = ${horizAsym}` },
          { label: "תחום", val: domain },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>הזיזו את b וצפו כיצד האסימפטוטה האנכית זזה. האסימפטוטה האופקית תמיד y=1 כשמעלות שוות!</p>
    </section>
  );
}

// ─── InvestigationLab (medium) ───────────────────────────────────────────────

function InvestigationLab() {
  const [p, setP] = useState(2);
  const [q, setQ] = useState(1);
  const st = STATION.medium;

  // f(x) = (x²-p²)/(x²-q²) = ((x-p)(x+p))/((x-q)(x+q))
  const va1 = -q, va2 = q;
  const xInt1 = -p, xInt2 = p;
  const yInt = q !== 0 ? ((-p * p) / (-q * q)).toFixed(2) : "אין";
  const horizA = 1;

  const pts: { x: number; y: number }[] = [];
  for (let px = -8; px <= 8; px += 0.12) {
    const denom = px * px - q * q;
    if (Math.abs(denom) < 0.15) continue;
    const y = (px * px - p * p) / denom;
    if (Math.abs(y) < 10) pts.push({ x: px, y });
  }

  const svgW = 320, svgH = 220;
  const mapX = (x: number) => svgW / 2 + x * 18;
  const mapY = (y: number) => svgH / 2 - y * 14;

  const segments: typeof pts[] = [];
  let cur: typeof pts = [];
  for (const pt of pts) {
    if (cur.length > 0 && Math.abs(pt.y - cur[cur.length - 1].y) > 5) {
      segments.push(cur);
      cur = [];
    }
    cur.push(pt);
  }
  if (cur.length) segments.push(cur);

  const toPath = (arr: typeof pts) => arr.length < 2 ? "" : "M " + arr.map(pt => `${mapX(pt.x)},${mapY(pt.y)}`).join(" L ");

  // Sign summary
  const signSummary = q === 0 ? "אין אסימפטוטות — f(x) = (x²-p²)/x²"
    : p === q ? `f(x) = 1 (חוץ מ-x=±${q})`
    : `סימן משתנה ב: x=${xInt1}, ${xInt2}, ${va1}, ${va2}`;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת חקירה</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את p ו-q בפונקציה f(x) = (x²-p²)/(x²-q²) וצפו בשינויים.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "p (אפסי מונה ±p)", val: p, set: setP, min: 0, max: 5 },
          { label: "q (אפסי מכנה ±q)", val: q, set: setQ, min: 0, max: 5 },
        ].map(sl => (
          <div key={sl.label} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>{sl.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{sl.val}</span>
            </div>
            <input type="range" min={sl.min} max={sl.max} step={1} value={sl.val} onChange={(e) => sl.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={0} y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="#94a3b8" strokeWidth={1} />
          <line x1={svgW / 2} y1={0} x2={svgW / 2} y2={svgH} stroke="#94a3b8" strokeWidth={1} />
          {/* VAs */}
          {q !== 0 && <line x1={mapX(-q)} y1={0} x2={mapX(-q)} y2={svgH} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />}
          {q !== 0 && <line x1={mapX(q)} y1={0} x2={mapX(q)} y2={svgH} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />}
          {/* HA */}
          <line x1={0} y1={mapY(horizA)} x2={svgW} y2={mapY(horizA)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,4" />
          {/* curve */}
          {segments.map((seg, i) => <path key={i} d={toPath(seg)} stroke={st.accentColor} strokeWidth={2} fill="none" />)}
          {/* x-intercepts */}
          {p !== q && <circle cx={mapX(-p)} cy={mapY(0)} r={4} fill="#34d399" />}
          {p !== q && <circle cx={mapX(p)} cy={mapY(0)} r={4} fill="#34d399" />}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "חיתוך ציר x", val: p === q ? "אין (=1)" : `x=${xInt1}, ${xInt2}` },
          { label: "חיתוך ציר y", val: yInt },
          { label: "סימן/מבנה", val: signSummary },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כש-p=q — הגורמים מצטמצמים ו-f(x)=1 (עם חורים)!</p>
    </section>
  );
}

// ─── HoleLab (advanced) ──────────────────────────────────────────────────────

function HoleLab() {
  const [a, setA] = useState(2);
  const st = STATION.advanced;

  // f(x) = (x²-ax)/(x²-a²) = x(x-a)/((x-a)(x+a))
  // Simplified: x/(x+a) with hole at x=a (when a≠0)
  const hasHole = a !== 0;
  const holeX = a;
  const holeY = hasHole ? (a / (a + a)).toFixed(2) : "—";
  const simplified = a === 0 ? "f(x) = x/x = 1 (x≠0)" : `f(x) = x/(x+${a})`;
  const asymX = -a;

  const pts: { x: number; y: number }[] = [];
  for (let px = -8; px <= 8; px += 0.12) {
    const denom = px + a;
    if (Math.abs(denom) < 0.15) continue;
    if (a !== 0 && Math.abs(px - a) < 0.12) continue;
    const y = px / denom;
    if (Math.abs(y) < 10) pts.push({ x: px, y });
  }

  const svgW = 300, svgH = 200;
  const mapX = (x: number) => svgW / 2 + x * 16;
  const mapY = (y: number) => svgH / 2 - y * 20;

  const segments: typeof pts[] = [];
  let cur: typeof pts = [];
  for (const pt of pts) {
    if (cur.length > 0 && Math.abs(pt.y - cur[cur.length - 1].y) > 4) {
      segments.push(cur);
      cur = [];
    }
    cur.push(pt);
  }
  if (cur.length) segments.push(cur);

  const toPath = (arr: typeof pts) => arr.length < 2 ? "" : "M " + arr.map(pt => `${mapX(pt.x)},${mapY(pt.y)}`).join(" L ");

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת חור בגרף</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הפרמטר a בפונקציה f(x) = (x²-ax)/(x²-a²) וצפו כיצד החור זז.</p>

      {/* Slider */}
      <div style={{ maxWidth: 350, margin: "0 auto 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
            <span>a (פרמטר)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{a}</span>
          </div>
          <input type="range" min={-5} max={5} step={1} value={a} onChange={(e) => setA(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
          <line x1={0} y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="#94a3b8" strokeWidth={1} />
          <line x1={svgW / 2} y1={0} x2={svgW / 2} y2={svgH} stroke="#94a3b8" strokeWidth={1} />
          {/* VA */}
          {a !== 0 && <line x1={mapX(asymX)} y1={0} x2={mapX(asymX)} y2={svgH} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />}
          {/* HA at y=1 */}
          <line x1={0} y1={mapY(1)} x2={svgW} y2={mapY(1)} stroke="#64748b" strokeWidth={1.2} strokeDasharray="5,3" />
          {/* curve */}
          {segments.map((seg, i) => <path key={i} d={toPath(seg)} stroke={st.accentColor} strokeWidth={2} fill="none" />)}
          {/* hole */}
          {hasHole && (
            <circle cx={mapX(holeX)} cy={mapY(parseFloat(holeY))} r={5} fill="#F3EFE0" stroke="#a78bfa" strokeWidth={2} />
          )}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "חור", val: hasHole ? `(${holeX}, ${holeY})` : "אין חור" },
          { label: "צורה מפושטת", val: simplified },
          { label: "אס׳ אנכית", val: a !== 0 ? `x = ${asymX}` : "אין" },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {a === 0 ? "כש-a=0 — אין חור! הפונקציה הופכת ל-f(x)=1 (עם בעיה ב-x=0)." : `הזיזו את a וצפו כיצד החור זז על הגרף. כש-a=${a}, החור ב-x=${holeX}.`}
      </p>
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
  const [activeTab, setActiveTab] = useState<"va" | "ha" | "hole" | null>(null);

  const tabs = [
    { id: "va" as const, label: "אס׳ אנכית", tex: "x = a", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "ha" as const, label: "אס׳ אופקית", tex: "y = L", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "hole" as const, label: "חור", tex: "\\circ", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {/* Vertical Asymptote */}
      {activeTab === "va" && (
        <motion.div key="va" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"Q(x) = 0 \\quad \\text{and} \\quad P(x) \\neq 0"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מוצאים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מאפסים את המכנה Q(x) = 0.</li>
                  <li>בודקים שהמונה P(x) לא מתאפס באותה נקודה.</li>
                  <li>אם גם המונה מתאפס — זה חור, לא אסימפטוטה!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: f(x) = (2x+1)/(x-3). מכנה: x-3=0 → x=3. מונה ב-3: 2(3)+1=7≠0. לכן x=3 אסימפטוטה אנכית.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Horizontal Asymptote */}
      {activeTab === "ha" && (
        <motion.div key="ha" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#EA580C", fontSize: 14, fontWeight: 700 }}>
              השוואת מעלות מונה ומכנה
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>שלושה מקרים:</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מעלת מונה &lt; מעלת מכנה → <InlineMath>{"y = 0"}</InlineMath></li>
                  <li>מעלת מונה = מעלת מכנה → <InlineMath>{"y = \\frac{a_n}{b_n}"}</InlineMath> (יחס מקדמים מובילים)</li>
                  <li>מעלת מונה &gt; מעלת מכנה → אין אסימפטוטה אופקית (יש אלכסונית)</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: f(x) = (2x+1)/(x-3). מעלות שוות (1=1). אס׳ אופקית: y = 2/1 = 2.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hole */}
      {activeTab === "hole" && (
        <motion.div key="hole" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 14, fontWeight: 700 }}>
              נקודת אי-רציפות סליקה (חור)
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מתי יש חור?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>גם המונה וגם המכנה מתאפסים באותה נקודה x=c.</li>
                  <li>מצמצמים את הגורם המשותף (x-c).</li>
                  <li>הנקודה c לא בתחום, אבל הגבול קיים → חור בגרף.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: f(x) = (x²-4)/(x²-2x) = (x-2)(x+2)/(x(x-2)). צמצום (x-2) → חור ב-x=2, ערך: (2+2)/2 = 2.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RationalFunctionsPage() {
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
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important; }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>פונקציות רציונליות עם AI — כיתה יא׳ (5 יח׳)</h1>
            <p style={{ color: "#6B7280", fontSize: 13, margin: "4px 0 0" }}>תחום, אסימפטוטות, חורים וחקירה מלאה</p>
          </div>
          <SubtopicProgress subtopicId="5u/grade11/calculus/rational" />
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

        {/* Formula Bar */}
        <FormulaBar />

        {/* Level Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: "2rem" }}>
          {TABS.map(t => {
            const active = t.id === selectedLevel;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedLevel(t.id as "basic" | "medium" | "advanced")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? `${t.textColor} ${t.border} ${t.bg} border-2` : "text-gray-500 border border-gray-200 bg-white/50 hover:bg-white/70"}`}
                style={active ? { boxShadow: `0 0 14px ${t.glowColor}` } : {}}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Exercise Card */}
        <ExerciseCard ex={ex} />

        {/* Lab */}
        {selectedLevel === "basic" && <AsymptoteLab />}
        {selectedLevel === "medium" && <InvestigationLab />}
        {selectedLevel === "advanced" && <HoleLab />}

        {/* MarkComplete */}
        <div style={{ marginTop: "2rem" }}>
          <MarkComplete subtopicId="5u/grade11/calculus/rational" level={selectedLevel} />
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link href="/5u/topic/grade11/calculus" style={{ color: "#6B7280", fontSize: 14, textDecoration: "underline" }}>
            חזרה לחשבון דיפרנציאלי
          </Link>
        </div>
      </div>
    </main>
  );
}
