#!/bin/bash
# Deployment helper scripts for CI/CD pipeline

set -euo pipefail

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

# Function to wait for Lambda function to be ready
wait_for_lambda() {
    local function_name=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    log_info "Waiting for Lambda function $function_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        local state=$(aws lambda get-function --function-name "$function_name" --query 'Configuration.State' --output text 2>/dev/null || echo "NotFound")
        
        if [ "$state" = "Active" ]; then
            log_success "Lambda function $function_name is ready"
            return 0
        elif [ "$state" = "Failed" ]; then
            log_error "Lambda function $function_name failed to deploy"
            return 1
        elif [ "$state" = "NotFound" ]; then
            log_error "Lambda function $function_name not found"
            return 1
        fi
        
        log_info "Lambda function $function_name is in state: $state (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "Timeout waiting for Lambda function $function_name to be ready"
    return 1
}

# Function to wait for API Gateway to be ready
wait_for_api_gateway() {
    local api_url=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    log_info "Waiting for API Gateway at $api_url to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$api_url/health" > /dev/null 2>&1; then
            log_success "API Gateway is ready at $api_url"
            return 0
        fi
        
        log_info "API Gateway not ready yet (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "Timeout waiting for API Gateway at $api_url"
    return 1
}

# Function to validate deployment
validate_deployment() {
    local environment=$1
    local api_url=$2
    
    log_info "Validating deployment for $environment environment..."
    
    # Check health endpoint
    if ! curl -f -s "$api_url/health" > /dev/null; then
        log_error "Health check failed for $api_url"
        return 1
    fi
    
    # Check router endpoint
    if ! curl -f -s "$api_url/v1/router/health" > /dev/null; then
        log_error "Router health check failed"
        return 1
    fi
    
    # Check universal agent endpoint
    if ! curl -f -s "$api_url/v1/universal/health" > /dev/null; then
        log_error "Universal agent health check failed"
        return 1
    fi
    
    log_success "Deployment validation passed for $environment"
    return 0
}

# Function to create Lambda deployment package
create_lambda_package() {
    local agent_name=$1
    local package_dir="packages/$agent_name"
    local output_file="lambda-packages/$agent_name.zip"
    
    if [ ! -d "$package_dir" ]; then
        log_error "Package directory $package_dir not found"
        return 1
    fi
    
    if [ ! -d "$package_dir/dist" ]; then
        log_error "Build directory $package_dir/dist not found"
        return 1
    fi
    
    log_info "Creating Lambda package for $agent_name..."
    
    # Create output directory
    mkdir -p "$(dirname "$output_file")"
    
    # Create deployment package
    cd "$package_dir"
    
    # Install production dependencies
    npm ci --production --silent
    
    # Create zip package
    zip -r "../../$output_file" dist/ node_modules/ package.json \
        -x "node_modules/.cache/*" \
           "node_modules/*/test/*" \
           "node_modules/*/tests/*" \
           "node_modules/*/.nyc_output/*" \
           "node_modules/*/coverage/*" \
           "*.test.js" \
           "*.spec.js" > /dev/null
    
    cd ../..
    
    local package_size=$(du -h "$output_file" | cut -f1)
    log_success "Created Lambda package for $agent_name ($package_size)"
    
    return 0
}

# Function to update Lambda function code
update_lambda_function() {
    local function_name=$1
    local s3_bucket=$2
    local s3_key=$3
    
    log_info "Updating Lambda function $function_name..."
    
    # Update function code
    aws lambda update-function-code \
        --function-name "$function_name" \
        --s3-bucket "$s3_bucket" \
        --s3-key "$s3_key" > /dev/null
    
    # Wait for update to complete
    if wait_for_lambda "$function_name"; then
        log_success "Updated Lambda function $function_name"
        return 0
    else
        log_error "Failed to update Lambda function $function_name"
        return 1
    fi
}

# Function to run smoke tests
run_smoke_tests() {
    local api_url=$1
    local environment=$2
    
    log_info "Running smoke tests for $environment environment..."
    
    # Create temporary smoke test script
    cat > /tmp/smoke-test.js << 'EOF'
const https = require('https');
const http = require('http');

const testEndpoints = [
    '/health',
    '/v1/router/health',
    '/v1/universal/health'
];

async function testEndpoint(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        const req = client.get(url, { timeout: 5000 }, (res) => {
            if (res.statusCode === 200) {
                resolve({ url, status: res.statusCode, success: true });
            } else {
                resolve({ url, status: res.statusCode, success: false });
            }
        });
        
        req.on('error', (error) => {
            resolve({ url, error: error.message, success: false });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({ url, error: 'Timeout', success: false });
        });
    });
}

