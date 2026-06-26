"use client";

import { useState, useCallback } from "react";
import ArcGauge from "./ArcGauge";
import GForcePanel from "./GForcePanel";
import LinearBar from "./LinearBar";
import StatusBar from "./StatusBar";
import AdvancedTable from "./AdvancedTable";
import VehicleInfoPanel from "./VehicleInfoPanel";
import { useTelemetry } from "../hooks/useTelemetry";

const DEFAULTS = {
  speed_kmh: 0,
  rpm: 0,
  throttle_pct: 0,
  coolant_temp_c: 0,
  engine_load_pct: 0,
  accel_x: 0,
  accel_y: 0,
  accel_z: 9.81,
};

export default function DashboardClient() {
  const { frame, vehicleInfo, status, sendMessage } = useTelemetry();
  const d = frame ?? DEFAULTS;

  const [uiMode, setUiMode] = useState<"normal" | "advanced">("normal");
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);

  const handleModeToggle = useCallback(() => {
    const next = uiMode === "normal" ? "advanced" : "normal";
    setUiMode(next);
    sendMessage({ mode: next });
  }, [uiMode, sendMessage]);

  const isAdvanced = uiMode === "advanced";
  const heroSize  = isAdvanced ? 130 : 260;
  const mainSize  = isAdvanced ? 120 : 220;
  const smallSize = isAdvanced ? 110 : 180;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
      background: "var(--bg-base)",
    }}>
      <StatusBar
        status={status}
        sessionId={frame?.session_id ?? null}
        lastTs={frame?.ts ?? null}
        mode={uiMode}
        onModeToggle={handleModeToggle}
        vehicleInfo={vehicleInfo}
        onVehicleInfoOpen={() => setShowVehicleInfo(true)}
      />

      {/* Gauge strip */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: isAdvanced ? "16px" : "48px",
        padding: isAdvanced ? "12px 16px" : "32px 16px",
        flexWrap: isAdvanced ? "nowrap" : "wrap",
        flexShrink: 0,
        borderBottom: isAdvanced ? "1px solid var(--border)" : "none",
        transition: "padding 300ms ease, gap 300ms ease",
      }}>
        <div style={{
          background: "var(--bg-card)",
          borderRadius: "50%",
          padding: isAdvanced ? "12px" : "24px",
          border: "1px solid var(--border)",
          boxShadow: "0 0 40px rgba(0,229,255,0.04)",
        }}>
          <ArcGauge
            value={d.speed_kmh ?? 0}
            min={0} max={220}
            label="Speed" unit="km/h"
            size={heroSize}
            warnAt={0.8} dangerAt={0.92}
            ticks={isAdvanced ? 4 : 7}
          />
        </div>

        <div style={{
          background: "var(--bg-card)",
          borderRadius: "50%",
          padding: isAdvanced ? "10px" : "20px",
          border: "1px solid var(--border)",
          boxShadow: "0 0 40px rgba(0,229,255,0.04)",
        }}>
          <ArcGauge
            value={d.rpm ?? 0}
            min={0} max={8000}
            label="RPM" unit="rpm"
            size={mainSize}
            warnAt={0.75} dangerAt={0.875}
            ticks={isAdvanced ? 4 : 6}
          />
        </div>

        <div style={{
          background: "var(--bg-card)",
          borderRadius: "50%",
          padding: isAdvanced ? "10px" : "18px",
          border: "1px solid var(--border)",
        }}>
          <ArcGauge
            value={d.throttle_pct ?? 0}
            min={0} max={100}
            label="Throttle" unit="%"
            size={smallSize}
            warnAt={0.85} dangerAt={0.95}
            ticks={isAdvanced ? 3 : 5}
            decimals={1}
          />
        </div>

        <div style={{
          background: "var(--bg-card)",
          borderRadius: "50%",
          padding: isAdvanced ? "10px" : "18px",
          border: "1px solid var(--border)",
        }}>
          <ArcGauge
            value={d.coolant_temp_c ?? 0}
            min={50} max={130}
            label="Coolant" unit="°C"
            size={smallSize}
            warnAt={0.75} dangerAt={0.875}
            ticks={isAdvanced ? 3 : 5}
            decimals={1}
          />
        </div>

        <div style={{
          background: "var(--bg-card)",
          borderRadius: isAdvanced ? "12px" : "16px",
          padding: isAdvanced ? "10px 12px" : "18px 20px",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <GForcePanel
            accelX={d.accel_x ?? 0}
            accelY={d.accel_y ?? 0}
            size={smallSize}
          />
        </div>

        {!isAdvanced && (
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "12px",
            padding: "16px 24px",
            border: "1px solid var(--border)",
            width: "min(480px, 90vw)",
          }}>
            <LinearBar
              value={d.engine_load_pct ?? 0}
              label="Engine Load"
              unit="%"
              width={432}
              warnAt={0.75}
              dangerAt={0.9}
            />
          </div>
        )}
      </div>

      {/* Advanced table */}
      {isAdvanced && (
        <AdvancedTable
          allPids={frame?.all_pids ?? {}}
          coreFields={{
            speed_kmh:       d.speed_kmh,
            rpm:             d.rpm,
            throttle_pct:    d.throttle_pct,
            coolant_temp_c:  d.coolant_temp_c,
            engine_load_pct: d.engine_load_pct,
          }}
        />
      )}

      {/* Vehicle info modal */}
      {showVehicleInfo && vehicleInfo && (
        <VehicleInfoPanel
          info={vehicleInfo}
          onClose={() => setShowVehicleInfo(false)}
        />
      )}

      {/* Disconnected toast */}
      {status !== "connected" && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "10px 20px",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 500,
          fontSize: "0.85rem",
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          zIndex: 100,
        }}>
          {status === "connecting"
            ? "Connecting to telemetry bridge..."
            : "Connection lost — retrying..."}
        </div>
      )}
    </div>
  );
}