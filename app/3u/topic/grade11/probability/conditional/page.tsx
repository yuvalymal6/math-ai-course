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

function BasicTableDiagram() {
  const W = 320, H = 128;
  const xs = [0, 76, 160, 240, W];
  const ys = [0, 32, 64, 96, H];

  const cellText = (text: string, xi: number, yi: number, bold = false) => {
    const cx = (xs[xi] + xs[xi + 1]) / 2;
    const cy = (ys[yi] + ys[yi + 1]) / 2 + 4;
    return (
      <text key={`${xi}-${yi}`} x={cx} y={cy} textAnchor="middle"
        fill={bold ? "#16a34a" : "#94a3b8"} fontSize={bold ? 10 : 9} fontWeight={bold ? "700" : "400"}>
        {text}
      </text>
    );
  };

  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>טבלת שכיחויות -- בנים/בנות × משקפיים</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
        {[0,1,2,3].map(xi => <rect key={`hc${xi}`} x={xs[xi]} y={ys[0]} width={xs[xi+1]-xs[xi]} height={ys[1]-ys[0]} fill="#f1f5f9" />)}
        <rect x={xs[0]} y={ys[1]} width={xs[1]-xs[0]} height={ys[2]-ys[1]} fill="#f1f5f9" />
        <rect x={xs[0]} y={ys[2]} width={xs[1]-xs[0]} height={ys[3]-ys[2]} fill="#f1f5f9" />
        <rect x={xs[0]} y={ys[3]} width={xs[1]-xs[0]} height={ys[4]-ys[3]} fill="#f1f5f9" />
        <rect x={xs[3]} y={ys[1]} width={xs[4]-xs[3]} height={ys[4]-ys[1]} fill="#f8fafc" opacity={0.8} />
        <rect x={xs[1]} y={ys[3]} width={xs[3]-xs[1]} height={ys[4]-ys[3]} fill="#f8fafc" opacity={0.8} />
        {xs.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="#cbd5e1" strokeWidth={i === 0 || i === xs.length-1 ? 1.5 : 1} />)}
        {ys.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="#cbd5e1" strokeWidth={i === 0 || i === ys.length-1 ? 1.5 : 1} />)}
        {cellText("משקפיים", 1, 0, true)}
        {cellText("ללא משקפיים", 2, 0, true)}
        {cellText('סה"כ', 3, 0, true)}
        {cellText("בנים", 0, 1, true)}
        {cellText("בנות", 0, 2, true)}
        {cellText('סה"כ', 0, 3, true)}
        {[1,2,3].flatMap(xi => [1,2,3].map(yi => (
          <text key={`d${xi}${yi}`} x={(xs[xi]+xs[xi+1])/2} y={(ys[yi]+ys[yi+1])/2+4}
            textAnchor="middle" fill="#cbd5e1" fontSize={9}>—</text>
        )))}
      </svg>
    </div>
  );
}

function MediumTreeDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>עץ הסתברות -- קווי ייצור × פגמים</p>
      <svg width="100%" viewBox="0 0 300 180" style={{ maxWidth: "100%" }}>
        {/* Root */}
        <circle cx={40} cy={90} r={5} fill="#ea580c" opacity={0.6} />
        {/* First split */}
        <line x1={45} y1={90} x2={120} y2={45} stroke="#ea580c" strokeWidth={2} opacity={0.7} />
        <line x1={45} y1={90} x2={120} y2={135} stroke="#ea580c" strokeWidth={2} opacity={0.7} />
        {/* Branch labels - first level */}
        <text x={75} y={58} textAnchor="middle" fill="#ea580c" fontSize={11} fontWeight={700}>{"\u05D0\u05F3"}</text>
        <text x={75} y={125} textAnchor="middle" fill="#ea580c" fontSize={11} fontWeight={700}>{"\u05D1\u05F3"}</text>
        {/* Second split from A */}
        <circle cx={120} cy={45} r={4} fill="#ea580c" opacity={0.5} />
        <line x1={124} y1={45} x2={210} y2={20} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
        <line x1={124} y1={45} x2={210} y2={70} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
        <text x={220} y={24} fill="#64748b" fontSize={10} fontWeight={600}>פגום</text>
        <text x={220} y={74} fill="#64748b" fontSize={10} fontWeight={600}>תקין</text>
        {/* Second split from B */}
        <circle cx={120} cy={135} r={4} fill="#ea580c" opacity={0.5} />
        <line x1={124} y1={135} x2={210} y2={110} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
        <line x1={124} y1={135} x2={210} y2={160} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4,3" />
        <text x={220} y={114} fill="#64748b" fontSize={10} fontWeight={600}>פגום</text>
        <text x={220} y={164} fill="#64748b" fontSize={10} fontWeight={600}>תקין</text>
        {/* Probability placeholders */}
        <text x={168} y={26} textAnchor="middle" fill="#cbd5e1" fontSize={9}>P=?</text>
        <text x={168} y={68} textAnchor="middle" fill="#cbd5e1" fontSize={9}>P=?</text>
        <text x={168} y={118} textAnchor="middle" fill="#cbd5e1" fontSize={9}>P=?</text>
        <text x={168} y={158} textAnchor="middle" fill="#cbd5e1" fontSize={9}>P=?</text>
      </svg>
    </div>
  );
}

