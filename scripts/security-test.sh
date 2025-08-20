#!/bin/bash

# Blockchain Voting System - Security Testing Script
# This script runs comprehensive security tests and generates detailed reports

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/security-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

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

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install security tools
install_security_tools() {
    log_info "Installing security testing tools..."
    
    # Install Node.js security tools
    if command_exists npm; then
        log_info "Installing npm security packages..."
        npm install -g auditjs
        npm install -g snyk
        npm install -g retire
    fi
    
    # Install Python security tools
    if command_exists pip3; then
        log_info "Installing Python security packages..."
        pip3 install bandit
        pip3 install safety
        pip3 install pip-audit
    fi
    
    # Install system security tools
    if command_exists apt-get; then
        log_info "Installing system security packages..."
        sudo apt-get update
        sudo apt-get install -y nmap nikto dirb
    elif command_exists brew; then
        log_info "Installing system security packages via Homebrew..."
        brew install nmap nikto dirb
    fi
}

# Function to run dependency vulnerability scan
run_dependency_scan() {
    log_info "Running dependency vulnerability scan..."
    
    local report_file="$REPORTS_DIR/dependency-scan-$TIMESTAMP.json"
    local results={}
    
    # NPM audit
    if command_exists npm; then
        log_info "Running npm audit..."
        cd "$PROJECT_ROOT/client"
        npm audit --json > "$REPORTS_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null || true
        
        cd "$PROJECT_ROOT/backend"
        npm audit --json > "$REPORTS_DIR/backend-npm-audit-$TIMESTAMP.json" 2>/dev/null || true
        
        cd "$PROJECT_ROOT/contracts"
        npm audit --json > "$REPORTS_DIR/contracts-npm-audit-$TIMESTAMP.json" 2>/dev/null || true
    fi
    
    # Snyk test
    if command_exists snyk; then
        log_info "Running Snyk security test..."
        cd "$PROJECT_ROOT/client"
        snyk test --json > "$REPORTS_DIR/snyk-client-$TIMESTAMP.json" 2>/dev/null || true
        
        cd "$PROJECT_ROOT/backend"
        snyk test --json > "$REPORTS_DIR/snyk-backend-$TIMESTAMP.json" 2>/dev/null || true
    fi
    
    # Retire.js
    if command_exists retire; then
        log_info "Running Retire.js scan..."
        cd "$PROJECT_ROOT/client"
        retire --outputformat json > "$REPORTS_DIR/retire-client-$TIMESTAMP.json" 2>/dev/null || true
    fi
    
    log_success "Dependency scan completed"
}

# Function to run static code analysis
run_static_analysis() {
    log_info "Running static code analysis..."
    
    # ESLint security rules
    if command_exists npm; then
        log_info "Running ESLint with security rules..."
        cd "$PROJECT_ROOT/client"
        npm run lint > "$REPORTS_DIR/eslint-client-$TIMESTAMP.txt" 2>&1 || true
        
        cd "$PROJECT_ROOT/backend"
        npm run lint > "$REPORTS_DIR/eslint-backend-$TIMESTAMP.txt" 2>&1 || true
    fi
    
    # Bandit (Python security linter)
    if command_exists bandit; then
        log_info "Running Bandit security analysis..."
        find "$PROJECT_ROOT" -name "*.py" -exec bandit -r {} \; > "$REPORTS_DIR/bandit-$TIMESTAMP.txt" 2>&1 || true
    fi
    
    # Semgrep
    if command_exists semgrep; then
        log_info "Running Semgrep security scan..."
        semgrep scan --config auto --json > "$REPORTS_DIR/semgrep-$TIMESTAMP.json" 2>/dev/null || true
    fi
    
    log_success "Static analysis completed"
}

