#!/bin/bash

# API Server Startup Script for Telco Capability Analysis System
# This script runs on the server to start the API properly

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Telco API Server Startup Script${NC}"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    echo -e "${RED}❌ app.py not found. Please run this script from the backend directory.${NC}"
    exit 1
fi

# Stop any existing processes
echo -e "${YELLOW}🛑 Stopping existing API processes...${NC}"
pkill -f "python.*app.py" 2>/dev/null || true
sleep 2

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3 first.${NC}"
    exit 1
fi

# Set up virtual environment
echo -e "${YELLOW}🐍 Setting up Python virtual environment...${NC}"
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo -e "${YELLOW}📦 Installing/upgrading dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Load environment variables if config file exists
if [ -f "config.env" ]; then
    echo -e "${YELLOW}📋 Loading environment configuration...${NC}"
    export $(cat config.env | grep -v '^#' | xargs)
fi

# Start the API server
echo -e "${YELLOW}🚀 Starting API server...${NC}"
nohup python app.py > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for the server to start
sleep 3

# Check if the server started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ API server started successfully!${NC}"
    echo "📊 Process ID: $BACKEND_PID"
    echo "📄 Log file: backend.log"
    echo ""
    echo -e "${BLUE}🌐 API Endpoints:${NC}"
    echo "  🔗 Main API: http://localhost:8000"
    echo "  📚 API Docs: http://localhost:8000/docs"
    echo "  🔍 Health Check: http://localhost:8000/api/health"
    echo ""
    echo -e "${BLUE}📋 Useful commands:${NC}"
    echo "  📄 View logs: tail -f backend.log"
    echo "  🛑 Stop server: kill $BACKEND_PID"
    echo "  🔄 Restart server: ./api.sh"
else
    echo -e "${RED}❌ API server failed to start!${NC}"
    echo "📄 Check logs: cat backend.log"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 API server is running in the background!${NC}"
echo "💡 You can safely disconnect from SSH - the server will continue running" 