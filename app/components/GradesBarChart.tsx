"use client";

const GRADES = [60, 65, 70, 72, 75, 80, 82, 85, 90, 50];
const Y_TICKS = [0, 20, 40, 60, 80, 100];

const BAR_COLOR = "#60a5fa"; // soft blue (Tailwind blue-400)

// Layout constants (SVG coordinate space)
const MARGIN = { top: 28, right: 16, bottom: 48, left: 42 };
const WIDTH = 600;
const HEIGHT = 340;
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const BAR_GAP = 0.3; // fraction of slot width used as gap

export default function GradesBarChart() {
  const slotW = PLOT_W / GRADES.length;
  const barW = slotW * (1 - BAR_GAP);

  return (
    <div className="w-full max-w-2xl mx-auto" dir="ltr">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Bar chart of 10 student grades"
      >
        {/* ── Grid lines ── */}
        {Y_TICKS.map((tick) => {
          const y = MARGIN.top + PLOT_H - (tick / 100) * PLOT_H;
          return (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                stroke="#334155"
                strokeWidth={0.7}
                strokeDasharray={tick === 0 ? undefined : "4,3"}
              />
              <text
                x={MARGIN.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize={11}
                fontFamily="sans-serif"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* ── Bars + labels ── */}
        {GRADES.map((grade, i) => {
          const isX = i === 9;
          const x = MARGIN.left + i * slotW + (slotW - barW) / 2;
          const barH = isX ? PLOT_H * 0.5 : (grade / 100) * PLOT_H;
          const y = MARGIN.top + PLOT_H - barH;

          return (
            <g key={i}>
              {/* Bar */}
              {isX ? (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill="rgba(148,163,184,0.08)"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6,4"
                />
              ) : (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={BAR_COLOR}
                  opacity={0.9}
                />
              )}

              {/* Grade value — centered inside for x, above for others */}
              <text
                x={x + barW / 2}
                y={isX ? y + barH / 2 + 6 : y - 6}
                textAnchor="middle"
                fill="#111827"
                fontSize={isX ? 16 : 13}
                fontWeight={800}
                fontFamily="sans-serif"
              >
                {isX ? "x" : grade}
              </text>

              {/* X-axis label */}
              <text
                x={x + barW / 2}
                y={MARGIN.top + PLOT_H + 20}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={10}
                fontFamily="sans-serif"
              >
                {`תלמיד ${i + 1}`}
              </text>
            </g>
          );
        })}

        {/* ── Axis lines ── */}
        {/* Y axis */}
        <line
          x1={MARGIN.left}
          x2={MARGIN.left}
          y1={MARGIN.top}
          y2={MARGIN.top + PLOT_H}
          stroke="#475569"
          strokeWidth={1}
        />
        {/* X axis */}
        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={MARGIN.top + PLOT_H}
          y2={MARGIN.top + PLOT_H}
          stroke="#475569"
          strokeWidth={1}
        />

        {/* ── Axis titles ── */}
        <text
          x={WIDTH / 2}
          y={HEIGHT - 4}
          textAnchor="middle"
          fill="#cbd5e1"
          fontSize={13}
          fontWeight={600}
          fontFamily="sans-serif"
        >
          תלמידים
        </text>
        <text
          x={12}
          y={MARGIN.top + PLOT_H / 2}
          textAnchor="middle"
          fill="#cbd5e1"
          fontSize={13}
          fontWeight={600}
          fontFamily="sans-serif"
          transform={`rotate(-90, 12, ${MARGIN.top + PLOT_H / 2})`}
        >
          ציון
        </text>
      </svg>
    </div>
  );
}
