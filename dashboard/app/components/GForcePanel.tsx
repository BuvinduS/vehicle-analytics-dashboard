"use client";

import React, { useMemo } from "react";

interface GForcePanelProps {
  accelX: number; // lateral (left/right)
  accelY: number; // longitudinal (forward/back)
  size?: number;
}

const MAX_G = 2.0; // g-force range shown on the circle

export default function GForcePanel({ accelX, accelY, size = 180 }: GForcePanelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44;
  const midR = size * 0.29;
  const innerR = size * 0.14;

  // Convert m/s² to g (9.81 m/s² = 1g), then clamp to MAX_G
  const gX = accelX / 9.81;
  const gY = accelY / 9.81;

  const dotX = useMemo(() => cx + Math.max(-1, Math.min(1, gX / MAX_G)) * outerR, [cx, gX, outerR]);
  const dotY = useMemo(() => cy - Math.max(-1, Math.min(1, gY / MAX_G)) * outerR, [cy, gY, outerR]);

  const gMag = Math.sqrt(gX * gX + gY * gY);
  const dotColor = gMag > 1.2 ? "var(--accent-red)" : gMag > 0.6 ? "var(--accent-amber)" : "var(--accent-cyan)";

  if (accelX == null || accelY == null) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="glow-gforce">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Concentric rings */}
        {[outerR, midR, innerR].map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke="var(--bg-panel)" strokeWidth={1.5} />
        ))}

        {/* Crosshairs */}
        <line x1={cx - outerR} y1={cy} x2={cx + outerR} y2={cy}
          stroke="var(--text-muted)" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.5} />
        <line x1={cx} y1={cy - outerR} x2={cx} y2={cy + outerR}
          stroke="var(--text-muted)" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.5} />

        {/* G-force ring labels */}
        {[{ r: innerR, label: "0.5g" }, { r: midR, label: "1g" }, { r: outerR, label: "2g" }].map(({ r, label }) => (
          <text key={label}
            x={cx + r + 3} y={cy - 3}
            fill="var(--text-muted)"
            fontSize={size * 0.065}
            fontFamily="'JetBrains Mono', monospace"
          >{label}</text>
        ))}

        {/* Trail dot (ghost at center) */}
        <circle cx={cx} cy={cy} r={size * 0.025}
          fill="var(--text-muted)" opacity={0.3} />

        {/* Live dot */}
        <circle cx={dotX} cy={dotY} r={size * 0.055}
          fill={dotColor}
          filter="url(#glow-gforce)"
          style={{ transition: "cx 80ms linear, cy 80ms linear, fill 200ms ease" }}
        />

        {/* Axis labels */}
        <text x={cx} y={cy + outerR + size * 0.1}
          textAnchor="middle" fill="var(--text-muted)"
          fontSize={size * 0.065} fontFamily="'Rajdhani', sans-serif" fontWeight="500"
        >BRAKE ↑  ACCEL ↓</text>
        <text x={cx - outerR - 2} y={cy}
          textAnchor="end" dominantBaseline="middle" fill="var(--text-muted)"
          fontSize={size * 0.065} fontFamily="'Rajdhani', sans-serif" fontWeight="500"
        >L</text>
        <text x={cx + outerR + 2} y={cy}
          textAnchor="start" dominantBaseline="middle" fill="var(--text-muted)"
          fontSize={size * 0.065} fontFamily="'Rajdhani', sans-serif" fontWeight="500"
        >R</text>
      </svg>

      <span style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 600,
        fontSize: "0.8rem",
        letterSpacing: "0.15em",
        color: "var(--text-muted)",
        textTransform: "uppercase",
      }}>
        G-FORCE
      </span>
    </div>
  );
}