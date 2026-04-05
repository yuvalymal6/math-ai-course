"use client";

import { useMemo } from "react";

/**
 * TrigAdvancedDiagram — Interactive SVG geometry diagram.
 *
 * Triangle ABC is FIXED so that AC / AB = 1.6 exactly.
 *   • α = ∠BAE  (angle at vertex A between rays AB and AE)
 *   • E = intersection of ray AE with base BC
 *   • BD ⊥ AE at D    →  BD = k · sin(α)
 *   • CF ⊥ AE at F    →  CF = 1.6k · sin(∠BAC − α)
 *
 * Props (optional — sensible defaults):
 *   • alpha  — ∠BAE in degrees (5–80, default 40)
 */

// ── Fixed triangle geometry (AC / AB = 1.6 exactly) ─────────────────────────

const Bx = 60, By = 380, Cx = 540, Cy = 380;
const BASE = Cx - Bx; // 480 px
const Ay_CONST = 150;
const h = By - Ay_CONST; // 230 px

// Solve quadratic for Ax so that AC² = 2.56 · AB²
//   1.56·Ax² + 772.8·Ax − (282384 − 1.56·h²) = 0
const _a = 1.56, _b = 772.8, _c = -(282384 - 1.56 * h * h);
const Ax_CONST = (-_b + Math.sqrt(_b * _b - 4 * _a * _c)) / (2 * _a); // ≈ 187.6

// Pixel lengths of the two sides (constant)
const AB_PX = Math.sqrt((Bx - Ax_CONST) ** 2 + h * h);
const AC_PX = Math.sqrt((Cx - Ax_CONST) ** 2 + h * h);

// Angles of rays AB and AC from vertex A (in SVG y-down coords)
const AB_ANG = Math.atan2(By - Ay_CONST, Bx - Ax_CONST); // ≈ 1.55 rad
const AC_ANG = Math.atan2(Cy - Ay_CONST, Cx - Ax_CONST); // ≈ 0.57 rad
const FULL_BAC = AB_ANG - AC_ANG; // ≈ 1.50 rad ≈ 86°

// ── Helpers ──────────────────────────────────────────────────────────────────

const SQ = 13;
const ARC_R = 32;

function unit(fx: number, fy: number, tx: number, ty: number) {
  const dx = tx - fx, dy = ty - fy;
  const l = Math.sqrt(dx * dx + dy * dy);
  return l < 1e-9 ? { x: 0, y: -1 } : { x: dx / l, y: dy / l };
}

function sqPath(cx: number, cy: number, u1x: number, u1y: number, u2x: number, u2y: number) {
  const p1x = cx + SQ * u1x, p1y = cy + SQ * u1y;
  const p2x = p1x + SQ * u2x, p2y = p1y + SQ * u2y;
  const p3x = cx + SQ * u2x, p3y = cy + SQ * u2y;
  return `M${p1x.toFixed(1)},${p1y.toFixed(1)} L${p2x.toFixed(1)},${p2y.toFixed(1)} L${p3x.toFixed(1)},${p3y.toFixed(1)}`;
}

function midLabel(p1x: number, p1y: number, p2x: number, p2y: number, off: number) {
  const mx = (p1x + p2x) / 2, my = (p1y + p2y) / 2;
  const dx = p2x - p1x, dy = p2y - p1y;
  const l = Math.sqrt(dx * dx + dy * dy);
  return { x: mx + off * (-dy / l), y: my + off * (dx / l) };
}

// ── Geometry engine ──────────────────────────────────────────────────────────

