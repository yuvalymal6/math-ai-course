"use client";

import { useState } from "react";
import { Check, Copy, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";

// ─── Global style ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `*:focus{outline:none!important;box-shadow:none!important;}`;

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  prompt?: string;
  contextWords?: string[];
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic: {
    stationName: "תחנה ראשונה", badge: "מתחיל",
    badgeCls: "bg-green-600 text-white", accentCls: "text-green-700",
    glowBorder: "rgba(22,163,74,0.35)", glowShadow: "0 4px 16px rgba(22,163,74,0.12)",
    glowRgb: "22,163,74", accentColor: "#16A34A", borderRgb: "45,90,39",
  },
  medium: {
    stationName: "תחנה שנייה", badge: "בינוני",
    badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700",
    glowBorder: "rgba(234,88,12,0.35)", glowShadow: "0 4px 16px rgba(234,88,12,0.12)",
    glowRgb: "234,88,12", accentColor: "#EA580C", borderRgb: "163,79,38",
  },
  advanced: {
    stationName: "תחנה שלישית", badge: "מתקדם",
    badgeCls: "bg-red-700 text-white", accentCls: "text-red-700",
    glowBorder: "rgba(220,38,38,0.35)", glowShadow: "0 4px 16px rgba(220,38,38,0.12)",
    glowRgb: "220,38,38", accentColor: "#DC2626", borderRgb: "139,38,53",
  },
} as const;

const TABS: { id: "basic" | "medium" | "advanced"; label: string }[] = [
  { id: "basic",    label: "תחנה א׳ — מתחיל" },
  { id: "medium",   label: "תחנה ב׳ — בינוני" },
  { id: "advanced", label: "תחנה ג׳ — מתקדם" },
];

const REGRESSION_SUBJECT_WORDS = [
  "רגרסיה", "מתאם", "ישר", "שיפוע", "ניבוי", "שונות", "r", "סטייה",
];

// ─── Silent SVG Diagrams ─────────────────────────────────────────────────────

function ScatterBasic() {
  const S = 180;
  const dots = [
    { x: 30, y: 140 }, { x: 50, y: 115 }, { x: 75, y: 100 },
    { x: 100, y: 80 }, { x: 130, y: 55 }, { x: 155, y: 35 },
  ];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[210px] mx-auto" aria-hidden>
      {/* axes */}
      <line x1={20} y1={160} x2={170} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={20} y1={160} x2={20} y2={10} stroke="#94a3b8" strokeWidth={1.2} />
      {/* axis labels */}
      <text x={170} y={175} fontSize={11} fill="#64748b" textAnchor="end">x</text>
      <text x={10} y={15} fontSize={11} fill="#64748b" textAnchor="middle">y</text>
      {/* dots */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={4} fill="#3b82f6" opacity={0.8} />
      ))}
      {/* dashed regression line */}
      <line x1={22} y1={148} x2={165} y2={28} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="5 3" />
    </svg>
  );
}

function ScatterMedium() {
  const S = 180;
  const dots = [
    { x: 25, y: 145 }, { x: 40, y: 125 }, { x: 55, y: 118 },
    { x: 70, y: 95 }, { x: 90, y: 88 }, { x: 110, y: 65 },
    { x: 135, y: 50 }, { x: 155, y: 30 },
  ];
  // regression line endpoints
  const ly1 = 152, ly2 = 22;
  const lx1 = 20, lx2 = 165;
  // compute y on line for dot at x=90
  const lineYat90 = ly1 + ((90 - lx1) / (lx2 - lx1)) * (ly2 - ly1);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[210px] mx-auto" aria-hidden>
      <line x1={20} y1={160} x2={170} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={20} y1={160} x2={20} y2={10} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={170} y={175} fontSize={11} fill="#64748b" textAnchor="end">x</text>
      <text x={10} y={15} fontSize={11} fill="#64748b" textAnchor="middle">y</text>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={4} fill="#3b82f6" opacity={0.8} />
      ))}
      {/* regression line */}
      <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="5 3" />
      {/* residual line for one dot */}
      <line x1={90} y1={88} x2={90} y2={lineYat90} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="3 2" />
      {/* labels */}
      <text x={96} y={(88 + lineYat90) / 2} fontSize={9} fill="#a78bfa" fontWeight={700}>e</text>
      <text x={93} y={lineYat90 + 10} fontSize={9} fill="#f59e0b" fontWeight={600}>y&#x0302;</text>
    </svg>
  );
}

