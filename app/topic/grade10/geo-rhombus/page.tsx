"use client";

import React, { useState, useEffect } from "react";
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

// ─── SVG diagrams (silent — no numbers, no answers) ───────────────────────────

// Shared rhombus vertices (∠A ≈ 120°)
const RA = { x: 115, y: 128 }; // A — bottom
const RB = { x: 195, y: 82  }; // B — right
const RC = { x: 115, y: 36  }; // C — top
const RD = { x: 35,  y: 82  }; // D — left
const RO = { x: 115, y: 82  }; // O — center
const RHOMBUS_PTS = `${RA.x},${RA.y} ${RB.x},${RB.y} ${RC.x},${RC.y} ${RD.x},${RD.y}`;

function VLabels({ color = "#475569" }: { color?: string }) {
  return (
    <>
      <text x={RA.x} y={RA.y + 14} fontSize={11} fill={color} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={RB.x + 12} y={RB.y + 5} fontSize={11} fill={color} textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x={RC.x} y={RC.y - 8} fontSize={11} fill={color} textAnchor="middle" fontFamily="sans-serif">C</text>
      <text x={RD.x - 12} y={RD.y + 5} fontSize={11} fill={color} textAnchor="middle" fontFamily="sans-serif">D</text>
    </>
  );
}

function tickMark(x1: number, y1: number, x2: number, y2: number, t = 0.5, sz = 5, stroke = "#94a3b8"): React.ReactNode {
  const mx = x1 + (x2 - x1) * t, my = y1 + (y2 - y1) * t;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const px = -dy / len, py = dx / len;
  return <line x1={mx - px * sz} y1={my - py * sz} x2={mx + px * sz} y2={my + py * sz} stroke={stroke} strokeWidth={2} />;
}

// BasicSVG — rhombus with ∠A angle arc (amber) and tick marks on all 4 sides
function BasicSVG() {
  // angle arc at A: from AB direction to AD direction
  const abDx = RB.x - RA.x, abDy = RB.y - RA.y;
  const abLen = Math.sqrt(abDx * abDx + abDy * abDy);
  const adDx = RD.x - RA.x, adDy = RD.y - RA.y;
  const adLen = Math.sqrt(adDx * adDx + adDy * adDy);
  const r = 20;
  const arcStartX = RA.x + r * (abDx / abLen);
  const arcStartY = RA.y + r * (abDy / abLen);
  const arcEndX = RA.x + r * (adDx / adLen);
  const arcEndY = RA.y + r * (adDy / adLen);
  const arcPath = `M ${arcStartX.toFixed(1)} ${arcStartY.toFixed(1)} A ${r} ${r} 0 0 0 ${arcEndX.toFixed(1)} ${arcEndY.toFixed(1)}`;
  return (
    <svg viewBox="0 0 230 164" className="w-full max-w-sm mx-auto" aria-hidden>
      <polygon points={RHOMBUS_PTS} fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2} strokeLinejoin="round" />
      {/* Diagonals — dashed */}
      <line x1={RA.x} y1={RA.y} x2={RC.x} y2={RC.y} stroke="#f59e0b" strokeWidth={1.4} strokeDasharray="5,3" />
      <line x1={RB.x} y1={RB.y} x2={RD.x} y2={RD.y} stroke="#a78bfa" strokeWidth={1.4} strokeDasharray="5,3" />
      {/* Point O — intersection of diagonals */}
      <circle cx={RO.x} cy={RO.y} r={3} fill="#00d4ff" />
      <text x={RO.x + 10} y={RO.y + 14} fontSize={10} fill="#475569" fontFamily="sans-serif">O</text>
      {tickMark(RA.x, RA.y, RB.x, RB.y)}
      {tickMark(RB.x, RB.y, RC.x, RC.y)}
      {tickMark(RC.x, RC.y, RD.x, RD.y)}
      {tickMark(RD.x, RD.y, RA.x, RA.y)}
      <path d={arcPath} fill="none" stroke="#f59e0b" strokeWidth={1.8} />
      <text x={RA.x - 20} y={RA.y - 6} fontSize={10} fill="#f59e0b" fontFamily="sans-serif">∠A</text>
      <VLabels color="#334155" />
    </svg>
  );
}

