"use client";

import { motion } from "framer-motion";

export default function SkyGlowDiagram() {
  return (
    <motion.div
      className="absolute left-0 top-0 bottom-0 pointer-events-none flex items-center justify-center"
      style={{ width: "56%" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <svg
        viewBox="0 0 400 300"
        className="w-full opacity-90 px-8"
        aria-label="Atmospheric light scattering diagram"
      >
        {/* Atmosphere gradient overlay */}
        <defs>
          <radialGradient id="atmosphere" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#f5a623" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#c17f3a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#05040f" stopOpacity="0" />
          </radialGradient>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#f5a623" opacity="0.7" />
          </marker>
          <marker id="arrowdown" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#a89be8" opacity="0.7" />
          </marker>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="400" height="220" fill="url(#atmosphere)" />

        {/* Atmosphere band */}
        <ellipse
          cx="200" cy="220" rx="220" ry="30"
          fill="none"
          stroke="#4a3f8f"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.4"
        />
        <text x="8" y="215" fill="#6b6490" fontSize="9" fontFamily="var(--font-outfit)">
          atmosphere
        </text>

        {/* City skyline */}
        <g fill="#1a1535" stroke="#4a3f8f" strokeWidth="0.5">
          <rect x="20" y="240" width="30" height="60" />
          <rect x="60" y="225" width="20" height="75" />
          <rect x="88" y="250" width="15" height="50" />
          <rect x="110" y="235" width="25" height="65" />
          <rect x="143" y="218" width="18" height="82" />
          <rect x="169" y="242" width="22" height="58" />
          <rect x="200" y="228" width="28" height="72" />
          <rect x="236" y="245" width="16" height="55" />
          <rect x="260" y="232" width="24" height="68" />
          <rect x="292" y="240" width="20" height="60" />
          <rect x="320" y="222" width="30" height="78" />
          <rect x="358" y="238" width="22" height="62" />
        </g>

        {/* Ground / street glow */}
        <rect x="0" y="295" width="400" height="5" fill="#f5a623" opacity="0.3" />

        {/* Light rays going up */}
        {[70, 130, 200, 270, 330].map((x, i) => (
          <g key={i}>
            <motion.line
              x1={x} y1={230}
              x2={x + (i % 2 === 0 ? -30 : 30)} y2={80}
              stroke="#f5a623"
              strokeWidth="1"
              strokeOpacity="0.5"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ duration: 1.2, delay: i * 0.15 }}
            />
          </g>
        ))}

        {/* Scattering dots in atmosphere */}
        {[
          [90, 130], [150, 100], [210, 120], [270, 95], [320, 115],
          [110, 160], [180, 145], [240, 155], [300, 140],
        ].map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x} cy={y} r="2.5"
            fill="#7c6fd4"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 + i * 0.08 }}
          />
        ))}

        {/* Rays scattering back down */}
        {[100, 180, 250, 310].map((x, i) => (
          <motion.line
            key={i}
            x1={x} y1={130}
            x2={x + (i % 2 === 0 ? 40 : -40)} y2={220}
            stroke="#a89be8"
            strokeWidth="1"
            strokeOpacity="0.4"
            markerEnd="url(#arrowdown)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 1.0, delay: 1.2 + i * 0.1 }}
          />
        ))}

        {/* Label: skyglow */}
        <motion.text
          x="200" y="60"
          textAnchor="middle"
          fill="#a89be8"
          fontSize="10"
          fontFamily="var(--font-outfit)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 2 }}
        >
          light scatters back as skyglow
        </motion.text>
      </svg>
    </motion.div>
  );
}
