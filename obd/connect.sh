#!/bin/bash
# OBD Publisher Launcher
# Sets up rfcomm Bluetooth serial connection then starts the Python publisher.
# Usage: bash obd/connect.sh

MAC="01:23:45:67:89:BA"
CHANNEL=2
REPO="$HOME/vehicle-analytics-dashboard"

echo "Releasing existing rfcomm0..."
sudo rfcomm release 0 2>/dev/null

echo "Connecting to ELM327 ($MAC) on channel $CHANNEL..."
sudo rfcomm connect 0 "$MAC" "$CHANNEL" &
RFCOMM_PID=$!

echo "Waiting for /dev/rfcomm0..."
TIMEOUT=15
ELAPSED=0
until [ -e /dev/rfcomm0 ]; do
    sleep 0.2
    ELAPSED=$((ELAPSED + 1))
    if [ $ELAPSED -ge $((TIMEOUT * 5)) ]; then
        echo "Timed out waiting for /dev/rfcomm0. Is the engine running?"
        kill $RFCOMM_PID 2>/dev/null
        exit 1
    fi
done

echo "Port ready."
sudo chmod 666 /dev/rfcomm0

echo "Starting OBD publisher..."
source "$REPO/venv/bin/activate"
python3 "$REPO/obd/obd_publisher.py"

# Cleanup rfcomm on exit
kill $RFCOMM_PID 2>/dev/null
sudo rfcomm release 0 2>/dev/null