"use client";

import { VehicleInfo } from "../hooks/useTelemetry";

interface VehicleInfoPanelProps {
  info: VehicleInfo;
  onClose: () => void;
}

interface InfoRow {
  label: string;
  value: string | null | undefined;
}

export default function VehicleInfoPanel({ info, onClose }: VehicleInfoPanelProps) {
  const rows: InfoRow[] = [
    { label: "VIN",              value: info.vin },
    { label: "Make",             value: info.make },
    { label: "Model",            value: info.model },
    { label: "Year",             value: info.year },
    { label: "Trim",             value: info.trim },
    { label: "Body Class",       value: info.body_class },
    { label: "Vehicle Type",     value: info.vehicle_type },
    { label: "Drive Type",       value: info.drive_type },
    { label: "Fuel Type",        value: info.fuel_type },
    { label: "Fuel (Secondary)", value: info.fuel_type_secondary },
    { label: "Electrification",  value: info.electrification_level },
    { label: "Engine",           value: info.engine_l ? `${info.engine_l}L` : null },
    { label: "Cylinders",        value: info.engine_cyl },
    { label: "Transmission",     value: info.transmission },
    { label: "Plant Country",    value: info.plant_country },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 200,
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(480px, 90vw)",
        maxHeight: "80vh",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        zIndex: 201,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
        }}>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.9rem",
            letterSpacing: "0.2em",
            color: "var(--text-primary)",
          }}>
            VEHICLE INFORMATION
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              padding: "3px 10px",
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Rows */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {rows.map((row, i) => {
            const isNull = !row.value;
            return (
              <div key={row.label} style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                padding: "10px 20px",
                borderBottom: "1px solid rgba(30,30,46,0.6)",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                opacity: isNull ? 0.35 : 1,
              }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 500,
                  fontSize: "0.78rem",
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  alignSelf: "center",
                }}>
                  {row.label}
                </span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.82rem",
                  color: isNull ? "var(--text-muted)" : "var(--text-primary)",
                  alignSelf: "center",
                }}>
                  {row.value ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}