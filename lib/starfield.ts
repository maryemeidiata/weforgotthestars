export interface Star {
  x: number;
  y: number;
  z: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  isMilkyWay: boolean;
  color: string;
}

export interface StarFieldConfig {
  count: number;
  milkyWayCount: number;
  bortleLevel: number;
  skyglowIntensity: number;
  width: number;
  height: number;
}

const STAR_COLORS = [
  "#f0eeff",
  "#e8e0ff",
  "#d0c8ff",
  "#fff8e0",
  "#ffe8c0",
  "#ffd0a0",
  "#c8e0ff",
];

function randomColor(): string {
  return STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
}

export function generateStars(config: StarFieldConfig): Star[] {
  const stars: Star[] = [];
  const { count, milkyWayCount, width, height } = config;

  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random(),
      radius: Math.random() * 1.5 + 0.2,
      opacity: Math.random() * 0.6 + 0.4,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
      isMilkyWay: false,
      color: randomColor(),
    });
  }

  // Milky Way band: diagonal, denser cluster of fainter stars
  const bandAngle = Math.PI / 5;
  const bandWidth = height * 0.35;
  const bandCenterX = width * 0.5;
  const bandCenterY = height * 0.45;

  for (let i = 0; i < milkyWayCount; i++) {
    const along = (Math.random() - 0.5) * Math.sqrt(width * width + height * height);
    const across = (Math.random() - 0.5) * bandWidth * (0.4 + Math.random() * 0.6);
    const x = bandCenterX + along * Math.cos(bandAngle) - across * Math.sin(bandAngle);
    const y = bandCenterY + along * Math.sin(bandAngle) + across * Math.cos(bandAngle);

    stars.push({
      x,
      y,
      z: Math.random(),
      radius: Math.random() * 0.8 + 0.1,
      opacity: Math.random() * 0.35 + 0.05,
      twinkleSpeed: Math.random() * 0.01 + 0.002,
      twinkleOffset: Math.random() * Math.PI * 2,
      isMilkyWay: true,
      color: `rgba(${180 + Math.floor(Math.random() * 60)}, ${160 + Math.floor(Math.random() * 60)}, ${220 + Math.floor(Math.random() * 35)}, 1)`,
    });
  }

  return stars;
}

