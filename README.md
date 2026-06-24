# Vehicle Analytics Dashboard

A motorsport telemetry and driver performance platform built as a semester embedded systems project. An ESP32 reads IMU data via MPU6050 and a Raspberry Pi 5 reads OBD-II data via a Bluetooth ELM327 adapter — both publish over MQTT to a local pipeline that ingests into TimescaleDB and streams live to a custom dashboard.

---

## Architecture

```
[Raspberry Pi 5]          [ESP32]
  python-obd                MPU6050
  ELM327 (BT)               │
      │                     │
      ▼                     ▼
  obd_publisher.py      imu_publisher.py
      │                     │
      └──────────┬──────────┘
                 ▼
         Mosquitto (MQTT)
         telemetry/#
                 │
        ┌────────┴────────┐
        ▼                 ▼
  mqtt_ingestor.py    api/main.py
  (TimescaleDB)       (FastAPI WS bridge)
                           │
                           ▼
                    dashboard/ (Next.js)
                    localhost:3000
```

---

## Project Structure

```
vehicle-analytics-dashboard/
├── compose.yaml              # Docker Compose — Mosquitto + TimescaleDB
├── requirements.txt          # Python dependencies (shared venv)
├── db/
│   └── schema.sql            # TimescaleDB schema + hypertable setup
├── mosquitto/
│   └── config/
│       └── mosquitto.conf
├── mock/
│   ├── obd_publisher.py      # Simulates ELM327 OBD-II data at 10 Hz
│   └── imu_publisher.py      # Simulates MPU6050 IMU data
├── ingestor/
│   └── mqtt_ingestor.py      # Merges OBD + IMU streams, writes to DB
├── api/
│   └── main.py               # FastAPI WebSocket bridge (MQTT → browser)
└── dashboard/                # Next.js live dashboard
    └── app/
        ├── page.tsx
        ├── hooks/
        │   └── useTelemetry.ts
        └── components/
            ├── ArcGauge.tsx
            ├── GForcePanel.tsx
            ├── LinearBar.tsx
            └── StatusBar.tsx
```

---

## Prerequisites

- Docker + Docker Compose
- Python 3.11+
- Node.js 20+ (via nvm recommended)
- A virtual environment at `venv/`

---

## Running Locally

**1. Start infrastructure**
```bash
docker compose up
```

**2. Activate the venv**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**3. Start the ingestor**
```bash
python ingestor/mqtt_ingestor.py
```

**4. Start mock publishers** (until real hardware is connected)
```bash
python mock/obd_publisher.py &
python mock/imu_publisher.py
```

**5. Start the FastAPI WebSocket bridge**
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**6. Start the dashboard**
```bash
cd dashboard
npm install      # first time only
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## MQTT Topics

| Topic | Publisher | Payload fields |
|---|---|---|
| `telemetry/vehicle/obd` | Pi / `obd_publisher.py` | `ts`, `session_id`, `speed_kmh`, `rpm`, `throttle_pct`, `coolant_temp_c`, `engine_load_pct` |
| `telemetry/vehicle/imu` | ESP32 / `imu_publisher.py` | `ts`, `session_id`, `accel_x`, `accel_y`, `accel_z` |

---

## Dashboard Gauges

| Gauge | Source | Range | Warn | Danger |
|---|---|---|---|---|
| Speed | OBD | 0–220 km/h | 176 | 202 |
| RPM | OBD | 0–8000 | 6000 | 7000 |
| Throttle | OBD | 0–100% | 85% | 95% |
| Coolant Temp | OBD | 50–130°C | 110°C | 120°C |
| G-Force | IMU | ±2g | 0.6g | 1.2g |
| Engine Load | OBD | 0–100% | 75% | 90% |

---

## Hardware (Production)

| Component | Role |
|---|---|
| Raspberry Pi 5 | OBD reader, MQTT publisher, runs full pipeline |
| ESP32 (SuperMini C3) | IMU data acquisition |
| MPU6050 | 6-axis accelerometer/gyroscope |
| ELM327 (Bluetooth) | OBD-II vehicle interface |
| Neo-6M GPS | Planned — latitude/longitude fields already in schema |

---

## Environment Variables

`dashboard/.env.local`:
```
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## Database

TimescaleDB (PostgreSQL 16) with a `telemetry` hypertable partitioned by time. A continuous aggregate view `telemetry_1min` pre-computes per-minute averages for historical queries.

Connect directly:
```bash
psql -h localhost -U telemetry -d telemetry
```