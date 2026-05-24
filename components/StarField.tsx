"use client";

import { useEffect, useRef, useCallback } from "react";
import { generateStars, drawStarField, Star } from "@/lib/starfield";

interface StarFieldProps {
  bortleLevel?: number;
  skyglowIntensity?: number;
  className?: string;
}

export default function StarField({
  bortleLevel = 1,
  skyglowIntensity = 0,
  className = "",
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const bortleRef = useRef(bortleLevel);
  const skyglowRef = useRef(skyglowIntensity);

  useEffect(() => {
    bortleRef.current = bortleLevel;
    skyglowRef.current = skyglowIntensity;
  }, [bortleLevel, skyglowIntensity]);

  const initStars = useCallback((width: number, height: number) => {
    dimensionsRef.current = { width, height };
    starsRef.current = generateStars({
      count: Math.floor((width * height) / 1200),
      milkyWayCount: Math.floor((width * height) / 800),
      bortleLevel: 1,
      skyglowIntensity: 0,
      width,
      height,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = rect?.width ?? window.innerWidth;
      const h = rect?.height ?? window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      initStars(w, h);
    };

    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 20,
      };
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    let time = 0;
    const animate = () => {
      time += 1;
      const { width, height } = dimensionsRef.current;
      if (width && height) {
        drawStarField(
          ctx,
          starsRef.current,
          bortleRef.current,
          skyglowRef.current,
          time,
          width,
          height,
          mouseRef.current.x,
          mouseRef.current.y
        );
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initStars]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
