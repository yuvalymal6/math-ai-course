"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── KaTeX renderers ─────────────────────────────────────────────────────────

function Tex({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: false }); }, [children]);
  return <span ref={ref} dir="ltr" style={{ unicodeBidi: "embed" }} />;
}

function TexBlock({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]);
  return <span ref={ref} dir="ltr" style={{ display: "block", textAlign: "center", unicodeBidi: "embed" }} />;
}

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
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",   accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני", badgeCls: "bg-orange-600 text-white", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12",  accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38",  accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53"  },
} as const;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic"    as const, label: "בסיסי — מלבן בפרבולה",     bg: "bg-green-50",  border: "border-green-600",  textColor: "text-green-700",  glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium"   as const, label: "בינוני — מרחק מינימלי",    bg: "bg-orange-50", border: "border-orange-600", textColor: "text-orange-700", glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced" as const, label: "מתקדם — מלבן בין פרבולות", bg: "bg-red-50",    border: "border-red-700",    textColor: "text-red-700",    glowColor: "rgba(220,38,38,0.3)"   },
] as const;

// ─── Formulas ─────────────────────────────────────────────────────────────────

// ─── FormulaBar (interactive clickable tabs with KaTeX) ──────────────────────

function FormulaBar({ accentColor, accentRgb }: { accentColor: string; accentRgb: string }) {
  const [activeTab, setActiveTab] = useState<"area" | "distance" | "extremum" | "derivative" | null>(null);

  const tabs = [
    { id: "area" as const, label: "📐 שטח מלבן", tex: String.raw`A = 2x \cdot f(x)`, color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "distance" as const, label: "📏 מרחק²", tex: String.raw`D^2`, color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "extremum" as const, label: "🎯 קיצון", tex: String.raw`A'(x)=0`, color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
    { id: "derivative" as const, label: "📈 נגזרת", tex: String.raw`f'(x)`, color: "#6366f1", borderColor: "rgba(99,102,241,0.35)" },
  ];

  return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${accentRgb},0.3)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.5rem", boxShadow: `0 2px 8px rgba(${accentRgb},0.08)` }}>
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
                border: `1.5px solid ${isActive ? t.borderColor : `rgba(${accentRgb},0.15)`}`,
                background: isActive ? `${t.color}0D` : `rgba(${accentRgb},0.03)`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : accentColor }}><Tex>{t.tex}</Tex></span>
            </button>
          );
        })}
      </div>

      {/* Expanded content */}
      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <TexBlock>{String.raw`A(x) = 2x \cdot f(x) = 2x(9 - x^2) = 18x - 2x^3`}</TexBlock>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך בונים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הגדירו <Tex>x</Tex> כמחצית הרוחב.</li>
                  <li>הגובה הוא <Tex>{String.raw`f(x)`}</Tex> — ערך הפונקציה.</li>
                  <li>שטח = רוחב × גובה = <Tex>{String.raw`2x \cdot f(x)`}</Tex>.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "distance" && (
        <motion.div key="distance" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.3)", background: "rgba(255,251,235,0.6)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <TexBlock>{String.raw`D^2 = (x_1 - x_2)^2 + (y_1 - y_2)^2`}</TexBlock>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px", color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
              💡 <strong>טיפ:</strong> ממזערים <Tex>{String.raw`D^2`}</Tex> במקום <Tex>D</Tex> — חוסך שורש ומפשט גזירה.
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "extremum" && (
        <motion.div key="extremum" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,226,226,0.4)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <TexBlock>{String.raw`A'(x) = 0 \quad \Rightarrow \quad \text{נקודות חשודות לקיצון}`}</TexBlock>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px", color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
              <strong>שלבים:</strong>
              <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                <li>גזרו את <Tex>{String.raw`A(x)`}</Tex>.</li>
                <li>השוו <Tex>{String.raw`A'(x) = 0`}</Tex> ומצאו <Tex>x</Tex>.</li>
                <li>בדקו עם <Tex>{String.raw`A''(x)`}</Tex> אם מקסימום או מינימום.</li>
              </ol>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "derivative" && (
        <motion.div key="derivative" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(99,102,241,0.25)", background: "rgba(238,242,255,0.6)", padding: 16 }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <TexBlock>{String.raw`f(x) = x^n \;\Rightarrow\; f'(x) = n \cdot x^{n-1}`}</TexBlock>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", padding: "12px 14px", color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
              💡 <strong>דוגמה:</strong> <Tex>{String.raw`f(x) = -x^2 + 9 \;\Rightarrow\; f'(x) = -2x`}</Tex>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Static SVG Diagrams ──────────────────────────────────────────────────────

function ParabolaBaseStaticDiagram() {
  const W = 320, H = 170;
  const ox = 160, oy = 145;
  const sx = 45, sy = 14;

  const parPts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = -3.1 + (i / 60) * 6.2;
    const y = -x * x + 9;
    if (y >= -0.5) parPts.push(`${ox + x * sx},${oy - y * sy}`);
  }

  const rx = 1.4;
  const ry = -rx * rx + 9;
  const rLeft = ox - rx * sx, rRight = ox + rx * sx;
  const rTop = oy - ry * sy, rBot = oy;

  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(22,163,74,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>הגדרת הבעיה — מלבן חסום בפרבולה</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
        <line x1={20} y1={oy} x2={W - 10} y2={oy} stroke="rgba(100,116,139,0.3)" strokeWidth={1.5} />
        <line x1={ox} y1={H - 10} x2={ox} y2={10} stroke="rgba(100,116,139,0.3)" strokeWidth={1.5} />
        <text x={W - 12} y={oy - 4} fill="#94a3b8" fontSize={9}>x</text>
        <text x={ox + 4} y={14} fill="#94a3b8" fontSize={9}>y</text>
        <polyline points={parPts.join(" ")} fill="none" stroke="#22c55e" strokeWidth={2.5} />
        <rect x={rLeft} y={rTop} width={rRight - rLeft} height={rBot - rTop}
          fill="#22c55e15" stroke="#22c55e" strokeWidth={1.8} strokeDasharray="5,2" rx={1} />
        <line x1={ox} y1={rBot + 10} x2={rRight} y2={rBot + 10} stroke="#00d4ff" strokeWidth={1.2} />
        <line x1={ox} y1={rBot + 6} x2={ox} y2={rBot + 14} stroke="#00d4ff" strokeWidth={1.2} />
        <line x1={rRight} y1={rBot + 6} x2={rRight} y2={rBot + 14} stroke="#00d4ff" strokeWidth={1.2} />
        <text x={(ox + rRight) / 2} y={rBot + 22} textAnchor="middle" fill="#00d4ff" fontSize={10} fontWeight="bold">x</text>
        <line x1={rRight + 10} y1={rTop} x2={rRight + 10} y2={rBot} stroke="#f97316" strokeWidth={1.2} />
        <line x1={rRight + 6} y1={rTop} x2={rRight + 14} y2={rTop} stroke="#f97316" strokeWidth={1.2} />
        <line x1={rRight + 6} y1={rBot} x2={rRight + 14} y2={rBot} stroke="#f97316" strokeWidth={1.2} />
        <text x={rRight + 22} y={rTop + (rBot - rTop) / 2 + 4} fill="#f97316" fontSize={10} fontWeight="bold">y</text>
        <circle cx={rRight} cy={rTop} r={3.5} fill="#22c55e" />
        <circle cx={rLeft} cy={rTop} r={3.5} fill="#22c55e" />
      </svg>
    </div>
  );
}

