#!/usr/bin/env bash
# One-Click Launch Script for World of Trade Web Application
# 100% Free Tier • Local execution on macOS

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR" || exit 1

PORT=8080

echo "================================================================="
echo "   WORLD OF TRADE: INTERACTIVE STATUTORY WEB DASHBOARD           "
echo "   100% Free Tier • Running on macOS at http://localhost:$PORT   "
echo "================================================================="

# Check if port is already in use, otherwise start server
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "Server is already running on port $PORT."
else
    echo "Starting local Python web server on port $PORT..."
    python3 server.py $PORT &
    SERVER_PID=$!
    sleep 1.5
fi

# Open in default Mac browser
echo "Opening dashboard in your web browser..."
open "http://localhost:$PORT"

echo "Web application is active. Press Ctrl+C in this terminal when you wish to stop."
wait