function ScatterAdvanced() {
  const S = 180;
  const dots = [
    { x: 25, y: 140 }, { x: 40, y: 90 }, { x: 55, y: 55 },
    { x: 70, y: 35 }, { x: 90, y: 30 }, { x: 110, y: 38 },
    { x: 135, y: 65 }, { x: 155, y: 110 },
  ];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[210px] mx-auto" aria-hidden>
      <line x1={20} y1={160} x2={170} y2={160} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={20} y1={160} x2={20} y2={10} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={170} y={175} fontSize={11} fill="#64748b" textAnchor="end">x</text>
      <text x={10} y={15} fontSize={11} fill="#64748b" textAnchor="middle">y</text>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={4} fill="#3b82f6" opacity={0.8} />
      ))}
      {/* linear fit — bad fit */}
      <line x1={20} y1={105} x2={165} y2={65} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4 3" />
      {/* curved fit — good fit */}
      <path d="M 22 145 Q 70 15 165 115" fill="none" stroke="#34d399" strokeWidth={1.8} strokeDasharray="5 3" />
    </svg>
  );
}

// ─── RegressionLab ───────────────────────────────────────────────────────────

const LAB_DATA = [
  { x: 1, y: 2.1 }, { x: 2, y: 3.8 }, { x: 3, y: 5.2 },
  { x: 4, y: 6.5 }, { x: 5, y: 8.9 }, { x: 6, y: 10.1 },
  { x: 7, y: 12.8 }, { x: 8, y: 14.2 },
];

function RegressionLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [slope, setSlope] = useState(1.5);
  const [intercept, setIntercept] = useState(0.5);
  const st = STATION[levelId];

  const n = LAB_DATA.length;
  const xMean = LAB_DATA.reduce((s, d) => s + d.x, 0) / n;
  const yMean = LAB_DATA.reduce((s, d) => s + d.y, 0) / n;

  // compute r² for current slope/intercept
  const ssTot = LAB_DATA.reduce((s, d) => s + (d.y - yMean) ** 2, 0);
  const ssRes = LAB_DATA.reduce((s, d) => {
    const yHat = intercept + slope * d.x;
    return s + (d.y - yHat) ** 2;
  }, 0);
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const yHatMean = intercept + slope * xMean;

  // SVG dimensions
  const S = 260;
  const pad = 30;
  const xMin = 0, xMax = 10, yMin = -2, yMax = 18;
  const toSx = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (S - 2 * pad);
  const toSy = (y: number) => (S - pad) - ((y - yMin) / (yMax - yMin)) * (S - 2 * pad);

  return (
    <section style={{
      border: "1px solid rgba(0,0,0,0.1)", borderRadius: 24, padding: "2.5rem",
      background: "rgba(255,255,255,0.82)", marginBottom: "2rem",
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: st.accentColor, textAlign: "center", marginBottom: 16 }}>
        מעבדת רגרסיה לינארית
      </h3>
      <p style={{ textAlign: "center", fontSize: 13, fontFamily: "monospace", color: "#334155", marginBottom: 16, direction: "ltr" }}>
        y&#x0302; = {intercept.toFixed(1)} + {slope.toFixed(1)}x
      </p>

      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {/* grid */}
        {[0, 2, 4, 6, 8, 10].map(v => {
          const sx = toSx(v);
          return <line key={`gx${v}`} x1={sx} y1={pad} x2={sx} y2={S - pad} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} />;
        })}
        {[0, 4, 8, 12, 16].map(v => {
          const sy = toSy(v);
          return <line key={`gy${v}`} x1={pad} y1={sy} x2={S - pad} y2={sy} stroke="rgba(100,116,139,0.15)" strokeWidth={0.6} />;
        })}
        {/* axes */}
        <line x1={pad} y1={S - pad} x2={S - pad} y2={S - pad} stroke="#94a3b8" strokeWidth={1.2} />
        <line x1={pad} y1={S - pad} x2={pad} y2={pad} stroke="#94a3b8" strokeWidth={1.2} />
        {/* axis labels */}
        <text x={S - pad} y={S - pad + 16} fontSize={11} fill="#64748b" textAnchor="end">x</text>
        <text x={pad - 8} y={pad} fontSize={11} fill="#64748b" textAnchor="middle">y</text>
        {/* data dots */}
        {LAB_DATA.map((d, i) => (
          <circle key={i} cx={toSx(d.x)} cy={toSy(d.y)} r={5} fill="#3b82f6" opacity={0.8} />
        ))}
        {/* residual lines */}
        {LAB_DATA.map((d, i) => {
          const yHat = intercept + slope * d.x;
          return (
            <line key={`r${i}`} x1={toSx(d.x)} y1={toSy(d.y)} x2={toSx(d.x)} y2={toSy(yHat)}
              stroke="#a78bfa" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
          );
        })}
        {/* regression line */}
        <line
          x1={toSx(xMin)} y1={toSy(intercept + slope * xMin)}
          x2={toSx(xMax)} y2={toSy(intercept + slope * xMax)}
          stroke={st.accentColor} strokeWidth={2.5} />
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
          <span style={{ color: "#334155" }}>נתונים</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 20, borderTop: `2.5px solid ${st.accentColor}`, display: "inline-block" }} />
          <span style={{ color: st.accentColor }}>ישר רגרסיה</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 20, borderTop: "1.5px dashed #a78bfa", display: "inline-block" }} />
          <span style={{ color: "#7c3aed" }}>שאריות</span>
        </span>
      </div>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 8px", marginBottom: 20 }}>
        {([
          { label: "שיפוע b", val: slope, set: setSlope, min: -2, max: 2, step: 0.1, color: st.accentColor },
          { label: "חותך a", val: intercept, set: setIntercept, min: -10, max: 10, step: 0.5, color: "#7c3aed" },
        ] as const).map(({ label, val, set, min, max, step, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              <span>{label}</span><span style={{ color, fontWeight: 700 }}>{val.toFixed(1)}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={val}
              onChange={e => (set as (v: number) => void)(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: color } as React.CSSProperties} />
          </div>
        ))}
      </div>

      {/* Data tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, textAlign: "center", fontSize: 12, marginBottom: 16 }}>
        {[
          { label: "שיפוע b", val: slope.toFixed(2), color: st.accentColor },
          { label: "חותך a", val: intercept.toFixed(1), color: "#7c3aed" },
          { label: "r\u00B2", val: rSquared.toFixed(3), color: rSquared > 0.8 ? "#16a34a" : rSquared > 0.5 ? "#d97706" : "#dc2626" },
          { label: "y\u0302(x\u0304)", val: yHatMean.toFixed(2), color: "#334155" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Bottom label */}
      <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", fontStyle: "italic" }}>
        ככל ש-r&sup2; קרוב ל-1, הישר מסביר יותר מהשונות
      </p>
    </section>
  );
}

// ─── CopyBtn ──────────────────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט", accentRgb }: { text: string; label?: string; accentRgb: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.8)", border: `1.5px solid rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "הועתק!" : label}
    </button>
  );
}

// ─── GoldenPromptCard ─────────────────────────────────────────────────────────

