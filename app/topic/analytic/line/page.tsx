"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  prompt?: string;          // for TutorStepBasic
  contextWords?: string[];  // for TutorStepMedium validation
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  steps: PromptStep[];
};

// ─── STATION config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",   accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",   glowShadow: "0 4px 16px rgba(22,163,74,0.12)",   glowRgb: "22,163,74",   accentColor: "#16A34A", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white",  accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",   glowShadow: "0 4px 16px rgba(234,88,12,0.12)",   glowRgb: "234,88,12",   accentColor: "#EA580C", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",   badgeCls: "bg-red-700 text-white",     accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",   glowShadow: "0 4px 16px rgba(220,38,38,0.12)",   glowRgb: "220,38,38",   accentColor: "#DC2626", borderRgb: "139,38,53"  },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// Subject words for MasterPromptGate (analytic line-specific)
const LINE_SUBJECT_WORDS = [
  "שיפוע", "ישר", "ניצבות", "מקביל", "אנכי", "משוואת ישר", "וקטור", "מכפלה פנימית",
];

// ─── FunctionGraph ────────────────────────────────────────────────────────────
// Multi-function support. Keeps isFinite + isNaN checks.

function FunctionGraph({
  fns, xMin, xMax, yMin, yMax, colors = ["#3b82f6"],
}: {
  fns: ((x: number) => number)[]; xMin: number; xMax: number; yMin: number; yMax: number; colors?: string[];
}) {
  const W = 260, H = 110;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
  const steps = 200, dx = (xMax - xMin) / steps;
  const ox = toSx(0), oy = toSy(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto" aria-hidden>
      {[-4, -2, 0, 2, 4].map((gx) => {
        const sx = toSx(gx);
        return sx >= 0 && sx <= W ? <line key={`gx${gx}`} x1={sx} y1={0} x2={sx} y2={H} stroke="rgba(100,116,139,0.2)" strokeWidth={0.7} /> : null;
      })}
      {[-4, -2, 0, 2, 4].map((gy) => {
        const sy = toSy(gy);
        return sy >= 0 && sy <= H ? <line key={`gy${gy}`} x1={0} y1={sy} x2={W} y2={sy} stroke="rgba(100,116,139,0.2)" strokeWidth={0.7} /> : null;
      })}
      {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
      {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
      {fns.map((fn, fi) => {
        const segs: string[] = [];
        let moved = false;
        for (let i = 0; i <= steps; i++) {
          const xi = xMin + i * dx, yi = fn(xi);
          if (!isFinite(yi) || isNaN(yi) || yi < yMin || yi > yMax) { moved = false; continue; }
          segs.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
          moved = true;
        }
        return <path key={fi} d={segs.join(" ")} fill="none" stroke={colors[fi] ?? "#3b82f6"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </svg>
  );
}

// ─── TriangleDiagram ──────────────────────────────────────────────────────────

function TriangleDiagram() {
  const W = 260, H = 110;
  const xMin = -1.5, xMax = 6, yMin = -1, yMax = 11.5;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const A = { x: toSx(0), y: toSy(0) };
  const B = { x: toSx(4), y: toSy(2) };
  const C = { x: toSx(0), y: toSy(10) };
  const ox = toSx(0), oy = toSy(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto" aria-hidden>
      {[0, 2, 4].map((gx) => {
        const sx = toSx(gx);
        return <line key={`gx${gx}`} x1={sx} y1={0} x2={sx} y2={H} stroke="rgba(100,116,139,0.2)" strokeWidth={0.7} />;
      })}
      {[0, 2, 4, 6, 8, 10].map((gy) => {
        const sy = toSy(gy);
        return <line key={`gy${gy}`} x1={0} y1={sy} x2={W} y2={sy} stroke="rgba(100,116,139,0.2)" strokeWidth={0.7} />;
      })}
      <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />
      <polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="#3b82f6" fillOpacity={0.07} stroke="none"
      />
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" />
      <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
      <line x1={C.x} y1={C.y} x2={A.x} y2={A.y} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 3" />
      <circle cx={A.x} cy={A.y} r={3.5} fill="#34d399" />
      <circle cx={B.x} cy={B.y} r={3.5} fill="#3b82f6" />
      <circle cx={C.x} cy={C.y} r={3.5} fill="#a78bfa" />
    </svg>
  );
}

// ─── LineLab ──────────────────────────────────────────────────────────────────

function LineLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [m, setM] = useState(1.0);
  const [b, setB] = useState(0.0);
  const st = STATION[levelId];
  const W = 300, H = 200;
  const xMin = -5, xMax = 5, yMin = -6, yMax = 6;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const steps = 100, dx = (xMax - xMin) / steps;
  const segments: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps; i++) {
    const xi = xMin + i * dx, yi = m * xi + b;
    if (yi < yMin || yi > yMax) { moved = false; continue; }
    segments.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }

  const p1 = { x: 0, y: b };
  const p2 = { x: 1, y: b };
  const p3 = { x: 1, y: m + b };
  const triangleVisible = p1.y >= yMin && p1.y <= yMax && p3.y >= yMin && p3.y <= yMax;
  const ox = toSx(0), oy = toSy(0);
  const riseDisplay = m > 0 ? `+${m.toFixed(1)}` : m.toFixed(1);

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ישרים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        y = <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{m.toFixed(1)}</span>x{" "}
        {b >= 0
          ? <span>+ <span style={{ color: "#a78bfa", fontWeight: 700 }}>{b.toFixed(1)}</span></span>
          : <span>− <span style={{ color: "#a78bfa", fontWeight: 700 }}>{Math.abs(b).toFixed(1)}</span></span>}
        {" "}— שנה שיפוע וחיתוך
      </p>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 320 }} aria-hidden>
          {[-4, -2, 0, 2, 4].map((gx) => {
            const sx = toSx(gx);
            return <line key={`gx${gx}`} x1={sx} y1={0} x2={sx} y2={H} stroke="rgba(100,116,139,0.15)" strokeWidth={0.7} />;
          })}
          {[-4, -2, 0, 2, 4].map((gy) => {
            const sy = toSy(gy);
            return <line key={`gy${gy}`} x1={0} y1={sy} x2={W} y2={sy} stroke="rgba(100,116,139,0.15)" strokeWidth={0.7} />;
          })}
          <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />
          <path d={segments.join(" ")} fill="none" stroke={st.accentColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {triangleVisible && (
            <>
              <line x1={toSx(p1.x)} y1={toSy(p1.y)} x2={toSx(p2.x)} y2={toSy(p2.y)} stroke="#34d399" strokeWidth={2} strokeDasharray="4 3" />
              <line x1={toSx(p2.x)} y1={toSy(p2.y)} x2={toSx(p3.x)} y2={toSy(p3.y)} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />
            </>
          )}
        </svg>
        {triangleVisible && (
          <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, marginTop: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 20, height: 2, background: "#34d399", borderRadius: 2 }} />
              <span style={{ color: "#16a34a" }}>run = 1</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 2, height: 12, background: "#f59e0b", borderRadius: 2 }} />
              <span style={{ color: "#d97706" }}>rise = {riseDisplay}</span>
            </span>
          </div>
        )}
      </div>

      {/* Sliders */}
      <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>שיפוע m (rise/run)</span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{m.toFixed(1)}</span>
          </div>
          <input type="range" min="-3" max="3" step="0.1" value={m} onChange={(e) => setM(parseFloat(e.target.value))} style={{ width: "100%", accentColor: st.accentColor }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
            <span>−3</span><span>0</span><span>+3</span>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>חיתוך עם ציר y (b)</span>
            <span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{b.toFixed(1)}</span>
          </div>
          <input type="range" min="-5" max="5" step="0.5" value={b} onChange={(e) => setB(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#a78bfa" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
            <span>−5</span><span>0</span><span>+5</span>
          </div>
        </div>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 14, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>שיפוע</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 13 }}>{m.toFixed(1)}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 14, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>חיתוך y</div>
          <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13 }}>{b.toFixed(1)}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 14, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>משוואה</div>
          <div style={{ color: "#1A1A1A", fontWeight: 700, fontSize: 11, fontFamily: "monospace" }}>
            y={m.toFixed(1)}x{b >= 0 ? "+" : ""}{b.toFixed(1)}
          </div>
        </div>
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        m = rise/run — כל 1 יחידה ימינה, הישר עולה/יורד ב-{Math.abs(m).toFixed(1)} יחידות
      </p>
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

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
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

