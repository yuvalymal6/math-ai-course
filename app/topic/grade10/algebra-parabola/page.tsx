"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── KaTeX inline renderer ────────────────────────────────────────────────────

function Tex({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      katex.render(children, ref.current, { throwOnError: false, displayMode: false });
    }
  }, [children]);
  return <span ref={ref} dir="ltr" style={{ unicodeBidi: "embed" }} />;
}

function TexBlock({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      katex.render(children, ref.current, { throwOnError: false, displayMode: true });
    }
  }, [children]);
  return <span ref={ref} dir="ltr" style={{ display: "block", textAlign: "center", unicodeBidi: "embed" }} />;
}

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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",   accentCls: "text-green-700",   glowBorder: "rgba(22,163,74,0.35)",   glowShadow: "0 4px 16px rgba(22,163,74,0.12)",   glowRgb: "22,163,74",   accentColor: "#16A34A", borderRgb: "45,90,39"    },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white",  accentCls: "text-orange-700",  glowBorder: "rgba(234,88,12,0.35)",   glowShadow: "0 4px 16px rgba(234,88,12,0.12)",   glowRgb: "234,88,12",   accentColor: "#EA580C", borderRgb: "163,79,38"   },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",   badgeCls: "bg-red-700 text-white",     accentCls: "text-red-700",     glowBorder: "rgba(220,38,38,0.35)",   glowShadow: "0 4px 16px rgba(220,38,38,0.12)",   glowRgb: "220,38,38",   accentColor: "#DC2626", borderRgb: "139,38,53"  },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

const PARABOLA_SUBJECT_WORDS = [
  "פרבולה", "פרבולות", "פונקציה ריבועית", "ax²", "קודקוד",
  "שורשים", "חיתוכים", "תחום", "מקסימום", "מינימום",
];

// ─── SVG: FunctionGraph ───────────────────────────────────────────────────────

