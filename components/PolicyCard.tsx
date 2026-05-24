"use client";

import { motion } from "framer-motion";

interface PolicyCardData {
  location: string;
  type: string;
  year: string;
  lines: string[];
}

interface PolicyCardProps {
  card: PolicyCardData;
  index: number;
}

export function PolicyCard({ card, index }: PolicyCardProps) {
  return (
    <motion.div
      className="glass rounded-xl p-5 flex-1 min-w-[180px]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="mb-3">
        <p
          className="font-cormorant italic text-off-white leading-tight"
          style={{ fontSize: "1.1rem" }}
        >
          {card.location}
        </p>
        <p className="font-outfit text-text-muted text-xs mt-0.5">{card.year}</p>
      </div>
      <div
        className="w-8 h-px mb-3"
        style={{ background: "rgba(168, 155, 232, 0.3)" }}
      />
      <p className="font-outfit text-purple-bright text-xs font-medium mb-1">{card.type}</p>
      {card.lines.map((line, i) => (
        <p key={i} className="font-outfit text-text-body text-xs leading-relaxed">
          {line}
        </p>
      ))}
    </motion.div>
  );
}

export const POLICY_CARDS: PolicyCardData[] = [
  {
    location: "Tucson, AZ",
    type: "Full LED retrofit",
    year: "2017",
    lines: [
      "Measured sky",
      "brightness",
      "reduction",
    ],
  },
  {
    location: "Flagstaff, AZ",
    type: "Lighting ordinance",
    year: "since 1958",
    lines: [
      "Stable skies for",
      "decades despite",
      "population growth",
    ],
  },
  {
    location: "France",
    type: "National law",
    year: "2018",
    lines: [
      "Warmer lights,",
      "curfews on signs,",
      "full shielding",
    ],
  },
];
