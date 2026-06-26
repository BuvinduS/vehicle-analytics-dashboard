"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface PidEntry {
  value: number | null;
  unit: string | null;
  desc: string;
}

export interface TelemetryFrame {
  ts: number;
  session_id: string;
  mode: "normal" | "advanced";
  speed_kmh: number | null;
  rpm: number | null;
  throttle_pct: number | null;
  coolant_temp_c: number | null;
  engine_load_pct: number | null;
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  all_pids?: Record<string, PidEntry>;
}

export interface VehicleInfo {
  vin: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  extra_fields: Record<string, string>; // all non-null fields from NHTSA
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";
const RECONNECT_DELAY_MS = 2000;

// Fields to skip — metadata/internal NHTSA fields not useful for display
const SKIP_FIELDS = new Set([
  "Error Code", "Error Text", "Possible Values", "Additional Error Text",
  "Suggested VIN", "vehicleDescriptor",
]);

export async function decodeVin(vin: string): Promise<VehicleInfo> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin.trim()}?format=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NHTSA request failed: ${r.status}`);
  const json = await r.json();
  const results: { Variable: string; Value: string }[] = json.Results ?? [];

  // Collect all non-null, non-empty, non-zero fields
  const extra_fields: Record<string, string> = {};
  for (const item of results) {
    const v = item.Value?.trim();
    if (
      v &&
      v !== "Not Applicable" &&
      v !== "null" &&
      v !== "" &&
      v !== "0" &&
      !SKIP_FIELDS.has(item.Variable)
    ) {
      extra_fields[item.Variable] = v;
    }
  }

  return {
    vin:          vin.trim().toUpperCase(),
    make:         extra_fields["Make"] ?? null,
    model:        extra_fields["Model"] ?? null,
    year:         extra_fields["Model Year"] ?? null,
    extra_fields,
  };
}

export function useTelemetry() {
  const [frame, setFrame] = useState<TelemetryFrame | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "vehicle_info") {
          const { type, ...info } = data;
          setVehicleInfo(prev => {
            // Don't overwrite manually entered info with a null VIN from Pi
            if (prev?.vin && !info.vin) return prev;
            return info as VehicleInfo;
          });
        } else {
          setFrame(data as TelemetryFrame);
        }
      } catch {
        console.warn("Failed to parse message", event.data);
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      retryRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => ws.close();
  }, []);

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { frame, vehicleInfo, setVehicleInfo, status, sendMessage };
}