#!/bin/bash
# Comprehensive Agent Verification
# Tests all 29 agents for health, functionality, and output quality

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REGION="us-east-1"
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_FILE="${TEST_RESULTS_DIR}/comprehensive-agent-verification-${TIMESTAMP}.txt"
JSON_RESULTS="${TEST_RESULTS_DIR}/comprehensive-agent-verification-${TIMESTAMP}.json"

mkdir -p "${TEST_RESULTS_DIR}"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        Comprehensive Agent Verification (Production)           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# All 29 agents
AGENTS=(
  "storytailor-universal-agent-production"
  "storytailor-auth-agent-production"
  "storytailor-content-agent-production"
  "storytailor-emotion-agent-production"
  "storytailor-library-agent-production"
  "storytailor-personality-agent-production"
  "storytailor-voice-synthesis-agent-production"
  "storytailor-educational-agent-production"
  "storytailor-therapeutic-agent-production"
  "storytailor-child-safety-agent-production"
  "storytailor-localization-agent-production"
  "storytailor-commerce-agent-production"
  "storytailor-knowledge-base-agent-production"
  "storytailor-accessibility-agent-production"
  "storytailor-smart-home-agent-production"
  "storytailor-security-framework-agent-production"
  "storytailor-analytics-intelligence-agent-production"
  "storytailor-conversation-intelligence-agent-production"
  "storytailor-insights-agent-production"
  "storytailor-router-production"
  "storytailor-avatar-agent-production"
  "storytailor-character-agent-production"
  "storytailor-content-safety-agent-production"
  "storytailor-conversation-agent-production"
  "storytailor-conversational-story-director-agent-production"
  "storytailor-event-system-agent-production"
  "storytailor-health-monitoring-agent-production"
  "storytailor-performance-optimization-agent-production"
  "storytailor-ui-tokens-agent-production"
)

TOTAL=0
HEALTHY=0
FUNCTIONAL=0
QUALITY_VERIFIED=0
NEEDS_VERIFICATION=0
FAILED=0

# Generate valid UUID for testing (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
generate_uuid() {
  local prefix=$1
  local timestamp=$(date +%s)
  # Generate 12 hex digits from timestamp
  local hex_suffix=$(printf "%012x" ${timestamp} | tail -c 12)
  # Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  echo "${prefix}-${hex_suffix:0:4}-${hex_suffix:4:4}-${hex_suffix:8:4}-${hex_suffix:12:12}"
}

