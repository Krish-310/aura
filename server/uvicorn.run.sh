#!/usr/bin/env bash

# Default port
PORT=${PORT:-8787}

# Function to check if port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    local pid=$(lsof -t -i :$1)
    if [ ! -z "$pid" ]; then
        echo "Killing process $pid on port $1"
        kill $pid
        sleep 2
    fi
}

# Check if port is in use and kill if necessary
if check_port $PORT; then
    echo "Port $PORT is in use. Attempting to free it..."
    kill_port $PORT
    
    # Wait a bit and check again
    sleep 1
    if check_port $PORT; then
        echo "Warning: Port $PORT is still in use. Trying next available port..."
        PORT=$((PORT + 1))
        while check_port $PORT && [ $PORT -lt $((${PORT:-8787} + 10)) ]; do
            PORT=$((PORT + 1))
        done
        echo "Using port $PORT instead"
    fi
fi

echo "Starting uvicorn on port $PORT..."
uvicorn app.app:app --host 0.0.0.0 --port $PORT --reload
