"""
FastAPI WebSocket bridge: MQTT → WebSocket fan-out (bidirectional)
Handles two message types:
  - telemetry frames (from telemetry/vehicle/obd + telemetry/vehicle/imu)
  - vehicle info (from telemetry/vehicle/info) — sent once at connection

Browser can send {"mode": "normal"} or {"mode": "advanced"} to switch OBD mode.
"""

import json
import asyncio
import logging
from contextlib import asynccontextmanager

import paho.mqtt.client as mqtt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BROKER_HOST        = "localhost"
BROKER_PORT        = 1883
TOPIC_OBD          = "telemetry/vehicle/obd"
TOPIC_IMU          = "telemetry/vehicle/imu"
TOPIC_CONTROL      = "telemetry/control"
TOPIC_VEHICLE_INFO = "telemetry/vehicle/info"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# In-memory state
# ---------------------------------------------------------------------------

class TelemetryState:
    def __init__(self):
        self._obd: dict = {}
        self._imu: dict = {}

    def update_obd(self, payload: dict):
        self._obd = payload

    def update_imu(self, payload: dict):
        self._imu = {
            "accel_x": payload.get("accel_x"),
            "accel_y": payload.get("accel_y"),
            "accel_z": payload.get("accel_z"),
        }

    def merged(self) -> dict:
        return {**self._obd, **self._imu}


state = TelemetryState()

# Last known vehicle info — sent to new clients on connect
last_vehicle_info: dict | None = None


# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self._clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._clients.append(ws)
        log.info("Dashboard client connected (total: %d)", len(self._clients))

        # Send last known vehicle info immediately on connect
        if last_vehicle_info:
            try:
                await ws.send_text(json.dumps({
                    "type": "vehicle_info",
                    **last_vehicle_info
                }))
            except Exception:
                pass

    def disconnect(self, ws: WebSocket):
        if ws in self._clients:
            self._clients.remove(ws)
        log.info("Dashboard client disconnected (total: %d)", len(self._clients))

    async def broadcast(self, data: dict):
        if not self._clients:
            return
        message = json.dumps(data)
        dead: list[WebSocket] = []
        for ws in self._clients:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self._clients:
                self._clients.remove(ws)


manager = ConnectionManager()
mqtt_client: mqtt.Client | None = None


# ---------------------------------------------------------------------------
# MQTT
# ---------------------------------------------------------------------------

def make_mqtt_client(loop: asyncio.AbstractEventLoop) -> mqtt.Client:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            log.info("MQTT connected to %s:%d", BROKER_HOST, BROKER_PORT)
            client.subscribe(TOPIC_OBD)
            client.subscribe(TOPIC_IMU)
            client.subscribe(TOPIC_VEHICLE_INFO)
            log.info("Subscribed to OBD, IMU, and vehicle info topics")
        else:
            log.error("MQTT connection failed: reason_code=%s", reason_code)

    def on_message(client, userdata, msg):
        global last_vehicle_info
        try:
            payload = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            log.warning("Bad JSON on topic %s", msg.topic)
            return

        if msg.topic == TOPIC_OBD:
            state.update_obd(payload)
            merged = state.merged()
            asyncio.run_coroutine_threadsafe(manager.broadcast(merged), loop)

        elif msg.topic == TOPIC_IMU:
            state.update_imu(payload)

        elif msg.topic == TOPIC_VEHICLE_INFO:
            last_vehicle_info = payload
            log.info("Vehicle info received: %s %s %s",
                     payload.get("year"), payload.get("make"), payload.get("model"))
            # Broadcast to all connected dashboard clients
            asyncio.run_coroutine_threadsafe(
                manager.broadcast({"type": "vehicle_info", **payload}), loop
            )

    def on_disconnect(client, userdata, flags, reason_code, properties):
        log.warning("MQTT disconnected (reason_code=%s)", reason_code)

    client.on_connect    = on_connect
    client.on_message    = on_message
    client.on_disconnect = on_disconnect

    return client


# ---------------------------------------------------------------------------
# App lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mqtt_client
    loop = asyncio.get_event_loop()
    mqtt_client = make_mqtt_client(loop)

    try:
        mqtt_client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    except Exception as e:
        log.error("Could not connect to MQTT broker: %s", e)

    mqtt_client.loop_start()
    log.info("MQTT client loop started")

    yield

    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    log.info("MQTT client stopped")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Telemetry WS Bridge", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # open for LAN access from any device
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "broker": f"{BROKER_HOST}:{BROKER_PORT}",
        "vehicle": last_vehicle_info,
    }


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            text = await ws.receive_text()
            try:
                msg = json.loads(text)
                if "mode" in msg and mqtt_client:
                    mqtt_client.publish(TOPIC_CONTROL, json.dumps({"mode": msg["mode"]}))
                    log.info("Mode switch forwarded: %s", msg["mode"])
            except json.JSONDecodeError:
                log.warning("Bad JSON from browser: %s", text)
    except WebSocketDisconnect:
        manager.disconnect(ws)