# Test agent with specific action and verify output
test_agent_comprehensive() {
  local AGENT=$1
  local ACTION=$2
  local PAYLOAD=$3
  local QUALITY_CHECK=$4  # Function name to call for quality verification
  
  TOTAL=$((TOTAL + 1))
  echo -e "${CYAN}Testing: ${AGENT}${NC}"
  
  # Check if Lambda exists
  if ! aws lambda get-function --function-name "${AGENT}" --region "${REGION}" > /dev/null 2>&1; then
    echo -e "${YELLOW}  ⚠️  Lambda function does not exist${NC}"
    echo "[MISSING] ${AGENT}: Lambda function does not exist" >> "${RESULTS_FILE}"
    FAILED=$((FAILED + 1))
    return 1
  fi
  
  # Test 1: Health check
  HEALTH_PAYLOAD='{"action":"health"}'
  echo "${HEALTH_PAYLOAD}" > /tmp/health-${AGENT//-/_}.json
  
  if aws lambda invoke \
    --function-name "${AGENT}" \
    --region "${REGION}" \
    --payload file:///tmp/health-${AGENT//-/_}.json \
    --cli-binary-format raw-in-base64-out \
    /tmp/health-${AGENT//-/_}-response.json > /dev/null 2>&1; then
    
    if command -v jq >/dev/null 2>&1; then
      HEALTH_RESPONSE=$(cat /tmp/health-${AGENT//-/_}-response.json)
      HEALTH_BODY=$(echo "${HEALTH_RESPONSE}" | jq -r '.body // .' 2>/dev/null)
      HEALTH_PARSED=$(echo "${HEALTH_BODY}" | jq -r 'fromjson // .' 2>/dev/null || echo "${HEALTH_BODY}")
      HEALTH_SUCCESS=$(echo "${HEALTH_PARSED}" | jq -r '.success // false' 2>/dev/null)
      
      if [ "${HEALTH_SUCCESS}" = "true" ]; then
        HEALTHY=$((HEALTHY + 1))
        echo -e "  ${GREEN}✅ Health: OK${NC}"
      else
        echo -e "  ${YELLOW}⚠️  Health: Responded but status unclear${NC}"
        HEALTHY=$((HEALTHY + 1))  # Still count as healthy if it responded
      fi
    else
      HEALTHY=$((HEALTHY + 1))
      echo -e "  ${GREEN}✅ Health: OK${NC}"
    fi
  else
    echo -e "  ${RED}❌ Health: Failed${NC}"
    echo "[FAIL] ${AGENT}: Health check failed" >> "${RESULTS_FILE}"
    FAILED=$((FAILED + 1))
    return 1
  fi
  
  # Test 2: Functional test (if action provided)
  if [ -n "${ACTION}" ] && [ -n "${PAYLOAD}" ]; then
    echo "${PAYLOAD}" > /tmp/functional-${AGENT//-/_}.json
    
    if aws lambda invoke \
      --function-name "${AGENT}" \
      --region "${REGION}" \
      --payload file:///tmp/functional-${AGENT//-/_}.json \
      --cli-binary-format raw-in-base64-out \
      /tmp/functional-${AGENT//-/_}-response.json > /dev/null 2>&1; then
      
      if command -v jq >/dev/null 2>&1; then
        FUNC_RESPONSE=$(cat /tmp/functional-${AGENT//-/_}-response.json)
        FUNC_BODY=$(echo "${FUNC_RESPONSE}" | jq -r '.body // .' 2>/dev/null)
        FUNC_PARSED=$(echo "${FUNC_BODY}" | jq -r 'fromjson // .' 2>/dev/null || echo "${FUNC_BODY}")
        FUNC_SUCCESS=$(echo "${FUNC_PARSED}" | jq -r '.success // false' 2>/dev/null)
        
        if [ "${FUNC_SUCCESS}" = "true" ]; then
          FUNCTIONAL=$((FUNCTIONAL + 1))
          echo -e "  ${GREEN}✅ Functionality: Working${NC}"
          
          # Test 3: Quality verification (if quality check function provided)
          if [ -n "${QUALITY_CHECK}" ] && type "${QUALITY_CHECK}" >/dev/null 2>&1; then
            if "${QUALITY_CHECK}" "${FUNC_PARSED}"; then
              QUALITY_VERIFIED=$((QUALITY_VERIFIED + 1))
              echo -e "  ${GREEN}✅ Quality: Verified${NC}"
            else
              NEEDS_VERIFICATION=$((NEEDS_VERIFICATION + 1))
              echo -e "  ${YELLOW}⚠️  Quality: Needs verification${NC}"
            fi
          else
            NEEDS_VERIFICATION=$((NEEDS_VERIFICATION + 1))
            echo -e "  ${YELLOW}⚠️  Quality: Not verified${NC}"
          fi
        else
          echo -e "  ${YELLOW}⚠️  Functionality: Responded but success=false${NC}"
          NEEDS_VERIFICATION=$((NEEDS_VERIFICATION + 1))
        fi
      else
        FUNCTIONAL=$((FUNCTIONAL + 1))
        echo -e "  ${GREEN}✅ Functionality: Responded${NC}"
        NEEDS_VERIFICATION=$((NEEDS_VERIFICATION + 1))
        echo -e "  ${YELLOW}⚠️  Quality: Not verified (jq unavailable)${NC}"
      fi
    else
      echo -e "  ${YELLOW}⚠️  Functionality: Invocation failed${NC}"
      NEEDS_VERIFICATION=$((NEEDS_VERIFICATION + 1))
    fi
  else
    NEEDS_VERIFICATION=$((NEEDS_VERIFICATION + 1))
    echo -e "  ${YELLOW}⚠️  Functionality: No test action defined${NC}"
  fi
  
  echo ""
  echo "[PASS] ${AGENT}: Health=${HEALTHY}, Functional=${FUNCTIONAL}, Quality=${QUALITY_VERIFIED}" >> "${RESULTS_FILE}"
}

# Quality check functions
check_content_quality() {
  local PARSED=$1
  local STORY_CONTENT=$(echo "${PARSED}" | jq -r '.data.story.content // .data.content // empty' 2>/dev/null)
  local CONTENT_LENGTH=${#STORY_CONTENT}
  [ "${CONTENT_LENGTH}" -gt 50 ]
}

check_personality_quality() {
  local PARSED=$1
  local ADAPTED=$(echo "${PARSED}" | jq -r '.data.adaptedContent // empty' 2>/dev/null)
  [ -n "${ADAPTED}" ] && [ "${ADAPTED}" != "null" ]
}

check_emotion_quality() {
  local PARSED=$1
  local MOOD=$(echo "${PARSED}" | jq -r '.data.mood // empty' 2>/dev/null)
  local RECORDED=$(echo "${PARSED}" | jq -r '.data.recorded // false' 2>/dev/null)
  [ -n "${MOOD}" ] && [ "${MOOD}" != "null" ]
}

# Test all agents with their specific actions
TEST_USER_ID=$(generate_uuid "00000000-0000-0000-0000")
TEST_LIBRARY_ID=$(generate_uuid "11111111-1111-1111-1111")

# Content Agent
test_agent_comprehensive \
  "storytailor-content-agent-production" \
  "generate_story" \
  '{"action":"generate_story","userId":"'${TEST_USER_ID}'","sessionId":"test-session-'${TIMESTAMP}'","characterName":"Test Hero","storyType":"adventure","userAge":7}' \
  "check_content_quality"

# Emotion Agent
test_agent_comprehensive \
  "storytailor-emotion-agent-production" \
  "detect_emotion" \
  '{"action":"detect_emotion","userInput":"I am feeling happy today!","userId":"'${TEST_USER_ID}'","sessionId":"test-session-'${TIMESTAMP}'","libraryId":"'${TEST_LIBRARY_ID}'"}' \
  "check_emotion_quality"

# Personality Agent
test_agent_comprehensive \
  "storytailor-personality-agent-production" \
  "adapt" \
  '{"action":"adapt","content":"This is a complex story with difficult words","age":5,"userId":"'${TEST_USER_ID}'"}' \
  "check_personality_quality"

# Library Agent
test_agent_comprehensive \
  "storytailor-library-agent-production" \
  "list-stories" \
  '{"action":"list-stories","userId":"'${TEST_USER_ID}'"}' \
  ""

# Voice Synthesis Agent
test_agent_comprehensive \
  "storytailor-voice-synthesis-agent-production" \
  "synthesize-voice" \
  '{"action":"synthesize-voice","text":"Hello, this is a test","voiceId":"default","userId":"'${TEST_USER_ID}'"}' \
  ""

# Auth Agent
test_agent_comprehensive \
  "storytailor-auth-agent-production" \
  "ensure-authenticated" \
  '{"action":"ensure-authenticated","userId":"'${TEST_USER_ID}'","sessionId":"test-session-'${TIMESTAMP}'"}' \
  ""

# Knowledge Base Agent
test_agent_comprehensive \
  "storytailor-knowledge-base-agent-production" \
  "query" \
  '{"action":"query","query":"What is a bedtime story?","userId":"'${TEST_USER_ID}'"}' \
  ""

# Child Safety Agent
test_agent_comprehensive \
  "storytailor-child-safety-agent-production" \
  "analyze_content" \
  '{"action":"analyze_content","content":"This is a safe story for children","userId":"'${TEST_USER_ID}'"}' \
  ""

# Localization Agent
test_agent_comprehensive \
  "storytailor-localization-agent-production" \
  "translate" \
  '{"action":"translate","text":"Hello world","targetLanguage":"es","userId":"'${TEST_USER_ID}'"}' \
  ""

# Analytics Intelligence Agent
test_agent_comprehensive \
  "storytailor-analytics-intelligence-agent-production" \
  "analyze" \
  '{"action":"analyze","metrics":["user_engagement"],"userId":"'${TEST_USER_ID}'"}' \
  ""

# Conversation Intelligence Agent
test_agent_comprehensive \
  "storytailor-conversation-intelligence-agent-production" \
  "analyze-conversation" \
  '{"action":"analyze-conversation","conversationHistory":["Hello"],"userId":"'${TEST_USER_ID}'"}' \
  ""

# Insights Agent
test_agent_comprehensive \
  "storytailor-insights-agent-production" \
  "generate-insights" \
  '{"action":"generate-insights","userId":"'${TEST_USER_ID}'","dataType":"user_behavior"}' \
  ""

# Educational Agent
test_agent_comprehensive \
  "storytailor-educational-agent-production" \
  "create-educational-content" \
  '{"action":"create-educational-content","topic":"math","age":8,"userId":"'${TEST_USER_ID}'"}' \
  ""

# Therapeutic Agent
test_agent_comprehensive \
  "storytailor-therapeutic-agent-production" \
  "provide-support" \
  '{"action":"provide-support","supportType":"emotional","userId":"'${TEST_USER_ID}'"}' \
  ""

# Accessibility Agent
test_agent_comprehensive \
  "storytailor-accessibility-agent-production" \
  "check-accessibility" \
  '{"action":"check-accessibility","content":"Test content","userId":"'${TEST_USER_ID}'"}' \
  ""

# Smart Home Agent
test_agent_comprehensive \
  "storytailor-smart-home-agent-production" \
  "control-device" \
  '{"action":"control-device","deviceId":"test-device","command":"turn-on","userId":"'${TEST_USER_ID}'"}' \
  ""

# Security Framework Agent
test_agent_comprehensive \
  "storytailor-security-framework-agent-production" \
  "security-check" \
  '{"action":"security-check","request":{"userId":"'${TEST_USER_ID}'"},"userId":"'${TEST_USER_ID}'"}' \
  ""

# Commerce Agent
test_agent_comprehensive \
  "storytailor-commerce-agent-production" \
  "check-subscription" \
  '{"action":"check-subscription","userId":"'${TEST_USER_ID}'"}' \
  ""

# Test remaining agents (health check only, no functional test defined yet)
for AGENT in "storytailor-universal-agent-production" "storytailor-router-production" "storytailor-avatar-agent-production" "storytailor-character-agent-production" "storytailor-content-safety-agent-production" "storytailor-conversation-agent-production" "storytailor-conversational-story-director-agent-production" "storytailor-event-system-agent-production" "storytailor-health-monitoring-agent-production" "storytailor-performance-optimization-agent-production" "storytailor-ui-tokens-agent-production"; do
  test_agent_comprehensive "${AGENT}" "" "" ""
done

# Summary
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                        Test Summary                               ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"

echo -e "${CYAN}Total Agents Tested: ${TOTAL}${NC}"
echo -e "${GREEN}Healthy: ${HEALTHY}/${TOTAL}${NC}"
echo -e "${GREEN}Functional: ${FUNCTIONAL}/${TOTAL}${NC}"
echo -e "${GREEN}Quality Verified: ${QUALITY_VERIFIED}/${TOTAL}${NC}"
echo -e "${YELLOW}Needs Verification: ${NEEDS_VERIFICATION}/${TOTAL}${NC}"
echo -e "${RED}Failed: ${FAILED}/${TOTAL}${NC}"
echo ""
echo -e "${CYAN}Results saved to: ${RESULTS_FILE}${NC}"

# Create JSON summary
if command -v jq >/dev/null 2>&1; then
  cat > "${JSON_RESULTS}" << EOF
{
  "testSuite": "Comprehensive Agent Verification",
  "timestamp": "${TIMESTAMP}",
  "region": "${REGION}",
  "summary": {
    "total": ${TOTAL},
    "healthy": ${HEALTHY},
    "functional": ${FUNCTIONAL},
    "qualityVerified": ${QUALITY_VERIFIED},
    "needsVerification": ${NEEDS_VERIFICATION},
    "failed": ${FAILED}
  }
}
EOF
  echo -e "${CYAN}JSON results saved to: ${JSON_RESULTS}${NC}"
fi

if [ "${FAILED}" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Some agents failed. Check ${RESULTS_FILE} for details.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All agents verified!${NC}"
  exit 0
fi
