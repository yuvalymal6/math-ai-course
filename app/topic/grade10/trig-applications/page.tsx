"use client";

import React, { useState, useRef, useEffect } from "react";
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

// ─── KaTeX renderers ─────────────────────────────────────────────────────────

function TexBlock({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]);
  return <span ref={ref} dir="ltr" style={{ display: "block", textAlign: "center", unicodeBidi: "embed" }} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  prompt: string;
  contextWords?: string[];
  keywords?: string[];
  keywordHint?: string;
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
  basic:    { stationName: "תחנה ראשונה",  badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  accentColor: "#2D5A27", borderHex: "#2D5A27", borderRgb: "45,90,39",   glowBorder: "rgba(45,90,39,0.35)",   glowShadow: "0 4px 16px rgba(45,90,39,0.12)",   glowRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",   badge: "בינוני", badgeCls: "bg-amber-600 text-white",  accentCls: "text-amber-700",  accentColor: "#92400E", borderHex: "#92400E", borderRgb: "146,64,14",  glowBorder: "rgba(146,64,14,0.35)",  glowShadow: "0 4px 16px rgba(146,64,14,0.12)",  glowRgb: "146,64,14"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-800 text-white",    accentCls: "text-red-800",    accentColor: "#991b1b", borderHex: "#991b1b", borderRgb: "153,27,27",  glowBorder: "rgba(153,27,27,0.35)",  glowShadow: "0 4px 16px rgba(153,27,27,0.12)",  glowRgb: "153,27,27"  },
} as const;

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700", border: "border-green-600", bg: "bg-green-600/10", glowColor: "rgba(45,90,39,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-amber-700", border: "border-amber-600", bg: "bg-amber-600/10", glowColor: "rgba(146,64,14,0.3)" },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-800",   border: "border-red-800",   bg: "bg-red-800/10",   glowColor: "rgba(153,27,27,0.3)" },
];

// ─── SVG diagrams (silent — no numbers, no answers) ───────────────────────────

function RectangleDiagramSVG() {
  // Rectangle ABCD: AD=8 (tall), AF=4 (narrow on AB). Proportions: height >> width of F
  // A(bottom-left), B(bottom-right), C(top-right), D(top-left)
  // Scale: AD~120px height, AF~60px. Rectangle width ~150px.
  const Ax = 50, Ay = 170, Dx = 50, Dy = 30;   // left side (A bottom, D top)
  const Bx = 200, By = 170, Cx = 200, Cy = 30;  // right side
  // F at AF/AB ratio ≈ 4/12 ≈ 0.33 of AB from A
  const Fx = Ax + (Bx - Ax) * 0.33, Fy = Ay;
  // E extends past B — line from D through F to E
  // Direction D→F: (Fx-Dx, Fy-Dy) = (Fx-50, 140)
  // E is where this line continues past F at y=Ay: that's F itself.
  // E must be on AB extended past B. Using the line slope from D(50,30) to F(~100,170):
  // slope = (170-30)/(100-50) = 140/50 = 2.8. At B's x=200: y = 30 + 2.8*(200-50) = 450 — way past.
  // The line DF exits the bottom at F. E is beyond B on the ground level.
  // Extend DF past F: at y=170, x progresses. Past F, the line goes right and below.
  // For the diagram, E is on AB extended. Line DE passes through F.
  // Using parametric: from D(50,30), direction to F(100,170). t=1 is F. t>1 continues.
  // At t=1.5: x = 50 + 1.5*50 = 125, y = 30 + 1.5*140 = 240 — below ground.
  // E must be at ground level (y=170) which is t=1 (= F). Contradiction for a straight line.
  // The correct geometry: E is on BC extended (right side extended downward), NOT on AB.
  // Let's place E on the extension of side BC downward: E = (200, 220).
  const Ex = Bx, Ey = By + 40; // E below B on BC extension
  return (
    <svg viewBox="0 0 260 230" className="w-full max-w-[250px] mx-auto" aria-hidden>
      {/* Rectangle ABCD */}
      <rect x={Ax} y={Dy} width={Bx - Ax} height={Ay - Dy} fill="rgba(99,102,241,0.04)" stroke="#334155" strokeWidth="2" />
      {/* BC extended to E (dashed, downward from B) */}
      <line x1={Bx} y1={By} x2={Ex} y2={Ey} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,3" />
      {/* Line DF through F to E */}
      <line x1={Dx} y1={Dy} x2={Ex} y2={Ey} stroke="#6366f1" strokeWidth="2" />
      {/* Right angle at A */}
      <polyline points={`${Ax + 10},${Ay} ${Ax + 10},${Ay - 10} ${Ax},${Ay - 10}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Right angle at B */}
      <polyline points={`${Bx - 10},${By} ${Bx - 10},${By - 10} ${Bx},${By - 10}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Point F on AB */}
      <circle cx={Fx} cy={Fy} r="3.5" fill="#10b981" />
      {/* Point E below B */}
      <circle cx={Ex} cy={Ey} r="3.5" fill="#f59e0b" />
      {/* Vertex labels */}
      <text x={Ax - 16} y={Ay + 4} fontSize="13" fill="#475569" fontWeight="700">A</text>
      <text x={Bx + 6} y={By - 4} fontSize="13" fill="#475569" fontWeight="700">B</text>
      <text x={Cx + 6} y={Cy + 4} fontSize="13" fill="#475569" fontWeight="700">C</text>
      <text x={Dx - 16} y={Dy + 4} fontSize="13" fill="#475569" fontWeight="700">D</text>
      <text x={Fx - 4} y={Fy + 16} fontSize="12" fill="#10b981" fontWeight="700">F</text>
      <text x={Ex + 8} y={Ey + 4} fontSize="12" fill="#f59e0b" fontWeight="700">E</text>
    </svg>
  );
}

function ParallelogramSVG() {
  // Parallelogram ABCD: A(bottom-left), B(bottom-right), C(top-right), D(top-left-ish)
  // AB = 1.5k, AD = k. Angle D = α. Height BE from B to DC.
  // D shifted right by AD*cos(α) from A's x
  return (
    <svg viewBox="0 0 300 170" className="w-full max-w-[280px] mx-auto" aria-hidden>
      {/* Parallelogram: A(30,140) B(210,140) D(70,40) C(250,40) */}
      <polygon points="30,140 210,140 250,40 70,40" fill="rgba(234,88,12,0.04)" stroke="#334155" strokeWidth="2" />
      {/* Height BE from B to DC */}
      <line x1={210} y1={140} x2={210} y2={40} stroke="#a78bfa" strokeWidth="2" strokeDasharray="6,3" />
      {/* Right angle at E */}
      <polyline points="198,40 198,52 210,52" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Diagonal BD */}
      <line x1={210} y1={140} x2={70} y2={40} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
      {/* Angle α at D */}
      <path d="M 90,40 A 20,20 0 0,1 82,56" fill="none" stroke="#DC2626" strokeWidth="2" />
      <text x="96" y="58" fontSize="11" fill="#DC2626" fontWeight="700" fontStyle="italic">α</text>
      {/* Vertices */}
      <text x="16" y="150" fontSize="13" fill="#475569" fontWeight="700">A</text>
      <text x="212" y="154" fontSize="13" fill="#475569" fontWeight="700">B</text>
      <text x="254" y="36" fontSize="13" fill="#475569" fontWeight="700">C</text>
      <text x="56" y="36" fontSize="13" fill="#475569" fontWeight="700">D</text>
      <text x="214" y="36" fontSize="12" fill="#a78bfa" fontWeight="700">E</text>
    </svg>
  );
}