export function drawStarField(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  bortleLevel: number,
  skyglowIntensity: number,
  time: number,
  width: number,
  height: number,
  parallaxX: number = 0,
  parallaxY: number = 0
): void {
  // Sky gradient — washes out as bortle + skyglow increase
  // At high skyglow the sky becomes a bright, bleached orange-gray: stars drown in it
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  const glowA = Math.max(0, skyglowIntensity);

  // Top of sky stays dark; gets a faint brown tinge at high pollution
  const topR = Math.round(5 + glowA * 40);
  const topG = Math.round(4 + glowA * 18);
  const topB = Math.round(15 + glowA * 8);
  gradient.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);

  // Mid sky washes out considerably — dull grey-amber
  const midR = Math.round(8 + glowA * 100);
  const midG = Math.round(6 + glowA * 45);
  const midB = Math.round(20 + glowA * 15);
  gradient.addColorStop(0.5, `rgb(${midR}, ${midG}, ${midB})`);

  // Lower sky: bright bleached orange-white — sky-obscuring, not dramatic
  const lowR = Math.round(12 + glowA * 200);
  const lowG = Math.round(8 + glowA * 100);
  const lowB = Math.round(22 + glowA * 30);
  gradient.addColorStop(0.8, `rgb(${lowR}, ${lowG}, ${lowB})`);

  // Horizon: at high skyglow, almost white-orange (like standing under a lit sky)
  const botR = Math.round(20 + glowA * 220);
  const botG = Math.round(12 + glowA * 130);
  const botB = Math.round(25 + glowA * 50);
  gradient.addColorStop(1, `rgb(${botR}, ${botG}, ${botB})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Milky Way — layered nebula cloud, not a clean line
  if (bortleLevel < 6) {
    const fade = Math.max(0, (6 - bortleLevel) / 5);
    const bandAngle = Math.PI / 5;
    const bandCenterX = width * 0.48 + parallaxX * 0.4;
    const bandCenterY = height * 0.42 + parallaxY * 0.4;
    const bandLength = Math.sqrt(width * width + height * height);

    ctx.save();
    ctx.translate(bandCenterX, bandCenterY);
    ctx.rotate(bandAngle);

    // 1. Very wide, faint halo — the outermost diffuse cloud
    const halo = ctx.createLinearGradient(0, -bandLength * 0.38, 0, bandLength * 0.38);
    halo.addColorStop(0,    `rgba(0,0,0,0)`);
    halo.addColorStop(0.35, `rgba(80, 50, 160, ${0.05 * fade})`);
    halo.addColorStop(0.5,  `rgba(110, 75, 200, ${0.10 * fade})`);
    halo.addColorStop(0.65, `rgba(80, 50, 160, ${0.05 * fade})`);
    halo.addColorStop(1,    `rgba(0,0,0,0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.38, bandLength * 5, bandLength * 0.76);

    // 2. Mid band — the main visible nebulosity, with a slight warm/cool shift
    const midBand = ctx.createLinearGradient(0, -bandLength * 0.18, 0, bandLength * 0.18);
    midBand.addColorStop(0,    `rgba(0,0,0,0)`);
    midBand.addColorStop(0.2,  `rgba(100, 70, 190, ${0.08 * fade})`);
    midBand.addColorStop(0.42, `rgba(160, 120, 255, ${0.20 * fade})`);
    midBand.addColorStop(0.5,  `rgba(190, 150, 255, ${0.28 * fade})`);
    midBand.addColorStop(0.58, `rgba(160, 120, 255, ${0.20 * fade})`);
    midBand.addColorStop(0.8,  `rgba(100, 70, 190, ${0.08 * fade})`);
    midBand.addColorStop(1,    `rgba(0,0,0,0)`);
    ctx.fillStyle = midBand;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.18, bandLength * 5, bandLength * 0.36);

    // 3. Galactic centre blob — warm yellow-white bulge off to one side
    ctx.restore();
    ctx.save();
    // Shift the centre blob toward the lower-right (galactic core direction)
    ctx.translate(bandCenterX + width * 0.12, bandCenterY + height * 0.08);
    const coreBlob = ctx.createRadialGradient(0, 0, 0, 0, 0, bandLength * 0.18);
    coreBlob.addColorStop(0,   `rgba(255, 230, 180, ${0.22 * fade})`);
    coreBlob.addColorStop(0.3, `rgba(220, 180, 255, ${0.14 * fade})`);
    coreBlob.addColorStop(0.6, `rgba(140, 100, 220, ${0.06 * fade})`);
    coreBlob.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = coreBlob;
    ctx.beginPath();
    ctx.arc(0, 0, bandLength * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(bandCenterX, bandCenterY);
    ctx.rotate(bandAngle);

    // 4. Bright core lane — the dense stellar river running through the centre
    const core = ctx.createLinearGradient(0, -bandLength * 0.055, 0, bandLength * 0.055);
    core.addColorStop(0,   `rgba(0,0,0,0)`);
    core.addColorStop(0.3, `rgba(200, 170, 255, ${0.16 * fade})`);
    core.addColorStop(0.5, `rgba(235, 215, 255, ${0.35 * fade})`);
    core.addColorStop(0.7, `rgba(200, 170, 255, ${0.16 * fade})`);
    core.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = core;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.055, bandLength * 5, bandLength * 0.11);

    // 5. Off-centre secondary arm — makes it look patchy, not symmetric
    const arm = ctx.createLinearGradient(0, -bandLength * 0.12, 0, bandLength * 0.04);
    arm.addColorStop(0,   `rgba(0,0,0,0)`);
    arm.addColorStop(0.4, `rgba(130, 100, 220, ${0.10 * fade})`);
    arm.addColorStop(0.7, `rgba(160, 130, 240, ${0.16 * fade})`);
    arm.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = arm;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.12, bandLength * 5, bandLength * 0.16);

    // 6. Dust lane — dark rift through the brightest part
    const dust = ctx.createLinearGradient(0, -bandLength * 0.015, 0, bandLength * 0.015);
    dust.addColorStop(0,   `rgba(0,0,0,0)`);
    dust.addColorStop(0.5, `rgba(3, 2, 10, ${0.18 * fade})`);
    dust.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = dust;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.015, bandLength * 5, bandLength * 0.03);

    ctx.restore();
  }

  // Draw stars
  const visibilityFactor = Math.max(0, 1 - (bortleLevel - 1) / 8);
  const fainterThreshold = (bortleLevel - 1) / 8;
  // Skyglow drowns stars — higher skyglow = fewer visible stars across whole sky
  const skyglowSuppress = Math.max(0, 1 - skyglowIntensity * 1.1);

  for (const star of stars) {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const twinkleFactor = 0.85 + twinkle * 0.15;

    // Stars lower in the sky (higher y) are suppressed more by skyglow
    const yFraction = star.y / height;
    const verticalSuppression = Math.max(0, 1 - skyglowIntensity * yFraction * 1.8);

    let starOpacity = star.opacity * twinkleFactor * skyglowSuppress * verticalSuppression;
    if (star.isMilkyWay) {
      starOpacity *= Math.max(0, 1 - (bortleLevel - 1) / 4);
    } else {
      if (star.opacity < fainterThreshold) {
        starOpacity *= visibilityFactor;
      }
    }

    if (starOpacity <= 0.01) continue;

    const sx = star.x + parallaxX * star.z * 0.5;
    const sy = star.y + parallaxY * star.z * 0.5;

    if (sx < -2 || sx > width + 2 || sy < -2 || sy > height + 2) continue;

    ctx.save();
    ctx.globalAlpha = starOpacity;

    // Subtle glow for brighter stars
    if (!star.isMilkyWay && star.radius > 1.0 && bortleLevel < 7) {
      const glowSize = star.radius * 4;
      const glowGradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowSize);
      glowGradient.addColorStop(0, star.color);
      glowGradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = starOpacity * 0.3;
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(sx, sy, glowSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = starOpacity;
    }

    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Skyglow layer — a bright, milky orange-grey wash that bleaches out the sky.
  // This is what real skyglow looks like: not a pretty amber glow but a light-polluted
  // smear that destroys contrast and makes stars invisible.
  if (skyglowIntensity > 0) {
    // Wide, diffuse glow covering lower 2/3 of sky
    const haze = ctx.createLinearGradient(0, height * 0.0, 0, height);
    haze.addColorStop(0,   `rgba(200, 110, 40, 0)`);
    haze.addColorStop(0.3, `rgba(210, 120, 45, ${skyglowIntensity * 0.12})`);
    haze.addColorStop(0.6, `rgba(220, 130, 50, ${skyglowIntensity * 0.35})`);
    haze.addColorStop(0.82,`rgba(230, 145, 55, ${skyglowIntensity * 0.6})`);
    haze.addColorStop(1,   `rgba(240, 160, 60, ${skyglowIntensity * 0.82})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    // Extra bright blob right at the horizon — the city glow source
    const blob = ctx.createRadialGradient(
      width * 0.5, height * 1.05, height * 0.02,
      width * 0.5, height * 1.05, height * 0.7
    );
    blob.addColorStop(0,   `rgba(255, 200, 120, ${skyglowIntensity * 0.9})`);
    blob.addColorStop(0.25,`rgba(240, 160,  60, ${skyglowIntensity * 0.5})`);
    blob.addColorStop(0.6, `rgba(200, 100,  30, ${skyglowIntensity * 0.18})`);
    blob.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, width, height);
  }
}

export function getBortleFromStep(step: number): { bortle: number; skyglow: number } {
  switch (step) {
    case 0: return { bortle: 1, skyglow: 0 };
    case 1: return { bortle: 3, skyglow: 0.15 };
    case 2: return { bortle: 5, skyglow: 0.35 };
    case 3: return { bortle: 7, skyglow: 0.6 };
    case 4: return { bortle: 9, skyglow: 0.85 };
    default: return { bortle: 1, skyglow: 0 };
  }
}
