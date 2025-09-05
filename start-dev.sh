#!/bin/bash

# GATE Exam Simulator - Development Startup Script
# This script starts both backend and frontend servers for phone access

echo "🚀 Starting GATE Exam Simulator Development Environment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the local IP address
LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="192.168.1.5"  # fallback IP
fi

echo -e "${BLUE}📍 Local IP Address: ${LOCAL_IP}${NC}"
echo ""

# Function to kill existing processes
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
    pkill -f "npm.*start" 2>/dev/null
    pkill -f "npm.*dev" 2>/dev/null
    pkill -f "node.*server" 2>/dev/null
    sleep 2
}

# Function to start backend
start_backend() {
    echo -e "${GREEN}🗄️  Starting Backend Server...${NC}"
    cd backend
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}   Backend PID: $BACKEND_PID${NC}"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo -e "${GREEN}🌐 Starting Frontend Server...${NC}"
    cd frontend
    HOST=0.0.0.0 npm start &
    FRONTEND_PID=$!
    echo -e "${GREEN}   Frontend PID: $FRONTEND_PID${NC}"
    cd ..
}

# Trap to cleanup on exit
trap cleanup EXIT

# Main execution
cleanup

echo -e "${YELLOW}⏳ Starting servers...${NC}"
echo ""

# Start backend
start_backend
sleep 3

# Start frontend
start_frontend
sleep 5

echo ""
echo "✅ Development Environment Started!"
echo "=================================================="
echo -e "${GREEN}📱 Access URLs:${NC}"
echo -e "   Frontend (Computer): ${BLUE}http://localhost:3000${NC}"
echo -e "   Frontend (Phone):    ${BLUE}http://${LOCAL_IP}:3000${NC}"
echo -e "   Backend (Computer):  ${BLUE}http://localhost:8001${NC}"
echo -e "   Backend (Phone):     ${BLUE}http://${LOCAL_IP}:8001${NC}"
echo ""
echo -e "${YELLOW}📝 Instructions:${NC}"
echo "   1. Make sure your phone is on the same WiFi network"
echo "   2. Open your phone browser and go to: http://${LOCAL_IP}:3000"
echo "   3. Use Ctrl+C to stop both servers"
echo ""
echo -e "${GREEN}🏃 Servers are running... Press Ctrl+C to stop${NC}"

# Wait for user interrupt
wait
