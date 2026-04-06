"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle, Sparkles } from "lucide-react";
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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-400",   ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-400",  ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-400",     ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-400",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-400",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-400",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── SVG diagrams (silent — no numbers, no answers) ─────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 280 170" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Wall */}
      <rect x="50" y="20" width="180" height="10" fill="#94a3b8" rx="3" />
      <text x="140" y="16" textAnchor="middle" fill="#6B7280" fontSize="10">{"קיר"}</text>
      {/* Rectangle */}
      <rect x="50" y="30" width="180" height="100" fill="none" stroke="#16A34A" strokeWidth="2" rx="2" />
      {/* Fence ticks — left */}
      {[0,1,2,3,4,5].map(i => <line key={`l${i}`} x1={50} y1={40+i*16} x2={42} y2={40+i*16} stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />)}
      {/* Fence ticks — right */}
      {[0,1,2,3,4,5].map(i => <line key={`r${i}`} x1={230} y1={40+i*16} x2={238} y2={40+i*16} stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />)}
      {/* Fence ticks — bottom */}
      {[0,1,2,3,4,5,6,7].map(i => <line key={`b${i}`} x1={60+i*21} y1={130} x2={60+i*21} y2={138} stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />)}
      {/* Labels */}
      <text x="35" y="82" textAnchor="middle" fill="#16A34A" fontSize="14" fontWeight="bold">x</text>
      <text x="246" y="82" textAnchor="middle" fill="#16A34A" fontSize="14" fontWeight="bold">x</text>
      <text x="140" y="82" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="bold">y</text>
      <text x="140" y="158" textAnchor="middle" fill="#6B7280" fontSize="10">{"גדר ליד קיר — שלוש צלעות"}</text>
    </svg>
  );
}

