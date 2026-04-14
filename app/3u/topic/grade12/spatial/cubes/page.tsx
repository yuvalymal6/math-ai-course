"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

/* Isometric L-shaped structure of 5 unit cubes (silent — no numbers) */
function BasicSVG() {
  const dx = 20, dy = 12, s = 28;
  // Isometric projection helpers
  const ix = (col: number, row: number) => 160 + (col - row) * dx;
  const iy = (col: number, row: number, h: number) => 100 + (col + row) * dy - h * s;

  // L-shape: (0,0), (1,0), (2,0) along one axis, (0,1), (0,2) along other
  const cubes = [[0,0,0],[1,0,0],[2,0,0],[0,1,0],[0,2,0]];

  function drawCube(col: number, row: number, h: number, key: number) {
    const cx = ix(col, row);
    const cy = iy(col, row, h);
    // top face
    const top = `${cx},${cy - s} ${cx + dx},${cy - s + dy} ${cx},${cy - s + 2*dy} ${cx - dx},${cy - s + dy}`;
    // right face
    const right = `${cx},${cy - s + 2*dy} ${cx + dx},${cy - s + dy} ${cx + dx},${cy + dy} ${cx},${cy + 2*dy}`;
    // left face
    const left = `${cx},${cy - s + 2*dy} ${cx - dx},${cy - s + dy} ${cx - dx},${cy + dy} ${cx},${cy + 2*dy}`;
    return (
      <g key={key}>
        <polygon points={top} fill="#34d399" fillOpacity={0.35} stroke="#94a3b8" strokeWidth={1.2} />
        <polygon points={right} fill="#16A34A" fillOpacity={0.25} stroke="#94a3b8" strokeWidth={1.2} />
        <polygon points={left} fill="#059669" fillOpacity={0.2} stroke="#94a3b8" strokeWidth={1.2} />
      </g>
    );
  }

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {cubes.map(([c,r,h], i) => drawCube(c, r, h, i))}
      <text x={160} y={190} fontSize={11} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">מבנה L מקוביות יחידה</text>
    </svg>
  );
}

/* Number diagram: 3x3 grid with "?" in each cell */
function MediumSVG() {
  const cellSize = 36, pad = 40;
  const gridW = 3 * cellSize;
  const totalW = gridW + pad * 2;
  const totalH = gridW + pad * 2 + 20;
  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {[0,1,2].map(r => [0,1,2].map(c => {
        const x = pad + c * cellSize;
        const y = pad + r * cellSize;
        return (
          <g key={`${r}-${c}`}>
            <rect x={x} y={y} width={cellSize} height={cellSize} fill="#EA580C" fillOpacity={0.08} stroke="#94a3b8" strokeWidth={1.2} rx={3} />
            <text x={x + cellSize/2} y={y + cellSize/2 + 5} fontSize={16} fill="#EA580C" textAnchor="middle" fontFamily="sans-serif" fontWeight={700}>?</text>
          </g>
        );
      }))}
      <text x={totalW/2} y={totalH - 6} fontSize={11} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">תרשים מספרים (גובה כל עמודה)</text>
    </svg>
  );
}

