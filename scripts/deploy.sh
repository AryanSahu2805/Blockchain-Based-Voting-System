#!/bin/bash

# Blockchain Voting System - Production Deployment Script
# This script handles production deployment with health checks and rollback capabilities

set -e

# Configuration
PROJECT_NAME="blockchain-voting-system"
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-ghcr.io}
ROLLBACK_VERSION=${3:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check kubectl if using Kubernetes
    if [[ "$ENVIRONMENT" == "kubernetes" ]]; then
        if ! command -v kubectl &> /dev/null; then
            log_error "kubectl is not installed"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Backup current deployment
backup_deployment() {
    log_info "Creating backup of current deployment..."
    
    if [[ "$ENVIRONMENT" == "kubernetes" ]]; then
        # Backup Kubernetes resources
        kubectl get all -l app=blockchain-voting -o yaml > "backup-$(date +%Y%m%d-%H%M%S).yaml"
    else
        # Backup Docker Compose
        if [ -f "docker-compose.yml" ]; then
            cp docker-compose.yml "docker-compose.backup-$(date +%Y%m%d-%H%M%S).yml"
        fi
    fi
    
    log_success "Backup created successfully"
}

# Deploy to Docker Compose
deploy_docker_compose() {
    log_info "Deploying to Docker Compose environment..."
    
    # Pull latest images
    docker-compose pull
    
    # Update environment variables
    export VERSION=$VERSION
    export ENVIRONMENT=$ENVIRONMENT
    
    # Deploy
    docker-compose up -d --force-recreate
    
    log_success "Docker Compose deployment completed"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes environment..."
    
    # Update deployment manifests
    sed -i "s|image: .*|image: $DOCKER_REGISTRY/$PROJECT_NAME:$VERSION|g" k8s/deployment.yaml
    
    # Apply manifests
    kubectl apply -f k8s/
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/blockchain-voting-backend
    kubectl rollout status deployment/blockchain-voting-frontend
    
    log_success "Kubernetes deployment completed"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts"
        
        # Check frontend
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_success "Frontend health check passed"
        else
            log_warning "Frontend health check failed (attempt $attempt)"
        fi
        
        # Check backend
        if curl -f http://localhost:5000/health > /dev/null 2>&1; then
            log_success "Backend health check passed"
        else
            log_warning "Backend health check failed (attempt $attempt)"
        fi
        
        # Check database
        if docker exec blockchain-voting-system_mongodb_1 mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
            log_success "Database health check passed"
        else
            log_warning "Database health check failed (attempt $attempt)"
        fi
        
        # If all checks pass, break
        if curl -f http://localhost:3000/health > /dev/null 2>&1 && \
           curl -f http://localhost:5000/health > /dev/null 2>&1 && \
           docker exec blockchain-voting-system_mongodb_1 mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
            log_success "All health checks passed!"
            return 0
        fi
        
        # Wait before next attempt
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

# Rollback deployment
rollback() {
    log_warning "Rolling back deployment..."
    
    if [[ -z "$ROLLBACK_VERSION" ]]; then
        log_error "Rollback version not specified"
        exit 1
    fi
    
    if [[ "$ENVIRONMENT" == "kubernetes" ]]; then
        # Rollback Kubernetes deployment
        kubectl rollout undo deployment/blockchain-voting-backend --to-revision=$ROLLBACK_VERSION
        kubectl rollout undo deployment/blockchain-voting-frontend --to-revision=$ROLLBACK_VERSION
    else
        # Rollback Docker Compose
        if [ -f "docker-compose.backup-$(date +%Y%m%d-%H%M%S).yml" ]; then
            docker-compose down
            cp "docker-compose.backup-$(date +%Y%m%d-%H%M%S).yml" docker-compose.yml
            docker-compose up -d
        else
            log_error "No backup found for rollback"
            exit 1
        fi
    fi
    
    log_success "Rollback completed successfully"
}

# Performance testing
performance_test() {
    log_info "Running performance tests..."
    
    # Run Lighthouse CI
    if command -v lighthouse &> /dev/null; then
        lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
        log_success "Lighthouse performance test completed"
    fi
    
    # Run load testing with Artillery
    if command -v artillery &> /dev/null; then
        artillery run backend/artillery-config.yml
        log_success "Artillery load test completed"
    fi
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old containers
    docker container prune -f
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting deployment for $PROJECT_NAME"
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    
    # Check if this is a rollback
    if [[ -n "$ROLLBACK_VERSION" ]]; then
        rollback
        exit 0
    fi
    
    # Run deployment steps
    check_root
    check_prerequisites
    backup_deployment
    
    # Deploy based on environment
    if [[ "$ENVIRONMENT" == "kubernetes" ]]; then
        deploy_kubernetes
    else
        deploy_docker_compose
    fi
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 30
    
    # Run health checks
    if health_check; then
        log_success "Deployment completed successfully!"
        
        # Run performance tests
        performance_test
        
        # Cleanup
        cleanup
        
        log_success "All deployment tasks completed successfully!"
    else
        log_error "Deployment failed health checks"
        log_warning "Consider rolling back to previous version"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "rollback")
        if [[ -z "$2" ]]; then
            log_error "Rollback version must be specified"
            echo "Usage: $0 rollback <version>"
            exit 1
        fi
        ROLLBACK_VERSION=$2
        main
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [environment] [version]"
        echo "  environment: production|staging|kubernetes (default: production)"
        echo "  version: Docker image tag (default: latest)"
        echo "  rollback: Rollback to specified version"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy latest to production"
        echo "  $0 staging v1.2.3    # Deploy v1.2.3 to staging"
        echo "  $0 rollback v1.2.2   # Rollback to v1.2.2"
        exit 0
        ;;
    *)
        main
        ;;
esac
