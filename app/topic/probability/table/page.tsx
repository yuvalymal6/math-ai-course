"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle2, Lock, Sparkles } from "lucide-react";
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

// ─── SVG diagrams (silent -- no numbers, no answers) ──────────────────────────

function TableGridSVGLight({ r1, r2, c1, c2, color }: { r1: string; r2: string; c1: string; c2: string; color: string }) {
  const W = 320, H = 128;
  const xs = [0, 76, 160, 240, W];
  const ys = [0, 32, 64, 96, H];

  const cellText = (text: string, xi: number, yi: number, bold = false) => {
    const cx = (xs[xi] + xs[xi + 1]) / 2;
    const cy = (ys[yi] + ys[yi + 1]) / 2 + 4;
    return (
      <text key={`${xi}-${yi}`} x={cx} y={cy} textAnchor="middle"
        fill={bold ? color : "#94a3b8"} fontSize={bold ? 10 : 9} fontWeight={bold ? "700" : "400"}>
        {text}
      </text>
    );
  };

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
      {/* Header cells - light gray */}
      {[0,1,2,3].map(xi => <rect key={`hc${xi}`} x={xs[xi]} y={ys[0]} width={xs[xi+1]-xs[xi]} height={ys[1]-ys[0]} fill="#f1f5f9" />)}
      <rect x={xs[0]} y={ys[1]} width={xs[1]-xs[0]} height={ys[2]-ys[1]} fill="#f1f5f9" />
      <rect x={xs[0]} y={ys[2]} width={xs[1]-xs[0]} height={ys[3]-ys[2]} fill="#f1f5f9" />
      <rect x={xs[0]} y={ys[3]} width={xs[1]-xs[0]} height={ys[4]-ys[3]} fill="#f1f5f9" />
      {/* Total col/row subtle */}
      <rect x={xs[3]} y={ys[1]} width={xs[4]-xs[3]} height={ys[4]-ys[1]} fill="#f8fafc" opacity={0.8} />
      <rect x={xs[1]} y={ys[3]} width={xs[3]-xs[1]} height={ys[4]-ys[3]} fill="#f8fafc" opacity={0.8} />
      {/* Grid lines */}
      {xs.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="#cbd5e1" strokeWidth={i === 0 || i === xs.length-1 ? 1.5 : 1} />)}
      {ys.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="#cbd5e1" strokeWidth={i === 0 || i === ys.length-1 ? 1.5 : 1} />)}
      {/* Column headers */}
      {cellText(c1, 1, 0, true)}
      {cellText(c2, 2, 0, true)}
      {cellText('סה"כ', 3, 0, true)}
      {/* Row headers */}
      {cellText(r1, 0, 1, true)}
      {cellText(r2, 0, 2, true)}
      {cellText('סה"כ', 0, 3, true)}
      {/* Empty data cells */}
      {[1,2,3].flatMap(xi => [1,2,3].map(yi => (
        <text key={`d${xi}${yi}`} x={(xs[xi]+xs[xi+1])/2} y={(ys[yi]+ys[yi+1])/2+4}
          textAnchor="middle" fill="#cbd5e1" fontSize={9}>—</text>
      )))}
    </svg>
  );
}

function BasicTableDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלת שכיחויות -- בנים/בנות × משקפיים</p>
      <TableGridSVGLight r1="בנים" r2="בנות" c1="מרכיבי משקפיים" c2="לא מרכיבים" color="#16a34a" />
    </div>
  );
}

function WorkTableDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלת שכיחויות -- גברים/נשים × עישון</p>
      <TableGridSVGLight r1="גברים" r2="נשים" c1="מעשנים" c2="לא מעשנים" color="#ea580c" />
    </div>
  );
}

function StudentsTableDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלת שכיחויות -- שנה א׳/ב׳ × מבחן</p>
      <TableGridSVGLight r1="שנה א׳" r2="שנה ב׳" c1="עברו מבחן" c2="לא עברו" color="#dc2626" />
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
        subjectWords={["טבלה", "מותנה", "חיתוך", "הסתברות", "שורה", "עמודה"]}
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
  const [activeTab, setActiveTab] = useState<"intersection" | "conditional" | "marginal" | "table" | null>(null);

  const tabs = [
    { id: "intersection" as const, label: "חיתוך",      tex: "P(A \\cap B)", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "conditional" as const,  label: "מותנה",       tex: "P(A|B)",       color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "marginal" as const,     label: "שולית",       tex: "P(A)",         color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "table" as const,        label: "טבלה 2\u00D72", tex: "\\Sigma = N", color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Intersection */}
      {activeTab === "intersection" && (
        <motion.div key="intersection" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A \\cap B) = \\frac{\\text{cell}}{N}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הסתברות החיתוך היא שברו של התא הספציפי בטבלה מתוך <InlineMath>{"N"}</InlineMath> הכולל.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מצאו את התא שמתאים לשני האירועים גם יחד.</li>
                  <li>חלקו את ערך התא ב-<InlineMath>{"N"}</InlineMath> (סה&quot;כ כולל בפינה).</li>
                  <li>זוהי ההסתברות שהפרט שייך לשתי הקבוצות בו-זמנית.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: תא = כמות, <InlineMath>{"N"}</InlineMath> = סך כל הנסקרים &rarr; <InlineMath>{"P(A \\cap B) = \\frac{\\text{cell}}{N}"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Conditional */}
      {activeTab === "conditional" && (
        <motion.div key="conditional" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A|B) = \\frac{P(A \\cap B)}{P(B)} = \\frac{\\text{cell}}{\\text{row/col total}}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הסתברות מותנה מצמצמת את מרחב המדגם לשורה/עמודה מסוימת:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>&quot;בהינתן ש-B&quot; = מסתכלים רק על השורה/עמודה של B.</li>
                  <li>המכנה הוא סה&quot;כ השורה/עמודה, לא <InlineMath>{"N"}</InlineMath> הכולל.</li>
                  <li><InlineMath>{"P(A|B) \\neq P(B|A)"}</InlineMath> -- הכיוון חשוב!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: תא ÷ סה&quot;כ שורה &rarr; <InlineMath>{"P(A|B)"}</InlineMath>; תא ÷ סה&quot;כ עמודה &rarr; <InlineMath>{"P(B|A)"}</InlineMath>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Marginal */}
      {activeTab === "marginal" && (
        <motion.div key="marginal" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A) = \\frac{\\text{row total}}{N}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> ההסתברות השולית מתקבלת מסה&quot;כ השורה או העמודה:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סה&quot;כ שורה ÷ <InlineMath>{"N"}</InlineMath> = הסתברות שולית לשורה.</li>
                  <li>סה&quot;כ עמודה ÷ <InlineMath>{"N"}</InlineMath> = הסתברות שולית לעמודה.</li>
                  <li>שולית = &quot;ללא קשר&quot; למשתנה השני.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימו לב: <InlineMath>{"P(A)"}</InlineMath> שולית ≠ ממוצע פשוט של ההסתברויות המותנות. חייבים ממוצע משוקלל.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Table structure */}
      {activeTab === "table" && (
        <motion.div key="table" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"\\begin{array}{c|cc|c} & B & \\bar{B} & \\Sigma \\\\ \\hline A & n_{11} & n_{12} & n_{1\\cdot} \\\\ \\bar{A} & n_{21} & n_{22} & n_{2\\cdot} \\\\ \\hline \\Sigma & n_{\\cdot 1} & n_{\\cdot 2} & N \\end{array}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> מבנה טבלה 2×2:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>4 תאים פנימיים -- כל תא מייצג חיתוך של שני אירועים.</li>
                  <li>סה&quot;כ שורות ועמודות בשוליים -- סכומים חלקיים.</li>
                  <li>פינה ימנית תחתונה = <InlineMath>{"N"}</InlineMath> הכולל. סכום כל השורות = סכום כל העמודות = <InlineMath>{"N"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: התחילו למלא את מה שידוע, השלימו חסרים מסכומי שורות/עמודות. תמיד בדקו שהכול מסתכם ל-<InlineMath>{"N"}</InlineMath>.
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
    title: "טבלת שכיחויות -- בנים, בנות ומשקפיים",
    problem: "בבית ספר 100 תלמידים: 40 בנים ו-60 בנות. מתוך הבנים, 10 מרכיבי משקפיים. מתוך הבנות, 15 מרכיבות משקפיים. בחרנו תלמיד/ית באקראי:\n\nא. מלאו טבלת שכיחויות 2×2.\nב. מה ההסתברות שהתלמיד/ית מרכיב/ה משקפיים?\nג. מה ההסתברות שהתלמיד/ית גם בן וגם מרכיב/ה משקפיים?\nד. בהינתן שהתלמיד/ית בן, מה ההסתברות שמרכיב/ה משקפיים?",
    diagram: <BasicTableDiagram />,
    pitfalls: [
      { title: "חיתוך לעומת מותנה", text: "P(A \u2229 B) = תא \u00F7 סה\"כ הכולל. P(A|B) = תא \u00F7 סה\"כ השורה/עמודה. שאלות ג\u2019 ו-ד\u2019 שואלות דברים שונים לגמרי -- המכנה משתנה!" },
      { title: "מלאו מימין לשמאל", text: "השלימו קודם את הידוע, אחר כך חסרים מסכומי שורות/עמודות. הפינה הימנית התחתונה = סה\"כ כולל." },
      { title: "שולית ≠ תא בודד", text: "שאלה ב\u2019 שואלת הסתברות שולית (סה\"כ עמודה \u00F7 N). אל תתבלבלו עם תא ספציפי." },
    ],
    goldenPrompt: "אני תלמיד כיתה יא\u2019. בבית ספר 100 תלמידים: 40 בנים ו-60 בנות. חלק מרכיבים משקפיים.\nאני צריך:\n1. למלא טבלת שכיחויות 2\u00D72 שלב אחר שלב\n2. לחשב הסתברות שולית מהטבלה\n3. להבין את ההבדל בין חיתוך למותנה\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א\u2019 -- מילוי הטבלה",
        coaching: "הכנס את הנתונים הידועים ואז השלם חסרים מסכומים",
        prompt: "אני תלמיד כיתה יא\u2019. יש לי 100 תלמידים: 40 בנים ו-60 בנות. חלק מרכיבים משקפיים, חלק לא. תנחה אותי למלא טבלת שכיחויות 2\u00D72 שלב אחר שלב. שאל אותי מאיפה להתחיל. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["טבלה", "שכיחויות", "מלא"],
        keywordHint: "ציין שמדובר במילוי טבלת שכיחויות",
        contextWords: ["טבלה", "שכיחויות", "בנים", "בנות", "משקפיים", "מלא", "שורה", "עמודה"],
      },
      {
        phase: "ב",
        label: "שלב ב\u2019 -- הסתברות שולית",
        coaching: "מצא את סה\"כ העמודה הרלוונטית וחלק ב-N",
        prompt: "אני תלמיד כיתה יא\u2019. מילאתי את הטבלה. עכשיו אני צריך לחשב את ההסתברות הכללית שתלמיד/ית מרכיב/ה משקפיים. תנחה אותי איך למצוא הסתברות שולית מהטבלה -- באיזה מספר בטבלה להשתמש ובמה לחלק. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שולית", "הסתברות", "עמודה"],
        keywordHint: "ציין שמדובר בהסתברות שולית",
        contextWords: ["שולית", "הסתברות", "עמודה", "סה\"כ", "כולל", "N", "משקפיים"],
      },
      {
        phase: "ג",
        label: "שלב ג\u2019 -- חיתוך P(בן \u2229 משקפיים)",
        coaching: "מצא את התא הספציפי וחלק ב-N הכולל",
        prompt: "אני תלמיד כיתה יא\u2019. אני צריך לחשב P(בן \u2229 משקפיים) -- את ההסתברות ששניהם מתקיימים. תנחה אותי: מאיזה תא בטבלה לקחת ובמה לחלק. תסביר למה המכנה הוא N הכולל ולא סה\"כ השורה. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חיתוך", "תא", "כולל"],
        keywordHint: "ציין שמדובר בחיתוך",
        contextWords: ["חיתוך", "תא", "כולל", "N", "בן", "משקפיים", "הסתברות"],
      },
      {
        phase: "ד",
        label: "שלב ד\u2019 -- מותנה P(משקפיים | בן)",
        coaching: "צמצם את מרחב המדגם לשורת הבנים בלבד",
        prompt: "אני תלמיד כיתה יא\u2019. אני צריך לחשב P(משקפיים|בן) -- הסתברות מותנה. תנחה אותי: מה מרחב הדוגמה כשיודעים שהתלמיד בן? תסביר את ההבדל מסעיף ג\u2019. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מותנה", "שורה", "מרחב"],
        keywordHint: "ציין שמדובר בהסתברות מותנה",
        contextWords: ["מותנה", "שורה", "מרחב", "בן", "משקפיים", "מכנה", "הבדל"],
      },
    ],
  },
  {
    id: "medium",
    title: "טבלת שכיחויות -- עובדים ועישון",
    problem: "200 עובדים בחברה. 60% גברים, 40% נשים. 20% מהגברים מעשנים, 10% מהנשים מעשנות. בחרנו עובד/ת באקראי:\n\nא. מלאו טבלת שכיחויות.\nב. מה ההסתברות שהעובד/ת מעשן/ת?\nג. מה ההסתברות שהעובד/ת גם גבר וגם מעשן?\nד. בהינתן שהעובד/ת מעשן/ת, מה ההסתברות שהוא/היא גבר?",
    diagram: <WorkTableDiagram />,
    pitfalls: [
      { title: "20% מהגברים -- לא מ-200", text: "\"20% מהגברים\" פירושו 20% מתוך כמות הגברים, לא 20% מ-200. קראו שוב: 'מ-' מציין את קבוצת הייחוס." },
      { title: "P(מעשן) \u2260 ממוצע פשוט", text: "P(מעשן) הכולל \u2260 ממוצע פשוט של האחוזים. חייבים ממוצע משוקלל לפי גודל הקבוצות -- סה\"כ העמודה חלקי N." },
      { title: "שאלות ג\u2019 ו-ד\u2019 -- הפוכות!", text: "שאלה ג\u2019: P(גבר \u2229 מעשן) = תא \u00F7 N. שאלה ד\u2019: P(גבר|מעשן) = תא \u00F7 סה\"כ עמודת מעשנים. מרחב הדוגמה שונה!" },
    ],
    goldenPrompt: "אני תלמיד כיתה יא\u2019. 200 עובדים: 60% גברים, 20% מהגברים מעשנים, 10% מהנשים מעשנות.\nאני צריך:\n1. להמיר אחוזים לכמויות ולמלא טבלת שכיחויות\n2. לחשב הסתברות שולית כוללת\n3. להבין את ההבדל בין חיתוך למותנה\n\nאל תפתור עבורי -- שאל אותי שאלות מכוונות.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "שלב א\u2019 -- המרת אחוזים לכמויות",
        coaching: "חשב כמה גברים ונשים, ואז כמה מעשנים בכל קבוצה",
        prompt: "אני תלמיד כיתה יא\u2019. יש 200 עובדים: 60% גברים, 20% מהגברים מעשנים, 10% מהנשים מעשנות. תנחה אותי איך להמיר אחוזים לכמויות ולמלא את התאים. תשאל אותי מאיזה נתון להתחיל. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["המר", "אחוזים", "כמויות"],
        keywordHint: "ציין שצריך להמיר אחוזים",
        contextWords: ["המר", "אחוזים", "כמויות", "גברים", "נשים", "מעשנים", "קבוצה", "טבלה"],
      },
      {
        phase: "ב",
        label: "שלב ב\u2019 -- מילוי הטבלה המלאה",
        coaching: "השלם את שאר התאים מסכומי שורות ועמודות",
        prompt: "אני תלמיד כיתה יא\u2019. המרתי את האחוזים לכמויות. עכשיו תנחה אותי להשלים את שאר התאים בטבלה -- איך מוצאים תאים חסרים מסכומים? תשאל אותי אם אני יודע לבדוק שהכול מסתכם נכון. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["טבלה", "סכום", "שורות"],
        keywordHint: "ציין שצריך להשלים מסכומים",
        contextWords: ["טבלה", "מלא", "סכום", "שורות", "עמודות", "בדיקה", "חסרים"],
      },
      {
        phase: "ג",
        label: "שלב ג\u2019 -- P(מעשן/ת) כולל",
        coaching: "מצא את סה\"כ העמודה הרלוונטית",
        prompt: "אני תלמיד כיתה יא\u2019. הטבלה מלאה. עכשיו אני צריך לחשב P(מעשן/ת) -- ההסתברות הכוללת. תנחה אותי: למה אי אפשר פשוט לעשות ממוצע של האחוזים? מאיזה מספר בטבלה לחשב? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שולית", "ממוצע", "משוקלל"],
        keywordHint: "ציין שצריך ממוצע משוקלל",
        contextWords: ["שולית", "הסתברות", "כולל", "ממוצע", "משוקלל", "עמודה", "N"],
      },
      {
        phase: "ד",
        label: "שלב ד\u2019 -- חיתוך ומותנה",
        coaching: "השווה בין P(גבר \u2229 מעשן) לבין P(גבר|מעשן)",
        prompt: "אני תלמיד כיתה יא\u2019. אני צריך לחשב שתי שאלות: (ג\u2019) P(גבר \u2229 מעשן) ו-(ד\u2019) P(גבר|מעשן). תנחה אותי: מה ההבדל בין המכנים? למה התשובות שונות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חיתוך", "מותנה", "הבדל"],
        keywordHint: "ציין את ההבדל בין חיתוך למותנה",
        contextWords: ["חיתוך", "מותנה", "גבר", "מעשן", "הבדל", "מכנה", "מרחב"],
      },
    ],
  },
  {
    id: "advanced",
    title: "טבלת שכיחויות -- הסתברות מורכבת עם נתון עקיף",
    problem: "300 סטודנטים: שנה א\u2019 ושנה ב\u2019. 146 עברו את המבחן. מתוך העוברים, 53.4% הם שנה א\u2019. שיעור ההצלחה של שנה א\u2019 הוא 60% ושל שנה ב\u2019 הוא 40%. בחרנו סטודנט/ית באקראי:\n\nא. מלאו את הטבלה.\nב. מה ההסתברות שהסטודנט/ית משנה א\u2019?\nג. מה ההסתברות שהסטודנט/ית גם משנה א\u2019 וגם עבר/ה את המבחן?\nד. בהינתן שהסטודנט/ית משנה ב\u2019, מה ההסתברות שעבר/ה את המבחן?",
    diagram: <StudentsTableDiagram />,
    pitfalls: [
      { title: "נתון עקיף", text: "\"53.4% מהעוברים הם שנה א\u2019\" = P(שנה א\u2019|עבר). הפכו את הכיוון: חשבו כמה שנה א\u2019 עברו, ומשם גזרו את גודל שנה א\u2019." },
      { title: "שתי דרכים לאותו תא", text: "ניתן לאמת כל תא בשתי דרכים (משיעור ההצלחה ומהאחוז מהעוברים). אם המספרים לא עולים בקנה אחד -- טעיתם." },
      { title: "בלבול בין שיעור הצלחה למותנה", text: "שיעור ההצלחה של שנה ב\u2019 הוא בדיוק P(עבר|שנה ב\u2019). ודאו שאתם מחלקים בגודל הקבוצה הנכונה." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "שלב א\u2019 -- כמה שנה א\u2019 עברו?",
        coaching: "השתמש בנתון העקיף: אחוז מתוך העוברים",
        prompt: "אני תלמיד כיתה יא\u2019. יש 300 סטודנטים. 146 עברו מבחן. 53.4% מהעוברים הם שנה א\u2019. תנחה אותי: איך אני מוצא כמה סטודנטי שנה א\u2019 עברו מהנתון העקיף הזה? תשאל אם אני מבין מה זה 53.4% מהעוברים. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["עקיף", "עוברים", "שנה"],
        keywordHint: "ציין שמדובר בנתון עקיף",
        contextWords: ["עקיף", "עוברים", "שנה", "אחוז", "מתוך", "חיתוך", "הפוך"],
      },
      {
        phase: "ב",
        label: "שלב ב\u2019 -- מצא גודל כל שנה",
        coaching: "השתמש בשיעור ההצלחה כדי לגזור את גודל הקבוצה",
        prompt: "אני תלמיד כיתה יא\u2019. מצאתי כמה סטודנטי שנה א\u2019 עברו. שיעור ההצלחה של שנה א\u2019 הוא 60%. תנחה אותי: אם X עברו מתוך סה\"כ שנה א\u2019, ושיעור ההצלחה 60%, איך אני מוצא את גודל שנה א\u2019? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שיעור", "הצלחה", "גודל"],
        keywordHint: "ציין שצריך להשתמש בשיעור ההצלחה",
        contextWords: ["שיעור", "הצלחה", "גודל", "שנה", "קבוצה", "חלוקה", "סה\"כ"],
      },
      {
        phase: "ג",
        label: "שלב ג\u2019 -- מילוי הטבלה המלאה",
        coaching: "השלם את שאר התאים והשתמש בסכומים לאימות",
        prompt: "אני תלמיד כיתה יא\u2019. יש לי את גודל שנה א\u2019 ושנה ב\u2019 ואת כמות העוברים מכל שנה. תנחה אותי למלא את שאר הטבלה ולוודא שהכול מסתכם ל-300. תשאל אם יש אימות נוסף שאפשר לעשות. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מלא", "טבלה", "אימות"],
        keywordHint: "ציין שצריך למלא ולאמת",
        contextWords: ["מלא", "טבלה", "אימות", "סכום", "שורה", "עמודה", "חסרים"],
      },
      {
        phase: "ד",
        label: "שלב ד\u2019 -- שאלות ב\u2019, ג\u2019, ד\u2019",
        coaching: "שולית, חיתוך ומותנה -- שלוש שאלות שונות",
        prompt: "אני תלמיד כיתה יא\u2019. הטבלה מלאה. אני צריך לענות על שלוש שאלות: (ב\u2019) P(שנה א\u2019) שולית, (ג\u2019) P(שנה א\u2019 \u2229 עבר) חיתוך, (ד\u2019) P(עבר|שנה ב\u2019) מותנה. תנחה אותי: מה המכנה בכל שאלה ולמה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["שולית", "חיתוך", "מותנה"],
        keywordHint: "ציין שלוש סוגי הסתברות",
        contextWords: ["שולית", "חיתוך", "מותנה", "מכנה", "שנה", "עבר", "P"],
      },
    ],
  },
];

