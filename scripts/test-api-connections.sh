#!/bin/bash

# =============================================================================
# API Connections Test Script
# =============================================================================
# This script tests all configured API keys to ensure they're working
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Test OpenAI API
test_openai() {
    print_status "Testing OpenAI API connection..."
    
    if [[ -z "$OPENAI_API_KEY" ]] || [[ "$OPENAI_API_KEY" == *"placeholder"* ]]; then
        print_error "❌ OpenAI API key not configured"
        return 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_warning "curl not available, skipping OpenAI test"
        return 0
    fi
    
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        "https://api.openai.com/v1/models" -o /tmp/openai_test.json)
    
    if [[ "$response" == "200" ]]; then
        model_count=$(cat /tmp/openai_test.json | grep -o '"id"' | wc -l)
        print_success "✅ OpenAI API working! Found $model_count models available"
        rm -f /tmp/openai_test.json
        return 0
    else
        print_error "❌ OpenAI API test failed (HTTP $response)"
        return 1
    fi
}

# Test ElevenLabs API
test_elevenlabs() {
    print_status "Testing ElevenLabs API connection..."
    
    if [[ -z "$ELEVENLABS_API_KEY" ]] || [[ "$ELEVENLABS_API_KEY" == *"placeholder"* ]]; then
        print_error "❌ ElevenLabs API key not configured"
        return 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_warning "curl not available, skipping ElevenLabs test"
        return 0
    fi
    
    response=$(curl -s -w "%{http_code}" -H "xi-api-key: $ELEVENLABS_API_KEY" \
        "https://api.elevenlabs.io/v1/user" -o /tmp/elevenlabs_test.json)
    
    if [[ "$response" == "200" ]]; then
        print_success "✅ ElevenLabs API working!"
        rm -f /tmp/elevenlabs_test.json
        return 0
    else
        print_error "❌ ElevenLabs API test failed (HTTP $response)"
        return 1
    fi
}

# Test Stability AI API
test_stability() {
    print_status "Testing Stability AI API connection..."
    
    if [[ -z "$STABILITY_API_KEY" ]] || [[ "$STABILITY_API_KEY" == *"placeholder"* ]]; then
        print_error "❌ Stability AI API key not configured"
        return 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_warning "curl not available, skipping Stability AI test"
        return 0
    fi
    
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $STABILITY_API_KEY" \
        "https://api.stability.ai/v1/user/account" -o /tmp/stability_test.json)
    
    if [[ "$response" == "200" ]]; then
        print_success "✅ Stability AI API working!"
        rm -f /tmp/stability_test.json
        return 0
    else
        print_error "❌ Stability AI API test failed (HTTP $response)"
        return 1
    fi
}

# Test Supabase connection
test_supabase() {
    print_status "Testing Supabase connection..."
    
    if [[ -z "$SUPABASE_URL" ]] || [[ "$SUPABASE_URL" == *"placeholder"* ]]; then
        print_error "❌ Supabase URL not configured"
        return 1
    fi
    
    if [[ -z "$SUPABASE_ANON_KEY" ]] || [[ "$SUPABASE_ANON_KEY" == *"placeholder"* ]]; then
        print_error "❌ Supabase Anonymous key not configured"
        return 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_warning "curl not available, skipping Supabase test"
        return 0
    fi
    
    response=$(curl -s -w "%{http_code}" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        "$SUPABASE_URL/rest/v1/" -o /tmp/supabase_test.json)
    
    if [[ "$response" == "200" ]]; then
        print_success "✅ Supabase connection working!"
        rm -f /tmp/supabase_test.json
        return 0
    else
        print_error "❌ Supabase connection test failed (HTTP $response)"
        return 1
    fi
}

# Test Redis connection
test_redis() {
    print_status "Testing Redis connection..."
    
    if [[ -z "$REDIS_URL" ]]; then
        print_error "❌ Redis URL not configured"
        return 1
    fi
    
    # Try to ping Redis using redis-cli if available
    if command -v redis-cli &> /dev/null; then
        if redis-cli -u "$REDIS_URL" ping &> /dev/null; then
            print_success "✅ Redis connection working!"
            return 0
        else
            print_error "❌ Redis connection failed"
            return 1
        fi
    else
        print_warning "redis-cli not available, skipping Redis test"
        return 0
    fi
}

# Test Stripe API
test_stripe() {
    print_status "Testing Stripe API connection..."
    
    if [[ -z "$STRIPE_NETRC_FILE" ]]; then
        print_error "❌ Stripe netrc file not configured (STRIPE_NETRC_FILE)"
        return 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_warning "curl not available, skipping Stripe test"
        return 0
    fi
    
    response=$(curl -s -w "%{http_code}" \
        --netrc-file "${STRIPE_NETRC_FILE:?STRIPE_NETRC_FILE is required}" \
        "https://api.stripe.com/v1/account" -o /tmp/stripe_test.json)
    
    if [[ "$response" == "200" ]]; then
        print_success "✅ Stripe API working!"
        rm -f /tmp/stripe_test.json
        return 0
    else
        print_error "❌ Stripe API test failed (HTTP $response)"
        return 1
    fi
}

# Main test function
main() {
    print_header "🧪 API Connections Test Suite"
    echo ""
    echo "Testing all configured API connections..."
    echo ""
    
    # Track results
    total_tests=0
    passed_tests=0
    
    # Test each service
    services=("openai" "elevenlabs" "stability" "supabase" "redis" "stripe")
    
    for service in "${services[@]}"; do
        echo ""
        ((total_tests++))
        if test_$service; then
            ((passed_tests++))
        fi
    done
    
    # Generate summary
    echo ""
    print_header "📊 Test Results Summary"
    echo ""
    
    success_rate=$((passed_tests * 100 / total_tests))
    echo "📈 Results: $passed_tests/$total_tests tests passed ($success_rate%)"
    echo ""
    
    if [[ $success_rate -eq 100 ]]; then
        print_success "🎉 All API connections are working perfectly!"
        echo ""
        echo "✅ Your system is ready for:"
        echo "   - AI story generation (OpenAI)"
        echo "   - Voice synthesis (ElevenLabs)"
        echo "   - Image generation (Stability AI)"
        echo "   - Database operations (Supabase)"
        echo "   - Caching and sessions (Redis)"
        echo "   - Payment processing (Stripe)"
    elif [[ $success_rate -ge 75 ]]; then
        print_success "✅ Most API connections are working!"
        echo ""
        echo "⚠️  Some services may have limited functionality due to failed connections."
        echo "   Check the errors above and reconfigure those API keys."
    elif [[ $success_rate -ge 50 ]]; then
        print_warning "⚠️  Some API connections are working, but several failed."
        echo ""
        echo "🔧 Recommended actions:"
        echo "   1. Run ./scripts/configure-api-keys.sh to fix missing keys"
        echo "   2. Verify your API keys are correct and active"
        echo "   3. Check your internet connection"
    else
        print_error "❌ Most API connections failed!"
        echo ""
        echo "🚨 Critical actions needed:"
        echo "   1. Run ./scripts/configure-api-keys.sh to configure API keys"
        echo "   2. Verify all API keys are valid and active"
        echo "   3. Check service status pages for outages"
        echo "   4. Verify network connectivity"
    fi
    
    echo ""
    print_header "🔧 Troubleshooting Tips"
    echo ""
    echo "If tests are failing:"
    echo ""
    echo "1. 🔑 Verify API Keys:"
    echo "   - Check that keys are copied correctly (no extra spaces)"
    echo "   - Ensure keys are active and not expired"
    echo "   - Verify account has sufficient credits/quota"
    echo ""
    echo "2. 🌐 Check Network:"
    echo "   - Ensure internet connection is working"
    echo "   - Check if corporate firewall is blocking API calls"
    echo "   - Try from a different network if possible"
    echo ""
    echo "3. 🔄 Reconfigure:"
    echo "   - Run: ./scripts/configure-api-keys.sh"
    echo "   - Double-check each API key in the service dashboard"
    echo ""
    echo "4. 📚 Service Documentation:"
    echo "   - OpenAI: https://platform.openai.com/docs"
    echo "   - ElevenLabs: https://docs.elevenlabs.io/"
    echo "   - Stability AI: https://platform.stability.ai/docs"
    echo "   - Supabase: https://supabase.com/docs"
    echo "   - Stripe: https://stripe.com/docs"
    echo ""
    
    # Exit with appropriate code
    if [[ $success_rate -ge 75 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"