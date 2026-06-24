"use client";

interface LinearBarProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  unit: string;
  warnAt?: number;
  dangerAt?: number;
  width?: number;
}

export default function LinearBar({
  value,
  min = 0,
  max = 100,
  label,
  unit,
  warnAt = 0.75,
  dangerAt = 0.9,
  width = 200,
}: LinearBarProps) {
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const color =
    fraction >= dangerAt
      ? "var(--accent-red)"
      : fraction >= warnAt
      ? "var(--accent-amber)"
      : "var(--accent-cyan)";

  const height = 8;
  const trackW = width;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      width,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}>
        <span style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 600,
          fontSize: "0.75rem",
          letterSpacing: "0.15em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "var(--text-primary)",
        }}>
          {value.toFixed(1)}<span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: 2 }}>{unit}</span>
        </span>
      </div>

      {/* Track */}
      <svg width={trackW} height={height + 4}>
        <rect x={0} y={2} width={trackW} height={height} rx={height / 2}
          fill="var(--bg-panel)" />
        <rect x={0} y={2} width={trackW * fraction} height={height} rx={height / 2}
          fill={color}
          style={{ transition: "width 80ms linear, fill 200ms ease" }}
        />
        {/* Glow */}
        <rect x={0} y={2} width={trackW * fraction} height={height} rx={height / 2}
          fill={color} opacity={0.25}
          style={{ filter: "blur(3px)", transition: "width 80ms linear" }}
        />
      </svg>
    </div>
  );
}