function computeGeometry(alphaDeg: number) {
  const alphaRad = (alphaDeg * Math.PI) / 180;

  const Ax = Ax_CONST, Ay = Ay_CONST;

  // Ray AE direction: rotate from AB by α toward AC
  const thetaAE = AB_ANG - alphaRad;
  const sinT = Math.sin(thetaAE), cosT = Math.cos(thetaAE);

  // E: ray from A hits base y = 380
  const s = h / sinT;
  const Ex = Ax + s * cosT;
  const Ey = By; // 380

  // AE unit vector
  const ux = unit(Ax, Ay, Ex, Ey);

  // D = foot of perp from B onto line AE
  const bax = Bx - Ax, bay = By - Ay;
  const projB = bax * ux.x + bay * ux.y;
  const Dx = Ax + projB * ux.x, Dy = Ay + projB * ux.y;

  // F = foot of perp from C onto line AE (extension past E)
  const cax = Cx - Ax, cay = Cy - Ay;
  const projC = cax * ux.x + cay * ux.y;
  const Fx = Ax + projC * ux.x, Fy = Ay + projC * ux.y;

  // Extension for dashed line: must reach whichever is farther — E or F — plus 30 px
  const projE = s; // distance from A to E along the line
  const maxProj = Math.max(projE, projC);
  const extX = Ax + (maxProj + 30) * ux.x, extY = Ay + (maxProj + 30) * ux.y;

  // Pixel distances
  const BD = Math.sqrt((Dx - Bx) ** 2 + (Dy - By) ** 2);
  const CF = Math.sqrt((Fx - Cx) ** 2 + (Fy - Cy) ** 2);
  const BE = Math.sqrt((Ex - Bx) ** 2 + (Ey - By) ** 2);
  const CE = Math.sqrt((Cx - Ex) ** 2 + (Cy - Ey) ** 2);

  // Label offsets for E and F — push apart when they're close
  const efDist = Math.sqrt((Ex - Fx) ** 2 + (Ey - Fy) ** 2);
  const eLblDy = 26;  // default: below E
  // If F is close to E, offset F label further along the line direction
  const fLblDx = efDist < 40 ? 20 : 16;
  const fLblDy = efDist < 40 ? (Fy > Ey ? 22 : -18) : 6;

  // Right-angle marks
  const dToB = unit(Dx, Dy, Bx, By);
  const dSq = sqPath(Dx, Dy, dToB.x, dToB.y, ux.x, ux.y);
  const fToC = unit(Fx, Fy, Cx, Cy);
  const fSq = sqPath(Fx, Fy, fToC.x, fToC.y, -ux.x, -ux.y);

  // α arc at A (between rays AB and AE)
  const abU = unit(Ax, Ay, Bx, By);
  const aeU = unit(Ax, Ay, Ex, Ey);
  const arcSx = Ax + ARC_R * abU.x, arcSy = Ay + ARC_R * abU.y;
  const arcEx = Ax + ARC_R * aeU.x, arcEy = Ay + ARC_R * aeU.y;
  // arc sweeps clockwise (SVG sweep=1) from AB toward AE
  const arc = `M${arcSx.toFixed(1)},${arcSy.toFixed(1)} A${ARC_R},${ARC_R} 0 0 1 ${arcEx.toFixed(1)},${arcEy.toFixed(1)}`;

  // α label position (bisector of the arc, slightly larger radius)
  const angAB = Math.atan2(abU.y, abU.x);
  const angAE = Math.atan2(aeU.y, aeU.x);
  const midA = (angAB + angAE) / 2;
  const lr = 46;
  const alphaLbl = { x: Ax + lr * Math.cos(midA), y: Ay + lr * Math.sin(midA) };

  // Side label positions
  const abLbl = midLabel(Ax, Ay, Bx, By, -22);
  const acLbl = midLabel(Ax, Ay, Cx, Cy, 22);

  // eRatio for display
  const eRatio = (Ex - Bx) / BASE;

  // Angle ∠CAE for CF formula
  const angleCAE = (FULL_BAC - alphaRad) * 180 / Math.PI;

  return {
    A: { x: Ax, y: Ay }, E: { x: Ex, y: Ey },
    D: { x: Dx, y: Dy }, F: { x: Fx, y: Fy },
    ext: { x: extX, y: extY },
    BD, CF, BE, CE, eRatio, angleCAE,
    dSq, fSq, arc, alphaLbl, abLbl, acLbl,
    eLblDy, fLblDx, fLblDy,
  };
}

// ── Exported helpers for the lab ─────────────────────────────────────────────

/** Convert eRatio (0–1) to ∠BAE in degrees */
export function eRatioToAlpha(eRatio: number): number {
  const Ex = Bx + eRatio * BASE;
  const thetaAE = Math.atan2(By - Ay_CONST, Ex - Ax_CONST);
  const alphaRad = AB_ANG - thetaAE;
  return Math.max(5, Math.min(80, alphaRad * 180 / Math.PI));
}

/** Full ∠BAC in degrees (for display) */
export const FULL_BAC_DEG = FULL_BAC * 180 / Math.PI;

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  alpha?: number; // ∠BAE in degrees (5–80, default 40)
}

