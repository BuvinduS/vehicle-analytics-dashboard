"use client";

import { ConnectionStatus } from "../hooks/useTelemetry";

interface StatusBarProps {
  status: ConnectionStatus;
  sessionId: string | null;
  lastTs: number | null;
}

export default function StatusBar({ status, sessionId, lastTs }: StatusBarProps) {
  const statusConfig = {
    connected:    { color: "var(--accent-cyan)", label: "LIVE" },
    connecting:   { color: "var(--accent-amber)", label: "CONNECTING" },
    disconnected: { color: "var(--accent-red)", label: "OFFLINE" },
  }[status];

  const latency = lastTs
    ? `${Math.round(Date.now() / 1000 - lastTs)} s ago`
    : "—";

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 24px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-card)",
    }}>
      {/* Left: branding */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "1.1rem",
          letterSpacing: "0.2em",
          color: "var(--text-primary)",
        }}>
          TELEMETRY
        </span>
        <span style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 500,
          fontSize: "0.75rem",
          letterSpacing: "0.15em",
          color: "var(--text-muted)",
        }}>
          DRIVER PERFORMANCE PLATFORM
        </span>
      </div>

      {/* Right: status indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        {sessionId && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            letterSpacing: "0.05em",
          }}>
            SESSION: <span style={{ color: "var(--text-primary)" }}>{sessionId}</span>
          </span>
        )}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
        }}>
          {latency}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Pulsing dot */}
          <span style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: statusConfig.color,
            boxShadow: status === "connected" ? `0 0 6px ${statusConfig.color}` : "none",
            animation: status === "connected" ? "pulse 2s ease-in-out infinite" : "none",
          }} />
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 600,
            fontSize: "0.78rem",
            letterSpacing: "0.12em",
            color: statusConfig.color,
          }}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </header>
  );
}