// MediumSVG — square ABCD with diagonal AC, point E on AC where AE = AB
function MediumSVG() {
  // Square vertices (90° corners)
  const side = 80;
  const MA = { x: 55,          y: 42 + side }; // bottom-left (A)
  const MB = { x: 55 + side,   y: 42 + side }; // bottom-right (B)
  const MC = { x: 55 + side,   y: 42         }; // top-right (C)
  const MD = { x: 55,          y: 42         }; // top-left (D)
  const SQ_PTS = `${MA.x},${MA.y} ${MB.x},${MB.y} ${MC.x},${MC.y} ${MD.x},${MD.y}`;

  // Diagonal AC length = side * √2; E is on AC at distance = side from A (AE = AB = side)
  const acDx = MC.x - MA.x, acDy = MC.y - MA.y;
  const acLen = Math.sqrt(acDx * acDx + acDy * acDy);
  const t = side / acLen; // ratio AE/AC = 1/√2
  const ME = { x: MA.x + t * acDx, y: MA.y + t * acDy };

  // Tick mark helper for equal segments
  const ts = 5;
  const abMx = (MA.x + MB.x) / 2, abMy = (MA.y + MB.y) / 2;
  const aeMx = (MA.x + ME.x) / 2, aeMy = (MA.y + ME.y) / 2;
  // Perpendicular direction for AB (horizontal) → vertical tick
  // Perpendicular direction for AE (diagonal) → rotated tick
  const aeNx = -acDy / acLen, aeNy = acDx / acLen;

  return (
    <svg viewBox="0 0 230 164" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Square */}
      <polygon points={SQ_PTS} fill="rgba(234,88,12,0.04)" stroke="#EA580C" strokeWidth={2} strokeLinejoin="round" />
      {/* Diagonal AC — dashed amber */}
      <line x1={MA.x} y1={MA.y} x2={MC.x} y2={MC.y} stroke="#f59e0b" strokeWidth={1.4} strokeDasharray="5,3" />
      {/* Segment BE — dashed violet (construction line) */}
      <line x1={MB.x} y1={MB.y} x2={ME.x} y2={ME.y} stroke="#a78bfa" strokeWidth={1.4} strokeDasharray="5,3" />
      {/* Segment AE highlighted in red */}
      <line x1={MA.x} y1={MA.y} x2={ME.x} y2={ME.y} stroke="#dc2626" strokeWidth={2.5} />
      {/* Tick mark on AB (equal to AE) */}
      <line x1={abMx} y1={abMy - ts} x2={abMx} y2={abMy + ts} stroke="#dc2626" strokeWidth={2} />
      {/* Tick mark on AE (equal to AB) */}
      <line x1={aeMx - ts * aeNx} y1={aeMy - ts * aeNy} x2={aeMx + ts * aeNx} y2={aeMy + ts * aeNy} stroke="#dc2626" strokeWidth={2} />
      {/* Point E */}
      <circle cx={ME.x} cy={ME.y} r={3.5} fill="#dc2626" />
      <text x={ME.x + 10} y={ME.y - 4} fontSize={11} fill="#dc2626" fontWeight={700} textAnchor="start" fontFamily="sans-serif">E</text>
      {/* Right-angle marks at corners */}
      {[
        { v: MA, d1: { x: 1, y: 0 }, d2: { x: 0, y: -1 } },
        { v: MB, d1: { x: 0, y: -1 }, d2: { x: -1, y: 0 } },
        { v: MC, d1: { x: -1, y: 0 }, d2: { x: 0, y: 1 } },
        { v: MD, d1: { x: 0, y: 1 }, d2: { x: 1, y: 0 } },
      ].map((c, i) => {
        const sz = 7;
        const p1 = { x: c.v.x + sz * c.d1.x, y: c.v.y + sz * c.d1.y };
        const p2 = { x: c.v.x + sz * c.d1.x + sz * c.d2.x, y: c.v.y + sz * c.d1.y + sz * c.d2.y };
        const p3 = { x: c.v.x + sz * c.d2.x, y: c.v.y + sz * c.d2.y };
        return <polyline key={i} points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} />;
      })}
      {/* Vertex labels */}
      <text x={MA.x - 4} y={MA.y + 14} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={MB.x + 4} y={MB.y + 14} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x={MC.x + 12} y={MC.y + 4} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">C</text>
      <text x={MD.x - 12} y={MD.y + 4} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">D</text>
    </svg>
  );
}