# Function to run smart contract security analysis
run_smart_contract_analysis() {
    log_info "Running smart contract security analysis..."
    
    cd "$PROJECT_ROOT/contracts"
    
    # Slither analysis
    if command_exists slither; then
        log_info "Running Slither analysis..."
        slither . --json "$REPORTS_DIR/slither-$TIMESTAMP.json" 2>/dev/null || true
    fi
    
    # Mythril analysis
    if command_exists myth; then
        log_info "Running Mythril analysis..."
        myth analyze ElectionFactoryUpgradeable.sol --output json > "$REPORTS_DIR/mythril-$TIMESTAMP.json" 2>/dev/null || true
    fi
    
    # Echidna fuzzing
    if command_exists echidna-test; then
        log_info "Running Echidna fuzzing..."
        echidna-test . --config echidna.config.yml > "$REPORTS_DIR/echidna-$TIMESTAMP.txt" 2>&1 || true
    fi
    
    log_success "Smart contract analysis completed"
}

# Function to run web application security tests
run_web_security_tests() {
    log_info "Running web application security tests..."
    
    # Start the application for testing
    log_info "Starting application for security testing..."
    cd "$PROJECT_ROOT"
    
    # Check if Docker is running
    if command_exists docker && docker info >/dev/null 2>&1; then
        log_info "Starting services with Docker Compose..."
        docker-compose up -d
        
        # Wait for services to start
        log_info "Waiting for services to start..."
        sleep 30
        
        # Run security tests
        run_web_tests
        
        # Stop services
        log_info "Stopping services..."
        docker-compose down
    else
        log_warning "Docker not available, skipping web security tests"
    fi
}

# Function to run web tests
run_web_tests() {
    local base_url="http://localhost:3000"
    local api_url="http://localhost:5000"
    
    # Nmap port scan
    if command_exists nmap; then
        log_info "Running Nmap port scan..."
        nmap -sS -sV -p- localhost > "$REPORTS_DIR/nmap-$TIMESTAMP.txt" 2>&1 || true
    fi
    
    # Nikto web vulnerability scanner
    if command_exists nikto; then
        log_info "Running Nikto web vulnerability scan..."
        nikto -h "$base_url" -output "$REPORTS_DIR/nikto-$TIMESTAMP.txt" 2>&1 || true
        nikto -h "$api_url" -output "$REPORTS_DIR/nikto-api-$TIMESTAMP.txt" 2>&1 || true
    fi
    
    # Directory brute force
    if command_exists dirb; then
        log_info "Running directory brute force scan..."
        dirb "$base_url" /usr/share/dirb/wordlists/common.txt > "$REPORTS_DIR/dirb-$TIMESTAMP.txt" 2>&1 || true
    fi
    
    # OWASP ZAP (if available)
    if command_exists zap-cli; then
        log_info "Running OWASP ZAP scan..."
        zap-cli quick-scan --self-contained --start-options "-config api.disablekey=true" "$base_url" > "$REPORTS_DIR/zap-$TIMESTAMP.txt" 2>&1 || true
    fi
    
    # Custom security tests
    run_custom_security_tests "$base_url" "$api_url"
}

# Function to run custom security tests
run_custom_security_tests() {
    local base_url="$1"
    local api_url="$2"
    
    log_info "Running custom security tests..."
    
    # Test for common vulnerabilities
    local tests=(
        "SQL Injection: $api_url/api/users?email=' OR 1=1--"
        "XSS: $base_url/search?q=<script>alert('xss')</script>"
        "CSRF: Testing form submissions"
        "Authentication bypass: Testing protected endpoints"
        "Rate limiting: Testing API limits"
    )
    
    local test_results="$REPORTS_DIR/custom-tests-$TIMESTAMP.txt"
    echo "Custom Security Test Results - $(date)" > "$test_results"
    echo "===============================================" >> "$test_results"
    
    for test in "${tests[@]}"; do
        echo "Test: $test" >> "$test_results"
        echo "Status: Manual verification required" >> "$test_results"
        echo "---" >> "$test_results"
    done
    
    log_success "Custom security tests completed"
}

