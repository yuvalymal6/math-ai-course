"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";

// ─── Global CSS ───────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  textarea:focus, input[type="text"]:focus {
    outline: 2px solid rgba(var(--lvl-rgb), 0.55);
    outline-offset: 1px;
    border-color: rgba(var(--lvl-rgb), 0.5) !important;
  }
  button:focus-visible {
    outline: 2px solid rgba(var(--lvl-rgb), 0.55);
    outline-offset: 2px;
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  prompt?: string;
  contextWords?: string[];
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  title: string;
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
  subjectWords?: string[];
  subjectHint?: string;
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { badge: "בסיסי",  badgeCls: "bg-green-600 text-white",  glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",   accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { badge: "בינוני", badgeCls: "bg-orange-600 text-white", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12",  accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38",  accentColor: "#DC2626", borderRgb: "139,38,53"  },
} as const;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic"    as const, label: "בסיסי — ממוצע, חציון, שכיח",       bg: "bg-green-50",  border: "border-green-600",  textColor: "text-green-700",  glowColor: "rgba(22,163,74,0.3)"  },
  { id: "medium"   as const, label: "בינוני — נתונים מקובצים",           bg: "bg-orange-50", border: "border-orange-600", textColor: "text-orange-700", glowColor: "rgba(234,88,12,0.3)"  },
  { id: "advanced" as const, label: "מתקדם — טרנספורמציה לינארית",       bg: "bg-red-50",    border: "border-red-700",    textColor: "text-red-700",    glowColor: "rgba(220,38,38,0.3)"  },
] as const;

// ─── Formulas ─────────────────────────────────────────────────────────────────

const FORMULAS = [
  { label: "ממוצע",          formula: "Σxᵢ / n" },
  { label: "חציון",          formula: "ערך מרכזי" },
  { label: "שכיח",           formula: "נפוץ ביותר" },
  { label: "טרנספורמציה",   formula: "aX+b: μ→a·μ+b, σ→|a|·σ" },
];

// ─── FormulaBar ───────────────────────────────────────────────────────────────

