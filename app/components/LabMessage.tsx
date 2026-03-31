"use client";

/**
 * Shared lab message component — displays below slider, above stat cards.
 * Supports different types: success (green), warning (amber), info (blue), special (purple).
 */
export type LabMessageType = "success" | "warning" | "info" | "special";

const STYLES: Record<LabMessageType, { bg: string; border: string; text: string }> = {
  success: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.4)", text: "#059669" },
  warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.4)", text: "#d97706" },
  info:    { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.4)", text: "#2563eb" },
  special: { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.4)", text: "#7c3aed" },
};

export default function LabMessage({
  text,
  type = "success",
  visible,
}: {
  text: string;
  type?: LabMessageType;
  visible: boolean;
}) {
  if (!visible) return null;
  const s = STYLES[type];
  return (
    <div
      style={{
        borderRadius: 12,
        border: `2px solid ${s.border}`,
        background: s.bg,
        padding: "10px 16px",
        textAlign: "center",
        marginBottom: 14,
        animation: "fadeSlideIn 0.3s ease-out",
      }}
    >
      <p style={{ color: s.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{text}</p>
    </div>
  );
}