# Function to run infrastructure security tests
run_infrastructure_tests() {
    log_info "Running infrastructure security tests..."
    
    # Docker security scan
    if command_exists docker; then
        log_info "Running Docker security scan..."
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$PROJECT_ROOT:$PROJECT_ROOT" \
            aquasec/trivy fs "$PROJECT_ROOT" > "$REPORTS_DIR/trivy-$TIMESTAMP.txt" 2>&1 || true
    fi
    
    # Check for sensitive files
    log_info "Checking for sensitive files..."
    find "$PROJECT_ROOT" -name "*.env*" -o -name "*.key" -o -name "*.pem" -o -name "*.p12" > "$REPORTS_DIR/sensitive-files-$TIMESTAMP.txt" 2>/dev/null || true
    
    # Check file permissions
    log_info "Checking file permissions..."
    find "$PROJECT_ROOT" -type f -perm /o+w > "$REPORTS_DIR/world-writable-files-$TIMESTAMP.txt" 2>/dev/null || true
    
    log_success "Infrastructure security tests completed"
}

# Function to generate security report
generate_security_report() {
    log_info "Generating comprehensive security report..."
    
    local report_file="$REPORTS_DIR/security-report-$TIMESTAMP.md"
    
    cat > "$report_file" << EOF
# Security Testing Report

**Generated:** $(date)
**Project:** Blockchain Voting System
**Timestamp:** $TIMESTAMP

## Executive Summary

This report contains the results of comprehensive security testing performed on the blockchain voting system.

## Test Results

### 1. Dependency Vulnerability Scan
- **NPM Audit:** See \`npm-audit-*.json\` files
- **Snyk:** See \`snyk-*.json\` files
- **Retire.js:** See \`retire-*.json\` files

### 2. Static Code Analysis
- **ESLint:** See \`eslint-*.txt\` files
- **Bandit:** See \`bandit-*.txt\` files
- **Semgrep:** See \`semgrep-*.json\` files

### 3. Smart Contract Security
- **Slither:** See \`slither-*.json\` files
- **Mythril:** See \`mythril-*.json\` files
- **Echidna:** See \`echidna-*.txt\` files

### 4. Web Application Security
- **Nmap:** See \`nmap-*.txt\` files
- **Nikto:** See \`nikto-*.txt\` files
- **Directory Brute Force:** See \`dirb-*.txt\` files
- **OWASP ZAP:** See \`zap-*.txt\` files

### 5. Infrastructure Security
- **Docker Security:** See \`trivy-*.txt\` files
- **Sensitive Files:** See \`sensitive-files-*.txt\` files
- **File Permissions:** See \`world-writable-files-*.txt\` files

## Recommendations

1. **Review all identified vulnerabilities** and prioritize fixes
2. **Implement security fixes** for high and medium severity issues
3. **Run security tests regularly** as part of CI/CD pipeline
4. **Monitor for new vulnerabilities** in dependencies
5. **Conduct regular security audits** by external teams

## Next Steps

- [ ] Review and prioritize vulnerabilities
- [ ] Implement security fixes
- [ ] Re-run security tests
- [ ] Update security policies
- [ ] Schedule follow-up security review

---

*This report was generated automatically by the security testing script.*
EOF

    log_success "Security report generated: $report_file"
}

# Function to cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Stop any running services
    if command_exists docker-compose; then
        cd "$PROJECT_ROOT"
        docker-compose down 2>/dev/null || true
    fi
    
    log_success "Cleanup completed"
}

# Main function
main() {
    log_info "Starting comprehensive security testing..."
    log_info "Project root: $PROJECT_ROOT"
    log_info "Reports directory: $REPORTS_DIR"
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    # Install security tools if needed
    if [[ "$1" == "--install" ]]; then
        install_security_tools
    fi
    
    # Run all security tests
    run_dependency_scan
    run_static_analysis
    run_smart_contract_analysis
    run_web_security_tests
    run_infrastructure_tests
    
    # Generate comprehensive report
    generate_security_report
    
    log_success "Security testing completed successfully!"
    log_info "All reports saved to: $REPORTS_DIR"
    
    # Show summary
    echo ""
    echo "📊 Security Testing Summary"
    echo "=========================="
    echo "Reports generated: $(ls -1 "$REPORTS_DIR"/*"$TIMESTAMP"* | wc -l)"
    echo "Total files: $(ls -1 "$REPORTS_DIR" | wc -l)"
    echo "Main report: security-report-$TIMESTAMP.md"
    echo ""
    echo "🔍 Review the reports and address any identified vulnerabilities."
}

# Handle command line arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [--install]"
        echo "  --install: Install security testing tools"
        echo "  no args: Run security tests"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
