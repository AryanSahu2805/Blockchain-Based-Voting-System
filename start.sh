#!/bin/bash

echo "🚀 Starting Blockchain Voting Platform..."
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "   Please upgrade Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
else
    echo "✅ Backend dependencies already installed"
fi

# Setup backend environment
if [ ! -f ".env" ]; then
    echo "🔧 Setting up backend environment..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo "✅ Environment file created. Please update .env with your configuration"
    else
        echo "❌ env.example not found"
        exit 1
    fi
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../client
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
else
    echo "✅ Frontend dependencies already installed"
fi

# Install smart contract dependencies
echo "📦 Installing smart contract dependencies..."
cd ../contracts
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install smart contract dependencies"
        exit 1
    fi
else
    echo "✅ Smart contract dependencies already installed"
fi

# Compile smart contracts
echo "🔨 Compiling smart contracts..."
npx hardhat compile
if [ $? -ne 0 ]; then
    echo "❌ Failed to compile smart contracts"
    exit 1
fi

echo "✅ Smart contracts compiled successfully"

# Start backend server in background
echo "🔧 Starting backend server..."
cd ../backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend development server
echo "🌐 Starting frontend development server..."
cd ../client
echo "   Frontend will be available at: http://localhost:3000"
echo "   Backend API will be available at: http://localhost:5000"
echo "   Press Ctrl+C to stop all servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

npm start
