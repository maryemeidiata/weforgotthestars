"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import citiesData from "@/data/cities-electrification.json";

interface City {
  city: string;
  country: string;
  year: number;
  lat: number;
  lon: number;
}

interface GlobeMapProps {
  currentStep: number;
}

const CITIES = citiesData as City[];

const LAMP_TIMELINE = [
  { label: "Arc lamps",    period: "1870s", startYear: 1870 },
  { label: "Incandescent", period: "1880s", startYear: 1880 },
  { label: "Sodium",       period: "1930s", startYear: 1930 },
  { label: "White LED",    period: "2010s", startYear: 2010 },
];

// Step 0 → 1870, Step 1 → 1910, Step 2 → 1950
function yearFromStep(step: number) {
  return Math.min(1950, 1870 + step * 40);
}

// True if [lon, lat] is on the front hemisphere given the projection rotation
function isVisible(lon: number, lat: number, rotation: [number, number, number]): boolean {
  const cLon = -rotation[0] * (Math.PI / 180);
  const cLat = -rotation[1] * (Math.PI / 180);
  const pLon = lon * (Math.PI / 180);
  const pLat = lat * (Math.PI / 180);
  const dot =
    Math.sin(cLat) * Math.sin(pLat) +
    Math.cos(cLat) * Math.cos(pLat) * Math.cos(pLon - cLon);
  return dot > 0;
}