function DistanceMediumStaticDiagram() {
  const W = 320, H = 170;
  const ox = 30, oy = 150;
  const sx = 52, sy = 52;

  const sqrtPts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = (i / 60) * 5.2;
    const y = Math.sqrt(x);
    if (y <= 2.8) sqrtPts.push(`${ox + x * sx},${oy - y * sy}`);
  }

  const tx = 3.5, ty = Math.sqrt(3.5);
  const px = ox + tx * sx, py = oy - ty * sy;
  const qx = ox + 4 * sx, qy = oy;

  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(234,88,12,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>הגדרת הבעיה — מרחק מינימלי לעקומה</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
        <line x1={ox - 10} y1={oy} x2={W - 10} y2={oy} stroke="rgba(100,116,139,0.3)" strokeWidth={1.5} />
        <line x1={ox} y1={H - 5} x2={ox} y2={10} stroke="rgba(100,116,139,0.3)" strokeWidth={1.5} />
        <text x={W - 12} y={oy - 4} fill="#94a3b8" fontSize={9}>x</text>
        <text x={ox + 4} y={14} fill="#94a3b8" fontSize={9}>y</text>
        <polyline points={sqrtPts.join(" ")} fill="none" stroke="#f59e0b" strokeWidth={2.5} />
        <circle cx={qx} cy={qy} r={5} fill="#f43f5e" />
        <text x={qx + 6} y={qy - 4} fill="#f43f5e" fontSize={10} fontWeight="bold">B</text>
        <circle cx={px} cy={py} r={4.5} fill="#f59e0b" />
        <text x={px - 8} y={py - 8} fill="#f59e0b" fontSize={10} fontWeight="bold">A</text>
        <line x1={px} y1={py} x2={qx} y2={qy} stroke="#a78bfa" strokeWidth={1.8} strokeDasharray="5,3" />
        <text x={(px + qx) / 2 + 5} y={(py + qy) / 2 - 6} fill="#a78bfa" fontSize={10} fontWeight="bold">d</text>
      </svg>
    </div>
  );
}

