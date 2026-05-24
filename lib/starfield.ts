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
      // Milky Way stars: warm white to golden, not purple
      color: `rgba(${210 + Math.floor(Math.random() * 45)}, ${195 + Math.floor(Math.random() * 40)}, ${165 + Math.floor(Math.random() * 35)}, 1)`,
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

  // Milky Way — warm amber/brown core, grey-white arms, dark dust rifts. No purple.
  if (bortleLevel < 6) {
    const fade = Math.max(0, (6 - bortleLevel) / 5);
    const bandAngle = Math.PI / 5;
    const bandCenterX = width * 0.48 + parallaxX * 0.4;
    const bandCenterY = height * 0.42 + parallaxY * 0.4;
    const bandLength = Math.sqrt(width * width + height * height);

    // --- Step 1: outermost wide halo — cool grey-white star haze ---
    ctx.save();
    ctx.translate(bandCenterX, bandCenterY);
    ctx.rotate(bandAngle);

    const halo = ctx.createLinearGradient(0, -bandLength * 0.42, 0, bandLength * 0.42);
    halo.addColorStop(0,   `rgba(0,0,0,0)`);
    halo.addColorStop(0.38,`rgba(155, 160, 175, ${0.06 * fade})`);
    halo.addColorStop(0.5, `rgba(170, 172, 185, ${0.13 * fade})`);
    halo.addColorStop(0.62,`rgba(155, 160, 175, ${0.06 * fade})`);
    halo.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.42, bandLength * 5, bandLength * 0.84);

    // --- Step 2: main band — warm grey/dusty-white ---
    const band = ctx.createLinearGradient(0, -bandLength * 0.22, 0, bandLength * 0.22);
    band.addColorStop(0,   `rgba(0,0,0,0)`);
    band.addColorStop(0.25,`rgba(160, 150, 130, ${0.09 * fade})`);
    band.addColorStop(0.45,`rgba(190, 178, 155, ${0.20 * fade})`);
    band.addColorStop(0.5, `rgba(200, 188, 162, ${0.26 * fade})`);
    band.addColorStop(0.55,`rgba(190, 178, 155, ${0.20 * fade})`);
    band.addColorStop(0.75,`rgba(160, 150, 130, ${0.09 * fade})`);
    band.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = band;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.22, bandLength * 5, bandLength * 0.44);

    ctx.restore();

    // --- Step 3: patchy blobs along the band — warm ambers, dusty browns, grey-whites ---
    // Placed in screen space at staggered positions along the diagonal
    const patches: Array<{ ox: number; oy: number; r: number; r0: number; g0: number; b0: number; a: number }> = [
      // Galactic core — bright warm amber-white, largest blob
      { ox:  0.14, oy:  0.08, r: 0.20, r0: 255, g0: 220, b0: 150, a: 0.38 },
      // Inner core hot spot
      { ox:  0.10, oy:  0.05, r: 0.09, r0: 255, g0: 240, b0: 190, a: 0.45 },
      // Warm brown arm patch upper-left of core
      { ox: -0.10, oy: -0.05, r: 0.13, r0: 200, g0: 165, b0: 110, a: 0.28 },
      // Grey-white stellar cloud further upper-left
      { ox: -0.30, oy: -0.18, r: 0.12, r0: 185, g0: 182, b0: 175, a: 0.22 },
      // Faint grey wisp further out
      { ox: -0.52, oy: -0.32, r: 0.09, r0: 160, g0: 158, b0: 155, a: 0.15 },
      // Dusty cloud far upper-left
      { ox: -0.70, oy: -0.43, r: 0.07, r0: 145, g0: 140, b0: 130, a: 0.10 },
      // Secondary warm patch lower-right
      { ox:  0.36, oy:  0.22, r: 0.11, r0: 210, g0: 180, b0: 130, a: 0.22 },
      // Grey-white cloud lower-right
      { ox:  0.55, oy:  0.34, r: 0.09, r0: 175, g0: 172, b0: 168, a: 0.15 },
      // Faint wisp far lower-right
      { ox:  0.72, oy:  0.44, r: 0.07, r0: 150, g0: 148, b0: 144, a: 0.09 },
    ];

    patches.forEach(({ ox, oy, r, r0, g0, b0, a }) => {
      const px = bandCenterX + ox * width;
      const py = bandCenterY + oy * height;
      const radius = r * bandLength;
      ctx.save();
      const blob = ctx.createRadialGradient(px, py, 0, px, py, radius);
      blob.addColorStop(0,   `rgba(${r0},${g0},${b0},${a * fade})`);
      blob.addColorStop(0.35,`rgba(${r0},${g0},${b0},${a * 0.55 * fade})`);
      blob.addColorStop(0.7, `rgba(${r0},${g0},${b0},${a * 0.15 * fade})`);
      blob.addColorStop(1,   `rgba(0,0,0,0)`);
      ctx.fillStyle = blob;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // --- Step 4: warm inner spine through the core region ---
    ctx.save();
    ctx.translate(bandCenterX, bandCenterY);
    ctx.rotate(bandAngle);

    const spine = ctx.createLinearGradient(0, -bandLength * 0.052, 0, bandLength * 0.052);
    spine.addColorStop(0,   `rgba(0,0,0,0)`);
    spine.addColorStop(0.3, `rgba(220, 195, 145, ${0.16 * fade})`);
    spine.addColorStop(0.5, `rgba(240, 215, 165, ${0.32 * fade})`);
    spine.addColorStop(0.7, `rgba(220, 195, 145, ${0.16 * fade})`);
    spine.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = spine;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.052, bandLength * 5, bandLength * 0.104);

    // --- Step 5: dark dust rifts — wide irregular brown-black lanes ---
    // Primary rift (offset slightly from centre, like in the photo)
    const rift1 = ctx.createLinearGradient(0, -bandLength * 0.028, 0, bandLength * 0.008);
    rift1.addColorStop(0,   `rgba(0,0,0,0)`);
    rift1.addColorStop(0.4, `rgba(8, 4, 2, ${0.28 * fade})`);
    rift1.addColorStop(0.6, `rgba(12, 6, 2, ${0.35 * fade})`);
    rift1.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = rift1;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.028, bandLength * 5, bandLength * 0.036);

    // Secondary narrower rift
    const rift2 = ctx.createLinearGradient(0, bandLength * 0.012, 0, bandLength * 0.028);
    rift2.addColorStop(0,   `rgba(0,0,0,0)`);
    rift2.addColorStop(0.5, `rgba(10, 5, 2, ${0.18 * fade})`);
    rift2.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = rift2;
    ctx.fillRect(-bandLength * 2.5, bandLength * 0.012, bandLength * 5, bandLength * 0.016);

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
