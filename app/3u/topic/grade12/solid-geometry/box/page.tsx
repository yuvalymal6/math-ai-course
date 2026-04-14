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

function BasicBoxDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>תיבה -- מקבילון ישר-זווית</p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        {/* Back face */}
        <polygon points="100,40 240,40 240,140 100,140" fill="none" stroke="#16a34a" strokeWidth={1.5} />
        {/* Front face */}
        <polygon points="60,80 200,80 200,180 60,180" fill="none" stroke="#16a34a" strokeWidth={1.8} />
        {/* Connecting edges (visible) */}
        <line x1={200} y1={80} x2={240} y2={40} stroke="#16a34a" strokeWidth={1.5} />
        <line x1={200} y1={180} x2={240} y2={140} stroke="#16a34a" strokeWidth={1.5} />
        {/* Connecting edges (hidden -- dashed) */}
        <line x1={60} y1={80} x2={100} y2={40} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
        <line x1={60} y1={180} x2={100} y2={140} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
        {/* Vertex labels */}
        <text x={52} y={78} fill="#16a34a" fontSize={12} fontWeight={700}>A</text>
        <text x={202} y={78} fill="#16a34a" fontSize={12} fontWeight={700}>B</text>
        <text x={202} y={192} fill="#16a34a" fontSize={12} fontWeight={700}>C</text>
        <text x={52} y={192} fill="#16a34a" fontSize={12} fontWeight={700}>D</text>
        <text x={92} y={36} fill="#16a34a" fontSize={12} fontWeight={700}>E</text>
        <text x={244} y={36} fill="#16a34a" fontSize={12} fontWeight={700}>F</text>
        <text x={244} y={152} fill="#16a34a" fontSize={12} fontWeight={700}>G</text>
        <text x={92} y={152} fill="#16a34a" fontSize={12} fontWeight={700}>H</text>
        {/* Dimension labels */}
        <text x={130} y={198} fill="#64748b" fontSize={11} fontWeight={600}>a</text>
        <text x={210} y={138} fill="#64748b" fontSize={11} fontWeight={600}>b</text>
        <text x={244} y={96} fill="#64748b" fontSize={11} fontWeight={600}>c</text>
      </svg>
    </div>
  );
}

function MediumBoxDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>תיבה -- אלכסון פאה ואלכסון מרחבי</p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        {/* Back face */}
        <polygon points="100,40 240,40 240,140 100,140" fill="none" stroke="#ea580c" strokeWidth={1.5} />
        {/* Front face */}
        <polygon points="60,80 200,80 200,180 60,180" fill="none" stroke="#ea580c" strokeWidth={1.8} />
        {/* Connecting edges (visible) */}
        <line x1={200} y1={80} x2={240} y2={40} stroke="#ea580c" strokeWidth={1.5} />
        <line x1={200} y1={180} x2={240} y2={140} stroke="#ea580c" strokeWidth={1.5} />
        {/* Connecting edges (hidden -- dashed) */}
        <line x1={60} y1={80} x2={100} y2={40} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
        <line x1={60} y1={180} x2={100} y2={140} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
        {/* Face diagonal (amber) -- bottom face */}
        <line x1={60} y1={180} x2={200} y2={80} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3" />
        <text x={115} y={122} fill="#f59e0b" fontSize={11} fontWeight={700}>d_f</text>
        {/* Space diagonal (violet) */}
        <line x1={60} y1={180} x2={240} y2={40} stroke="#a78bfa" strokeWidth={2.2} />
        <text x={140} y={100} fill="#a78bfa" fontSize={11} fontWeight={700}>d_s</text>
        {/* Vertex labels */}
        <text x={52} y={78} fill="#ea580c" fontSize={12} fontWeight={700}>A</text>
        <text x={202} y={78} fill="#ea580c" fontSize={12} fontWeight={700}>B</text>
        <text x={202} y={192} fill="#ea580c" fontSize={12} fontWeight={700}>C</text>
        <text x={52} y={192} fill="#ea580c" fontSize={12} fontWeight={700}>D</text>
        <text x={92} y={36} fill="#ea580c" fontSize={12} fontWeight={700}>E</text>
        <text x={244} y={36} fill="#ea580c" fontSize={12} fontWeight={700}>F</text>
        <text x={244} y={152} fill="#ea580c" fontSize={12} fontWeight={700}>G</text>
        <text x={92} y={152} fill="#ea580c" fontSize={12} fontWeight={700}>H</text>
      </svg>
    </div>
  );
}

function AdvancedBoxDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>ארגז -- אופטימיזציה עם אילוץ</p>
      <svg width="100%" viewBox="0 0 300 220" style={{ maxWidth: "100%" }}>
        {/* Back face */}
        <polygon points="110,50 220,50 220,140 110,140" fill="none" stroke="#dc2626" strokeWidth={1.5} />
        {/* Front face */}
        <polygon points="70,85 180,85 180,175 70,175" fill="none" stroke="#dc2626" strokeWidth={1.8} />
        {/* Connecting edges (visible) */}
        <line x1={180} y1={85} x2={220} y2={50} stroke="#dc2626" strokeWidth={1.5} />
        <line x1={180} y1={175} x2={220} y2={140} stroke="#dc2626" strokeWidth={1.5} />
        {/* Connecting edges (hidden -- dashed) */}
        <line x1={70} y1={85} x2={110} y2={50} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
        <line x1={70} y1={175} x2={110} y2={140} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
        {/* Highlight square cross-section (front face = square) */}
        <rect x={70} y={85} width={110} height={90} fill="rgba(220,38,38,0.06)" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5,3" />
        {/* a = b label */}
        <text x={125} y={188} fill="#dc2626" fontSize={11} fontWeight={700}>a = b</text>
        {/* c height label */}
        <text x={188} y={138} fill="#64748b" fontSize={11} fontWeight={600}>c</text>
        {/* Constraint annotation */}
        <text x={80} y={210} fill="#94a3b8" fontSize={10}>4a + c ≤ 200</text>
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
        subjectWords={["תיבה", "נפח", "אלכסון", "שטח פנים", "קיצון", "מידות"]}
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
  const [activeTab, setActiveTab] = useState<"volume" | "surface" | "faceDiag" | "spaceDiag" | null>(null);

  const tabs = [
    { id: "volume" as const,    label: "נפח",           tex: "V = a \\cdot b \\cdot c",               color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "surface" as const,   label: "שטח פנים",      tex: "S = 2(ab+bc+ac)",                       color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "faceDiag" as const,  label: "אלכסון פאה",    tex: "d_f = \\sqrt{a^2+b^2}",                 color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "spaceDiag" as const, label: "אלכסון מרחבי",  tex: "d_s = \\sqrt{a^2+b^2+c^2}",             color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Volume */}
      {activeTab === "volume" && (
        <motion.div key="volume" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"V = a \\cdot b \\cdot c"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> מכפלת שלוש הצלעות של התיבה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הנפח מודד את הגודל התלת-ממדי של התיבה.</li>
                  <li>שלוש הצלעות <InlineMath>{"a, b, c"}</InlineMath> הן אורך, רוחב וגובה.</li>
                  <li>יחידות: אם הצלעות בס&quot;מ, הנפח בסמ&quot;ק.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; הנפח הוא פשוט מכפלה של שלוש הצלעות -- אל תחברו אותן!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Surface Area */}
      {activeTab === "surface" && (
        <motion.div key="surface" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"S = 2(ab + bc + ac)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> סכום שטחי שש הפאות של התיבה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>לתיבה 3 זוגות של פאות מקבילות.</li>
                  <li>כל זוג: <InlineMath>{"ab"}</InlineMath>, <InlineMath>{"bc"}</InlineMath>, <InlineMath>{"ac"}</InlineMath>.</li>
                  <li>כופלים ב-2 כי כל שטח מופיע פעמיים (למעלה ולמטה, ימין ושמאל, קדימה ואחורה).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טעות נפוצה: לשכוח את ה-2 בהתחלה -- יש שלושה זוגות פאות!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Face Diagonal */}
      {activeTab === "faceDiag" && (
        <motion.div key="faceDiag" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"d_f = \\sqrt{a^2 + b^2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> אלכסון של פאה אחת (מלבן) בתיבה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>כל פאה של התיבה היא מלבן.</li>
                  <li>אלכסון המלבן מחושב לפי משפט פיתגורס.</li>
                  <li>יש שלושה אלכסוני פאה שונים: <InlineMath>{"\\sqrt{a^2+b^2}"}</InlineMath>, <InlineMath>{"\\sqrt{b^2+c^2}"}</InlineMath>, <InlineMath>{"\\sqrt{a^2+c^2}"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימו לב באיזו פאה מדובר -- בחרו את שתי הצלעות המתאימות!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Space Diagonal */}
      {activeTab === "spaceDiag" && (
        <motion.div key="spaceDiag" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"d_s = \\sqrt{a^2 + b^2 + c^2}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> האלכסון מקודקוד לקודקוד הנגדי בתיבה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>האלכסון המרחבי עובר דרך פנים התיבה.</li>
                  <li>אפשר לגזור אותו בשני שלבי פיתגורס: קודם אלכסון פאה, ואז פיתגורס שוב עם הצלע השלישית.</li>
                  <li>לתיבה 4 אלכסונים מרחביים, כולם שווים.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; <InlineMath>{"d_s = \\sqrt{d_f^2 + c^2}"}</InlineMath> -- אלכסון מרחבי = פיתגורס על אלכסון פאה + הצלע השלישית.
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
    title: "תיבה -- נפח, שטח פנים ואלכסון מרחבי",
    problem: "תיבה (מקבילון ישר-זווית) עם צלעות a = 4, b = 3, c = 5.\n\n\u05D0. חשבו את נפח התיבה.\n\u05D1. חשבו את שטח הפנים הכולל.\n\u05D2. חשבו את אורך האלכסון המרחבי.",
    diagram: <BasicBoxDiagram />,
    pitfalls: [
      { title: "שטח פנים = 2(ab + bc + ac) -- יש 3 זוגות פאות, כל זוג מופיע פעמיים", text: "אל תשכחו לכפול ב-2. שלוש מכפלות שונות, כל אחת פעמיים." },
      { title: "אלכסון מרחבי = \u221A(a\u00B2+b\u00B2+c\u00B2) -- אל תשכחו את c\u00B2!", text: "טעות נפוצה: לחשב רק אלכסון פאה ולשכוח את הצלע השלישית." },
      { title: "נפח = a\u00B7b\u00B7c = 60 -- פשוט מכפלה, לא חיבור", text: "נפח הוא מכפלה של שלוש הצלעות, לא סכום שלהן." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nתיבה עם צלעות a = 4, b = 3, c = 5.\nאני צריך:\n1. לחשב נפח\n2. לחשב שטח פנים כולל\n3. לחשב אלכסון מרחבי\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- נפח התיבה",
        coaching: "הכפל את שלוש הצלעות",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nתיבה עם צלעות a = 4, b = 3, c = 5. תנחה אותי לחשב את הנפח. שאל: מה הנוסחה לנפח תיבה? מה מציבים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["תיבה", "נפח", "צלעות"],
        keywordHint: "ציין שמדובר בחישוב נפח תיבה",
        contextWords: ["תיבה", "נפח", "שטח פנים", "אלכסון", "צלעות", "פאות"],
        stationWords: ["תיבה", "נפח", "צלעות"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- שטח פנים כולל",
        coaching: "חשב 3 מכפלות של זוגות צלעות וכפול ב-2",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nתיבה עם צלעות a = 4, b = 3, c = 5. תנחה אותי לחשב את שטח הפנים הכולל. שאל: כמה פאות יש לתיבה? מה שטח כל זוג? למה כופלים ב-2? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שטח", "פנים", "פאות"],
        keywordHint: "ציין שמדובר בחישוב שטח פנים",
        contextWords: ["תיבה", "נפח", "שטח פנים", "אלכסון", "צלעות", "פאות"],
        stationWords: ["תיבה", "נפח", "צלעות"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- אלכסון מרחבי",
        coaching: "השתמש בנוסחה עם שלוש הצלעות בריבוע",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nתיבה עם צלעות a = 4, b = 3, c = 5. תנחה אותי לחשב את האלכסון המרחבי. שאל: מה הנוסחה? למה צריך את כל שלוש הצלעות? מה ההבדל בין אלכסון פאה למרחבי? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אלכסון", "מרחבי", "פיתגורס"],
        keywordHint: "ציין שמדובר באלכסון מרחבי",
        contextWords: ["תיבה", "נפח", "שטח פנים", "אלכסון", "צלעות", "פאות"],
        stationWords: ["תיבה", "נפח", "צלעות"],
      },
    ],
  },
  {
    id: "medium",
    title: "תיבה -- מציאת צלע חסרה ואלכסונים",
    problem: "נפח תיבה הוא 240 סמ\"ק. ידוע ש-a = 6 ו-b = 8.\n\n\u05D0. מצאו את c (הגובה).\n\u05D1. חשבו את אלכסון הפאה התחתונה (הפאה עם a ו-b).\n\u05D2. חשבו את האלכסון המרחבי.\n\u05D3. חשבו את שטח הפנים הכולל.",
    diagram: <MediumBoxDiagram />,
    pitfalls: [
      { title: "V = a\u00B7b\u00B7c \u2192 240 = 6\u00B78\u00B7c \u2192 c = 240/48 = 5", text: "לפני חישוב אלכסונים, חייבים למצוא את הצלע החסרה מתוך הנפח." },
      { title: "אלכסון פאה תחתונה = \u221A(6\u00B2+8\u00B2) = \u221A(100) = 10 -- זה פיתגורס במלבן", text: "בחרו נכון את שתי הצלעות של הפאה המבוקשת. הפאה התחתונה משתמשת ב-a ו-b." },
      { title: "אלכסון מרחבי = \u221A(6\u00B2+8\u00B2+5\u00B2) = \u221A(125) = 5\u221A5", text: "אל תשכחו לפשט שורש: \u221A125 = \u221A(25\u00B75) = 5\u221A5." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nנפח תיבה הוא 240 סמ\"ק. a = 6, b = 8.\nאני צריך:\n1. למצוא את c מתוך הנפח\n2. לחשב אלכסון פאה תחתונה\n3. לחשב אלכסון מרחבי\n4. לחשב שטח פנים כולל\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- מציאת c מתוך הנפח",
        coaching: "הצב בנוסחת הנפח ובודד את c",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nנפח תיבה = 240, a = 6, b = 8. תנחה אותי למצוא את c. שאל: מה הנוסחה? איך מבודדים c? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נפח", "בודד", "גובה"],
        keywordHint: "ציין שצריך לבודד את c מנוסחת הנפח",
        contextWords: ["נפח", "אלכסון פאה", "מרחבי", "פיתגורס", "שטח", "גובה"],
        stationWords: ["נפח", "אלכסון", "תיבה"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- אלכסון פאה תחתונה",
        coaching: "פיתגורס על הפאה עם a ו-b",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nתיבה עם a = 6, b = 8. תנחה אותי לחשב את אלכסון הפאה התחתונה. שאל: מה הנוסחה? באיזו פאה מדובר? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אלכסון", "פאה", "פיתגורס"],
        keywordHint: "ציין שמדובר באלכסון פאה עם פיתגורס",
        contextWords: ["נפח", "אלכסון פאה", "מרחבי", "פיתגורס", "שטח", "גובה"],
        stationWords: ["נפח", "אלכסון", "תיבה"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- אלכסון מרחבי",
        coaching: "פיתגורס עם שלוש צלעות או עם אלכסון פאה + c",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nתיבה עם a = 6, b = 8, c = 5. תנחה אותי לחשב את האלכסון המרחבי. שאל: מה הנוסחה? האם אפשר להשתמש באלכסון הפאה שחישבנו? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מרחבי", "שורש", "צלעות"],
        keywordHint: "ציין שמשתמשים בשלוש הצלעות",
        contextWords: ["נפח", "אלכסון פאה", "מרחבי", "פיתגורס", "שטח", "גובה"],
        stationWords: ["נפח", "אלכסון", "תיבה"],
      },
      {
        phase: "\u05D3",
        label: "סעיף ד\u2019 -- שטח פנים כולל",
        coaching: "חשב שלוש מכפלות של זוגות צלעות, כפול 2",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nתיבה עם a = 6, b = 8, c = 5. תנחה אותי לחשב שטח פנים כולל. שאל: כמה סוגי פאות? מה השטח של כל זוג? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שטח", "פנים", "זוגות"],
        keywordHint: "ציין שיש שלושה זוגות פאות",
        contextWords: ["נפח", "אלכסון פאה", "מרחבי", "פיתגורס", "שטח", "גובה"],
        stationWords: ["נפח", "אלכסון", "תיבה"],
      },
    ],
  },
  {
    id: "advanced",
    title: "ארגז משלוח -- נפח מקסימלי עם אילוץ",
    problem: "ארגז למשלוח חייב לעמוד בתנאים: היקף החתך (2a + 2b) ועוד הגובה c לא יעלו על 200 ס\"מ. רוצים ש-a = b (חתך ריבועי).\n\n\u05D0. אם a = b, רשמו את הקשר: 4a + c \u2264 200. בטאו את c באמצעות a.\n\u05D1. כתבו את נוסחת הנפח V(a) כפונקציה של a בלבד.\n\u05D2. מצאו את a שנותן נפח מקסימלי (גזרו והשוו לאפס).\n\u05D3. מהו הנפח המקסימלי? מהם מידי הארגז?",
    diagram: <AdvancedBoxDiagram />,
    pitfalls: [
      { title: "c = 200 \u2212 4a (שוויון כדי למקסם) \u2192 V = a\u00B2 \u00B7 (200 \u2212 4a) = 200a\u00B2 \u2212 4a\u00B3", text: "כדי למקסם את הנפח, נשתמש בשוויון באילוץ. הנפח הוא פולינום ממעלה שלישית ב-a." },
      { title: "V'(a) = 400a \u2212 12a\u00B2 = 0 \u2192 a(400 \u2212 12a) = 0 \u2192 a = 100/3 \u2248 33.3", text: "אל תשכחו לפסול a = 0 (אין תיבה בגודל 0). הפתרון הרלוונטי הוא a = 100/3." },
      { title: "ודאו שזה מקסימום: V''(a) = 400 \u2212 24a, ב-a = 100/3: V'' < 0", text: "נגזרת שנייה שלילית מאשרת שמדובר בנקודת מקסימום ולא מינימום." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- ביטוי c באמצעות a",
        coaching: "הצב a = b באילוץ ובודד את c",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nארגז עם חתך ריבועי a = b, אילוץ: 4a + c \u2264 200. תנחה אותי לבטא את c באמצעות a. שאל: למה משתמשים בשוויון? מה מקבלים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["אילוץ", "בטא", "שוויון"],
        keywordHint: "ציין שצריך לבטא c מתוך האילוץ",
        contextWords: ["קיצון", "נגזרת", "נפח מקסימלי", "אילוץ", "חתך", "ארגז"],
        stationWords: ["קיצון", "נפח", "ארגז"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- נוסחת הנפח V(a)",
        coaching: "הצב c = 200 \u2212 4a בנוסחת V = a\u00B2\u00B7c",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\na = b, c = 200 \u2212 4a. תנחה אותי לכתוב V(a) = a\u00B2(200 \u2212 4a). שאל: מה קורה כשפותחים סוגריים? מה המעלה של הפולינום? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נפח", "פונקציה", "פולינום"],
        keywordHint: "ציין שהנפח הוא פונקציה של a",
        contextWords: ["קיצון", "נגזרת", "נפח מקסימלי", "אילוץ", "חתך", "ארגז"],
        stationWords: ["קיצון", "נפח", "ארגז"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- גזירה ומציאת a",
        coaching: "גזור V'(a) והשווה לאפס",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nV(a) = 200a\u00B2 \u2212 4a\u00B3. תנחה אותי לגזור ולמצוא את a שנותן נפח מקסימלי. שאל: מה V'(a)? איך פותרים V'(a) = 0? איך מוודאים שזה מקסימום? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נגזרת", "אפס", "מקסימום"],
        keywordHint: "ציין שצריך לגזור ולמצוא נקודת קיצון",
        contextWords: ["קיצון", "נגזרת", "נפח מקסימלי", "אילוץ", "חתך", "ארגז"],
        stationWords: ["קיצון", "נפח", "ארגז"],
      },
      {
        phase: "\u05D3",
        label: "סעיף ד\u2019 -- נפח מקסימלי ומידות",
        coaching: "הצב a = 100/3 בחזרה ומצא V ו-c",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יב 3 יחידות.\nמצאתי a = 100/3. תנחה אותי לחשב את c ואת הנפח המקסימלי. שאל: מה c כש-a = 100/3? מה V? מהם המידות הסופיים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נפח", "מידות", "הצב"],
        keywordHint: "ציין שצריך להציב בחזרה ולמצוא מידות",
        contextWords: ["קיצון", "נגזרת", "נפח מקסימלי", "אילוץ", "חתך", "ארגז"],
        stationWords: ["קיצון", "נפח", "ארגז"],
      },
    ],
  },
];

// ─── Box Lab ─────────────────────────────────────────────────────────────────

function BoxLab() {
  const [a, setA] = useState(4);
  const [b, setB] = useState(3);
  const [c, setC] = useState(5);

  const volume = a * b * c;
  const surface = 2 * (a * b + b * c + a * c);
  const faceDiag = Math.sqrt(a * a + b * b);
  const spaceDiag = Math.sqrt(a * a + b * b + c * c);

  const isDefault = a === 4 && b === 3 && c === 5;

  // Oblique projection helpers
  const svgW = 320, svgH = 260;
  const ox = 80, oy = 190; // origin (front-bottom-left)
  const sx = 14, sy = 14; // scale per unit
  const dx = 0.5, dy = -0.4; // depth direction ratios

  const toX = (ia: number, ib: number, ic: number) => ox + ia * sx + ib * dx * sx;
  const toY = (ia: number, ib: number, ic: number) => oy - ic * sy + ib * dy * sy;

  // 8 vertices: [a-coord, b-coord, c-coord]
  const vtx = [
    [0, 0, 0], [a, 0, 0], [a, b, 0], [0, b, 0],
    [0, 0, c], [a, 0, c], [a, b, c], [0, b, c],
  ];
  const p = vtx.map(v => [toX(v[0], v[1], v[2]), toY(v[0], v[1], v[2])]);

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת תיבה</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />V = {volume.toFixed(1)}</span>
      </div>

      {/* SVG -- 3D box in oblique projection */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Hidden edges (dashed) */}
          <line x1={p[0][0]} y1={p[0][1]} x2={p[3][0]} y2={p[3][1]} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
          <line x1={p[3][0]} y1={p[3][1]} x2={p[7][0]} y2={p[7][1]} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
          <line x1={p[3][0]} y1={p[3][1]} x2={p[2][0]} y2={p[2][1]} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />

          {/* Visible edges */}
          {/* Bottom front */}
          <line x1={p[0][0]} y1={p[0][1]} x2={p[1][0]} y2={p[1][1]} stroke="#16a34a" strokeWidth={1.8} />
          {/* Bottom right */}
          <line x1={p[1][0]} y1={p[1][1]} x2={p[2][0]} y2={p[2][1]} stroke="#16a34a" strokeWidth={1.8} />
          {/* Top front */}
          <line x1={p[4][0]} y1={p[4][1]} x2={p[5][0]} y2={p[5][1]} stroke="#16a34a" strokeWidth={1.8} />
          {/* Top back */}
          <line x1={p[5][0]} y1={p[5][1]} x2={p[6][0]} y2={p[6][1]} stroke="#16a34a" strokeWidth={1.8} />
          {/* Top left */}
          <line x1={p[7][0]} y1={p[7][1]} x2={p[4][0]} y2={p[4][1]} stroke="#16a34a" strokeWidth={1.8} />
          {/* Top right-back */}
          <line x1={p[6][0]} y1={p[6][1]} x2={p[7][0]} y2={p[7][1]} stroke="#16a34a" strokeWidth={1.8} />
          {/* Vertical edges (visible) */}
          <line x1={p[0][0]} y1={p[0][1]} x2={p[4][0]} y2={p[4][1]} stroke="#16a34a" strokeWidth={1.8} />
          <line x1={p[1][0]} y1={p[1][1]} x2={p[5][0]} y2={p[5][1]} stroke="#16a34a" strokeWidth={1.8} />
          <line x1={p[2][0]} y1={p[2][1]} x2={p[6][0]} y2={p[6][1]} stroke="#16a34a" strokeWidth={1.8} />
          {/* Bottom back edge */}
          <line x1={p[2][0]} y1={p[2][1]} x2={p[1][0]} y2={p[1][1]} stroke="#16a34a" strokeWidth={1.5} />

          {/* Dimension labels */}
          <text x={(p[0][0] + p[1][0]) / 2} y={p[0][1] + 16} textAnchor="middle" fill="#16a34a" fontSize={12} fontWeight={700}>a = {a.toFixed(1)}</text>
          <text x={(p[1][0] + p[2][0]) / 2 + 8} y={(p[1][1] + p[2][1]) / 2 + 4} fill="#7c3aed" fontSize={12} fontWeight={700}>b = {b.toFixed(1)}</text>
          <text x={p[1][0] + 12} y={(p[1][1] + p[5][1]) / 2 + 4} fill="#dc2626" fontSize={12} fontWeight={700}>c = {c.toFixed(1)}</text>
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>צלע a</span>
            <span style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{a.toFixed(1)}</span>
          </div>
          <input type="range" min={1} max={15} step={0.5} value={a}
            onChange={e => setA(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>צלע b</span>
            <span style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{b.toFixed(1)}</span>
          </div>
          <input type="range" min={1} max={15} step={0.5} value={b}
            onChange={e => setB(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#7c3aed" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>צלע c</span>
            <span style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{c.toFixed(1)}</span>
          </div>
          <input type="range" min={1} max={15} step={0.5} value={c}
            onChange={e => setC(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>V (נפח)</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{volume.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>S (שטח פנים)</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{surface.toFixed(1)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>d_f (אלכסון פאה)</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{faceDiag.toFixed(2)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>d_s (מרחבי)</p>
          <p style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{spaceDiag.toFixed(2)}</p>
        </div>
      </div>

      <LabMessage text="שנו את צלעות התיבה וראו כיצד הנפח והאלכסונים משתנים" type="success" visible={isDefault} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoxPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>תיבה עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>נפח, שטח פנים, אלכסון פאה ואלכסון מרחבי</p>
          </div>
          <Link
            href="/3u/topic/grade12/solid-geometry"
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

        <SubtopicProgress subtopicId="3u/grade12/solid-geometry/box" />

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
        <BoxLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade12/solid-geometry/box" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