// ─── Table Lab ────────────────────────────────────────────────────────────────

function TableLab() {
  const [p, setP] = useState(0.25);
  const boyCount = 40, girlCount = 60;
  const boyTrait  = Math.round(p * boyCount);
  const girlTrait = Math.round(p * girlCount);
  const total = boyTrait + girlTrait;
  const atTarget = Math.abs(p - 0.25) < 0.015;

  const iconR = 6, iconGap = 15, pad = 8;

  const TW = 220, TH = 130;
  const txs = [0, 58, 122, 175, TW];
  const tys = [0, 30, 62, 94, TH];

  const tCell = (txt: string, xi: number, yi: number, highlight2 = false, isNum = false) => {
    const cx = (txs[xi] + txs[xi + 1]) / 2;
    const cy = (tys[yi] + tys[yi + 1]) / 2 + 4;
    return (
      <text key={`t${xi}${yi}`} x={cx} y={cy} textAnchor="middle"
        fill={highlight2 ? "#22c55e" : isNum ? "#334155" : "#64748b"}
        fontSize={isNum ? 11 : 9} fontWeight={isNum ? "700" : highlight2 ? "700" : "400"}>
        {txt}
      </text>
    );
  };

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; סימולטור טבלת שכיחויות</h3>
        {atTarget && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />P=25% -- התאמה לבעיה!</span>}
      </div>

      <div className="flex gap-4 justify-center flex-wrap items-start">
        {/* Icon grid */}
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12 }}>
          <p style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginBottom: 8 }}>100 אנשים -- כהה=ללא תכונה, בהיר=עם תכונה</p>
          <svg width={172} height={172} viewBox="0 0 172 172">
            {Array.from({ length: 100 }, (_, i) => {
              const row = Math.floor(i / 10);
              const col = i % 10;
              const cx = pad + col * iconGap + iconR;
              const cy = pad + row * iconGap + iconR;
              const isBoy   = i < boyCount;
              const hasTrait = isBoy ? i < boyTrait : (i - boyCount) < girlTrait;
              const fill = isBoy ? (hasTrait ? "#3b82f6" : "#bfdbfe") : (hasTrait ? "#f43f5e" : "#fecdd3");
              const stroke = hasTrait ? (isBoy ? "#1d4ed8" : "#e11d48") : "none";
              return <circle key={i} cx={cx} cy={cy} r={iconR - 0.5} fill={fill} stroke={stroke} strokeWidth={hasTrait ? 1 : 0} />;
            })}
          </svg>
          <div className="flex gap-3 mt-2 justify-center" style={{ fontSize: 11, color: "#64748b" }}>
            <span className="flex items-center gap-1"><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#3b82f6" }} />בנים</span>
            <span className="flex items-center gap-1"><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#f43f5e" }} />בנות</span>
          </div>
        </div>

        {/* Live 2x2 table */}
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#64748b", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>טבלה -- מתעדכנת בזמן אמת</p>
          <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`}>
            <rect x={txs[0]} y={tys[0]} width={TW} height={tys[1]-tys[0]} fill="#f1f5f9" />
            <rect x={txs[0]} y={tys[1]} width={txs[1]-txs[0]} height={TH-tys[1]} fill="#f1f5f9" />
            <rect x={txs[3]} y={tys[1]} width={txs[4]-txs[3]} height={TH-tys[1]} fill="#f8fafc" opacity={0.8} />
            <rect x={txs[1]} y={tys[3]} width={txs[3]-txs[1]} height={tys[4]-tys[3]} fill="#f8fafc" opacity={0.8} />
            {txs.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={TH} stroke="rgba(100,116,139,0.2)" strokeWidth={1} />)}
            {tys.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={TW} y2={y} stroke="rgba(100,116,139,0.2)" strokeWidth={1} />)}
            {tCell("עם תכונה", 1, 0)} {tCell("ללא תכונה", 2, 0)} {tCell('סה"כ', 3, 0)}
            {tCell("בנים", 0, 1)} {tCell("בנות", 0, 2)} {tCell('סה"כ', 0, 3)}
            {tCell(String(boyTrait), 1, 1, false, true)} {tCell(String(boyCount - boyTrait), 2, 1, false, true)} {tCell(String(boyCount), 3, 1, false, true)}
            {tCell(String(girlTrait), 1, 2, false, true)} {tCell(String(girlCount - girlTrait), 2, 2, false, true)} {tCell(String(girlCount), 3, 2, false, true)}
            {tCell(String(total), 1, 3, atTarget, true)} {tCell(String(100 - total), 2, 3, false, true)} {tCell("100", 3, 3, false, true)}
          </svg>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>P(תכונה) = <span style={{ fontFamily: "monospace", color: "#2D3436" }}>{(p * 100).toFixed(0)}%</span></span>
          <span style={{ fontFamily: "monospace", fontSize: 13, color: atTarget ? "#22c55e" : "#2D3436", fontWeight: atTarget ? 700 : 400 }}>עם תכונה: {total}/100</span>
        </div>
        <input type="range" min={0.05} max={0.95} step={0.01} value={p}
          onChange={e => setP(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#22c55e" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור ל-25% כדי להתאים לבעיה המקורית</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(תכונה \u2229 בנים)</p>
          <p style={{ fontFamily: "monospace", color: "#3b82f6", fontWeight: 700 }}>{boyTrait}/100 = {boyTrait}%</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(תכונה | בנים)</p>
          <p style={{ fontFamily: "monospace", color: "#f43f5e", fontWeight: 700 }}>{boyTrait}/{boyCount} = {(boyTrait / boyCount * 100).toFixed(0)}%</p>
        </div>
        <div style={{ background: atTarget ? "rgba(220,252,231,0.7)" : "rgba(255,255,255,0.75)", border: atTarget ? "1px solid #86efac" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atTarget ? "#16a34a" : "#94a3b8", marginBottom: 4 }}>P(תכונה) כולל</p>
          <p style={{ fontFamily: "monospace", color: atTarget ? "#15803d" : "#1A1A1A", fontWeight: 700 }}>{total}/100 = {total}%</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#16a34a", fontWeight: 600 }}>P(A \u2229 B)</span> = תא בטבלה \u00F7 סה&quot;כ הכולל &nbsp;|&nbsp; <span style={{ color: "#ea580c", fontWeight: 600 }}>P(A | B)</span> = תא בטבלה \u00F7 סה&quot;כ השורה/עמודה
      </div>

      <LabMessage text="מצוין! ההסתברות תואמת את הבעיה המקורית — P = 25%" type="success" visible={atTarget} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProbabilityTablePage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>טבלאות שכיחויות עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>חיתוך, הסתברות מותנה, וקריאת נתונים מטבלה</p>
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

        <SubtopicProgress subtopicId="probability/table" />

        <FormulaBar />

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

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab */}
        <TableLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="probability/table" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