function AdvancedVennDiagram() {
  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>דיאגרמת ון -- בדיקה רפואית</p>
      <svg width="100%" viewBox="0 0 300 180" style={{ maxWidth: "100%" }}>
        {/* Sample space rectangle */}
        <rect x={10} y={10} width={280} height={160} rx={8} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
        <text x={280} y={28} textAnchor="end" fill="#94a3b8" fontSize={11} fontWeight={600}>{"\u03A9"}</text>
        {/* Circle A - sick */}
        <circle cx={120} cy={95} r={55} fill="rgba(220,38,38,0.08)" stroke="#dc2626" strokeWidth={2} />
        <text x={90} y={90} textAnchor="middle" fill="#dc2626" fontSize={13} fontWeight={700}>חולה</text>
        {/* Circle B - positive */}
        <circle cx={180} cy={95} r={55} fill="rgba(220,38,38,0.06)" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5,3" />
        <text x={210} y={90} textAnchor="middle" fill="#dc2626" fontSize={13} fontWeight={700} opacity={0.7}>חיובי</text>
        {/* Intersection highlight */}
        <ellipse cx={150} cy={95} rx={20} ry={40} fill="rgba(220,38,38,0.15)" stroke="none" />
        <text x={150} y={100} textAnchor="middle" fill="#dc2626" fontSize={9} fontWeight={600}>A{"\u2229"}B</text>
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
        subjectWords={["הסתברות", "מותנית", "בייס", "חיובי", "חולה", "בדיקה"]}
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
  const [activeTab, setActiveTab] = useState<"conditional" | "bayes" | "intersection" | "total" | null>(null);

  const tabs = [
    { id: "conditional" as const, label: "הסתברות מותנית", tex: "P(A|B)",                        color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "bayes" as const,       label: "נוסחת בייס",     tex: "P(B|A)",                        color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "intersection" as const,label: "חיתוך",          tex: "P(A \\cap B)",                  color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "total" as const,       label: "הסתברות שלמה",   tex: "P(A)",                          color: "#7c3aed", borderColor: "rgba(124,58,237,0.35)" },
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

      {/* Expanded: Conditional Probability */}
      {activeTab === "conditional" && (
        <motion.div key="conditional" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A|B) = \\frac{P(A \\cap B)}{P(B)}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> הסתברות מותנית -- ההסתברות ש-A יתקיים, בהינתן שידוע ש-B התקיים.
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>המכנה הוא <InlineMath>{"P(B)"}</InlineMath> -- מרחב הדוגמה מצטמצם ל-B בלבד.</li>
                  <li>המונה הוא <InlineMath>{"P(A \\cap B)"}</InlineMath> -- החלק ב-B שגם ב-A.</li>
                  <li>שימו לב: <InlineMath>{"P(A|B) \\neq P(B|A)"}</InlineMath> -- הכיוון חשוב!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; דוגמה: בטבלה -- תא &divide; סה&quot;כ שורה/עמודה = הסתברות מותנית.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Bayes */}
      {activeTab === "bayes" && (
        <motion.div key="bayes" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(234,88,12,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(B|A) = \\frac{P(A|B) \\cdot P(B)}{P(A)}"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> נוסחת בייס מאפשרת &quot;להפוך&quot; את כיוון ההתניה:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>ידוע <InlineMath>{"P(A|B)"}</InlineMath> ורוצים <InlineMath>{"P(B|A)"}</InlineMath>.</li>
                  <li>המכנה <InlineMath>{"P(A)"}</InlineMath> מחושב בדרך כלל עם נוסחת ההסתברות השלמה.</li>
                  <li>המפתח: כופלים את ההסתברות המותנית בהסתברות האפריורית <InlineMath>{"P(B)"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#c2410c", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; שימוש קלאסי: בדיקה רפואית חיובית &rarr; מהי ההסתברות שהאדם באמת חולה?
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Intersection */}
      {activeTab === "intersection" && (
        <motion.div key="intersection" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A \\cap B) = P(A|B) \\cdot P(B)"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> כלל הכפל -- ההסתברות ששני אירועים מתקיימים יחד:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>נובע ישירות מהגדרת ההסתברות המותנית.</li>
                  <li>שימושי בעץ הסתברות: מכפילים את ההסתברויות לאורך ענף.</li>
                  <li>אם A ו-B בלתי תלויים: <InlineMath>{"P(A \\cap B) = P(A) \\cdot P(B)"}</InlineMath>.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#dc2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; בעץ: מכפילים הסתברויות לאורך הענף. בטבלה: תא &divide; סה&quot;כ כולל.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Total Probability */}
      {activeTab === "total" && (
        <motion.div key="total" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <DisplayMath>{"P(A) = P(A|B) \\cdot P(B) + P(A|\\bar{B}) \\cdot P(\\bar{B})"}</DisplayMath>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#2D3436", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>הסבר:</strong> נוסחת ההסתברות השלמה -- &quot;פירוק&quot; לפי תרחישים:
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מפרקים את <InlineMath>{"P(A)"}</InlineMath> לשני מסלולים: דרך B ודרך <InlineMath>{"\\bar{B}"}</InlineMath>.</li>
                  <li>כל מסלול = הסתברות מותנית &times; הסתברות אפריורית.</li>
                  <li>זהו בדיוק המכנה בנוסחת בייס!</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#7c3aed", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                &#128161; בעץ: סוכמים את כל הענפים שמובילים לאירוע A (ענף דרך B + ענף דרך <InlineMath>{"\\bar{B}"}</InlineMath>).
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
    problem: "בכיתה יש 30 תלמידים. 18 בנים ו-12 בנות. מתוך הבנים, 6 מרכיבים משקפיים. מתוך הבנות, 4 מרכיבות משקפיים.\n\nא. מהי ההסתברות שתלמיד שנבחר באקראי הוא בן?\nב. מהי ההסתברות שתלמיד שנבחר באקראי מרכיב משקפיים?\nג. בהינתן שנבחר תלמיד שמרכיב משקפיים -- מהי ההסתברות שהוא בן?",
    diagram: <BasicTableDiagram />,
    pitfalls: [
      { title: "P(בן|משקפיים) זה לא P(משקפיים|בן)", text: "שימו לב למה נתון ומה מבקשים -- הכיוון של ההתניה קריטי! המכנה משתנה." },
      { title: "את הטבלה צריך למלא עם סה\"כ בכל שורה ועמודה", text: "אל תשכחו -- השלימו סכומים חלקיים לפני שמתחילים לחשב הסתברויות." },
      { title: "בסעיף ג -- המכנה הוא סה\"כ מרכיבי משקפיים", text: "המכנה הוא 10 (כל מרכיבי המשקפיים), לא 30 (סה\"כ תלמידים). זו ההתניה!" },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבכיתה 30 תלמידים: 18 בנים ו-12 בנות. מתוך הבנים 6 מרכיבים משקפיים, מתוך הבנות 4 מרכיבות משקפיים.\nאני צריך:\n1. לחשב P(בן)\n2. לחשב P(משקפיים)\n3. לחשב P(בן|משקפיים)\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- P(בן)",
        coaching: "חשב הסתברות שולית מהטבלה",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבכיתה 30 תלמידים: 18 בנים ו-12 בנות. תנחה אותי לחשב את ההסתברות שתלמיד שנבחר באקראי הוא בן. שאל אותי: מה המכנה ומה המונה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["הסתברות", "בן", "שולית"],
        keywordHint: "ציין שמדובר בהסתברות שולית",
        contextWords: ["הסתברות", "מותנית", "טבלה", "בהינתן", "משקפיים", "בנים"],
        stationWords: ["הסתברות", "מותנית", "טבלה"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- P(משקפיים)",
        coaching: "סכום כל מרכיבי המשקפיים חלקי סה\"כ",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבכיתה 30 תלמידים: 6 בנים עם משקפיים ו-4 בנות עם משקפיים. תנחה אותי לחשב P(משקפיים). שאל: כמה סה\"כ מרכיבים משקפיים? במה מחלקים? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["משקפיים", "סה\"כ", "חלוקה"],
        keywordHint: "ציין שצריך לחשב סה\"כ עם משקפיים",
        contextWords: ["הסתברות", "מותנית", "טבלה", "בהינתן", "משקפיים", "בנים"],
        stationWords: ["הסתברות", "מותנית", "טבלה"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- P(בן|משקפיים)",
        coaching: "צמצום מרחב הדוגמה למרכיבי משקפיים",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nמתוך 30 תלמידים, 10 מרכיבים משקפיים (6 בנים, 4 בנות). תנחה אותי לחשב P(בן|משקפיים). שאל: מה מרחב הדוגמה כשידוע שהתלמיד מרכיב משקפיים? למה המכנה הוא 10 ולא 30? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["מותנית", "מרחב", "בהינתן"],
        keywordHint: "ציין שמדובר בהסתברות מותנית",
        contextWords: ["הסתברות", "מותנית", "טבלה", "בהינתן", "משקפיים", "בנים"],
        stationWords: ["הסתברות", "מותנית", "טבלה"],
      },
    ],
  },
  {
    id: "medium",
    title: "הסתברות מותנית עם עץ -- קווי ייצור",
    problem: "במפעל יש שני קווי ייצור. קו א\u2019 מייצר 60% מהמוצרים וקו ב\u2019 מייצר 40%. שיעור הפגמים בקו א\u2019 הוא 5% ובקו ב\u2019 הוא 8%.\n\nא. מהי ההסתברות שמוצר שנבחר באקראי הוא פגום?\nב. נבחר מוצר ונמצא פגום -- מהי ההסתברות שהוא מקו א\u2019?\nג. נבחר מוצר ונמצא תקין -- מהי ההסתברות שהוא מקו ב\u2019?\nד. כמה מוצרים מתוך 1000 צפויים להיות פגומים מקו ב\u2019?",
    diagram: <MediumTreeDiagram />,
    pitfalls: [
      { title: "הסתברות שלמה: אל תשכחו לכפול בהסתברות הקו", text: "P(פגום) = P(פגום|א)·P(א) + P(פגום|ב)·P(ב) -- שני מרכיבים! לא פשוט 5%+8%." },
      { title: "בייס: המכנה הוא P(פגום) שחישבתם בסעיף א", text: "P(א|פגום) = P(פגום|א)·P(א) / P(פגום). המכנה הוא לא P(א)!" },
      { title: "בסעיף ד: 1000 × P(ב) × P(פגום|ב)", text: "מספר הפגומים מקו ב\u2019 = 1000 × 0.4 × 0.08, לא 1000 × P(פגום) הכולל." },
    ],
    goldenPrompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמפעל שני קווי ייצור: קו א\u2019 מייצר 60%, קו ב\u2019 מייצר 40%. פגמים: 5% בקו א\u2019, 8% בקו ב\u2019.\nאני צריך:\n1. לחשב P(פגום) עם הסתברות שלמה\n2. לחשב P(קו א\u2019|פגום) עם בייס\n3. לחשב P(קו ב\u2019|תקין)\n4. לחשב מספר פגומים מקו ב\u2019 מתוך 1000\n\nאל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- P(פגום) בהסתברות שלמה",
        coaching: "השתמש בנוסחת ההסתברות השלמה",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nבמפעל: קו א\u2019 מייצר 60% (5% פגמים), קו ב\u2019 מייצר 40% (8% פגמים). תנחה אותי לחשב P(פגום) עם נוסחת ההסתברות השלמה. שאל: למה צריך ממוצע משוקלל ולא פשוט 5%+8%? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["הסתברות שלמה", "פגום", "משוקלל"],
        keywordHint: "ציין שצריך הסתברות שלמה",
        contextWords: ["בייס", "הסתברות שלמה", "פגום", "קו ייצור", "מותנית", "עץ"],
        stationWords: ["בייס", "הסתברות שלמה", "עץ"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- P(קו א\u2019|פגום) עם בייס",
        coaching: "הפוך את כיוון ההתניה עם בייס",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nחישבתי P(פגום) בסעיף א\u2019. עכשיו אני צריך P(קו א\u2019|פגום). תנחה אותי להשתמש בנוסחת בייס. שאל: מה המונה ומה המכנה? למה זה הפוך מ-P(פגום|קו א\u2019)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["בייס", "הפוך", "מכנה"],
        keywordHint: "ציין שצריך נוסחת בייס",
        contextWords: ["בייס", "הסתברות שלמה", "פגום", "קו ייצור", "מותנית", "עץ"],
        stationWords: ["בייס", "הסתברות שלמה", "עץ"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- P(קו ב\u2019|תקין)",
        coaching: "שוב בייס, הפעם עם 'תקין' במקום 'פגום'",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nעכשיו אני צריך P(קו ב\u2019|תקין). תנחה אותי: מה P(תקין)? איך משתמשים בבייס כאן? שאל: מה P(תקין|קו ב\u2019) ומה P(ב\u2019)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["תקין", "בייס", "קו"],
        keywordHint: "ציין שצריך בייס עם תקין",
        contextWords: ["בייס", "הסתברות שלמה", "פגום", "קו ייצור", "מותנית", "עץ"],
        stationWords: ["בייס", "הסתברות שלמה", "עץ"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- כמה פגומים מקו ב\u2019 מ-1000",
        coaching: "חשב 1000 × P(ב) × P(פגום|ב)",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nמתוך 1000 מוצרים, כמה צפויים להיות פגומים מקו ב\u2019? תנחה אותי: למה זה 1000 × P(ב) × P(פגום|ב) ולא 1000 × P(פגום)? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["1000", "פגום", "קו ב"],
        keywordHint: "ציין שצריך חישוב כמותי מקו ב\u2019",
        contextWords: ["בייס", "הסתברות שלמה", "פגום", "קו ייצור", "מותנית", "עץ"],
        stationWords: ["בייס", "הסתברות שלמה", "עץ"],
      },
    ],
  },
  {
    id: "advanced",
    title: "בייס בבדיקה רפואית -- הפרדוקס",
    problem: "בבדיקה רפואית, 2% מהאוכלוסייה חולים במחלה מסוימת. הבדיקה מזהה נכון 95% מהחולים (רגישות), אך נותנת תוצאה חיובית שגויה ל-3% מהבריאים (שגיאה חיובית).\n\nא. מהי ההסתברות שאדם שנבחר באקראי יקבל תוצאה חיובית?\nב. אדם קיבל תוצאה חיובית -- מהי ההסתברות שהוא באמת חולה? (בייס)\nג. מדוע ההסתברות בסעיף ב נמוכה יחסית, למרות שהבדיקה \"טובה\"?\nד. אם נעלה את הרגישות ל-99% -- האם זה ישנה משמעותית את התשובה בסעיף ב?",
    diagram: <AdvancedVennDiagram />,
    pitfalls: [
      { title: "P(חיובי) = שני מרכיבים!", text: "P(חיובי) = P(חיובי|חולה)·P(חולה) + P(חיובי|בריא)·P(בריא) -- אל תשכחו את שני הענפים בעץ." },
      { title: "הפרדוקס: מחלה נדירה = הרבה false positives", text: "גם בדיקה טובה מאוד נותנת הרבה תוצאות חיוביות שגויות כשהמחלה נדירה. 3% מ-98% >> 95% מ-2%." },
      { title: "בסעיף ד: שנו רק את הרגישות", text: "כשמעלים ל-99%, שנו רק P(חיובי|חולה). ה-3% של השגיאה החיובית נשאר כמו שהוא." },
    ],
    goldenPrompt: "",
    steps: [
      {
        phase: "א",
        label: "סעיף א\u2019 -- P(חיובי) בהסתברות שלמה",
        coaching: "פרק ל-P(חיובי|חולה)·P(חולה) + P(חיובי|בריא)·P(בריא)",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\n2% חולים, רגישות 95%, שגיאה חיובית 3%. תנחה אותי לחשב P(חיובי) עם הסתברות שלמה. שאל: מה שני המסלולים שמובילים לתוצאה חיובית? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["חיובי", "שלמה", "מסלול"],
        keywordHint: "ציין שצריך הסתברות שלמה עם שני מסלולים",
        contextWords: ["בייס", "רגישות", "חיובי שגוי", "שכיחות", "מותנית", "חולה", "בריא"],
        stationWords: ["בייס", "רגישות", "בדיקה"],
      },
      {
        phase: "ב",
        label: "סעיף ב\u2019 -- P(חולה|חיובי) עם בייס",
        coaching: "הפוך את ההתניה: מ-P(חיובי|חולה) ל-P(חולה|חיובי)",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nחישבתי P(חיובי). עכשיו אני צריך P(חולה|חיובי) עם בייס. תנחה אותי: מה המונה? מה המכנה? למה התוצאה מפתיעה? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["בייס", "חולה", "חיובי"],
        keywordHint: "ציין שצריך בייס",
        contextWords: ["בייס", "רגישות", "חיובי שגוי", "שכיחות", "מותנית", "חולה", "בריא"],
        stationWords: ["בייס", "רגישות", "בדיקה"],
      },
      {
        phase: "ג",
        label: "סעיף ג\u2019 -- הסבר הפרדוקס",
        coaching: "למה בדיקה 'טובה' נותנת תוצאה נמוכה?",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nקיבלתי P(חולה|חיובי) נמוך יחסית, למרות רגישות 95%. תנחה אותי להבין למה: מה הקשר בין שכיחות המחלה (2%) לכמות ה-false positives? תשאל אותי להשוות בין 95%×2% לבין 3%×98%. אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["פרדוקס", "שכיחות", "false positive"],
        keywordHint: "ציין שצריך להסביר את הפרדוקס",
        contextWords: ["בייס", "רגישות", "חיובי שגוי", "שכיחות", "מותנית", "חולה", "בריא"],
        stationWords: ["בייס", "רגישות", "בדיקה"],
      },
      {
        phase: "ד",
        label: "סעיף ד\u2019 -- רגישות 99%",
        coaching: "שנה רק P(חיובי|חולה) ל-0.99 וחשב מחדש",
        prompt: "אתה המורה הפרטי שלי למתמטיקה, כיתה יא 3 יחידות.\nאם הרגישות עולה ל-99%, תנחה אותי לחשב מחדש P(חולה|חיובי). שאל: מה משתנה ומה לא? האם השינוי משמעותי? למה הבעיה בעצם בשכיחות ולא ברגישות? אל תפתור עבורי.\nסרוק את הנתונים בלבד. תעצור אחרי כל שלב ותחכה שאגיד להמשיך.",
        keywords: ["רגישות", "שינוי", "חישוב מחדש"],
        keywordHint: "ציין שצריך לחשב מחדש עם רגישות 99%",
        contextWords: ["בייס", "רגישות", "חיובי שגוי", "שכיחות", "מותנית", "חולה", "בריא"],
        stationWords: ["בייס", "רגישות", "בדיקה"],
      },
    ],
  },
];

// ─── Conditional Probability Lab ─────────────────────────────────────────────

function ConditionalProbabilityLab() {
  const [prevalence, setPrevalence] = useState(0.02);
  const [sensitivity, setSensitivity] = useState(0.95);
  const [falsePos, setFalsePos] = useState(0.03);

  const pPositive = sensitivity * prevalence + falsePos * (1 - prevalence);
  const pSickGivenPos = pPositive > 0 ? (sensitivity * prevalence) / pPositive : 0;
  const pNeg = 1 - pPositive;
  const pHealthyGivenNeg = pNeg > 0 ? ((1 - falsePos) * (1 - prevalence)) / pNeg : 0;

  const isDefault = Math.abs(prevalence - 0.02) < 0.005 && Math.abs(sensitivity - 0.95) < 0.005 && Math.abs(falsePos - 0.03) < 0.005;

  // Bar chart data
  const truePos = sensitivity * prevalence;
  const falsePositives = falsePos * (1 - prevalence);
  const maxBar = Math.max(truePos, falsePositives, 0.01);

  const svgW = 300, svgH = 160, padL = 50, padB = 35, padT = 15, padR = 15;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const barW = plotW * 0.25;

  return (
    <section style={{ border: "1px solid rgba(60,54,42,0.15)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#2D3436", margin: 0 }}>&#128300; סימולטור בייס</h3>
        {pSickGivenPos < 0.5 && <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />פרדוקס בייס!</span>}
      </div>

      {/* Bar chart SVG */}
      <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden", padding: 12, marginBottom: "1.25rem" }}>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
          {/* Axes */}
          <line x1={padL} y1={svgH - padB} x2={svgW - padR} y2={svgH - padB} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={padL} y1={svgH - padB} x2={padL} y2={padT} stroke="#94a3b8" strokeWidth={1.2} />
          {/* Y axis label */}
          <text x={12} y={(padT + svgH - padB) / 2} textAnchor="middle" fill="#64748b" fontSize={10} transform={`rotate(-90, 12, ${(padT + svgH - padB) / 2})`}>הסתברות</text>

          {/* True positives bar */}
          {(() => {
            const bx = padL + plotW * 0.2;
            const bh = (truePos / maxBar) * plotH;
            const by = padT + plotH - bh;
            return (
              <>
                <rect x={bx - barW / 2} y={by} width={barW} height={bh} fill="#16a34a" rx={4} opacity={0.8} />
                <text x={bx} y={by - 5} textAnchor="middle" fill="#16a34a" fontSize={9} fontWeight={700}>{(truePos * 100).toFixed(2)}%</text>
                <text x={bx} y={svgH - padB + 14} textAnchor="middle" fill="#334155" fontSize={9} fontWeight={600}>חולה+חיובי</text>
                <text x={bx} y={svgH - padB + 26} textAnchor="middle" fill="#64748b" fontSize={8}>(True Pos)</text>
              </>
            );
          })()}

          {/* False positives bar */}
          {(() => {
            const bx = padL + plotW * 0.65;
            const bh = (falsePositives / maxBar) * plotH;
            const by = padT + plotH - bh;
            return (
              <>
                <rect x={bx - barW / 2} y={by} width={barW} height={bh} fill="#dc2626" rx={4} opacity={0.8} />
                <text x={bx} y={by - 5} textAnchor="middle" fill="#dc2626" fontSize={9} fontWeight={700}>{(falsePositives * 100).toFixed(2)}%</text>
                <text x={bx} y={svgH - padB + 14} textAnchor="middle" fill="#334155" fontSize={9} fontWeight={600}>בריא+חיובי</text>
                <text x={bx} y={svgH - padB + 26} textAnchor="middle" fill="#64748b" fontSize={8}>(False Pos)</text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>P(חולה)</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{(prevalence * 100).toFixed(0)}%</span>
          </div>
          <input type="range" min={0.01} max={0.20} step={0.01} value={prevalence}
            onChange={e => setPrevalence(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#7c3aed" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>רגישות</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{(sensitivity * 100).toFixed(0)}%</span>
          </div>
          <input type="range" min={0.80} max={1.00} step={0.01} value={sensitivity}
            onChange={e => setSensitivity(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#16a34a" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>שגיאה חיובית</span>
            <span style={{ fontFamily: "monospace", color: "#2D3436", fontWeight: 700 }}>{(falsePos * 100).toFixed(0)}%</span>
          </div>
          <input type="range" min={0.01} max={0.15} step={0.01} value={falsePos}
            onChange={e => setFalsePos(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#dc2626" }} />
        </div>
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(חיובי)</p>
          <p style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{(pPositive * 100).toFixed(2)}%</p>
        </div>
        <div style={{ background: pSickGivenPos < 0.5 ? "rgba(254,226,226,0.5)" : "rgba(220,252,231,0.5)", border: `1px solid ${pSickGivenPos < 0.5 ? "rgba(220,38,38,0.25)" : "rgba(22,163,74,0.25)"}`, borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: pSickGivenPos < 0.5 ? "#dc2626" : "#16a34a", marginBottom: 4, fontWeight: 600 }}>P(חולה|חיובי)</p>
          <p style={{ fontFamily: "monospace", color: pSickGivenPos < 0.5 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>{(pSickGivenPos * 100).toFixed(1)}%</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>P(בריא|שלילי)</p>
          <p style={{ fontFamily: "monospace", color: "#16a34a", fontWeight: 700 }}>{(pHealthyGivenNeg * 100).toFixed(2)}%</p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ color: "#dc2626", fontWeight: 600 }}>פרדוקס בייס:</span> כשהמחלה נדירה ({(prevalence * 100).toFixed(0)}%), גם בדיקה עם רגישות {(sensitivity * 100).toFixed(0)}% נותנת ערך ניבוי חיובי של רק <span style={{ color: "#7c3aed", fontWeight: 700 }}>{(pSickGivenPos * 100).toFixed(1)}%</span> -- כי רוב החיוביים הם false positives.
      </div>

      <LabMessage text="שנו את הסליידרים כדי לראות איך שכיחות המחלה משפיעה על P(חולה|חיובי). נסו להעלות את P(חולה) ל-10% וראו מה קורה!" type="success" visible={isDefault} />
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>הסתברות מותנית ובייס עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>הסתברות מותנית, נוסחת בייס, והסתברות שלמה</p>
          </div>
          <Link
            href="/3u/topic/grade11/probability"
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

        <SubtopicProgress subtopicId="3u/grade11/probability/conditional" />

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
        <ConditionalProbabilityLab />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade11/probability/conditional" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
