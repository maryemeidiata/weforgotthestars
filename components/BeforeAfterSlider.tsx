"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { drawStarField, generateStars } from "@/lib/starfield";

interface BeforeAfterSliderProps {
  leftLabel?: string;
  rightLabel?: string;
  leftBortle?: number;
  rightBortle?: number;
  leftSkyglow?: number;
  rightSkyglow?: number;
}

export default function BeforeAfterSlider({
  leftLabel = "Tucson, AZ before 2017",
  rightLabel = "Tucson, AZ after LED retrofit",
  leftBortle = 8,
  rightBortle = 6,
  leftSkyglow = 0.7,
  rightSkyglow = 0.4,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sliderX, setSliderX] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const animFrameRef = useRef<number>(0);
  const starsLeftRef = useRef(generateStars({ count: 800, milkyWayCount: 400, bortleLevel: 8, skyglowIntensity: 0.7, width: 600, height: 400 }));
  const starsRightRef = useRef(generateStars({ count: 800, milkyWayCount: 400, bortleLevel: 6, skyglowIntensity: 0.4, width: 600, height: 400 }));
  const timeRef = useRef(0);

  const resize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    [leftCanvasRef, rightCanvasRef].forEach((ref) => {
      if (ref.current) {
        ref.current.width = w;
        ref.current.height = h;
      }
    });

    starsLeftRef.current = generateStars({ count: Math.floor(w * h / 1500), milkyWayCount: Math.floor(w * h / 1000), bortleLevel: leftBortle, skyglowIntensity: leftSkyglow, width: w, height: h });
    starsRightRef.current = generateStars({ count: Math.floor(w * h / 1500), milkyWayCount: Math.floor(w * h / 1000), bortleLevel: rightBortle, skyglowIntensity: rightSkyglow, width: w, height: h });
  }, [leftBortle, rightBortle, leftSkyglow, rightSkyglow]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      timeRef.current += 1;
      const leftCanvas = leftCanvasRef.current;
      const rightCanvas = rightCanvasRef.current;
      if (!leftCanvas || !rightCanvas) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      const leftCtx = leftCanvas.getContext("2d");
      const rightCtx = rightCanvas.getContext("2d");
      if (!leftCtx || !rightCtx) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      const { width, height } = leftCanvas;
      drawStarField(leftCtx, starsLeftRef.current, leftBortle, leftSkyglow, timeRef.current, width, height);
      drawStarField(rightCtx, starsRightRef.current, rightBortle, rightSkyglow, timeRef.current, width, height);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [resize, leftBortle, rightBortle, leftSkyglow, rightSkyglow]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent | React.TouchEvent) => {
      if (!isDragging && !("touches" in e)) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
      const x = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
      setSliderX(x);
    },
    [isDragging]
  );

  const sliderPercent = sliderX * 100;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none rounded-lg"
      onPointerDown={() => setIsDragging(true)}
      onPointerUp={() => setIsDragging(false)}
      onPointerLeave={() => setIsDragging(false)}
      onPointerMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      style={{ cursor: isDragging ? "col-resize" : "default", touchAction: "none" }}
    >
      {/* Left canvas (before) */}
      <canvas ref={leftCanvasRef} className="absolute inset-0 w-full h-full" />

      {/* Right canvas (after) clipped */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ left: `${sliderPercent}%` }}
      >
        <canvas
          ref={rightCanvasRef}
          className="absolute inset-0 h-full"
          style={{ right: 0, left: `-${sliderPercent * (100 / (100 - sliderPercent + 0.01))}%`, maxWidth: "none", width: `${100 / (1 - sliderX)}%` }}
        />
      </div>

      {/* Slider line + handle */}
      <div
        className="absolute top-0 bottom-0 w-px bg-white/30 z-10 flex items-center justify-center"
        style={{ left: `${sliderPercent}%` }}
      >
        <div className="glass rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 7H10M4 7L2 5M4 7L2 9M10 7L12 5M10 7L12 9" stroke="#c9c2f0" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <span className="font-outfit text-xs text-text-muted bg-black/40 rounded px-2 py-1">
          {leftLabel}
        </span>
      </div>
      <div
        className="absolute top-3 z-10 pointer-events-none"
        style={{ left: `${sliderPercent + 2}%` }}
      >
        <span className="font-outfit text-xs text-text-muted bg-black/40 rounded px-2 py-1">
          {rightLabel}
        </span>
      </div>
    </div>
  );
}