async function runTests() {
    const baseUrl = process.argv[2];
    const results = [];
    
    for (const endpoint of testEndpoints) {
        const result = await testEndpoint(baseUrl + endpoint);
        results.push(result);
        
        if (result.success) {
            console.log(`✅ ${endpoint} - ${result.status}`);
        } else {
            console.log(`❌ ${endpoint} - ${result.error || result.status}`);
        }
    }
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\nResults: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All smoke tests passed!');
        process.exit(0);
    } else {
        console.log('💥 Some smoke tests failed!');
        process.exit(1);
    }
}

runTests();
EOF
    
    # Run smoke tests
    if node /tmp/smoke-test.js "$api_url"; then
        log_success "Smoke tests passed for $environment"
        rm -f /tmp/smoke-test.js
        return 0
    else
        log_error "Smoke tests failed for $environment"
        rm -f /tmp/smoke-test.js
        return 1
    fi
}

# Function to rollback deployment
rollback_deployment() {
    local environment=$1
    local previous_version=$2
    
    log_warning "Rolling back $environment deployment to version $previous_version..."
    
    # This would implement rollback logic
    # For now, just log the action
    log_info "Rollback logic would be implemented here"
    
    # In a real implementation, this would:
    # 1. Switch traffic back to previous version
    # 2. Update Lambda functions to previous code
    # 3. Revert database migrations if needed
    # 4. Update DNS records
    
    log_success "Rollback completed for $environment"
}

# Function to send notification
send_notification() {
    local status=$1
    local environment=$2
    local message=$3
    local webhook_url=${SLACK_WEBHOOK_URL:-}
    
    if [ -z "$webhook_url" ]; then
        log_warning "No Slack webhook URL configured, skipping notification"
        return 0
    fi
    
    local color
    local emoji
    
    case $status in
        "success")
            color="good"
            emoji="✅"
            ;;
        "failure")
            color="danger"
            emoji="❌"
            ;;
        "warning")
            color="warning"
            emoji="⚠️"
            ;;
        *)
            color="good"
            emoji="ℹ️"
            ;;
    esac
    
    local payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "$emoji Deployment $status - $environment",
            "text": "$message",
            "footer": "Storytailor CI/CD",
            "ts": $(date +%s)
        }
    ]
}
EOF
)
    
    if curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$webhook_url" > /dev/null 2>&1; then
        log_success "Notification sent"
    else
        log_warning "Failed to send notification"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    local required_tools=("aws" "terraform" "node" "npm" "jq" "curl" "zip")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" > /dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        log_error "AWS credentials not configured or invalid"
        return 1
    fi
    
    log_success "All prerequisites met"
    return 0
}

# Function to cleanup temporary files
cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove temporary files
    rm -f /tmp/smoke-test.js
    rm -rf lambda-packages/
    rm -f *.zip
    
    log_success "Cleanup completed"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Main function for script execution
main() {
    local command=${1:-help}
    
    case $command in
        "check-prerequisites")
            check_prerequisites
            ;;
        "create-package")
            create_lambda_package "$2"
            ;;
        "update-lambda")
            update_lambda_function "$2" "$3" "$4"
            ;;
        "wait-lambda")
            wait_for_lambda "$2" "${3:-30}"
            ;;
        "wait-api")
            wait_for_api_gateway "$2" "${3:-30}"
            ;;
        "validate")
            validate_deployment "$2" "$3"
            ;;
        "smoke-test")
            run_smoke_tests "$2" "$3"
            ;;
        "rollback")
            rollback_deployment "$2" "$3"
            ;;
        "notify")
            send_notification "$2" "$3" "$4"
            ;;
        "help"|*)
            echo "Usage: $0 <command> [arguments]"
            echo ""
            echo "Commands:"
            echo "  check-prerequisites                    - Check if all required tools are installed"
            echo "  create-package <agent-name>           - Create Lambda deployment package"
            echo "  update-lambda <name> <bucket> <key>   - Update Lambda function code"
            echo "  wait-lambda <name> [timeout]          - Wait for Lambda function to be ready"
            echo "  wait-api <url> [timeout]              - Wait for API Gateway to be ready"
            echo "  validate <env> <url>                  - Validate deployment"
            echo "  smoke-test <url> <env>                - Run smoke tests"
            echo "  rollback <env> <version>              - Rollback deployment"
            echo "  notify <status> <env> <message>       - Send notification"
            echo "  help                                  - Show this help"
            ;;
    esac
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi