#!/bin/bash

# =============================================================================
# Storytailor API Keys Configuration Script
# =============================================================================
# This script helps you configure all required API keys for the system
# Updated: $(date)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_prompt() {
    echo -e "${CYAN}[INPUT]${NC} $1"
}

# Function to validate API key format
validate_openai_key() {
    local key=$1
    if [[ $key =~ ^sk-proj-[a-zA-Z0-9_-]{48,}$ ]] || [[ $key =~ ^sk-[a-zA-Z0-9]{48,}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_elevenlabs_key() {
    local key=$1
    if [[ $key =~ ^[a-f0-9]{32}$ ]] || [[ ${#key} -ge 20 ]]; then
        return 0
    else
        return 1
    fi
}

validate_stability_key() {
    local key=$1
    if [[ $key =~ ^sk-[a-zA-Z0-9]{32,}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_stripe_key() {
    local key=$1
    if [[ $key =~ ^sk_(test|live)_[a-zA-Z0-9]{24,}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_supabase_url() {
    local url=$1
    if [[ $url =~ ^https://[a-z0-9]+\.supabase\.co$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_jwt() {
    local jwt=$1
    if [[ $jwt =~ ^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to securely prompt for API key
prompt_for_key() {
    local service_name=$1
    local var_name=$2
    local current_value=$3
    local validation_func=$4
    local help_url=$5
    
    echo ""
    print_header "Configure $service_name"
    
    if [[ "$current_value" != *"placeholder"* ]] && [[ -n "$current_value" ]] && [[ "$current_value" != "test-key" ]]; then
        echo -e "Current value: ${GREEN}✅ CONFIGURED${NC} (${current_value:0:10}...)"
        read -p "Do you want to update this key? (y/N): " update_key
        if [[ ! "$update_key" =~ ^[Yy]$ ]]; then
            return 0
        fi
    else
        echo -e "Current value: ${RED}❌ NOT CONFIGURED${NC} ($current_value)"
    fi
    
    echo ""
    echo "📋 How to get your $service_name API key:"
    echo "   🌐 Visit: $help_url"
    echo "   📝 Copy your API key from the dashboard"
    echo ""
    
    while true; do
        print_prompt "Enter your $service_name API key (or 'skip' to skip): "
        read -s api_key
        echo ""
        
        if [[ "$api_key" == "skip" ]]; then
            print_warning "Skipping $service_name configuration"
            return 1
        fi
        
        if [[ -z "$api_key" ]]; then
            print_error "API key cannot be empty. Please try again."
            continue
        fi
        
        # Validate the key format if validation function provided
        if [[ -n "$validation_func" ]]; then
            if $validation_func "$api_key"; then
                print_success "✅ API key format looks valid"
                break
            else
                print_error "❌ API key format appears invalid. Please check and try again."
                echo "   Expected format varies by service - please copy exactly from the dashboard"
                continue
            fi
        else
            break
        fi
    done
    
    # Export the variable
    export $var_name="$api_key"
    print_success "$service_name API key configured successfully!"
    return 0
}

# Function to update .env.staging file
update_env_file() {
    local var_name=$1
    local var_value=$2
    local env_file=".env.staging"
    
    if [[ -f "$env_file" ]]; then
        # Use sed to update the variable in place
        if grep -q "^$var_name=" "$env_file"; then
            # Variable exists, update it
            sed -i.bak "s|^$var_name=.*|$var_name=$var_value|" "$env_file"
        else
            # Variable doesn't exist, add it
            echo "$var_name=$var_value" >> "$env_file"
        fi
        print_status "Updated $var_name in $env_file"
    else
        print_warning "$env_file not found, creating it..."
        echo "$var_name=$var_value" > "$env_file"
    fi
}

# Function to test API key
test_api_key() {
    local service=$1
    local key=$2
    
    case $service in
        "openai")
            print_status "Testing OpenAI API key..."
            if command -v curl &> /dev/null; then
                response=$(curl -s -H "Authorization: Bearer $key" \
                    -H "Content-Type: application/json" \
                    "https://api.openai.com/v1/models" | head -c 100)
                if [[ $response == *"gpt"* ]]; then
                    print_success "✅ OpenAI API key is working!"
                    return 0
                else
                    print_error "❌ OpenAI API key test failed"
                    return 1
                fi
            else
                print_warning "curl not available, skipping API test"
                return 0
            fi
            ;;
        "elevenlabs")
            print_status "Testing ElevenLabs API key..."
            if command -v curl &> /dev/null; then
                response=$(curl -s -H "xi-api-key: $key" \
                    "https://api.elevenlabs.io/v1/user" | head -c 100)
                if [[ $response == *"subscription"* ]] || [[ $response == *"user"* ]]; then
                    print_success "✅ ElevenLabs API key is working!"
                    return 0
                else
                    print_error "❌ ElevenLabs API key test failed"
                    return 1
                fi
            else
                print_warning "curl not available, skipping API test"
                return 0
            fi
            ;;
        "stability")
            print_status "Testing Stability AI API key..."
            if command -v curl &> /dev/null; then
                response=$(curl -s -H "Authorization: Bearer $key" \
                    "https://api.stability.ai/v1/user/account" | head -c 100)
                if [[ $response == *"id"* ]] || [[ $response == *"email"* ]]; then
                    print_success "✅ Stability AI API key is working!"
                    return 0
                else
                    print_error "❌ Stability AI API key test failed"
                    return 1
                fi
            else
                print_warning "curl not available, skipping API test"
                return 0
            fi
            ;;
        *)
            print_warning "No test available for $service"
            return 0
            ;;
    esac
}

# Main configuration function
main() {
    print_header "🔑 Storytailor API Keys Configuration"
    echo ""
    echo "This script will help you configure all required API keys for your Storytailor system."
    echo "You can skip any service you don't want to configure right now."
    echo ""
    echo "📋 Services we'll configure:"
    echo "   🤖 OpenAI (Required for AI story generation)"
    echo "   🎤 ElevenLabs (Required for voice synthesis)"
    echo "   🎨 Stability AI (Required for image generation)"
    echo "   🗄️  Supabase (Required for database)"
    echo "   💳 Stripe (Required for payments)"
    echo "   🔒 Security tokens"
    echo ""
    echo "⚠️  Note: Alexa+ integration is not yet available and will be skipped."
    echo ""
    
    read -p "Press Enter to continue or Ctrl+C to exit..."
    
    # Get current values
    CURRENT_OPENAI="${OPENAI_API_KEY:-placeholder}"
    CURRENT_ELEVENLABS="${ELEVENLABS_API_KEY:-placeholder}"
    CURRENT_STABILITY="${STABILITY_API_KEY:-placeholder}"
    CURRENT_SUPABASE_URL="${SUPABASE_URL:-placeholder}"
    CURRENT_SUPABASE_ANON="${SUPABASE_ANON_KEY:-placeholder}"
    CURRENT_SUPABASE_SERVICE="${SUPABASE_SERVICE_KEY:-placeholder}"
    CURRENT_STRIPE_SECRET="${STRIPE_SECRET_KEY:-placeholder}"
    CURRENT_STRIPE_PUBLISHABLE="${STRIPE_PUBLISHABLE_KEY:-placeholder}"
    CURRENT_JWT_SECRET="${JWT_SECRET:-placeholder}"
    
    # Configure each service
    echo ""
    print_header "🚀 Starting API Key Configuration"
    
    # 1. OpenAI (Critical)
    if prompt_for_key "OpenAI" "OPENAI_API_KEY" "$CURRENT_OPENAI" "validate_openai_key" "https://platform.openai.com/api-keys"; then
        update_env_file "OPENAI_API_KEY" "$OPENAI_API_KEY"
        test_api_key "openai" "$OPENAI_API_KEY"
    fi
    
    # 2. ElevenLabs (Critical for voice)
    if prompt_for_key "ElevenLabs" "ELEVENLABS_API_KEY" "$CURRENT_ELEVENLABS" "validate_elevenlabs_key" "https://elevenlabs.io/app/settings/api-keys"; then
        update_env_file "ELEVENLABS_API_KEY" "$ELEVENLABS_API_KEY"
        test_api_key "elevenlabs" "$ELEVENLABS_API_KEY"
    fi
    
    # 3. Stability AI (Critical for images)
    if prompt_for_key "Stability AI" "STABILITY_API_KEY" "$CURRENT_STABILITY" "validate_stability_key" "https://platform.stability.ai/account/keys"; then
        update_env_file "STABILITY_API_KEY" "$STABILITY_API_KEY"
        test_api_key "stability" "$STABILITY_API_KEY"
    fi
    
    # 4. Supabase URL
    if prompt_for_key "Supabase URL" "SUPABASE_URL" "$CURRENT_SUPABASE_URL" "validate_supabase_url" "https://app.supabase.com/project/[your-project]/settings/api"; then
        update_env_file "SUPABASE_URL" "$SUPABASE_URL"
    fi
    
    # 5. Supabase Anonymous Key
    if prompt_for_key "Supabase Anonymous Key" "SUPABASE_ANON_KEY" "$CURRENT_SUPABASE_ANON" "validate_jwt" "https://app.supabase.com/project/[your-project]/settings/api"; then
        update_env_file "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
    fi
    
    # 6. Supabase Service Key
    if prompt_for_key "Supabase Service Key" "SUPABASE_SERVICE_KEY" "$CURRENT_SUPABASE_SERVICE" "validate_jwt" "https://app.supabase.com/project/[your-project]/settings/api"; then
        update_env_file "SUPABASE_SERVICE_KEY" "$SUPABASE_SERVICE_KEY"
    fi
    
    # 7. Stripe Secret Key
    if prompt_for_key "Stripe Secret Key" "STRIPE_SECRET_KEY" "$CURRENT_STRIPE_SECRET" "validate_stripe_key" "https://dashboard.stripe.com/apikeys"; then
        update_env_file "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
    fi
    
    # 8. Stripe Publishable Key
    if prompt_for_key "Stripe Publishable Key" "STRIPE_PUBLISHABLE_KEY" "$CURRENT_STRIPE_PUBLISHABLE" "" "https://dashboard.stripe.com/apikeys"; then
        update_env_file "STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE_KEY"
    fi
    
    # 9. JWT Secret
    echo ""
    print_header "Configure JWT Secret"
    if [[ "$CURRENT_JWT_SECRET" == *"placeholder"* ]] || [[ -z "$CURRENT_JWT_SECRET" ]]; then
        print_status "Generating secure JWT secret..."
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        export JWT_SECRET
        update_env_file "JWT_SECRET" "$JWT_SECRET"
        print_success "✅ JWT secret generated and configured!"
    else
        print_success "✅ JWT secret already configured"
    fi
    
    # 10. Redis URL
    echo ""
    print_header "Configure Redis"
    print_status "Redis URL configuration..."
    if [[ -z "$REDIS_URL" ]]; then
        echo "📋 Redis options:"
        echo "   1. Local Redis: redis://localhost:6379"
        echo "   2. Redis Cloud: redis://username:password@host:port"
        echo "   3. Skip for now"
        echo ""
        read -p "Choose option (1/2/3): " redis_option
        
        case $redis_option in
            1)
                REDIS_URL="redis://localhost:6379"
                export REDIS_URL
                update_env_file "REDIS_URL" "$REDIS_URL"
                print_success "✅ Local Redis configured"
                ;;
            2)
                print_prompt "Enter your Redis connection string: "
                read redis_url
                if [[ -n "$redis_url" ]]; then
                    REDIS_URL="$redis_url"
                    export REDIS_URL
                    update_env_file "REDIS_URL" "$REDIS_URL"
                    print_success "✅ Redis Cloud configured"
                fi
                ;;
            3)
                print_warning "Skipping Redis configuration"
                ;;
        esac
    else
        print_success "✅ Redis already configured: $REDIS_URL"
    fi
    
    # Generate summary
    echo ""
    print_header "📊 Configuration Summary"
    echo ""
    
    # Check what's configured
    configured_count=0
    total_services=8
    
    echo "🔑 API Keys Status:"
    
    if [[ "$OPENAI_API_KEY" != *"placeholder"* ]] && [[ -n "$OPENAI_API_KEY" ]]; then
        echo "   ✅ OpenAI: Configured"
        ((configured_count++))
    else
        echo "   ❌ OpenAI: Not configured"
    fi
    
    if [[ "$ELEVENLABS_API_KEY" != *"placeholder"* ]] && [[ -n "$ELEVENLABS_API_KEY" ]]; then
        echo "   ✅ ElevenLabs: Configured"
        ((configured_count++))
    else
        echo "   ❌ ElevenLabs: Not configured"
    fi
    
    if [[ "$STABILITY_API_KEY" != *"placeholder"* ]] && [[ -n "$STABILITY_API_KEY" ]]; then
        echo "   ✅ Stability AI: Configured"
        ((configured_count++))
    else
        echo "   ❌ Stability AI: Not configured"
    fi
    
    if [[ "$SUPABASE_URL" != *"placeholder"* ]] && [[ -n "$SUPABASE_URL" ]]; then
        echo "   ✅ Supabase URL: Configured"
        ((configured_count++))
    else
        echo "   ❌ Supabase URL: Not configured"
    fi
    
    if [[ "$SUPABASE_SERVICE_KEY" != *"placeholder"* ]] && [[ -n "$SUPABASE_SERVICE_KEY" ]]; then
        echo "   ✅ Supabase Service Key: Configured"
        ((configured_count++))
    else
        echo "   ❌ Supabase Service Key: Not configured"
    fi
    
    if [[ "$STRIPE_SECRET_KEY" != *"placeholder"* ]] && [[ -n "$STRIPE_SECRET_KEY" ]]; then
        echo "   ✅ Stripe: Configured"
        ((configured_count++))
    else
        echo "   ❌ Stripe: Not configured"
    fi
    
    if [[ "$JWT_SECRET" != *"placeholder"* ]] && [[ -n "$JWT_SECRET" ]]; then
        echo "   ✅ JWT Secret: Configured"
        ((configured_count++))
    else
        echo "   ❌ JWT Secret: Not configured"
    fi
    
    if [[ -n "$REDIS_URL" ]]; then
        echo "   ✅ Redis: Configured"
        ((configured_count++))
    else
        echo "   ❌ Redis: Not configured"
    fi
    
    echo ""
    completion_percentage=$((configured_count * 100 / total_services))
    echo "📈 Configuration Progress: $configured_count/$total_services services ($completion_percentage%)"
    
    if [[ $completion_percentage -ge 80 ]]; then
        print_success "🎉 Great! Your system is well-configured and ready for testing."
    elif [[ $completion_percentage -ge 60 ]]; then
        print_warning "⚠️  Good progress! Configure the remaining services for full functionality."
    else
        print_error "❌ More configuration needed for basic functionality."
    fi
    
    echo ""
    print_header "🚀 Next Steps"
    echo ""
    echo "1. 🧪 Run tests to verify your configuration:"
    echo "   ./scripts/run-child-safety-tests.sh"
    echo ""
    echo "2. 🚀 Start your development environment:"
    echo "   npm run dev"
    echo ""
    echo "3. 📚 Check the documentation for deployment:"
    echo "   cat DEPLOYMENT_SUMMARY.md"
    echo ""
    
    if [[ $completion_percentage -lt 100 ]]; then
        echo "4. 🔄 Re-run this script anytime to configure missing services:"
        echo "   ./scripts/configure-api-keys.sh"
        echo ""
    fi
    
    print_success "✅ API key configuration completed!"
}

# Run main function
main "$@"