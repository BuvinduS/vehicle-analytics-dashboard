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

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";
const RECONNECT_DELAY_MS = 2000;

export function useTelemetry() {
  const [frame, setFrame] = useState<TelemetryFrame | null>(null);
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
        const data: TelemetryFrame = JSON.parse(event.data);
        setFrame(data);
      } catch {
        console.warn("Failed to parse telemetry frame", event.data);
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      retryRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => ws.close();
  }, []);

  // Send a message to the server (e.g. mode switch)
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

  return { frame, status, sendMessage };
}