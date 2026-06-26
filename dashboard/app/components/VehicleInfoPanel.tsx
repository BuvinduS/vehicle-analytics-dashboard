"use client";

import { useState } from "react";
import { VehicleInfo, decodeVin } from "../hooks/useTelemetry";

interface VehicleInfoPanelProps {
  info: VehicleInfo | null;
  onClose: () => void;
  onVehicleInfoDecoded: (info: VehicleInfo) => void;
}

interface InfoRow {
  label: string;
  value: string | null | undefined;
}

function buildRows(info: VehicleInfo): InfoRow[] {
  return [
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
}

export default function VehicleInfoPanel({
  info,
  onClose,
  onVehicleInfoDecoded,
}: VehicleInfoPanelProps) {
  const [vinInput, setVinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vinMissing = !info?.vin;

  async function handleVinSubmit() {
    const vin = vinInput.trim().toUpperCase();
    if (vin.length !== 17) {
      setError("VIN must be exactly 17 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const decoded = await decodeVin(vin);
      if (!decoded.make) {
        setError("Could not decode this VIN. Please check and try again.");
        return;
      }
      onVehicleInfoDecoded(decoded as VehicleInfo);
    } catch (e) {
      setError("Lookup failed. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

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

        {/* Manual VIN entry — shown when VIN not available from ECU */}
        {vinMissing && (
          <div style={{
            padding: "20px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(255,179,0,0.04)",
          }}>
            <p style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              marginBottom: "12px",
              lineHeight: 1.5,
            }}>
              VIN not available from this vehicle's ECU. Enter it manually to
              identify the vehicle — find it on the windshield (driver's side,
              bottom corner) or the driver's door jamb.
            </p>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={vinInput}
                onChange={e => setVinInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleVinSubmit()}
                placeholder="17-CHARACTER VIN"
                maxLength={17}
                style={{
                  flex: 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.82rem",
                  letterSpacing: "0.1em",
                  padding: "8px 12px",
                  background: "var(--bg-panel)",
                  border: `1px solid ${error ? "var(--accent-red)" : "var(--border)"}`,
                  borderRadius: "6px",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              <button
                onClick={handleVinSubmit}
                disabled={loading || vinInput.length !== 17}
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.15em",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: vinInput.length === 17 && !loading
                    ? "var(--accent-cyan)"
                    : "var(--bg-panel)",
                  color: vinInput.length === 17 && !loading
                    ? "var(--bg-base)"
                    : "var(--text-muted)",
                  cursor: vinInput.length === 17 && !loading ? "pointer" : "not-allowed",
                  transition: "all 200ms ease",
                  minWidth: "60px",
                }}
              >
                {loading ? "..." : "GO"}
              </button>
            </div>

            {error && (
              <p style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: "0.75rem",
                color: "var(--accent-red)",
                marginTop: "6px",
                letterSpacing: "0.05em",
              }}>
                {error}
              </p>
            )}
          </div>
        )}

        {/* Info rows — shown when VIN is available (auto or manual) */}
        {info && !vinMissing && (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {buildRows(info).map((row, i) => {
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
        )}

        {/* State: VIN missing and no info yet — just the input, no rows */}
        {vinMissing && !info?.make && (
          <div style={{
            padding: "20px",
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            textAlign: "center",
            letterSpacing: "0.1em",
          }}>
            Enter a VIN above to identify this vehicle.
          </div>
        )}

        {/* State: VIN was manually entered, now show rows */}
        {vinMissing && info?.make && (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {buildRows(info).map((row, i) => {
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
        )}
      </div>
    </>
  );
}