// AdvancedSVG — rhombus ABCD (∠A=60°) with external square ABEF
function AdvancedSVG() {
  // Larger rhombus for clarity
  const side = 80;
  const halfA = (60 / 2) * Math.PI / 180; // 30°
  const cx = 140, cy = 140;
  const ao = side * Math.cos(halfA); // half vertical diagonal
  const bo = side * Math.sin(halfA); // half horizontal diagonal
  const XA = { x: cx, y: cy + ao };       // A — bottom
  const XB = { x: cx + bo, y: cy };       // B — right
  const XC = { x: cx, y: cy - ao };       // C — top
  const XD = { x: cx - bo, y: cy };       // D — left

  // Square ABEF built outward on side AB
  const abDx = XB.x - XA.x, abDy = XB.y - XA.y;
  const abLen = Math.sqrt(abDx * abDx + abDy * abDy);
  const abUx = abDx / abLen, abUy = abDy / abLen;
  // Outward normal (pointing right/away from rhombus)
  const nOutX = -abUy, nOutY = abUx;
  const XE = { x: XB.x + nOutX * side, y: XB.y + nOutY * side };
  const XF = { x: XA.x + nOutX * side, y: XA.y + nOutY * side };

  // Double tick mark helper — two parallel lines for "equal length"
  function doubleTick(x1: number, y1: number, x2: number, y2: number, color: string) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    const px = -dy / len, py = dx / len; // perpendicular
    const ux = dx / len, uy = dy / len;  // along edge
    const sz = 6, gap = 2;
    return (
      <>
        <line x1={mx - gap * ux - px * sz} y1={my - gap * uy - py * sz} x2={mx - gap * ux + px * sz} y2={my - gap * uy + py * sz} stroke={color} strokeWidth={1.8} />
        <line x1={mx + gap * ux - px * sz} y1={my + gap * uy - py * sz} x2={mx + gap * ux + px * sz} y2={my + gap * uy + py * sz} stroke={color} strokeWidth={1.8} />
      </>
    );
  }

  // Right-angle mark helper (larger)
  function raMarker(vx: number, vy: number, d1x: number, d1y: number, d2x: number, d2y: number, color: string) {
    const sz = 9;
    const p1x = vx + sz * d1x, p1y = vy + sz * d1y;
    const p2x = vx + sz * d1x + sz * d2x, p2y = vy + sz * d1y + sz * d2y;
    const p3x = vx + sz * d2x, p3y = vy + sz * d2y;
    return <polyline points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`} fill="none" stroke={color} strokeWidth={1.5} />;
  }

  // Angle arc at C (60°) — larger radius
  const r = 24;
  // Directions from C toward B and toward D
  const cbDx = XB.x - XC.x, cbDy = XB.y - XC.y;
  const cbLen = Math.sqrt(cbDx * cbDx + cbDy * cbDy);
  const cbUx = cbDx / cbLen, cbUy = cbDy / cbLen;
  const cdDx = XD.x - XC.x, cdDy = XD.y - XC.y;
  const cdLen = Math.sqrt(cdDx * cdDx + cdDy * cdDy);
  const cdUx = cdDx / cdLen, cdUy = cdDy / cdLen;
  const arcS = { x: XC.x + r * cbUx, y: XC.y + r * cbUy }; // toward B
  const arcE = { x: XC.x + r * cdUx, y: XC.y + r * cdUy }; // toward D
  const arcPath = `M ${arcS.x.toFixed(1)} ${arcS.y.toFixed(1)} A ${r} ${r} 0 0 1 ${arcE.x.toFixed(1)} ${arcE.y.toFixed(1)}`;
  // Label position — midpoint of arc directions
  const arcMidDx = (cbUx + cdUx) / 2, arcMidDy = (cbUy + cdUy) / 2;
  const arcMidLen = Math.sqrt(arcMidDx * arcMidDx + arcMidDy * arcMidDy);
  const labelR = r + 12;
  const labelX = XC.x + labelR * (arcMidDx / arcMidLen);
  const labelY = XC.y + labelR * (arcMidDy / arcMidLen);

  // Square corner unit vectors
  const beUx = (XE.x - XB.x) / side, beUy = (XE.y - XB.y) / side;
  const efUx = (XF.x - XE.x) / side, efUy = (XF.y - XE.y) / side;
  const faUx = (XA.x - XF.x) / side, faUy = (XA.y - XF.y) / side;

  return (
    <svg viewBox="0 0 380 290" className="w-full max-w-md mx-auto" aria-hidden>
      {/* Rhombus ABCD — green */}
      <polygon points={`${XA.x},${XA.y} ${XB.x},${XB.y} ${XC.x},${XC.y} ${XD.x},${XD.y}`}
        fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Square ABEF — red */}
      <polygon points={`${XA.x},${XA.y} ${XB.x},${XB.y} ${XE.x},${XE.y} ${XF.x},${XF.y}`}
        fill="rgba(220,38,38,0.05)" stroke="#dc2626" strokeWidth={2.5} strokeLinejoin="round" />

      {/* Construction line D→F — dashed violet */}
      <line x1={XD.x} y1={XD.y} x2={XF.x} y2={XF.y} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,4" />

      {/* Angle arc at A — 60° */}
      <path d={arcPath} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth={2.2} />
      <text x={labelX} y={labelY} fontSize={12} fill="#f59e0b" fontWeight={700} textAnchor="middle" dominantBaseline="middle" fontFamily="sans-serif">60°</text>

      {/* Right-angle marks at square corners — red */}
      {raMarker(XA.x, XA.y, nOutX, nOutY, abUx, abUy, "#dc2626")}
      {raMarker(XB.x, XB.y, -abUx, -abUy, beUx, beUy, "#dc2626")}
      {raMarker(XE.x, XE.y, -beUx, -beUy, efUx, efUy, "#dc2626")}
      {raMarker(XF.x, XF.y, -efUx, -efUy, faUx, faUy, "#dc2626")}

      {/* Vertex labels — larger */}
      <text x={XA.x} y={XA.y + 18} fontSize={14} fill="#334155" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={XB.x + 14} y={XB.y + 6} fontSize={14} fill="#334155" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x={XC.x} y={XC.y - 10} fontSize={14} fill="#334155" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">C</text>
      <text x={XD.x - 14} y={XD.y + 6} fontSize={14} fill="#334155" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">D</text>
      <text x={XE.x + 14} y={XE.y + 6} fontSize={14} fill="#dc2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">E</text>
      <text x={XF.x + 14} y={XF.y + 6} fontSize={14} fill="#dc2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">F</text>
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
        <span>✨</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
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
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
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

        {/* Score bar */}
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

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText]       = useState("");
  const [result, setResult]   = useState<ScoreResult | null>(null);
  const [copied, setCopied]   = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;

  // rose palette for advanced
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
      {/* Header */}
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
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(6,78,59,0.1)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: passed ? "#6ee7b7" : "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />

        {/* Score bar */}
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

        {/* Feedback */}
        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "⚠️" : "💡"} {result.hint}
          </motion.div>
        )}

        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ ניסוח מעולה! הסעיף הבא נפתח.</div>
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

// ─── Ladder Advanced ──────────────────────────────────────────────────────────

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [stepsPassed, setStepsPassed] = useState<boolean[]>(Array(steps.length).fill(false));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#059669"
        accentRgb="5,150,105"
        requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["מעוין", "ריבוע", "אלכסונים", "צלעות", "זוויות", "מקבילות", "מאונכים", "חוצי זוויות", "שווה שוקיים", "פיתגורס", "חפיפה", "דמיון", "קודקוד", "בניית עזר", "גאומטריה", "מרובע", "צלע", "אלכסון", "זווית"]}
        subjectHint="גאומטריה / מעוין / ריבוע"
      />

      {masterPassed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {steps.map((s, i) => (
            <TutorStepAdvanced
              key={i} step={s}
              locked={i > 0 && !stepsPassed[i - 1]}
              onPass={() => setStepsPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
            />
          ))}
          <button onClick={() => { setMasterPassed(false); setStepsPassed(Array(steps.length).fill(false)); }} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: 8 }}>
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
    title: "המעוין והיקפו",
    problem: "במעוין ABCD, אורך האלכסון הקצר הוא 12 ס\"מ ואורך האלכסון הארוך הוא 16 ס\"מ.\nהאלכסונים AC, BD נחתכים בנקודה O.\n\nא. מצא את אורך צלע המעוין.\nב. חשב את היקף המעוין.\nג. חשב את שטח המעוין.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ בלבול בין צלעות לאלכסונים", text: "טעות נפוצה היא להניח שצלע המעוין שווה לאחד האלכסונים. זכור: במעוין (שאינו משולש שווה צלעות), הצלע תמיד תהיה היתר במשולש ישר הזווית שנוצר מהאלכסונים, ולכן היא ארוכה יותר מכל חצי אלכסון בנפרד." },
      { title: "⚠️ חצאי אלכסונים, לא אלכסונים שלמים", text: "במשולש הפנימי משתמשים בחצאי האלכסונים: 12/2 = 6 ו-16/2 = 8. אל תציב את האלכסונים המלאים בפיתגורס." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על מעוין. אני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת אורך צלע", coaching: "", prompt: "תסביר לי כיצד נמצא את אורך צלע המעויין.", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "6", "8", "חצי", "ניצב", "יתר", "משולש"] },
      { phase: "סעיף ב׳", label: "חישוב היקף המעוין", coaching: "", prompt: "מצאנו את צלע המעוין, כיצד נחשב את ההיקף?", keywords: [], keywordHint: "", contextWords: ["היקף", "צלע", "כפול", "4", "שוות"] },
      { phase: "סעיף ג׳", label: "חישוב שטח המעוין", coaching: "", prompt: "תכווין אותי למציאת שטח המעוין.", keywords: [], keywordHint: "", contextWords: ["שטח", "אלכסון", "חלקי", "2", "מכפלת"] },
    ],
  },
  {
    id: "medium",
    title: "הריבוע והאלכסון",
    problem: "נתון ריבוע ABCD שצלעו היא x. מעבירים את האלכסון AC.\nעל האלכסון מסמנים נקודה E כך ש-AE = AB.\n\nא. חשב את גודל הזווית ∠ABE.\nב. הבע באמצעות x את אורך הקטע EC.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ אל תניח ש-E נמצא באמצע AC", text: "E מוגדר כך ש-AE = AB = x. אורך האלכסון הוא x√2, ולכן E אינו באמצע — הוא קרוב יותר ל-A." },
      { title: "💡 זווית האלכסון בריבוע היא 45°", text: "האלכסון חוצה את הזווית הישרה (90°) לשניים, כלומר ∠BAC = ∠DAC = 45°. זהו מפתח לחישוב הזוויות ב-△ABE." },
    ],
    goldenPrompt: `\nאני בכיתה י', מצרף לך תרגיל בגאומטריה בנושא ריבוע.\n\nאל תיתן לי את ההוכחה — שאל אותי שאלות מנחות על תכונות הריבוע ומשולש שווה-שוקיים.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "חישוב זוויות", coaching: "", prompt: "תסביר לי כיצד נחשב את גודל הזווית ∠ABE.", keywords: [], keywordHint: "", contextWords: ["45", "∠BAC", "אלכסון", "חוצה", "זווית", "שווה-שוקיים", "בסיס"] },
      { phase: "סעיף ב׳", label: "הבעה באמצעות x", coaching: "", prompt: "אורך צלע הריבוע הוא x. עזור לי להביע באמצעות x את אורך הקטע EC.", keywords: [], keywordHint: "", contextWords: ["AC", "AE", "EC", "√2", "x", "אלכסון", "חיסור"] },
    ],
  },
  {
    id: "advanced",
    title: "שילוב מעוין וריבוע",
    problem: "נתון מעוין ABCD שבו הזווית ∠C היא 60°.\nעל הצלע AB בונים ריבוע ABEF כלפי חוץ למעוין.\n\nא. הוכח כי המשולש △ADF הוא משולש שווה שוקיים.\nב. חשב את זוויות המשולש △ADF.\nג. נתון BD=6, מה היחס בין שטח הריבוע לשטח המעוין?",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ שימו לב לכיוון הבנייה", text: "כאשר בונים צורה על צלע קיימת, חשוב לוודא אם היא נבנית \"כלפי חוץ\" או \"כלפי פנים\". זיהוי שגוי של כיוון הבנייה יוביל לחישוב מוטעה של הזוויות הנוצרות במפגש בין הצורות." },
      { title: "💡 הקשר בין אלכסונים לצלעות", text: "במעוין בעל זווית של 60° או 120°, נוצרים משולשים בעלי תכונות מיוחדות. זיהוי סוג המשולשים הללו הוא המפתח למציאת הקשר בין אורך האלכסון לאורך הצלע." },
    ],
    goldenPrompt: "\n\n",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מוכיחים הקבלה וזוויות בשילוב מעוין וריבוע? מה הזוויות במעוין כש-∠C = 60°? איך משפיע הריבוע החיצוני על המשולש △ADF? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הוכחת △ADF שווה שוקיים", coaching: "", prompt: "תסביר לי למה △ADF שווה שוקיים", keywords: [], keywordHint: "", contextWords: ["AD", "AF", "שוות", "שוקיים", "צלע", "מעוין", "ריבוע"] },
      { phase: "סעיף ב׳", label: "חישוב זוויות המשולש △ADF", coaching: "", prompt: "כיצד נחשב את זוויות המשולש ADF?", keywords: [], keywordHint: "", contextWords: ["∠DAF", "60", "90", "זווית", "משולש", "בסיס"] },
      { phase: "סעיף ג׳", label: "יחס בין שטח הריבוע לשטח המעוין", coaching: "", prompt: "תדריך אותי לחשב את היחס בין שטח הריבוע לשטח המעוין, שים לב שאנו לא יודעים מה גודלי הצלעות.", keywords: [], keywordHint: "", contextWords: ["שטח", "יחס", "ריבוע", "מעוין", "אלכסון", "צלע", "sin"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box — Rhombus card */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>💎 תכונות המעוין (The Rhombus)</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            המעוין הוא מקבילית, ולכן יורש את כל תכונותיה: צלעות נגדיות שוות ומקבילות, זוויות נגדיות שוות, אלכסונים חוצים זה את זה.
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        {/* Category: תכונות מקבילית (ירושה) */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📏 תכונות מקבילית (ירושה)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AB‖CD, BC‖AD</span>
              <span>צלעות נגדיות מקבילות זו לזו.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>∠A = ∠C, ∠B = ∠D</span>
              <span>זוויות נגדיות שוות.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>∠A + ∠B = 180°</span>
              <span>זוויות סמוכות משלימות ל-<strong>180°</strong>.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AO = CO, BO = DO</span>
              <span>האלכסונים חוצים זה את זה.</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />

        {/* Category: תכונות ייחודיות למעוין */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ תכונות ייחודיות למעוין</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AB = BC = CD = DA</span>
              <span>כל הצלעות שוות — בניגוד למקבילית רגילה, אין &quot;ארוכה&quot; ו&quot;קצרה&quot;.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AC ⊥ BD</span>
              <span>אלכסונים מאונכים — המפגש ביניהם יוצר תמיד <strong>90°</strong>.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>חוצי זוויות</span>
              <span>האלכסונים מחלקים את זוויות המעוין בדיוק לשניים.</span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />

        {/* Category: שטח */}
        <div style={{ marginBottom: ex.id !== "basic" ? 16 : 0 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📐 חישוב שטח</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
            <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>S = (d₁·d₂) / 2</span>
            <span>שטח מעוין — מכפלת האלכסונים חלקי 2.</span>
          </div>
        </div>

        {/* Square extras — levels 2 & 3 only */}
        {ex.id !== "basic" && (
          <>
            <div style={{ height: 2, background: `rgba(${s.glowRgb},0.25)`, marginBottom: 14, borderRadius: 1 }} />
            <div style={{ borderRadius: 12, background: `rgba(${s.glowRgb},0.07)`, border: `1px solid rgba(${s.glowRgb},0.25)`, padding: "10px 14px" }}>
              <div style={{ color: s.accentColor, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🟩 תכונות הריבוע (The Square) – &quot;מלך המרובעים&quot;</div>
              <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55, marginBottom: 10 }}>
                הריבוע הוא השילוב המושלם: גם <strong style={{ color: "#2D3436" }}>מעוין</strong> (כל הצלעות שוות) וגם <strong style={{ color: "#2D3436" }}>מלבן</strong> (כל הזוויות ישרות).
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>∠A=∠B=∠C=∠D=90°</span>
                  <span>כל הזוויות ישרות — <strong>90°</strong>.</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
                  <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 80 }}>AC = BD</span>
                  <span>האלכסונים שווים באורכם (בנוסף לחציית זה את זה וניצבות).</span>
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
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>

    </section>
  );
}

// ─── RhombusLab ───────────────────────────────────────────────────────────────

function RhombusLab({ levelId }: { levelId: "basic" | "medium" | "advanced" }) {
  const [angleA, setAngleA] = useState(120);

  useEffect(() => {
    setAngleA(120);
  }, [levelId]);

  const st = STATION[levelId];
  const angleB = 180 - angleA;
  const angleC = angleA;
  const angleD = angleB;
  const isSquare = Math.abs(angleA - 90) < 3;

  // Compute rhombus vertices from angle
  const cx = 130, cy = 90, s = 60;
  const halfArad = (angleA / 2 * Math.PI) / 180;
  const ao = s * Math.cos(halfArad); // half vertical diagonal
  const bo = s * Math.sin(halfArad); // half horizontal diagonal
  const Ax = cx, Ay = cy + ao;
  const Bx = cx + bo, By = cy;
  const Cx = cx, Cy = cy - ao;
  const Dx = cx - bo, Dy = cy;

  const strokeColor = isSquare ? "#00d4ff" : st.accentColor;

  const sides: [number, number, number, number][] = [
    [Ax, Ay, Bx, By],
    [Bx, By, Cx, Cy],
    [Cx, Cy, Dx, Dy],
    [Dx, Dy, Ax, Ay],
  ];

  const angleTiles = [
    { label: "∠A", val: angleA },
    { label: "∠B", val: angleB },
    { label: "∠C", val: angleC },
    { label: "∠D", val: angleD },
    { label: "∠AOB", val: 90 },
  ];

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת מעוין</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את הזווית ∠A וראה כיצד כל הזוויות מתעדכנות. האלכסונים תמיד מאונכים (90°). כאשר ∠A = 90° — המעוין הופך לריבוע!</p>

      {/* Slider */}
      <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>זווית ∠A <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(מעלות)</span></span>
          <span style={{ color: isSquare ? "#00d4ff" : st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{angleA}°</span>
        </div>
        <input type="range" min={30} max={150} step={1} value={angleA} onChange={(e) => setAngleA(+e.target.value)} style={{ width: "100%", accentColor: isSquare ? "#00d4ff" : st.accentColor }} />
      </div>

      {/* Square banner */}
      {isSquare && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius: 12, background: "rgba(0,212,255,0.08)", border: "2px solid rgba(0,212,255,0.5)", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#00d4ff", fontWeight: 700, fontSize: 14 }}>
          ⭐ ריבוע! כל הזוויות = 90° וכל הצלעות שוות
        </motion.div>
      )}

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
          <polygon
            points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy} ${Dx},${Dy}`}
            fill={isSquare ? "rgba(0,212,255,0.06)" : "rgba(22,163,74,0.05)"}
            stroke={strokeColor} strokeWidth={2} strokeLinejoin="round"
          />
          {/* Diagonal AC — amber dashed */}
          <line x1={Ax} y1={Ay} x2={Cx} y2={Cy} stroke="#f59e0b" strokeWidth={1.6} strokeDasharray="5,3" />
          {/* Diagonal DB — violet dashed */}
          <line x1={Dx} y1={Dy} x2={Bx} y2={By} stroke="#a78bfa" strokeWidth={1.6} strokeDasharray="5,3" />
          {/* Right-angle mark at O */}
          <polyline
            points={`${cx + 8},${cy} ${cx + 8},${cy - 8} ${cx},${cy - 8}`}
            fill="none"
            stroke={isSquare ? "#00d4ff" : "#475569"}
            strokeWidth={1.5}
          />
          {/* Tick marks on all 4 sides */}
          {sides.map(([x1, y1, x2, y2], i) => {
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
            const px = -dy / len, py = dx / len, sz = 5;
            return <line key={i} x1={mx - px * sz} y1={my - py * sz} x2={mx + px * sz} y2={my + py * sz} stroke={strokeColor} strokeWidth={1.5} />;
          })}
          {/* Vertex labels */}
          <text x={Ax} y={Ay + 14} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">A</text>
          <text x={Bx + 12} y={By + 5} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">B</text>
          <text x={Cx} y={Cy - 8} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">C</text>
          <text x={Dx - 12} y={Dy + 5} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">D</text>
        </svg>
      </div>

      {/* 5 angle tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {angleTiles.map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: row.label === "∠AOB" ? "#a78bfa" : (isSquare ? "#00d4ff" : st.accentColor), fontFamily: "monospace", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.label === "∠AOB" ? "#a78bfa" : (isSquare ? "#00d4ff" : st.accentColor), fontWeight: 700, fontSize: 20 }}>{row.val}°</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── SquareLab ────────────────────────────────────────────────────────────────

function SquareLab() {
  const [side, setSide] = useState(5);
  const diag = Math.sqrt(2) * side;
  const area = side * side;
  const perimeter = 4 * side;
  const st = STATION.medium;

  // Draw square in SVG
  const pad = 30;
  const maxSide = 160;
  const scale = maxSide / 10; // max slider = 10
  const sz = side * scale;
  const ox = 130 - sz / 2, oy = 90 - sz / 2;
  const SA = { x: ox, y: oy + sz };
  const SB = { x: ox + sz, y: oy + sz };
  const SC = { x: ox + sz, y: oy };
  const SD = { x: ox, y: oy };

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ריבועים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את אורך הצלע וראה כיצד האלכסון, השטח וההיקף מתעדכנים.</p>

      {/* Slider */}
      <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>אורך צלע <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(ס&quot;מ)</span></span>
          <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{side}</span>
        </div>
        <input type="range" min={1} max={10} step={0.5} value={side} onChange={(e) => setSide(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 180" className="w-full max-w-sm mx-auto" aria-hidden>
          {/* Square */}
          <polygon
            points={`${SA.x},${SA.y} ${SB.x},${SB.y} ${SC.x},${SC.y} ${SD.x},${SD.y}`}
            fill="rgba(234,88,12,0.05)" stroke={st.accentColor} strokeWidth={2} strokeLinejoin="round"
          />
          {/* Diagonal AC — amber dashed */}
          <line x1={SA.x} y1={SA.y} x2={SC.x} y2={SC.y} stroke="#f59e0b" strokeWidth={1.4} strokeDasharray="5,3" />
          {/* Diagonal BD — violet dashed */}
          <line x1={SB.x} y1={SB.y} x2={SD.x} y2={SD.y} stroke="#a78bfa" strokeWidth={1.4} strokeDasharray="5,3" />
          {/* Right-angle marks at corners */}
          {[
            { v: SA, d1: { x: 1, y: 0 }, d2: { x: 0, y: -1 } },
            { v: SB, d1: { x: 0, y: -1 }, d2: { x: -1, y: 0 } },
            { v: SC, d1: { x: -1, y: 0 }, d2: { x: 0, y: 1 } },
            { v: SD, d1: { x: 0, y: 1 }, d2: { x: 1, y: 0 } },
          ].map((c, i) => {
            const rsz = 7;
            const p1 = { x: c.v.x + rsz * c.d1.x, y: c.v.y + rsz * c.d1.y };
            const p2 = { x: c.v.x + rsz * c.d1.x + rsz * c.d2.x, y: c.v.y + rsz * c.d1.y + rsz * c.d2.y };
            const p3 = { x: c.v.x + rsz * c.d2.x, y: c.v.y + rsz * c.d2.y };
            return <polyline key={i} points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} />;
          })}
          {/* Vertex labels */}
          <text x={SA.x - 4} y={SA.y + 14} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">A</text>
          <text x={SB.x + 4} y={SB.y + 14} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">B</text>
          <text x={SC.x + 12} y={SC.y + 4} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">C</text>
          <text x={SD.x - 12} y={SD.y + 4} fontSize={11} fill="#334155" textAnchor="middle" fontFamily="sans-serif">D</text>
        </svg>
      </div>

      {/* Result tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "צלע", val: `${side}`, unit: "ס״מ" },
          { label: "אלכסון", val: diag.toFixed(2), unit: "ס״מ" },
          { label: "שטח", val: area.toFixed(1), unit: "ס״מ²" },
          { label: "היקף", val: perimeter.toFixed(1), unit: "ס״מ" },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
            <div style={{ color: "#9CA3AF", fontSize: 10, marginTop: 2 }}>{row.unit}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── AdvancedLab — rhombus ABCD + square ABEF interactive ─────────────────────

function AdvancedLab() {
  const [side, setSide] = useState(80);
  const [angleC, setAngleC] = useState(60);
  const st = STATION.advanced;

  // Rhombus geometry — ∠C = angleC, so ∠A = angleC (opposite), ∠B = ∠D = 180 - angleC
  const halfC = (angleC / 2) * Math.PI / 180;
  const cx = 190, cy = 160;
  const ao = side * Math.cos(halfC); // half vertical diagonal
  const bo = side * Math.sin(halfC); // half horizontal diagonal
  const LA = { x: cx, y: cy + ao };
  const LB = { x: cx + bo, y: cy };
  const LC = { x: cx, y: cy - ao };
  const LD = { x: cx - bo, y: cy };

  // Square ABEF outward on AB
  const abDx = LB.x - LA.x, abDy = LB.y - LA.y;
  const abLen = Math.sqrt(abDx * abDx + abDy * abDy);
  const abUx = abDx / abLen, abUy = abDy / abLen;
  const nX = -abUy, nY = abUx; // outward normal
  const LE = { x: LB.x + nX * side, y: LB.y + nY * side };
  const LF = { x: LA.x + nX * side, y: LA.y + nY * side };

  // ∠FBC = 360 - ∠FBA(90) - ∠ABC(180 - angleC) = 360 - 90 - (180 - angleC) = 90 + angleC
  const angleFBC = 90 + angleC;

  // Tick mark helper
  function tm(x1: number, y1: number, x2: number, y2: number, color: string) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    const px = -dy / len, py = dx / len, sz = 5;
    return <line x1={mx - px * sz} y1={my - py * sz} x2={mx + px * sz} y2={my + py * sz} stroke={color} strokeWidth={1.5} />;
  }

  // Angle arc at C
  const r = 20;
  const cbDx = LB.x - LC.x, cbDy = LB.y - LC.y, cbLen = Math.sqrt(cbDx * cbDx + cbDy * cbDy);
  const cdDx = LD.x - LC.x, cdDy = LD.y - LC.y, cdLen = Math.sqrt(cdDx * cdDx + cdDy * cdDy);
  const arcS = { x: LC.x + r * cbDx / cbLen, y: LC.y + r * cbDy / cbLen };
  const arcE2 = { x: LC.x + r * cdDx / cdLen, y: LC.y + r * cdDy / cdLen };
  const arcPath = `M ${arcS.x.toFixed(1)} ${arcS.y.toFixed(1)} A ${r} ${r} 0 0 1 ${arcE2.x.toFixed(1)} ${arcE2.y.toFixed(1)}`;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדה גאומטרית חיה — מעוין + ריבוע</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את אורך הצלע ואת זווית C וראה כיצד הריבוע נע עם המעוין.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>אורך צלע <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>(a)</span></span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{(side / 10).toFixed(1)} ס&quot;מ</span>
          </div>
          <input type="range" min={50} max={150} step={1} value={side} onChange={(e) => setSide(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
        <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 600 }}>∠C</span></span>
            <span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{angleC}°</span>
          </div>
          <input type="range" min={20} max={160} step={1} value={angleC} onChange={(e) => setAngleC(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 380 320" className="w-full max-w-md mx-auto" aria-hidden>
          {/* Rhombus — green */}
          <polygon points={`${LA.x},${LA.y} ${LB.x},${LB.y} ${LC.x},${LC.y} ${LD.x},${LD.y}`}
            fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2.5} strokeLinejoin="round" />
          {/* Square — red */}
          <polygon points={`${LA.x},${LA.y} ${LB.x},${LB.y} ${LE.x},${LE.y} ${LF.x},${LF.y}`}
            fill="rgba(220,38,38,0.05)" stroke="#dc2626" strokeWidth={2.5} strokeLinejoin="round" />
          {/* Construction line D→F — dashed violet */}
          <line x1={LD.x} y1={LD.y} x2={LF.x} y2={LF.y} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6,4" />

          {/* Tick marks — all 7 unique sides (AB shared) */}
          {tm(LA.x, LA.y, LB.x, LB.y, "#d97706")}
          {tm(LB.x, LB.y, LC.x, LC.y, "#d97706")}
          {tm(LC.x, LC.y, LD.x, LD.y, "#d97706")}
          {tm(LD.x, LD.y, LA.x, LA.y, "#d97706")}
          {tm(LB.x, LB.y, LE.x, LE.y, "#d97706")}
          {tm(LE.x, LE.y, LF.x, LF.y, "#d97706")}
          {tm(LF.x, LF.y, LA.x, LA.y, "#d97706")}

          {/* Angle arc at C */}
          <path d={arcPath} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth={2} />

          {/* Vertex labels */}
          <text x={LA.x} y={LA.y + 18} fontSize={14} fill="#334155" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">A</text>
          <text x={LB.x + 14} y={LB.y + 6} fontSize={14} fill="#334155" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">B</text>
          <text x={LC.x} y={LC.y - 10} fontSize={14} fill="#334155" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">C</text>
          <text x={LD.x - 14} y={LD.y + 6} fontSize={14} fill="#334155" fontWeight={600} textAnchor="middle" fontFamily="sans-serif">D</text>
          <text x={LE.x + 14} y={LE.y + 6} fontSize={14} fill="#dc2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">E</text>
          <text x={LF.x + 14} y={LF.y + 6} fontSize={14} fill="#dc2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">F</text>
        </svg>
      </div>

      {/* Result tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        {[
          { label: "צלע (a)", val: `${(side / 10).toFixed(1)} ס״מ`, color: st.accentColor },
          { label: "∠C", val: `${angleC}°`, color: "#f59e0b" },
          { label: "∠B = ∠D", val: `${180 - angleC}°`, color: st.accentColor },
        ].map((row) => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: row.color, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",  border: "border-green-600",  bg: "bg-green-600/10",  glowColor: "rgba(22,163,74,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700", border: "border-orange-600", bg: "bg-orange-600/10", glowColor: "rgba(234,88,12,0.3)"  },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",    border: "border-red-700",    bg: "bg-red-700/10",    glowColor: "rgba(220,38,38,0.3)"  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GeoRhombusPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      {/* ── Global focus/hover border overrides — kills all browser black outlines ── */}
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
          {/* Title */}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>מעוין וריבוע עם AI — כיתה י׳</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>זוויות, הוכחת מעוין מניצבות אלכסונים, הוכחת ריבוע — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          {/* Back button */}
          <Link
            href="/topic/grade10/geometry"
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
        <SubtopicProgress subtopicId="/grade10/geo-rhombus" />

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

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <RhombusLab levelId="basic" />}
        {selectedLevel === "medium" && <SquareLab />}
        {selectedLevel === "advanced" && <AdvancedLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade10/geo-rhombus" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
