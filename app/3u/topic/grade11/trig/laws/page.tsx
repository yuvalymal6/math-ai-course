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

function BasicASADiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>
        משולש ABC -- שתי זוויות וצלע (ASA)
      </p>
      <svg width="100%" viewBox="0 0 280 200" style={{ maxWidth: "100%" }}>
        {/* Triangle */}
        <polygon points="40,170 240,170 160,40" fill="none" stroke="#16a34a" strokeWidth={2} />
        {/* Vertex labels */}
        <text x={28} y={178} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>B</text>
        <text x={252} y={178} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>C</text>
        <text x={160} y={30} textAnchor="middle" fill="#16a34a" fontSize={14} fontWeight={700}>A</text>
        {/* Known side BC -- amber highlight */}
        <line x1={40} y1={170} x2={240} y2={170} stroke="#f59e0b" strokeWidth={3.5} opacity={0.6} />
        <text x={140} y={188} textAnchor="middle" fill="#f59e0b" fontSize={11} fontWeight={700}>BC</text>
        {/* Angle arc at B */}
        <path d="M 58,170 A 18,18 0 0,0 52,155" fill="none" stroke="#16a34a" strokeWidth={2} />
        <text x={66} y={158} textAnchor="middle" fill="#16a34a" fontSize={9} fontWeight={600}>B</text>
        {/* Angle arc at C */}
        <path d="M 222,170 A 18,18 0 0,1 228,155" fill="none" stroke="#16a34a" strokeWidth={2} />
        <text x={216} y={158} textAnchor="middle" fill="#16a34a" fontSize={9} fontWeight={600}>C</text>
        {/* Side labels */}
        <text x={92} y={100} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>AB</text>
        <text x={210} y={100} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>AC</text>
      </svg>
    </div>
  );
}

function MediumSASDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>
        משולש PQR -- שתי צלעות וזווית ביניהן (SAS)
      </p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        {/* Triangle */}
        <polygon points="50,190 250,190 190,40" fill="none" stroke="#ea580c" strokeWidth={2} />
        {/* Vertex labels */}
        <text x={38} y={198} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>P</text>
        <text x={262} y={198} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>R</text>
        <text x={196} y={30} textAnchor="middle" fill="#ea580c" fontSize={14} fontWeight={700}>Q</text>
        {/* Known side PQ -- amber highlight */}
        <line x1={50} y1={190} x2={190} y2={40} stroke="#f59e0b" strokeWidth={3} opacity={0.6} />
        <text x={110} y={108} textAnchor="middle" fill="#f59e0b" fontSize={11} fontWeight={700}>PQ</text>
        {/* Known side QR -- amber highlight */}
        <line x1={190} y1={40} x2={250} y2={190} stroke="#f59e0b" strokeWidth={3} opacity={0.6} />
        <text x={228} y={108} textAnchor="middle" fill="#f59e0b" fontSize={11} fontWeight={700}>QR</text>
        {/* Angle arc at Q */}
        <path d="M 175,60 A 22,22 0 0,1 205,60" fill="none" stroke="#ea580c" strokeWidth={2.5} />
        <text x={190} y={72} textAnchor="middle" fill="#ea580c" fontSize={9} fontWeight={700}>Q</text>
        {/* Unknown side PR */}
        <text x={150} y={206} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>PR = ?</text>
      </svg>
    </div>
  );
}

function AdvancedSurveyDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>
        שני צופים ומגדל -- בעיית מדידה
      </p>
      <svg width="100%" viewBox="0 0 320 240" style={{ maxWidth: "100%" }}>
        {/* Ground line */}
        <line x1={30} y1={200} x2={290} y2={200} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,3" />
        {/* Triangle A-B-C */}
        <polygon points="60,200 260,200 180,50" fill="none" stroke="#dc2626" strokeWidth={2} />
        {/* Vertex labels */}
        <text x={48} y={212} textAnchor="middle" fill="#dc2626" fontSize={14} fontWeight={700}>A</text>
        <text x={272} y={212} textAnchor="middle" fill="#dc2626" fontSize={14} fontWeight={700}>B</text>
        <text x={180} y={40} textAnchor="middle" fill="#dc2626" fontSize={14} fontWeight={700}>C</text>
        {/* Tower at C -- vertical line */}
        <line x1={180} y1={50} x2={180} y2={20} stroke="#dc2626" strokeWidth={2.5} />
        <line x1={175} y1={20} x2={185} y2={20} stroke="#dc2626" strokeWidth={2} />
        {/* Known baseline AB -- amber */}
        <line x1={60} y1={200} x2={260} y2={200} stroke="#f59e0b" strokeWidth={3.5} opacity={0.6} />
        <text x={160} y={218} textAnchor="middle" fill="#f59e0b" fontSize={11} fontWeight={700}>AB</text>
        {/* Angle arcs */}
        <path d="M 80,200 A 20,20 0 0,0 72,184" fill="none" stroke="#dc2626" strokeWidth={2} />
        <text x={88} y={186} textAnchor="middle" fill="#dc2626" fontSize={9} fontWeight={600}>A</text>
        <path d="M 240,200 A 20,20 0 0,1 248,184" fill="none" stroke="#dc2626" strokeWidth={2} />
        <text x={234} y={186} textAnchor="middle" fill="#dc2626" fontSize={9} fontWeight={600}>B</text>
        {/* Lines of sight -- dashed */}
        <line x1={60} y1={200} x2={180} y2={50} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="6,3" opacity={0.5} />
        <line x1={260} y1={200} x2={180} y2={50} stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="6,3" opacity={0.5} />
        {/* Observer icons */}
        <circle cx={60} cy={196} r={3} fill="#dc2626" />
        <circle cx={260} cy={196} r={3} fill="#dc2626" />
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
        subjectWords={["סינוסים", "קוסינוסים", "זווית", "מרחק", "משולש", "גובה"]}
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
  const [activeTab, setActiveTab] = useState<"sine" | "cosine" | "area" | "angle" | null>(null);

  const tabs = [
    { id: "sine" as const,   label: "סינוסים",      tex: "\\frac{a}{\\sin A} = 2R",                 color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "cosine" as const, label: "קוסינוסים",    tex: "c^2 = a^2+b^2-2ab\\cos C",               color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "area" as const,   label: "שטח",           tex: "S=\\tfrac{1}{2}ab\\sin C",                color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "angle" as const,  label: "מציאת זווית",   tex: "\\cos C=\\tfrac{a^2+b^2-c^2}{2ab}",      color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Sine Rule */}
      {activeTab === "sine" && (
        <motion.div key="sine" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> היחס בין כל צלע לסינוס הזווית שמולה קבוע ושווה לקוטר המעגל החוסם.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>כל צלע חלקי סינוס הזווית שמולה -- a/sin(A) = b/sin(B) = c/sin(C).</li>
                  <li>משמש כשידועות שתי זוויות וצלע, או שתי צלעות וזווית שמול אחת מהן.</li>
                  <li>R הוא רדיוס המעגל החוסם את המשולש.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: אם ידועות &#8736;B, &#8736;C והצלע BC -- מצאו &#8736;A ואז השתמשו בסינוסים למציאת שאר הצלעות.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Cosine Rule */}
      {activeTab === "cosine" && (
        <motion.div key="cosine" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"c^2 = a^2 + b^2 - 2ab\\cos C"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הרחבה של משפט פיתגורס למשולש כללי.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הצלע c מול הזווית C. a ו-b הן שתי הצלעות שכולאות את C.</li>
                  <li>משמש כשידועות שתי צלעות והזווית שביניהן (SAS).</li>
                  <li>משמש גם כשידועות שלוש צלעות ורוצים למצוא זווית (SSS).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימו לב: כשהזווית C חדה, <InlineMath>{"\\cos C > 0"}</InlineMath> ומפחיתים. כשהיא קהה, <InlineMath>{"\\cos C < 0"}</InlineMath> ומוסיפים.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Area */}
      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = \\frac{1}{2}ab\\sin C"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> שטח משולש לפי שתי צלעות והזווית הכלואה ביניהן.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>C חייבת להיות הזווית שבין הצלעות a ו-b.</li>
                  <li>אפשר להשתמש בכל זוג צלעות והזווית שביניהן: <InlineMath>{"\\frac{1}{2}bc\\sin A"}</InlineMath> או <InlineMath>{"\\frac{1}{2}ac\\sin B"}</InlineMath>.</li>
                  <li>שימושי במיוחד בשילוב עם נוסחת הגובה: <InlineMath>{"S = \\frac{1}{2} \\cdot base \\cdot h"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; למציאת גובה: <InlineMath>{"h = \\frac{2S}{base}"}</InlineMath> -- חשבו שטח ואז חלצו גובה.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Angle from sides */}
      {activeTab === "angle" && (
        <motion.div key="angle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\cos C = \\frac{a^2 + b^2 - c^2}{2ab}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> בידוד cos C ממשפט הקוסינוסים -- מאפשר למצוא זווית מ-3 צלעות.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>c היא הצלע שמול הזווית C שרוצים למצוא.</li>
                  <li>אם התוצאה חיובית -- הזווית חדה. אם שלילית -- הזווית קהה.</li>
                  <li>יתרון על סינוסים: נותן תשובה חד-ערכית (אין עמימות חד/קהה).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; כלל אצבע: הזווית הגדולה ביותר מול הצלע הארוכה ביותר.
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
    title: "ASA -- שתי זוויות וצלע",
    problem: "במשולש ABC ידוע: \u2220B = 55\u00B0, \u2220C = 70\u00B0, BC = 12 ס\"מ.\n\nא. מצאו את הזווית A.\nב. חשבו את אורך הצלע AB באמצעות משפט הסינוסים.\nג. חשבו את אורך הצלע AC.",
    diagram: <BasicASADiagram />,
    pitfalls: [
      { title: "\u2220A = 180\u00B0 \u2212 55\u00B0 \u2212 70\u00B0 -- חשבו את הזווית השלישית לפני הכל", text: "בלי לחשב את \u2220A קודם, אי אפשר להשתמש במשפט הסינוסים כי צריך את הזווית שמול הצלע הידועה." },
      { title: "BC מול \u2220A, AB מול \u2220C, AC מול \u2220B -- כל צלע מול הזווית שמולה", text: "ודאו שאתם מציבים נכון: a/sinA = b/sinB. אם תחליפו -- התשובה תהיה שגויה." },
      { title: "a/sinA = b/sinB -- ודאו שהצבתם צלע מול הזווית הנכונה", text: "BC = a והיא מול \u2220A. AB = c והיא מול \u2220C. סמנו בבירור לפני ההצבה." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש ABC ידוע: \u2220B = 55\u00B0, \u2220C = 70\u00B0, BC = 12 ס\"מ.\nאני צריך:\n1. למצוא את הזווית A\n2. לחשב את AB באמצעות משפט הסינוסים\n3. לחשב את AC\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- מציאת הזווית A",
        coaching: "סכום זוויות במשולש = 180\u00B0",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש ABC ידוע: \u2220B = 55\u00B0, \u2220C = 70\u00B0. תנחה אותי למצוא את הזווית A. שאל אותי: מה סכום הזוויות במשולש? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סכום", "זוויות", "משולש"],
        keywordHint: "ציין שמדובר בסכום זוויות במשולש",
        contextWords: ["סינוסים", "זווית", "צלע", "סכום", "משולש", "מול"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- מציאת AB באמצעות משפט הסינוסים",
        coaching: "הציבו בנוסחה a/sinA = c/sinC ובודדו c",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nמצאתי ש-\u2220A = 55\u00B0. עכשיו אני צריך למצוא את AB כש-BC = 12 ו-\u2220C = 70\u00B0. תנחה אותי: איזו צלע מול איזו זווית? איך להציב במשפט הסינוסים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סינוסים", "צלע", "הצבה"],
        keywordHint: "ציין שמשתמשים במשפט הסינוסים",
        contextWords: ["סינוסים", "זווית", "צלע", "סכום", "משולש", "מול"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- מציאת AC",
        coaching: "השתמשו שוב בסינוסים עם הזווית B",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nמצאתי את AB. עכשיו אני צריך למצוא את AC כש-BC = 12, \u2220A = 55\u00B0, \u2220B = 55\u00B0. AC מול \u2220B. תנחה אותי להציב שוב בנוסחת הסינוסים. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סינוסים", "מול", "זווית"],
        keywordHint: "ציין שהצלע מול הזווית",
        contextWords: ["סינוסים", "זווית", "צלע", "סכום", "משולש", "מול"],
      },
    ],
  },
  {
    id: "medium",
    title: "SAS -- שתי צלעות וזווית ביניהן",
    problem: "במשולש PQR ידוע: PQ = 9, QR = 13, \u2220Q = 48\u00B0.\n\nא. חשבו את אורך הצלע PR באמצעות משפט הקוסינוסים.\nב. מצאו את הזווית P באמצעות משפט הקוסינוסים או הסינוסים.\nג. חשבו את שטח המשולש.\nד. חשבו את אורך הגובה לצלע QR.",
    diagram: <MediumSASDiagram />,
    pitfalls: [
      { title: "PR\u00B2 = PQ\u00B2 + QR\u00B2 \u2212 2\u00B7PQ\u00B7QR\u00B7cos(\u2220Q) -- הזווית Q היא הזווית שבין PQ ל-QR", text: "ודאו שמציבים את הזווית שבין שתי הצלעות הידועות. אם תציבו זווית אחרת -- התוצאה שגויה." },
      { title: "כדי למצוא גובה: S = \u00BD\u00B7QR\u00B7h \u2192 h = 2S/QR", text: "חשבו קודם את השטח בנוסחת (\u00BD\u00B7PQ\u00B7QR\u00B7sin Q), ואז חלצו את הגובה מנוסחת השטח עם הבסיס QR." },
      { title: "אם משתמשים בסינוסים למציאת זווית -- sin עלול לתת שתי אפשרויות (חדה/קהה)", text: "sin(\u03B1) = sin(180\u00B0\u2212\u03B1). וודאו איזו זווית הגיונית לפי ההקשר. משפט הקוסינוסים נותן תשובה חד-ערכית." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש PQR ידוע: PQ = 9, QR = 13, \u2220Q = 48\u00B0.\nאני צריך:\n1. למצוא את PR במשפט הקוסינוסים\n2. למצוא את הזווית P\n3. לחשב שטח\n4. למצוא את הגובה לצלע QR\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- מציאת PR בקוסינוסים",
        coaching: "הציבו בנוסחה PR\u00B2 = PQ\u00B2 + QR\u00B2 \u2212 2\u00B7PQ\u00B7QR\u00B7cos Q",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש PQR ידוע: PQ = 9, QR = 13, \u2220Q = 48\u00B0. אני צריך למצוא את PR. תנחה אותי: איזו נוסחה מתאימה? מהי הזווית שבין שתי הצלעות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["קוסינוסים", "צלע", "זווית"],
        keywordHint: "ציין שמשתמשים בקוסינוסים",
        contextWords: ["קוסינוסים", "צלע", "זווית", "שטח", "גובה", "משולש"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- מציאת הזווית P",
        coaching: "בודדו cos P מהנוסחה או השתמשו בסינוסים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nמצאתי את PR. עכשיו אני צריך למצוא את \u2220P. ידועות כל שלוש הצלעות. תנחה אותי: עדיף קוסינוסים או סינוסים? מה היתרון של כל אחד? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["זווית", "קוסינוסים", "בודד"],
        keywordHint: "ציין שמבודדים את הזווית",
        contextWords: ["קוסינוסים", "צלע", "זווית", "שטח", "גובה", "משולש"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- שטח המשולש",
        coaching: "השתמשו ב-S = \u00BD\u00B7PQ\u00B7QR\u00B7sin Q",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש PQR ידוע: PQ = 9, QR = 13, \u2220Q = 48\u00B0. תנחה אותי לחשב את שטח המשולש. איזו נוסחת שטח מתאימה כשידועות שתי צלעות והזווית ביניהן? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שטח", "סינוס", "ביניהן"],
        keywordHint: "ציין שמחשבים שטח עם סינוס",
        contextWords: ["קוסינוסים", "צלע", "זווית", "שטח", "גובה", "משולש"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- גובה לצלע QR",
        coaching: "מנוסחת השטח: h = 2S / QR",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nחישבתי את שטח המשולש PQR. עכשיו אני צריך למצוא את הגובה לצלע QR. תנחה אותי: איך קשור השטח לגובה? אם S = \u00BD\u00B7base\u00B7h, מהו ה-base? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["גובה", "שטח", "בסיס"],
        keywordHint: "ציין שמחלצים גובה מהשטח",
        contextWords: ["קוסינוסים", "צלע", "זווית", "שטח", "גובה", "משולש"],
      },
    ],
  },
  {
    id: "advanced",
    title: "בעיית מדידה -- שני צופים ומגדל",
    problem: "שני צופים עומדים בנקודות A ו-B, כאשר המרחק ביניהם 500 מטר. שניהם רואים מגדל בנקודה C.\nהזווית \u2220CAB = 62\u00B0 והזווית \u2220CBA = 73\u00B0.\n\nא. מצאו את הזווית C.\nב. חשבו את המרחק AC (מצופה A למגדל).\nג. חשבו את המרחק BC (מצופה B למגדל).\nד. חשבו את גובה המגדל, אם זווית ההגבהה מנקודה A למגדל היא 15\u00B0.",
    diagram: <AdvancedSurveyDiagram />,
    pitfalls: [
      { title: "\u2220C = 180\u00B0 \u2212 62\u00B0 \u2212 73\u00B0 = 45\u00B0 -- חשבו את הזווית השלישית קודם", text: "בלי הזווית C, אי אפשר להשתמש במשפט הסינוסים. הצלע AB = 500 מ\u2019 מול הזווית C." },
      { title: "AB מול \u2220C -- הצלע הידועה (500 מ\u2019) היא מול הזווית C", text: "ודאו שמציבים נכון: AB/sin(C) = AC/sin(B) = BC/sin(A). טעות בהתאמה תהרוס את כל החישוב." },
      { title: "גובה המגדל: h = AC \u00B7 tan(15\u00B0) -- זווית ההגבהה היא בין הקרקע לקו הראייה", text: "זווית ההגבהה מנקודה A יוצרת משולש ישר-זווית שבו AC הוא הניצב הסמוך לזווית וה-h הוא הניצב שמול הזווית." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- מציאת הזווית C",
        coaching: "סכום זוויות במשולש = 180\u00B0",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nשני צופים A ו-B, המרחק 500 מ\u2019. \u2220CAB = 62\u00B0, \u2220CBA = 73\u00B0. אני צריך למצוא את \u2220C. תשאל אותי: מה סכום הזוויות במשולש ABC? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סכום", "זוויות", "180"],
        keywordHint: "ציין שסכום הזוויות 180\u00B0",
        contextWords: ["סינוסים", "מרחק", "זווית הגבהה", "מגדל", "טנגנס", "צופה"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- מציאת AC",
        coaching: "AB/sinC = AC/sinB -- הציבו ובודדו AC",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמשולש ABC: AB = 500, \u2220C = 45\u00B0, \u2220B = 73\u00B0. אני צריך למצוא את AC. תנחה אותי: AC מול איזו זווית? איך להציב במשפט הסינוסים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סינוסים", "מרחק", "צלע"],
        keywordHint: "ציין שמחשבים מרחק בסינוסים",
        contextWords: ["סינוסים", "מרחק", "זווית הגבהה", "מגדל", "טנגנס", "צופה"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- מציאת BC",
        coaching: "AB/sinC = BC/sinA",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nמצאתי את AC. עכשיו אני צריך למצוא את BC כש-AB = 500, \u2220A = 62\u00B0, \u2220C = 45\u00B0. BC מול \u2220A. תנחה אותי להציב שוב במשפט הסינוסים. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סינוסים", "מול", "הצבה"],
        keywordHint: "ציין שממשיכים עם סינוסים",
        contextWords: ["סינוסים", "מרחק", "זווית הגבהה", "מגדל", "טנגנס", "צופה"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- גובה המגדל",
        coaching: "h = AC \u00B7 tan(15\u00B0) -- משולש ישר-זווית חדש",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nמצאתי את AC. זווית ההגבהה מנקודה A למגדל היא 15\u00B0. אני צריך למצוא את גובה המגדל. תנחה אותי: איזה משולש ישר-זווית נוצר? מה הקשר בין AC, הזווית 15\u00B0 והגובה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["טנגנס", "גובה", "הגבהה"],
        keywordHint: "ציין שמשתמשים בטנגנס לגובה",
        contextWords: ["סינוסים", "מרחק", "זווית הגבהה", "מגדל", "טנגנס", "צופה"],
      },
    ],
  },
];

// ─── Triangle Solver Lab ────────────────────────────────────────────────────────

function TriangleSolverLab() {
  const [a, setA] = useState(8);
  const [b, setB] = useState(10);
  const [c, setC] = useState(6);

  // Triangle inequality check
  const valid = a + b > c && a + c > b && b + c > a;

  // Compute angles via cosine rule
  const cosA = valid ? (b * b + c * c - a * a) / (2 * b * c) : 0;
  const cosB = valid ? (a * a + c * c - b * b) / (2 * a * c) : 0;
  const cosC = valid ? (a * a + b * b - c * c) / (2 * a * b) : 0;
  const angleA = valid ? Math.acos(Math.min(1, Math.max(-1, cosA))) * (180 / Math.PI) : 0;
  const angleB = valid ? Math.acos(Math.min(1, Math.max(-1, cosB))) * (180 / Math.PI) : 0;
  const angleC = valid ? Math.acos(Math.min(1, Math.max(-1, cosC))) * (180 / Math.PI) : 0;

  // Heron's formula
  const s = (a + b + c) / 2;
  const areaSquared = valid ? s * (s - a) * (s - b) * (s - c) : 0;
  const area = valid && areaSquared > 0 ? Math.sqrt(areaSquared) : 0;

  // Triangle SVG coordinates using cosine rule for placement
  const svgW = 300, svgH = 220, pad = 30;
  const scale = valid ? (svgW - 2 * pad) / Math.max(a, b, c) * 0.75 : 1;
  const Bx = pad + 20;
  const By = svgH - pad;
  const Cx = Bx + a * scale;
  const Cy = By;
  const angleBRad = valid ? Math.acos(Math.min(1, Math.max(-1, cosB))) : Math.PI / 3;
  const Ax = Bx + c * scale * Math.cos(angleBRad);
  const Ay = By - c * scale * Math.sin(angleBRad);

  const isEquilateral = Math.abs(a - b) < 0.3 && Math.abs(b - c) < 0.3;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; פותר משולשים</h3>
        {valid && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />משולש תקין</span>}
        {!valid && <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 700 }}>אי-שוויון המשולש לא מתקיים!</span>}
      </div>

      {/* Warning */}
      {!valid && (
        <div style={{ borderRadius: 12, background: "rgba(254,226,226,0.5)", border: "2px solid rgba(220,38,38,0.3)", padding: 16, marginBottom: "1.25rem", color: "#991b1b", fontSize: 13, lineHeight: 1.6 }}>
          <strong>שימו לב:</strong> סכום כל שתי צלעות חייב להיות גדול מהצלע השלישית. שנו את ערכי הסליידרים כדי ליצור משולש תקין.
        </div>
      )}

      {/* SVG Triangle */}
      {valid && (
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
          <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
            <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="rgba(22,163,74,0.06)" stroke="#16a34a" strokeWidth={2} />
            {/* Vertex labels */}
            <text x={Ax} y={Ay - 8} textAnchor="middle" fill="#16a34a" fontSize={13} fontWeight={700}>A</text>
            <text x={Bx - 10} y={By + 4} textAnchor="end" fill="#16a34a" fontSize={13} fontWeight={700}>B</text>
            <text x={Cx + 10} y={Cy + 4} textAnchor="start" fill="#16a34a" fontSize={13} fontWeight={700}>C</text>
            {/* Side labels */}
            <text x={(Bx + Cx) / 2} y={By + 18} textAnchor="middle" fill="#ea580c" fontSize={11} fontWeight={600}>a = {a}</text>
            <text x={(Ax + Bx) / 2 - 14} y={(Ay + By) / 2} textAnchor="end" fill="#7c3aed" fontSize={11} fontWeight={600}>c = {c}</text>
            <text x={(Ax + Cx) / 2 + 14} y={(Ay + Cy) / 2} textAnchor="start" fill="#64748b" fontSize={11} fontWeight={600}>b = {b}</text>
          </svg>
        </div>
      )}

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>צלע a</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{a}</span>
          </div>
          <input type="range" min={2} max={20} step={0.5} value={a}
            onChange={e => setA(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#ea580c" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>צלע b</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{b}</span>
          </div>
          <input type="range" min={2} max={20} step={0.5} value={b}
            onChange={e => setB(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>צלע c</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{c}</span>
          </div>
          <input type="range" min={2} max={20} step={0.5} value={c}
            onChange={e => setC(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#7c3aed" }} />
        </div>
      </div>

      {/* Data tiles */}
      {valid && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
            <p style={{ color: "#94a3b8", marginBottom: 4 }}>{"\u2220"}A</p>
            <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{angleA.toFixed(1)}{"\u00B0"}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
            <p style={{ color: "#94a3b8", marginBottom: 4 }}>{"\u2220"}B</p>
            <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{angleB.toFixed(1)}{"\u00B0"}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
            <p style={{ color: "#94a3b8", marginBottom: 4 }}>{"\u2220"}C</p>
            <p style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{angleC.toFixed(1)}{"\u00B0"}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
            <p style={{ color: "#94a3b8", marginBottom: 4 }}>שטח</p>
            <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{area.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        {valid ? (
          <>
            <span style={{ color: "#16a34a", fontWeight: 600 }}>הזינו שלוש צלעות וראו את הזוויות והשטח</span> &nbsp;|&nbsp;
            {angleA > 90 || angleB > 90 || angleC > 90 ? "קהה-זווית" : Math.abs(angleA - 90) < 0.5 || Math.abs(angleB - 90) < 0.5 || Math.abs(angleC - 90) < 0.5 ? "ישר-זווית" : isEquilateral ? "שווה-צלעות" : "חד-זווית"}
          </>
        ) : (
          <span style={{ color: "#dc2626", fontWeight: 600 }}>שנו את הצלעות כך שיקיימו את אי-שוויון המשולש</span>
        )}
      </div>

      <LabMessage text="משולש שווה-צלעות! כל הזוויות 60\u00B0" type="success" visible={isEquilateral && valid} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrigLawsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משפט הסינוסים והקוסינוסים</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>חישוב צלעות וזוויות במשולש כללי</p>
          </div>
          <Link
            href="/3u/topic/grade11/trig"
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

        <SubtopicProgress subtopicId="3u/grade11/trig/laws" />

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
        <TriangleSolverLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/trig/laws" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
