"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

const StarField = dynamic(() => import("./StarField"), { ssr: false });

export default function Hero() {
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowScrollHint(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Star field canvas */}
      <div className="absolute inset-0">
        <StarField bortleLevel={1} skyglowIntensity={0} />
      </div>

      {/* Amber horizon — thematic: pollution encroaching even here */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "38%",
          background:
            "linear-gradient(to top, rgba(120, 55, 8, 0.28) 0%, rgba(80, 30, 4, 0.10) 45%, transparent 100%)",
        }}
      />

      {/* Hard bottom fade to page bg */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #05040f)",
        }}
      />

      {/* ── Title block — bottom-left, documentary / film-title feel ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-10 md:px-16 pb-16 md:pb-20">
        {/* Byline above title */}
        <motion.p
          className="font-outfit text-text-muted uppercase tracking-[0.25em] mb-4"
          style={{ fontSize: "0.65rem" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          A data essay by Maryeme Idiata
        </motion.p>

        {/* Main title — large, flush left, spanning the width */}
        <div className="overflow-hidden pb-[0.4em] -mb-[0.4em]">
          <motion.h1
            className="font-cormorant italic text-off-white leading-[0.92] tracking-tight"
            style={{ fontSize: "clamp(3.8rem, 9.5vw, 9rem)" }}
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            We Forgot
          </motion.h1>
        </div>
        <div className="overflow-hidden pb-[0.4em] -mb-[0.4em]">
          <motion.h1
            className="font-cormorant italic text-off-white leading-[0.92] tracking-tight"
            style={{ fontSize: "clamp(3.8rem, 9.5vw, 9rem)" }}
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            the Stars
          </motion.h1>
        </div>

        {/* Divider + subtitle row */}
        <div className="flex items-center gap-6 mt-6">
          <motion.div
            className="h-px bg-purple-mid flex-shrink-0"
            style={{ width: "2.5rem" }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.9, ease: "easeOut" }}
          />
          <motion.p
            className="font-outfit text-text-muted font-light"
            style={{ fontSize: "clamp(0.8rem, 1.2vw, 1rem)", letterSpacing: "0.04em" }}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
          >
            On light pollution and what we gave away.
          </motion.p>
        </div>
      </div>

      {/* Scroll indicator — right edge, rotated */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.div
            className="absolute right-8 bottom-16 z-10 flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <motion.div
              className="w-px bg-gradient-to-b from-transparent via-text-muted to-transparent"
              style={{ height: "4rem" }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="font-outfit text-text-muted uppercase"
              style={{
                fontSize: "0.55rem",
                letterSpacing: "0.2em",
                writingMode: "vertical-rl",
              }}
            >
              scroll
            </span>
            <motion.div
              className="w-px bg-gradient-to-b from-text-muted to-transparent"
              style={{ height: "2rem" }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
