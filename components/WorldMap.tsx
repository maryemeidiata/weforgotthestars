"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import darkSkyPlaces from "@/data/dark-sky-places.json";
import worstOffenders from "@/data/worst-offenders.json";
import { reprojectBlackMarble } from "@/lib/reproject";
import Tooltip from "./Tooltip";

interface DarkSkyPlace {
  name: string; country: string; lat: number; lon: number;
  type: string; sqm: number; bortle: number; description: string;
}

interface WorstOffender {
  rank: number; city: string; country: string; bortle: number;
  sqm: number; lat: number; lon: number;
}

type MapMode = "pollution" | "offenders" | "dark-sky";

interface WorldMapProps {
  mode: MapMode;
  showDarkSkyPlaces?: boolean;
  /** 0-based index into worstOffenders to pan/zoom to */
  activeOffenderIndex?: number;
}

export default function WorldMap({ mode, showDarkSkyPlaces = false, activeOffenderIndex }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rasterRef    = useRef<HTMLCanvasElement>(null);  // Black Marble layer
  const svgRef       = useRef<SVGSVGElement>(null);      // D3 borders + markers
  const projRef      = useRef<d3.GeoProjection | null>(null);
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [tooltip, setTooltip] = useState({
    visible: false, x: 0, y: 0,
    title: "", subtitle: "", bortle: undefined as number | undefined,
  });

  const showTooltip = useCallback((e: MouseEvent, title: string, subtitle: string, bortle?: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, title, subtitle, bortle });
  }, []);
  const hideTooltip = useCallback(() => setTooltip((t) => ({ ...t, visible: false })), []);

  // Zoom to [lon, lat] at given scale
  const zoomToPoint = useCallback((lon: number, lat: number, scale: number, ms = 900) => {
    const svg  = svgRef.current;
    const proj = projRef.current;
    const zoom = zoomRef.current;
    if (!svg || !proj || !zoom) return;
    const coords = proj([lon, lat]);
    if (!coords) return;
    const w = svg.clientWidth;
    const h = svg.clientHeight;
    const t = d3.zoomIdentity.translate(w / 2, h / 2).scale(scale).translate(-coords[0], -coords[1]);
    d3.select(svg).transition().duration(ms).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }, []);

  // Pan/zoom to active offender city
  useEffect(() => {
    if (mode !== "offenders" || activeOffenderIndex == null) return;
    const city = (worstOffenders as WorstOffender[])[activeOffenderIndex];
    if (city) zoomToPoint(city.lon, city.lat, 4);
  }, [activeOffenderIndex, mode, zoomToPoint]);

  useEffect(() => {
    const svg       = svgRef.current;
    const raster    = rasterRef.current;
    const container = containerRef.current;
    if (!svg || !raster || !container) return;

    const width  = container.clientWidth;
    const height = container.clientHeight;

    // Size both canvas and svg to container
    raster.width  = width;
    raster.height = height;
    svg.setAttribute("width",  String(width));
    svg.setAttribute("height", String(height));

    // Build D3 projection
    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.2)
      .translate([width / 2, height / 2]);
    projRef.current = projection;

    const path = d3.geoPath(projection);

    // ── Raster layer: reproject Black Marble ──────────────────────────────
    setLoading(true);
    setLoadPct(0);
    reprojectBlackMarble(raster, projection, setLoadPct)
      .then(() => setLoading(false))
      .catch(() => {
        // Fallback: plain dark background if image fails
        const ctx = raster.getContext("2d")!;
        ctx.fillStyle = "#05040f";
        ctx.fillRect(0, 0, width, height);
        setLoading(false);
      });

    // ── SVG layer: country borders + interactive markers ──────────────────
    const g = d3.select(svg);
    g.selectAll("*").remove();

    const zoomGroup    = g.append("g").attr("class", "zoom-group");
    const geoGroup     = zoomGroup.append("g").attr("class", "geo");
    const markersGroup = zoomGroup.append("g").attr("class", "markers");

    // D3 zoom (moves the SVG group; raster reproject is static)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
        // Mirror zoom transform onto raster canvas via CSS transform
        if (raster) {
          const { x, y, k } = event.transform;
          raster.style.transformOrigin = "0 0";
          raster.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
        }
      });
    zoomRef.current = zoom;
    d3.select(svg).call(zoom);

    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((world: Topology<{ countries: GeometryCollection }>) => {
        const countries = feature(world, world.objects.countries);

        // Country borders — thin, translucent so they don't fight the raster
        geoGroup
          .selectAll("path")
          .data((countries as GeoJSON.FeatureCollection).features)
          .enter()
          .append("path")
          .attr("d", (d) => path(d as d3.GeoPermissibleObjects) ?? "")
          .attr("fill", "rgba(0,0,0,0)")       // transparent fill — raster shows through
          .attr("stroke", "rgba(168,155,232,0.25)")
          .attr("stroke-width", "0.5");

        // ── Worst offender markers ──────────────────────────────────────────
        if (mode === "offenders") {
          (worstOffenders as WorstOffender[]).forEach((city, i) => {
            const coords = projection([city.lon, city.lat]);
            if (!coords) return;
            const [x, y] = coords;

            const marker = markersGroup.append("g")
              .attr("class", "offender-marker")
              .style("cursor", "pointer");

            // Outer ring
            marker.append("circle")
              .attr("cx", x).attr("cy", y).attr("r", 14)
              .attr("fill", "none").attr("stroke", "#f5a623")
              .attr("stroke-width", "1").attr("opacity", "0.4");

            // Core dot
            marker.append("circle")
              .attr("cx", x).attr("cy", y).attr("r", 6)
              .attr("fill", "#f5a623").attr("opacity", "0.95");

            // Rank label
            marker.append("text")
              .attr("x", x + 10).attr("y", y - 8)
              .attr("fill", "#f5a623").attr("font-size", "9")
              .attr("font-weight", "600")
              .attr("font-family", "var(--font-outfit)")
              .text(`${i + 1}. ${city.city}`);

            marker
              .on("mouseenter", (e: MouseEvent) =>
                showTooltip(e, `${city.city}, ${city.country}`, `#${i + 1} most light-polluted`, city.bortle))
              .on("mousemove",  (e: MouseEvent) =>
                showTooltip(e, `${city.city}, ${city.country}`, `#${i + 1} most light-polluted`, city.bortle))
              .on("mouseleave", hideTooltip);
          });
        }

        // ── Dark sky place markers ──────────────────────────────────────────
        if (mode === "dark-sky" || showDarkSkyPlaces) {
          (darkSkyPlaces as DarkSkyPlace[]).forEach((place) => {
            const coords = projection([place.lon, place.lat]);
            if (!coords) return;
            const [x, y] = coords;

            const marker = markersGroup.append("g")
              .attr("class", "dark-sky-marker").style("cursor", "pointer");

            const pulse = marker.append("circle")
              .attr("cx", x).attr("cy", y).attr("r", 6)
              .attr("fill", "none").attr("stroke", "#c9c2f0")
              .attr("stroke-width", "1").attr("opacity", "0");

            const animatePulse = () => {
              pulse.attr("r", 6).attr("opacity", "0.7")
                .transition().duration(1800).ease(d3.easeSinOut)
                .attr("r", 18).attr("opacity", "0")
                .on("end", animatePulse);
            };
            setTimeout(animatePulse, Math.random() * 1500);

            marker.append("circle")
              .attr("cx", x).attr("cy", y).attr("r", 4)
              .attr("fill", "#c9c2f0").attr("opacity", "0.9");

            marker
              .on("mouseenter", (e: MouseEvent) =>
                showTooltip(e, place.name, place.type, place.bortle))
              .on("mousemove",  (e: MouseEvent) =>
                showTooltip(e, place.name, place.type, place.bortle))
              .on("mouseleave", hideTooltip);
          });
        }

        // Country hover (for pollution + dark-sky sections)
        if (mode === "pollution" || mode === "dark-sky") {
          geoGroup.selectAll("path")
            .style("cursor", "crosshair")
            .on("mouseenter", function (e: MouseEvent, d: unknown) {
              const name = ((d as GeoJSON.Feature).properties as Record<string, string>)?.name ?? "Unknown";
              showTooltip(e, name, "Hover for light-pollution context");
            })
            .on("mousemove", function (e: MouseEvent, d: unknown) {
              const name = ((d as GeoJSON.Feature).properties as Record<string, string>)?.name ?? "Unknown";
              showTooltip(e, name, "Hover for light-pollution context");
            })
            .on("mouseleave", hideTooltip);
        }
      });

    // Legend (only for dark-sky mode — pollution is now self-evident from the raster)
    if (mode === "dark-sky") {
      const legend = g.append("g").attr("transform", `translate(16, ${height - 60})`);
      [
        { label: "IDA Dark Sky Place", color: "#c9c2f0", shape: "circle" },
      ].forEach((item, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 18})`);
        row.append("circle").attr("cx", 5).attr("cy", 5).attr("r", 4).attr("fill", item.color);
        row.append("text").attr("x", 14).attr("y", 9)
          .attr("fill", "#6b6490").attr("font-size", "10")
          .attr("font-family", "var(--font-outfit)").text(item.label);
      });
    }
  }, [mode, showDarkSkyPlaces, showTooltip, hideTooltip]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#05040f] overflow-hidden">
      {/* Raster: Black Marble satellite image, reprojected */}
      <canvas ref={rasterRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="w-48 h-px bg-purple-faint overflow-hidden rounded-full">
            <div
              className="h-full bg-purple-glow transition-all duration-300"
              style={{ width: `${loadPct}%` }}
            />
          </div>
          <p className="font-outfit text-text-muted mt-3" style={{ fontSize: "0.65rem", letterSpacing: "0.15em" }}>
            RENDERING SATELLITE DATA
          </p>
        </div>
      )}

      {/* SVG: borders + interactive markers */}
      <svg ref={svgRef} className="absolute inset-0 w-full h-full" />
      <Tooltip {...tooltip} />
    </div>
  );
}
