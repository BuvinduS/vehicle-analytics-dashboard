"use client";

import { ConnectionStatus, VehicleInfo } from "../hooks/useTelemetry";

interface StatusBarProps {
  status: ConnectionStatus;
  sessionId: string | null;
  lastTs: number | null;
  mode: "normal" | "advanced";
  onModeToggle: () => void;
  vehicleInfo: VehicleInfo | null;
  onVehicleInfoOpen: () => void;
}

export default function StatusBar({
  status,
  sessionId,
  lastTs,
  mode,
  onModeToggle,
  vehicleInfo,
  onVehicleInfoOpen,
}: StatusBarProps) {
  const statusConfig = {
    connected:    { color: "var(--accent-cyan)", label: "LIVE" },
    connecting:   { color: "var(--accent-amber)", label: "CONNECTING" },
    disconnected: { color: "var(--accent-red)", label: "OFFLINE" },
  }[status];

  const latency = lastTs
    ? `${Math.round(Date.now() / 1000 - lastTs)} s ago`
    : "—";

  // Vehicle label logic:
  // - Has make/model → show "2019 Toyota Camry ›"
  // - Connected but no VIN → show "ENTER VIN ›" (amber)
  // - Not yet received vehicle info → show platform name
  const vehicleLabel = vehicleInfo?.make
    ? `${vehicleInfo.year ?? ""} ${vehicleInfo.make} ${vehicleInfo.model ?? ""}`.trim()
    : vehicleInfo !== null // we received a message but VIN was null
    ? "ENTER VIN"
    : null;

  const vehicleLabelColor = vehicleInfo?.make
    ? "var(--accent-cyan)"
    : "var(--accent-amber)";

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 24px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-card)",
      flexWrap: "wrap",
      gap: "8px",
    }}>
      {/* Left: branding + vehicle */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "1.1rem",
          letterSpacing: "0.2em",
          color: "var(--text-primary)",
        }}>
          TELEMETRY
        </span>

        {vehicleLabel ? (
          <button
            onClick={onVehicleInfoOpen}
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: "0.82rem",
              letterSpacing: "0.1em",
              color: vehicleLabelColor,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {vehicleLabel} ›
          </button>
        ) : (
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 500,
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
          }}>
            DRIVER PERFORMANCE PLATFORM
          </span>
        )}
      </div>

      {/* Right: controls + status */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {sessionId && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
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

        <button
          onClick={onModeToggle}
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 600,
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
            padding: "4px 12px",
            borderRadius: "4px",
            border: `1px solid ${mode === "advanced" ? "var(--accent-cyan)" : "var(--border)"}`,
            background: mode === "advanced" ? "rgba(0,229,255,0.08)" : "transparent",
            color: mode === "advanced" ? "var(--accent-cyan)" : "var(--text-muted)",
            cursor: "pointer",
            transition: "all 200ms ease",
          }}
        >
          {mode === "advanced" ? "NORMAL" : "ADVANCED"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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