function TwoParabolasAdvancedStaticDiagram() {
  const W = 320, H = 175;
  const ox = 160, oy = 120;
  const sx = 52, sy = 14;

  const fPts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = -2.6 + (i / 60) * 5.2;
    const y = x * x;
    if (y <= 8.5) fPts.push(`${ox + x * sx},${oy - y * sy}`);
  }
  const gPts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = -2.6 + (i / 60) * 5.2;
    const y = -x * x + 8;
    if (y >= -0.5) gPts.push(`${ox + x * sx},${oy - y * sy}`);
  }

  const rx = 1.0;
  const fy = rx * rx;
  const gy = -rx * rx + 8;
  const rLeft = ox - rx * sx, rRight = ox + rx * sx;
  const rTop = oy - gy * sy, rBot = oy - fy * sy;

  return (
    <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(220,38,38,0.2)", padding: 12 }}>
      <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>הגדרת הבעיה — מלבן בין שתי פרבולות</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
        <line x1={20} y1={oy} x2={W - 10} y2={oy} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
        <line x1={ox} y1={H - 5} x2={ox} y2={5} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
        <polyline points={gPts.join(" ")} fill="none" stroke="#f43f5e" strokeWidth={2.2} />
        <polyline points={fPts.join(" ")} fill="none" stroke="#3b82f6" strokeWidth={2.2} />
        <text x={ox - 2.4 * sx + 4} y={oy - (-2.4 * 2.4 + 8) * sy + 2} fill="#f43f5e" fontSize={10} fontWeight="bold">g</text>
        <text x={ox - 2.4 * sx + 4} y={oy - 2.4 * 2.4 * sy - 4} fill="#3b82f6" fontSize={10} fontWeight="bold">f</text>
        <rect x={rLeft} y={rTop} width={rRight - rLeft} height={rBot - rTop}
          fill="#f43f5e10" stroke="#f43f5e" strokeWidth={1.8} strokeDasharray="5,2" rx={1} />
        <line x1={ox} y1={rBot + 10} x2={rRight} y2={rBot + 10} stroke="#00d4ff" strokeWidth={1.2} />
        <line x1={ox} y1={rBot + 6} x2={ox} y2={rBot + 14} stroke="#00d4ff" strokeWidth={1.2} />
        <line x1={rRight} y1={rBot + 6} x2={rRight} y2={rBot + 14} stroke="#00d4ff" strokeWidth={1.2} />
        <text x={(ox + rRight) / 2} y={rBot + 22} textAnchor="middle" fill="#00d4ff" fontSize={9}>x</text>
        <circle cx={rRight} cy={rTop} r={3.5} fill="#f43f5e" />
        <circle cx={rRight} cy={rBot} r={3.5} fill="#3b82f6" />
        <circle cx={rLeft} cy={rTop} r={3.5} fill="#f43f5e" />
        <circle cx={rLeft} cy={rBot} r={3.5} fill="#3b82f6" />
      </svg>
    </div>
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

function LadderBase({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const steps = ex.steps;
  const st = (typeof STATION !== "undefined" && STATION[ex.id as keyof typeof STATION]) || { borderRgb: "45,90,39", glowRgb: "22,163,74" };
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => {
    setCompleted(prev => { const next = [...prev]; next[i] = true; return next; });
    const el = document.getElementById(`basic-step-${i + 1}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  };
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic key={i} step={s} glowRgb={accentRgb} borderRgb={st.borderRgb} />
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
              <TutorStepBasic key={i} step={s} glowRgb={accentRgb} borderRgb={st.borderRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LadderMedium({ ex, accentColor, accentRgb }: { ex: ExerciseDef; accentColor: string; accentRgb: string }) {
  const st = STATION[ex.id as keyof typeof STATION];
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
  const steps = ex.steps;
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={ex.subjectWords} subjectHint={ex.subjectHint} />

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

// ─── Interactive Lab Components ───────────────────────────────────────────────

function ParabolaViz({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [x, setX] = useState(1.2);
  const st = STATION[levelId];
  const xOpt = Math.sqrt(3);
  const y = -x * x + 9;
  const A = 2 * x * y;
  const AMax = 2 * xOpt * (-xOpt * xOpt + 9);
  const atMax = Math.abs(x - xOpt) < 0.07;

  const SW = 220, SH = 190;
  const ox = 26, oy = 170, sxL = 58, syL = 16;

  const parPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const xi = -3.1 + (i / 80) * 6.2;
    const yi = -xi * xi + 9;
    if (yi >= 0) parPts.push(`${ox + xi * sxL},${oy - yi * syL}`);
  }

  const rLeft  = ox - x * sxL;
  const rRight = ox + x * sxL;
  const rTop   = oy - y * syL;
  const rBot   = oy;

  const CP = 22, maxAG = 22;
  const aPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const xi = (i / 80) * 3;
    const ai = 2 * xi * (-xi * xi + 9);
    aPts.push(`${CP + (i / 80) * (SW - CP * 2)},${SH - CP - (Math.max(0, ai) / maxAG) * (SH - CP * 2)}`);
  }
  const dotX = CP + (x / 3) * (SW - CP * 2);
  const dotY = SH - CP - (Math.max(0, A) / maxAG) * (SH - CP * 2);
  const maxDotX = CP + (xOpt / 3) * (SW - CP * 2);
  const maxDotY = SH - CP - (AMax / maxAG) * (SH - CP * 2);

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: `1px solid ${st.glowBorder}`, boxShadow: st.glowShadow, marginBottom: "2rem", marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>מלבן בפרבולה — מעבדה אינטראקטיבית</h2>
        {atMax && <span className="text-green-400" style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />מקסימום!</span>}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>f(x) = −x² + 9</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <line x1={ox - 8} y1={oy} x2={SW - 6} y2={oy} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <line x1={ox} y1={SH - 4} x2={ox} y2={6} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <polyline points={parPts.join(" ")} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.9} />
            <motion.rect
              animate={{ x: rLeft, y: rTop, width: rRight - rLeft, height: rBot - rTop }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#22c55e25" : "#22c55e12"} stroke="#22c55e" strokeWidth={atMax ? 2 : 1.5}
            />
            <motion.text animate={{ x: ox + x * sxL / 2, y: oy + 13 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              textAnchor="middle" fill="#00d4ff" fontSize={9}>x={(x).toFixed(2)}</motion.text>
            <motion.text animate={{ x: rRight + 14, y: oy - y * syL / 2 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              textAnchor="start" fill="#f97316" fontSize={9}>y={y.toFixed(2)}</motion.text>
            <motion.circle animate={{ cx: rRight, cy: rTop }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMax ? 5 : 3.5} fill={atMax ? "#22c55e" : "#86efac"} stroke="#fff" strokeWidth={1.5} />
            <motion.circle animate={{ cx: rLeft, cy: rTop }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMax ? 5 : 3.5} fill={atMax ? "#22c55e" : "#86efac"} stroke="#fff" strokeWidth={1.5} />
          </svg>
        </div>
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>A(x) = 2x(9 − x²)</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <polyline points={aPts.join(" ")} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.8} />
            <line x1={CP} y1={SH - CP} x2={SW - CP / 2} y2={SH - CP} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <line x1={CP} y1={CP / 2} x2={CP} y2={SH - CP} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <circle cx={maxDotX} cy={maxDotY} r={9} fill="#22c55e30" />
            <circle cx={maxDotX} cy={maxDotY} r={5} fill="#22c55e" />
            <text x={maxDotX + 8} y={maxDotY - 6} fill="#22c55e" fontSize={9}>max</text>
            <motion.line animate={{ x1: dotX, x2: dotX }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH - CP} y2={CP / 2} stroke="#f97316" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotX, cy: dotY }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMax ? 7 : 5} fill={atMax ? "#22c55e" : "#f97316"} stroke="#fff" strokeWidth={2} />
            <motion.text animate={{ x: dotX + 8, y: Math.max(dotY - 4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#22c55e" : "#f97316"} fontSize={10}>A={A.toFixed(1)}</motion.text>
          </svg>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>מחצית רוחב <span style={{ fontFamily: "monospace", color: "#2D3436" }}>x</span></span>
          <span style={{ fontFamily: "monospace", color: atMax ? "#22c55e" : "#2D3436", fontWeight: 700 }}>{x.toFixed(2)}</span>
        </div>
        <input type="range" min={0.05} max={2.95} step={0.05} value={x}
          onChange={e => setX(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#22c55e" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור לעבר x = √3 ≈ 1.73 כדי למצוא את המקסימום</p>
      </div>
      <LabMessage text={`מצוין! מצאת את נקודת המקסימום — שטח A = ${AMax.toFixed(2)} 🎯`} type="success" visible={atMax} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>רוחב 2x</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{(2 * x).toFixed(2)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>גובה y</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{y.toFixed(2)}</p>
        </div>
        <div style={{ background: atMax ? "rgba(220,252,231,0.7)" : "rgba(255,255,255,0.75)", border: atMax ? "1px solid #86efac" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMax ? "#16a34a" : "#94a3b8", marginBottom: 4 }}>שטח A</p>
          <p style={{ fontFamily: "monospace", color: atMax ? "#15803d" : "#1A1A1A", fontWeight: 700 }}>{A.toFixed(2)}</p>
        </div>
      </div>
    </section>
  );
}

function DistanceViz({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [t, setT] = useState(1.5);
  const st = STATION[levelId];
  const tOpt = 3.5;
  const D2 = t * t - 7 * t + 16;
  const D2Min = tOpt * tOpt - 7 * tOpt + 16;
  const atMin = Math.abs(t - tOpt) < 0.12;

  const SW = 220, SH = 190;
  const ox = 20, oy = 170, sxL = 38, syL = 52;

  const sqrtPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const xi = (i / 80) * 5.4;
    sqrtPts.push(`${ox + xi * sxL},${oy - Math.sqrt(xi) * syL}`);
  }

  const ax = ox + t * sxL;
  const ay = oy - Math.sqrt(Math.max(0, t)) * syL;
  const bx = ox + 4 * sxL;
  const by = oy;

  const CP = 22, maxD2 = 20;
  const d2Pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const ti = (i / 80) * 5;
    const di = ti * ti - 7 * ti + 16;
    d2Pts.push(`${CP + (i / 80) * (SW - CP * 2)},${SH - CP - (Math.max(0, Math.min(di, maxD2)) / maxD2) * (SH - CP * 2)}`);
  }
  const dotXd = CP + (t / 5) * (SW - CP * 2);
  const dotYd = SH - CP - (Math.min(D2, maxD2) / maxD2) * (SH - CP * 2);
  const minDotXd = CP + (tOpt / 5) * (SW - CP * 2);
  const minDotYd = SH - CP - (D2Min / maxD2) * (SH - CP * 2);

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: `1px solid ${st.glowBorder}`, boxShadow: st.glowShadow, marginBottom: "2rem", marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>מרחק מינימלי — מעבדה אינטראקטיבית</h2>
        {atMin && <span className="text-amber-400" style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />מינימום!</span>}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>f(x) = √x עם נקודה (4, 0)</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <line x1={ox - 6} y1={oy} x2={SW - 4} y2={oy} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <line x1={ox} y1={SH - 4} x2={ox} y2={8} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <polyline points={sqrtPts.join(" ")} fill="none" stroke="#f59e0b" strokeWidth={2.2} opacity={0.9} />
            <motion.line
              animate={{ x1: ax, y1: ay, x2: bx, y2: by }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              stroke={atMin ? "#22c55e" : "#a78bfa"} strokeWidth={atMin ? 2 : 1.5} strokeDasharray={atMin ? "0" : "5,3"}
            />
            <circle cx={bx} cy={by} r={5} fill="#f43f5e" />
            <text x={bx + 6} y={by - 5} fill="#f43f5e" fontSize={9}>(4, 0)</text>
            <motion.circle animate={{ cx: ax, cy: ay }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              r={atMin ? 6 : 4.5} fill={atMin ? "#22c55e" : "#f59e0b"} stroke="#fff" strokeWidth={2} />
            <motion.text animate={{ x: ax - 6, y: ay - 9 }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              textAnchor="end" fill={atMin ? "#22c55e" : "#f59e0b"} fontSize={9}>t={t.toFixed(2)}</motion.text>
            {[1, 2, 3, 4].map(v => (
              <g key={v}>
                <line x1={ox + v * sxL} y1={oy - 3} x2={ox + v * sxL} y2={oy + 3} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
                <text x={ox + v * sxL} y={oy + 11} textAnchor="middle" fill="#475569" fontSize={8}>{v}</text>
              </g>
            ))}
          </svg>
        </div>
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>D²(t) = t² − 7t + 16</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <polyline points={d2Pts.join(" ")} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.8} />
            <line x1={CP} y1={SH - CP} x2={SW - CP / 2} y2={SH - CP} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <line x1={CP} y1={CP / 2} x2={CP} y2={SH - CP} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <circle cx={minDotXd} cy={minDotYd} r={9} fill="#22c55e30" />
            <circle cx={minDotXd} cy={minDotYd} r={5} fill="#22c55e" />
            <text x={minDotXd + 8} y={minDotYd - 6} fill="#22c55e" fontSize={9}>min</text>
            <motion.line animate={{ x1: dotXd, x2: dotXd }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH - CP} y2={CP / 2} stroke="#f97316" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotXd, cy: dotYd }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMin ? 7 : 5} fill={atMin ? "#22c55e" : "#f97316"} stroke="#fff" strokeWidth={2} />
            <motion.text animate={{ x: dotXd + 8, y: Math.max(dotYd - 4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMin ? "#22c55e" : "#f97316"} fontSize={10}>D²={D2.toFixed(2)}</motion.text>
          </svg>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>נקודה על הגרף <span style={{ fontFamily: "monospace", color: "#2D3436" }}>t</span></span>
          <span style={{ fontFamily: "monospace", color: atMin ? "#f59e0b" : "#2D3436", fontWeight: 700 }}>{t.toFixed(2)}</span>
        </div>
        <input type="range" min={0.1} max={5} step={0.05} value={t}
          onChange={e => setT(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#f59e0b" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור לעבר t = 3.5 כדי למצוא את המרחק המינימלי</p>
      </div>
      <LabMessage text={`מצוין! מצאת את נקודת המינימום — d = ${Math.sqrt(D2Min).toFixed(3)} 🎯`} type="success" visible={atMin} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>נקודה (t, √t)</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>({t.toFixed(2)}, {Math.sqrt(t).toFixed(2)})</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>מרחק²</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{D2.toFixed(3)}</p>
        </div>
        <div style={{ background: atMin ? "rgba(255,251,235,0.7)" : "rgba(255,255,255,0.75)", border: atMin ? "1px solid #fcd34d" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMin ? "#d97706" : "#94a3b8", marginBottom: 4 }}>מרחק d</p>
          <p style={{ fontFamily: "monospace", color: atMin ? "#92400e" : "#1A1A1A", fontWeight: 700 }}>{Math.sqrt(D2).toFixed(3)}</p>
        </div>
      </div>
    </section>
  );
}

function TwoParabolasViz({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [x, setX] = useState(0.8);
  const st = STATION[levelId];
  const xOpt = 2 / Math.sqrt(3);
  const fy = x * x;
  const gy = -x * x + 8;
  const height = gy - fy;
  const A = 2 * x * height;
  const AMax = 2 * xOpt * (8 - 2 * xOpt * xOpt);
  const atMax = Math.abs(x - xOpt) < 0.07;

  const SW = 220, SH = 190;
  const ox = SW / 2, oy = 115, sxL = 42, syL = 13;

  const fPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const xi = -2.5 + (i / 80) * 5;
    const yi = xi * xi;
    if (yi <= 8.5) fPts.push(`${ox + xi * sxL},${oy - yi * syL}`);
  }
  const gPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const xi = -2.5 + (i / 80) * 5;
    const yi = -xi * xi + 8;
    if (yi >= -0.5) gPts.push(`${ox + xi * sxL},${oy - yi * syL}`);
  }

  const rLeft  = ox - x * sxL;
  const rRight = ox + x * sxL;
  const rTop   = oy - gy * syL;
  const rBot   = oy - fy * syL;

  const CP = 22, maxAG = 14;
  const aPts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const xi = (i / 80) * 2;
    const ai = Math.max(0, 16 * xi - 4 * xi * xi * xi);
    aPts.push(`${CP + (i / 80) * (SW - CP * 2)},${SH - CP - (ai / maxAG) * (SH - CP * 2)}`);
  }
  const dotXa = CP + (x / 2) * (SW - CP * 2);
  const dotYa = SH - CP - (Math.max(0, A) / maxAG) * (SH - CP * 2);
  const maxDotXa = CP + (xOpt / 2) * (SW - CP * 2);
  const maxDotYa = SH - CP - (AMax / maxAG) * (SH - CP * 2);

  return (
    <section style={{ borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", border: `1px solid ${st.glowBorder}`, boxShadow: st.glowShadow, marginBottom: "2rem", marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2D3436", margin: 0 }}>מלבן בין פרבולות — מעבדה אינטראקטיבית</h2>
        {atMax && <span className="text-rose-400" style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} />מקסימום!</span>}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>f(x)=x² ו-g(x)=−x²+8</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <line x1={10} y1={oy} x2={SW - 6} y2={oy} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <line x1={ox} y1={SH - 6} x2={ox} y2={6} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <polyline points={gPts.join(" ")} fill="none" stroke="#f43f5e" strokeWidth={2} opacity={0.9} />
            <polyline points={fPts.join(" ")} fill="none" stroke="#3b82f6" strokeWidth={2} opacity={0.9} />
            <text x={ox + 2.0 * sxL + 2} y={oy - (-4 + 8) * syL - 3} fill="#f43f5e" fontSize={8}>g(x)</text>
            <text x={ox + 2.0 * sxL + 2} y={oy - 4 * syL + 12} fill="#3b82f6" fontSize={8}>f(x)</text>
            <motion.rect
              animate={{ x: rLeft, y: rTop, width: rRight - rLeft, height: rBot - rTop }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              fill={atMax ? "#f43f5e20" : "#f43f5e10"} stroke="#f43f5e" strokeWidth={atMax ? 2 : 1.5}
            />
            <motion.text animate={{ x: ox, y: rBot + 14 }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              textAnchor="middle" fill="#00d4ff" fontSize={9}>2x={(2 * x).toFixed(2)}</motion.text>
            <motion.text animate={{ x: rRight + 16, y: (rTop + rBot) / 2 + 4 }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              textAnchor="start" fill="#f97316" fontSize={8}>h={height.toFixed(2)}</motion.text>
            <motion.circle animate={{ cx: rRight, cy: rTop }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              r={atMax ? 5 : 3} fill="#f43f5e" stroke="#fff" strokeWidth={1.5} />
            <motion.circle animate={{ cx: rLeft, cy: rTop }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              r={atMax ? 5 : 3} fill="#f43f5e" stroke="#fff" strokeWidth={1.5} />
            <motion.circle animate={{ cx: rRight, cy: rBot }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              r={atMax ? 5 : 3} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
            <motion.circle animate={{ cx: rLeft, cy: rBot }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
              r={atMax ? 5 : 3} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
          </svg>
        </div>
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid rgba(100,116,139,0.2)", overflow: "hidden" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", paddingTop: 8, paddingBottom: 4 }}>A(x) = 2x(8 − 2x²)</p>
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`}>
            <polyline points={aPts.join(" ")} fill="none" stroke="#f43f5e" strokeWidth={2} opacity={0.8} />
            <line x1={CP} y1={SH - CP} x2={SW - CP / 2} y2={SH - CP} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <line x1={CP} y1={CP / 2} x2={CP} y2={SH - CP} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
            <circle cx={maxDotXa} cy={maxDotYa} r={9} fill="#f43f5e30" />
            <circle cx={maxDotXa} cy={maxDotYa} r={5} fill="#f43f5e" />
            <text x={maxDotXa + 8} y={maxDotYa - 6} fill="#f43f5e" fontSize={9}>max</text>
            <motion.line animate={{ x1: dotXa, x2: dotXa }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              y1={SH - CP} y2={CP / 2} stroke="#f97316" strokeWidth={1} strokeDasharray="4,3" />
            <motion.circle animate={{ cx: dotXa, cy: dotYa }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              r={atMax ? 7 : 5} fill={atMax ? "#f43f5e" : "#f97316"} stroke="#fff" strokeWidth={2} />
            <motion.text animate={{ x: dotXa + 8, y: Math.max(dotYa - 4, 12) }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              fill={atMax ? "#f43f5e" : "#f97316"} fontSize={10}>A={A.toFixed(2)}</motion.text>
          </svg>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: "#64748b" }}>מחצית רוחב <span style={{ fontFamily: "monospace", color: "#2D3436" }}>x</span></span>
          <span style={{ fontFamily: "monospace", color: atMax ? "#f43f5e" : "#2D3436", fontWeight: 700 }}>{x.toFixed(2)}</span>
        </div>
        <input type="range" min={0.05} max={1.95} step={0.05} value={x}
          onChange={e => setX(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "#f43f5e" }} />
        <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>גרור לעבר x = 2/√3 ≈ 1.15 כדי למצוא את המקסימום</p>
      </div>
      <LabMessage text={`מצוין! מצאת את נקודת המקסימום — שטח A = ${AMax.toFixed(2)} 🎯`} type="success" visible={atMax} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: "1rem", textAlign: "center", fontSize: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>רוחב 2x</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{(2 * x).toFixed(2)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12 }}>
          <p style={{ color: "#94a3b8", marginBottom: 4 }}>גובה h</p>
          <p style={{ fontFamily: "monospace", color: "#1A1A1A", fontWeight: 700 }}>{height.toFixed(2)}</p>
        </div>
        <div style={{ background: atMax ? "rgba(254,226,226,0.7)" : "rgba(255,255,255,0.75)", border: atMax ? "1px solid #fca5a5" : "1px solid rgba(100,116,139,0.2)", borderRadius: 12, padding: 12, transition: "all 0.3s" }}>
          <p style={{ color: atMax ? "#dc2626" : "#94a3b8", marginBottom: 4 }}>שטח A</p>
          <p style={{ fontFamily: "monospace", color: atMax ? "#991b1b" : "#1A1A1A", fontWeight: 700 }}>{A.toFixed(3)}</p>
        </div>
      </div>
    </section>
  );
}

function FunctionsLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  if (levelId === "medium")   return <DistanceViz levelId={levelId} />;
  if (levelId === "advanced") return <TwoParabolasViz levelId={levelId} />;
  return <ParabolaViz levelId={levelId} />;
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "מלבן חסום בפרבולה",
    problem: "נתונה פרבולה f(x) = −x² + 9. מלבן חסום בין הפרבולה לציר x, כאשר שני קודקודים עליונים נמצאים על הפרבולה ושני קודקודים תחתונים על ציר x. מה הממדים שייתנו שטח מרבי?",
    diagram: <ParabolaBaseStaticDiagram />,
    pitfalls: [
      { title: "⚠️ רוחב המלבן", text: "אם x הוא מחצית הרוחב, הרוחב הכולל הוא 2x, לא x. שים לב לסימטריה סביב ציר y." },
      { title: "גובה המלבן",    text: "גובה המלבן הוא y = f(x) = −x² + 9. חשוב שיהיה חיובי: נדרש x < 3." },
      { title: "לאשר מקסימום", text: "A″(x) = −12x < 0 מאשר מקסימום. בדוק גם קצוות: A(0) = A(3) = 0." },
    ],
    goldenPrompt: `\nאני תלמיד בכיתה י"א ורוצה לפתור בעיית קיצון:\nמלבן חסום בפרבולה f(x) = −x² + 9, קודקודים עליונים על הפרבולה.\nנחה אותי:\n1. לבחור משתנה x ולהגדיר תחום.\n2. לכתוב שטח A(x) במונחי x.\n3. לגזור ולמצוא מקסימום.\nשאל "מוכן?" בין שלב לשלב.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "שלב 1", label: "הגדר משתנה ותחום", prompt: "\n\nאני פותר בעיית קיצון: מלבן חסום בפרבולה f(x) = −x² + 9. הנחה אותי לבחור את המשתנה x ולקבוע את תחום ההגדרה. שאל אותי ואל תמשיך לפני שאענה." },
      { phase: "שלב 2", label: "פונקציית שטח",     prompt: "\n\nרוחב = 2x, גובה = 9 − x². תסביר לי כיצד לכתוב את פונקציית השטח ולפרוס אותה. שאל אם אני יודע מה השטח של מלבן." },
      { phase: "שלב 3", label: "גזור ומצא קיצון",  prompt: "\n\nA(x) = 18x − 2x³. כיצד לגזור ולמצוא נקודת קיצון? הנחה אותי שלב אחרי שלב ואל תיתן את x המדויק." },
      { phase: "שלב 4", label: "חשב שטח מקסימלי", prompt: "\n\nמצאתי את ה-x שנותן מקסימום. הנחה אותי לחשב את הרוחב, הגובה, ואת השטח המקסימלי. אל תפתור בשבילי — שאל אותי מה הערכים." },
    ],
  },
  {
    id: "medium",
    title: "מרחק מינימלי מנקודה לעקומה",
    problem: "מצא את הנקודה על העקומה f(x) = √x הקרובה ביותר לנקודה (4, 0). מה המרחק המינימלי?",
    diagram: <DistanceMediumStaticDiagram />,
    pitfalls: [
      { title: "⚠️ מזערם מרחק²",      text: "קל יותר למזער D²(t) = (t−4)² + t מאשר D(t). שניהם מגיעים לקיצון באותו ערך." },
      { title: "המשתנה הוא t",        text: "נקודה כללית על הגרף היא (t, √t). אל תבלבל את t של המשתנה עם x של נקודת העניין." },
      { title: "תחום ההגדרה",         text: "t ≥ 0 (תחום f(x) = √x). חשוב לוודא שהפתרון בתחום." },
    ],
    goldenPrompt: `\nאני תלמיד בכיתה י"א. רוצה למצוא את הנקודה על f(x) = √x הקרובה ביותר ל-(4, 0).\nנחה אותי:\n1. כיצד לכתוב את פונקציית המרחק D(t).\n2. למה כדאי למזער D²(t) במקום D(t).\n3. כיצד לגזור ולמצוא מינימום.\nשאל "מוכן?" בין שלב לשלב.`,
    steps: [
      {
        phase: "שלב 1", label: "נקודה כללית ומרחק",
        contextWords: ["נקודה", "מרחק", "D²", "ריבוע", "נוסחת מרחק", "√x"],
      },
      {
        phase: "שלב 2", label: "פרוס ופשט",
        contextWords: ["פרוס", "פשט", "t²", "איברים", "ריבוע", "(t-4)"],
      },
      {
        phase: "שלב 3", label: "גזור ומצא קיצון",
        contextWords: ["גזור", "נגזרת", "קיצון", "מינימום", "שווה לאפס"],
      },
      {
        phase: "שלב 4", label: "חשב נקודה ומרחק",
        contextWords: ["הצב", "נקודה", "מרחק", "√3.75", "מינימלי"],
      },
    ],
  },
  {
    id: "advanced",
    title: "מלבן חסום בין שתי פרבולות",
    problem: "נתונות שתי פרבולות: f(x) = x² ו-g(x) = −x² + 8. מצא מלבן בעל שטח מקסימלי שצלעותיו מקבילות לצירים.",
    diagram: <TwoParabolasAdvancedStaticDiagram />,
    pitfalls: [
      { title: "⚠️ גובה המלבן",  text: "גובה = g(x) − f(x) = (−x²+8) − x² = 8 − 2x². חייב לחסר את שתי הפרבולות." },
      { title: "נקודות חיתוך", text: "הפרבולות נחתכות ב-x = ±2. תחום הבעיה: 0 < x < 2." },
      { title: "סימטריה",       text: "המלבן סימטרי סביב ציר y — רוחב = 2x, לא x. אל תשכח את הגורם 2." },
    ],
    goldenPrompt: "\n\n",
    subjectWords: ["פרבולה", "f(x)", "g(x)", "מלבן", "שטח", "מקסימום", "קיצון", "גזור", "הפרש"],
    subjectHint:  "פרבולה / f(x) / g(x) / מלבן / שטח מקסימלי",
    steps: [
      {
        phase: "שלב 1", label: "הגדר x ותחום",
        contextWords: ["f(x)", "g(x)", "חיתוך", "תחום", "פרבולה", "x"],
      },
      {
        phase: "שלב 2", label: "גובה ופונקציית שטח",
        contextWords: ["גובה", "הפרש", "A(x)", "שטח", "g(x)", "f(x)"],
      },
      {
        phase: "שלב 3", label: "גזור ומצא קיצון",
        contextWords: ["גזור", "נגזרת", "קיצון", "מקסימום", "A′(x)"],
      },
      {
        phase: "שלב 4", label: "חשב שטח מקסימלי",
        contextWords: ["הצב", "רוחב", "גובה", "שטח", "מקסימלי"],
      },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KitzunFunctionsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>בעיות קיצון — פונקציות וגרפים עם AI</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>מלבנים חסומים, מרחקים ועקומות — תרגם גרף לפונקציה</p>
          </div>
          <Link
            href="/topic/kitzun"
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

        {/* Sub-topic progress bar */}
        <SubtopicProgress subtopicId="kitzun/functions" />

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

          {/* FormulaBar */}
          <FormulaBar accentColor={st.accentColor} accentRgb={st.glowRgb} />

          {/* Diagram */}
          <div style={{ borderRadius: 16, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: 12, marginBottom: "1.5rem" }}>
            {ex.diagram}
          </div>

          {/* Problem statement */}
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
        <FunctionsLab levelId={selectedLevel} />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/kitzun/functions" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
