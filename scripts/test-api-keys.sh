#!/bin/bash

# API Keys Testing Script
# This script tests all configured API keys to verify they work

set -e

echo "🧪 Testing API Keys Functionality..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test OpenAI API
test_openai() {
    print_header "Testing OpenAI API Key..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -z "$OPENAI_API_KEY" ]; then
        print_error "OPENAI_API_KEY not set"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Test with a simple API call
    response=$(curl -s -w "%{http_code}" -o /tmp/openai_test.json \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello"}],
            "max_tokens": 5
        }' \
        https://api.openai.com/v1/chat/completions)
    
    if [ "$response" = "200" ]; then
        print_status "✅ OpenAI API Key is working"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "❌ OpenAI API Key failed (HTTP $response)"
        if [ -f /tmp/openai_test.json ]; then
            cat /tmp/openai_test.json
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to test ElevenLabs API
test_elevenlabs() {
    print_header "Testing ElevenLabs API Key..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -z "$ELEVENLABS_API_KEY" ]; then
        print_error "ELEVENLABS_API_KEY not set"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Test with user info endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/elevenlabs_test.json \
        -H "xi-api-key: $ELEVENLABS_API_KEY" \
        https://api.elevenlabs.io/v1/user)
    
    if [ "$response" = "200" ]; then
        print_status "✅ ElevenLabs API Key is working"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "❌ ElevenLabs API Key failed (HTTP $response)"
        if [ -f /tmp/elevenlabs_test.json ]; then
            cat /tmp/elevenlabs_test.json
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to test Stability AI API
test_stability() {
    print_header "Testing Stability AI API Key..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -z "$STABILITY_API_KEY" ]; then
        print_error "STABILITY_API_KEY not set"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Test with account endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/stability_test.json \
        -H "Authorization: Bearer $STABILITY_API_KEY" \
        https://api.stability.ai/v1/user/account)
    
    if [ "$response" = "200" ]; then
        print_status "✅ Stability AI API Key is working"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "❌ Stability AI API Key failed (HTTP $response)"
        if [ -f /tmp/stability_test.json ]; then
            cat /tmp/stability_test.json
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to test Supabase connection
test_supabase() {
    print_header "Testing Supabase Connection..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        print_error "SUPABASE_URL or SUPABASE_ANON_KEY not set"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Test with a simple query
    response=$(curl -s -w "%{http_code}" -o /tmp/supabase_test.json \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        "$SUPABASE_URL/rest/v1/?select=*" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        print_status "✅ Supabase connection is working"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "❌ Supabase connection failed (HTTP $response)"
        if [ -f /tmp/supabase_test.json ]; then
            cat /tmp/supabase_test.json
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to test Stripe API
test_stripe() {
    print_header "Testing Stripe API Key..."
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -z "$STRIPE_NETRC_FILE" ]; then
        print_error "STRIPE_NETRC_FILE not set"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Test with account endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/stripe_test.json \
        --netrc-file "${STRIPE_NETRC_FILE:?STRIPE_NETRC_FILE is required}" \
        https://api.stripe.com/v1/account)
    
    if [ "$response" = "200" ]; then
        print_status "✅ Stripe API Key is working"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "❌ Stripe API Key failed (HTTP $response)"
        if [ -f /tmp/stripe_test.json ]; then
            cat /tmp/stripe_test.json
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Run all tests
main() {
    echo ""
    
    # Test each API
    test_openai
    echo ""
    
    test_elevenlabs
    echo ""
    
    test_stability
    echo ""
    
    test_supabase
    echo ""
    
    test_stripe
    echo ""
    
    # Generate summary
    echo "📊 API Keys Test Results:"
    echo "========================"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_status "🎉 All API keys are working correctly!"
        echo ""
        echo "✅ System Status: READY FOR FULL OPERATION"
        echo "✅ All agents should work properly"
        echo "✅ Voice synthesis available"
        echo "✅ Image generation available"
        echo "✅ Database operations available"
        echo "✅ Payment processing available"
        exit 0
    else
        print_error "⚠️  Some API keys are not working properly"
        echo ""
        echo "❌ System Status: PARTIAL FUNCTIONALITY"
        echo "❌ Some agents may not work correctly"
        echo ""
        echo "🔧 Please check the failed API keys and reconfigure them"
        exit 1
    fi
    
    # Cleanup temp files
    rm -f /tmp/openai_test.json /tmp/elevenlabs_test.json /tmp/stability_test.json /tmp/supabase_test.json /tmp/stripe_test.json
}

# Run main function
main "$@"