function FunctionGraph({
  fn, xMin, xMax, yMin, yMax, color = "#3b82f6",
}: {
  fn: (x: number) => number;
  xMin: number; xMax: number; yMin: number; yMax: number;
  color?: string;
}) {
  const W = 260, H = 120;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
  const ox = toSx(0), oy = toSy(0);

  const STEPS = 300;
  const dx = (xMax - xMin) / STEPS;
  let d = "";
  let penDown = false;
  for (let i = 0; i <= STEPS; i++) {
    const x = xMin + i * dx;
    const y = fn(x);
    if (!isFinite(y) || isNaN(y) || y < yMin - 1 || y > yMax + 1) { penDown = false; continue; }
    const sx = toSx(x), sy = toSy(y);
    if (!penDown) { d += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`; penDown = true; }
    else d += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
  }

  const xRange = xMax - xMin, yRange = yMax - yMin;
  const xGridStep = xRange <= 8 ? 1 : 2;
  const yGridStep = yRange <= 12 ? 2 : 4;
  const gxVals: number[] = [];
  for (let v = Math.ceil(xMin / xGridStep) * xGridStep; v <= xMax; v += xGridStep) gxVals.push(v);
  const gyVals: number[] = [];
  for (let v = Math.ceil(yMin / yGridStep) * yGridStep; v <= yMax; v += yGridStep) gyVals.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px] mx-auto" aria-hidden>
      {gxVals.map((v) => { const sx = toSx(v); return sx >= 0 && sx <= W ? <line key={`gx${v}`} x1={sx} y1={0} x2={sx} y2={H} stroke="rgba(100,116,139,0.2)" strokeWidth={0.8} /> : null; })}
      {gyVals.map((v) => { const sy = toSy(v); return sy >= 0 && sy <= H ? <line key={`gy${v}`} x1={0} y1={sy} x2={W} y2={sy} stroke="rgba(100,116,139,0.2)" strokeWidth={0.8} /> : null; })}
      {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
      {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
      {d && <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />}
    </svg>
  );
}

// ─── SVG: TwoFunctionGraph (parabola + line) ──────────────────────────────────

function TwoFunctionGraph({
  fn1, fn2, xMin, xMax, yMin, yMax,
  color1 = "#a78bfa", color2 = "#f97316",
  label1 = "f(x)", label2 = "g(x)",
}: {
  fn1: (x: number) => number; fn2: (x: number) => number;
  xMin: number; xMax: number; yMin: number; yMax: number;
  color1?: string; color2?: string; label1?: string; label2?: string;
}) {
  const W = 260, H = 140;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
  const ox = toSx(0), oy = toSy(0);

  function buildPath(fn: (x: number) => number) {
    const STEPS = 300;
    const dx = (xMax - xMin) / STEPS;
    let d = "", penDown = false;
    for (let i = 0; i <= STEPS; i++) {
      const x = xMin + i * dx, y = fn(x);
      if (!isFinite(y) || y < yMin - 2 || y > yMax + 2) { penDown = false; continue; }
      const sx = toSx(x), sy = toSy(y);
      if (!penDown) { d += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`; penDown = true; }
      else d += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    }
    return d;
  }

  const gridX = []; for (let v = Math.ceil(xMin / 2) * 2; v <= xMax; v += 2) gridX.push(v);
  const gridY = []; for (let v = Math.ceil(yMin / 4) * 4; v <= yMax; v += 4) gridY.push(v);

  // Intersection markers
  const intersections: { sx: number; sy: number }[] = [];
  for (let i = 0; i < 300; i++) {
    const x0 = xMin + i * (xMax - xMin) / 300;
    const x1 = xMin + (i + 1) * (xMax - xMin) / 300;
    const d0 = fn1(x0) - fn2(x0), d1 = fn1(x1) - fn2(x1);
    if (d0 * d1 <= 0 && Math.abs(d0 - d1) > 1e-9) {
      const xi = x0 - d0 * (x1 - x0) / (d1 - d0);
      intersections.push({ sx: toSx(xi), sy: toSy(fn2(xi)) });
    }
  }

  const d1 = buildPath(fn1), d2 = buildPath(fn2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px] mx-auto" aria-hidden>
      {gridX.map(v => { const sx = toSx(v); return sx >= 0 && sx <= W ? <line key={`gx${v}`} x1={sx} y1={0} x2={sx} y2={H} stroke="rgba(100,116,139,0.15)" strokeWidth={0.7} /> : null; })}
      {gridY.map(v => { const sy = toSy(v); return sy >= 0 && sy <= H ? <line key={`gy${v}`} x1={0} y1={sy} x2={W} y2={sy} stroke="rgba(100,116,139,0.15)" strokeWidth={0.7} /> : null; })}
      {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
      {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
      {d1 && <path d={d1} fill="none" stroke={color1} strokeWidth={2.5} strokeLinejoin="round" />}
      {d2 && <path d={d2} fill="none" stroke={color2} strokeWidth={2} strokeLinejoin="round" strokeDasharray="6,3" />}
      {intersections.map((pt, i) => <circle key={i} cx={pt.sx} cy={pt.sy} r={4.5} fill="#facc15" stroke="#92400e" strokeWidth={1} />)}
      {/* Legend */}
      <g transform={`translate(4, 6)`}>
        <line x1={0} y1={5} x2={16} y2={5} stroke={color1} strokeWidth={2.5} />
        <text x={19} y={9} fontSize={9} fill="#374151">{label1}</text>
      </g>
      <g transform={`translate(4, 18)`}>
        <line x1={0} y1={5} x2={16} y2={5} stroke={color2} strokeWidth={2} strokeDasharray="4,2" />
        <text x={19} y={9} fontSize={9} fill="#374151">{label2}</text>
      </g>
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 12, fontSize: 13, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer", width: "100%" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "22,163,74", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div className="golden-prompt-card" style={{ borderRadius: 14, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 14, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)`, width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span>✨</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, margin: "0 0 14px 0", whiteSpace: "pre-line", fontWeight: 500, wordBreak: "break-word", overflowWrap: "break-word" }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

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
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase} </span>
        <span style={{ color: "#6B7280", fontSize: 11 }}>{step.label}</span>
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
              <span>ציון הפרומפט</span><span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
        {!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>בדיקת AI מדומה 🤖</button>}
        {result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>⚠️ {result.hint}</motion.div>}
        {result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>💡 {result.hint}</motion.div>}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong></div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}
        {result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}
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
        <TutorStepMedium key={i} step={s}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
          borderRgb={borderRgb} />
      ))}
    </div>
  );
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [stepsPassed, setStepsPassed]   = useState<boolean[]>(Array(steps.length).fill(false));
  const allPassed = masterPassed && stepsPassed.every(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor={STATION.advanced.accentColor}
        accentRgb={STATION.advanced.glowRgb}
        subjectWords={["פרבולה", "פרבולות", "חקירה", "פונקציה", "ריבועית", "פרמטר", "פרמטרים", "c", "אלגברה", "גרף", "גרפים", "קיצון", "קודקוד", "חיתוך", "צירים"]}
        requiredPhrase="סרוק נתונים ועצור"
      />
      {masterPassed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
          {steps.map((s, i) => (
            <TutorStepMedium key={i} step={s}
              locked={i > 0 && !stepsPassed[i - 1]}
              onPass={() => setStepsPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
              borderRgb={STATION.advanced.borderRgb} />
          ))}
          {allPassed && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
              style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem", textAlign: "center", marginTop: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
              <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16 }}>כל הכבוד — השלמת את התחנה המתקדמת!</div>
              <div style={{ color: "#166534", fontSize: 13, marginTop: 4 }}>ניתוח תחומים — יורדת וחיובית — מאסטר!</div>
            </motion.div>
          )}
          <button onClick={() => { setMasterPassed(false); setStepsPassed(Array(steps.length).fill(false)); }}
            style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: 8 }}>
            התחל מחדש
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    problem: "נתונה הפונקציה הריבועית:\nf(x) = x² − 6x + 5\n\nסעיף א׳: מצא את נקודות החיתוך של הפרבולה עם הצירים.\n\nסעיף ב׳: מצא את נקודת הקיצון של הפרבולה, וקבע את סוגה.\n\nסעיף ג׳: מהם תחומי העלייה והירידה של הפונקציה.",
    diagram: <FunctionGraph fn={(x) => x * x - 6 * x + 5} xMin={-1} xMax={7} yMin={-5} yMax={10} color="#3b82f6" />,
    pitfalls: [
      { title: "⚠️ שורשי הפרבולה אינם הקודקוד", text: "שימו לב: נקודות החיתוך עם ציר ה-x (השורשים) הן לא נקודת הקודקוד! בעוד שהשורשים הם המקומות שבהם הפרבולה 'נוגעת' בציר, הקודקוד הוא נקודת הקיצון של הגרף. אל תבלבלו ביניהם בתהליך החקירה." },
      { title: "⚠️ שכחת לחשב את ערך ה-y של הקודקוד", text: "מצאתם את x קודקוד? מעולה, אבל העבודה לא נגמרה. נקודת קיצון היא תמיד זוג סדור (x, y). אל תשכחו להציב את ה-x שמצאתם חזרה בתוך הפונקציה המקורית כדי לגלות את הגובה של הפרבולה בנקודת הקיצון." },
      { title: "⚠️ מבלבלים בין עלייה/ירידה לבין חיוביות/שליליות", text: "זהירות! תחום עלייה וירידה מתייחס לשאלה: 'האם הגרף עולה או יורד?'. לעומת זאת, חיוביות ושליליות מתייחסות לשאלה: 'האם הגרף מעל או מתחת לציר ה-x?', והן נקבעות לפי נקודות החיתוך." },
    ],
    goldenPrompt: `\n\nהיי, אני תלמיד כיתה י׳.\n\nצירפתי לך תמונה של תרגיל פרבולות.\n\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n\n\n1️⃣ סריקה:\nקודם כל, תסרוק את התמונה ותכתוב לי רק:\n"זיהיתי את הנתונים. מחכה להוראות לשלב א'."\n(אל תפתור כלום ואל תסביר כלום בשלב הזה!)\n\n\n2️⃣ תפקיד:\nאתה המורה שלי. אל תפתור במקומי. במהלך פתירת סעיף, תשאל אותי שאלות מנחות.\n\n\n3️⃣ שיטת עבודה:\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חיתוכים עם הצירים", prompt: "\n\nסעיף א׳: חיתוכים עם הצירים.\nקודם חיתוך עם ציר y — איך מוצאים אותו? ואז חיתוך עם ציר x — מה מציבים?" },
      { phase: "סעיף ב׳", label: "נקודת קיצון וסוגה", prompt: "\n\nסעיף ב׳: איך נחשב את נקודת הקיצון של הפונקציה, ואיך נקבע את סוגה?" },
      { phase: "סעיף ג׳", label: "תחומי עלייה וירידה", prompt: "\n\nסעיף ג׳: עזור לי למצוא את תחומי עלייה וירידה של הפונקציה." },
    ],
  },
  {
    id: "medium",
    problem: "נתונים הגרפים של הפונקציות:\nf(x) = −x² + 4x + 12\ng(x) = x − 6\n\nסעיף א׳: התאימו כל פונקציה לגרף המתאים (1) או (2). נמקו את בחירתכם בעזרת מאפייני הפונקציות.\n\nסעיף ב׳: רשמו את ערכי ה-x שבהם מתקיים f(x) = g(x).\n(מצאו את נקודות החיתוך בין הפרבולה לישר).\n\nסעיף ג׳: פתרו את האי-שוויון f(x) ≤ g(x). הסבירו מה המשמעות הגרפית של הפתרון.\n\nסעיף ד׳: באיזה תחום שתי הפונקציות עולות?",
    diagram: <TwoFunctionGraph
      fn1={(x) => -x * x + 4 * x + 12}
      fn2={(x) => x - 6}
      xMin={-5} xMax={9} yMin={-12} yMax={18}
      color1="#a78bfa" color2="#f97316"
      label1="f(x) = −x²+4x+12" label2="g(x) = x−6"
    />,
    pitfalls: [
      { title: "⚠️ מבלבלים בין נקודות חיתוך לבין תחומי אי-שוויון", text: "שימו לב להבדל! פתרון משוואה (f(x)=g(x)) נותן לכם נקודות בודדות על הציר שבהן הגרפים נפגשים. לעומת זאת, פתרון אי-שוויון (f(x)≤g(x)) נותן לכם תחום שלם. כדי למצוא אותו, הסתכלו בגרף וזהו איפה הקו הישר נמצא פיזית 'מעל' או 'מתחת' לפרבולה." },
      { title: "⚠️ שגיאה בבחירת התחום של האי-שוויון", text: "מצאתם את ערכי ה-x שבהם הגרפים נחתכים? מעולה. עכשיו, כדי לקבוע את סימן האי-שוויון, אל תנחשו. בחרו 'נקודת בדיקה' (מספר x כלשהו) בתוך התחום שמצאתם, הציבו אותה בשתי הפונקציות ובדקו איזו מהן נותנת תוצאה גבוהה יותר. זה יגיד לכם בוודאות איפה הישר נמצא מעל הפרבולה." },
    ],
    goldenPrompt: `\n\nהיי, אני תלמיד כיתה י׳.\nצירפתי לך תמונה של תרגיל — פרבולה וישר.\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n\n1️⃣ סריקה:\nתסרוק את התמונה ותכתוב לי רק:\n"זיהיתי את הנתונים. מחכה לסעיף א'."\n(אל תפתור כלום עדיין!)\n\n2️⃣ תפקיד:\nאתה המורה שלי. אל תפתור במקומי. בכל סעיף תשאל אותי שאלות מנחות.\n\n3️⃣ שיטת עבודה:\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      {
        phase: "סעיף א׳", label: "התאמת פונקציה לגרף",
        contextWords: ["פרבולה", "ישר", "שיפוע", "a שלילי", "חיתוך", "מאפיינים"],
      },
      {
        phase: "סעיף ב׳", label: "נקודות חיתוך f(x)=g(x)",
        contextWords: ["שוויון", "חיתוך", "x=−3", "x=6", "משוואה ריבועית"],
      },
      {
        phase: "סעיף ג׳", label: "אי-שוויון f(x)≤g(x)",
        contextWords: ["אי-שוויון", "מעל", "מתחת", "תחום", "x≤−3", "x≥6"],
      },
      {
        phase: "סעיף ד׳", label: "תחום עלייה משותף",
        contextWords: ["עלייה", "שתיהן", "תחום", "x<2", "שיפוע", "קודקוד"],
      },
    ],
  },
  {
    id: "advanced",
    problem: "נתונה הפונקציה הריבועית:\nf(x) = x² − 10x + c\n(כאשר c הוא פרמטר קבוע שערכו עדיין לא ידוע)\n\nסעיף א׳: הביעו באמצעות c את נקודת החיתוך של הפרבולה עם ציר ה-y.\n\nסעיף ב׳: מצאו את שיעורי נקודת הקודקוד של הפרבולה.\n(שיעור ה-y של הקודקוד יכלול את הפרמטר c)\n\nסעיף ג׳: ידוע כי ערך ה-y של נקודת הקודקוד הוא −11.\nמצאו את ערכו של c, ורשמו את הפונקציה המלאה.",
    diagram: <FunctionGraph fn={(x) => x * x - 10 * x + 14} xMin={-1} xMax={11} yMin={-14} yMax={16} color="#f43f5e" />,
    pitfalls: [
      { title: "⚠️ חיתוך עם ציר y — מה מציבים?", text: "כדי למצוא חיתוך עם ציר ה-y, תמיד מציבים x=0. אל תיבהלו אם התוצאה היא לא מספר ספציפי – במקרה הזה, נקודת החיתוך תהיה ביטוי שכולל את הפרמטר c. זה תקין לחלוטין בשלב הזה של התרגיל." },
      { title: "⚠️ ביטוי אלגברי לערך ה-y של הקודקוד", text: "מצאתם את ה-x של הקודקוד? מצוין. עכשיו, כשאתם מציבים אותו בפונקציה כדי למצוא את ה-y, זכרו שאתם עובדים עם ביטוי אלגברי. השגיאה הנפוצה היא 'להעלים' את c או לנסות להמציא לו ערך מספרי מוקדם מדי. ה-y של הקודקוד אמור להיות ביטוי המורכב ממספר ומפרמטר." },
      { title: "⚠️ בניית המשוואה למציאת c", text: "בשלב האחרון, אתם מקבלים נתון מספרי על גובה הקודקוד (y קודקוד). זה הרגע לבנות משוואה: השוו את הביטוי האלגברי שמצאתם בסעיף הקודם לערך המספרי שנתנו לכם. פתרון המשוואה הזו יגלה לכם סוף סוף מהו הערך של c." },
    ],
    goldenPrompt: `\n\nהיי, אני תלמיד כיתה י׳.\nצירפתי לך תמונה של תרגיל פרבולה עם פרמטר.\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n\n1️⃣ סריקה:\nתסרוק את התמונה ותכתוב לי רק:\n"זיהיתי את הנתונים. מחכה לסעיף א'."\n(אל תפתור כלום עדיין!)\n\n2️⃣ תפקיד:\nאתה המורה שלי. אל תפתור במקומי. בכל סעיף תשאל אותי שאלות מנחות.\n\n3️⃣ שיטת עבודה:\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      {
        phase: "סעיף א׳", label: "חיתוך עם ציר y באמצעות c",
        contextWords: ["x=0", "הצבה", "c", "ביטוי", "נקודה"],
      },
      {
        phase: "סעיף ב׳", label: "קודקוד עם פרמטר",
        contextWords: ["קודקוד", "xᵥ", "5", "yᵥ", "c−25"],
      },
      {
        phase: "סעיף ג׳", label: "מציאת c מהתנאי הנתון",
        contextWords: ["c", "−11", "c−25", "14", "פונקציה מלאה"],
      },
    ],
  },
];

// ─── ParabolaLab ──────────────────────────────────────────────────────────────

function ParabolaLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [a, setA] = useState(1.0);
  const [b, setB] = useState(0.0);
  const [c, setC] = useState(0.0);

  useEffect(() => {
    if (levelId === "basic")    { setA(1); setB(-6); setC(5); }
    if (levelId === "medium")   { setA(-1); setB(4); setC(12); }
    if (levelId === "advanced") { setA(1); setB(-10); setC(14); }
  }, [levelId]);

  const st = STATION[levelId];

  const W = 320, H = 220;
  const xMin = -20, xMax = 20, yMin = -40, yMax = 40;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
  const fn = (x: number) => a * x * x + b * x + c;

  const hasVertex = Math.abs(a) > 0.01;
  const xv = hasVertex ? -b / (2 * a) : NaN;
  const yv = hasVertex ? fn(xv) : NaN;
  const vertexInView = hasVertex && isFinite(yv) && yv >= yMin && yv <= yMax;

  // Roots (where y=0)
  const roots: number[] = [];
  if (hasVertex) {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const r1 = (-b + Math.sqrt(disc)) / (2 * a);
      const r2 = (-b - Math.sqrt(disc)) / (2 * a);
      if (r1 >= xMin && r1 <= xMax) roots.push(r1);
      if (Math.abs(r2 - r1) > 0.01 && r2 >= xMin && r2 <= xMax) roots.push(r2);
    }
  }

  const STEPS = 400;
  const dx2 = (xMax - xMin) / STEPS;
  let pathD = "";
  let penDown = false;
  for (let i = 0; i <= STEPS; i++) {
    const x = xMin + i * dx2;
    const y = fn(x);
    if (!isFinite(y) || y < yMin - 2 || y > yMax + 2) { penDown = false; continue; }
    const sx = toSx(x), sy = toSy(y);
    if (!penDown) { pathD += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`; penDown = true; }
    else pathD += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
  }

  const ox = toSx(0), oy = toSy(0);
  const isUp = a > 0.01, isDown = a < -0.01;
  const dirLabel = isUp ? "∪ מעלה" : isDown ? "∩ מטה" : "— ישר";

  // Equation string
  const eq: string[] = [];
  if (Math.abs(a) > 0.01) {
    if (Math.abs(a - 1) < 0.01) eq.push("x²");
    else if (Math.abs(a + 1) < 0.01) eq.push("−x²");
    else eq.push(`${a.toFixed(1)}x²`);
  }
  if (Math.abs(b) > 0.01) {
    const s = eq.length > 0 ? (b > 0 ? " + " : " − ") : b < 0 ? "−" : "";
    eq.push(`${s}${Math.abs(b).toFixed(1)}x`);
  }
  if (Math.abs(c) > 0.01 || eq.length === 0) {
    const s = eq.length > 0 ? (c >= 0 ? " + " : " − ") : c < 0 ? "−" : "";
    eq.push(`${s}${Math.abs(c).toFixed(1)}`);
  }
  const eqStr = eq.join("") || "0";

  const gridVals = [-30, -20, -10, 0, 10, 20, 30];

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 6 }}>מעבדת פרבולות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "1rem" }}>שנה את המקדמים וצפה כיצד הפרבולה משתנה בזמן אמת</p>

      <div style={{ textAlign: "center", marginBottom: "1rem", fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: "#2D3436" }}>
        f(x) = <span style={{ color: st.accentColor }}>{eqStr}</span>
      </div>

      {/* SVG */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 400 }} aria-hidden>
          {gridVals.map((v) => {
            const sx = toSx(v), sy = toSy(v);
            return (
              <g key={v}>
                {sx >= 0 && sx <= W && <line x1={sx} y1={0} x2={sx} y2={H} stroke="rgba(100,116,139,0.18)" strokeWidth={0.8} />}
                {sy >= 0 && sy <= H && <line x1={0} y1={sy} x2={W} y2={sy} stroke="rgba(100,116,139,0.18)" strokeWidth={0.8} />}
              </g>
            );
          })}
          <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.4} />
          <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.4} />
          {pathD && <path d={pathD} fill="none" stroke={st.accentColor} strokeWidth={2.5} strokeLinejoin="round" />}
          {/* Roots — purple */}
          {roots.map((r, i) => (
            <circle key={i} cx={toSx(r)} cy={toSy(0)} r={5} fill="#a78bfa" />
          ))}
          {/* Vertex — orange */}
          {vertexInView && <circle cx={toSx(xv)} cy={toSy(yv)} r={6} fill="#f59e0b" />}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: "1.5rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" }}>
          <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
          נקודת קודקוד
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" }}>
          <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#a78bfa" }} />
          נקודות חיתוך (שורשים)
        </span>
      </div>

      {/* Sliders */}
      <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: `1px solid rgba(${st.borderRgb},0.25)`, padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: 14 }}>
        {([
          { label: "מקדם a (כיוון הפרבולה)", val: a, set: setA, min: -5, max: 5, step: 0.5 },
          { label: "מקדם b (מיקום קודקוד)",  val: b, set: setB, min: -10, max: 10, step: 1 },
          { label: "מקדם c (חיתוך עם ציר y)", val: c, set: setC, min: -20, max: 20, step: 1 },
        ] as const).map((row) => (
          <div key={row.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{row.label}</span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{(row.val as number).toFixed(1)}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={row.step} value={row.val as number}
              onChange={(e) => (row.set as (v: number) => void)(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "קודקוד", val: hasVertex && isFinite(yv) ? `(${xv.toFixed(1)}, ${yv.toFixed(1)})` : "—" },
          { label: "כיוון",  val: dirLabel },
          { label: "חיתוך y", val: `(0, ${c.toFixed(1)})` },
        ].map((t) => (
          <div key={t.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.35)`, padding: 12, boxShadow: `0 4px 16px rgba(${st.glowRgb},0.06)` }}>
            <div style={{ color: "#6B7280", fontSize: 11, marginBottom: 6 }}>{t.label}</div>
            <div style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{t.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);

  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Formula bar */}
      <div className="formula-bar" style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div className="formula-title" style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 14, textAlign: "center" }}>נוסחאות מרכזיות</div>
        <div className="formula-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: "0 1.5rem", alignItems: "start" }}>

          {/* עמודה ימנית — מאפייני הפרבולה */}
          <div className="formula-col" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="formula-col-title" style={{ color: s.accentColor, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", marginBottom: 2 }}>מאפייני הפרבולה</div>
            {[
              { label: "קודקוד הפרבולה", tex: "x_v = \\dfrac{-b}{2a}" },
              { label: "ערך ה-y בקודקוד", tex: "y_v = f(x_v)" },
              { label: "חיתוך עם ציר y", tex: "(0,\\, c)" },
            ].map(({ label, tex }) => (
              <div key={label} className="formula-item" style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "right" }}>
                <span className="formula-label" style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>{label}</span>
                <span style={{ display: "block", textAlign: "center", padding: "4px 0" }}><TexBlock>{tex}</TexBlock></span>
              </div>
            ))}
          </div>

          {/* מפריד */}
          <div className="formula-divider" style={{ background: "rgba(60,54,42,0.12)", width: 1, alignSelf: "stretch" }} />

          {/* עמודה שמאלית — פתרון משוואות */}
          <div className="formula-col" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="formula-col-title" style={{ color: s.accentColor, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", marginBottom: 2 }}>פתרון משוואות</div>
            <div className="formula-item" style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "right" }}>
              <span className="formula-label" style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>נוסחת השורשים</span>
              <span style={{ display: "block", textAlign: "center", padding: "4px 0" }}><TexBlock>{"x_{1,2} = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"}</TexBlock></span>
            </div>
            <div className="formula-item" style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "right" }}>
              <span className="formula-label" style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>נקודות אפס</span>
              <span style={{ color: "#2D3436", fontSize: 12, lineHeight: 1.5, textAlign: "right" }}>
                חיתוך עם ציר <Tex>{"x"}</Tex> כאשר <Tex>{"y=0"}</Tex>
              </span>
            </div>
            <div className="formula-item" style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "right" }}>
              <span className="formula-label" style={{ color: "#6B7280", fontSize: 11, fontWeight: 600 }}>חיוביות / שליליות</span>
              <span style={{ color: "#2D3436", fontSize: 12, lineHeight: 1.5, textAlign: "right" }}>
                בדיקת תחומים לפי צורת הפרבולה:<br />
                <Tex>{"a>0"}</Tex> — מחייכת ∪ &nbsp;|&nbsp; <Tex>{"a<0"}</Tex> — בוכה ∩
              </span>
            </div>
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
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        {ex.diagram}
      </div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
          <button onClick={() => { navigator.clipboard.writeText(ex.problem.split(/\n+סעיף/)[0].trim()); setCopiedProblem(true); setTimeout(() => setCopiedProblem(false), 2000); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
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
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const GRADE_MAP: Record<string, string> = { "10": "י׳", "11": 'י"א', "12": 'י"ב' };

function injectGrade(text: string, grade: string): string {
  const label = GRADE_MAP[grade] || "י׳";
  return text.replace(/כיתה י[׳']/g, `כיתה ${label}`);
}

export default function AlgebraParabolaPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");

  const [userGrade, setUserGrade] = useState("10");
  useEffect(() => {
    const g = localStorage.getItem("math-grade");
    if (g) setUserGrade(g);
  }, []);

  const ex = exercises.find(e => e.id === selectedLevel)!;
  const dynamicEx = { ...ex, goldenPrompt: injectGrade(ex.goldenPrompt, userGrade) };
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"] { outline: none !important; }
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>פרבולות עם AI</h1>
          <Link
            href="/"
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

        {/* Level selector */}
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

        {/* Active exercise card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={dynamicEx} />
        </motion.div>

        {/* Lab — all levels */}
        <ParabolaLab levelId={selectedLevel} />

      </div>
    </main>
  );
}
