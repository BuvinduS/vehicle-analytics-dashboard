import paho.mqtt.client as mqtt
import psycopg2
import json
import time

DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "telemetry",
    "user":     "telemetry",
    "password": "telemetry",
}

BROKER_HOST = "localhost"
BROKER_PORT = 1883
MERGE_WINDOW = 0.2  # seconds — how long to wait for a matching message

# In-memory buffers keyed by session_id
obd_buffer = {}
imu_buffer = {}

def get_db():
    return psycopg2.connect(**DB_CONFIG)

def write_row(cur, data):
    cur.execute("""
        INSERT INTO telemetry (
            time, session_id,
            speed_kmh, rpm, throttle_pct, coolant_temp_c, engine_load_pct,
            accel_x, accel_y, accel_z,
            latitude, longitude
        ) VALUES (
            to_timestamp(%s), %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s
        )
    """, (
        data.get("ts"),
        data.get("session_id"),
        data.get("speed_kmh"),
        data.get("rpm"),
        data.get("throttle_pct"),
        data.get("coolant_temp_c"),
        data.get("engine_load_pct"),
        data.get("accel_x"),
        data.get("accel_y"),
        data.get("accel_z"),
        data.get("latitude"),
        data.get("longitude"),
    ))

def try_merge_and_write(session_id, db):
    obd = obd_buffer.get(session_id)
    imu = imu_buffer.get(session_id)
    now = time.time()

    # Case 1 — both streams present, merge and write
    if obd and imu:
        combined = {**obd, **imu, "ts": (obd["ts"] + imu["ts"]) / 2}
        with db.cursor() as cur:
            write_row(cur, combined)
        db.commit()
        del obd_buffer[session_id]
        del imu_buffer[session_id]
        return

    # Case 2 — one stream timed out waiting, write partial
    if obd and (now - obd["ts"]) > MERGE_WINDOW:
        with db.cursor() as cur:
            write_row(cur, obd)
        db.commit()
        del obd_buffer[session_id]
        return

    if imu and (now - imu["ts"]) > MERGE_WINDOW:
        with db.cursor() as cur:
            write_row(cur, imu)
        db.commit()
        del imu_buffer[session_id]
        return

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        session_id = payload.get("session_id", "unknown")
        topic = msg.topic

        if topic == "telemetry/vehicle/obd":
            obd_buffer[session_id] = payload
        elif topic == "telemetry/vehicle/imu":
            imu_buffer[session_id] = payload

        try_merge_and_write(session_id, userdata["db"])

    except Exception as e:
        print(f"Error: {e}")
        userdata["db"].rollback()

def main():
    db = get_db()
    print("Connected to TimescaleDB")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, userdata={"db": db})
    client.on_message = on_message
    client.connect(BROKER_HOST, BROKER_PORT)
    client.subscribe("telemetry/#")

    print("Subscribed to telemetry/# — waiting for messages")
    client.loop_forever()

if __name__ == "__main__":
    main()