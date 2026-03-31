"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";
import SubtopicProgress from "@/app/components/SubtopicProgress";

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

// Subject words for MasterPromptGate (calculus-specific)
const CALCULUS_SUBJECT_WORDS = [
  "נגזרת", "חקירה", "פולינום", "קיצון", "מינימום", "מקסימום",
  "f'(x)", "גזירה", "חשבון דיפרנציאלי", "חשבון", "פונקציה",
];

// ─── FunctionGraph ────────────────────────────────────────────────────────────

function FunctionGraph({
  fn, xMin, xMax, yMin, yMax, color = "#3b82f6",
}: {
  fn: (x: number) => number; xMin: number; xMax: number; yMin: number; yMax: number; color?: string;
}) {
  const W = 260, H = 110;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
  const steps = 400, dx = (xMax - xMin) / steps;
  const segments: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps; i++) {
    const xi = xMin + i * dx, yi = fn(xi);
    if (yi < yMin || yi > yMax) { moved = false; continue; }
    segments.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }
  const ox = toSx(0), oy = toSy(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto" aria-hidden>
      {/* grid */}
      {[...Array(5)].map((_, i) => {
        const gy = (H / 4) * i;
        return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(100,116,139,0.2)" strokeWidth={1} />;
      })}
      {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
      {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
      <path d={segments.join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── CalculusLab ──────────────────────────────────────────────────────────────

function CalculusLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [a, setA] = useState(1.0);
  const st = STATION[levelId];
  const W = 280, H = 160;
  const xMin = -3, xMax = 3, yMin = -1, yMax = 6;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const toSy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

  const steps = 300, dx = (xMax - xMin) / steps;
  const segs: string[] = [];
  let moved = false;
  for (let i = 0; i <= steps; i++) {
    const xi = xMin + i * dx, yi = a * xi * xi;
    if (yi < yMin || yi > yMax) { moved = false; continue; }
    segs.push(moved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
    moved = true;
  }
  const ox = toSx(0), oy = toSy(0);
  const curveColor = a > 0 ? "#3b82f6" : a < 0 ? "#f43f5e" : "#94a3b8";
  const direction = a > 0 ? "פונה מעלה (מינימום)" : a < 0 ? "פונה מטה (מקסימום)" : "קו ישר";
  const width = Math.abs(a) < 0.6 ? "פרבולה רחבה" : Math.abs(a) > 1.5 ? "פרבולה צרה" : "פרבולה בינונית";
  const xv = 0, yv = 0; // vertex at origin for f(x) = ax²

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת חקירת פונקציות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>
        f(x) = <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{a.toFixed(1)}</span>x²
        — שנה את a וראה כיצד המקדם משפיע על הפרבולה
      </p>

      {/* Slider */}
      <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>המקדם a <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(מקדם x²)</span></span>
          <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{a.toFixed(1)}</span>
        </div>
        <input type="range" min="-2" max="2" step="0.1" value={a} onChange={(e) => setA(parseFloat(e.target.value))} style={{ width: "100%", accentColor: st.accentColor }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
          <span>−2</span><span>0</span><span>+2</span>
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 300 }} aria-hidden>
          {[...Array(5)].map((_, i) => {
            const gy = (H / 4) * i;
            return <line key={i} x1={0} y1={gy} x2={W} y2={gy} stroke="rgba(100,116,139,0.15)" strokeWidth={1} />;
          })}
          {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />}
          {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#94a3b8" strokeWidth={1.2} />}
          <path d={segs.join(" ")} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* vertex dot */}
          <circle cx={toSx(xv)} cy={toSy(yv)} r={5} fill={st.accentColor} />
          <text x={toSx(xv) + 8} y={toSy(yv) - 6} fontSize={9} fill="#334155" fontFamily="sans-serif">קודקוד (0,0)</text>
        </svg>
      </div>

      {/* Output tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "center" }}>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 14, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>כיוון הפרבולה</div>
          <div style={{ color: a > 0 ? "#3b82f6" : a < 0 ? "#f43f5e" : "#94a3b8", fontWeight: 700, fontSize: 13 }}>{direction}</div>
        </div>
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 14, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 6 }}>רוחב הפרבולה</div>
          <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 13 }}>{width}</div>
        </div>
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: "1rem" }}>
        f&apos;(x) = <span style={{ color: st.accentColor, fontFamily: "monospace" }}>{(2 * a).toFixed(1)}x</span>
        {" "}— נאפס ב-x=0 → {a > 0 ? "מינימום" : a < 0 ? "מקסימום" : "—"} בנקודה (0,0)
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
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" />

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

// ─── Exercise Data ─────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  // ── מתחיל: מציאת נקודת הקיצון ────────────────────────────────────────────────
  {
    id: "basic",
    problem: "נתונה הפונקציה:\nf(x) = x² − 4x + 3\n\nמצא את נקודת הקיצון וקבע את סוגה.",
    diagram: (
      <FunctionGraph
        fn={(x) => x * x - 4 * x + 3}
        xMin={-0.5} xMax={4.5} yMin={-2} yMax={5}
        color="#3b82f6"
      />
    ),
    pitfalls: [
      { title: "⚠️ השוית f(x)=0 במקום f'(x)=0", text: "הנגזרת f'(x) חייבת להיות שווה ל-0 כדי למצוא קיצון — לא f(x). f(x)=0 נותן שורשים, לא קיצון." },
      { title: "⚠️ לא בדקת את סוג הקיצון", text: "מינימום מתקבל כשהמקדם של x² חיובי. מקסימום — כשהוא שלילי. תמיד בדוק את הסימן של a." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד כיתה י\"ב.\nצירפתי לך תמונה של תרגיל חקירת פונקציה — f(x) = x² − 4x + 3.\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n\n1️⃣ סריקה:\nקודם כל, תסרוק את התמונה ותכתוב לי רק:\n"זיהיתי את הפונקציה. מחכה להוראות לשלב א'."\n(אל תפתור כלום ואל תסביר כלום בשלב הזה!)\n\n2️⃣ תפקיד:\nאתה המורה שלי. זה אומר שאתה לא פותר במקומי.\n\n3️⃣ שיטת עבודה:\nאני אשלח לך כל פעם שלב (א', ב' או ג').\nבתגובה, אתה שואל אותי רק שאלה אחת מכווינה על הנוסחה או על ההצבה.`,
    steps: [
      {
        phase: "שלב א׳",
        label: "גזור את f(x)",
        prompt: "\n\nנתונה f(x) = x² − 4x + 3. חשב את הנגזרת f'(x) שלב אחרי שלב — גזור כל איבר בנפרד.",
      },
      {
        phase: "שלב ב׳",
        label: "השווה f'(x)=0 ומצא x",
        prompt: "\n\nf'(x) = 2x − 4. פתור 2x − 4 = 0 ומצא את x. הסבר כל שלב.",
      },
      {
        phase: "שלב ג׳",
        label: "חשב ערך f בנקודת הקיצון",
        prompt: "\n\nf(x) = x² − 4x + 3, נמצא x=2. הצב x=2 ב-f(x) וחשב את ערך הפונקציה.",
      },
      {
        phase: "שלב ד׳",
        label: "קבע — מינימום או מקסימום?",
        prompt: "\n\nf(x) = x² − 4x + 3 — המקדם של x² הוא 1 (חיובי). האם הקיצון מינימום או מקסימום? הסבר את הקשר בין סימן המקדם לכיוון הפרבולה.",
      },
    ],
  },

  // ── בינוני: חקירה מלאה ─────────────────────────────────────────────────────
  {
    id: "medium",
    problem: "נתונה הפונקציה:\nf(x) = x³ − 3x\n\nבצע חקירה מלאה:\nגזור, מצא נקודות קיצון, קבע עולה/יורדת.",
    diagram: (
      <FunctionGraph
        fn={(x) => x * x * x - 3 * x}
        xMin={-2.5} xMax={2.5} yMin={-3} yMax={3}
        color="#a78bfa"
      />
    ),
    pitfalls: [
      { title: "⚠️ שתי נקודות קיצון — לא אחת", text: "f'(x) = 3x² − 3 = 0 נותן שתי פתרונות: x=1 ו-x=−1. אל תעצור אחרי פתרון אחד." },
      { title: "⚠️ טבלת סימנים — שלב חובה", text: "בדוק את סימן f'(x) בכל קטע כדי לקבוע עולה/יורדת ולזהות מקסימום/מינימום מקומי." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד כיתה י\"ב.\nצירפתי לך תמונה של תרגיל חקירת פונקציה קובייתית — f(x) = x³ − 3x.\nאני רוצה שתהיה המורה שלי ותעזור לי שלב אחרי שלב בלי לגלות לי את התשובות.\n\nקודם כל, תסרוק את התמונה, אל תכתוב שום פתרון עדיין.\n\nבכל שלב — שאל אותי רק שאלה אחת מכווינה.\nחכה לי בין שלב לשלב ואל תמשיך לפני שאני שולח.`,
    steps: [
      {
        phase: "שלב א׳",
        label: "גזור פולינום מסדר 3",
        contextWords: ["נגזרת", "f'(x)", "3x²", "גזירה", "כל איבר"],
      },
      {
        phase: "שלב ב׳",
        label: "השווה ל-0 — מצא שני קיצונות",
        contextWords: ["f'(x)=0", "x=1", "x=-1", "שני פתרונות", "קיצון"],
      },
      {
        phase: "שלב ג׳",
        label: "בנה טבלת סימנים",
        contextWords: ["טבלת סימנים", "קטע", "עולה", "יורדת", "סימן"],
      },
      {
        phase: "שלב ד׳",
        label: "חשב ערכי f בנקודות הקיצון",
        contextWords: ["f(1)", "f(-1)", "מקסימום", "מינימום", "ערך"],
      },
    ],
  },

  // ── מתקדם: בניית פונקציה עם פרמטרים ──────────────────────────────────────────
  {
    id: "advanced",
    problem: "f(x) = ax³ + bx²\n\nידוע שלפונקציה יש קיצון ב-x = 1\nוערכה בנקודה זו הוא f(1) = 4.\nמצא את a ו-b.",
    diagram: (
      <FunctionGraph
        fn={(x) => -8 * x * x * x + 12 * x * x}
        xMin={-0.5} xMax={1.8} yMin={-2} yMax={5}
        color="#f43f5e"
      />
    ),
    pitfalls: [
      { title: "⚠️ שתי משוואות — מערכת", text: "f(1)=4 נותנת משוואה אחת, f'(1)=0 נותנת שנייה. חייב לפתור מערכת של שתי משוואות." },
      { title: "⚠️ גזירת ax³", text: "הנגזרת של ax³ היא 3ax², לא ax². אל תשכח להכפיל את החזקה במקדם." },
    ],
    goldenPrompt: "\n\n",
    steps: [
      {
        phase: "שלב א׳",
        label: "גזור f(x) = ax³ + bx² עם פרמטרים",
        contextWords: ["f'(x)", "3a", "2b", "נגזרת", "פרמטרים", "מקדם"],
      },
      {
        phase: "שלב ב׳",
        label: "הצב x=1 ב-f'(x)=0 — תנאי קיצון",
        contextWords: ["f'(1)=0", "3a+2b", "קיצון", "הצב", "משוואה"],
      },
      {
        phase: "שלב ג׳",
        label: "הצב x=1 ב-f(x)=4 — תנאי ערך",
        contextWords: ["f(1)=4", "a+b=4", "הצב", "משוואה שנייה", "ערך"],
      },
      {
        phase: "שלב ד׳",
        label: "פתור מערכת משוואות — מצא a ו-b",
        contextWords: ["מערכת", "a=", "b=", "פתרון", "a=-8", "b=12"],
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
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Formula bar */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>כלי חקירת פונקציות</div>
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, color: "#2D3436", lineHeight: 1.7 }}>
            <span><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700 }}>f'(x) = 0</span> — תנאי לנקודת קיצון</span>
            <span><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700 }}>a &gt; 0</span> — פרבולה פונה מעלה → מינימום</span>
            <span><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700 }}>a &lt; 0</span> — פרבולה פונה מטה → מקסימום</span>
          </div>
          <div style={{ width: 1, background: "rgba(60,54,42,0.1)", alignSelf: "stretch" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, color: "#2D3436", lineHeight: 1.7 }}>
            <span><span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>(xᵥ)&apos; = f&apos;(x) = 0</span> → x קיצון</span>
            <span><span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>f&apos; &gt; 0</span> — הפונקציה עולה בקטע</span>
            <span><span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>f&apos; &lt; 0</span> — הפונקציה יורדת בקטע</span>
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
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PolynomialsPage() {
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
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>חקירת פולינומים עם AI</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>נגזרות, נקודות קיצון ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/calculus"
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
        <SubtopicProgress subtopicId="/calculus/polynomials" />

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
        <CalculusLab levelId={selectedLevel} />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/calculus/polynomials" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
