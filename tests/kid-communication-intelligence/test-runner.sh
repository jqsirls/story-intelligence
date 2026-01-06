#!/bin/bash
# Test runner script for Kid Communication Intelligence tests

set -e

echo "🧪 Running Kid Communication Intelligence Test Suite"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Jest is available
if ! command -v jest &> /dev/null; then
    echo -e "${RED}Error: Jest is not installed${NC}"
    echo "Please run: npm install"
    exit 1
fi

# Run unit tests
echo -e "\n${YELLOW}Running unit tests...${NC}"
npm test -- tests/kid-communication-intelligence/kid-intelligence-service.test.ts --verbose

# Run simulation tests
echo -e "\n${YELLOW}Running simulation tests...${NC}"
npm test -- tests/kid-communication-intelligence/simulations --verbose

# Run integration tests
echo -e "\n${YELLOW}Running integration tests...${NC}"
npm test -- tests/kid-communication-intelligence/integration --verbose

# Run performance tests (if enabled)
if [ "$1" == "--performance" ]; then
    echo -e "\n${YELLOW}Running performance tests...${NC}"
    npm test -- tests/kid-communication-intelligence/performance --verbose
fi

# Run with coverage if requested
if [ "$1" == "--coverage" ] || [ "$2" == "--coverage" ]; then
    echo -e "\n${YELLOW}Generating coverage report...${NC}"
    npm test -- tests/kid-communication-intelligence --coverage --coverageDirectory=tests/kid-communication-intelligence/coverage
fi

echo -e "\n${GREEN}✅ All tests completed!${NC}"
