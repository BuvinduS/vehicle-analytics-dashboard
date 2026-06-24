"use client";

import React, { useMemo } from "react";

interface ArcGaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  size?: number;
  /** 0-1 fraction at which the arc turns amber */
  warnAt?: number;
  /** 0-1 fraction at which the arc turns red */
  dangerAt?: number;
  /** Number of major tick marks */
  ticks?: number;
  /** Fixed decimal places for the center readout */
  decimals?: number;
}

// Arc spans from -220° to +40° (260° sweep) — like a real speedometer
const START_ANGLE = -220; // degrees
const SWEEP = 260;        // degrees

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const s = polarToXY(cx, cy, r, startAngle);
  const e = polarToXY(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

export default function ArcGauge({
  value,
  min,
  max,
  label,
  unit,
  size = 220,
  warnAt = 0.75,
  dangerAt = 0.9,
  ticks = 6,
  decimals = 0,
}: ArcGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const trackR = r;

  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const arcColor = useMemo(() => {
    if (fraction >= dangerAt) return "var(--accent-red)";
    if (fraction >= warnAt)   return "var(--accent-amber)";
    return "var(--accent-cyan)";
  }, [fraction, warnAt, dangerAt]);

  const endAngle = START_ANGLE + fraction * SWEEP;

  // Track (background arc)
  const trackPath = describeArc(cx, cy, trackR, START_ANGLE, START_ANGLE + SWEEP);
  // Value arc
  const valuePath =
    fraction > 0.001
      ? describeArc(cx, cy, trackR, START_ANGLE, endAngle)
      : null;

  // Tick marks
  const tickElements = useMemo(() => {
    return Array.from({ length: ticks }, (_, i) => {
      const frac = i / (ticks - 1);
      const angle = START_ANGLE + frac * SWEEP;
      const inner = polarToXY(cx, cy, trackR - size * 0.045, angle);
      const outer = polarToXY(cx, cy, trackR + size * 0.02, angle);
      const labelPt = polarToXY(cx, cy, trackR - size * 0.13, angle);
      const tickVal = Math.round(min + frac * (max - min));
      return (
        <g key={i}>
          <line
            x1={inner.x} y1={inner.y}
            x2={outer.x} y2={outer.y}
            stroke="var(--text-muted)"
            strokeWidth={size * 0.012}
            strokeLinecap="round"
          />
          <text
            x={labelPt.x}
            y={labelPt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-muted)"
            fontSize={size * 0.065}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="400"
          >
            {tickVal >= 1000 ? `${tickVal / 1000}k` : tickVal}
          </text>
        </g>
      );
    });
  }, [ticks, cx, cy, trackR, size, min, max]);

  // Needle tip dot
  const needleTip = polarToXY(cx, cy, trackR, endAngle);

  const displayValue =
    value !== undefined && value !== null
      ? value.toFixed(decimals)
      : "--";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
      >
        {/* Subtle glow halo behind active arc */}
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={size * 0.018} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--bg-panel)"
          strokeWidth={size * 0.045}
          strokeLinecap="round"
        />

        {/* Tick marks */}
        {tickElements}

        {/* Value arc */}
        {valuePath && (
          <path
            d={valuePath}
            fill="none"
            stroke={arcColor}
            strokeWidth={size * 0.045}
            strokeLinecap="round"
            filter={`url(#glow-${label})`}
            style={{ transition: "d 80ms linear, stroke 200ms ease" }}
          />
        )}

        {/* Needle endpoint dot */}
        {fraction > 0.001 && (
          <circle
            cx={needleTip.x}
            cy={needleTip.y}
            r={size * 0.028}
            fill={arcColor}
            filter={`url(#glow-${label})`}
          />
        )}

        {/* Center readout */}
        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-primary)"
          fontSize={size * 0.18}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
          letterSpacing="-1"
        >
          {displayValue}
        </text>

        {/* Unit label */}
        <text
          x={cx}
          y={cy + size * 0.13}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize={size * 0.072}
          fontFamily="'Rajdhani', sans-serif"
          fontWeight="500"
          letterSpacing="2"
        >
          {unit.toUpperCase()}
        </text>
      </svg>

      {/* Gauge label below */}
      <span style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 600,
        fontSize: "0.8rem",
        letterSpacing: "0.15em",
        color: "var(--text-muted)",
        textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  );
}