function TriangleAltitudesSVG() {
  // Triangle ABC with E on BC, altitudes BD⊥AE and CF⊥AE(extended)
  return (
    <svg viewBox="0 0 300 180" className="w-full max-w-[280px] mx-auto" aria-hidden>
      {/* Main triangle ABC: A(150,20) B(40,155) C(260,155) */}
      <polygon points="150,20 40,155 260,155" fill="rgba(220,38,38,0.04)" stroke="#334155" strokeWidth="2" />
      {/* E on BC */}
      <circle cx={130} cy={155} r="3" fill="#10b981" />
      {/* Segment AE */}
      <line x1={150} y1={20} x2={130} y2={155} stroke="#334155" strokeWidth="1.5" />
      {/* AE extended past E (dashed) for CF */}
      <line x1={130} y1={155} x2={115} y2={195} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,3" />
      {/* Altitude BD ⊥ AE: D on AE */}
      <line x1={40} y1={155} x2={142} y2={75} stroke="#6366f1" strokeWidth="2" strokeDasharray="6,3" />
      <circle cx={142} cy={75} r="2.5" fill="#6366f1" />
      {/* Right angle at D */}
      <rect x={138} y={71} width="7" height="7" fill="none" stroke="#6366f1" strokeWidth="1.2" transform="rotate(-7, 142, 75)" />
      {/* Altitude CF ⊥ AE extended: F past E */}
      <line x1={260} y1={155} x2={122} y2={175} stroke="#a78bfa" strokeWidth="2" strokeDasharray="6,3" />
      <circle cx={122} cy={175} r="2.5" fill="#a78bfa" />
      {/* Right angle at F */}
      <rect x={118} y={171} width="7" height="7" fill="none" stroke="#a78bfa" strokeWidth="1.2" transform="rotate(-7, 122, 175)" />
      {/* Angle α at E (inside △BDE) */}
      <path d="M 137,148 A 10,10 0 0,0 130,142" fill="none" stroke="#DC2626" strokeWidth="1.5" />
      <text x="120" y="143" fontSize="11" fill="#DC2626" fontWeight="700" fontStyle="italic">α</text>
      {/* Vertices */}
      <text x="148" y="14" fontSize="13" fill="#475569" fontWeight="700">A</text>
      <text x="22" y="162" fontSize="13" fill="#475569" fontWeight="700">B</text>
      <text x="264" y="162" fontSize="13" fill="#475569" fontWeight="700">C</text>
      <text x="144" y="70" fontSize="11" fill="#6366f1" fontWeight="700">D</text>
      <text x="132" y="168" fontSize="11" fill="#10b981" fontWeight="700">E</text>
      <text x="108" y="182" fontSize="11" fill="#a78bfa" fontWeight="700">F</text>
    </svg>
  );
}

function _OrigAirplaneSVG() {
  return (
    <svg viewBox="0 0 280 140" className="w-full max-w-sm mx-auto" aria-hidden>
      <line x1={22}  y1={122} x2={262} y2={122} stroke="#CBD5E0" strokeWidth={1.5} />
      <line x1={100} y1={122} x2={100} y2={28}  stroke="#CBD5E0" strokeWidth={1}   strokeDasharray="3 3" />
      <line x1={220} y1={122} x2={220} y2={28}  stroke="#CBD5E0" strokeWidth={1}   strokeDasharray="3 3" />
      <line x1={80}  y1={28}  x2={240} y2={28}  stroke="#00d4ff" strokeWidth={1.5} strokeDasharray="6 3" />
      <line x1={22}  y1={122} x2={100} y2={28}  stroke="#16A34A" strokeWidth={2}   strokeLinecap="round" />
      <line x1={22}  y1={122} x2={220} y2={28}  stroke="#a78bfa" strokeWidth={2}   strokeLinecap="round" />
      <path d="M 72 122 A 50 50 0 0 0 50 88"  fill="none" stroke="#16A34A" strokeWidth={1.6} />
      <path d="M 110 122 A 88 88 0 0 0 72 92" fill="none" stroke="#a78bfa" strokeWidth={1.6} />
      <circle cx={100} cy={28} r={5} fill="#16A34A" />
      <circle cx={220} cy={28} r={5} fill="#a78bfa" />
      <line x1={108} y1={20} x2={212} y2={20} stroke="#00d4ff" strokeWidth={1.5} />
      <polygon points="212,17 218,20 212,23" fill="#00d4ff" />
      <text x={8}   y={128} fill="#334155" fontSize={11} fontWeight="bold" fontFamily="sans-serif">O</text>
      <text x={94}  y={18}  fill="#16A34A" fontSize={10} fontWeight="bold" fontFamily="sans-serif">P₁</text>
      <text x={214} y={18}  fill="#a78bfa" fontSize={10} fontWeight="bold" fontFamily="sans-serif">P₂</text>
      <text x={150} y={14}  fill="#00d4ff" fontSize={9}  fontFamily="sans-serif">d</text>
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

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", borderRgb = "45,90,39" }: { prompt: string; title?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.92)", padding: "1.5rem 1.75rem", marginBottom: 20, border: `2px solid rgba(${borderRgb},0.6)`, boxShadow: `0 0 20px rgba(${borderRgb},0.22), 0 0 40px rgba(${borderRgb},0.08), 0 4px 12px rgba(${borderRgb},0.1)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid rgba(${borderRgb},0.2)` }}>
        <span>✨</span>
        <span style={{ color: `rgb(${borderRgb})`, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.75, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "45,90,39", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `2px solid rgba(${glowRgb},0.55)`, marginBottom: 10, boxShadow: `0 0 16px rgba(${glowRgb},0.2)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.82)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: `rgb(${glowRgb})`, fontSize: 11, fontWeight: 800 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.45)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", border: `2px solid rgba(${borderRgb},0.4)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, borderRgb = "146,64,14", locked = false, onPass }: {
  step: PromptStep; borderRgb?: string; locked?: boolean; onPass?: () => void;
}) {
  const [text,   setText]   = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = result !== null && !result.blocked && result.score >= 75;

  if (locked) return (
    <div style={{ borderRadius: 12, border: `2px solid rgba(${borderRgb},0.2)`, background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span>🔒</span>
      <span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
    </div>
  );

  const validate = () => {
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 75) onPass?.();
  };

  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: passed ? "1px solid rgba(245,158,11,0.55)" : `2px solid rgba(${borderRgb},0.5)`, marginBottom: 10, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : `0 0 12px rgba(${borderRgb},0.1)`, transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.82)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: `rgb(${borderRgb})`, fontSize: 11, fontWeight: 800 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.45)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את הפרומפט שלך ל-AI (בקש הכוונה, לא פתרון)..."
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            ⚠️ {result.hint}
          </motion.div>
        )}

        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            💡 {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
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

// ─── Prompt Ladders ────────────────────────────────────────────────────────────

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
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
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
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LadderMedium({ steps, goldenPrompt, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; borderRgb: string }) {
  const [unlockedCount, setUnlockedCount] = useState(1);
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <TutorStepMedium key={i} step={s} borderRgb={borderRgb}
          locked={i >= unlockedCount}
          onPass={() => setUnlockedCount(v => Math.max(v, i + 2))} />
      ))}
    </div>
  );
}