/* Front view grid + Right view grid side by side, "?" in center */
function AdvancedSVG() {
  const cellSize = 28, pad = 20, gap = 40;
  const gridW = 3 * cellSize;
  const gridH = 2 * cellSize;
  const totalW = pad + gridW + gap + gridW + pad;
  const totalH = pad + gridH + 40;

  function viewGrid(ox: number, oy: number, label: string, color: string) {
    return (
      <g>
        {[0,1].map(r => [0,1,2].map(c => {
          const x = ox + c * cellSize;
          const y = oy + r * cellSize;
          const filled = (r === 1) || (r === 0 && c === 1);
          return (
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width={cellSize} height={cellSize} fill={filled ? color : "transparent"} fillOpacity={filled ? 0.15 : 0} stroke="#94a3b8" strokeWidth={1.2} rx={2} />
              {filled && <text x={x + cellSize/2} y={y + cellSize/2 + 4} fontSize={12} fill={color} textAnchor="middle" fontFamily="sans-serif" fontWeight={600}>?</text>}
            </g>
          );
        }))}
        <text x={ox + gridW/2} y={oy + gridH + 18} fontSize={11} fill="#6B7280" textAnchor="middle" fontFamily="sans-serif">{label}</text>
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {viewGrid(pad, pad, "מבט מלפנים", "#DC2626")}
      {viewGrid(pad + gridW + gap, pad, "מבט מימין", "#a78bfa")}
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
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>פרומפט ראשי</span>
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
        subjectWords={["מבט", "קוביות", "תרשים מספרים", "מלפנים", "מלמעלה", "מבנה"]}
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
    title: "שלושה מבטים",
    problem: "נתון מבנה תלת-ממדי בצורת L המורכב מ-5 קוביות יחידה. הקוביות מסודרות כך: שלוש קוביות בשורה אחת (משמאל לימין) ועוד שתי קוביות נוספות בשורה מאונכת (כלפי מעלה) על הקוביה השמאלית.\n\nא. ציירו את המבט מלפנים (Front View).\nב. ציירו את המבט מימין (Right View).\nג. ציירו את המבט מלמעלה (Top View).",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "בלבול בין מבט מימין למבט משמאל", text: "מבט מימין ומבט משמאל הם תמונות מראה זה של זה. ודאו שאתם מביטים מהכיוון הנכון — דמיינו שאתם עומדים מצד ימין של המבנה ומסתכלים ישירות עליו." },
      { title: "שכחת קוביות מוסתרות במבט", text: "במבט מלפנים, קוביות שנמצאות מאחורי קוביות קדמיות לא נראות, אבל הן עדיין תופסות מקום. תמיד בדקו — האם יש קוביות מוסתרות שמשפיעות על גובה העמודה?" },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה יב׳, 3 יחידות, ומצרף/ת שאלה בנושא קוביות ומבטים. נתון מבנה תלת-ממדי בצורת L מ-5 קוביות יחידה. אני צריך/ה לצייר שלושה מבטים: מלפנים, מימין ומלמעלה.

אל תפתור עבורי — שאל אותי שאלות מכווינות שיעזרו לי להבין איך להטיל את המבנה על כל מישור.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מבט מלפנים", coaching: "", prompt: "נתון מבנה L מ-5 קוביות יחידה: 3 קוביות בשורה תחתונה ועוד 2 למעלה בצד שמאל. תנחה אותי כיצד לצייר את המבט מלפנים — מה רואים כשמביטים ישירות מהחזית.", keywords: [], keywordHint: "", contextWords: ["מבט", "מלפנים", "קוביות", "שורה", "גובה", "חזית", "ריבוע"] },
      { phase: "סעיף ב׳", label: "מבט מימין", coaching: "", prompt: "נתון מבנה L מ-5 קוביות יחידה. תסביר לי כיצד לצייר את המבט מימין — כמה עמודות רואים ובאיזה גובה כל אחת.", keywords: [], keywordHint: "", contextWords: ["מבט", "מימין", "עמודה", "גובה", "קוביות", "צד"] },
      { phase: "סעיף ג׳", label: "מבט מלמעלה", coaching: "", prompt: "נתון מבנה L מ-5 קוביות יחידה. תכווין אותי לצייר את המבט מלמעלה — אילו ריבועים נראים כשמסתכלים ישירות מלמעלה על המבנה.", keywords: [], keywordHint: "", contextWords: ["מבט", "מלמעלה", "ריבועים", "צורה", "L", "מלמעלה", "שטח"] },
    ],
  },
  {
    id: "medium",
    title: "תרשים מספרים",
    problem: "נתון תרשים מספרים של מבנה קוביות על לוח 3×3:\n\n  2  1  0\n  3  2  1\n  1  1  0\n\nא. כמה קוביות יחידה יש בסך הכל במבנה?\nב. ציירו את המבנה התלת-ממדי לפי תרשים המספרים.\nג. ציירו את המבט מלפנים ואת המבט מימין.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "קריאת תרשים מספרים כשטח במקום גובה", text: "כל מספר בתרשים מייצג את הגובה (מספר הקוביות המוערמות) בנקודה זו, לא את השטח. תרשים שכתוב בו 3 אומר עמודה של 3 קוביות, לא 3 ריבועים." },
      { title: "שכחה שמבט מראה גובה מקסימלי בכל עמודה", text: "במבט מלפנים, כל עמודה שרואים מציגה את הגובה המקסימלי מבין כל השורות באותה עמודה. לא ממוצע, לא סכום — רק המקסימום!" },
    ],
    goldenPrompt: `אני בכיתה יב׳, 3 יחידות, מצרף/ת תרגיל בנושא תרשים מספרים וקוביות. נתון לוח 3×3 עם מספרים שמייצגים גובה עמודות קוביות. צריך לספור קוביות, לצייר את המבנה ולצייר מבטים.

אל תיתן לי את הספירה או הציור — שאל אותי שאלות מנחות כדי שאבין לבד איך לקרוא תרשים מספרים ואיך להפוך אותו למבטים.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "ספירת קוביות", coaching: "", prompt: "נתון תרשים מספרים 3×3 של מבנה קוביות. תנחה אותי לספור את סך כל הקוביות — כל מספר מייצג גובה עמודת קוביות.", keywords: [], keywordHint: "", contextWords: ["ספירה", "קוביות", "תרשים", "גובה", "סכום", "עמודה"] },
      { phase: "סעיף ב׳", label: "ציור מבנה תלת-ממדי", coaching: "", prompt: "נתון תרשים מספרים 3×3 של קוביות. תדריך אותי כיצד לבנות את המבנה התלת-ממדי מהתרשים — איך כל מספר הופך לעמודת קוביות.", keywords: [], keywordHint: "", contextWords: ["מבנה", "תלת-ממדי", "עמודה", "תרשים מספרים", "קוביות", "ציור"] },
      { phase: "סעיף ג׳", label: "מבט מלפנים ומימין", coaching: "", prompt: "נתון תרשים מספרים 3×3 של קוביות. תכווין אותי לצייר את המבט מלפנים ואת המבט מימין — כיצד מוצאים את הגובה המקסימלי בכל עמודה.", keywords: [], keywordHint: "", contextWords: ["מבט", "מלפנים", "מימין", "גובה מקסימלי", "עמודה", "שורה"] },
    ],
  },
  {
    id: "advanced",
    title: "בנייה ממבטים",
    problem: "נתונים שני מבטים של מבנה קוביות על לוח 3×2:\n\nמבט מלפנים (3 עמודות): גובה 2, 3, 1\nמבט מימין (2 עמודות): גובה 3, 2\n\nא. מהו מספר הקוביות המינימלי הדרוש לבניית מבנה שמתאים לשני המבטים?\nב. מהו מספר הקוביות המקסימלי שמתאים לשני המבטים?\nג. כתבו את תרשים המספרים עבור המבנה המינימלי ועבור המבנה המקסימלי.\nד. האם קיים מבנה יחיד שמתאים לשני המבטים? הסבירו.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "חשיבה שיש רק פתרון אחד", text: "בדרך כלל, שני מבטים לא מגדירים מבנה יחיד! יש טווח של פתרונות בין מינימום למקסימום. רק מבט שלישי (מלמעלה) יכול לצמצם את האפשרויות." },
      { title: "חישוב מינימום שגוי", text: "במבנה מינימלי, כל תא בתרשים המספרים צריך להיות 0 אלא אם הוא חייב להיות גבוה כדי לקיים את אחד המבטים. לכל תא, הגובה המינימלי הוא 0 אם יש תא אחר בשורה/עמודה שמקיים את הדרישה." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד בונים מבנה קוביות משני מבטים, ומה ההבדל בין מבנה מינימלי למקסימלי? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מספר קוביות מינימלי", coaching: "", prompt: "נתונים מבט מלפנים (גבהים 2,3,1) ומבט מימין (גבהים 3,2) על לוח 3×2. תנחה אותי למצוא את מספר הקוביות המינימלי שמקיים את שני המבטים.", keywords: [], keywordHint: "", contextWords: ["מינימום", "קוביות", "מבט", "מלפנים", "מימין", "גובה"] },
      { phase: "סעיף ב׳", label: "מספר קוביות מקסימלי", coaching: "", prompt: "נתונים מבט מלפנים (גבהים 2,3,1) ומבט מימין (גבהים 3,2). תדריך אותי למצוא את מספר הקוביות המקסימלי שעדיין מתאים לשני המבטים.", keywords: [], keywordHint: "", contextWords: ["מקסימום", "קוביות", "מבט", "תרשים", "גובה", "מילוי"] },
      { phase: "סעיף ג׳", label: "תרשימי מספרים", coaching: "", prompt: "לאחר שמצאתי מינימום ומקסימום, תנחה אותי לכתוב את תרשים המספרים (לוח 3×2) עבור כל אחד מהמבנים.", keywords: [], keywordHint: "", contextWords: ["תרשים מספרים", "לוח", "מינימלי", "מקסימלי", "גובה", "תא"] },
      { phase: "סעיף ד׳", label: "יחידות הפתרון", coaching: "", prompt: "תסביר לי — האם קיים מבנה יחיד שמתאים לשני המבטים? או שיש כמה אפשרויות? מה צריך כדי לקבוע מבנה יחיד?", keywords: [], keywordHint: "", contextWords: ["יחיד", "מבנה", "מבט", "אפשרויות", "מלמעלה", "חד-משמעי"] },
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
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🧊 קוביות ומבטים (Cubes & Views)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "מבנה תלת-ממדי מקוביות יחידה — לומדים לצייר שלושה מבטים: מלפנים, מימין, מלמעלה."}
            {ex.id === "medium" && "תרשים מספרים — כל מספר מציין גובה עמודת קוביות. ספירת קוביות, ציור מבנה ומבטים."}
            {ex.id === "advanced" && "בנייה הפוכה: ממבטים נתונים למבנה. מציאת מינימום ומקסימום קוביות, ובדיקת יחידות."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: מבטים */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>מבטים</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 90 }}>מלפנים</span>
              <span>הטלה על מישור XY — רואים גובה מקסימלי בכל עמודה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 90 }}>מימין</span>
              <span>הטלה על מישור YZ — רואים גובה מקסימלי בכל שורה.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 90 }}>מלמעלה</span>
              <span>הטלה על מישור XZ — רואים אילו משבצות תפוסות (גובה &gt; 0).</span>
            </div>
          </div>
        </div>

        {/* Medium+ extras */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>תרשים מספרים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 90 }}>תא</span>
                  <span>כל תא ברשת מציין את גובה עמודת הקוביות במיקום זה.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 90 }}>סה״כ</span>
                  <span>סכום כל המספרים = מספר הקוביות הכולל.</span>
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
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>בנייה ממבטים</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 90 }}>מקסימום</span>
                  <span>כל תא = min(מבט מלפנים של העמודה, מבט מימין של השורה)</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 90 }}>מינימום</span>
                  <span>כל עמודה/שורה צריכה לפחות תא אחד עם הגובה הנדרש.</span>
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

// ─── ViewsLab (basic) — 2×2 grid of height sliders ─────────────────────────

function ViewsLab() {
  // 2×2 grid positions, each with height 0-3
  const [heights, setHeights] = useState([
    [2, 1],
    [1, 3],
  ]);
  const st = STATION.basic;

  const rows = heights.length;
  const cols = heights[0].length;
  const totalCubes = heights.flat().reduce((a, b) => a + b, 0);
  const maxHeight = Math.max(...heights.flat());

  const updateHeight = (r: number, c: number, v: number) => {
    setHeights(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = v;
      return next;
    });
  };

  // Front view: max height per column
  const frontView = Array.from({ length: cols }, (_, c) =>
    Math.max(...heights.map(row => row[c]))
  );
  // Right view: max height per row
  const rightView = heights.map(row => Math.max(...row));
  // Top view: 1 if height > 0
  const topView = heights.map(row => row.map(h => h > 0 ? 1 : 0));

  // Isometric drawing
  const dx = 22, dy = 13, s = 26;
  const ix = (col: number, row: number) => 140 + (col - row) * dx;
  const iy = (col: number, row: number, h: number) => 80 + (col + row) * dy - h * s;

  function drawCube(col: number, row: number, h: number, key: string) {
    const cx = ix(col, row);
    const cy = iy(col, row, h);
    const top = `${cx},${cy - s} ${cx + dx},${cy - s + dy} ${cx},${cy - s + 2*dy} ${cx - dx},${cy - s + dy}`;
    const right = `${cx},${cy - s + 2*dy} ${cx + dx},${cy - s + dy} ${cx + dx},${cy + dy} ${cx},${cy + 2*dy}`;
    const left = `${cx},${cy - s + 2*dy} ${cx - dx},${cy - s + dy} ${cx - dx},${cy + dy} ${cx},${cy + 2*dy}`;
    return (
      <g key={key}>
        <polygon points={top} fill="#34d399" fillOpacity={0.35} stroke="#94a3b8" strokeWidth={1} />
        <polygon points={right} fill="#16A34A" fillOpacity={0.25} stroke="#94a3b8" strokeWidth={1} />
        <polygon points={left} fill="#059669" fillOpacity={0.2} stroke="#94a3b8" strokeWidth={1} />
      </g>
    );
  }

  // View SVG helper
  function viewSVG(viewData: number[], label: string, color: string) {
    const cellSize = 22;
    const maxH = Math.max(...viewData, 1);
    const w = viewData.length * cellSize + 20;
    const h = maxH * cellSize + 30;
    return (
      <div style={{ textAlign: "center" }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 120 }} aria-hidden>
          {viewData.map((val, i) => {
            const x = 10 + i * cellSize;
            return Array.from({ length: val }, (_, j) => (
              <rect key={`${i}-${j}`} x={x} y={h - 20 - (j + 1) * cellSize} width={cellSize} height={cellSize} fill={color} fillOpacity={0.3} stroke="#94a3b8" strokeWidth={1} rx={2} />
            ));
          })}
        </svg>
        <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>{label}</div>
      </div>
    );
  }

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מבטים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את גובה כל עמודה ברשת 2×2 וצפו כיצד שלושת המבטים משתנים בזמן אמת.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {heights.flatMap((row, r) => row.map((v, c) => (
          <div key={`${r}-${c}`} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>תא ({r+1},{c+1})</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{v}</span>
            </div>
            <input type="range" min={0} max={3} step={1} value={v} onChange={(e) => updateHeight(r, c, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        )))}
      </div>

      {/* Isometric 3D */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 280 180" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Draw from back to front for correct overlap */}
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) =>
              Array.from({ length: heights[r][c] }, (_, h) =>
                drawCube(c, r, h, `${r}-${c}-${h}`)
              )
            )
          )}
        </svg>
      </div>

      {/* Three views side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        {viewSVG(frontView, "מבט מלפנים", "#16A34A")}
        {viewSVG(rightView, "מבט מימין", "#f59e0b")}
        <div style={{ textAlign: "center" }}>
          <svg viewBox="0 0 70 70" style={{ width: "100%", maxWidth: 120 }} aria-hidden>
            {topView.map((row, r) => row.map((val, c) => (
              <rect key={`${r}-${c}`} x={10 + c * 22} y={10 + r * 22} width={22} height={22} fill={val ? "#a78bfa" : "transparent"} fillOpacity={val ? 0.3 : 0} stroke="#94a3b8" strokeWidth={1} rx={2} />
            )))}
          </svg>
          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>מבט מלמעלה</div>
        </div>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "סה״כ קוביות", val: totalCubes.toString() },
          { label: "גובה מקסימלי", val: maxHeight.toString() },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שנו את הגבהים וצפו — כיצד כל מבט מייצג את הגובה המקסימלי מכיוון מסוים?</p>
    </section>
  );
}

// ─── NumberDiagramLab (medium) — 3×3 grid of sliders ────────────────────────

function NumberDiagramLab() {
  const [grid, setGrid] = useState([
    [2, 1, 0],
    [3, 2, 1],
    [1, 1, 0],
  ]);
  const st = STATION.medium;

  const totalCubes = grid.flat().reduce((a, b) => a + b, 0);
  const rows = grid.length;
  const cols = grid[0].length;

  // Front view: max per column
  const frontView = Array.from({ length: cols }, (_, c) =>
    Math.max(...grid.map(row => row[c]))
  );
  // Right view: max per row
  const rightView = grid.map(row => Math.max(...row));

  const updateCell = (r: number, c: number, v: number) => {
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = v;
      return next;
    });
  };

  // Isometric drawing
  const dx = 18, dy = 11, s2 = 22;
  const ix = (col: number, row: number) => 160 + (col - row) * dx;
  const iy = (col: number, row: number, h: number) => 100 + (col + row) * dy - h * s2;

  function drawCube(col: number, row: number, h: number, key: string) {
    const cx = ix(col, row);
    const cy = iy(col, row, h);
    const top = `${cx},${cy - s2} ${cx + dx},${cy - s2 + dy} ${cx},${cy - s2 + 2*dy} ${cx - dx},${cy - s2 + dy}`;
    const right = `${cx},${cy - s2 + 2*dy} ${cx + dx},${cy - s2 + dy} ${cx + dx},${cy + dy} ${cx},${cy + 2*dy}`;
    const left = `${cx},${cy - s2 + 2*dy} ${cx - dx},${cy - s2 + dy} ${cx - dx},${cy + dy} ${cx},${cy + 2*dy}`;
    return (
      <g key={key}>
        <polygon points={top} fill="#f59e0b" fillOpacity={0.3} stroke="#94a3b8" strokeWidth={0.8} />
        <polygon points={right} fill="#EA580C" fillOpacity={0.2} stroke="#94a3b8" strokeWidth={0.8} />
        <polygon points={left} fill="#d97706" fillOpacity={0.15} stroke="#94a3b8" strokeWidth={0.8} />
      </g>
    );
  }

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת תרשים מספרים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הגבהים ברשת 3×3 וצפו במבנה התלת-ממדי, בסך הקוביות ובמבטים מלפנים ומימין.</p>

      {/* Sliders — 3×3 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {grid.flatMap((row, r) => row.map((v, c) => (
          <div key={`${r}-${c}`} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>({r+1},{c+1})</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{v}</span>
            </div>
            <input type="range" min={0} max={4} step={1} value={v} onChange={(e) => updateCell(r, c, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        )))}
      </div>

      {/* Isometric 3D */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 320 220" className="w-full max-w-md mx-auto" aria-hidden>
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) =>
              Array.from({ length: grid[r][c] }, (_, h) =>
                drawCube(c, r, h, `${r}-${c}-${h}`)
              )
            )
          )}
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>סה״כ קוביות</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{totalCubes}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>מבט מלפנים</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>{frontView.join(", ")}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>מבט מימין</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>{rightView.join(", ")}</div>
        </div>
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>סכום כל המספרים בתרשים = סך הקוביות. כל מבט מראה את הגובה המקסימלי בכיוון שלו.</p>
    </section>
  );
}

// ─── BuildFromViewsLab (advanced) ───────────────────────────────────────────

function BuildFromViewsLab() {
  // Fixed views: front = [2, 3, 1], right = [3, 2] => 3×2 grid
  const frontTarget = [2, 3, 1];
  const rightTarget = [3, 2];
  const numCols = 3;
  const numRows = 2;

  const [grid, setGrid] = useState([
    [2, 3, 1],
    [2, 2, 1],
  ]);
  const st = STATION.advanced;

  const totalCubes = grid.flat().reduce((a, b) => a + b, 0);

  // Check front view
  const frontActual = Array.from({ length: numCols }, (_, c) =>
    Math.max(...grid.map(row => row[c]))
  );
  // Check right view
  const rightActual = grid.map(row => Math.max(...row));

  const frontMatch = frontActual.every((v, i) => v === frontTarget[i]);
  const rightMatch = rightActual.every((v, i) => v === rightTarget[i]);
  const bothMatch = frontMatch && rightMatch;

  // Calculate min and max cubes
  // Max: each cell = min(frontTarget[col], rightTarget[row])
  const maxGrid = Array.from({ length: numRows }, (_, r) =>
    Array.from({ length: numCols }, (_, c) => Math.min(frontTarget[c], rightTarget[r]))
  );
  const maxCubes = maxGrid.flat().reduce((a, b) => a + b, 0);

  // Min: for each column, need max of that column = frontTarget[col]
  //       for each row, need max of that row = rightTarget[row]
  // Greedy: place cubes only where necessary
  function calcMinCubes() {
    const minG = Array.from({ length: numRows }, () => Array(numCols).fill(0));
    // For each column, we need at least one cell with frontTarget[c]
    // For each row, we need at least one cell with rightTarget[r]
    // Strategy: for each constraint, place it at the intersection if possible
    for (let c = 0; c < numCols; c++) {
      // Find best row to place frontTarget[c]
      let placed = false;
      for (let r = 0; r < numRows; r++) {
        if (rightTarget[r] >= frontTarget[c] && minG[r][c] < frontTarget[c]) {
          // Check if this row already has its rightTarget met
          const rowMax = Math.max(...minG[r]);
          if (rowMax < rightTarget[r] && rightTarget[r] === frontTarget[c]) {
            minG[r][c] = frontTarget[c];
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        // Place in first row that allows it
        for (let r = 0; r < numRows; r++) {
          if (frontTarget[c] <= rightTarget[r]) {
            minG[r][c] = Math.max(minG[r][c], frontTarget[c]);
            placed = true;
            break;
          }
        }
        if (!placed) {
          minG[0][c] = Math.max(minG[0][c], frontTarget[c]);
        }
      }
    }
    // Ensure row constraints
    for (let r = 0; r < numRows; r++) {
      const rowMax = Math.max(...minG[r]);
      if (rowMax < rightTarget[r]) {
        // Place in column with highest frontTarget that allows it
        let bestC = 0;
        for (let c = 0; c < numCols; c++) {
          if (frontTarget[c] >= rightTarget[r]) { bestC = c; break; }
        }
        minG[r][bestC] = Math.max(minG[r][bestC], rightTarget[r]);
      }
    }
    return minG.flat().reduce((a, b) => a + b, 0);
  }
  const minCubes = calcMinCubes();

  const updateCell = (r: number, c: number, v: number) => {
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = v;
      return next;
    });
  };

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת בנייה ממבטים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: 8 }}>
        מבט מלפנים: [{frontTarget.join(", ")}] | מבט מימין: [{rightTarget.join(", ")}]
      </p>
      <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", marginBottom: "2rem" }}>שנו את הגבהים ברשת 3×2 ונסו להתאים לשני המבטים הנתונים.</p>

      {/* Target views display */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        <div style={{ borderRadius: 12, border: `1.5px solid ${frontMatch ? "rgba(22,163,74,0.5)" : "rgba(220,38,38,0.3)"}`, background: frontMatch ? "rgba(220,252,231,0.4)" : "rgba(254,242,242,0.4)", padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: frontMatch ? "#16a34a" : "#dc2626", marginBottom: 4 }}>מבט מלפנים {frontMatch ? "✓" : "✗"}</div>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: "#1A1A1A" }}>יעד: [{frontTarget.join(", ")}]</div>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: "#6B7280" }}>בפועל: [{frontActual.join(", ")}]</div>
        </div>
        <div style={{ borderRadius: 12, border: `1.5px solid ${rightMatch ? "rgba(22,163,74,0.5)" : "rgba(220,38,38,0.3)"}`, background: rightMatch ? "rgba(220,252,231,0.4)" : "rgba(254,242,242,0.4)", padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: rightMatch ? "#16a34a" : "#dc2626", marginBottom: 4 }}>מבט מימין {rightMatch ? "✓" : "✗"}</div>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: "#1A1A1A" }}>יעד: [{rightTarget.join(", ")}]</div>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: "#6B7280" }}>בפועל: [{rightActual.join(", ")}]</div>
        </div>
      </div>

      {/* Sliders — 2×3 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "2rem" }}>
        {grid.flatMap((row, r) => row.map((v, c) => (
          <div key={`${r}-${c}`} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", padding: "0.75rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              <span>({r+1},{c+1})</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{v}</span>
            </div>
            <input type="range" min={0} max={4} step={1} value={v} onChange={(e) => updateCell(r, c, +e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        )))}
      </div>

      {/* Status */}
      {bothMatch && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(220,252,231,0.8)", border: "2px solid #16a34a", padding: 14, textAlign: "center", marginBottom: "1.5rem", color: "#14532d", fontWeight: 700, fontSize: 14 }}>
          המבנה מתאים לשני המבטים!
        </motion.div>
      )}

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "מינימום קוביות", val: minCubes.toString() },
          { label: "מקסימום קוביות", val: maxCubes.toString() },
          { label: "קוביות נוכחי", val: totalCubes.toString(), color: bothMatch ? "#16a34a" : "#dc2626" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.color || st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>

      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>ריבוי פתרונות! ניתן למצוא כמה מבנים שונים שמקיימים את אותם שני המבטים.</p>
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
  const [activeTab, setActiveTab] = useState<"view" | "diagram" | "count" | null>(null);

  const tabs = [
    { id: "view" as const, label: "מבט", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "diagram" as const, label: "תרשים מספרים", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "count" as const, label: "ספירה", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
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

      {/* Expanded: View */}
      {activeTab === "view" && (
        <motion.div key="view" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#16A34A", fontSize: 16, fontWeight: 700 }}>
              מבט = הטלה מכיוון אחד
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך עובד מבט?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>מדמיינים שמביטים ישירות מכיוון אחד (מלפנים, מימין, מלמעלה).</li>
                  <li>כל עמודה/שורה באותו כיוון מציגה את <strong>הגובה המקסימלי</strong>.</li>
                  <li>קוביות מוסתרות מאחורי אחרות לא נראות, אבל משפיעות על הגובה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#15803d", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: עמודה עם גבהים 1, 3, 2 — במבט מלפנים נראה גובה 3 (המקסימום).
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Number Diagram */}
      {activeTab === "diagram" && (
        <motion.div key="diagram" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#EA580C", fontSize: 16, fontWeight: 700 }}>
              תרשים מספרים = מפת גבהים
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>מה זה תרשים מספרים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>רשת (לוח) שבה כל תא מכיל מספר.</li>
                  <li>המספר מציין את <strong>גובה עמודת הקוביות</strong> במיקום זה.</li>
                  <li>0 אומר שאין קוביות במיקום הזה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: תא עם 3 = עמודה של 3 קוביות מוערמות. סכום כל התאים = סך כל הקוביות.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded: Count */}
      {activeTab === "count" && (
        <motion.div key="count" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 14, color: "#DC2626", fontSize: 16, fontWeight: 700 }}>
              סה״כ קוביות = סכום כל הגבהים
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך סופרים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סוכמים את כל המספרים בתרשים המספרים.</li>
                  <li>כל מספר הוא מספר הקוביות בעמודה אחת.</li>
                  <li>שימו לב: מבט לא מספיק לספירה! צריך את תרשים המספרים המלא.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                דוגמה: תרשים 2,1,0 / 3,2,1 / 1,1,0 = 2+1+0+3+2+1+1+1+0 = 11 קוביות.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CubesAndViewsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>קוביות ומבטים עם AI — כיתה יב׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מבטים, תרשימי מספרים, בנייה ממבטים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/3u/topic/grade12/spatial"
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

        <SubtopicProgress subtopicId="3u/grade12/spatial/cubes" />

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
        {selectedLevel === "basic" && <ViewsLab />}
        {selectedLevel === "medium" && <NumberDiagramLab />}
        {selectedLevel === "advanced" && <BuildFromViewsLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade12/spatial/cubes" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
