#!/bin/bash

echo "🚀 Starting Telco Capability Analysis System..."

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Cleanup function
cleanup() {
    echo "🛑 Shutting down services..."
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "🛑 Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        echo "🛑 Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    echo "🧹 Final cleanup..."
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "python.*app.py" 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "🔍 Checking for existing processes..."
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true
echo "🧹 Cleaned up existing processes"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd web
npm install
cd ..

# Set up Python virtual environment
echo "🐍 Activating virtual environment..."
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt
cd ..

# Load environment variables
if [ -f "backend/config.env" ]; then
    echo "📋 Loading environment configuration..."
    export $(cat backend/config.env | grep -v '^#' | xargs)
fi

# Start backend
echo "🔧 Starting modular backend API server..."
cd backend
python app.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start"
    cleanup
fi

# Start frontend
echo "🌐 Starting frontend development server..."
cd web
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start"
    cleanup
fi

echo "✅ All services started successfully!"
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🔐 Default Users:"
echo "  👤 Admin: admin/admin123"
echo "  👤 Analyst: analyst/analyst123"
echo "  👤 Viewer: viewer/viewer123"

# Keep script running
wait 