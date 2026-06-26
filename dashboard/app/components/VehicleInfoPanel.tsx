"use client";

import { useState } from "react";
import { VehicleInfo, decodeVin } from "../hooks/useTelemetry";

interface VehicleInfoPanelProps {
  info: VehicleInfo | null;
  onClose: () => void;
  onVehicleInfoDecoded: (info: VehicleInfo) => void;
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
  const hasData = info && Object.keys(info.extra_fields ?? {}).length > 0;

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
      onVehicleInfoDecoded(decoded);
    } catch {
      setError("Lookup failed. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  // Sort fields alphabetically, pin Make/Model/Year/VIN to top
  const PIN_ORDER = ["Make", "Model", "Model Year", "Vehicle Type", "Body Class"];
  const rows = hasData
    ? [
        ...PIN_ORDER
          .filter(k => info!.extra_fields[k])
          .map(k => ({ label: k, value: info!.extra_fields[k] })),
        ...Object.entries(info!.extra_fields)
          .filter(([k]) => !PIN_ORDER.includes(k))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, value]) => ({ label, value })),
      ]
    : [];

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
        width: "min(520px, 90vw)",
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
          flexShrink: 0,
        }}>
          <div>
            <span style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              letterSpacing: "0.2em",
              color: "var(--text-primary)",
            }}>
              VEHICLE INFORMATION
            </span>
            {info?.vin && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                marginLeft: "12px",
                letterSpacing: "0.05em",
              }}>
                {info.vin}
              </span>
            )}
          </div>
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
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(255,179,0,0.04)",
            flexShrink: 0,
          }}>
            <p style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              marginBottom: "10px",
              lineHeight: 1.5,
            }}>
              VIN not available from this vehicle's ECU. Enter it manually —
              find it on the windshield (driver's side, bottom corner) or door jamb.
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
              }}>
                {error}
              </p>
            )}
          </div>
        )}

        {/* Dynamic fields table */}
        {hasData ? (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {rows.map((row, i) => (
              <div key={row.label} style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr",
                padding: "8px 20px",
                borderBottom: "1px solid rgba(30,30,46,0.6)",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: PIN_ORDER.includes(row.label) ? 600 : 400,
                  fontSize: "0.78rem",
                  letterSpacing: "0.08em",
                  color: PIN_ORDER.includes(row.label) ? "var(--text-primary)" : "var(--text-primary)",
                  textTransform: "uppercase",
                  alignSelf: "center",
                }}>
                  {row.label}
                </span>
                <span style={{
                  fontFamily: PIN_ORDER.includes(row.label)
                    ? "'Rajdhani', sans-serif"
                    : "'JetBrains Mono', monospace",
                  fontWeight: PIN_ORDER.includes(row.label) ? 600 : 400,
                  fontSize: PIN_ORDER.includes(row.label) ? "0.9rem" : "0.78rem",
                  color: PIN_ORDER.includes(row.label)
                    ? "var(--accent-cyan)"
                    : "var(--text-primary)",
                  alignSelf: "center",
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          !vinMissing && (
            <div style={{
              padding: "32px 20px",
              textAlign: "center",
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
            }}>
              No vehicle data available.
            </div>
          )
        )}

        {/* Waiting for entry state */}
        {vinMissing && !hasData && (
          <div style={{
            padding: "24px 20px",
            textAlign: "center",
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
          }}>
            Enter a VIN above to identify this vehicle.
          </div>
        )}

        {/* Footer showing field count */}
        {hasData && (
          <div style={{
            padding: "8px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-panel)",
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
            }}>
              {rows.length} FIELDS · SOURCE: NHTSA vPIC API
            </span>
          </div>
        )}
      </div>
    </>
  );
}