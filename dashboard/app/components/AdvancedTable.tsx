"use client";

import { PidEntry } from "../hooks/useTelemetry";

interface AdvancedTableProps {
  allPids: Record<string, PidEntry>;
  // Core PIDs to pin at the top
  coreFields: Record<string, number | null>;
}

// Maps OBD command names to friendly display names for core fields
const CORE_PID_NAMES: Record<string, string> = {
  SPEED:        "Vehicle Speed",
  RPM:          "Engine RPM",
  THROTTLE_POS: "Throttle Position",
  COOLANT_TEMP: "Coolant Temperature",
  ENGINE_LOAD:  "Calculated Engine Load",
};

const CORE_PID_UNITS: Record<string, string> = {
  SPEED:        "km/h",
  RPM:          "rpm",
  THROTTLE_POS: "%",
  COOLANT_TEMP: "°C",
  ENGINE_LOAD:  "%",
};

interface Row {
  name: string;
  desc: string;
  value: number | string | null;
  unit: string | null;
  isCore: boolean;
}

function buildRows(
  allPids: Record<string, PidEntry>,
  coreFields: Record<string, number | null>
): Row[] {
  const coreRows: Row[] = Object.entries(CORE_PID_NAMES).map(([key, name]) => ({
    name,
    desc: name,
    value: coreFields[key.toLowerCase().replace("_pos", "_pct").replace("speed", "speed_kmh")
      .replace("rpm", "rpm").replace("throttle_pct", "throttle_pct")
      .replace("coolant_temp_c", "coolant_temp_c").replace("engine_load_pct", "engine_load_pct")] ?? null,
    unit: CORE_PID_UNITS[key],
    isCore: true,
  }));

  // All other PIDs alphabetically, excluding ones already shown as core
  const coreKeys = new Set(Object.keys(CORE_PID_NAMES));
  const otherRows: Row[] = Object.entries(allPids)
    .filter(([key]) => !coreKeys.has(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => ({
      name: entry.desc,
      desc: entry.desc,
      value: entry.value,
      unit: entry.unit,
      isCore: false,
    }));

  return [...coreRows, ...otherRows];
}

export default function AdvancedTable({ allPids, coreFields }: AdvancedTableProps) {
  const rows = buildRows(allPids, coreFields);
  const hasData = Object.keys(allPids).length > 0;

  return (
    <div style={{
      flex: 1,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      margin: "0 16px 16px",
      background: "var(--bg-card)",
      borderRadius: "12px",
      border: "1px solid var(--border)",
    }}>
      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 180px 120px",
        padding: "10px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-panel)",
        borderRadius: "12px 12px 0 0",
      }}>
        {["PARAMETER", "VALUE", "UNIT"].map((h) => (
          <span key={h} style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 600,
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            color: "var(--text-muted)",
          }}>{h}</span>
        ))}
      </div>

      {/* Scrollable rows */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {!hasData ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "0.85rem",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
          }}>
            Waiting for advanced data...
          </div>
        ) : (
          rows.map((row, i) => {
            const isNull = row.value === null || row.value === undefined;
            const isCoreDivider = i === Object.keys(CORE_PID_NAMES).length;

            return (
              <div key={`${row.name}-${i}`}>
                {/* Divider between core and other PIDs */}
                {isCoreDivider && (
                  <div style={{
                    borderTop: "1px solid var(--border)",
                    margin: "0",
                    padding: "4px 20px",
                    background: "var(--bg-panel)",
                  }}>
                    <span style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: "0.65rem",
                      letterSpacing: "0.2em",
                      color: "var(--text-muted)",
                    }}>ALL PIDS</span>
                  </div>
                )}

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px 120px",
                  padding: "8px 20px",
                  borderBottom: "1px solid rgba(30,30,46,0.6)",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  opacity: isNull ? 0.35 : 1,
                  transition: "opacity 200ms ease",
                }}>
                  {/* Parameter name */}
                  <span style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: row.isCore ? 600 : 400,
                    fontSize: "0.82rem",
                    color: row.isCore ? "var(--text-primary)" : "var(--text-primary)",
                    letterSpacing: "0.02em",
                    alignSelf: "center",
                  }}>
                    {row.name}
                  </span>

                  {/* Value */}
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: row.isCore ? 700 : 400,
                    fontSize: row.isCore ? "0.95rem" : "0.82rem",
                    color: isNull
                      ? "var(--text-muted)"
                      : row.isCore
                      ? "var(--accent-cyan)"
                      : "var(--text-primary)",
                    alignSelf: "center",
                  }}>
                    {isNull ? "—" : typeof row.value === "number"
                      ? row.value.toFixed(row.isCore ? 1 : 2)
                      : String(row.value)}
                  </span>

                  {/* Unit */}
                  <span style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    letterSpacing: "0.05em",
                    alignSelf: "center",
                  }}>
                    {row.unit ?? "—"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}