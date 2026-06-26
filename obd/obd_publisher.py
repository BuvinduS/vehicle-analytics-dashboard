"""
OBD-II Publisher
Reads from ELM327 via /dev/rfcomm0 and publishes to MQTT.

Two modes:
  normal   — queries 5 core PIDs at ~5Hz
  advanced — queries all supported PIDs at ~1Hz

At startup, queries VIN and decodes vehicle info via NHTSA API,
publishing once to telemetry/vehicle/info.

Mode is switched by publishing to telemetry/control:
  {"mode": "advanced"} or {"mode": "normal"}

Run via obd/connect.sh which handles rfcomm setup.
"""

import obd
import paho.mqtt.client as mqtt
import json
import time
import logging
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SERIAL_PORT        = "/dev/rfcomm0"
BROKER_HOST        = "localhost"
BROKER_PORT        = 1883
TOPIC_OBD          = "telemetry/vehicle/obd"
TOPIC_CONTROL      = "telemetry/control"
TOPIC_VEHICLE_INFO = "telemetry/vehicle/info"
SESSION_ID         = "mock_001"
DRIVER_ID          = "driver_a"
MAX_RETRIES = 5 

NHTSA_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{}?format=json"

CORE_COMMANDS = [
    obd.commands.SPEED,
    obd.commands.RPM,
    obd.commands.THROTTLE_POS,
    obd.commands.COOLANT_TEMP,
    obd.commands.ENGINE_LOAD,
]

SKIP_COMMANDS = {
    "PIDS_A", "PIDS_B", "PIDS_C",
    "MIDS_A", "MIDS_B", "MIDS_C", "MIDS_D",
    "GET_DTC", "CLEAR_DTC", "GET_CURRENT_DTC",
    "ELM_VERSION", "ELM_VOLTAGE",
}

CORE_FIELD_MAP = {
    "SPEED":        "speed_kmh",
    "RPM":          "rpm",
    "THROTTLE_POS": "throttle_pct",
    "COOLANT_TEMP": "coolant_temp_c",
    "ENGINE_LOAD":  "engine_load_pct",
}

# ---------------------------------------------------------------------------
# Mode state
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
# Vehicle info
# ---------------------------------------------------------------------------

def get_vehicle_info(conn, mqtt_client):
    """Query VIN, decode via NHTSA, publish to telemetry/vehicle/info."""
    log.info("Querying VIN...")

    try:
        vin_response = conn.query(obd.commands.VIN)
    except Exception as e:
        log.warning("VIN query failed: %s", e)
        return

    if vin_response.is_null():
        log.warning("VIN not available from this vehicle")
        mqtt_client.publish(TOPIC_VEHICLE_INFO, json.dumps({"vin": None}))
        return

    vin = str(vin_response.value).strip()
    log.info("VIN: %s", vin)

    info = {"vin": vin}

    try:
        r = requests.get(NHTSA_URL.format(vin), timeout=10)
        r.raise_for_status()
        results = r.json().get("Results", [])
        fields = {item["Variable"]: item["Value"] for item in results}

        # Extract useful fields, skip None/"Not Applicable" values
        def get(key):
            v = fields.get(key)
            return v if v and v not in ("Not Applicable", "null", "") else None

        info.update({
            "make":          get("Make"),
            "model":         get("Model"),
            "year":          get("Model Year"),
            "trim":          get("Trim"),
            "body_class":    get("Body Class"),
            "drive_type":    get("Drive Type"),
            "fuel_type":     get("Fuel Type - Primary"),
            "fuel_type_secondary": get("Fuel Type - Secondary"),
            "engine_l":      get("Displacement (L)"),
            "engine_cyl":    get("Engine Number of Cylinders"),
            "transmission":  get("Transmission Style"),
            "plant_country": get("Plant Country"),
            "vehicle_type":  get("Vehicle Type"),
            "electrification_level": get("Electrification Level"),
        })

        log.info("Vehicle: %s %s %s", info.get("year"), info.get("make"), info.get("model"))

    except requests.RequestException as e:
        log.warning("NHTSA lookup failed (no internet?): %s", e)
    except Exception as e:
        log.warning("NHTSA parse error: %s", e)

    mqtt_client.publish(TOPIC_VEHICLE_INFO, json.dumps(info))
    log.info("Vehicle info published")


# ---------------------------------------------------------------------------
# Value extraction
# ---------------------------------------------------------------------------

def extract_value(response):
    if response.is_null():
        return None
    val = response.value
    if hasattr(val, "magnitude"):
        return round(float(val.magnitude), 3)
    if isinstance(val, (int, float)):
        return round(float(val), 3)
    return str(val)


def extract_unit(response):
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
    data = {}
    for cmd in CORE_COMMANDS:
        if cmd in conn.supported_commands:
            r = conn.query(cmd)
            data[cmd.name] = extract_value(r)
    return data


def query_all(conn):
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


def build_payload(core_data, all_pids=None):
    payload = {
        "ts":         time.time(),
        "session_id": SESSION_ID,
        "driver_id":  DRIVER_ID,
        "mode":       current_mode,
    }
    for cmd_name, field_name in CORE_FIELD_MAP.items():
        payload[field_name] = core_data.get(cmd_name)
    if all_pids is not None:
        payload["all_pids"] = all_pids
    return payload


# ---------------------------------------------------------------------------
# OBD connection
# ---------------------------------------------------------------------------

def connect_obd():
    try:
        conn = obd.OBD(SERIAL_PORT, timeout=3)
        if conn.is_connected():
            log.info("OBD connected — status: %s", conn.status())
            log.info("Supported commands: %d", len(conn.supported_commands))
            return conn
        return None
    except Exception as e:
        log.error("OBD connection error: %s", e)
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_message = on_control_message
    mqtt_client.connect(BROKER_HOST, BROKER_PORT)
    mqtt_client.subscribe(TOPIC_CONTROL)
    mqtt_client.loop_start()
    log.info("MQTT connected to %s:%d", BROKER_HOST, BROKER_PORT)

    conn = None
    vehicle_info_published = False

    try:
        retry_count = 0

        while True:
            if conn is None or not conn.is_connected():
                log.info("Connecting to OBD on %s...", SERIAL_PORT)
                conn = connect_obd()
                if conn is None:
                    log.error("OBD connection failed, exiting for connect.sh to reconnect")
                    break  # exit immediately, connect.sh loops
                if not vehicle_info_published:
                    get_vehicle_info(conn, mqtt_client)
                    vehicle_info_published = True

            try:
                mode = current_mode
                core_data = query_core(conn)

                if mode == "advanced":
                    all_pids = query_all(conn)
                    payload  = build_payload(core_data, all_pids)
                else:
                    payload = build_payload(core_data)

                mqtt_client.publish(TOPIC_OBD, json.dumps(payload))
                time.sleep(0.0 if mode == "advanced" else 0.1)

            except Exception as e:
                log.warning("Query error: %s — exiting for connect.sh to reconnect", e)
                try:
                    conn.close()
                except Exception:
                    pass
                break  # exit immediately

    except KeyboardInterrupt:
        log.info("Stopping OBD publisher...")
    finally:
        if conn:
            conn.close()
        mqtt_client.loop_stop()
        mqtt_client.disconnect()


if __name__ == "__main__":
    main()