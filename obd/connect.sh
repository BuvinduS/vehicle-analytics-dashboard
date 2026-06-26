#!/bin/bash
MAC="01:23:45:67:89:BA"
CHANNEL=2
REPO="$HOME/vehicle-analytics-dashboard"

source "$REPO/venv/bin/activate"

while true; do
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
            echo "Timed out — is the engine running?"
            kill $RFCOMM_PID 2>/dev/null
            break
        fi
    done

    if [ -e /dev/rfcomm0 ]; then
        echo "Port ready."
        sudo chmod 666 /dev/rfcomm0
        echo "Starting OBD publisher..."
        python3 "$REPO/obd/obd_publisher.py"
        echo "Publisher exited, reconnecting in 3s..."
    fi

    kill $RFCOMM_PID 2>/dev/null
    sudo rfcomm release 0 2>/dev/null
    sleep 3
done