function GoldenPromptCard({ prompt, accentColor, accentRgb }: { prompt: string; accentColor: string; accentRgb: string }) {
  return (
    <div style={{ borderRadius: 16, border: `1.5px solid rgba(${accentRgb},0.4)`, background: `rgba(${accentRgb},0.06)`, padding: "1.2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>✨</span>
        <span style={{ color: accentColor, fontWeight: 700, fontSize: 13 }}>פרומפט ראשי — העתק לAI שלך</span>
      </div>
      <div style={{ borderRadius: 10, border: "1px solid rgba(100,116,139,0.25)", background: "rgba(255,255,255,0.75)", padding: "10px 14px", fontSize: 12, color: "#1e293b", fontFamily: "monospace", lineHeight: 1.65, marginBottom: 10, direction: "rtl" }}>
        {prompt}
      </div>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" accentRgb={accentRgb} />
    </div>
  );
}

// ─── TutorStepBasic ───────────────────────────────────────────────────────────

function TutorStepBasic({ step, index, accentColor, accentRgb }: { step: PromptStep; index: number; accentColor: string; accentRgb: string }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ borderRadius: 16, border: `1px solid rgba(${accentRgb},0.25)`, background: done ? `rgba(${accentRgb},0.06)` : "rgba(255,255,255,0.7)", padding: "1rem 1.2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: done ? accentColor : `rgba(${accentRgb},0.1)`, border: `1.5px solid rgba(${accentRgb},0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: done ? "#fff" : accentColor, fontWeight: 700 }}>
          {done ? <Check size={13} /> : index + 1}
        </span>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{step.label}</span>
      </div>
      {step.prompt && (
        <div style={{ borderRadius: 10, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.8)", padding: "10px 14px", fontSize: 12, color: "#334155", fontFamily: "monospace", lineHeight: 1.65, direction: "rtl", marginBottom: 10 }}>
          {step.prompt}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {step.prompt && <CopyBtn text={step.prompt} label="העתק לצ׳אט" accentRgb={accentRgb} />}
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: accentColor, fontWeight: 600 }}>
          <input type="checkbox" checked={done} onChange={e => setDone(e.target.checked)} style={{ width: 15, height: 15, accentColor } as React.CSSProperties} />
          סיימתי עם AI ✓
        </label>
      </div>
    </div>
  );
}

// ─── TutorStepMedium ──────────────────────────────────────────────────────────

function TutorStepMedium({ step, index, accentColor, accentRgb, locked, onPass }: {
  step: PromptStep; index: number; accentColor: string; accentRgb: string; locked: boolean; onPass: () => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const passed = result !== null && !result.blocked && result.score >= 75;

  if (locked) {
    return (
      <div style={{ borderRadius: 16, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.4)", padding: "1rem 1.2rem", opacity: 0.5, display: "flex", alignItems: "center", gap: 10 }}>
        <Lock size={15} color="#94a3b8" />
        <span style={{ fontSize: 13, color: "#64748b" }}>{step.label}</span>
      </div>
    );
  }

  const validate = () => {
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 75) onPass();
  };

  const scoreColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 16, padding: "1rem 1.2rem", border: passed ? "1.5px solid #16a34a" : `1px solid rgba(${accentRgb},0.3)`, background: passed ? "rgba(220,252,231,0.3)" : "rgba(255,255,255,0.7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        {passed
          ? <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />
          : <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `rgba(${accentRgb},0.1)`, border: `1.5px solid rgba(${accentRgb},0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: accentColor, fontWeight: 700 }}>{index + 1}</span>
        }
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{step.label}</span>
      </div>
      {!passed && (
        <>
          <textarea value={text} onChange={e => { setText(e.target.value); setResult(null); }} rows={3} dir="rtl"
            placeholder="נסח כאן את הפרומפט שתשלח ל-AI..."
            style={{ width: "100%", borderRadius: 10, resize: "none", boxSizing: "border-box", border: `1.5px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.85)", fontSize: 13, color: "#1e293b", padding: "10px 12px", lineHeight: 1.6, fontFamily: "inherit", marginBottom: 8 }} />
          {result && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 3 }}>
                <span>ציון פרומפט</span><span style={{ color: scoreColor, fontWeight: 700 }}>{result.score}/100</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${result.score}%`, background: scoreColor, transition: "width 0.4s" }} />
              </div>
            </div>
          )}
          {result?.blocked && <div style={{ background: "rgba(254,226,226,1)", border: "1px solid #dc2626", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#1A1A1A", marginBottom: 8 }}>{result.hint}</div>}
          {result && !result.blocked && result.score < 75 && <div style={{ background: "rgba(255,251,235,1)", border: "1px solid #d97706", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#1A1A1A", marginBottom: 8 }}>{result.hint}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={validate} disabled={text.trim().length < 10}
              style={{ padding: "7px 16px", borderRadius: 10, cursor: text.trim().length < 10 ? "not-allowed" : "pointer", background: `rgba(${accentRgb},0.1)`, border: `1.5px solid rgba(${accentRgb},0.4)`, color: accentColor, fontSize: 13, fontWeight: 600, opacity: text.trim().length < 10 ? 0.4 : 1 }}>
              בדיקת AI מדומה 🤖
            </button>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{text.trim().length} תווים</span>
          </div>
        </>
      )}
      {passed && <div style={{ background: "rgba(220,252,231,1)", border: "1px solid #16a34a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#14532d" }}>{result!.hint || "ניסוח מעולה! הפרומפט שלך ברור ומדויק."}</div>}
    </div>
  );
}

// ─── LadderBase ───────────────────────────────────────────────────────────────

function LadderBase({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const steps = ex.steps;
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => {
    setCompleted(prev => { const next = [...prev]; next[i] = true; return next; });
    const el = document.getElementById(`basic-step-${i + 1}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  };
  return (
    <div>
      {steps.map((step, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic key={i} step={step} index={i} accentColor={accentColor} accentRgb={accentRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  סיימתי סעיף זה ✓
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>🔒</div>
              <TutorStepBasic key={i} step={step} index={i} accentColor={accentColor} accentRgb={accentRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── LadderMedium ─────────────────────────────────────────────────────────────

function LadderMedium({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(ex.steps.length).fill(false));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <GoldenPromptCard prompt={ex.goldenPrompt} accentColor={accentColor} accentRgb={accentRgb} />
      <div style={{ borderRadius: 12, background: `rgba(${accentRgb},0.07)`, border: `1px solid rgba(${accentRgb},0.2)`, padding: "8px 14px", fontSize: 13, color: accentColor, fontWeight: 600 }}>
        🎯 עכשיו תורך: נסח כל פרומפט בעצמך, בדוק עם ה-AI המדומה, ואז שלח לAI האמיתי
      </div>
      {ex.steps.map((step, i) => (
        <TutorStepMedium key={i} step={step} index={i} accentColor={accentColor} accentRgb={accentRgb}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(p => { const n = [...p]; n[i] = true; return n; })} />
      ))}
    </div>
  );
}

// ─── LadderAdvanced ───────────────────────────────────────────────────────────

function LadderAdvanced({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const steps = ex.steps;
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" />

      {steps.map((step, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ step.phase } — { step.label }</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ step.phase } — { step.label }</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{ step.prompt }</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                סיימתי סעיף זה ✓
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

// ─── FormulaBar ───────────────────────────────────────────────────────────────

function FormulaBar({ accentColor, accentRgb }: { accentColor: string; accentRgb: string }) {
  const formulas = [
    { label: "ישר רגרסיה", val: "y\u0302 = a + bx" },
    { label: "שיפוע", val: "b = r\u00B7(Sy/Sx)" },
    { label: "מקדם מתאם", val: "\u22121 \u2264 r \u2264 1" },
    { label: "ניבוי", val: "הצב x בישר הרגרסיה" },
  ];
  return (
    <div style={{ borderRadius: 14, border: `1px solid rgba(${accentRgb},0.25)`, background: `rgba(${accentRgb},0.04)`, padding: "12px 16px", marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>נוסחאות מרכזיות</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {formulas.map(f => (
          <div key={f.label} style={{ borderRadius: 8, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", padding: "4px 10px", fontSize: 11 }}>
            <span style={{ color: "#64748b", marginLeft: 4 }}>{f.label}:</span>
            <span style={{ color: "#1e293b", fontFamily: "monospace", fontWeight: 600, direction: "ltr", display: "inline-block" }}>{f.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Exercise data ────────────────────────────────────────────────────────────

const EXERCISES: ExerciseDef[] = [
  {
    id: "basic",
    problem: "נתונים 5 זוגות נתונים (xi, yi).\nהממוצעים: x\u0304, y\u0304\nסטיות תקן: Sx, Sy\nמקדם מתאם: r\n\nא. חשב את שיפוע ישר הרגרסיה b.\nב. חשב את חותך ציר y: a = y\u0304 \u2212 b\u00B7x\u0304.\nג. כתוב את משוואת ישר הרגרסיה.\nד. נבא את y עבור x נתון.",
    diagram: <ScatterBasic />,
    pitfalls: [
      { title: "מבלבלים בין r למקדם b — הם לא אותו דבר", text: "r הוא מקדם המתאם (בין -1 ל-1), ואילו b הוא השיפוע. הקשר ביניהם: b = r\u00B7(Sy/Sx). הם שווים רק כש-Sy=Sx." },
      { title: "שוכחים ש-r קרוב ל-0 = קשר חלש — אין טעם לנבא", text: "אם |r| קרוב ל-0, הישר לא מייצג את הנתונים טוב. ניבוי באמצעות ישר רגרסיה כזה לא אמין." },
    ],
    goldenPrompt: "\n\nנתונים 5 זוגות (xi,yi). אני צריך: 1. לחשב b=r(Sy/Sx). 2. לחשב a=y\u0304-bx\u0304. 3. לכתוב y\u0302=a+bx. 4. לנבא y עבור x נתון.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "א", label: "שלב א׳ — חשב את השיפוע b", prompt: "\n\nמה הנוסחה לשיפוע ישר הרגרסיה? b = r\u00B7(Sy/Sx). הסבר כל מרכיב." },
      { phase: "ב", label: "שלב ב׳ — חשב את החותך a", prompt: "\n\nאחרי שחישבתי b, איך מחשבים a? הנוסחה: a = y\u0304 \u2212 b\u00B7x\u0304. הסבר מה המשמעות של a." },
      { phase: "ג", label: "שלב ג׳ — כתוב את משוואת הישר", prompt: "\n\nאחרי שמצאתי a ו-b, כתוב את משוואת ישר הרגרסיה y\u0302 = a + bx. הסבר מה כל חלק אומר." },
      { phase: "ד", label: "שלב ד׳ — נבא ערך y", prompt: "\n\nיש לי ישר רגרסיה y\u0302 = a + bx. איך מנבאים y עבור ערך x נתון? הציב ובדוק." },
    ],
  },
  {
    id: "medium",
    problem: "חוקר בדק קשר בין שעות למידה לציון במבחן.\nנמצא: r = 0.85\n\nא. תאר את עוצמת הקשר וכיוונו.\nב. מה משמעות r\u00B2?\nג. האם ניתן להסיק סיבתיות?\nד. מתי הניבוי באמצעות הישר לא אמין?",
    diagram: <ScatterMedium />,
    pitfalls: [
      { title: "מקדם מתאם גבוה ≠ סיבתיות", text: "גם אם r קרוב ל-1, זה לא אומר שמשתנה אחד גורם לשני. קורלציה אינה סיבתיות — יכול להיות משתנה שלישי מסביר." },
      { title: "שוכחים לפרש את r\u00B2 כאחוז השונות המוסברת", text: "r\u00B2 = 0.72 אומר שהישר מסביר 72% מהשונות. 28% הנותרים — מושפעים מגורמים אחרים." },
    ],
    goldenPrompt: "\n\nr=0.85 בין שעות למידה לציון. אני צריך: 1. לתאר כיוון ועוצמה. 2. לחשב ולפרש r\u00B2. 3. לדון בסיבתיות vs. קורלציה. 4. לציין מגבלות הניבוי.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "א", label: "שלב א׳ — תאר עוצמה וכיוון", contextWords: ["מתאם", "חיובי", "חזק", "r", "כיוון"] },
      { phase: "ב", label: "שלב ב׳ — פרש את r\u00B2", contextWords: ["r\u00B2", "שונות", "מוסבר", "אחוז", "ישר"] },
      { phase: "ג", label: "שלב ג׳ — סיבתיות מול קורלציה", contextWords: ["סיבתיות", "קורלציה", "משתנה", "הסבר", "גורם"] },
      { phase: "ד", label: "שלב ד׳ — מגבלות ניבוי", contextWords: ["ניבוי", "טווח", "אקסטרפולציה", "מגבלות", "נתונים"] },
    ],
  },
  {
    id: "advanced",
    problem: "נתוני מכירות חודשיות לאורך שנה מראים דפוס עונתי.\nנבנה ישר רגרסיה ומצאנו r = 0.42.\n\nא. האם ישר רגרסיה מתאים לנתונים אלו?\nב. נתח את השאריות — מה הן מגלות?\nג. מה הסכנה בניבוי 3 שנים קדימה?\nד. הצע מודל חלופי.",
    diagram: <ScatterAdvanced />,
    pitfalls: [
      { title: "מניחים שישר רגרסיה מתאים תמיד — גם כשהנתונים לא לינאריים", text: "r נמוך עם דפוס בשאריות = סימן שהקשר לא לינארי. ישר לא יספק ניבוי טוב כאן." },
      { title: "מנבאים הרחק מטווח הנתונים (אקסטרפולציה)", text: "ניבוי 3 שנים קדימה כשיש נתונים של שנה בלבד — סכנת אקסטרפולציה. המודל לא תקף מחוץ לטווח." },
    ],
    goldenPrompt: "\n\n",
    steps: [
      { phase: "א", label: "שלב א׳ — התאמת המודל", contextWords: ["r", "התאמה", "לינארי", "נמוך", "מודל"] },
      { phase: "ב", label: "שלב ב׳ — ניתוח שאריות", contextWords: ["שאריות", "דפוס", "אקראי", "ניתוח", "ישר"] },
      { phase: "ג", label: "שלב ג׳ — סכנת אקסטרפולציה", contextWords: ["אקסטרפולציה", "טווח", "ניבוי", "סכנה", "נתונים"] },
      { phase: "ד", label: "שלב ד׳ — מודל חלופי", contextWords: ["מודל", "עונתי", "פולינום", "חלופי", "התאמה"] },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegressionPage() {
  const [activeId, setActiveId] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = EXERCISES.find(e => e.id === activeId)!;
  const st = STATION[activeId];

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <main dir="rtl" style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", paddingBottom: "4rem" }}>
        {/* Header */}
        <div style={{ background: "#F3EFE0", borderBottom: "1px solid rgba(60,54,42,0.15)", marginBottom: "2rem" }}>
          <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>רגרסיה לינארית עם AI</h1>
              <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>ישר רגרסיה, מקדם מתאם, ניבוי — ואיך לשאול AI את השאלות הנכונות</p>
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

        <div style={{ margin: "0 auto", padding: "0 1.5rem" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
            {TABS.map(tab => {
              const s = STATION[tab.id];
              const active = activeId === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveId(tab.id)} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13, border: "2px solid", borderColor: active ? s.accentColor : "rgba(100,116,139,0.2)", background: active ? `rgba(${s.glowRgb},0.1)` : "rgba(255,255,255,0.6)", color: active ? s.accentColor : "#64748b", boxShadow: active ? s.glowShadow : "none", transition: "all 0.2s" }}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Island */}
          <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", boxShadow: st.glowShadow, marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }} className={st.badgeCls}>{st.badge}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{st.stationName}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "center", marginBottom: 24 }}>
              <pre style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
              <div style={{ borderRadius: 16, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: 12 }}>{ex.diagram}</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>⚠️ שגיאות נפוצות</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ex.pitfalls.map((p, i) => (
                  <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(254,226,226,0.25)", padding: "10px 14px" }}>
                    <div style={{ color: "#b91c1c", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>⚠️ {p.title}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{p.text}</div>
                  </div>
                ))}
              </div>
            </div>
            <FormulaBar accentColor={st.accentColor} accentRgb={st.glowRgb} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: st.accentColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>🧠 מדריך הפרומפטים</p>
              {activeId === "basic"    && <LadderBase     ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
              {activeId === "medium"   && <LadderMedium   ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
              {activeId === "advanced" && <LadderAdvanced ex={ex} accentColor={st.accentColor} accentRgb={st.glowRgb} />}
            </div>
          </section>

          <RegressionLab levelId={activeId} />

          {/* Mark as complete */}
          <div style={{ marginTop: "1.5rem" }}>
            <MarkComplete subtopicId="/statistics/regression" level={activeId} />
          </div>

        </div>
      </main>
    </>
  );
}
