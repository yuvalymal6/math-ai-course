"use client";

import { useMemo } from "react";

/**
 * RectangleDiagram — Rectangle ABCD with transversal D→F→E.
 *
 *   D ─────── C          top (horizontal)
 *   │         │
 *   │         │          AD = 8, AB = 6 (default)
 *   │         │          AF = 4, BF = 2
 *   A ── F ── B
 *              │
 *              E          E on extension of CB below B
 *
 * △ADF ~ △BEF (right angles at A and B)
 * AF/BF = AD/BE = 2  →  BE = 4
 *
 * Props:
 *   af — length AF (1–10, default 4)
 *   ab — length AB (default 6, so BF = AB − AF)
 */

const SQ = 6;

interface Props {
  af?: number;
  ab?: number;
}

export default function RectangleDiagram({ af = 4, ab = 6 }: Props) {
  const g = useMemo(() => {
    const ad = 8;
    const bf = Math.max(0.5, ab - af);
    const be = (ad * bf) / Math.max(af, 0.1);

    // Compact layout (≈ 60% of original)
    const padL = 28, padR = 28, padT = 22, padB = 32;
    const sc = Math.min(16, 220 / ab, 160 / (ad + be));
    const baseY = padT + ad * sc;

    const A = { x: padL, y: baseY };
    const B = { x: padL + ab * sc, y: baseY };
    const C = { x: B.x, y: padT };
    const D = { x: padL, y: padT };
    const F = { x: A.x + af * sc, y: baseY };
    const E = { x: B.x, y: baseY + be * sc };

    return { A, B, C, D, F, E, ad, af, ab, bf, be, sc,
      svgW: B.x + padR, svgH: E.y + padB };
  }, [af, ab]);

  const { A, B, C, D, F, E } = g;
  const f = (n: number) => n.toFixed(1);

  return (
    <div className="w-full max-w-xs mx-auto" dir="ltr">
      <svg
        viewBox={`0 0 ${Math.ceil(g.svgW)} ${Math.ceil(g.svgH)}`}
        className="w-full h-auto"
        role="img"
        aria-label="Rectangle ABCD with transversal D-F-E"
      >
        {/* ── Rectangle ── */}
        <rect x={D.x} y={D.y} width={B.x - A.x} height={A.y - D.y}
          fill="rgba(99,102,241,0.04)" stroke="#1a1a2e" strokeWidth={1.5} />

        {/* ── CB extension to E (dashed) ── */}
        <line x1={B.x} y1={B.y} x2={E.x} y2={E.y}
          stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4,3" />

        {/* ── △ADF fill (blue tint) ── */}
        <polygon
          points={`${f(A.x)},${f(A.y)} ${f(D.x)},${f(D.y)} ${f(F.x)},${f(F.y)}`}
          fill="rgba(99,102,241,0.10)" stroke="none" />

        {/* ── △BEF fill (amber tint) ── */}
        <polygon
          points={`${f(B.x)},${f(B.y)} ${f(E.x)},${f(E.y)} ${f(F.x)},${f(F.y)}`}
          fill="rgba(245,158,11,0.10)" stroke="none" />

        {/* ── Transversal D → F → E ── */}
        <line x1={D.x} y1={D.y} x2={E.x} y2={E.y}
          stroke="#6366f1" strokeWidth={1.8} />

        {/* ── Right-angle at A ── */}
        <polyline
          points={`${A.x},${A.y - SQ} ${A.x + SQ},${A.y - SQ} ${A.x + SQ},${A.y}`}
          fill="none" stroke="#1a1a2e" strokeWidth={1} />

        {/* ── Right-angle at B ── */}
        <polyline
          points={`${B.x - SQ},${B.y} ${B.x - SQ},${B.y + SQ} ${B.x},${B.y + SQ}`}
          fill="none" stroke="#1a1a2e" strokeWidth={1} />

        {/* ── Number: 8 on AD ── */}
        <text x={A.x - 12} y={(A.y + D.y) / 2 + 4}
          fontSize={11} fontWeight={700} fill="#0a0a23" textAnchor="middle">{g.ad}</text>

        {/* ── Number: AF value on base ── */}
        <text x={(A.x + F.x) / 2} y={A.y + 13}
          fontSize={10} fontWeight={700} fill="#0a0a23" textAnchor="middle">{g.af}</text>

        {/* ── Vertex dots ── */}
        {[A, B, C, D].map((p, i) => (
          <circle key={`r${i}`} cx={f(p.x)} cy={f(p.y)} r={2.5} fill="#1a1a2e" />
        ))}
        <circle cx={f(F.x)} cy={f(F.y)} r={3} fill="#10b981" />
        <circle cx={f(E.x)} cy={f(E.y)} r={3} fill="#f59e0b" />

        {/* ── Vertex letters ── */}
        <text x={A.x - 11} y={A.y + 4} fontSize={12} fontWeight={800} fill="#0a0a23" textAnchor="middle">A</text>
        <text x={B.x + 8} y={B.y - 5} fontSize={12} fontWeight={800} fill="#0a0a23" textAnchor="start">B</text>
        <text x={C.x + 8} y={C.y + 4} fontSize={12} fontWeight={800} fill="#0a0a23" textAnchor="start">C</text>
        <text x={D.x - 11} y={D.y + 4} fontSize={12} fontWeight={800} fill="#0a0a23" textAnchor="middle">D</text>
        <text x={F.x} y={F.y + 13} fontSize={11} fontWeight={700} fill="#10b981" textAnchor="middle">F</text>
        <text x={E.x + 8} y={E.y + 4} fontSize={11} fontWeight={700} fill="#f59e0b" textAnchor="start">E</text>
      </svg>
    </div>
  );
}
