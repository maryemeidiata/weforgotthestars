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

  // Milky Way — patchy nebula cloud with variation along the band, not just across it
  if (bortleLevel < 6) {
    const fade = Math.max(0, (6 - bortleLevel) / 5);
    const bandAngle = Math.PI / 5;
    const bandCenterX = width * 0.48 + parallaxX * 0.4;
    const bandCenterY = height * 0.42 + parallaxY * 0.4;
    const bandLength = Math.sqrt(width * width + height * height);

    // --- Step 1: wide faint halo across full band (uniform base) ---
    ctx.save();
    ctx.translate(bandCenterX, bandCenterY);
    ctx.rotate(bandAngle);

    const halo = ctx.createLinearGradient(0, -bandLength * 0.32, 0, bandLength * 0.32);
    halo.addColorStop(0,   `rgba(0,0,0,0)`);
    halo.addColorStop(0.4, `rgba(70, 45, 140, ${0.07 * fade})`);
    halo.addColorStop(0.5, `rgba(100, 65, 180, ${0.12 * fade})`);
    halo.addColorStop(0.6, `rgba(70, 45, 140, ${0.07 * fade})`);
    halo.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.32, bandLength * 5, bandLength * 0.64);
    ctx.restore();

    // --- Step 2: patchy nebula blobs scattered ALONG the band ---
    // Each blob is a radial gradient placed at a different (x, y) in screen space
    // staggered along the diagonal. This is what makes it look like a real Milky Way.
    const patches: Array<{ ox: number; oy: number; r: number; r0: number; g0: number; b0: number; a: number }> = [
      // galactic centre region — warm yellow-white, biggest blob
      { ox:  0.15, oy:  0.08, r: 0.22, r0: 255, g0: 240, b0: 200, a: 0.30 },
      // bright arm patch upper-left
      { ox: -0.28, oy: -0.16, r: 0.14, r0: 200, g0: 170, b0: 255, a: 0.22 },
      // cool blue-white cloud further upper-left
      { ox: -0.50, oy: -0.30, r: 0.10, r0: 160, g0: 140, b0: 255, a: 0.18 },
      // faint wisp far upper-left
      { ox: -0.72, oy: -0.44, r: 0.08, r0: 130, g0: 110, b0: 220, a: 0.12 },
      // secondary patch lower-right of centre
      { ox:  0.38, oy:  0.22, r: 0.13, r0: 220, g0: 190, b0: 255, a: 0.20 },
      // faint cloud far lower-right
      { ox:  0.60, oy:  0.36, r: 0.09, r0: 170, g0: 140, b0: 230, a: 0.13 },
      // small bright knot near centre
      { ox:  0.05, oy: -0.04, r: 0.06, r0: 255, g0: 250, b0: 230, a: 0.25 },
      // off-axis wisp — makes it asymmetric
      { ox: -0.18, oy:  0.06, r: 0.09, r0: 140, g0: 110, b0: 210, a: 0.14 },
    ];

    patches.forEach(({ ox, oy, r, r0, g0, b0, a }) => {
      const px = bandCenterX + ox * width;
      const py = bandCenterY + oy * height;
      const radius = r * bandLength;
      ctx.save();
      const blob = ctx.createRadialGradient(px, py, 0, px, py, radius);
      blob.addColorStop(0,   `rgba(${r0},${g0},${b0},${a * fade})`);
      blob.addColorStop(0.4, `rgba(${r0},${g0},${b0},${a * 0.5 * fade})`);
      blob.addColorStop(1,   `rgba(0,0,0,0)`);
      ctx.fillStyle = blob;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // --- Step 3: thin bright core lane along the band centre ---
    ctx.save();
    ctx.translate(bandCenterX, bandCenterY);
    ctx.rotate(bandAngle);

    const core = ctx.createLinearGradient(0, -bandLength * 0.048, 0, bandLength * 0.048);
    core.addColorStop(0,   `rgba(0,0,0,0)`);
    core.addColorStop(0.3, `rgba(210, 185, 255, ${0.14 * fade})`);
    core.addColorStop(0.5, `rgba(240, 220, 255, ${0.30 * fade})`);
    core.addColorStop(0.7, `rgba(210, 185, 255, ${0.14 * fade})`);
    core.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = core;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.048, bandLength * 5, bandLength * 0.096);

    // --- Step 4: dark dust rift cutting through the core ---
    const dust = ctx.createLinearGradient(0, -bandLength * 0.014, 0, bandLength * 0.014);
    dust.addColorStop(0,   `rgba(0,0,0,0)`);
    dust.addColorStop(0.5, `rgba(2, 1, 8, ${0.20 * fade})`);
    dust.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = dust;
    ctx.fillRect(-bandLength * 2.5, -bandLength * 0.014, bandLength * 5, bandLength * 0.028);

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
