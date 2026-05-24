"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface ScrollSectionProps {
  children: React.ReactNode;
  className?: string;
  "data-step"?: string;
}

export function ScrollStep({
  children,
  className = "",
  ...props
}: ScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-40% 0px -40% 0px" });

  return (
    <div ref={ref} className={`scroll-step ${className}`} {...props}>
      <motion.div
        animate={{ opacity: isInView ? 1 : 0.35, y: isInView ? 0 : 12 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface NarrativeBlockProps {
  openingLine: string;
  children: React.ReactNode;
}

export function NarrativeBlock({ openingLine, children }: NarrativeBlockProps) {
  return (
    <div className="space-y-6">
      <p
        className="font-cormorant italic text-off-white leading-tight"
        style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}
      >
        {openingLine}
      </p>
      <div className="font-outfit text-text-body leading-relaxed space-y-4 text-base md:text-lg">
        {children}
      </div>
    </div>
  );
}

interface StatCalloutProps {
  children: React.ReactNode;
}

export function StatCallout({ children }: StatCalloutProps) {
  return (
    <span
      className="stat-callout"
      style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
    >
      {children}
    </span>
  );
}

interface SectionLayoutProps {
  visual: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}

export function SectionLayout({ visual, children, id }: SectionLayoutProps) {
  return (
    <section id={id} className="scroll-container relative">
      <div className="sticky-visual">{visual}</div>
      <div className="scroll-text py-[20vh]">{children}</div>
    </section>
  );
}
