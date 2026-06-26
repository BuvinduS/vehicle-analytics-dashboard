"""
OBD-II Publisher
Reads from ELM327 via /dev/rfcomm0 and publishes to MQTT.

Two modes:
  normal   — queries 5 core PIDs at ~5Hz
  advanced — queries all supported PIDs at ~1Hz

Mode is switched by publishing to telemetry/control:
  {"mode": "advanced"} or {"mode": "normal"}

Run via obd/connect.sh which handles rfcomm setup.
"""

import obd
import paho.mqtt.client as mqtt
import json
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SERIAL_PORT   = "/dev/rfcomm0"
BROKER_HOST   = "localhost"
BROKER_PORT   = 1883
TOPIC_OBD     = "telemetry/vehicle/obd"
TOPIC_CONTROL = "telemetry/control"
SESSION_ID    = "live_001"
DRIVER_ID     = "driver_a"

CORE_COMMANDS = [
    obd.commands.SPEED,
    obd.commands.RPM,
    obd.commands.THROTTLE_POS,
    obd.commands.COOLANT_TEMP,
    obd.commands.ENGINE_LOAD,
]

# PIDs to skip in advanced mode — these are meta/admin commands not useful for display
SKIP_COMMANDS = {
    "PIDS_A", "PIDS_B", "PIDS_C",          # supported PID bitmasks
    "MIDS_A", "MIDS_B", "MIDS_C", "MIDS_D", # monitor ID bitmasks
    "GET_DTC", "CLEAR_DTC", "GET_CURRENT_DTC",
    "ELM_VERSION", "ELM_VOLTAGE",
}

# ---------------------------------------------------------------------------
# Mode state (mutated by MQTT control messages)
# ---------------------------------------------------------------------------

current_mode = "normal"


def on_control_message(client, userdata, msg):
    global current_mode
    try:
        payload = json.loads(msg.payload.decode())
        mode = payload.get("mode")
        if mode in ("normal", "advanced"):
            current_mode = mode
            log.info("Mode switched to: %s", current_mode)
    except Exception as e:
        log.warning("Bad control message: %s", e)


# ---------------------------------------------------------------------------
# Value extraction
# ---------------------------------------------------------------------------

def extract_value(response):
    """Extract a JSON-serialisable value from a python-obd response."""
    if response.is_null():
        return None
    val = response.value
    if hasattr(val, "magnitude"):
        return round(float(val.magnitude), 3)
    if isinstance(val, (int, float)):
        return round(float(val), 3)
    return str(val)


def extract_unit(response):
    """Extract unit string from a python-obd response."""
    if response.is_null():
        return None
    val = response.value
    if hasattr(val, "units"):
        return str(val.units)
    return None


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def query_core(conn):
    """Query the 5 core PIDs. Returns partial payload dict."""
    data = {}
    for cmd in CORE_COMMANDS:
        if cmd in conn.supported_commands:
            r = conn.query(cmd)
            data[cmd.name] = extract_value(r)
    return data


def query_all(conn):
    """Query all supported PIDs. Returns all_pids dict."""
    all_pids = {}
    for cmd in conn.supported_commands:
        if cmd.name in SKIP_COMMANDS:
            continue
        try:
            r = conn.query(cmd)
            all_pids[cmd.name] = {
                "value": extract_value(r),
                "unit":  extract_unit(r),
                "desc":  cmd.desc,
            }
        except Exception as e:
            log.warning("Failed to query %s: %s", cmd.name, e)
            all_pids[cmd.name] = {"value": None, "unit": None, "desc": cmd.desc}
    return all_pids


# ---------------------------------------------------------------------------
# Core PID → payload field name mapping
# Keeps payload shape identical to mock/obd_publisher.py
# ---------------------------------------------------------------------------

CORE_FIELD_MAP = {
    "SPEED":        "speed_kmh",
    "RPM":          "rpm",
    "THROTTLE_POS": "throttle_pct",
    "COOLANT_TEMP": "coolant_temp_c",
    "ENGINE_LOAD":  "engine_load_pct",
}


def build_payload(core_data, all_pids=None):
    payload = {
        "ts":         time.time(),
        "session_id": SESSION_ID,
        "driver_id":  DRIVER_ID,
        "mode":       current_mode,
    }
    # Map core fields to schema-compatible names
    for cmd_name, field_name in CORE_FIELD_MAP.items():
        payload[field_name] = core_data.get(cmd_name)

    if all_pids is not None:
        payload["all_pids"] = all_pids

    return payload


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Connect to MQTT
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_message = on_control_message
    mqtt_client.connect(BROKER_HOST, BROKER_PORT)
    mqtt_client.subscribe(TOPIC_CONTROL)
    mqtt_client.loop_start()
    log.info("MQTT connected to %s:%d", BROKER_HOST, BROKER_PORT)

    # Connect to OBD
    log.info("Connecting to OBD on %s...", SERIAL_PORT)
    conn = obd.OBD(SERIAL_PORT)

    if not conn.is_connected():
        log.error("Failed to connect to OBD. Is rfcomm0 up and engine running?")
        mqtt_client.loop_stop()
        return

    log.info("OBD connected — status: %s", conn.status())
    log.info("Supported commands: %d", len(conn.supported_commands))

    try:
        while True:
            mode = current_mode  # snapshot to avoid mid-loop race

            core_data = query_core(conn)

            if mode == "advanced":
                all_pids = query_all(conn)
                payload  = build_payload(core_data, all_pids)
            else:
                payload = build_payload(core_data)

            mqtt_client.publish(TOPIC_OBD, json.dumps(payload))
            log.debug("Published: speed=%(speed_kmh)s rpm=%(rpm)s", payload)

            # Normal: ~5Hz (limited by OBD query time anyway)
            # Advanced: ~1Hz (many queries, naturally slower)
            time.sleep(0.0 if mode == "advanced" else 0.1)

    except KeyboardInterrupt:
        log.info("Stopping OBD publisher...")
    finally:
        conn.close()
        mqtt_client.loop_stop()
        mqtt_client.disconnect()


if __name__ == "__main__":
    main()