function MediumSVG() {
  const CX = 140, RECT_TOP = 80, H = 55, R = 45;
  return (
    <svg viewBox="0 0 280 170" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Semicircle */}
      <path d={`M ${CX-R} ${RECT_TOP} A ${R} ${R} 0 0 1 ${CX+R} ${RECT_TOP}`} fill="none" stroke="#f59e0b" strokeWidth="2" />
      {/* Rectangle */}
      <rect x={CX-R} y={RECT_TOP} width={R*2} height={H} fill="none" stroke="#f59e0b" strokeWidth="2" />
      {/* h dimension */}
      <line x1={CX+R+10} y1={RECT_TOP} x2={CX+R+10} y2={RECT_TOP+H} stroke="#EA580C" strokeWidth="1.5" strokeDasharray="4,2" />
      <line x1={CX+R+6} y1={RECT_TOP} x2={CX+R+14} y2={RECT_TOP} stroke="#EA580C" strokeWidth="1.5" />
      <line x1={CX+R+6} y1={RECT_TOP+H} x2={CX+R+14} y2={RECT_TOP+H} stroke="#EA580C" strokeWidth="1.5" />
      <text x={CX+R+22} y={RECT_TOP+H/2+4} fill="#EA580C" fontSize="12" fontWeight="bold">h</text>
      {/* 2r dimension */}
      <line x1={CX-R} y1={RECT_TOP+H+12} x2={CX+R} y2={RECT_TOP+H+12} stroke="#16A34A" strokeWidth="1.5" />
      <line x1={CX-R} y1={RECT_TOP+H+7} x2={CX-R} y2={RECT_TOP+H+17} stroke="#16A34A" strokeWidth="1.5" />
      <line x1={CX+R} y1={RECT_TOP+H+7} x2={CX+R} y2={RECT_TOP+H+17} stroke="#16A34A" strokeWidth="1.5" />
      <text x={CX} y={RECT_TOP+H+26} textAnchor="middle" fill="#16A34A" fontSize="11">2r</text>
      {/* radius line */}
      <line x1={CX} y1={RECT_TOP} x2={CX+R} y2={RECT_TOP} stroke="#a78bfa" strokeWidth="1" strokeDasharray="4,3" />
      <text x={CX+R/2} y={RECT_TOP-6} textAnchor="middle" fill="#a78bfa" fontSize="10">r</text>
      {/* Title */}
      <text x={CX} y={20} textAnchor="middle" fill="#6B7280" fontSize="10">{"חלון נורמן — מלבן + חצי עיגול"}</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 300 150" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Wire */}
      <line x1="30" y1="30" x2="270" y2="30" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      <text x="150" y="18" textAnchor="middle" fill="#6B7280" fontSize="10">{"חוט"}</text>
      {/* Cut mark */}
      <line x1="160" y1="18" x2="160" y2="42" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      {/* x label */}
      <text x="95" y="46" textAnchor="middle" fill="#3b82f6" fontSize="9">x</text>
      {/* L-x label */}
      <text x="215" y="46" textAnchor="middle" fill="#DC2626" fontSize="9">{"שארית"}</text>
      {/* Arrow to square */}
      <line x1="85" y1="48" x2="70" y2="62" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,2" />
      {/* Square outline */}
      <rect x="30" y="65" width="65" height="65" fill="none" stroke="#3b82f6" strokeWidth="2" rx="2" />
      <text x="62" y="102" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="bold">{"ריבוע"}</text>
      {/* Arrow to circle */}
      <line x1="220" y1="48" x2="225" y2="62" stroke="#DC2626" strokeWidth="1" strokeDasharray="4,2" />
      {/* Circle outline */}
      <circle cx="230" cy="100" r="35" fill="none" stroke="#DC2626" strokeWidth="2" />
      <text x="230" y="104" textAnchor="middle" fill="#DC2626" fontSize="11" fontWeight="bold">{"עיגול"}</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(148,163,184,0.25)", color: "#2D3436", fontWeight: 500, cursor: "pointer" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>&#10024;</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>&#9997;&#65039; {"הפרומפט המוכן"}</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
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
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.6)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>&#128274;</span>
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
    </div>
  );

  const scoreBarColor = !result ? "#64748b" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}>
              <span>{"ציון הפרומפט"}</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.05)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; {"בדיקת AI מדומה"}
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
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#15803d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              &#9989; {"פרומפט מצוין!"} {"ציון:"} <strong style={{ color: "#14532d" }}>{result!.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}

        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>{"נסה שוב"}</button>
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
      <span>&#128274;</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
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
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : "rgba(220,38,38,0.35)"}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(220,38,38,0.2)"}` }}>
        {passed
          ? <CheckCircle size={14} color="#34d399" />
          : <span style={{ color: "#DC2626", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.65)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl"
          readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.05)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", fontWeight: 600 }}>
              <span>{"ציון"}</span>
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
            {result.blocked ? "⚠️" : "💡"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#15803d", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>&#9989; {"ניסוח מעולה! הסעיף הבא נפתח."}</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#15803d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}

        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(220,38,38,0.35)", color: "#2D3436", cursor: "pointer", fontWeight: 500 }}>
            &#129302; {"בדיקת AI מדומה"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ladders ─────────────────────────────────────────────────────────────────

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
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.1)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  &#10003; {"סיימתי סעיף זה"}
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>&#9989; {"הושלם"}</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>&#128274;</div>
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
        subjectWords={["קיצון", "שטח", "מינימום", "נגזרת", "ריבוע", "עיגול", "חוט"]}
      />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(148,163,184,0.1)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } — { s.label }</span>
              <span style={{ fontSize: 16 }}>&#128274;</span>
            </div>
          ) : (
            <div>
              <TutorStepAdvanced step={s} onPass={() => setUnlockedCount(v => Math.max(v, i + 2))} />
            </div>
          )}
        </div>
      ))}

      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#127942;</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{"כל הכבוד — השלמת את הרמה המתקדמת!"}</div>
          <div style={{ color: "#166534", fontSize: 13 }}>{"עברת בהצלחה את כל הסעיפים."}</div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "גדר ליד קיר — מקסום שטח",
    problem: "חקלאי מעוניין לגדור חלקה מלבנית הצמודה לקיר אבן, כך שנדרש גידור רק עבור שלוש צלעות. לרשותו L מטרים של גדר.\n\nא. בטא את y בעזרת x ו-L.\nב. כתוב את פונקציית השטח A(x).\nג. מצא את x שממקסם את השטח.\nד. אמת שמדובר במקסימום באמצעות נגזרת שנייה.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שלוש צלעות בלבד", text: "הקיר מחליף את הצלע הרביעית — האילוץ כולל רק 3 צלעות של גדר, לא 4. תלמידים רבים כותבים אילוץ לארבע צלעות במקום לשלוש." },
      { title: "⚠️ לאשר מקסימום", text: "מציאת נקודה קריטית היא חצי מהעבודה. חובה לבדוק עם נגזרת שנייה או טבלת סימנים שזה אכן מקסימום." },
    ],
    goldenPrompt: "אני תלמיד בכיתה יא׳ ורוצה לפתור יחד בעיית קיצון גיאומטרית:\nחקלאי גודר חלקה מלבנית צמודה לקיר אבן עם L מטרים של גדר (3 צלעות). מקסם שטח.\nפעל כמנטור — אל תיתן פתרון מוכן. תנחה אותי שלב אחרי שלב:\n1. שאל אותי איזה משתנה לבחור ולמה.\n2. עזור לי לכתוב את האילוץ ופונקציית המטרה.\n3. תן לי לגזור ולמצוא קיצון לבד — התערב רק אם טעיתי.\nכל שלב: שאל “מוכן להמשיך?” לפני שתתקדם.",
    steps: [
      { phase: "שלב א′", label: "הגדר משתנה ותחום",  coaching: "", prompt: "אני פותר בעיית קיצון: חלקה מלבנית ליד קיר עם L מטרים של גדר (3 צלעות). מהו המשתנה הנכון x, ומהו תחום ההגדרה שלו? שאל אותי ואל תמשיך לפני שאענה.", keywords: [], keywordHint: "", contextWords: ["משתנה", "תחום", "גדר", "קיר", "צלעות", "x"] },
      { phase: "שלב ב′", label: "כתוב אילוץ ובטא y", coaching: "", prompt: "שני צלעות ברוחב x ואחת באורך y, סה״כ L מטרים. תנחה אותי לכתוב את האילוץ ולבודד y. שאל אם אני יודע כמה צלעות יש.", keywords: [], keywordHint: "", contextWords: ["אילוץ", "y", "בודד", "צלעות", "גדר", "L"] },
      { phase: "שלב ג′", label: "פונקציית מטרה",      coaching: "", prompt: "רוחב x, אורך y תלוי ב-L ו-x. הנחה אותי לכתוב A(x) = שטח ולפרוס. אל תיתן את התשובה — שאל אותי.", keywords: [], keywordHint: "", contextWords: ["שטח", "A(x)", "פונקציה", "הצב", "מטרה", "פרוס"] },
      { phase: "שלב ד′", label: "גזור ומצא קיצון",    coaching: "", prompt: "יש לי את A(x) כפולינום מדרגה 2. הסבר לי כיצד לגזור ולמצוא קיצון. תן לי לנסות לבד ותאמת.", keywords: [], keywordHint: "", contextWords: ["גזור", "נגזרת", "קיצון", "מקסימום", "אפס", "A'(x)"] },
    ],
  },
  {
    id: "medium",
    title: "חלון נורמן — מקסום שטח",
    problem: "חלון נורמן מורכב ממלבן שעליו חצי עיגול עם אותו רוחב. היקף הכולל של החלון הוא P מטר. מצא את ממדי המלבן (רוחב 2r וגובה h) כדי למקסם את שטח החלון.\n\nא. בטא את אילוץ ההיקף בעזרת r ו-h.\nב. כתוב את פונקציית השטח A(r) במשתנה אחד.\nג. מצא את r שממקסם את השטח.\nד. חשב את השטח המקסימלי.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ היקף החצי-עיגול", text: "היקף החצי-עיגול הוא πr (לא 2πr). אל תכפיל ב-2 — זה חצי עיגול, לא עיגול שלם." },
      { title: "⚠️ השטח הכולל", text: "השטח הכולל של החלון כולל גם מלבן וגם חצי-עיגול. תלמידים רבים שוכחים את חצי העיגול." },
    ],
    goldenPrompt: "אני תלמיד בכיתה יא′ ורוצה לפתור בעיית קיצון על חלון נורמן:\nמלבן + חצי-עיגול, היקף כולל = P מטר. מקסם שטח.\nנחה אותי:\n1. כיצד לכתוב את אילוץ ההיקף (זהה לי את חצי ההיקף של העיגול).\n2. כיצד לכתוב את השטח הכולל.\n3. כיצד להצביע על r המקסימלי.\nשאל “מוכן?” אחרי כל שלב.",
    steps: [
      { phase: "שלב א′", label: "משתנה ואילוץ היקף", coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["היקף", "r", "h", "חצי-עיגול", "אילוץ", "בודד", "π"] },
      { phase: "שלב ב′", label: "פונקציית שטח",       coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["שטח", "r", "h", "הצב", "פשט", "פונקציה", "מלבן"] },
      { phase: "שלב ג′", label: "גזור ומצא קיצון",    coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["גזור", "נגזרת", "קיצון", "מקסימום", "r", "אפס"] },
      { phase: "שלב ד′", label: "ממדי החלון",          coaching: "", prompt: "", keywords: [], keywordHint: "", contextWords: ["חשב", "h", "r", "שטח", "מקסימלי", "הצב"] },
    ],
  },
  {
    id: "advanced",
    title: "מינימום שטח כולל — חוט לריבוע ועיגול",
    problem: "חוט באורך L נחתך לשני חלקים. מהחלק הראשון כופלים ריבוע ומהשני עיגול. כיצד לחתוך את החוט כדי שהשטח הכולל (ריבוע + עיגול) יהיה מינימלי?\n\nא. בטא את צלע a ורדיוס r בעזרת x ו-L.\nב. כתוב את פונקציית השטח הכולל.\nג. מצא את x שממזער את השטח הכולל.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ היקף ריבוע ≠ צלע", text: "היקף ריבוע = 4a, לכן צלע a = חלק החוט לריבוע חלקי 4. אל תבלבל היקף עם צלע." },
      { title: "⚠️ בדקו גם קצוות התחום", text: "המינימום יכול להיות בקצוות התחום (x=0 או x=L). בדקו את הערך בנקודות הקצה והשווו לנקודה הקריטית!" },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שלם שמסביר ל-AI איך לנהל בעיית קיצון על חוט לריבוע ועיגול. כלול: הגדרת תפקיד, איסור פתרון, בקשת הנחיה, הנושא המתמטי, ודרישת המתנה בין סעיפים.",
    steps: [
      { phase: "שלב א′", label: "הגדר משתנים",             coaching: "", prompt: "חוט באורך L נחתך לשני חלקים. חלק אחד לריבוע, השני לעיגול. תנחה אותי להגדיר את צלע הריבוע ורדיוס העיגול בעזרת x. אל תיתן תשובות.", keywords: [], keywordHint: "", contextWords: ["x", "צלע", "רדיוס", "ריבוע", "עיגול", "היקף"] },
      { phase: "שלב ב′", label: "פונקציית שטח כולל",        coaching: "", prompt: "שטח ריבוע + שטח עיגול. תנחה אותי לכתוב את פונקציית השטח הכולל כפונקציה של x. אל תפתור עבורי.", keywords: [], keywordHint: "", contextWords: ["שטח", "x", "ריבוע", "עיגול", "פונקציה", "כתוב"] },
      { phase: "שלב ג′", label: "גזור ומצא מינימום",          coaching: "", prompt: "יש לי את A(x). הנחה אותי לגזור ולמצוא את נקודת המינימום. בדוק גם קצוות התחום. אל תגלה תשובות.", keywords: [], keywordHint: "", contextWords: ["גזור", "נגזרת", "קיצון", "מינימום", "x", "קצוות"] },
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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.15)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>&#128221; {"השאלה"}</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.15)" : "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{"⚠️"} {"שגיאות נפוצות"}</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.7)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#2D3436", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>&#129504; {"מדריך הפרומפטים"}</div>
        {ex.id === "basic"    && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── Formula Bar ─────────────────────────────────────────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"cond" | "second" | "constraint" | null>(null);

  const tabs = [
    { id: "cond" as const,       label: "תנאי קיצון",    tex: "f'(x)=0",            color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "second" as const,     label: "נגזרת שנייה",  tex: "f''(x) \\gtrless 0",  color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "constraint" as const, label: "אילוץ והצבה",  tex: "g(x,y)=c",            color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{"נוסחאות"}</div>

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
                background: isActive ? `${t.color}15` : "rgba(255,255,255,0.02)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
            </button>
          );
        })}
      </div>

      {/* Expanded: Extremum condition */}
      {activeTab === "cond" && (
        <motion.div key="cond" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"f'(x_0) = 0 \\;\\Rightarrow\\; \\text{candidate for extremum}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>{"הסבר:"}</strong> {"נקודת קיצון מתקבלת כאשר הנגזרת מתאפסת."}
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>{"פתרו "}<InlineMath>{"f'(x)=0"}</InlineMath>.</li>
                  <li>{"אמתו עם נגזרת שנייה או טבלת סימנים."}</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#16a34a", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; {"דוגמה: "}<InlineMath>{"A(x) = 60x - 2x^2"}</InlineMath> {"→ "}<InlineMath>{"A'(x)=60-4x=0"}</InlineMath> {"→ "}<InlineMath>{"x=15"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Second derivative */}
      {activeTab === "second" && (
        <motion.div key="second" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"f''(x_0)>0 \\Rightarrow \\min, \\quad f''(x_0)<0 \\Rightarrow \\max"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>{"הסבר:"}</strong> {"הנגזרת השנייה קובעת את סוג הקיצון:"}
                <ul dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li><InlineMath>{"f''(x_0) > 0"}</InlineMath> {"→ מינימום (הפונקציה קמורה למעלה)"}</li>
                  <li><InlineMath>{"f''(x_0) < 0"}</InlineMath> {"→ מקסימום (הפונקציה קמורה למטה)"}</li>
                </ul>
              </div>
              <div style={{ marginTop: 10, color: "#EA580C", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; {"אם "}<InlineMath>{"f''(x_0)=0"}</InlineMath> {"— השתמשו בטבלת סימנים."}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Constraint + substitution */}
      {activeTab === "constraint" && (
        <motion.div key="constraint" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"g(x,y) = c \\;\\Rightarrow\\; y = h(x) \\;\\Rightarrow\\; \\text{substitute into } f"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>{"הסבר:"}</strong> {"בבעיות קיצון יש שני שלבים:"}
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>{"בטאו משתנה אחד מהאילוץ (למשל: "}<InlineMath>{"y = L - 2x"}</InlineMath>{")."}</li>
                  <li>{"הציבו לתוך פונקציית המטרה — וקיבלתם פונקציה במשתנה אחד."}</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; {"דוגמה: "}<InlineMath>{"2x+y=L"}</InlineMath> {"→ "}<InlineMath>{"A = x \\cdot (L-2x)"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── FenceLab (basic) ─────────────────────────────────────────────────────────

function FenceLab() {
  const [w, setW] = useState(10);
  const L = 60;
  const y = L - 2 * w;
  const A = w * y;
  const atMax = w === 15;

  const SW = 260, SH = 180, pad = 30;
  const maxW = 25, maxY = 50;
  const avW = SW - pad * 2, avH = SH - pad * 2;
  const rW = (w / maxW) * avW, rH = (y / maxY) * avH;
  const rX = pad + (avW - rW) / 2, rY = pad + (avH - rH) / 2;

  const CP = 28, maxA = 450;
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const wi = 5 + (i / 80) * 20;
    const ai = wi * (L - 2 * wi);
    pts.push(`${CP + ((wi - 5) / 20) * (SW - CP * 2)},${SH - CP - (ai / maxA) * (SH - CP * 2)}`);
  }
  const dotX = CP + ((w - 5) / 20) * (SW - CP * 2);
  const dotY = SH - CP - (A / maxA) * (SH - CP * 2);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; {"מעבדת גדר ליד קיר"}</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        {"שטח כפונקציה של x"}
      </p>

      <div className="flex gap-3 justify-center flex-wrap">
        {/* Shape SVG */}
        <div style={{ borderRadius: 12, background: "#ffffff", border: "1px solid rgba(60,54,42,0.15)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>{"חלקה מלבנית"}</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <line x1={rX} y1={rY} x2={rX + rW} y2={rY} stroke="#94a3b8" strokeWidth={4} strokeLinecap="round" />
            <text x={rX + rW / 2} y={rY - 5} fill="#6B7280" fontSize={9} textAnchor="middle">{"קיר"}</text>
            <motion.rect animate={{ x: rX, y: rY, width: rW, height: rH }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#10b98120" : "#22c55e10"} stroke={atMax ? "#10b981" : "#22c55e"} strokeWidth={atMax ? 2.5 : 1.5} rx={2} />
            <motion.text animate={{ x: rX + rW / 2, y: rY + rH + 14 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill="#22c55e" fontSize={10} textAnchor="middle">x={w}</motion.text>
            <motion.text animate={{ x: rX + rW + 14, y: rY + rH / 2 + 4 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill="#f97316" fontSize={10} textAnchor="middle">y={y}</motion.text>
          </svg>
        </div>
        {/* Graph SVG */}
        <div style={{ borderRadius: 12, background: "#ffffff", border: "1px solid rgba(60,54,42,0.15)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>{"שטח כפונקציה של x"}</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <polyline points={pts.join(" ")} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.8} />
            <line x1={CP} y1={SH - CP} x2={SW - CP / 2} y2={SH - CP} stroke="#94a3b8" strokeWidth={1} />
            <line x1={CP} y1={CP / 2} x2={CP} y2={SH - CP} stroke="#94a3b8" strokeWidth={1} />
            {/* Max dot */}
            {(() => { const mx = CP + (10/20)*(SW-CP*2), my = SH - CP - (450/maxA)*(SH-CP*2); return <><circle cx={mx} cy={my} r={9} fill="#10b98130" /><circle cx={mx} cy={my} r={5} fill="#10b981" /><text x={mx+8} y={my-6} fill="#10b981" fontSize={9}>max</text></>; })()}
            <motion.line animate={{ x1: dotX, x2: dotX }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH - CP} y2={CP / 2} stroke="#f97316" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotX, cy: dotY }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMax ? 7 : 5} fill={atMax ? "#10b981" : "#f97316"} stroke="#ffffff" strokeWidth={2} />
            <motion.text animate={{ x: dotX + 8, y: Math.max(dotY - 4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#10b981" : "#f97316"} fontSize={10}>A={A}</motion.text>
            <text x={CP + 2} y={SH - CP + 12} fill="#6B7280" fontSize={8}>x=5</text>
            <text x={SW - CP - 12} y={SH - CP + 12} fill="#6B7280" fontSize={8}>x=25</text>
          </svg>
        </div>
      </div>

      {/* Slider */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#6B7280" }}>{"רוחב "}<span style={{ fontFamily: "monospace", color: "#2D3436" }}>x</span></span>
          <span style={{ fontFamily: "monospace", color: atMax ? "#16a34a" : "#2D3436", fontWeight: 700 }}>{w} {"מ′"}</span>
        </div>
        <input type="range" min={5} max={25} step={1} value={w}
          onChange={e => setW(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center" }}>{"גרור את הסליידר כדי למצוא את המקסימום"}</p>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#6B7280", marginBottom: 4 }}>{"רוחב x"}</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{w} {"מ′"}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#6B7280", marginBottom: 4 }}>{"אורך y"}</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{y} {"מ′"}</p>
        </div>
        <div style={{ background: atMax ? "rgba(220,252,231,0.7)" : "rgba(255,255,255,0.75)", border: atMax ? "1px solid #86efac" : "1px solid rgba(60,54,42,0.15)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMax ? "#16a34a" : "#6B7280", marginBottom: 4 }}>{"שטח A"}</p>
          <p style={{ fontFamily: "monospace", color: atMax ? "#15803d" : "#1A1A1A", fontWeight: 700 }}>{A} {"מ′²"}</p>
        </div>
      </div>
      {atMax && <p style={{ color: "#16a34a", fontSize: 13, fontWeight: 700, textAlign: "center", marginTop: "0.75rem" }}>{"שטח מקסימלי!"}</p>}
    </section>
  );
}

// ─── NormanLab (medium) ───────────────────────────────────────────────────────

function NormanLab() {
  const [r, setR] = useState(1.4);
  const PI = Math.PI;
  const P = 12;
  const h = Math.max(0, (P - r * (2 + PI)) / 2);
  const A = 2 * r * h + 0.5 * PI * r * r;
  const rOpt = P / (4 + PI);
  const atMax = Math.abs(r - rOpt) < 0.06;

  const SW = 260, SH = 180, scale = 50;
  const rPx = Math.min(r * scale, 80), hPx = Math.min(h * scale, 100);
  const cx = SW / 2, rectTop = SH - 20 - hPx, rectBot = SH - 20;

  const COEFF = 2 + PI / 2;
  const CP = 28, maxAGraph = 12;
  const normanPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const ri = 0.3 + (i / 80) * 2.1;
    const ai = Math.max(0, P * ri - COEFF * ri * ri);
    normanPts.push(`${CP + (i / 80) * (SW - CP * 2)},${SH - CP - (ai / maxAGraph) * (SH - CP * 2)}`);
  }
  const dotXg = CP + ((r - 0.3) / 2.1) * (SW - CP * 2);
  const dotYg = SH - CP - (Math.max(0, A) / maxAGraph) * (SH - CP * 2);
  const maxDotXg = CP + ((rOpt - 0.3) / 2.1) * (SW - CP * 2);
  const maxAVal = P * rOpt - COEFF * rOpt * rOpt;
  const maxDotYg = SH - CP - (maxAVal / maxAGraph) * (SH - CP * 2);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; {"מעבדת חלון נורמן"}</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        {"שטח כפונקציה של r"}
      </p>

      <div className="flex gap-3 justify-center flex-wrap">
        <div style={{ borderRadius: 12, background: "#ffffff", border: "1px solid rgba(60,54,42,0.15)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>{"צורת החלון"}</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <motion.rect animate={{ x: cx - rPx, y: rectTop, width: rPx * 2, height: hPx }}
              transition={{ type: "spring", stiffness: 250, damping: 28 }}
              fill={atMax ? "#10b98115" : "#f59e0b10"} stroke={atMax ? "#10b981" : "#f59e0b"} strokeWidth={atMax ? 2.5 : 1.5} />
            <motion.path animate={{ d: `M ${cx - rPx} ${rectTop} A ${rPx} ${rPx} 0 0 1 ${cx + rPx} ${rectTop}` }}
              transition={{ type: "spring", stiffness: 250, damping: 28 }}
              fill={atMax ? "#10b98115" : "#f59e0b10"} stroke={atMax ? "#10b981" : "#f59e0b"} strokeWidth={atMax ? 2.5 : 1.5} />
            <motion.text animate={{ x: cx, y: rectBot + 14 }} transition={{ type: "spring", stiffness: 250, damping: 28 }}
              textAnchor="middle" fill="#16a34a" fontSize={9}>2r={(2 * r).toFixed(2)}</motion.text>
            <motion.text animate={{ x: cx + rPx + 18, y: rectTop + hPx / 2 }} transition={{ type: "spring", stiffness: 250, damping: 28 }}
              textAnchor="middle" fill="#ea580c" fontSize={9}>h={h.toFixed(2)}</motion.text>
          </svg>
        </div>
        <div style={{ borderRadius: 12, background: "#ffffff", border: "1px solid rgba(60,54,42,0.15)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>{"שטח כפונקציה של r"}</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <polyline points={normanPts.join(" ")} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.8} />
            <line x1={CP} y1={SH - CP} x2={SW - CP / 2} y2={SH - CP} stroke="#94a3b8" strokeWidth={1} />
            <line x1={CP} y1={CP / 2} x2={CP} y2={SH - CP} stroke="#94a3b8" strokeWidth={1} />
            <circle cx={maxDotXg} cy={maxDotYg} r={9} fill="#f59e0b30" />
            <circle cx={maxDotXg} cy={maxDotYg} r={5} fill="#f59e0b" />
            <text x={maxDotXg + 8} y={maxDotYg - 6} fill="#f59e0b" fontSize={9}>max</text>
            <motion.line animate={{ x1: dotXg, x2: dotXg }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH - CP} y2={CP / 2} stroke="#a78bfa" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotXg, cy: dotYg }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMax ? 7 : 5} fill={atMax ? "#f59e0b" : "#a78bfa"} stroke="#ffffff" strokeWidth={2} />
            <motion.text animate={{ x: dotXg + 8, y: Math.max(dotYg - 4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#f59e0b" : "#7c3aed"} fontSize={10}>A={A.toFixed(2)}</motion.text>
            <text x={CP + 2} y={SH - CP + 12} fill="#6B7280" fontSize={8}>r=0.3</text>
            <text x={SW - CP - 14} y={SH - CP + 12} fill="#6B7280" fontSize={8}>r=2.4</text>
          </svg>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#6B7280" }}>{"רדיוס "}<span style={{ fontFamily: "monospace", color: "#2D3436" }}>r</span></span>
          <span style={{ fontFamily: "monospace", color: atMax ? "#ea580c" : "#2D3436", fontWeight: 700 }}>{r.toFixed(2)} {"מ′"}</span>
        </div>
        <input type="range" min={0.3} max={2.4} step={0.05} value={r}
          onChange={e => setR(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#ea580c" }} />
        <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center" }}>{"גרור את הסליידר כדי למצוא את המקסימום"}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#6B7280", marginBottom: 4 }}>{"רדיוס r"}</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{r.toFixed(2)} {"מ′"}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#6B7280", marginBottom: 4 }}>{"גובה h"}</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{h.toFixed(2)} {"מ′"}</p>
        </div>
        <div style={{ background: atMax ? "rgba(255,237,213,0.7)" : "rgba(255,255,255,0.75)", border: atMax ? "1px solid #fdba74" : "1px solid rgba(60,54,42,0.15)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMax ? "#ea580c" : "#6B7280", marginBottom: 4 }}>{"שטח A"}</p>
          <p style={{ fontFamily: "monospace", color: atMax ? "#c2410c" : "#1A1A1A", fontWeight: 700 }}>{A.toFixed(3)}</p>
        </div>
      </div>
      {atMax && <p style={{ color: "#ea580c", fontSize: 13, fontWeight: 700, textAlign: "center", marginTop: "0.75rem" }}>{"שטח מקסימלי!"}</p>}
    </section>
  );
}

// ─── WireLab (advanced) ──────────────────────────────────────────────────────

function WireLab() {
  const [x, setX] = useState(50);
  const PI = Math.PI;
  const Ltot = 100;
  const side = x / 4, radius = (Ltot - x) / (2 * PI);
  const Asq = side * side, Aci = PI * radius * radius, Atotal = Asq + Aci;
  const xMin = 400 / (4 + PI);
  const atMin = Math.abs(x - xMin) < 1.5;

  const SW = 260, SH = 160;
  const sqPx = Math.min((x / 4) * (55 / 25), 65);
  const rPx = Math.min(radius * (42 / (Ltot / (2 * PI))), 48);
  const sqCX = 70, cirCX = 190, midY = SH / 2 + 10;

  const SW2 = 260, SH2 = 180, CP2 = 28, maxAGraph = 800;
  const wirePts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const xi = 5 + (i / 80) * 90;
    const ai = xi * xi / 16 + (Ltot - xi) * (Ltot - xi) / (4 * PI);
    wirePts.push(`${CP2 + (i / 80) * (SW2 - CP2 * 2)},${SH2 - CP2 - (ai / maxAGraph) * (SH2 - CP2 * 2)}`);
  }
  const dotXw = CP2 + ((x - 5) / 90) * (SW2 - CP2 * 2);
  const dotYw = SH2 - CP2 - (Atotal / maxAGraph) * (SH2 - CP2 * 2);
  const minDotXw = CP2 + ((xMin - 5) / 90) * (SW2 - CP2 * 2);
  const minAw = xMin * xMin / 16 + (Ltot - xMin) * (Ltot - xMin) / (4 * PI);
  const minDotYw = SH2 - CP2 - (minAw / maxAGraph) * (SH2 - CP2 * 2);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>&#128300; {"מעבדת חוט לריבוע ועיגול"}</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        {"שטח כולל כפונקציה של x"}
      </p>

      <div className="flex gap-3 justify-center flex-wrap">
        <div style={{ borderRadius: 12, background: "#ffffff", border: "1px solid rgba(60,54,42,0.15)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>{"ריבוע ועיגול"}</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <text x={sqCX} y={14} textAnchor="middle" fill="#3b82f6" fontSize={9} fontWeight="bold">{"ריבוע"}</text>
            <text x={cirCX} y={14} textAnchor="middle" fill="#DC2626" fontSize={9} fontWeight="bold">{"עיגול"}</text>
            <motion.rect animate={{ x: sqCX - sqPx / 2, y: midY - sqPx / 2, width: sqPx, height: sqPx }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              fill="#3b82f633" stroke="#3b82f6" strokeWidth={2} />
            <motion.text animate={{ x: sqCX, y: midY + sqPx / 2 + 12 }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              textAnchor="middle" fill="#3b82f6" fontSize={9}>{"צלע"}={side.toFixed(1)}</motion.text>
            <motion.circle animate={{ cx: cirCX, cy: midY, r: rPx }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              fill="#DC262633" stroke="#DC2626" strokeWidth={2} />
            <motion.text animate={{ x: cirCX, y: midY + rPx + 14 }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              textAnchor="middle" fill="#DC2626" fontSize={9}>r={radius.toFixed(1)}</motion.text>
          </svg>
        </div>
        <div style={{ borderRadius: 12, background: "#ffffff", border: "1px solid rgba(60,54,42,0.15)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>{"שטח כולל כפונקציה של x"}</p>
          <svg width={SW2} height={SH2} viewBox={`0 0 ${SW2} ${SH2}`}>
            <polyline points={wirePts.join(" ")} fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.8} />
            <line x1={CP2} y1={SH2 - CP2} x2={SW2 - CP2 / 2} y2={SH2 - CP2} stroke="#94a3b8" strokeWidth={1} />
            <line x1={CP2} y1={CP2 / 2} x2={CP2} y2={SH2 - CP2} stroke="#94a3b8" strokeWidth={1} />
            <circle cx={minDotXw} cy={minDotYw} r={9} fill="#10b98130" />
            <circle cx={minDotXw} cy={minDotYw} r={5} fill="#10b981" />
            <text x={minDotXw + 8} y={minDotYw - 6} fill="#10b981" fontSize={9}>min</text>
            <motion.line animate={{ x1: dotXw, x2: dotXw }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH2 - CP2} y2={CP2 / 2} stroke="#f97316" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotXw, cy: dotYw }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMin ? 7 : 5} fill={atMin ? "#10b981" : "#f97316"} stroke="#ffffff" strokeWidth={2} />
            <motion.text animate={{ x: dotXw + 8, y: Math.max(dotYw - 4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMin ? "#10b981" : "#f97316"} fontSize={10}>A={Atotal.toFixed(0)}</motion.text>
            <text x={CP2 + 2} y={SH2 - CP2 + 12} fill="#6B7280" fontSize={8}>x=5</text>
            <text x={SW2 - CP2 - 14} y={SH2 - CP2 + 12} fill="#6B7280" fontSize={8}>x=95</text>
          </svg>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#6B7280" }}>{"חלק לריבוע "}<span style={{ fontFamily: "monospace", color: "#2D3436" }}>x</span></span>
          <span style={{ fontFamily: "monospace", color: atMin ? "#dc2626" : "#2D3436", fontWeight: 700 }}>{x} {"ס״מ"}</span>
        </div>
        <input type="range" min={5} max={95} step={1} value={x}
          onChange={e => setX(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center" }}>{"גרור את הסליידר כדי למצוא את המינימום"}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(219,234,254,0.5)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#3b82f6", marginBottom: 4 }}>{"שטח ריבוע"}</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{Asq.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(254,226,226,0.5)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#DC2626", marginBottom: 4 }}>{"שטח עיגול"}</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{Aci.toFixed(1)}</p>
        </div>
        <div style={{ background: atMin ? "rgba(220,252,231,0.7)" : "rgba(255,255,255,0.75)", border: atMin ? "1px solid #86efac" : "1px solid rgba(60,54,42,0.15)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMin ? "#16a34a" : "#6B7280", marginBottom: 4 }}>{"סה״כ"}</p>
          <p style={{ fontFamily: "monospace", color: atMin ? "#15803d" : "#1A1A1A", fontWeight: 700 }}>{Atotal.toFixed(1)}</p>
        </div>
      </div>
      {atMin && <p style={{ color: "#16a34a", fontSize: 13, fontWeight: 700, textAlign: "center", marginTop: "0.75rem" }}>{"שטח מינימלי!"}</p>}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KitzunGeometryPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>{"בעיות קיצון — גיאומטריה מישורית עם AI"}</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>{"אילוצי היקף ושטח — תרגם ציור לפונקציה"}</p>
          </div>
          <Link
            href="/topic/kitzun"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}
          >
            <span style={{ fontSize: 16 }}>{"←"}</span>
            {"חזרה"}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        <SubtopicProgress subtopicId="kitzun/geometry" />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
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

        <FormulaBar />

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab per level */}
        {selectedLevel === "basic" && <FenceLab />}
        {selectedLevel === "medium" && <NormanLab />}
        {selectedLevel === "advanced" && <WireLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="kitzun/geometry" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