export default function TrigAdvancedDiagram({ alpha = 40 }: Props) {
  const g = useMemo(() => computeGeometry(alpha), [alpha]);
  const f = (n: number) => n.toFixed(1);

  return (
    <div className="w-full max-w-2xl mx-auto" dir="ltr">
      <svg
        viewBox="0 0 620 530"
        className="w-full h-auto"
        role="img"
        aria-label="Triangle ABC with transversal AE, heights BD⊥AE and CF⊥AE, angle α=∠BAE at vertex A"
      >
        {/* ── Triangle fill ── */}
        <polygon
          points={`${f(g.A.x)},${f(g.A.y)} ${Bx},${By} ${Cx},${Cy}`}
          fill="rgba(241,229,210,0.3)" stroke="none"
        />

        {/* ── Dashed transversal AE (extended past E to F) ── */}
        <line x1={f(g.A.x)} y1={f(g.A.y)} x2={f(g.ext.x)} y2={f(g.ext.y)}
          stroke="#4a6fa5" strokeWidth={1.8} strokeDasharray="10,6" />

        {/* ── Triangle sides ── */}
        <line x1={f(g.A.x)} y1={f(g.A.y)} x2={Bx} y2={By} stroke="#1a1a2e" strokeWidth={2.5} />
        <line x1={f(g.A.x)} y1={f(g.A.y)} x2={Cx} y2={Cy} stroke="#1a1a2e" strokeWidth={2.5} />
        <line x1={Bx} y1={By} x2={Cx} y2={Cy} stroke="#1a1a2e" strokeWidth={2.5} />

        {/* ── Heights BD and CF ── */}
        <line x1={Bx} y1={By} x2={f(g.D.x)} y2={f(g.D.y)} stroke="#1a1a2e" strokeWidth={2} />
        <line x1={Cx} y1={Cy} x2={f(g.F.x)} y2={f(g.F.y)} stroke="#1a1a2e" strokeWidth={2} />

        {/* ── Right-angle marks ── */}
        <path d={g.dSq} fill="none" stroke="#1a1a2e" strokeWidth={1.6} />
        <path d={g.fSq} fill="none" stroke="#1a1a2e" strokeWidth={1.6} />

        {/* ── α arc at A (between AB and AE) ── */}
        <path d={g.arc} fill="none" stroke="#dc2626" strokeWidth={2} />
        <text x={f(g.alphaLbl.x)} y={f(g.alphaLbl.y)}
          fontSize={18} fontWeight={700} fill="#dc2626"
          textAnchor="middle" dominantBaseline="central" fontStyle="italic">
          α
        </text>

        {/* ── Vertex dots ── */}
        {[g.A, { x: Bx, y: By }, { x: Cx, y: Cy }, g.E].map((p, i) => (
          <circle key={`v${i}`} cx={f(p.x)} cy={f(p.y)} r={4.5} fill="#1a1a2e" />
        ))}
        {[g.D, g.F].map((p, i) => (
          <circle key={`h${i}`} cx={f(p.x)} cy={f(p.y)} r={3.5} fill="#1a3a6e" />
        ))}

        {/* ── Vertex labels ── */}
        <text x={f(g.A.x)} y={f(g.A.y - 18)} fontSize={22} fontWeight={800} fill="#0a0a23" textAnchor="middle">A</text>
        <text x={Bx - 20} y={By + 6} fontSize={22} fontWeight={800} fill="#0a0a23" textAnchor="middle">B</text>
        <text x={Cx + 22} y={Cy + 6} fontSize={22} fontWeight={800} fill="#0a0a23" textAnchor="middle">C</text>
        <text x={f(g.E.x)} y={f(g.E.y + g.eLblDy)} fontSize={18} fontWeight={700} fill="#1a3a6e" textAnchor="middle">E</text>
        <text x={f(g.D.x + 16)} y={f(g.D.y - 12)} fontSize={18} fontWeight={700} fill="#1a3a6e" textAnchor="start">D</text>
        <text x={f(g.F.x + g.fLblDx)} y={f(g.F.y + g.fLblDy)} fontSize={18} fontWeight={700} fill="#1a3a6e" textAnchor="start">F</text>

        {/* ── Side labels (always k and 1.6k) ── */}
        <text x={f(g.abLbl.x)} y={f(g.abLbl.y)} fontSize={19} fontWeight={700} fill="#0a0a23"
          textAnchor="middle" dominantBaseline="central" fontStyle="italic">k</text>
        <text x={f(g.acLbl.x)} y={f(g.acLbl.y)} fontSize={19} fontWeight={700} fill="#0a0a23"
          textAnchor="middle" dominantBaseline="central" fontStyle="italic">1.6k</text>
      </svg>
    </div>
  );
}
