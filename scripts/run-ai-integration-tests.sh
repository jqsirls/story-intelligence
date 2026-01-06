#!/bin/bash

# AI Integration Test Suite Runner
# Runs comprehensive AI integration tests and validates system readiness

set -e

echo "🚀 Starting AI Integration Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=${TEST_TIMEOUT:-300} # 5 minutes default
MAX_RETRIES=${MAX_RETRIES:-3}
PARALLEL_TESTS=${PARALLEL_TESTS:-true}
ENABLE_CHAOS=${ENABLE_CHAOS:-true}
ENABLE_MONITORING=${ENABLE_MONITORING:-true}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

# Check TypeScript
if ! command -v tsc &> /dev/null; then
    echo -e "${YELLOW}⚠️  TypeScript not found, installing...${NC}"
    npm install -g typescript
fi

# Check environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ OPENAI_API_KEY environment variable is required${NC}"
    exit 1
fi

if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo -e "${RED}❌ ELEVENLABS_API_KEY environment variable is required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Build test suite
echo -e "${BLUE}🔨 Building AI integration test suite...${NC}"
cd testing/ai-integration

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Compile TypeScript
echo -e "${BLUE}⚙️  Compiling TypeScript...${NC}"
tsc --build

echo -e "${GREEN}✅ Build completed${NC}"

# Run tests
echo -e "${BLUE}🧪 Running comprehensive AI integration tests...${NC}"

# Create test results directory
mkdir -p ../../test-results/ai-integration

# Set test configuration
export TEST_TIMEOUT=$TEST_TIMEOUT
export MAX_RETRIES=$MAX_RETRIES
export PARALLEL_TESTS=$PARALLEL_TESTS
export ENABLE_CHAOS=$ENABLE_CHAOS
export ENABLE_MONITORING=$ENABLE_MONITORING

# Run the comprehensive test suite
node -e "
const { ComprehensiveAITestSuite } = require('./dist/ComprehensiveAITestSuite');

