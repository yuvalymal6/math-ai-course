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
          textAnchor="middle" fill="#cbd5e1" fontSize={9}>{"\u2014"}</text>
      )))}
    </svg>
  );
}

function BasicTableDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלת שכיחויות -- בנים/בנות × ספורט</p>
      <TableGridSVGLight r1="בנים" r2="בנות" c1="ספורט" c2="לא ספורט" color="#16a34a" />
    </div>
  );
}

function MediumJarsDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>שליפת כדורים -- עם/בלי החזרה</p>
      <svg width="100%" viewBox="0 0 300 130" style={{ maxWidth: "100%" }}>
        {/* Jar A */}
        <rect x={20} y={20} width={110} height={90} rx={14} fill="none" stroke="#ea580c" strokeWidth={1.5} />
        <text x={75} y={16} textAnchor="middle" fill="#ea580c" fontSize={11} fontWeight={700}>שקית א</text>
        {/* Colored circles in jar A */}
        <circle cx={45} cy={50} r={9} fill="#dc2626" opacity={0.7} />
        <circle cx={70} cy={50} r={9} fill="#dc2626" opacity={0.7} />
        <circle cx={95} cy={50} r={9} fill="#2563eb" opacity={0.7} />
        <circle cx={45} cy={76} r={9} fill="#2563eb" opacity={0.7} />
        <circle cx={70} cy={76} r={9} fill="#2563eb" opacity={0.7} />
        <circle cx={95} cy={76} r={9} fill="#dc2626" opacity={0.7} />
        <circle cx={57} cy={98} r={9} fill="#2563eb" opacity={0.7} />
        <circle cx={82} cy={98} r={9} fill="#dc2626" opacity={0.7} />
        {/* Arrow */}
        <line x1={145} y1={65} x2={165} y2={65} stroke="#ea580c" strokeWidth={1.5} markerEnd="url(#arrowOrange)" />
        <defs>
          <marker id="arrowOrange" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="#ea580c" />
          </marker>
        </defs>
        <text x={155} y={56} textAnchor="middle" fill="#ea580c" fontSize={8} fontWeight={600}>?</text>
        {/* Jar B (after draw) */}
        <rect x={175} y={20} width={110} height={90} rx={14} fill="none" stroke="#ea580c" strokeWidth={1.5} strokeDasharray="5,3" />
        <text x={230} y={16} textAnchor="middle" fill="#ea580c" fontSize={11} fontWeight={700}>שקית ב</text>
        <text x={230} y={70} textAnchor="middle" fill="#94a3b8" fontSize={22}>?</text>
      </svg>
    </div>
  );
}

function AdvancedVennDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>דיאגרמת ון -- בדיקת עצמאות</p>
      <svg width="100%" viewBox="0 0 280 160" style={{ maxWidth: "100%" }}>
        {/* Sample space rectangle */}
        <rect x={10} y={10} width={260} height={140} rx={8} fill="none" stroke="#dc2626" strokeWidth={1.5} />
        <text x={25} y={28} fill="#dc2626" fontSize={13} fontWeight={700}>S</text>
        {/* Circle A */}
        <circle cx={110} cy={85} r={48} fill="rgba(220,38,38,0.08)" stroke="#dc2626" strokeWidth={1.5} />
        <text x={78} y={80} fill="#dc2626" fontSize={13} fontWeight={700}>A</text>
        {/* Circle B */}
        <circle cx={170} cy={85} r={48} fill="rgba(220,38,38,0.06)" stroke="#dc2626" strokeWidth={1.2} strokeDasharray="5,3" />
        <text x={198} y={80} fill="#dc2626" fontSize={13} fontWeight={700}>B</text>
        {/* Intersection highlighted */}
        <ellipse cx={140} cy={85} rx={20} ry={35} fill="rgba(220,38,38,0.15)" stroke="none" />
        <text x={140} y={90} textAnchor="middle" fill="#b91c1c" fontSize={18} fontWeight={700}>?</text>
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
        subjectWords={["הסתברות", "מותנית", "עצמאות", "קובייה", "מטבע", "חיתוך"]}
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
  const [activeTab, setActiveTab] = useState<"conditional" | "multiply" | "independent" | "dependent" | null>(null);

  const tabs = [
    { id: "conditional" as const,  label: "הסתברות מותנית", tex: "P(A|B)",                color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "multiply" as const,     label: "כלל הכפל",       tex: "P(A \\cap B)",          color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "independent" as const,  label: "עצמאות",         tex: "P(A|B)=P(A)",           color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "dependent" as const,    label: "תלות",           tex: "P(A|B) \\neq P(A)",     color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Conditional */}
      {activeTab === "conditional" && (
        <motion.div key="conditional" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A|B) = \\frac{P(A \\cap B)}{P(B)}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> ההסתברות ש-A יקרה בהינתן ש-B קרה.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>&quot;בהינתן ש-B&quot; = מצמצמים את מרחב המדגם ל-B בלבד.</li>
                  <li>המכנה הוא <InlineMath>{"P(B)"}</InlineMath>, לא גודל כל מרחב המדגם.</li>
                  <li>שימו לב: <InlineMath>{"P(A|B) \\neq P(B|A)"}</InlineMath> -- הכיוון חשוב!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: מתוך טבלה -- תא ÷ סה&quot;כ שורה/עמודה = הסתברות מותנית.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Multiplication Rule */}
      {activeTab === "multiply" && (
        <motion.div key="multiply" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A \\cap B) = P(A|B) \\cdot P(B)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> ההסתברות שגם A וגם B יקרו.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>קודם B קורה, ואז A קורה בהינתן ש-B קרה.</li>
                  <li>אם עצמאיים: <InlineMath>{"P(A \\cap B) = P(A) \\cdot P(B)"}</InlineMath>.</li>
                  <li>שימושי בשליפות בזו אחר זו (עם או בלי החזרה).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: P(אדום ברצף) = P(אדום&#8321;) × P(אדום&#8322;|אדום&#8321;).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Independence */}
      {activeTab === "independent" && (
        <motion.div key="independent" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A|B) = P(A) \\Leftrightarrow \\text{A,B עצמאים}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> אם ידיעת B לא משנה את ההסתברות של A.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>עצמאות = ההסתברות לא מושפעת מהידיעה.</li>
                  <li>בדיקה שקולה: <InlineMath>{"P(A \\cap B) = P(A) \\cdot P(B)"}</InlineMath>.</li>
                  <li>שליפה עם החזרה = עצמאיים (ההרכב לא משתנה).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: עצמאיים ≠ זרים! אירועים זרים הם תמיד תלויים (אם אחד קרה, השני לא).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Dependence */}
      {activeTab === "dependent" && (
        <motion.div key="dependent" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A|B) \\neq P(A) \\Rightarrow \\text{תלויים}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> ידיעת B משנה את ההסתברות של A.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>אם <InlineMath>{"P(A|B) \\neq P(A)"}</InlineMath> -- האירועים תלויים.</li>
                  <li>שליפה בלי החזרה = תלויים (ההרכב משתנה).</li>
                  <li>בדיקה: חשבו את שני הצדדים והשוו.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; טיפ: בשליפה בלי החזרה, אחרי שהוצאנו כדור -- מספר הכדורים ירד ב-1.
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
    title: "הסתברות מותנית מטבלה",
    problem: "בכיתה יש 40 תלמידים. הנתונים על פעילות ספורט:\nבנים שעושים ספורט: 12, בנים שלא עושים ספורט: 8.\nבנות שעושות ספורט: 10, בנות שלא עושות ספורט: 10.\n\nא. מהי ההסתברות שתלמיד שנבחר באקראי עושה ספורט?\nב. בהינתן שנבחר בן -- מהי ההסתברות שהוא עושה ספורט?\nג. בהינתן שנבחר תלמיד שעושה ספורט -- מהי ההסתברות שזו בת?",
    diagram: <BasicTableDiagram />,
    pitfalls: [
      { title: "P(ספורט|בן) \u2260 P(בן|ספורט)", text: "שימו לב מה הנתון ומה מבקשים! הכיוון של ההתניה משנה את התשובה לגמרי." },
      { title: "בסעיף ב: המכנה הוא סה\"כ בנים", text: "המכנה הוא סה\"כ בנים (20), לא סה\"כ תלמידים (40) -- כי ההתניה מצמצמת את מרחב המדגם." },
      { title: "בסעיף ג: המכנה הוא סה\"כ עושי ספורט", text: "המכנה הוא סה\"כ עושי ספורט (22), לא סה\"כ בנות (20) -- ההתניה היא על ספורט." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבכיתה יש 40 תלמידים. בנים שעושים ספורט: 12, בנים שלא: 8. בנות שעושות ספורט: 10, בנות שלא: 10.\nאני צריך:\n1. לחשב P(ספורט)\n2. לחשב P(ספורט|בן)\n3. לחשב P(בת|ספורט)\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- P(ספורט)",
        coaching: "חשבו כמה תלמידים בסה\"כ עושים ספורט",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבכיתה 40 תלמידים. בנים ספורט: 12, בנים לא: 8, בנות ספורט: 10, בנות לא: 10. תנחה אותי לחשב את ההסתברות שתלמיד שנבחר באקראי עושה ספורט. שאל: כמה בסה\"כ עושים ספורט? מה הנוסחה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["ספורט", "הסתברות", "תלמידים"],
        keywordHint: "ציין שמדובר בהסתברות לספורט",
        contextWords: ["מותנית", "טבלה", "בהינתן", "ספורט", "בנים", "הסתברות"],
        stationWords: ["מותנית", "טבלה", "הסתברות"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- P(ספורט|בן)",
        coaching: "מהו המכנה כשנתון שנבחר בן?",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבכיתה 40 תלמידים. בנים ספורט: 12, בנים לא: 8. בהינתן שנבחר בן -- מהי ההסתברות שהוא עושה ספורט? תנחה אותי: מה המכנה כשנתון שנבחר בן? למה לא 40? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["בהינתן", "בן", "מכנה"],
        keywordHint: "ציין שמדובר בהסתברות מותנית בהינתן שנבחר בן",
        contextWords: ["מותנית", "טבלה", "בהינתן", "ספורט", "בנים", "הסתברות"],
        stationWords: ["מותנית", "טבלה", "הסתברות"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- P(בת|ספורט)",
        coaching: "מהו המכנה כשנתון שהתלמיד עושה ספורט?",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבכיתה 40 תלמידים. בנות ספורט: 10, סה\"כ ספורט: 22. בהינתן שנבחר תלמיד שעושה ספורט -- מהי ההסתברות שזו בת? תנחה אותי: מה המכנה? למה לא 20? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["ספורט", "בת", "מותנית"],
        keywordHint: "ציין שמדובר בהסתברות מותנית בהינתן ספורט",
        contextWords: ["מותנית", "טבלה", "בהינתן", "ספורט", "בנים", "הסתברות"],
        stationWords: ["מותנית", "טבלה", "הסתברות"],
      },
    ],
  },
  {
    id: "medium",
    title: "שליפת כדורים -- עם ובלי החזרה",
    problem: "בשקית יש 4 כדורים אדומים ו-6 כדורים כחולים. שולפים כדור, רושמים את צבעו, ואז שולפים כדור שני.\n\nא. אם השליפה עם החזרה -- מהי P(אדום בשנייה | אדום בראשונה)?\nב. אם השליפה בלי החזרה -- מהי P(אדום בשנייה | אדום בראשונה)?\nג. האם במקרה של עם החזרה, השליפות עצמאיות? הסבירו.\nד. מהי ההסתברות לשלוף שני כדורים אדומים ברצף (בלי החזרה)?",
    diagram: <MediumJarsDiagram />,
    pitfalls: [
      { title: "עם החזרה = ההרכב לא משתנה", text: "עם החזרה: P(אדום\u2082|אדום\u2081) = 4/10 = P(אדום) -- עצמאיים כי ההרכב זהה." },
      { title: "בלי החזרה = ההרכב משתנה", text: "בלי החזרה: אחרי שליפת אדום נשארו 3 אדומים מתוך 9 -- P = 3/9." },
      { title: "כלל הכפל לשני אדומים ברצף", text: "P(שני אדומים ברצף) = P(אדום\u2081) \u00D7 P(אדום\u2082|אדום\u2081) = 4/10 \u00D7 3/9." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבשקית 4 כדורים אדומים ו-6 כחולים. שולפים שני כדורים.\nאני צריך:\n1. P(אדום\u2082|אדום\u2081) עם החזרה\n2. P(אדום\u2082|אדום\u2081) בלי החזרה\n3. לבדוק עצמאות\n4. P(שני אדומים ברצף בלי החזרה)\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- עם החזרה",
        coaching: "מה קורה להרכב השקית כשמחזירים?",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבשקית 4 אדומים ו-6 כחולים. שליפה עם החזרה. תנחה אותי לחשב P(אדום בשנייה | אדום בראשונה). שאל: מה קורה להרכב אחרי שמחזירים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["החזרה", "הרכב", "אדום"],
        keywordHint: "ציין שמדובר בשליפה עם החזרה ומה קורה להרכב",
        contextWords: ["החזרה", "שליפה", "עצמאיים", "כדור", "אדום", "מותנית"],
        stationWords: ["שליפה", "החזרה", "מותנית"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- בלי החזרה",
        coaching: "כמה כדורים נשארו אחרי השליפה הראשונה?",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבשקית 4 אדומים ו-6 כחולים. שליפה בלי החזרה, ידוע שהראשון אדום. תנחה אותי לחשב P(אדום בשנייה | אדום בראשונה). שאל: כמה כדורים נשארו? כמה אדומים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["נשארו", "כדורים", "בלי"],
        keywordHint: "ציין שמדובר בשליפה בלי החזרה וכמה נשארו",
        contextWords: ["החזרה", "שליפה", "עצמאיים", "כדור", "אדום", "מותנית"],
        stationWords: ["שליפה", "החזרה", "מותנית"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- בדיקת עצמאות",
        coaching: "האם ההסתברות השתנתה בגלל הידיעה?",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבשקית 4 אדומים ו-6 כחולים. שליפה עם החזרה. תנחה אותי לבדוק אם השליפות עצמאיות. שאל: מה הגדרת עצמאות? האם P(אדום\u2082|אדום\u2081) = P(אדום)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["עצמאיים", "שווה", "הסתברות"],
        keywordHint: "ציין שצריך לבדוק עצמאות",
        contextWords: ["החזרה", "שליפה", "עצמאיים", "כדור", "אדום", "מותנית"],
        stationWords: ["שליפה", "החזרה", "מותנית"],
      },
      {
        phase: "\u05D3",
        label: "סעיף ד\u2019 -- שני אדומים ברצף",
        coaching: "השתמשו בכלל הכפל",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nבשקית 4 אדומים ו-6 כחולים. שליפה בלי החזרה. תנחה אותי לחשב P(שני אדומים ברצף). שאל: מה כלל הכפל? איך מחשבים P(אדום\u2081 ואדום\u2082)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["כפל", "ברצף", "מותנית"],
        keywordHint: "ציין שצריך כלל כפל להסתברות ברצף",
        contextWords: ["החזרה", "שליפה", "עצמאיים", "כדור", "אדום", "מותנית"],
        stationWords: ["שליפה", "החזרה", "מותנית"],
      },
    ],
  },
  {
    id: "advanced",
    title: "עצמאות -- קובייה ומטבע",
    problem: "הטילו קובייה הוגנת ומטבע הוגן.\nA = קיבלנו 6 בקובייה, B = קיבלנו עץ במטבע.\n\nא. חשבו את P(A), P(B), P(A\u2229B).\nב. האם A ו-B אירועים עצמאיים? הוכיחו באמצעות הנוסחה.\nג. C = סכום הקובייה והמטבע (עץ=0, פלי=1) גדול מ-5. חשבו P(C).\nד. האם A ו-C עצמאיים? בדקו.",
    diagram: <AdvancedVennDiagram />,
    pitfalls: [
      { title: "בדיקת עצמאות = השוואת מכפלה לחיתוך", text: "A ו-B עצמאיים אם P(A\u2229B) = P(A)\u00B7P(B) -- חשבו את שני הצדדים ובדקו שוויון." },
      { title: "מרחב המדגם = 12 תוצאות", text: "מרחב המדגם של קובייה+מטבע: 12 תוצאות (6\u00D72) -- רשמו את כולן אם צריך." },
      { title: "C: ספרו בזהירות", text: "C: סכום>5 אפשרי רק אם קובייה=5+פלי, קובייה=6+עץ, או קובייה=6+פלי -- 3 תוצאות מ-12." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "\u05D0",
        label: "סעיף א\u2019 -- P(A), P(B), P(A\u2229B)",
        coaching: "חשבו כל הסתברות בנפרד ואז את החיתוך",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nהטילו קובייה הוגנת ומטבע הוגן. A = קיבלנו 6, B = עץ. תנחה אותי לחשב P(A), P(B) ו-P(A\u2229B). שאל: מה גודל מרחב המדגם? מה A\u2229B? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["קובייה", "מטבע", "חיתוך"],
        keywordHint: "ציין שמדובר בחיתוך של קובייה ומטבע",
        contextWords: ["עצמאות", "קובייה", "מטבע", "חיתוך", "מכפלה", "הוכחה"],
        stationWords: ["עצמאות", "קובייה", "מטבע"],
      },
      {
        phase: "\u05D1",
        label: "סעיף ב\u2019 -- הוכחת עצמאות",
        coaching: "השוו P(A\u2229B) ל-P(A)\u00B7P(B)",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nA = 6 בקובייה, B = עץ במטבע. חישבתי P(A), P(B), P(A\u2229B). תנחה אותי להוכיח עצמאות. שאל: מה הנוסחה לבדיקת עצמאות? האם P(A\u2229B) = P(A)\u00B7P(B)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["עצמאות", "מכפלה", "שווה"],
        keywordHint: "ציין שצריך לבדוק אם המכפלה שווה לחיתוך",
        contextWords: ["עצמאות", "קובייה", "מטבע", "חיתוך", "מכפלה", "הוכחה"],
        stationWords: ["עצמאות", "קובייה", "מטבע"],
      },
      {
        phase: "\u05D2",
        label: "סעיף ג\u2019 -- P(C) סכום גדול מ-5",
        coaching: "רשמו את כל התוצאות שמקיימות סכום > 5",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nקובייה ומטבע (עץ=0, פלי=1). C = סכום>5. תנחה אותי לחשב P(C). שאל: מה כל הצירופים שנותנים סכום גדול מ-5? כמה תוצאות יש במרחב? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["סכום", "תוצאות", "גדול"],
        keywordHint: "ציין שמדובר בסכום קובייה ומטבע",
        contextWords: ["עצמאות", "קובייה", "מטבע", "חיתוך", "מכפלה", "הוכחה"],
        stationWords: ["עצמאות", "קובייה", "מטבע"],
      },
      {
        phase: "\u05D3",
        label: "סעיף ד\u2019 -- האם A ו-C עצמאיים?",
        coaching: "חשבו P(A\u2229C) והשוו ל-P(A)\u00B7P(C)",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה י 3 יחידות.\nA = 6 בקובייה, C = סכום>5. חישבתי P(A) ו-P(C). תנחה אותי לבדוק אם A ו-C עצמאיים. שאל: מה P(A\u2229C)? האם P(A\u2229C) = P(A)\u00B7P(C)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["עצמאיים", "חיתוך", "בדיקה"],
        keywordHint: "ציין שצריך לבדוק עצמאות A ו-C",
        contextWords: ["עצמאות", "קובייה", "מטבע", "חיתוך", "מכפלה", "הוכחה"],
        stationWords: ["עצמאות", "קובייה", "מטבע"],
      },
    ],
  },
];

// ─── Conditional Probability Lab ─────────────────────────────────────────────

function ConditionalLab() {
  const [red, setRed]   = useState(4);
  const [blue, setBlue] = useState(6);
  const [withReturn, setWithReturn] = useState(true);
  const total = red + blue;

  const pR1 = red / total;
  // P(R2 | R1)
  const pR2givenR1 = withReturn ? red / total : (red - 1) / (total - 1);
  // P(R1 ∩ R2)
  const pBothRed = pR1 * pR2givenR1;
  // Independence check
  const isIndependent = withReturn; // with return always independent
  const pR2 = red / total; // marginal

  // Generate ball positions in jar
  const balls1: { cx: number; cy: number; color: string }[] = [];
  const cols = 5;
  const ballR = 9;
  const gapX = 24;
  const gapY = 24;
  const startX = 32;
  const startY = 28;

  for (let i = 0; i < red; i++) {
    const row = Math.floor(balls1.length / cols);
    const col = balls1.length % cols;
    balls1.push({ cx: startX + col * gapX, cy: startY + row * gapY, color: "#dc2626" });
  }
  for (let i = 0; i < blue; i++) {
    const row = Math.floor(balls1.length / cols);
    const col = balls1.length % cols;
    balls1.push({ cx: startX + col * gapX, cy: startY + row * gapY, color: "#2563eb" });
  }

  // Second jar (after drawing red)
  const balls2: { cx: number; cy: number; color: string }[] = [];
  const red2 = withReturn ? red : red - 1;
  const blue2 = blue;
  const total2 = red2 + blue2;
  const startX2 = 190;

  for (let i = 0; i < red2; i++) {
    const row = Math.floor(balls2.length / cols);
    const col = balls2.length % cols;
    balls2.push({ cx: startX2 + col * gapX, cy: startY + row * gapY, color: "#dc2626" });
  }
  for (let i = 0; i < blue2; i++) {
    const row = Math.floor(balls2.length / cols);
    const col = balls2.length % cols;
    balls2.push({ cx: startX2 + col * gapX, cy: startY + row * gapY, color: "#2563eb" });
  }

  const maxRows = Math.ceil(total / cols);
  const svgH = startY + maxRows * gapY + 20;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; מעבדת הסתברות מותנית</h3>
        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />סה&quot;כ: {total} כדורים</span>
      </div>

      {/* SVG: Two jars side by side */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 340 ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Jar 1 */}
          <rect x={12} y={10} width={140} height={svgH - 18} rx={14} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
          <text x={82} y={svgH - 2} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight={600}>לפני שליפה</text>
          {balls1.map((b, i) => (
            <g key={`a${i}`}>
              <circle cx={b.cx} cy={b.cy} r={ballR} fill={b.color} opacity={0.85} />
              <circle cx={b.cx - 2} cy={b.cy - 2} r={2} fill="rgba(255,255,255,0.5)" />
            </g>
          ))}
          {/* Arrow */}
          <line x1={158} y1={svgH / 2} x2={178} y2={svgH / 2} stroke="#ea580c" strokeWidth={1.5} markerEnd="url(#labArrow)" />
          <defs>
            <marker id="labArrow" markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#ea580c" />
            </marker>
          </defs>
          <text x={168} y={svgH / 2 - 8} textAnchor="middle" fill="#ea580c" fontSize={8} fontWeight={600}>{withReturn ? "עם" : "בלי"}</text>
          {/* Jar 2 */}
          <rect x={185} y={10} width={140} height={svgH - 18} rx={14} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" />
          <text x={255} y={svgH - 2} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight={600}>אחרי שליפת אדום</text>
          {balls2.map((b, i) => (
            <g key={`b${i}`}>
              <circle cx={b.cx} cy={b.cy} r={ballR} fill={b.color} opacity={0.85} />
              <circle cx={b.cx - 2} cy={b.cy - 2} r={2} fill="rgba(255,255,255,0.5)" />
            </g>
          ))}
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>כדורים אדומים</span>
            <span style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{red}</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={red}
            onChange={e => setRed(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>כדורים כחולים</span>
            <span style={{ fontFamily: "monospace", color: "#2563eb", fontWeight: 700 }}>{blue}</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={blue}
            onChange={e => setBlue(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#2563eb" }} />
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: "1.25rem" }}>
        <button
          onClick={() => setWithReturn(true)}
          style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: withReturn ? "2px solid #16a34a" : "1px solid rgba(60,54,42,0.15)", background: withReturn ? "rgba(22,163,74,0.1)" : "rgba(255,255,255,0.5)", color: withReturn ? "#16a34a" : "#6B7280", transition: "all 0.2s" }}
        >
          עם החזרה
        </button>
        <button
          onClick={() => setWithReturn(false)}
          style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: !withReturn ? "2px solid #ea580c" : "1px solid rgba(60,54,42,0.15)", background: !withReturn ? "rgba(234,88,12,0.1)" : "rgba(255,255,255,0.5)", color: !withReturn ? "#ea580c" : "#6B7280", transition: "all 0.2s" }}
        >
          בלי החזרה
        </button>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(R&#8321;)</p>
          <p style={{ fontFamily: "monospace", color: "#dc2626", fontWeight: 700 }}>{pR1.toFixed(3)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(R&#8322;|R&#8321;)</p>
          <p style={{ fontFamily: "monospace", color: "#ea580c", fontWeight: 700 }}>{pR2givenR1.toFixed(3)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(R&#8321;&#8745;R&#8322;)</p>
          <p style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{pBothRed.toFixed(4)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>עצמאיים?</p>
          <p style={{ fontFamily: "monospace", color: isIndependent ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{isIndependent ? "כן" : "לא"}</p>
        </div>
      </div>

      {/* Explanation row */}
      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        {withReturn ? (
          <>
            <span style={{ color: "#16a34a", fontWeight: 600 }}>P(R&#8322;|R&#8321;) = {red}/{total} = P(R&#8322;)</span> &nbsp;&rarr;&nbsp;
            <span style={{ fontWeight: 600 }}>עצמאיים! ההרכב לא השתנה.</span>
          </>
        ) : (
          <>
            <span style={{ color: "#ea580c", fontWeight: 600 }}>P(R&#8322;|R&#8321;) = {Math.max(red - 1, 0)}/{total - 1} &ne; {red}/{total} = P(R&#8322;)</span> &nbsp;&rarr;&nbsp;
            <span style={{ fontWeight: 600 }}>תלויים! ההרכב השתנה.</span>
          </>
        )}
      </div>

      <LabMessage text="שנו את מספר הכדורים ובדקו תלות ועצמאות" type="success" visible={red === 4 && blue === 6} />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConditionalProbabilityPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>הסתברות מותנית עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>P(A|B), כלל הכפל, עצמאות ותלות</p>
          </div>
          <Link
            href="/3u/topic/grade10/probability"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(148,163,184,0.1)"; }}
          >
            <span style={{ fontSize: 16 }}>{"\u2190"}</span>
            חזרה
          </Link>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}
      >

        <SubtopicProgress subtopicId="3u/grade10/probability/conditional" />

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
        <ConditionalLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/probability/conditional" level={selectedLevel} />
        </div>

      </motion.div>
    </main>
  );
}