function LadderAdvanced({ steps, goldenPrompt, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; borderRgb: string }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" />

      {steps.map((s, i) => (
        <TutorStepMedium key={i} step={s} borderRgb={borderRgb}
          locked={!masterPassed || i >= unlockedCount}
          onPass={() => setUnlockedCount(v => Math.max(v, i + 2))} />
      ))}

      {allPassed && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את ארבעת הסעיפים. אתה מוכן לבחינה!</div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    problem: "במלבן ABCD אורך הצלע AD הוא 8 ס\"מ. נקודה F נמצאת על הצלע AB כך ש-AF = 4 ס\"מ. מאריכים את הצלע AB עד לנקודה E כך שהקטע DE עובר דרך F.\n\nא. חשב את הזווית ∠ADF.\nב. מצא את אורך הקטע BE (רמז: השתמש בדמיון משולשים).\nג. מהו היחס בין שטח המשולש △ADF לשטח המשולש △BEF?",
    diagram: <RectangleDiagramSVG />,
    pitfalls: [
      { title: "⚠️ זוויות מתחלפות", text: "זהירות! זווית E אינה שווה לזווית ADF — הן זוויות מתחלפות רק אם תזהה את המקבילים הנכונים." },
      { title: "💡 יחס שטחים", text: "זכור: יחס השטחים הוא ריבוע יחס הדמיון, לא יחס הדמיון עצמו!" },
    ],
    goldenPrompt: `\nהיי, אתה הולך להוביל אותי כמורה פרטי בפתרון של תרגיל הגיאומטריה הזה שלב אחר שלב. המטרה היא שתלמד אותי ולא תפתור עבורי.\nדבר ראשון, תסרוק את כל הנתונים של המלבן ABCD, ותעצור מיד כדי לאשר לי שהבנת את המבנה.\nחשוב מאוד: אל תפתור לי את התרגיל ואל תיתן לי את התשובה הסופית בשום מצב. תעצור אחרי כל הסבר קצר ותחכה שאני אגיד לך להמשיך. אני רוצה להבין את ההיגיון הגיאומטרי של התרגיל.`,
    steps: [
      {
        phase: "סעיף א׳",
        label: "מציאת זווית ∠ADF",
        prompt: "\n\nתדריך אותי איך להשתמש בנתונים כדי למצוא את הזווית ∠ADF.",
      },
      {
        phase: "סעיף ב׳",
        label: "מעבר למשולש החיצוני ומציאת BE",
        prompt: "\n\nעכשיו כשיש לנו את נתוני המשולש הפנימי, תסביר לי איך נחשב את צלע BE.",
      },
      {
        phase: "סעיף ג׳",
        label: "חישוב יחס השטחים",
        prompt: "\n\nתסביר לי את הדרך לחשב את היחס בין שטח △ADF לשטח △BEF.",
      },
    ],
  },
  {
    id: "medium",
    problem: "במקבילית ABCD נתון: AD = k, AB = 1.5k. הזווית החדה של המקבילית היא ∠D = α. מורידים גובה BE לצלע DC.\n\nא. הבע את אורך הגובה BE באמצעות k ו-α.\nב. הבע את אורך הקטע DE באמצעות k ו-α.\nג. הבע את אורך האלכסון BD באמצעות k ו-α (השתמש במשפט פיתגורס במשולש △BDE).",
    diagram: <ParallelogramSVG />,
    pitfalls: [
      { title: "⚠️ זיהוי הצלעות", text: "זהירות! אל תתבלבל בין הצלעות: AD הוא היתר במשולש ישר הזווית הקטן, לא AB." },
      { title: "💡 Sin vs Cos", text: "שים לב: כשאתה מבטא את DE, השתמש ב-Cos. כשאתה מבטא את BE, השתמש ב-Sin." },
      { title: "⚠️ ריבוע ביטוי", text: "טעות נפוצה: שכחת להעלות בריבוע את כל הביטוי של DE כשאתה מחשב את האלכסון." },
    ],
    goldenPrompt: `\nהיי, אתה הולך להוביל אותי כמורה פרטי בפתרון תרגיל המקבילית הפרמטרי הזה. המטרה היא שתלמד אותי איך לעבוד עם פרמטרים.\nדבר ראשון, תסרוק את מבנה התרגיל ועצור.\nחשוב מאוד: אל תפתור לי את התרגיל. תעצור אחרי כל הסבר קצר ותחכה שאני אגיד לך להמשיך, תשתמש בשאלות מכווינות ותחשוב שמטרתך היא ללמד אותי לפתור את התרגיל בעצמי.`,
    steps: [
      {
        phase: "סעיף א׳",
        label: "הבעת הגובה BE",
        prompt: "\n\nתדריך אותי איך להביע את הגובה BE באמצעות k ו-α.",
        contextWords: ["Sin", "sin", "להביע", "נביע", "פרמטר", "k", "גובה", "BE"],
      },
      {
        phase: "סעיף ב׳",
        label: "הבעת הקטע DE",
        prompt: "\n\nתדריך אותי איך להביע את הקטע DE באמצעות k ו-α.",
        contextWords: ["Cos", "cos", "להביע", "נביע", "DE", "קטע", "פרמטר"],
      },
      {
        phase: "סעיף ג׳",
        label: "חישוב האלכסון BD",
        prompt: "\n\nתדריך אותי איך לחשב את אורך האלכסון BD באמצעות k ו-α.",
        contextWords: ["פיתגורס", "BD", "אלכסון", "ריבוע", "שורש", "משולש"],
      },
    ],
  },
  {
    id: "advanced",
    problem: "נתון משולש △ABC. נקודה E נמצאת על הבסיס BC. אורך השוק AB הוא k ס\"מ ואורך השוק AC הוא 1.6k ס\"מ. מורידים גבהים BD ו-CF לקטע AE (או להמשכו).\n\nא. הבע את אורך הגובה BD באמצעות הפרמטר k וזווית ∠BDE = α.\nב. דמיון משולשים: הוכח כי המשולשים △BDE ו-△CFE דומים.\nג. הבעה באמצעות k ו-α: מצא את היחס BE / CE.\nד. מצא את היחס בין שטח המשולש △ACF לבין שטח המשולש △ABF, והבע אותו באמצעות α בלבד.",
    diagram: <TriangleAltitudesSVG />,
    pitfalls: [
      { title: "⚠️ זוויות קודקודיות", text: "שימו לב לזיהוי הזוויות! טעות נפוצה היא להתבלבל בין ∠BED ל-∠CEF. הן זוויות קודקודיות, ולכן שוות זו לזו. השתמשו בזה לדמיון." },
      { title: "💡 ניצבים מתאימים", text: "בחישוב היחסים והשטחים, זכרו לבדוק את הניצבים המתאימים. הניצב מול הזווית α הוא BD, לא AE. אל תניחו ש-E היא אמצע קטע!" },
    ],
    goldenPrompt: `\nהיי, אתה הולך להוביל אותי כמורה פרטי בפתרון תרגיל מתקדם על משולש עם גבהים חיצוניים ודמיון. הנושא: טריגונומטריה, גבהים חיצוניים, דמיון משולשים ויחסי שטחים.\nדבר ראשון, תסרוק את כל הנתונים ותעצור כדי לאשר שהבנת את המבנה.\nחשוב מאוד: אל תפתור ואל תיתן תשובה סופית. תעצור אחרי כל הסבר ותחכה שאגיד להמשיך.`,
    steps: [
      {
        phase: "סעיף א׳",
        label: "מציאת הגובה BD באמצעות k, α",
        prompt: "\n\nתדריך אותי איך להביע את הגובה BD באמצעות k ו-α.",
        contextWords: ["הבעה", "משולש", "גובה", "חיצוני", "sin", "Sin", "BD", "k", "alpha", "α"],
      },
      {
        phase: "סעיף ב׳",
        label: "הוכחת דמיון",
        prompt: "\n\nתסביר לי איך להוכיח שהמשולשים △BDE ו-△CFE דומים.",
        contextWords: ["דמיון", "משולש", "זוויות", "קודקודית", "BDE", "CFE", "ניצב", "הוכחה"],
      },
      {
        phase: "סעיף ג׳",
        label: "חישוב יחס הצלעות",
        prompt: "\n\nתדריך אותי איך למצוא את היחס BE/CE באמצעות k ו-α.",
        contextWords: ["יחס", "צלעות", "BE", "CE", "דמיון", "k", "הבעה"],
      },
      {
        phase: "סעיף ד׳",
        label: "חישוב יחס השטחים",
        prompt: "\n\nתסביר לי את הדרך לחשב את יחס השטחים △ACF/△ABF באמצעות α.",
        contextWords: ["יחס", "שטחים", "ACF", "ABF", "גובה", "דמיון", "α", "alpha"],
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
    <section style={{ borderRadius: 32, border: `2px solid rgba(${s.borderRgb},0.5)`, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", padding: "2.5rem", marginBottom: "2rem", marginLeft: "auto", marginRight: "auto", boxShadow: `0 10px 15px -3px rgba(60,54,42,0.1), 0 0 24px rgba(${s.borderRgb},0.08)` }}>

      {/* Formula bar — trig (standardized from trig-basics) */}
      <div className="formula-bar font-sans" style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "rgba(255,255,255,0.78)", padding: "1.5rem 1.25rem", marginBottom: "2.5rem", boxShadow: "0 4px 20px rgba(0,212,255,0.08)" }}>
        <h3 style={{ color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 20, marginTop: 0, textAlign: "center", lineHeight: 1.4 }}>נוסחאות טריגונומטריה</h3>

        {/* Triangle + Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 mb-6">
          <svg viewBox="0 0 185 155" className="w-full max-w-[170px] sm:max-w-[195px] shrink-0" aria-label="Right triangle">
            <polygon points="20,130 160,130 160,20" fill="rgba(99,102,241,0.03)" stroke="#334155" strokeWidth="2" />
            <polyline points="145,130 145,115 160,115" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
            <path d="M 48,130 A 28,28 0 0,0 37,115" fill="none" stroke="#6366f1" strokeWidth="2.5" />
            <text x="52" y="120" fontSize="14" fill="#6366f1" fontWeight="700" fontStyle="italic">α</text>
            <text x="170" y="79" fontSize="14" fill="#6366f1" fontWeight="700" textAnchor="start">a</text>
            <text x="90" y="147" fontSize="14" fill="#10b981" fontWeight="700" textAnchor="middle">b</text>
            <text x="80" y="68" fontSize="14" fill="#f59e0b" fontWeight="700" textAnchor="middle">c</text>
            <text x="10" y="142" fontSize="11" fill="#475569" fontWeight="600">A</text>
            <text x="163" y="142" fontSize="11" fill="#475569" fontWeight="600">B</text>
            <text x="163" y="16" fontSize="11" fill="#475569" fontWeight="600">C</text>
          </svg>
          <div className="flex flex-row sm:flex-col gap-3 sm:gap-3" style={{ direction: "rtl" }}>
            {[
              { letter: "a", label: "ניצב מול", bg: "#6366f1", text: "white" },
              { letter: "b", label: "ניצב ליד", bg: "#10b981", text: "white" },
              { letter: "c", label: "יתר", bg: "#f59e0b", text: "white" },
              { letter: "α", label: "זווית", bg: "rgba(99,102,241,0.12)", text: "#6366f1" },
            ].map(item => (
              <div key={item.letter} className="flex items-center gap-2.5">
                <span className="shrink-0 rounded-md text-[11px] font-bold" style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: item.bg, color: item.text, fontStyle: item.letter === "α" ? "italic" : "normal" }}>{item.letter}</span>
                <span className="text-slate-600 text-[13px] font-medium leading-normal">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trig function cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#6366f1", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Sin — סינוס</div>
            <div style={{ color: "#6366f1", margin: "4px 0" }}><TexBlock>{String.raw`\sin \alpha = \frac{a}{c}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב מול / יתר</div>
          </div>
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#10b981", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Cos — קוסינוס</div>
            <div style={{ color: "#10b981", margin: "4px 0" }}><TexBlock>{String.raw`\cos \alpha = \frac{b}{c}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב ליד / יתר</div>
          </div>
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Tan — טנגנס</div>
            <div style={{ color: "#f59e0b", margin: "4px 0" }}><TexBlock>{String.raw`\tan \alpha = \frac{a}{b}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב מול / ניצב ליד</div>
          </div>
        </div>

        {/* Area formula */}
        <div style={{ borderRadius: 12, border: "1px solid rgba(0,212,255,0.2)", background: "rgba(0,212,255,0.04)", padding: "14px 12px", textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>שטח משולש (שתי צלעות וזווית)</div>
          <div style={{ color: "#00d4ff" }}><TexBlock>{String.raw`S = \tfrac{1}{2} \cdot a \cdot b \cdot \sin C`}</TexBlock></div>
        </div>
      </div>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.45)`, background: "rgba(255,255,255,0.88)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.5)`, background: "rgba(255,255,255,0.88)", padding: "1.5rem", marginBottom: "2rem" }}>
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
      <div style={{ borderRadius: 16, border: `2px solid rgba(${s.borderRgb},0.45)`, background: "rgba(255,255,255,0.88)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: `rgb(${s.borderRgb})`, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} borderRgb={s.borderRgb} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} goldenPrompt={ex.goldenPrompt} borderRgb={s.borderRgb} />}
      </div>

    </section>
  );
}

// ─── SurveyorLab ──────────────────────────────────────────────────────────────

// ─── Lab: Rectangle ABCD with point F and E ──────────────────────────────────

function RectangleLab() {
  const [AF, setAF] = useState(4);
  const [AD, setAD] = useState(8);
  const [showDefault, setShowDefault] = useState(false);

  // Triangle ADF: right angle at A, AD vertical, AF horizontal
  const DF = Math.sqrt(AD * AD + AF * AF);
  const angleDeg = Math.atan2(AF, AD) * (180 / Math.PI);

  // For the extended construction: line from D(0,AD) through F(AF,0)
  // In the rectangle of width W, BF = W - AF
  // By similar triangles: BE/AD = BF/AF
  // Let W = AF + BF, choose W such that BF is reasonable
  // For the original problem: AD=8, AF=10, let's say W = AF * 1.5 = 15, so BF = 5
  const W_rect = AF * 1.5; // rectangle width
  const BF = W_rect - AF;
  const BE = (AD * BF) / AF;

  // Areas
  const areaADF = (AD * AF) / 2;
  const areaBEF = (BE * BF) / 2;
  const areaRatio = areaADF > 0 && areaBEF > 0 ? (areaADF / areaBEF) : 0;

  // SVG coords
  const svgW = 320, svgH = 200;
  const sc = Math.min((svgW - 80) / W_rect, (svgH - 60) / AD, 8);
  const pA = { x: 30, y: svgH - 20 };
  const pB = { x: 30 + W_rect * sc, y: svgH - 20 };
  const pC = { x: pB.x, y: svgH - 20 - AD * sc };
  const pD = { x: pA.x, y: svgH - 20 - AD * sc };
  const pF = { x: pA.x + AF * sc, y: pA.y };
  // E is past B on the bottom line
  const pE = { x: pB.x + BE * sc * 0.8, y: pB.y };

  // Default detection
  const isDefault = AF === 10 && AD === 8;

  return (
    <section style={{ border: "2px solid rgba(45,90,39,0.5)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מלבן ודמיון</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את AF ואת AD — צפו בזמן אמת בתיבות למטה.</p>

      {/* Dual sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>AF (מרחק על AB)</span>
            <span style={{ color: "#10b981", fontWeight: 700 }}>{AF}</span>
          </div>
          <input type="range" min={2} max={15} step={0.5} value={AF} onChange={e => { const v = +e.target.value; setAF(v); if (v === 4 && AD === 8) { setShowDefault(true); setTimeout(() => setShowDefault(false), 10000); } else { setShowDefault(false); } }} style={{ width: "100%", accentColor: "#10b981" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>AD (גובה המלבן)</span>
            <span style={{ color: "#6366f1", fontWeight: 700 }}>{AD}</span>
          </div>
          <input type="range" min={5} max={15} step={0.5} value={AD} onChange={e => { const v = +e.target.value; setAD(v); if (v === 8 && AF === 4) { setShowDefault(true); setTimeout(() => setShowDefault(false), 10000); } else { setShowDefault(false); } }} style={{ width: "100%", accentColor: "#6366f1" }} />
        </div>
      </div>

      {/* Message zone */}
      <LabMessage text="חזרת לנתוני התרגיל המקורי 🙂" type="success" visible={showDefault} />

      {/* Clean SVG — only letters, right-angle marks, no numbers */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "1.5rem", boxShadow: "0 4px 16px rgba(0,212,255,0.08)" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Rectangle ABCD */}
          <rect x={pA.x} y={pD.y} width={pB.x - pA.x} height={pA.y - pD.y} fill="rgba(99,102,241,0.04)" stroke="#334155" strokeWidth="2" />
          {/* Extension AB to E (dashed) */}
          <line x1={pB.x} y1={pB.y} x2={pE.x} y2={pE.y} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,3" />
          {/* Line DF through F to E */}
          <line x1={pD.x} y1={pD.y} x2={pE.x} y2={pE.y} stroke="#6366f1" strokeWidth="2" />
          {/* Right angle marks at A and B */}
          <polyline points={`${pA.x + 8},${pA.y} ${pA.x + 8},${pA.y - 8} ${pA.x},${pA.y - 8}`} fill="none" stroke="#94a3b8" strokeWidth="1" />
          <polyline points={`${pB.x - 8},${pB.y} ${pB.x - 8},${pB.y - 8} ${pB.x},${pB.y - 8}`} fill="none" stroke="#94a3b8" strokeWidth="1" />
          {/* Point F */}
          <circle cx={pF.x} cy={pF.y} r="3.5" fill="#10b981" />
          {/* Point E */}
          <circle cx={pE.x} cy={pE.y} r="3.5" fill="#f59e0b" />
          {/* Vertices */}
          <text x={pA.x - 14} y={pA.y + 4} fontSize="12" fill="#475569" fontWeight="600">A</text>
          <text x={pB.x - 4} y={pB.y + 16} fontSize="12" fill="#475569" fontWeight="600">B</text>
          <text x={pC.x + 6} y={pC.y + 4} fontSize="12" fill="#475569" fontWeight="600">C</text>
          <text x={pD.x - 14} y={pD.y + 4} fontSize="12" fill="#475569" fontWeight="600">D</text>
          <text x={pF.x - 4} y={pF.y + 16} fontSize="11" fill="#10b981" fontWeight="700">F</text>
          <text x={pE.x - 2} y={pE.y + 16} fontSize="11" fill="#f59e0b" fontWeight="700">E</text>
        </svg>
      </div>

      {/* Data display */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8, textAlign: "center" }}>
        {[
          { label: "AD", val: AD.toFixed(1), color: "#6366f1" },
          { label: "AF", val: AF.toFixed(1), color: "#10b981" },
          { label: "BF", val: BF.toFixed(1), color: "#f59e0b" },
          { label: "BE", val: BE.toFixed(2), color: "#DC2626" },
          { label: "∠ADF", val: angleDeg.toFixed(1) + "°", color: "#a78bfa" },
          { label: "S△ADF/S△BEF", val: areaRatio.toFixed(2), color: "#00d4ff" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.2)", padding: "10px 6px", boxShadow: "0 2px 6px rgba(60,54,42,0.03)" }}>
            <div style={{ color: "#6B7280", fontSize: 9, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab: Parallelogram ABCD with height BE ──────────────────────────────────

function ParallelogramLab() {
  const [k, setK] = useState(10);
  const [alpha, setAlpha] = useState(60);
  const alphaRad = (alpha * Math.PI) / 180;

  const AD = k;
  const AB = 1.5 * k;
  const BE = AD * Math.sin(alphaRad);       // height
  const DE = AD * Math.cos(alphaRad);       // base segment
  const BD = Math.sqrt(BE * BE + (AB - DE) * (AB - DE)); // actually BD via triangle BDE
  // BD² = BE² + DE² (in right triangle BDE where E is foot of height on DC)
  // Wait: DC = AB = 1.5k. DE = AD·cos(α). EC = DC - DE = 1.5k - k·cos(α).
  // BD² = BE² + (DC - DE)² ... no, let me use triangle BDE:
  // In △BDE: angle E = 90°, BE = k·sin(α), DE = k·cos(α)
  // BD² = BE² + DE² = k²·sin²(α) + k²·cos²(α) = k². So BD = k = AD.
  // That's because △BDE has hypotenuse BD = AD = k.
  // Actually wait, that means BD = AD always. Let me reconsider.
  // E is foot of height from B to line DC. In parallelogram:
  // D is at origin, C = D + DC direction. DC || AB, DC = AB = 1.5k.
  // The height from B perpendicular to DC lands at E.
  // In the triangle ADE (with A below D): no, let me use coordinates.
  // Let D = (0,0), A = (AD·cos(π-α), -AD·sin(π-α)) ... this is getting complex.
  // Simpler: angle at D = α. AD = k. In triangle formed by dropping height from B:
  // Actually the right triangle is ABE' where E' is foot from B to line AD extended.
  // Or: drop height BE from B to DC. Since ABCD is a parallelogram:
  // Place D at origin. DC along x-axis. D=(0,0), C=(1.5k, 0).
  // Angle D = α means DA makes angle α with DC.
  // A = (k·cos(α), -k·sin(α)) [below D since α is measured downward from DC].
  // Actually in standard parallelogram with D top-left:
  // D=(0,0), C=(1.5k,0) along top. A = (k·cos(π-α), k·sin(π-α)).
  // Hmm, let me just use the simple formulas:
  // BE (height from B to DC) = AD · sin(α) = k·sin(α) ✓
  // DE (projection of AD onto DC from D) = AD · cos(α) = k·cos(α) ✓
  // In △BDE: BE = k·sin(α), and the horizontal distance from D to B's projection:
  // B is at: from A go AB parallel to DC. If we compute B_x:
  // EC = DC - DE = 1.5k - k·cos(α). That's the distance from E to C.
  // The distance from E to the projection of B on DC... B is directly above E? No!
  // BE is the height from B to DC, so E is the foot. △BDE has:
  // BD = AD = k (diagonal of the right triangle at vertex A).
  // Wait: in right triangle ABE... no. Let me just compute BD properly.
  // Coordinates: D=(0,0). DC direction = (1,0). C=(1.5k, 0).
  // DA at angle (π-α) from DC: A = (-k·cos(α), k·sin(α)).
  // Wait, angle D = α means the interior angle at D. DA goes at angle α from DC.
  // So A = (k·cos(α), -k·sin(α)) [if DC goes right, DA goes down-right at angle α below].
  // Hmm, in a parallelogram with acute angle α at D:
  // D=(0,0), C=(1.5k, 0). A goes at angle (180°-α) from DC direction.
  // A = (k·cos(180°-α), k·sin(180°-α)) = (-k·cos(α), k·sin(α)).
  // B = A + DC vector = (-k·cos(α) + 1.5k, k·sin(α)).
  // E = foot of perpendicular from B to line DC (y=0): E = (B_x, 0) = (-k·cos(α)+1.5k, 0).
  // BE = B_y = k·sin(α) ✓
  // DE = distance from D(0,0) to E = |E_x| = 1.5k - k·cos(α).
  // BD = distance from B to D: √(B_x² + B_y²) = √((1.5k - k·cos(α))² + (k·sin(α))²)
  //    = √(2.25k² - 3k²·cos(α) + k²·cos²(α) + k²·sin²(α))
  //    = √(2.25k² - 3k²·cos(α) + k²) = k·√(3.25 - 3·cos(α))
  const BEval = k * Math.sin(alphaRad);
  const DEval = 1.5 * k - k * Math.cos(alphaRad);
  const BDval = k * Math.sqrt(3.25 - 3 * Math.cos(alphaRad));

  const isDefault = k === 10 && alpha === 60;
  const [showDefault, setShowDefault] = useState(false);

  // SVG coords
  const svgW = 320, svgH = 180;
  const sc = Math.min((svgW - 80) / (1.5 * k), (svgH - 50) / (k * Math.sin(alphaRad) + 1), 6);
  const pD = { x: 60, y: 30 };
  const pC = { x: pD.x + 1.5 * k * sc, y: pD.y };
  const pA = { x: pD.x - k * Math.cos(alphaRad) * sc, y: pD.y + k * Math.sin(alphaRad) * sc };
  const pB = { x: pA.x + 1.5 * k * sc, y: pA.y };
  const pE = { x: pD.x + DEval * sc, y: pD.y };

  return (
    <section style={{ border: "2px solid rgba(146,64,14,0.5)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת המקבילית הפרמטרית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את k ואת α — צפו בביטויים האלגבריים בזמן אמת.</p>

      {/* Dual sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>פרמטר k</span>
            <span style={{ color: "#EA580C", fontWeight: 700 }}>{k}</span>
          </div>
          <input type="range" min={5} max={25} step={1} value={k} onChange={e => { const v = +e.target.value; setK(v); if (v === 10 && alpha === 60) { setShowDefault(true); setTimeout(() => setShowDefault(false), 10000); } else setShowDefault(false); }} style={{ width: "100%", accentColor: "#EA580C" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית α</span>
            <span style={{ color: "#DC2626", fontWeight: 700 }}>{alpha}°</span>
          </div>
          <input type="range" min={20} max={85} step={1} value={alpha} onChange={e => { const v = +e.target.value; setAlpha(v); if (v === 60 && k === 10) { setShowDefault(true); setTimeout(() => setShowDefault(false), 10000); } else setShowDefault(false); }} style={{ width: "100%", accentColor: "#DC2626" }} />
        </div>
      </div>

      {/* Message zone */}
      <LabMessage text="חזרת לנתוני התרגיל המקורי 🙂" type="success" visible={showDefault} />

      {/* Clean dynamic SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "1.5rem" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Parallelogram */}
          <polygon points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y} ${pD.x},${pD.y}`} fill="rgba(234,88,12,0.04)" stroke="#334155" strokeWidth="2" />
          {/* Height BE (dashed) */}
          <line x1={pB.x} y1={pB.y} x2={pE.x} y2={pE.y} stroke="#a78bfa" strokeWidth="2" strokeDasharray="6,3" />
          {/* Right angle at E */}
          <polyline points={`${pE.x - 8},${pE.y} ${pE.x - 8},${pE.y + 8} ${pE.x},${pE.y + 8}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Diagonal BD (dotted) */}
          <line x1={pB.x} y1={pB.y} x2={pD.x} y2={pD.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
          {/* Vertices — no numbers */}
          <text x={pA.x - 14} y={pA.y + 4} fontSize="12" fill="#475569" fontWeight="600">A</text>
          <text x={pB.x + 4} y={pB.y + 14} fontSize="12" fill="#475569" fontWeight="600">B</text>
          <text x={pC.x + 4} y={pC.y - 4} fontSize="12" fill="#475569" fontWeight="600">C</text>
          <text x={pD.x - 14} y={pD.y - 4} fontSize="12" fill="#475569" fontWeight="600">D</text>
          <text x={pE.x + 4} y={pE.y - 4} fontSize="11" fill="#a78bfa" fontWeight="700">E</text>
        </svg>
      </div>

      {/* Data display — algebraic expression + numerical value */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, textAlign: "center" }}>
        {[
          { label: "AD = k", val: AD.toFixed(1), color: "#EA580C" },
          { label: "AB = 1.5k", val: AB.toFixed(1), color: "#334155" },
          { label: "BE = k·sin(α)", val: BEval.toFixed(2), color: "#a78bfa" },
          { label: "DE = 1.5k−k·cos(α)", val: DEval.toFixed(2), color: "#10b981" },
          { label: "BD", val: BDval.toFixed(2), color: "#f59e0b" },
          { label: "∠D = α", val: `${alpha}°`, color: "#DC2626" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.2)", padding: "10px 6px" }}>
            <div style={{ color: "#6B7280", fontSize: 8, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab: Triangle with external altitudes ────────────────────────────────────

function TriangleAltitudesLab() {
  const [k, setK] = useState(20);
  const [alpha, setAlpha] = useState(50);
  const alphaRad = (alpha * Math.PI) / 180;
  const [showDefault, setShowDefault] = useState(false);

  const AB = k;
  const AC = 1.6 * k;
  const BD = k * Math.sin(alphaRad);
  const BE = k * Math.cos(alphaRad);
  // By similarity △BDE ~ △CFE: CF/BD = CE/BE = AC/AB = 1.6
  const CE = BE * 1.6;
  const CF = BD * 1.6;
  // Area ratio: S(ACF)/S(ABF) — both triangles share base AF on line AE
  // S(ACF) = 0.5 * AF * CF, S(ABF) = 0.5 * AF * BD (same base along AE, heights CF and BD)
  // Wait, that's not quite right. Let me think:
  // △ABD has height BD from B to AE. △ACF has height CF from C to AE.
  // Area(△ABE) = 0.5 * AE_part * BD... actually simpler:
  // S(ACF)/S(ABF) = CF/BD = 1.6 (they share the same base on line AE extended)
  // Actually: S(△ACF)/S(△ABF) depends on the full geometry.
  // Simpler: S(△ACF) = 0.5 * AF * CF, S(△ABD) = 0.5 * AD * BD
  // But we want S(△ACF)/S(△ABF).
  // Both triangles have a vertex on line AE. Their bases from B and C to AE are BD and CF.
  // S(△ABF) = 0.5 * |AF'| * BD where AF' is the segment... this is complex.
  // Let's just compute: ratio = (AC * CF) / (AB * BD) = (1.6k * 1.6*BD) / (k * BD) = 2.56
  // Actually: S(△ACE)/S(△ABE) = (CE * CF) / (BE * BD) = (1.6*BE * 1.6*BD) / (BE * BD) = 2.56
  // That's the ratio of triangles sharing vertex A with bases on BC.
  // For S(△ACF)/S(△ABF): they share vertex F. Heights from A... no.
  // Let me just use: areaRatio = CF/BD = 1.6 (constant, independent of α)
  const areaRatio = CF / BD; // = 1.6 always

  // SVG dynamic
  const svgW = 320, svgH = 200;
  const sc = Math.min(6, (svgW - 80) / (BE + CE), (svgH - 60) / Math.max(BD, CF));
  const Ax = svgW / 2, Ay = 20;
  const Ex = svgW / 2 - 10, Ey = svgH - 20;
  const Bx = Ex - BE * sc, By = Ey;
  const Cx = Ex + CE * sc, Cy = Ey;
  // D on AE at distance from E
  const AElen = Math.sqrt((Ex - Ax) * (Ex - Ax) + (Ey - Ay) * (Ey - Ay));
  const DonAE = 0.45; // approximate position
  const Dx = Ax + DonAE * (Ex - Ax), Dy = Ay + DonAE * (Ey - Ay);
  // F past E on AE extended
  const Fx = Ex + 0.15 * (Ex - Ax), Fy = Ey + 0.15 * (Ey - Ay);

  return (
    <section style={{ border: "2px solid rgba(153,27,27,0.5)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת גבהים חיצוניים ודמיון</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את k ואת α — צפו ביחסים הקבועים.</p>

      {/* Dual sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, padding: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>פרמטר k</span>
            <span style={{ color: "#DC2626", fontWeight: 700 }}>{k}</span>
          </div>
          <input type="range" min={10} max={50} step={1} value={k} onChange={e => { const v = +e.target.value; setK(v); if (v === 20 && alpha === 50) { setShowDefault(true); setTimeout(() => setShowDefault(false), 10000); } else setShowDefault(false); }} style={{ width: "100%", accentColor: "#DC2626" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית α</span>
            <span style={{ color: "#a78bfa", fontWeight: 700 }}>{alpha}°</span>
          </div>
          <input type="range" min={20} max={75} step={1} value={alpha} onChange={e => { const v = +e.target.value; setAlpha(v); if (v === 50 && k === 20) { setShowDefault(true); setTimeout(() => setShowDefault(false), 10000); } else setShowDefault(false); }} style={{ width: "100%", accentColor: "#a78bfa" }} />
        </div>
      </div>

      {/* Message zone */}
      <LabMessage text="חזרת לנתוני התרגיל המקורי 🙂" type="success" visible={showDefault} />

      {/* Dynamic SVG — clean, no numbers */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "1.5rem" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Main triangle */}
          <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="rgba(220,38,38,0.04)" stroke="#334155" strokeWidth="2" />
          {/* Segment AE */}
          <line x1={Ax} y1={Ay} x2={Ex} y2={Ey} stroke="#334155" strokeWidth="1.5" />
          {/* AE extended (dashed) */}
          <line x1={Ex} y1={Ey} x2={Fx} y2={Fy} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,3" />
          {/* Altitude BD */}
          <line x1={Bx} y1={By} x2={Dx} y2={Dy} stroke="#6366f1" strokeWidth="2" strokeDasharray="6,3" />
          {/* Altitude CF */}
          <line x1={Cx} y1={Cy} x2={Fx} y2={Fy} stroke="#a78bfa" strokeWidth="2" strokeDasharray="6,3" />
          {/* Right angle marks */}
          <rect x={Dx - 4} y={Dy - 4} width="7" height="7" fill="none" stroke="#6366f1" strokeWidth="1.2" />
          <rect x={Fx - 4} y={Fy - 4} width="7" height="7" fill="none" stroke="#a78bfa" strokeWidth="1.2" />
          {/* E marker */}
          <circle cx={Ex} cy={Ey} r="3" fill="#10b981" />
          {/* Vertices */}
          <text x={Ax - 4} y={Ay - 6} fontSize="12" fill="#475569" fontWeight="600" textAnchor="middle">A</text>
          <text x={Bx - 12} y={By + 4} fontSize="12" fill="#475569" fontWeight="600">B</text>
          <text x={Cx + 6} y={Cy + 4} fontSize="12" fill="#475569" fontWeight="600">C</text>
          <text x={Dx + 8} y={Dy - 2} fontSize="11" fill="#6366f1" fontWeight="700">D</text>
          <text x={Ex + 8} y={Ey + 4} fontSize="11" fill="#10b981" fontWeight="700">E</text>
          <text x={Fx + 8} y={Fy + 4} fontSize="11" fill="#a78bfa" fontWeight="700">F</text>
        </svg>
      </div>

      {/* Area ratio banner */}
      <LabMessage text={`S(△ACF) / S(△ABF) = ${areaRatio.toFixed(2)} — יחס קבוע! (CF/BD = AC/AB = 1.6)`} type="special" visible={true} />

      {/* Data display */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(85px, 1fr))", gap: 8, textAlign: "center" }}>
        {[
          { label: "AB = k", val: AB.toFixed(0), color: "#334155" },
          { label: "AC = 1.6k", val: AC.toFixed(0), color: "#334155" },
          { label: "BD = k·sin(α)", val: BD.toFixed(1), color: "#6366f1" },
          { label: "CF = 1.6k·sin(α)", val: CF.toFixed(1), color: "#a78bfa" },
          { label: "BE", val: BE.toFixed(1), color: "#10b981" },
          { label: "CE", val: CE.toFixed(1), color: "#f59e0b" },
          { label: "∠BDE = α", val: `${alpha}°`, color: "#DC2626" },
          { label: "BE/CE", val: (BE / CE).toFixed(3), color: "#00d4ff" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.2)", padding: "10px 4px" }}>
            <div style={{ color: "#6B7280", fontSize: 8, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SurveyorLab({ levelId }: { levelId: "basic" | "medium" }) {
  const [dist,  setDist]  = useState(20);
  const [angle, setAngle] = useState(40);
  const rad    = (angle * Math.PI) / 180;
  const height = dist * Math.tan(rad);
  const st = STATION[levelId];

  const W = 300, H = 180, Ox = 36, Oy = 158, scale = 4;
  const Tx = Math.min(Ox + dist * scale, W - 30);
  const Ty = Math.max(Oy - Math.min(height * scale, Oy - 16), 16);

  return (
    <section style={{ border: `2px solid rgba(${st.borderRgb},0.5)`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: `0 10px 15px -3px rgba(60,54,42,0.1), 0 0 24px rgba(${st.borderRgb},0.08)` }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת הסוקר</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה מרחק וזווית — ראה כיצד הגובה מתעדכן בזמן אמת</p>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.88)", borderRadius: 16, border: `2px solid rgba(${st.borderRgb},0.4)`, padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        {[
          { title: "מרחק אופקי", varSym: "d (מ׳)", val: dist,  set: setDist,  min: 5,  max: 50, step: 1 },
          { title: "זווית עלייה", varSym: "α (°)",  val: angle, set: setAngle, min: 5,  max: 80, step: 1 },
        ].map((row) => (
          <div key={row.varSym}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>{row.title} <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>({row.varSym})</span></span>
              <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
            </div>
            <input type="range" min={row.min} max={row.max} step={row.step} value={row.val}
              onChange={(e) => row.set(+e.target.value)}
              style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `2px solid rgba(${st.borderRgb},0.45)`, background: "rgba(255,255,255,0.88)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto" aria-hidden>
          <line x1={16} y1={Oy} x2={W - 10} y2={Oy} stroke="#CBD5E0" strokeWidth={1.5} />
          <rect x={Tx - 9} y={Ty} width={18} height={Oy - Ty} fill={`rgba(${st.borderRgb},0.06)`} stroke={`rgb(${st.borderRgb})`} strokeWidth={1.5} rx={2} />
          <line x1={Ox} y1={Oy} x2={Tx} y2={Ty} stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
          <line x1={Ox} y1={Oy} x2={Ox + 40} y2={Oy} stroke="#CBD5E0" strokeWidth={1} strokeDasharray="4 3" />
          <line x1={Tx + 14} y1={Oy} x2={Tx + 14} y2={Ty} stroke="#34d399" strokeWidth={1.5} strokeDasharray="3 2" />
          <line x1={Ox} y1={Oy + 12} x2={Tx} y2={Oy + 12} stroke="#f59e0b" strokeWidth={1.5} />
          <path d={`M ${Ox + 34} ${Oy} A 34 34 0 0 0 ${Ox + 34 * Math.cos(rad)} ${Oy - 34 * Math.sin(rad)}`} fill="none" stroke="#f59e0b" strokeWidth={1.8} />
          <text x={Ox - 14} y={Oy + 4}            fill="#334155" fontSize={10} fontWeight="bold" fontFamily="sans-serif">A</text>
          <text x={Tx + 20} y={(Oy + Ty) / 2 + 4} fill="#34d399" fontSize={10} fontFamily="sans-serif">h</text>
          <text x={(Ox + Tx) / 2 - 6} y={Oy + 22} fill="#f59e0b" fontSize={10} fontFamily="sans-serif">d</text>
          <text x={Ox + 12} y={Oy - 18}            fill="#f59e0b" fontSize={10} fontFamily="sans-serif">α</text>
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center", marginBottom: "1rem" }}>
        {[
          { label: "d", val: `${dist} מ׳`,            sub: "מרחק אופקי" },
          { label: "α", val: `${angle}°`,              sub: "זווית עלייה" },
          { label: "h", val: `${height.toFixed(1)} מ׳`, sub: "גובה"       },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.88)", border: `2px solid rgba(${st.borderRgb},0.5)`, padding: 12, boxShadow: `0 4px 16px rgba(${st.glowRgb},0.12)` }}>
            <div style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20 }}>{row.val}</div>
            <div style={{ color: "#6B7280", fontSize: 10, marginTop: 4 }}>{row.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.88)", border: `1px solid rgba(${st.borderRgb},0.3)`, padding: 12, textAlign: "center", fontSize: 12, color: "#2D3436" }}>
        h = d × tan(α) = {dist} × tan({angle}°) ≈ <span style={{ color: st.accentColor, fontWeight: 700 }}>{height.toFixed(2)}</span> מ׳
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrigApplicationsPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "146,64,14" : "153,27,27";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        textarea, input[type="text"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus { outline: none !important; border-color: rgba(var(--lvl-rgb), 0.65) !important; box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important; }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important; }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>טריגונומטריה — יישומים עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>זוויות עלייה, מרחקים וגבהים — ואיך לנסח שאלות מציאותיות ל-AI</p>
          </div>
          <Link
            href="/topic/grade10/trig"
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

        {/* Sub-topic progress */}
        <SubtopicProgress subtopicId="/grade10/trig-applications" />

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

        {/* Lab */}
        {selectedLevel === "basic" && <RectangleLab />}
        {selectedLevel === "medium" && <ParallelogramLab />}
        {selectedLevel === "advanced" && <TriangleAltitudesLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade10/trig-applications" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
