"use client";

interface TooltipProps {
  x: number;
  y: number;
  visible: boolean;
  title: string;
  subtitle?: string;
  bortle?: number;
}

export default function Tooltip({ x, y, visible, title, subtitle, bortle }: TooltipProps) {
  if (!visible) return null;

  const bortleColor =
    bortle !== undefined
      ? bortle <= 2
        ? "#a89be8"
        : bortle <= 5
        ? "#7c6fd4"
        : bortle <= 7
        ? "#c17f3a"
        : "#f5a623"
      : undefined;

  return (
    <div
      className="glass absolute pointer-events-none z-20 rounded-lg px-3 py-2 text-left"
      style={{
        left: x + 12,
        top: y - 8,
        transform: "translateY(-50%)",
        minWidth: 140,
        maxWidth: 220,
      }}
    >
      <p className="font-outfit text-off-white text-sm font-medium leading-tight">{title}</p>
      {subtitle && (
        <p className="font-outfit text-text-muted text-xs mt-0.5">{subtitle}</p>
      )}
      {bortle !== undefined && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: bortleColor }}
          />
          <span className="font-outfit text-xs" style={{ color: bortleColor }}>
            Bortle {bortle}
          </span>
        </div>
      )}
    </div>
  );
}