function FormulaBar({ accentColor, accentRgb }: { accentColor: string; accentRgb: string }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1rem 1.25rem", marginBottom: "1.5rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem", justifyContent: "center" }}>
        {FORMULAS.map((f, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ color: "#6B7280", fontSize: 10 }}>{f.label}</span>
            <span style={{ color: accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{f.formula}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Static spoiler-free diagrams ─────────────────────────────────────────────

function DiagramRawData() {
  const scores = [7, 3, 8, 5, 9, 3, 6];
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#a78bfa", "#f43f5e", "#06b6d4", "#84cc16"];
  return (
    <div className="flex flex-wrap gap-2 justify-center py-2">
      {scores.map((s, i) => (
        <div
          key={i}
          className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow-sm"
          style={{ background: colors[i] + "22", border: `2px solid ${colors[i]}`, color: colors[i] }}
        >
          {s}
        </div>
      ))}
    </div>
  );
}

function DiagramFreqTable() {
  const rows = [
    { range: "[60−70)", freq: "" },
    { range: "[70−80)", freq: "" },
    { range: "[80−90)", freq: "" },
    { range: "[90−100]", freq: "" },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center border-collapse text-sm" style={{ border: "1px solid #e2e8f0" }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {["רווח", "שכיחות f", "מרכז רווח", "f × מרכז"].map(h => (
              <th key={h} className="px-4 py-2 font-bold text-xs tracking-wide" style={{ border: "1px solid #e2e8f0", color: "#475569" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
              <td className="px-4 py-2 font-semibold" style={{ border: "1px solid #e2e8f0", color: "#1e293b" }}>{r.range}</td>
              <td className="px-4 py-2 font-mono" style={{ border: "1px solid #e2e8f0", color: "#94a3b8" }}>—</td>
              <td className="px-4 py-2 font-mono" style={{ border: "1px solid #e2e8f0", color: "#94a3b8" }}>—</td>
              <td className="px-4 py-2 font-mono" style={{ border: "1px solid #e2e8f0", color: "#94a3b8" }}>—</td>
            </tr>
          ))}
          <tr style={{ background: "#f1f5f9" }}>
            <td className="px-4 py-2 text-xs font-bold" style={{ border: "1px solid #e2e8f0", color: "#64748b" }}>סה&quot;כ</td>
            <td className="px-4 py-2 font-mono" style={{ border: "1px solid #e2e8f0", color: "#94a3b8" }}>—</td>
            <td className="px-4 py-2" style={{ border: "1px solid #e2e8f0" }}></td>
            <td className="px-4 py-2 font-mono" style={{ border: "1px solid #e2e8f0", color: "#94a3b8" }}>—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DiagramTransform() {
  return (
    <svg viewBox="0 0 280 90" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* X axis */}
      <line x1={20} y1={55} x2={260} y2={55} stroke="#94a3b8" strokeWidth={1.5} />
      <polygon points="260,51 272,55 260,59" fill="#94a3b8" />
      <text x={14} y={59} fill="#64748b" fontSize={11} fontWeight="bold">X</text>
      {/* Original dots */}
      {[70, 100, 130, 160].map((x, i) => (
        <circle key={i} cx={x} cy={55} r={8} fill="#3b82f622" stroke="#3b82f6" strokeWidth={2} />
      ))}
      {/* Shift arrow */}
      <line x1={80} y1={32} x2={160} y2={32} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 2" />
      <polygon points="160,28 170,32 160,36" fill="#16a34a" />
      <text x={115} y={26} fill="#16a34a" fontSize={10} textAnchor="middle" fontWeight="600">+ b →</text>
      {/* scale bracket */}
      <text x={204} y={26} fill="#dc2626" fontSize={10} textAnchor="middle" fontWeight="600">× a</text>
      <line x1={180} y1={32} x2={228} y2={32} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 2" />
    </svg>
  );
}

// ─── MeanBalancer Lab ─────────────────────────────────────────────────────────

const MB_N = 5, MB_MAX = 15;
const MB_SVG_W = 340, MB_SVG_H = 230;
const MB_PAD_L = 34, MB_PAD_R = 60, MB_PAD_T = 18, MB_PAD_B = 52;
const MB_IW = MB_SVG_W - MB_PAD_L - MB_PAD_R;
const MB_IH = MB_SVG_H - MB_PAD_T - MB_PAD_B;
const MB_SLOT = MB_IW / MB_N;
const MB_BAR_W = Math.round(MB_SLOT * 0.62);
const MB_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a78bfa", "#f43f5e"];
const MB_TICKS = [0, 3, 6, 9, 12, 15];

const mbToY  = (v: number) => MB_PAD_T + MB_IH * (1 - v / MB_MAX);
const mbBarX = (i: number) => MB_PAD_L + i * MB_SLOT + (MB_SLOT - MB_BAR_W) / 2;

function computeMean(vals: number[]) { return vals.reduce((a, b) => a + b, 0) / vals.length; }
function computeMedianArr(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function MeanBalancerLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const st = STATION[levelId];
  const [vals, setVals] = useState<number[]>([4, 8, 6, 3, 10]);
  const drag = useRef<{ idx: number; startY: number; startV: number } | null>(null);

  const mean   = computeMean(vals);
  const median = computeMedianArr(vals);
  const meanY  = mbToY(mean);
  const medianY = mbToY(median);
  const synced = Math.abs(mean - median) < 0.6;
  const baseline = MB_PAD_T + MB_IH;

  useEffect(() => {
    if (!drag.current) return;
    const { idx, startY, startV } = drag.current;
    const pxPerUnit = MB_IH / MB_MAX;
    function onMove(e: PointerEvent) {
      const dv = -(e.clientY - startY) / pxPerUnit;
      const newV = Math.min(MB_MAX, Math.max(0, Math.round((startV + dv) * 2) / 2));
      setVals(prev => { const next = [...prev]; next[idx] = newV; return next; });
    }
    function onUp() { drag.current = null; }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [drag.current?.idx]);

  return (
    <section style={{ borderRadius: "40px", border: `1px solid ${st.glowBorder}`, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: st.glowShadow, marginBottom: "2rem" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", marginBottom: "0.75rem" }}>מאזן מדדי מרכז — אינטראקטיבי</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
        גרור את העמודות וצפה איך <span style={{ color: "#f59e0b", fontWeight: 600 }}>הממוצע (μ)</span> ו<span style={{ color: synced ? "#22c55e" : "#a78bfa", fontWeight: 600 }}>החציון (M)</span> מגיבים.
        כאשר הם מסונכרנים, הנתונים סימטריים.
      </p>
      <div style={{ borderRadius: 12, background: "#0f172a", border: "1px solid #334155", overflow: "hidden", padding: 12, overflowX: "auto" }}>
        <svg
          width={MB_SVG_W} height={MB_SVG_H}
          viewBox={`0 0 ${MB_SVG_W} ${MB_SVG_H}`}
          style={{ maxWidth: "100%", touchAction: "none", userSelect: "none" }}
        >
          {/* Y-axis */}
          <line x1={MB_PAD_L} y1={MB_PAD_T} x2={MB_PAD_L} y2={baseline} stroke="#334155" strokeWidth={1} />
          {MB_TICKS.map(t => (
            <g key={t}>
              <line x1={MB_PAD_L - 4} y1={mbToY(t)} x2={MB_PAD_L} y2={mbToY(t)} stroke="#475569" strokeWidth={1} />
              <text x={MB_PAD_L - 7} y={mbToY(t) + 4} textAnchor="end" fill="#64748b" fontSize={9}>{t}</text>
              <line x1={MB_PAD_L} y1={mbToY(t)} x2={MB_PAD_L + MB_IW} y2={mbToY(t)} stroke="#1e293b" strokeWidth={0.5} />
            </g>
          ))}
          {/* Baseline */}
          <line x1={MB_PAD_L} y1={baseline} x2={MB_PAD_L + MB_IW} y2={baseline} stroke="#334155" strokeWidth={1.5} />
          {/* Bars */}
          {vals.map((v, i) => {
            const bx = mbBarX(i);
            const by = mbToY(v);
            const bh = Math.max(0, baseline - by);
            const active = drag.current?.idx === i;
            return (
              <g key={i} style={{ cursor: "ns-resize" }}
                onPointerDown={e => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = { idx: i, startY: e.clientY, startV: v };
                }}
              >
                <rect x={bx} y={by} width={MB_BAR_W} height={bh} rx={3}
                  fill={active ? MB_COLORS[i] : MB_COLORS[i] + "cc"}
                  stroke={MB_COLORS[i]} strokeWidth={active ? 2.5 : 1.5} />
                <text x={bx + MB_BAR_W / 2} y={baseline + 16} textAnchor="middle"
                  fill={active ? "#fff" : MB_COLORS[i]} fontSize={10} fontWeight="bold"
                  style={{ pointerEvents: "none" }}>{v}</text>
                <text x={bx + MB_BAR_W / 2} y={baseline + 30} textAnchor="middle"
                  fill="#64748b" fontSize={9} style={{ pointerEvents: "none" }}>x{i + 1}</text>
              </g>
            );
          })}
          {/* Mean line — amber dashed */}
          <line x1={MB_PAD_L} y1={meanY} x2={MB_PAD_L + MB_IW} y2={meanY}
            stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />
          <text x={MB_PAD_L + MB_IW + 5} y={meanY + 4}
            fill="#f59e0b" fontSize={9} fontWeight="700">μ={mean.toFixed(1)}</text>
          {/* Median line — violet or green */}
          <line x1={MB_PAD_L} y1={medianY} x2={MB_PAD_L + MB_IW} y2={medianY}
            stroke={synced ? "#22c55e" : "#a78bfa"} strokeWidth={2.5} />
          <text x={MB_PAD_L + MB_IW + 5} y={medianY + 4}
            fill={synced ? "#22c55e" : "#a78bfa"} fontSize={9} fontWeight="700">M={median.toFixed(1)}</text>
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
          <p style={{ color: "#92400e", fontSize: 12, marginBottom: 4, fontWeight: 600 }}>ממוצע (μ)</p>
          <p style={{ color: "#1A1A1A", fontWeight: 700, fontSize: 16 }}>{mean.toFixed(2)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: `1px solid ${synced ? "#22c55e" : "#a78bfa"}55`, borderRadius: 12, padding: "12px 16px", textAlign: "center", transition: "border-color 0.5s" }}>
          <p style={{ color: synced ? "#15803d" : "#7c3aed", fontSize: 12, marginBottom: 4, fontWeight: 600, transition: "color 0.5s" }}>
            חציון (M){synced ? " — מסונכרן!" : ""}
          </p>
          <p style={{ color: "#1A1A1A", fontWeight: 700, fontSize: 16 }}>{median.toFixed(2)}</p>
        </div>
      </div>
      <div style={{ border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: "12px 16px", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#64748b" }}>
          <svg width={24} height={8}><line x1={0} y1={4} x2={24} y2={4} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" /></svg>
          <span style={{ color: "#92400e", fontWeight: 600 }}>ממוצע (μ) — מושפע מחריגים</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#64748b", marginTop: 8 }}>
          <svg width={24} height={8}><line x1={0} y1={4} x2={24} y2={4} stroke={synced ? "#22c55e" : "#a78bfa"} strokeWidth={2.5} /></svg>
          <span style={{ color: synced ? "#15803d" : "#7c3aed", fontWeight: 600 }}>חציון (M) — עמיד לחריגים</span>
        </div>
      </div>
    </section>
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
  const [done, setDone] = useState(false);
  const prompt = step.prompt ?? "";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
        {done && <CheckCircle size={14} color="#34d399" style={{ marginRight: "auto" }} />}
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{prompt}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CopyBtn text={prompt} label="העתק פרומפט ממוקד" />
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: done ? "#16a34a" : "#6B7280", fontWeight: done ? 600 : 400 }}>
            <input type="checkbox" checked={done} onChange={e => setDone(e.target.checked)} style={{ accentColor: "#16a34a" }} />
            סיימתי עם AI
          </label>
        </div>
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
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
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
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
        {result?.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            ⚠️ {result.hint}
          </motion.div>
        )}
        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            💡 {result.hint}
          </motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
            ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
          </motion.div>
        )}
        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
        )}
      </div>
    </div>
  );
}

