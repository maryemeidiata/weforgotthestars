export const PALETTE = {
  bg: "#05040f",
  surface: "#0d0b1e",
  purpleFaint: "#1a1535",
  purpleMid: "#4a3f8f",
  purpleBright: "#7c6fd4",
  purpleGlow: "#a89be8",
  lavender: "#c9c2f0",
  amberGlow: "#f5a623",
  white: "#f0eeff",
  textBody: "#b8b0d8",
  textMuted: "#6b6490",
} as const;

// Light pollution color scale (dark sky = good = deep black, bright = bad = white/amber)
export const LIGHT_POLLUTION_SCALE = [
  { value: 0, color: "#05040f" },   // Natural dark sky
  { value: 1, color: "#0d0b1e" },   // Nearly natural
  { value: 2, color: "#1a1535" },   // Extremely dark
  { value: 3, color: "#2d1f5e" },   // Very dark
  { value: 4, color: "#4a3f8f" },   // Rural/suburban transition
  { value: 5, color: "#7c6fd4" },   // Rural/suburban
  { value: 6, color: "#c17f3a" },   // Suburban
  { value: 7, color: "#e89a2a" },   // Suburban/urban transition
  { value: 8, color: "#f5b850" },   // Urban
  { value: 9, color: "#fce0a0" },   // Inner city
];

export function interpolateColor(value: number): string {
  const clamped = Math.max(0, Math.min(9, value));
  const lower = Math.floor(clamped);
  const upper = Math.min(9, lower + 1);
  const t = clamped - lower;

  const c1 = hexToRgb(LIGHT_POLLUTION_SCALE[lower].color);
  const c2 = hexToRgb(LIGHT_POLLUTION_SCALE[upper].color);

  if (!c1 || !c2) return LIGHT_POLLUTION_SCALE[lower].color;

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function bortleToColor(bortle: number): string {
  return interpolateColor(bortle);
}

export function bortleToLabel(bortle: number): string {
  const labels: Record<number, string> = {
    1: "Natural dark sky",
    2: "Truly dark sky",
    3: "Rural sky",
    4: "Rural/suburban transition",
    5: "Suburban sky",
    6: "Bright suburban sky",
    7: "Suburban/urban transition",
    8: "City sky",
    9: "Inner city sky",
  };
  return labels[Math.round(bortle)] ?? "Unknown";
}
