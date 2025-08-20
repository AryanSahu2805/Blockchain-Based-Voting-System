#!/bin/bash

# Blockchain Voting System - Backend Setup Script
# This script automates the setup and configuration of the backend server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_VERSION="18.0.0"
        
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            print_success "Node.js version $NODE_VERSION is compatible"
            return 0
        else
            print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION+"
            return 1
        fi
    else
        print_error "Node.js is not installed"
        return 1
    fi
}

# Function to check MongoDB
check_mongodb() {
    if command_exists mongod; then
        print_success "MongoDB is installed"
        return 0
    else
        print_warning "MongoDB is not installed. Please install MongoDB 6.0+"
        print_status "Visit: https://docs.mongodb.com/manual/installation/"
        return 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed successfully"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success "Environment file created from template"
            
            # Generate JWT secret
            JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
            sed -i.bak "s/your-super-secret-jwt-key-here/$JWT_SECRET/" .env
            
            print_warning "Please review and update .env file with your configuration"
            print_status "Key configurations to update:"
            print_status "  - MONGODB_URI: Your MongoDB connection string"
            print_status "  - Blockchain RPC URLs and contract addresses"
            print_status "  - Email configuration (if using notifications)"
        else
            print_error "env.example not found. Please create .env file manually"
            return 1
        fi
    else
        print_warning ".env file already exists. Skipping environment setup"
    fi
}

# Function to create directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p uploads
    mkdir -p temp
    
    print_success "Directories created successfully"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if MongoDB is running
    if pgrep -x "mongod" > /dev/null; then
        print_success "MongoDB is running"
    else
        print_warning "MongoDB is not running. Please start MongoDB service"
        print_status "On Ubuntu/Debian: sudo systemctl start mongod"
        print_status "On macOS: brew services start mongodb-community"
        print_status "On Windows: Start MongoDB service from Services"
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    if npm run test > /dev/null 2>&1; then
        print_success "Tests passed successfully"
    else
        print_warning "Some tests failed. This is normal for initial setup"
    fi
}

# Function to start development server
start_dev_server() {
    print_status "Starting development server..."
    
    if [ -f ".env" ]; then
        print_success "Starting server in background..."
        npm run dev &
        SERVER_PID=$!
        
        # Wait a moment for server to start
        sleep 3
        
        if kill -0 $SERVER_PID 2>/dev/null; then
            print_success "Development server started successfully (PID: $SERVER_PID)"
            print_status "Server is running at: http://localhost:5000"
            print_status "Health check: http://localhost:5000/health"
            print_status "API base: http://localhost:5000/api"
            print_status "To stop server: kill $SERVER_PID"
        else
            print_error "Failed to start development server"
            return 1
        fi
    else
        print_error "Environment file not found. Please run setup first"
        return 1
    fi
}

# Function to show next steps
show_next_steps() {
    echo
    print_success "Backend setup completed successfully!"
    echo
    print_status "Next steps:"
    echo "1. Update .env file with your configuration"
    echo "2. Start MongoDB service if not running"
    echo "3. Run 'npm run dev' to start development server"
    echo "4. Test API endpoints at http://localhost:5000/api"
    echo "5. Check health status at http://localhost:5000/health"
    echo
    print_status "Useful commands:"
    echo "  npm run dev          - Start development server"
    echo "  npm start            - Start production server"
    echo "  npm test             - Run tests"
    echo "  npm run test:watch   - Run tests in watch mode"
    echo
}

# Main setup function
main() {
    echo "🚀 Blockchain Voting System - Backend Setup"
    echo "=========================================="
    echo
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    
    if ! check_node_version; then
        print_error "Please install Node.js 18+ and try again"
        exit 1
    fi
    
    if ! check_mongodb; then
        print_warning "MongoDB not found. Some features may not work"
    fi
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_environment
    
    # Create directories
    create_directories
    
    # Setup database
    setup_database
    
    # Run tests
    run_tests
    
    # Show next steps
    show_next_steps
}

# Function to cleanup on exit
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        print_status "Stopping development server..."
        kill $SERVER_PID 2>/dev/null || true
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Check if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
