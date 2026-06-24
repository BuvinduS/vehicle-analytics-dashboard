"use client";

import ArcGauge from "./ArcGauge";
import GForcePanel from "./GForcePanel";
import LinearBar from "./LinearBar";
import StatusBar from "./StatusBar";
import { useTelemetry } from "../hooks/useTelemetry";

const DEFAULTS = {
  speed_kmh: 0, rpm: 0, throttle_pct: 0, coolant_temp_c: 0,
  engine_load_pct: 0, accel_x: 0, accel_y: 0, accel_z: 9.81,
};

export default function Dashboard() {
  const { frame, status } = useTelemetry();
  const d = frame ?? DEFAULTS;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-base)" }}>
      <StatusBar status={status} sessionId={frame?.session_id ?? null} lastTs={frame?.ts ?? null} />

      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "32px", padding: "32px 16px",
      }}>
        {/* Top row: Speed (hero) + RPM */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "48px", flexWrap: "wrap" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "50%", padding: "24px", border: "1px solid var(--border)", boxShadow: "0 0 40px rgba(0,229,255,0.04)" }}>
            <ArcGauge value={d.speed_kmh} min={0} max={220} label="Speed" unit="km/h" size={260} warnAt={0.8} dangerAt={0.92} ticks={7} />
          </div>
          <div style={{ background: "var(--bg-card)", borderRadius: "50%", padding: "20px", border: "1px solid var(--border)", boxShadow: "0 0 40px rgba(0,229,255,0.04)" }}>
            <ArcGauge value={d.rpm} min={0} max={8000} label="RPM" unit="rpm" size={220} warnAt={0.75} dangerAt={0.875} ticks={6} />
          </div>
        </div>

        {/* Bottom row: Throttle + Coolant + G-force */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "40px", flexWrap: "wrap" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "50%", padding: "18px", border: "1px solid var(--border)" }}>
            <ArcGauge value={d.throttle_pct} min={0} max={100} label="Throttle" unit="%" size={180} warnAt={0.85} dangerAt={0.95} ticks={5} decimals={1} />
          </div>
          <div style={{ background: "var(--bg-card)", borderRadius: "50%", padding: "18px", border: "1px solid var(--border)" }}>
            <ArcGauge value={d.coolant_temp_c} min={50} max={130} label="Coolant" unit="°C" size={180} warnAt={0.75} dangerAt={0.875} ticks={5} decimals={1} />
          </div>
          <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "18px 20px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <GForcePanel accelX={d.accel_x} accelY={d.accel_y} size={180} />
          </div>
        </div>

        {/* Engine load bar */}
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "16px 24px", border: "1px solid var(--border)", width: "min(480px, 90vw)" }}>
          <LinearBar value={d.engine_load_pct} label="Engine Load" unit="%" width={432} warnAt={0.75} dangerAt={0.9} />
        </div>

        {status !== "connected" && (
          <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 20px", fontFamily: "'Rajdhani', sans-serif", fontWeight: 500, fontSize: "0.85rem", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
            {status === "connecting" ? "Connecting to telemetry bridge..." : "Connection lost — retrying..."}
          </div>
        )}
      </main>
    </div>
  );
}