export default function GlobeMap({ currentStep }: GlobeMapProps) {
  const svgRef        = useRef<SVGSVGElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const projRef       = useRef<d3.GeoProjection | null>(null);
  const pathRef       = useRef<d3.GeoPath | null>(null);
  const rotRef        = useRef<[number, number, number]>([-20, -30, 0]);
  const animRef       = useRef<number>(0);
  const autoRotate    = useRef(true);
  const dragStart     = useRef<{ x: number; y: number; rot: [number, number, number] } | null>(null);

  // These refs are read directly by the rAF loop so it always sees fresh data
  const activeCitiesRef = useRef<City[]>([]);
  const displayYearRef  = useRef(1870);

  // Keep refs in sync with props (no React state needed for the rAF path)
  const clampedYear = yearFromStep(currentStep);
  activeCitiesRef.current = CITIES.filter((c) => c.year <= clampedYear);
  displayYearRef.current  = clampedYear;

  // --- Draw: purely reads from refs, no React state deps → stable callback ---
  const draw = useCallback(() => {
    const svg  = svgRef.current;
    const proj = projRef.current;
    const path = pathRef.current;
    if (!svg || !proj || !path) return;

    const g   = d3.select(svg);
    const rot = rotRef.current;

    // Update land path
    const land = g.select<SVGPathElement>(".land");
    if (!land.empty()) land.attr("d", path as unknown as string);

    // Year counter
    g.select(".year-counter").text(displayYearRef.current.toString());

    // City dots
    const cities = activeCitiesRef.current;
    const sel = g.select(".cities")
      .selectAll<SVGCircleElement, City>("circle")
      .data(cities, (d) => d.city);

    sel.enter()
      .append("circle")
      .attr("r", 0)
      .attr("fill", "#f5a623")
      .attr("fill-opacity", "0.9")
      .transition().duration(600).attr("r", 5);

    sel.exit().remove();

    g.select(".cities")
      .selectAll<SVGCircleElement, City>("circle")
      .each(function (d) {
        const coords = proj([d.lon, d.lat]);
        if (!coords) return;
        d3.select(this)
          .attr("cx", coords[0])
          .attr("cy", coords[1])
          .attr("visibility", isVisible(d.lon, d.lat, rot) ? "visible" : "hidden");
      });
  }, []); // no deps — everything read from refs

  // --- Setup once ---
  useEffect(() => {
    const svg       = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const width  = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width, height) * 0.38;

    svg.setAttribute("width",  String(width));
    svg.setAttribute("height", String(height));

    const proj = d3.geoOrthographic()
      .scale(radius)
      .translate([width / 2, height * 0.45])
      .clipAngle(90)
      .rotate(rotRef.current);
    projRef.current = proj;
    pathRef.current = d3.geoPath(proj);

    const g = d3.select(svg);
    g.selectAll("*").remove();

    // Sphere
    const defs = g.append("defs");
    const sg = defs.append("radialGradient").attr("id", "sg").attr("cx", "35%").attr("cy", "35%");
    sg.append("stop").attr("offset", "0%").attr("stop-color", "#1a1535");
    sg.append("stop").attr("offset", "100%").attr("stop-color", "#05040f");

    g.append("circle")
      .attr("cx", width / 2).attr("cy", height * 0.45).attr("r", radius)
      .attr("fill", "url(#sg)")
      .attr("stroke", "#4a3f8f").attr("stroke-width", "0.5").attr("stroke-opacity", "0.4");

    // Load world
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((world: Topology<{ countries: GeometryCollection }>) => {
        const land = feature(world, world.objects.countries);
        g.append("path")
          .datum(land as d3.GeoPermissibleObjects)
          .attr("class", "land")
          .attr("d", pathRef.current as unknown as string)
          .attr("fill", "#2d1f5e").attr("fill-opacity", "0.6")
          .attr("stroke", "#4a3f8f").attr("stroke-width", "0.3").attr("stroke-opacity", "0.4");
      });

    g.append("g").attr("class", "cities");

    g.append("text").attr("class", "year-counter")
      .attr("x", 20).attr("y", 44)
      .attr("fill", "#a89be8").attr("font-size", "32")
      .attr("font-family", "var(--font-cormorant)").attr("font-style", "italic");

    g.append("text").attr("class", "drag-hint")
      .attr("x", width / 2).attr("y", height - 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#6b6490").attr("font-size", "10")
      .attr("font-family", "var(--font-outfit)").text("drag to rotate");

    // Animation loop
    let angle = rotRef.current[0];
    const loop = () => {
      if (autoRotate.current && !dragStart.current) {
        angle += 0.04;
        const newRot: [number, number, number] = [angle, rotRef.current[1], 0];
        rotRef.current = newRot;
        projRef.current?.rotate(newRot);
      }
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animRef.current);
  }, [draw]); // draw is stable (no deps)

  // --- Drag handlers ---
  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    autoRotate.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, rot: [...rotRef.current] as [number, number, number] };
    (e.target as SVGSVGElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newRot: [number, number, number] = [
      dragStart.current.rot[0] + dx * 0.3,
      Math.max(-60, Math.min(60, dragStart.current.rot[1] - dy * 0.3)),
      0,
    ];
    rotRef.current = newRot;
    projRef.current?.rotate(newRot);
  }, []);

  const onPointerUp = useCallback(() => {
    dragStart.current = null;
    setTimeout(() => { autoRotate.current = true; }, 2000);
  }, []);

  const lampProgress =
    clampedYear <= 1880 ? 0.25 :
    clampedYear <= 1930 ? 0.5  :
    clampedYear <= 2010 ? 0.75 : 1.0;

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col relative bg-bg">
      <svg
        ref={svgRef}
        className="flex-1 w-full"
        style={{ cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Lamp technology timeline */}
      <div className="px-6 pb-6 pt-2">
        <div className="relative">
          <div className="h-px bg-purple-faint w-full mb-3" />
          <div
            className="absolute top-0 left-0 h-px bg-purple-bright transition-all duration-700"
            style={{ width: `${lampProgress * 100}%` }}
          />
          <div className="flex justify-between">
            {LAMP_TIMELINE.map((lamp, i) => {
              const isActive = clampedYear >= lamp.startYear;
              return (
                <div key={i} className="flex flex-col items-center" style={{ width: "25%" }}>
                  <div className={`w-1.5 h-1.5 rounded-full mb-1 transition-colors duration-500 ${isActive ? "bg-purple-bright" : "bg-purple-faint"}`} />
                  <span className={`font-outfit text-center transition-colors duration-500 ${isActive ? "text-lavender" : "text-text-muted"}`} style={{ fontSize: "0.6rem" }}>
                    {lamp.label}
                  </span>
                  <span className="font-outfit text-text-muted text-center" style={{ fontSize: "0.55rem" }}>
                    {lamp.period}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