// ─── Tutor Step Cards ─────────────────────────────────────────────────────────

function TutorStepBasic({ step, glowRgb = "22,163,74", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt ?? ""}</div>
        </div>
        <CopyBtn text={step.prompt ?? ""} label="העתק פרומפט ממוקד" />
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

        {result && result.blocked && (
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
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

// ─── Ladders ──────────────────────────────────────────────────────────────────

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => <TutorStepBasic key={i} step={s} glowRgb={glowRgb} borderRgb={borderRgb} />)}
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
  const [stepsPassed, setStepsPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  const allPassed = masterPassed && stepsPassed.every(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor={STATION.advanced.accentColor}
        accentRgb={STATION.advanced.glowRgb}
        subjectWords={LINE_SUBJECT_WORDS}
        subjectHint="ישר / שיפוע / ניצבות / מקביל / אנכי"
        requiredPhrase="סרוק נתונים ועצור"
      />

      {masterPassed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
          {steps.map((s, i) => (
            <TutorStepMedium
              key={i} step={s}
              locked={i > 0 && !stepsPassed[i - 1]}
              onPass={() => setStepsPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
              borderRgb={STATION.advanced.borderRgb}
            />
          ))}

          {allPassed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem", textAlign: "center", marginTop: 12 }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
              <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16 }}>כל הכבוד — השלמת את התחנה המתקדמת!</div>
              <div style={{ color: "#166534", fontSize: 13, marginTop: 4 }}>מציאת פרמטר עם תנאי ניצבות — מאסטר בגיאומטריה אנליטית!</div>
            </motion.div>
          )}

          <button onClick={() => { setMasterPassed(false); setStepsPassed(Array(steps.length).fill(false)); }} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: 8 }}>
            התחל מחדש
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise Data ─────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  // ── מתחיל: משוואת ישר דרך שתי נקודות ─────────────────────────────────────
  {
    id: "basic",
    problem: "מצא את משוואת הישר העובר דרך הנקודות:\n(2, 3)  ו־  (5, 9)",
    diagram: (
      <FunctionGraph
        fns={[(x) => 2 * x - 1]}
        xMin={-1} xMax={7} yMin={-3} yMax={13}
        colors={["#3b82f6"]}
      />
    ),
    pitfalls: [
      { title: "⚠️ מחלקים ΔY/ΔX בסדר הפוך", text: "השיפוע הוא תמיד (y₂−y₁)/(x₂−x₁). אל תהפוך — חלוקה הפוכה תיתן שיפוע שגוי." },
      { title: "⚠️ מוצאים שיפוע ושוכחים למצוא b", text: "לאחר שמצאת m, חייב להציב נקודה אחת כדי לפתור עבור b. אי-אפשר לסיים בלי b." },
    ],
    goldenPrompt: `\n\nהיי, אני תלמיד כיתה י"ב.\nנתונות שתי נקודות (2,3) ו-(5,9).\nהנה הפרוטוקול שלנו:\n\n1️⃣ סריקה:\nסרוק את הנתונים וכתוב: "זיהיתי. מחכה לסעיף א'."\n(אל תפתור כלום עדיין!)\n\n2️⃣ תפקיד:\nאתה המורה שלי — אל תיתן לי תשובות, שאל אותי שאלות מכווינות.\n\n3️⃣ שיטת עבודה:\nבכל שלב — שאלה מכווינה אחת בלבד. חכה לתגובה שלי לפני שממשיך.`,
    steps: [
      {
        phase: "שלב א׳",
        label: "חשב את השיפוע m",
        prompt: "\n\nנתונות (2,3) ו-(5,9). חשב את השיפוע m=(y₂-y₁)/(x₂-x₁). פרט את החישוב.",
      },
      {
        phase: "שלב ב׳",
        label: "הצב נקודה למציאת b",
        prompt: "\n\nמשוואת ישר y=mx+b. m=2 ועובר דרך (2,3). הצב ומצא את b.",
      },
      {
        phase: "שלב ג׳",
        label: "כתוב את משוואת הישר הסופית",
        prompt: "\n\nm=2 ו-b=-1. כתוב את משוואת הישר הסופית בצורת y=mx+b.",
      },
      {
        phase: "שלב ד׳",
        label: "אמת עם הנקודה השנייה",
        prompt: "\n\ny=2x-1. הצב x=5. האם מתקבל y=9? אמת את הפתרון.",
      },
    ],
  },

  // ── בינוני: ישר מאונך ─────────────────────────────────────────────────────
  {
    id: "medium",
    problem: "ישר A הוא y = 2x + 4.\nמצא את ישר B שעובר דרך (4, 1)\nומאונך לישר A.",
    diagram: (
      <FunctionGraph
        fns={[(x) => 2 * x + 4, (x) => -0.5 * x + 3]}
        xMin={-3} xMax={7} yMin={-3} yMax={11}
        colors={["#3b82f6", "#a78bfa"]}
      />
    ),
    pitfalls: [
      { title: "⚠️ שיפוע מאונך = −1/m, לא −m", text: "ישר מאונך הוא ההפכי והשלילי של השיפוע המקורי. m=2 → m⊥=−½, לא −2." },
      { title: "⚠️ שוכחים להציב את הנקודה (4,1)", text: "אחרי שמצאת m⊥=−½, עדיין צריך להציב (4,1) כדי לחשב את b של ישר B." },
    ],
    goldenPrompt: `\n\nהיי, אני תלמיד כיתה י"ב.\nישר A: y=2x+4. אני בונה ישר B מאונך ל-A דרך (4,1).\nאתה המורה שלי — אל תיתן לי תשובות, שאל שאלות מכווינות בלבד.\n\nקודם כל, סרוק את הנתונים ואל תכתוב שום פתרון.\nחכה לי בין שלב לשלב.`,
    steps: [
      {
        phase: "שלב א׳",
        label: "מצא את שיפוע ישר A",
        contextWords: ["שיפוע", "משוואה", "נקודה", "נוסחה"],
      },
      {
        phase: "שלב ב׳",
        label: "מצא את שיפוע ישר B המאונך",
        contextWords: ["אנכי", "שיפוע", "נוסחה", "משוואה"],
      },
      {
        phase: "שלב ג׳",
        label: "הצב נקודה (4,1) ומצא b",
        contextWords: ["להציב", "שיפוע", "נקודה", "משוואה"],
      },
      {
        phase: "שלב ד׳",
        label: "אמת — האם מכפלת השיפועים = −1?",
        contextWords: ["אנכי", "שיפוע", "מקביל", "נוסחה"],
      },
    ],
  },

  // ── מתקדם: זווית ישרה במשולש ──────────────────────────────────────────────
  {
    id: "advanced",
    problem: "למשולש קודקודים A(0,0), B(4,2), C(k,10).\nמצא את k כך שזווית ABC תהיה 90°.",
    diagram: <TriangleDiagram />,
    pitfalls: [
      { title: "⚠️ מחשבים וקטורים מ-A ולא מ-B", text: "הזווית היא ב-B. הוקטורים חייבים להיות BA=A−B ו-BC=C−B, שניהם יוצאים מ-B." },
      { title: "⚠️ שוכחים שמכפלה פנימית=0 מגדירה ניצבות", text: "שני וקטורים מאונכים כאשר u⃗·v⃗=0. לא מספיק שהשיפועים שווים — צריך לבדוק מכפלה." },
    ],
    goldenPrompt: "\n\n",
    steps: [
      {
        phase: "שלב א׳",
        label: "כתוב את הוקטורים BA ו-BC",
        contextWords: ["שיפוע", "נקודה", "משוואה", "אנכי"],
      },
      {
        phase: "שלב ב׳",
        label: "כתוב תנאי ניצבות — מכפלה פנימית = 0",
        contextWords: ["אנכי", "שיפוע", "נוסחה", "משוואה"],
      },
      {
        phase: "שלב ג׳",
        label: "פתור עבור k",
        contextWords: ["שיפוע", "נקודה", "להציב", "משוואה"],
      },
      {
        phase: "שלב ד׳",
        label: "אמת עם שיפועי AB ו-BC",
        contextWords: ["שיפוע", "אנכי", "נקודה", "מקביל"],
      },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+סעיף/)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 12, padding: 6, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Formula bar */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>כלי גיאומטריה אנליטית — ישרים</div>
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, color: "#2D3436", lineHeight: 1.7 }}>
            <span><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700 }}>m = (y₂−y₁)/(x₂−x₁)</span> — שיפוע בין שתי נקודות</span>
            <span><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700 }}>y = mx + b</span> — צורת שיפוע-חיתוך</span>
            <span><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700 }}>y−y₁ = m(x−x₁)</span> — ישר דרך נקודה</span>
          </div>
          <div style={{ width: 1, background: "rgba(60,54,42,0.1)", alignSelf: "stretch" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, color: "#2D3436", lineHeight: 1.7 }}>
            <span><span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>m⊥ = −1/m</span> — שיפוע ישר מאונך</span>
            <span><span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>m₁ = m₂</span> — תנאי ישרים מקבילים</span>
            <span><span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>u⃗·v⃗ = 0</span> — תנאי ניצבות (וקטורים)</span>
          </div>
        </div>
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: 6, boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>

    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LinePage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      {/* ── Global focus/hover border overrides ── */}
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

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ margin: "0 auto", padding: "0.75rem 6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>ישרים במישור עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>שיפוע, משוואת ישר וניצבות — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/analytic"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ margin: "0 auto", padding: "1rem 4px 3rem" }}>

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

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab — shown for all levels */}
        <div style={{ marginTop: "3rem" }}>
          <LineLab levelId={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