// ─── Ladders ──────────────────────────────────────────────────────────────────

function LadderBase({ ex, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const st = STATION[ex.id];
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
      <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
      <GoldenPromptCard prompt={ex.goldenPrompt} title="פרומפט ראשי" glowRgb={accentRgb} borderRgb={st.borderRgb} />
      {ex.steps.map((s, i) => (
        <TutorStepBasic key={i} step={s} glowRgb={accentRgb} borderRgb={st.borderRgb} />
      ))}
    </div>
  );
}

function LadderMedium({ ex, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const st = STATION[ex.id];
  const [passed, setPassed] = useState<boolean[]>(Array(ex.steps.length).fill(false));
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
      <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
      <GoldenPromptCard prompt={ex.goldenPrompt} glowRgb={accentRgb} borderRgb={st.borderRgb} />
      <div style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "1px solid rgba(217,119,6,0.3)", padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
        💡 כאן תרגל לנסח פרומפטים בעצמך לכל שלב
      </div>
      {ex.steps.map((s, i) => (
        <TutorStepMedium
          key={i} step={s}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
          borderRgb={st.borderRgb}
        />
      ))}
    </div>
  );
}

function LadderAdvanced({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const st = STATION[ex.id];
  const [masterPassed, setMasterPassed] = useState(false);
  const [stepsPassed, setStepsPassed] = useState<boolean[]>(Array(ex.steps.length).fill(false));
  const allPassed = stepsPassed.every(Boolean) && masterPassed;

  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
      <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor={accentColor}
        accentRgb={accentRgb}
        subjectWords={ex.subjectWords}
        subjectHint={ex.subjectHint}
        requiredPhrase="סרוק נתונים ועצור"
      />
      {masterPassed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
          {ex.steps.map((s, i) => (
            <TutorStepMedium
              key={i} step={s}
              locked={i > 0 && !stepsPassed[i - 1]}
              onPass={() => setStepsPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
              borderRgb={st.borderRgb}
            />
          ))}
          {allPassed && (
            <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1rem 1.5rem", marginTop: 16, textAlign: "center" }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <p style={{ color: "#14532d", fontWeight: 700, fontSize: 15, margin: "4px 0 0" }}>מאסטר בטרנספורמציות — E(Y)=80, SD(Y)=8 (לא השתנה!), SD(Z)=8.8!</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise data ─────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "מדדי מרכז — ממוצע, חציון ושכיח",
    problem:
      "נתונה רשימת ציונים גולמיים: 7, 3, 8, 5, 9, 3, 6.\n" +
      "(א) סדר את הנתונים ומלא טבלת שכיחויות.\n" +
      "(ב) חשב את ממוצע הציונים.\n" +
      "(ג) מצא את חציון הציונים והסבר את משמעותו.\n" +
      "(ד) קבע מהו הציון השכיח.",
    diagram: (
      <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>הציונים הגולמיים — לא ממוינים</p>
        <DiagramRawData />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>מיין מהקטן לגדול לפני מציאת החציון</p>
      </div>
    ),
    pitfalls: [
      { title: "⚠️ מיין לפני חציון", text: "חציון מחושב אחרי מיון. אל תחשב על רשימה לא ממוינת." },
      { title: "זוגי / אי-זוגי", text: "7 ערכים (אי-זוגי) → החציון הוא הערך האמצעי (מקום 4 אחרי מיון)." },
      { title: "שכיח ≠ ממוצע", text: "השכיח הוא הערך הנפוץ ביותר — אינו חייב להיות קרוב לממוצע." },
    ],
    goldenPrompt:
      "\n\nאני תלמיד ורוצה לחשב מדדי מרכז:\n" +
      "ציונים: 7, 3, 8, 5, 9, 3, 6.\n" +
      "נחה אותי:\n" +
      "1. כיצד למיין ולבנות טבלת שכיחויות?\n" +
      "2. כיצד לחשב ממוצע?\n" +
      "3. כיצד למצוא חציון?\n" +
      "4. כיצד למצוא שכיח?\n" +
      "שאל \"מוכן?\" אחרי כל שלב.",
    steps: [
      { phase: "שלב א׳", label: "מיון וטבלת שכיחויות", prompt: "\n\nמיין: 7,3,8,5,9,3,6 מהקטן לגדול. כמה פעמים מופיע כל ציון?" },
      { phase: "שלב ב׳", label: "ממוצע", prompt: "\n\n3+3+5+6+7+8+9 = ? חלק ב-7. מהו הממוצע?" },
      { phase: "שלב ג׳", label: "חציון", prompt: "\n\nממוין: 3,3,5,6,7,8,9. מהו הערך במקום ה-4? מה פירושו?" },
      { phase: "שלב ד׳", label: "שכיח", prompt: "\n\nמי מופיע יותר מפעם אחת בטבלת השכיחויות? זהו השכיח." },
    ],
  },
  {
    id: "medium",
    title: "ממוצע וחציון מטבלת תדירויות",
    problem:
      "נתונה טבלת תדירויות: [60−70): 8, [70−80): 12, [80−90): 15, [90−100]: 5.\n" +
      "(א) כמה תלמידים נבחנו בסך הכול?\n" +
      "(ב) חשב את הממוצע המשוקלל.\n" +
      "(ג) בנה תדירות מצטברת ומצא את חציון הכיתה.\n" +
      "(ד) הסבר את ההבדל בין ממוצע לחציון במקרה זה.",
    diagram: (
      <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 8 }}>מלא את הטבלה — אמצע הרווח הוא 65, 75, 85, 95</p>
        <DiagramFreqTable />
      </div>
    ),
    pitfalls: [
      { title: "⚠️ אמצע רווח", text: "ממוצע מחושב עם אמצע כל רווח: 65, 75, 85, 95 — לא קצוות." },
      { title: "תדירות מצטברת", text: "החציון נמצא לפי ערך ה-20 (N/2=40/2). בנה עמודת תדירות מצטברת." },
      { title: "אינטרפולציה", text: "חציון = L + [(N/2 − F) / f] × h. רשום את כל האיברים." },
    ],
    goldenPrompt:
      "\n\nאני תלמיד ורוצה לחשב ממוצע וחציון מטבלת תדירויות:\n" +
      "[60-70):8, [70-80):12, [80-90):15, [90-100]:5.\n" +
      "נחה אותי:\n" +
      "1. כיצד לחשב ממוצע משוקלל עם אמצע רווח?\n" +
      "2. כיצד לבנות תדירות מצטברת?\n" +
      "3. כיצד לחשב חציון עם אינטרפולציה?\n" +
      "שאל \"מוכן?\" אחרי כל שלב.",
    steps: [
      { phase: "שלב א׳", label: "סך הכול תלמידים", contextWords: ["N", "40", "8", "12", "15", "5", "סכום", "תלמידים"] },
      { phase: "שלב ב׳", label: "ממוצע משוקלל",    contextWords: ["ממוצע", "79.25", "65", "75", "85", "95", "3170", "40"] },
      { phase: "שלב ג׳", label: "תדירות מצטברת וחציון", contextWords: ["חציון", "80", "20", "תדירות", "מצטברת", "אינטרפולציה"] },
      { phase: "שלב ד׳", label: "ממוצע לעומת חציון",  contextWords: ["ממוצע", "חציון", "סימטרי", "79.25", "80", "פיזור"] },
    ],
  },
  {
    id: "advanced",
    title: "השפעת aX + b על מדדי מרכז",
    problem:
      "נתוני ציונים: ממוצע=75, חציון=77, ס.ת=8.\n" +
      "(א) המורה מוסיפה 5 נקודות לכולם (Y = X + 5). מה ממוצע, חציון וס.ת של Y?\n" +
      "(ב) מנהל ביה\"ס מכפיל ב-1.1 (Z = 1.1X). מה ממוצע, חציון וס.ת של Z?\n" +
      "(ג) איזו שיטה הוגנת יותר לתלמידים חלשים ומדוע?\n" +
      "(ד) נסח את הכלל הכללי עבור Y = aX + b.",
    diagram: (
      <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>הוספת b — הזזה | כפל ב-a — מתיחה</p>
        <DiagramTransform />
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>→ +b (הזזה)</span>
          <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>↔ ×a (מתיחה)</span>
        </div>
      </div>
    ),
    pitfalls: [
      { title: "⚠️ הוספה vs כפל", text: "הוספת קבוע: ממוצע וחציון עולים, ס.ת לא משתנה. כפל: שלושתם מוכפלים." },
      { title: "סטיית תקן וכפל", text: "SD(aX+b) = |a|·SD(X). b נעלם לחלוטין מהפיזור!" },
      { title: "הוגנות חברתית", text: "Y=X+5: כולם מרוויחים אותו סכום. Z=1.1X: תלמיד חזק מרוויח יותר." },
    ],
    goldenPrompt: "\n\n",
    subjectWords: ["ממוצע", "חציון", "טרנספורמציה", "aX", "b", "הוספה", "כפל", "מרכז"],
    subjectHint: "ממוצע / חציון / טרנספורמציה / aX+b",
    steps: [
      { phase: "שלב א׳", label: "Y = X + 5",             contextWords: ["ממוצע", "80", "82", "ס.ת", "8", "Y", "הוספה", "לא השתנה"] },
      { phase: "שלב ב׳", label: "Z = 1.1X",              contextWords: ["ממוצע", "82.5", "84.7", "ס.ת", "8.8", "Z", "כפל", "1.1"] },
      { phase: "שלב ג׳", label: "הוגנות",               contextWords: ["הוגן", "50", "55", "90", "99", "שווה", "מרוויח"] },
      { phase: "שלב ד׳", label: "כלל כללי aX + b",      contextWords: ["כלל", "aX", "b", "SD", "ממוצע", "פיזור", "מיקום"] },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatisticsCentralPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";
  const st = STATION[selectedLevel];

  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+סעיף/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#F3EFE0",
        backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        color: "#2D3436",
        ["--lvl-rgb" as string]: lvlRgb,
      }}
    >
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מדדי מרכז עם AI</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>ממוצע, חציון ושכיח — מציאת המרכז של הנתונים</p>
          </div>
          <Link
            href="/topic/statistics"
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

        {/* Tab selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedLevel(tab.id)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active exercise island */}
        <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginBottom: "2rem" }}>

          {/* Station badge + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${st.badgeCls}`}>{st.badge}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#1A1A1A" }}>{ex.title}</span>
          </div>

          <FormulaBar accentColor={st.accentColor} accentRgb={st.glowRgb} />

          {/* Diagram */}
          <div style={{ borderRadius: 16, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: 12, marginBottom: "1.5rem" }}>
            {ex.diagram}
          </div>

          {/* Problem */}
          <div style={{ borderRadius: 16, border: `1px solid rgba(${st.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
              <button
                onClick={handleCopyProblem}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}
              >
                {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
                {copiedProblem ? "הועתק!" : "העתק"}
              </button>
            </div>
            <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
          </div>

          {/* Pitfalls */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>
            {ex.pitfalls.map((p, i) => (
              <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
                <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
                {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
              </div>
            ))}
          </div>

          {/* Ladder */}
          {selectedLevel === "basic"    && <LadderBase     ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
          {selectedLevel === "medium"   && <LadderMedium   ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
          {selectedLevel === "advanced" && <LadderAdvanced ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
        </section>

        {/* Lab */}
        <MeanBalancerLab levelId={selectedLevel} />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/statistics/central" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
