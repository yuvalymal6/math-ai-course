"use client";

import { useMemo } from "react";

/**
 * AnalyticParallelogramDiagram — Parallelogram ABCD on a coordinate grid.
 *
 * Center at O(0,0). A and C are symmetric through O.
 * Diagonal BD lies on y = −2x.
 * BC is horizontal (parallel to x-axis).
 *
 * Props:
 *   ax — x-coordinate of A (default −4). C = (−ax, −ay).
 */

interface Props {
  ax?: number;
}

export default function AnalyticParallelogramDiagram({ ax = -4 }: Props) {
  const g = useMemo(() => {
    // A is given; slope of AC passes through O → ay = ax/2 (since slope AC = 0.5)
    // Actually: for the diagonals to be perpendicular (rhombus) with BD on y=-2x and AC having slope 0.5,
    // we set A = (ax, ax/2). Then C = (-ax, -ax/2).
    const ay = ax / 2;
    const A = { x: ax, y: ay };
    const C = { x: -ax, y: -ay };

    // BC is horizontal → B.y = C.y = -ay
    // B is on y = -2x → -ay = -2 * Bx → Bx = ay/2 = ax/4
    const B = { x: ax / 4, y: -ay };

    // D is symmetric to B through O
    const D = { x: -B.x, y: -B.y };

    // Diagonal lengths
    const AC = Math.sqrt((C.x - A.x) ** 2 + (C.y - A.y) ** 2);
    const BD = Math.sqrt((D.x - B.x) ** 2 + (D.y - B.y) ** 2);

    // Slopes
    const slopeAC = (C.y - A.y) / (C.x - A.x); // 0.5
    const slopeBD = (D.y - B.y) / (D.x - B.x); // -2
    const slopeProduct = slopeAC * slopeBD;       // -1

    // Area = 0.5 * AC * BD
    const area = 0.5 * AC * BD;

    return { A, B, C, D, AC, BD, slopeAC, slopeBD, slopeProduct, area };
  }, [ax]);

  // SVG coordinate mapping
  const { A, B, C, D } = g;
  const allPts = [A, B, C, D];
  const xs = allPts.map(p => p.x), ys = allPts.map(p => p.y);
  const minX = Math.min(...xs) - 2, maxX = Math.max(...xs) + 2;
  const minY = Math.min(...ys) - 2, maxY = Math.max(...ys) + 2;
  const rangeX = maxX - minX, rangeY = maxY - minY;

  const svgW = 320, svgH = 280;
  const padL = 30, padR = 20, padT = 20, padB = 20;
  const plotW = svgW - padL - padR, plotH = svgH - padT - padB;
  const sc = Math.min(plotW / rangeX, plotH / rangeY);
  const cx = padL + plotW / 2, cy = padT + plotH / 2;

  const toSvg = (px: number, py: number) => ({
    x: cx + px * sc,
    y: cy - py * sc, // flip y
  });

  const O = toSvg(0, 0);
  const sA = toSvg(A.x, A.y), sB = toSvg(B.x, B.y);
  const sC = toSvg(C.x, C.y), sD = toSvg(D.x, D.y);

  // Axis endpoints
  const axisL = toSvg(minX, 0), axisR = toSvg(maxX, 0);
  const axisB = toSvg(0, minY), axisT = toSvg(0, maxY);

  // BD line (y = -2x) extended
  const bdL = toSvg(minX, -2 * minX), bdR = toSvg(maxX, -2 * maxX);

  // BC line (horizontal at y = C.y) — highlight
  const bcL = toSvg(minX, C.y), bcR = toSvg(maxX, C.y);

  const f = (n: number) => n.toFixed(1);
  const coord = (p: { x: number; y: number }) => `(${p.x % 1 === 0 ? p.x : p.x.toFixed(1)}, ${p.y % 1 === 0 ? p.y : p.y.toFixed(1)})`;

  return (
    <div className="w-full max-w-sm mx-auto" dir="ltr">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" role="img"
        aria-label="Parallelogram ABCD on coordinate axes">

        {/* ── Grid lines (subtle) ── */}
        {Array.from({ length: Math.ceil(maxX) - Math.floor(minX) + 1 }, (_, i) => Math.floor(minX) + i).map(v => {
          if (v === 0) return null;
          const p = toSvg(v, 0);
          return <line key={`gx${v}`} x1={p.x} y1={padT} x2={p.x} y2={svgH - padB} stroke="#f1f5f9" strokeWidth={0.7} />;
        })}
        {Array.from({ length: Math.ceil(maxY) - Math.floor(minY) + 1 }, (_, i) => Math.floor(minY) + i).map(v => {
          if (v === 0) return null;
          const p = toSvg(0, v);
          return <line key={`gy${v}`} x1={padL} y1={p.y} x2={svgW - padR} y2={p.y} stroke="#f1f5f9" strokeWidth={0.7} />;
        })}

        {/* ── Axes ── */}
        <line x1={axisL.x} y1={axisL.y} x2={axisR.x} y2={axisR.y} stroke="#94a3b8" strokeWidth={1.2} />
        <line x1={axisB.x} y1={axisB.y} x2={axisT.x} y2={axisT.y} stroke="#94a3b8" strokeWidth={1.2} />
        <text x={axisR.x + 4} y={axisR.y + 4} fontSize={10} fill="#94a3b8" fontStyle="italic">x</text>
        <text x={axisT.x + 4} y={axisT.y + 4} fontSize={10} fill="#94a3b8" fontStyle="italic">y</text>

        {/* ── BD diagonal line y=-2x (extended, dashed purple) ── */}
        <line x1={bdL.x} y1={bdL.y} x2={bdR.x} y2={bdR.y}
          stroke="#a78bfa" strokeWidth={1.2} strokeDasharray="6,3" opacity={0.5} />

        {/* ── BC horizontal highlight ── */}
        <line x1={bcL.x} y1={bcL.y} x2={bcR.x} y2={bcR.y}
          stroke="#10b981" strokeWidth={1} strokeDasharray="4,3" opacity={0.3} />

        {/* ── Parallelogram fill ── */}
        <polygon
          points={`${f(sA.x)},${f(sA.y)} ${f(sB.x)},${f(sB.y)} ${f(sC.x)},${f(sC.y)} ${f(sD.x)},${f(sD.y)}`}
          fill="rgba(99,102,241,0.08)" stroke="#1a1a2e" strokeWidth={1.8} strokeLinejoin="round" />

        {/* ── Diagonal AC (blue) ── */}
        <line x1={f(sA.x)} y1={f(sA.y)} x2={f(sC.x)} y2={f(sC.y)}
          stroke="#3b82f6" strokeWidth={1.8} strokeDasharray="6,3" />

        {/* ── Diagonal BD (purple) ── */}
        <line x1={f(sB.x)} y1={f(sB.y)} x2={f(sD.x)} y2={f(sD.y)}
          stroke="#a78bfa" strokeWidth={1.8} strokeDasharray="6,3" />

        {/* ── Origin O ── */}
        <circle cx={f(O.x)} cy={f(O.y)} r={3.5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
        <text x={O.x + 6} y={O.y - 6} fontSize={10} fill="#f59e0b" fontWeight={700}>O</text>

        {/* ── Vertices ── */}
        {[
          { p: sA, c: A, label: "A", color: "#1a1a2e", dx: -8, dy: 14 },
          { p: sB, c: B, label: "B", color: "#1a1a2e", dx: 6, dy: 14 },
          { p: sC, c: C, label: "C", color: "#1a1a2e", dx: 6, dy: -6 },
          { p: sD, c: D, label: "D", color: "#1a1a2e", dx: -8, dy: -6 },
        ].map(v => (
          <g key={v.label}>
            <circle cx={f(v.p.x)} cy={f(v.p.y)} r={3.5} fill={v.color} stroke="#fff" strokeWidth={1.5} />
            <text x={v.p.x + v.dx} y={v.p.y + v.dy} fontSize={11} fontWeight={800} fill={v.color}>{v.label}</text>
            <text x={v.p.x + v.dx} y={v.p.y + v.dy + 11} fontSize={8} fontWeight={600} fill="#6B7280">{coord(v.c)}</text>
          </g>
        ))}

        {/* ── Line label: y = -2x ── */}
        <text x={bdR.x - 40} y={bdR.y + 14} fontSize={9} fill="#a78bfa" fontWeight={600} fontStyle="italic">y = −2x</text>
      </svg>
    </div>
  );
}