async function runTests() {
  const testSuite = new ComprehensiveAITestSuite({
    enableWebVTTTesting: true,
    enableOpenAITesting: true,
    enableElevenLabsTesting: true,
    enablePersonalityTesting: true,
    enableChaosEngineering: process.env.ENABLE_CHAOS === 'true',
    enableMonitoring: process.env.ENABLE_MONITORING === 'true',
    parallelExecution: process.env.PARALLEL_TESTS === 'true',
    maxConcurrency: 5,
    testTimeout: parseInt(process.env.TEST_TIMEOUT) * 1000
  });

  try {
    console.log('🚀 Starting comprehensive AI integration tests...');
    const startTime = Date.now();
    
    const results = await testSuite.runComprehensiveTests();
    
    const duration = Date.now() - startTime;
    results.duration = duration;
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('../../test-results/ai-integration/results.json', JSON.stringify(results, null, 2));
    
    // Export additional data
    const exportData = testSuite.exportTestData();
    fs.writeFileSync('../../test-results/ai-integration/export-data.json', JSON.stringify(exportData, null, 2));
    
    // Print summary
    console.log('\\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(\`Total Tests: \${results.summary.totalTests}\`);
    console.log(\`Passed: \${results.summary.passedTests}\`);
    console.log(\`Failed: \${results.summary.failedTests}\`);
    console.log(\`Skipped: \${results.summary.skippedTests}\`);
    console.log(\`Success Rate: \${(results.summary.successRate * 100).toFixed(2)}%\`);
    console.log(\`Duration: \${(duration / 1000).toFixed(2)}s\`);
    
    if (results.criticalFailures.length > 0) {
      console.log('\\n❌ CRITICAL FAILURES:');
      results.criticalFailures.forEach(failure => console.log(\`  - \${failure}\`));
    }
    
    if (results.recommendations.length > 0) {
      console.log('\\n💡 RECOMMENDATIONS:');
      results.recommendations.forEach(rec => console.log(\`  - \${rec}\`));
    }
    
    // Get cost summary
    const costSummary = testSuite.getCostSummary();
    console.log('\\n💰 COST SUMMARY:');
    console.log(\`OpenAI: \${costSummary.openai.totalTokens} tokens, $\${costSummary.openai.totalCost.toFixed(4)}\`);
    console.log(\`ElevenLabs: \${costSummary.elevenlabs.totalCharacters} chars, $\${costSummary.elevenlabs.totalCost.toFixed(4)}\`);
    
    // Exit with appropriate code
    process.exit(results.passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test suite execution failed:', error);
    process.exit(1);
  }
}

runTests();
"

TEST_EXIT_CODE=$?

# Process results
cd ../../

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All AI integration tests passed!${NC}"
    echo -e "${GREEN}🚀 System is ready for production deployment${NC}"
else
    echo -e "${RED}❌ AI integration tests failed${NC}"
    echo -e "${RED}🚫 Do not deploy to production${NC}"
    
    # Show critical failures if results file exists
    if [ -f "test-results/ai-integration/results.json" ]; then
        echo -e "${YELLOW}📋 Critical failures:${NC}"
        cat test-results/ai-integration/results.json | jq -r '.criticalFailures[]' 2>/dev/null || echo "Could not parse results"
    fi
fi

# Generate HTML report if jq is available
if command -v jq &> /dev/null && [ -f "test-results/ai-integration/results.json" ]; then
    echo -e "${BLUE}📄 Generating HTML report...${NC}"
    
    cat > test-results/ai-integration/report.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>AI Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .passed { color: green; }
        .failed { color: red; }
        .summary { background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .critical { background: #ffe6e6; padding: 10px; margin: 10px 0; border-left: 4px solid red; }
        .recommendation { background: #e6f3ff; padding: 10px; margin: 10px 0; border-left: 4px solid blue; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Integration Test Report</h1>
        <p>Generated: $(date)</p>
    </div>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <p><strong>Overall Status:</strong> <span class="$([ $TEST_EXIT_CODE -eq 0 ] && echo 'passed' || echo 'failed')">$([ $TEST_EXIT_CODE -eq 0 ] && echo 'PASSED' || echo 'FAILED')</span></p>
    </div>
    
    <div id="results"></div>
    
    <script>
        fetch('results.json')
            .then(response => response.json())
            .then(data => {
                document.getElementById('results').innerHTML = \`
                    <h2>Detailed Results</h2>
                    <table>
                        <tr><th>Metric</th><th>Value</th></tr>
                        <tr><td>Total Tests</td><td>\${data.summary.totalTests}</td></tr>
                        <tr><td>Passed Tests</td><td class="passed">\${data.summary.passedTests}</td></tr>
                        <tr><td>Failed Tests</td><td class="failed">\${data.summary.failedTests}</td></tr>
                        <tr><td>Success Rate</td><td>\${(data.summary.successRate * 100).toFixed(2)}%</td></tr>
                        <tr><td>Duration</td><td>\${(data.duration / 1000).toFixed(2)}s</td></tr>
                    </table>
                    
                    \${data.criticalFailures.length > 0 ? \`
                        <h3>Critical Failures</h3>
                        \${data.criticalFailures.map(f => \`<div class="critical">\${f}</div>\`).join('')}
                    \` : ''}
                    
                    \${data.recommendations.length > 0 ? \`
                        <h3>Recommendations</h3>
                        \${data.recommendations.map(r => \`<div class="recommendation">\${r}</div>\`).join('')}
                    \` : ''}
                \`;
            });
    </script>
</body>
</html>
EOF
    
    echo -e "${GREEN}📄 HTML report generated: test-results/ai-integration/report.html${NC}"
fi

echo -e "${BLUE}📊 Test results saved to: test-results/ai-integration/${NC}"

exit $TEST_EXIT_CODE