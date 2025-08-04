#!/bin/bash

# Default to dev mode if no parameter provided
MODE=${1:-dev}

# Show usage if invalid mode
if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
    echo "❌ Invalid mode: $MODE"
    echo "Usage: ./start.sh [dev|prod]"
    echo "  dev  - Development mode (default)"
    echo "  prod - Production mode"
    exit 1
fi

echo "🚀 Starting Telco Capability Analysis System in $MODE mode..."

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

# Function to preserve correct build files
preserve_build() {
    if [ -f "web/dist/assets/index-DsIUDoLN.js" ]; then
        echo "💾 Preserving correct build files..."
        cp web/dist/assets/index-DsIUDoLN.js web/dist/assets/index-DsIUDoLN.js.backup 2>/dev/null || true
        cp web/dist/index.html web/dist/index.html.backup 2>/dev/null || true
    fi
}

# Function to restore correct build files
restore_build() {
    if [ -f "web/dist/assets/index-DsIUDoLN.js.backup" ]; then
        echo "🔄 Restoring correct build files..."
        cp web/dist/assets/index-DsIUDoLN.js.backup web/dist/assets/index-DsIUDoLN.js 2>/dev/null || true
        cp web/dist/index.html.backup web/dist/index.html 2>/dev/null || true
        rm web/dist/assets/index-DsIUDoLN.js.backup 2>/dev/null || true
        rm web/dist/index.html.backup 2>/dev/null || true
    fi
}

# Cleanup function
cleanup() {
    echo "🛑 Shutting down services..."
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

# Set production environment variables
if [ "$MODE" = "prod" ]; then
    echo "🔧 Setting production environment variables..."
    export VITE_API_BASE_URL=https://telco-platform.openbiocure.ai
    echo "✅ VITE_API_BASE_URL set to: $VITE_API_BASE_URL"
fi

# Start backend based on mode
if [ "$MODE" = "prod" ]; then
    echo "🔧 Starting modular backend API server in production mode (nohup)..."
    cd backend
    nohup python app.py > backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
else
    echo "🔧 Starting modular backend API server..."
    cd backend
    python app.py &
    BACKEND_PID=$!
    cd ..
fi

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start"
    cleanup
fi

# Build frontend for development only
if [ "$MODE" = "dev" ]; then
    echo "🔨 Building frontend for development..."
    cd web
    npm run build
    cd ..
    echo "✅ Frontend built successfully"
fi

# Start frontend based on mode
if [ "$MODE" = "prod" ]; then
    echo "🌐 Production mode: Frontend will be served by FastAPI backend"
    echo "✅ No separate frontend server needed - static files mounted in FastAPI"
else
    echo "🌐 Starting frontend development server..."
    cd web
    npm run dev &
    FRONTEND_PID=$!
    cd ..
fi

# Wait a moment for backend to fully start
sleep 3

echo "✅ All services started successfully!"
if [ "$MODE" = "prod" ]; then
    echo "🌐 Frontend & Backend: http://localhost:8000 (Production - Single FastAPI server)"
    echo "📚 API Docs: http://localhost:8000/docs"
    echo ""
    echo "📋 Log files:"
    echo "  📄 Backend logs: backend/backend.log"
    echo ""
    echo "💡 Services will continue running after you disconnect from SSH"
else
    echo "🌐 Frontend: http://localhost:5173 (Development)"
    echo "🔧 Backend: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
fi
echo ""
echo "🔐 Default Users:"
echo "  👤 Admin: admin/admin123"
echo "  👤 Analyst: analyst/analyst123"
echo "  👤 Viewer: viewer/viewer123"

# Keep script running based on mode
if [ "$MODE" = "prod" ]; then
    echo ""
    echo "🚀 Production mode: Services are running in background with nohup"
    echo "📊 You can safely disconnect from SSH - services will continue running"
    echo "🔍 To check logs: tail -f backend/backend.log or tail -f web/frontend.log"
    echo "🛑 To stop services: pkill -f 'python.*app.py' && pkill -f 'npm.*start:prod'"
    exit 0
else
    # Keep script running for development mode
    wait
fi 