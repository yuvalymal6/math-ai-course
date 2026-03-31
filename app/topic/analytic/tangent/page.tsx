"use client";

import { useState } from "react";
import { Check, Copy, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";
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

const TANGENT_SUBJECT_WORDS = [
  "משיק", "רדיוס", "ניצבות", "מרחק", "נקודת משיקות", "מעגל", "שיפוע", "ישר",
];

// ─── TangentGraph ─────────────────────────────────────────────────────────────

function TangentGraph({
  cx, cy, r, px, py, xMin, xMax, yMin, yMax,
  circleColor = "#3b82f6", tangentColor = "#a78bfa",
}: {
  cx: number; cy: number; r: number; px: number; py: number;
  xMin: number; xMax: number; yMin: number; yMax: number;
  circleColor?: string; tangentColor?: string;
}) {
  const S = 180;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * S;
  const toSy = (y: number) => S - ((y - yMin) / (yMax - yMin)) * S;
  const rS = (r * S) / (xMax - xMin);
  const ox = toSx(0), oy = toSy(0);
  const xRange = xMax - xMin;
  const gridStep = xRange <= 14 ? 2 : 4;
  const gxVals: number[] = [];
  const gyVals: number[] = [];
  for (let v = Math.ceil(xMin / gridStep) * gridStep; v <= xMax; v += gridStep) gxVals.push(v);
  for (let v = Math.ceil(yMin / gridStep) * gridStep; v <= yMax; v += gridStep) gyVals.push(v);

  const rdx = px - cx, rdy = py - cy;
  const tanSegs: string[] = [];
  const steps = 300;
  const dx = (xMax - xMin) / steps;
  let tanMoved = false;

  if (Math.abs(rdy) < 0.001) {
    const sx = toSx(px).toFixed(1);
    tanSegs.push(`M ${sx} 0 L ${sx} ${S}`);
  } else {
    const slope = -rdx / rdy;
    for (let i = 0; i <= steps; i++) {
      const xi = xMin + i * dx;
      const yi = slope * (xi - px) + py;
      if (!isFinite(yi) || isNaN(yi) || yi < yMin || yi > yMax) { tanMoved = false; continue; }
      tanSegs.push(tanMoved ? `L ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}` : `M ${toSx(xi).toFixed(1)} ${toSy(yi).toFixed(1)}`);
      tanMoved = true;
    }
  }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[210px] mx-auto" aria-hidden>
      {gxVals.map(v => { const sx = toSx(v); return sx >= 0 && sx <= S ? <line key={`gx${v}`} x1={sx} y1={0} x2={sx} y2={S} stroke="rgba(100,116,139,0.2)" strokeWidth={0.6} /> : null; })}
      {gyVals.map(v => { const sy = toSy(v); return sy >= 0 && sy <= S ? <line key={`gy${v}`} x1={0} y1={sy} x2={S} y2={sy} stroke="rgba(100,116,139,0.2)" strokeWidth={0.6} /> : null; })}
      {oy >= 0 && oy <= S && <line x1={0} y1={oy} x2={S} y2={oy} stroke="#94a3b8" strokeWidth={1} />}
      {ox >= 0 && ox <= S && <line x1={ox} y1={0} x2={ox} y2={S} stroke="#94a3b8" strokeWidth={1} />}
      <circle cx={toSx(cx)} cy={toSy(cy)} r={rS} fill={circleColor} fillOpacity={0.06} stroke={circleColor} strokeWidth={2.5} />
      <path d={tanSegs.join(" ")} fill="none" stroke={tangentColor} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={toSx(cx)} cy={toSy(cy)} r={2.5} fill={circleColor} opacity={0.6} />
      <circle cx={toSx(px)} cy={toSy(py)} r={3.5} fill={tangentColor} />
    </svg>
  );
}

// ─── TangentLab ───────────────────────────────────────────────────────────────

function TangentLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [theta, setTheta] = useState(45);
  const st = STATION[levelId];

  const R = 4;
  const S = 260;
  const xMin = -7, xMax = 7, yMin = -7, yMax = 7;
  const toSx = (x: number) => ((x - xMin) / (xMax - xMin)) * S;
  const toSy = (y: number) => S - ((y - yMin) / (yMax - yMin)) * S;
  const scale = S / (xMax - xMin);

  const rad = (theta * Math.PI) / 180;
  const cosT = Math.cos(rad), sinT = Math.sin(rad);
  const px = R * cosT, py = R * sinT;
  const Psx = toSx(px), Psy = toSy(py);
  const ox = toSx(0), oy = toSy(0);
  const rS = R * scale;

  const tLen = 5.5;
  const t1x = px + (-sinT) * tLen, t1y = py + cosT * tLen;
  const t2x = px - (-sinT) * tLen, t2y = py - cosT * tLen;

  const sqSize = 10;
  const drX = -cosT, drY = sinT;
  const dtX = -sinT, dtY = -cosT;
  const sqA = [Psx + drX * sqSize, Psy + drY * sqSize];
  const sqB = [Psx + drX * sqSize + dtX * sqSize, Psy + drY * sqSize + dtY * sqSize];
  const sqC = [Psx + dtX * sqSize, Psy + dtY * sqSize];

  const slopeStr =
    Math.abs(sinT) < 0.015 ? "לא מוגדר (אנכי)"
    : Math.abs(cosT) < 0.015 ? "0 (אופקי)"
    : (-cosT / sinT).toFixed(2);

  return (
    <section style={{
      border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem",
      background: "rgba(255,255,255,0.82)", boxShadow: st.glowShadow, marginBottom: "2rem",
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: st.accentColor, textAlign: "center", marginBottom: 16 }}>מעבדת משיקים</h3>
      <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        זווית θ = <span style={{ color: st.accentColor, fontWeight: 700 }}>{theta}°</span>
        {"  "}|{"  "}נקודה P = ({(R * cosT).toFixed(2)}, {(R * sinT).toFixed(2)})
      </p>

      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-sm mx-auto mb-4" aria-hidden>
        {[-6, -4, -2, 0, 2, 4, 6].map(v => {
          const sx = toSx(v), sy = toSy(v);
          return <g key={v}><line x1={sx} y1={0} x2={sx} y2={S} stroke="rgba(100,116,139,0.2)" strokeWidth={0.6} /><line x1={0} y1={sy} x2={S} y2={sy} stroke="rgba(100,116,139,0.2)" strokeWidth={0.6} /></g>;
        })}
        <line x1={0} y1={oy} x2={S} y2={oy} stroke="#94a3b8" strokeWidth={1.2} />
        <line x1={ox} y1={0} x2={ox} y2={S} stroke="#94a3b8" strokeWidth={1.2} />
        <circle cx={ox} cy={oy} r={rS} fillOpacity={0.06} fill={st.accentColor} stroke={st.accentColor} strokeWidth={2} />
        <line x1={ox} y1={oy} x2={Psx} y2={Psy} stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={toSx(t1x)} y1={toSy(t1y)} x2={toSx(t2x)} y2={toSy(t2y)} stroke="#a78bfa" strokeWidth={2.5} strokeLinecap="round" />
        <path d={`M ${sqA[0].toFixed(1)} ${sqA[1].toFixed(1)} L ${sqB[0].toFixed(1)} ${sqB[1].toFixed(1)} L ${sqC[0].toFixed(1)} ${sqC[1].toFixed(1)}`} fill="none" stroke="#f59e0b" strokeWidth={1.8} strokeLinecap="square" />
        <circle cx={ox} cy={oy} r={4} fill={st.accentColor} />
        <circle cx={Psx} cy={Psy} r={5} fill="#a78bfa" />
      </svg>

      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, marginBottom: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 2, background: "#3b82f6", display: "inline-block" }} />
          <span style={{ color: "#3b82f6" }}>רדיוס</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 2, background: "#a78bfa", display: "inline-block" }} />
          <span style={{ color: "#a78bfa" }}>משיק</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, border: "1.5px solid #f59e0b", display: "inline-block" }} />
          <span style={{ color: "#b45309" }}>90°</span>
        </span>
      </div>

      <div style={{ padding: "0 8px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
          <span>זווית θ</span><span style={{ color: st.accentColor, fontWeight: 700 }}>{theta}°</span>
        </div>
        <input type="range" min="0" max="359" step="1" value={theta}
          onChange={e => setTheta(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: st.accentColor } as React.CSSProperties} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", fontSize: 12 }}>
        {[
          { label: "נקודת משיק", val: `(${(R*cosT).toFixed(1)}, ${(R*sinT).toFixed(1)})`, color: "#7c3aed" },
          { label: "שיפוע משיק", val: slopeStr, color: st.accentColor },
          { label: "כלל", val: "רדיוס ⊥ משיק", color: "#b45309" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(100,116,139,0.2)", background: "rgba(255,255,255,0.6)", padding: "10px 8px" }}>
            <div style={{ color: "#64748b", marginBottom: 4, fontSize: 11 }}>{label}</div>
            <div style={{ fontWeight: 700, color, fontSize: 11 }}>{val}</div>
          </div>
        ))}
      </div>
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
    { label: "שיפוע רדיוס", val: "m=(y₂−y₁)/(x₂−x₁)" },
    { label: "ניצבות", val: "m₁×m₂=−1" },
    { label: "שיפוע משיק", val: "m_t=−1/m_r" },
    { label: "משוואת ישר", val: "y−y₁=m(x−x₁)" },
    { label: "מרחק נקודה-לישר", val: "d=|ax₀+by₀+c|/√(a²+b²)" },
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
    problem: "נתון מעגל עם מרכז (0, 0).\nנקודת המשיקות היא (3, 4).\n\nמצא את שיפוע המשיק\nוכתוב את משוואתו.",
    diagram: (
      <TangentGraph cx={0} cy={0} r={5} px={3} py={4}
        xMin={-7} xMax={7} yMin={-7} yMax={7}
        circleColor="#16a34a" tangentColor="#a78bfa" />
    ),
    pitfalls: [
      { title: "משתמשים בשיפוע הרדיוס כשיפוע המשיק", text: "הרדיוס והמשיק מאונכים זה לזה. שיפוע הרדיוס ל-(3,4) הוא 4/3. שיפוע המשיק הוא ההפכי השלילי: −3/4." },
      { title: "חישוב ההפכי השלילי: m_tangent = −1/m_radius", text: "תנאי הניצבות: m₁ × m₂ = −1. אם m_radius=4/3, אז m_tangent = −1/(4/3) = −3/4. שוב: לא −4/3 ולא 3/4." },
    ],
    goldenPrompt: "\n\nמעגל x²+y²=25 עם מרכז (0,0). נקודת משיקות (3,4). אני צריך: 1. לחשב שיפוע הרדיוס מ-(0,0) ל-(3,4). 2. להשתמש בתנאי ניצבות m₁×m₂=−1 למשיק. 3. לכתוב משוואת המשיק.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "א", label: "שלב א׳ — שיפוע הרדיוס לנקודה (3,4)", prompt: "\n\nמרכז (0,0), נקודה על המעגל (3,4). חשב שיפוע הרדיוס: m=(y₂-y₁)/(x₂-x₁)." },
      { phase: "ב", label: "שלב ב׳ — תנאי ניצבות: m_tangent × m_radius = −1", prompt: "\n\nרדיוס ומשיק מאונכים. אם m_radius=4/3, מה m_tangent? השתמש ב-m₁×m₂=−1." },
      { phase: "ג", label: "שלב ג׳ — אמת: מכפלת השיפועים = −1", prompt: "\n\nשיפוע רדיוס: 4/3. שיפוע משיק: −3/4. חשב את המכפלה. האם הניצבות מתקיימת?" },
      { phase: "ד", label: "שלב ד׳ — כתוב משוואת הישר המשיק", prompt: "\n\nישר עם שיפוע −3/4 עובר דרך (3,4). כתוב את המשוואה y−y₁=m(x−x₁) ופשט." },
    ],
  },
  {
    id: "medium",
    problem: "נתון המעגל:\n(x − 2)² + (y − 3)² = 25\n\nמצא את משוואת המשיק\nבנקודה (5, 7).",
    diagram: (
      <TangentGraph cx={2} cy={3} r={5} px={5} py={7}
        xMin={-4} xMax={10} yMin={-4} yMax={10}
        circleColor="#ea580c" tangentColor="#a78bfa" />
    ),
    pitfalls: [
      { title: "שוכחים לזהות נכון את המרכז מהמשוואה", text: "מ-(x-2)²+(y-3)²=25 קוראים מרכז (2,3). טעות נפוצה: לקחת (−2,−3) בגלל הסימן. הסימן מתהפך!" },
      { title: "משתמשים בשיפוע הרדיוס ישירות במשיק", text: "שיפוע הרדיוס ל-(5,7) הוא 4/3. שיפוע המשיק הוא −3/4 (ניצב). הרדיוס והמשיק שונים לחלוטין." },
    ],
    goldenPrompt: "\n\nמעגל (x-2)²+(y-3)²=25. מצא משוואת המשיק בנקודה (5,7). שלבים: 1. מרכז המעגל? 2. שיפוע הרדיוס ל-(5,7)? 3. שיפוע המשיק (ניצב)? 4. משוואת ישר דרך (5,7).\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      { phase: "א", label: "שלב א׳ — זהה מרכז המעגל", contextWords: ["מרכז", "r²", "נוסחה", "מעגל", "סטנדרטית"] },
      { phase: "ב", label: "שלב ב׳ — שיפוע הרדיוס ל-(5,7)", contextWords: ["שיפוע", "רדיוס", "נוסחה", "מרכז", "נקודה"] },
      { phase: "ג", label: "שלב ג׳ — שיפוע המשיק (ניצב לרדיוס)", contextWords: ["ניצב", "שיפוע", "הפכי", "מינוס", "משיק"] },
      { phase: "ד", label: "שלב ד׳ — כתוב ואמת את משוואת המשיק", contextWords: ["משוואה", "ישר", "פשט", "אמת", "מרחק"] },
    ],
  },
  {
    id: "advanced",
    problem: "הוכח שהישר y = x + 10\nהוא משיק למעגל x² + y² = 50.\n\nמצא גם את נקודת המשיקות.",
    diagram: (
      <TangentGraph cx={0} cy={0} r={Math.sqrt(50)} px={-5} py={5}
        xMin={-11} xMax={11} yMin={-11} yMax={11}
        circleColor="#dc2626" tangentColor="#a78bfa" />
    ),
    pitfalls: [
      { title: "מנסים לפתור מערכת משוואות במקום להשתמש במרחק", text: "שיטת המרחק מהירה ואלגנטית: d=r → משיק. שיטת ההצבה מורכבת ומסוכנת — קל לטעות." },
      { title: "טועים בנוסחת המרחק מנקודה לישר", text: "ישר y=x+10 → x−y+10=0. נוסחה: d=|ax₀+by₀+c|/√(a²+b²) = |1·0+(−1)·0+10|/√2 = 10/√2. אל תשכח את הערך המוחלט." },
    ],
    goldenPrompt: "\n\n",
    steps: [
      { phase: "א", label: "שלב א׳ — כתוב את הישר בצורת ax+by+c=0", contextWords: ["ישר", "צורה", "מקדמים", "ax+by", "העברה"] },
      { phase: "ב", label: "שלב ב׳ — חשב מרחק מ-(0,0) לישר", contextWords: ["מרחק", "נוסחה", "מרכז", "ישר", "d"] },
      { phase: "ג", label: "שלב ג׳ — חשב r ובדוק d = r", contextWords: ["r", "שורש", "שוויון", "d=r", "משיק"] },
      { phase: "ד", label: "שלב ד׳ — מצא את נקודת המשיקות", contextWords: ["הצב", "פתור", "נקודת", "משיקות", "x"] },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TangentPage() {
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
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משיקים למעגל עם AI</h1>
              <p style={{ color: "#64748b", fontSize: 13, margin: "3px 0 0" }}>ניצבות, משוואת משיק והוכחת משיקות — ואיך לשאול AI את השאלות הנכונות</p>
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

          <TangentLab levelId={activeId} />

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/analytic/tangent" level={activeId} />
        </div>

        </div>
      </main>
    </>
  );
}
