#!/bin/bash
# Deep Verification of All Agents
# Tests actual output quality and functionality for all 29 agents

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REGION="us-east-1"
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_FILE="${TEST_RESULTS_DIR}/deep-agent-verification-${TIMESTAMP}.txt"

mkdir -p "${TEST_RESULTS_DIR}"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        Deep Agent Verification - All 29 Agents                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Generate proper UUID
generate_uuid() {
  local prefix=$1
  local hex=$(printf "%012x" $(date +%s))
  echo "${prefix}-${hex:0:4}-${hex:4:4}-${hex:8:4}-${hex:12:12}"
}

TEST_USER_ID=$(generate_uuid "00000000-0000-0000-0000")
TEST_LIBRARY_ID=$(generate_uuid "11111111-1111-1111-1111")

TOTAL=0
VERIFIED=0
NEEDS_WORK=0

# Test each agent with appropriate verification
test_agent_deep() {
  local AGENT=$1
  local ACTION=$2
  local PAYLOAD=$3
  local EXPECTED_FIELD=$4  # Field to check for in response
  
  TOTAL=$((TOTAL + 1))
  echo -e "${CYAN}Testing: ${AGENT}${NC}"
  
  if ! aws lambda get-function --function-name "${AGENT}" --region "${REGION}" > /dev/null 2>&1; then
    echo -e "  ${RED}❌ Lambda not found${NC}"
    echo "[FAIL] ${AGENT}: Lambda not found" >> "${RESULTS_FILE}"
    NEEDS_WORK=$((NEEDS_WORK + 1))
    return 1
  fi
  
  # Health check
  HEALTH_PAYLOAD='{"action":"health"}'
  echo "${HEALTH_PAYLOAD}" > /tmp/deep-health-${AGENT//-/_}.json
  
  if ! aws lambda invoke \
    --function-name "${AGENT}" \
    --region "${REGION}" \
    --payload file:///tmp/deep-health-${AGENT//-/_}.json \
    --cli-binary-format raw-in-base64-out \
    /tmp/deep-health-${AGENT//-/_}-response.json > /dev/null 2>&1; then
    echo -e "  ${RED}❌ Health check failed${NC}"
    echo "[FAIL] ${AGENT}: Health check failed" >> "${RESULTS_FILE}"
    NEEDS_WORK=$((NEEDS_WORK + 1))
    return 1
  fi
  
  # Functional test
  if [ -n "${ACTION}" ] && [ -n "${PAYLOAD}" ]; then
    echo "${PAYLOAD}" > /tmp/deep-func-${AGENT//-/_}.json
    
    if aws lambda invoke \
      --function-name "${AGENT}" \
      --region "${REGION}" \
      --payload file:///tmp/deep-func-${AGENT//-/_}.json \
      --cli-binary-format raw-in-base64-out \
      /tmp/deep-func-${AGENT//-/_}-response.json > /dev/null 2>&1; then
      
      if command -v jq >/dev/null 2>&1; then
        FUNC_RESPONSE=$(cat /tmp/deep-func-${AGENT//-/_}-response.json)
        FUNC_BODY=$(echo "${FUNC_RESPONSE}" | jq -r '.body // .' 2>/dev/null)
        FUNC_PARSED=$(echo "${FUNC_BODY}" | jq -r 'fromjson // .' 2>/dev/null || echo "${FUNC_BODY}")
        SUCCESS=$(echo "${FUNC_PARSED}" | jq -r '.success // false' 2>/dev/null)
        
        if [ "${SUCCESS}" = "true" ]; then
          # Check for expected field
          if [ -n "${EXPECTED_FIELD}" ]; then
            FIELD_VALUE=$(echo "${FUNC_PARSED}" | jq -r "${EXPECTED_FIELD} // empty" 2>/dev/null)
            if [ -n "${FIELD_VALUE}" ] && [ "${FIELD_VALUE}" != "null" ] && [ "${FIELD_VALUE}" != "" ]; then
              echo -e "  ${GREEN}✅ Verified (${EXPECTED_FIELD}: ${FIELD_VALUE:0:30}...)${NC}"
              echo "[VERIFIED] ${AGENT}: ${EXPECTED_FIELD} present" >> "${RESULTS_FILE}"
              VERIFIED=$((VERIFIED + 1))
            else
              echo -e "  ${YELLOW}⚠️  Working but ${EXPECTED_FIELD} missing${NC}"
              echo "[NEEDS_WORK] ${AGENT}: ${EXPECTED_FIELD} missing" >> "${RESULTS_FILE}"
              NEEDS_WORK=$((NEEDS_WORK + 1))
            fi
          else
            echo -e "  ${GREEN}✅ Functional${NC}"
            echo "[VERIFIED] ${AGENT}: Functional" >> "${RESULTS_FILE}"
            VERIFIED=$((VERIFIED + 1))
          fi
        else
          ERROR_MSG=$(echo "${FUNC_PARSED}" | jq -r '.error // .data.error // empty' 2>/dev/null)
          echo -e "  ${YELLOW}⚠️  Responded but success=false${NC}${ERROR_MSG:+ (${ERROR_MSG})}"
          echo "[NEEDS_WORK] ${AGENT}: success=false, error=${ERROR_MSG}" >> "${RESULTS_FILE}"
          NEEDS_WORK=$((NEEDS_WORK + 1))
        fi
      else
        echo -e "  ${YELLOW}⚠️  Functional (jq unavailable for verification)${NC}"
        echo "[VERIFIED] ${AGENT}: Functional (jq unavailable)" >> "${RESULTS_FILE}"
        VERIFIED=$((VERIFIED + 1))
      fi
    else
      echo -e "  ${YELLOW}⚠️  Functional test invocation failed${NC}"
      echo "[NEEDS_WORK] ${AGENT}: Functional test failed" >> "${RESULTS_FILE}"
      NEEDS_WORK=$((NEEDS_WORK + 1))
    fi
  else
    echo -e "  ${YELLOW}⚠️  No functional test defined${NC}"
    echo "[NEEDS_WORK] ${AGENT}: No functional test" >> "${RESULTS_FILE}"
    NEEDS_WORK=$((NEEDS_WORK + 1))
  fi
  echo ""
}

# Test all agents with deep verification
test_agent_deep \
  "storytailor-content-agent-production" \
  "generate_story" \
  '{"action":"generate_story","userId":"'${TEST_USER_ID}'","sessionId":"test-session-'${TIMESTAMP}'","characterName":"Test Hero","storyType":"adventure","userAge":7}' \
  ".data.story.content"

test_agent_deep \
  "storytailor-emotion-agent-production" \
  "detect_emotion" \
  '{"action":"detect_emotion","userInput":"I am feeling extremely happy today!","userId":"'${TEST_USER_ID}'","sessionId":"test-session-'${TIMESTAMP}'","libraryId":"'${TEST_LIBRARY_ID}'"}' \
  ".data.mood"

test_agent_deep \
  "storytailor-personality-agent-production" \
  "adapt" \
  '{"action":"adapt","content":"This is a complex story with difficult words","age":5,"userId":"'${TEST_USER_ID}'"}' \
  ".data.adaptedContent"

test_agent_deep \
  "storytailor-library-agent-production" \
  "list-stories" \
  '{"action":"list-stories","userId":"'${TEST_USER_ID}'"}' \
  ".data"

test_agent_deep \
  "storytailor-voice-synthesis-agent-production" \
  "synthesize-voice" \
  '{"action":"synthesize-voice","text":"Hello, this is a test","voiceId":"default","userId":"'${TEST_USER_ID}'"}' \
  ".data.audioUrl // .data.url"

test_agent_deep \
  "storytailor-auth-agent-production" \
  "ensure-authenticated" \
  '{"action":"ensure-authenticated","userId":"'${TEST_USER_ID}'","sessionId":"test-session-'${TIMESTAMP}'"}' \
  ".data.authenticated // .data"

test_agent_deep \
  "storytailor-knowledge-base-agent-production" \
  "query" \
  '{"action":"query","query":"What is a bedtime story?","userId":"'${TEST_USER_ID}'"}' \
  ".data.answer // .data.response"

test_agent_deep \
  "storytailor-child-safety-agent-production" \
  "analyze_content" \
  '{"action":"analyze_content","content":"This is a safe story for children","userId":"'${TEST_USER_ID}'"}' \
  ".data.hasConcern // .data.safe"

test_agent_deep \
  "storytailor-localization-agent-production" \
  "translate" \
  '{"action":"translate","text":"Hello world","targetLanguage":"es","userId":"'${TEST_USER_ID}'"}' \
  ".data.translatedText // .data.translation"

test_agent_deep \
  "storytailor-analytics-intelligence-agent-production" \
  "analyze" \
  '{"action":"analyze","metrics":["user_engagement"],"userId":"'${TEST_USER_ID}'"}' \
  ".data.analysis // .data.metrics"

test_agent_deep \
  "storytailor-conversation-intelligence-agent-production" \
  "analyze-conversation" \
  '{"action":"analyze-conversation","conversationHistory":["Hello"],"userId":"'${TEST_USER_ID}'"}' \
  ".data.analysis"

test_agent_deep \
  "storytailor-insights-agent-production" \
  "generate-insights" \
  '{"action":"generate-insights","userId":"'${TEST_USER_ID}'","dataType":"user_behavior"}' \
  ".data.insights"

test_agent_deep \
  "storytailor-educational-agent-production" \
  "create-educational-content" \
  '{"action":"create-educational-content","topic":"math","age":8,"userId":"'${TEST_USER_ID}'"}' \
  ".data.content"

test_agent_deep \
  "storytailor-therapeutic-agent-production" \
  "provide-support" \
  '{"action":"provide-support","supportType":"emotional","userId":"'${TEST_USER_ID}'"}' \
  ".data.support"

test_agent_deep \
  "storytailor-accessibility-agent-production" \
  "check-accessibility" \
  '{"action":"check-accessibility","content":"Test content","userId":"'${TEST_USER_ID}'"}' \
  ".data.accessible"

test_agent_deep \
  "storytailor-smart-home-agent-production" \
  "control-device" \
  '{"action":"control-device","deviceId":"test-device","command":"turn-on","userId":"'${TEST_USER_ID}'"}' \
  ".data.success"

test_agent_deep \
  "storytailor-security-framework-agent-production" \
  "security-check" \
  '{"action":"security-check","request":{"userId":"'${TEST_USER_ID}'"},"userId":"'${TEST_USER_ID}'"}' \
  ".data.safe"

test_agent_deep \
  "storytailor-commerce-agent-production" \
  "check-subscription" \
  '{"action":"check-subscription","userId":"'${TEST_USER_ID}'"}' \
  ".data.subscription"

# Test remaining agents (health only)
for AGENT in "storytailor-universal-agent-production" "storytailor-router-production" "storytailor-avatar-agent-production" "storytailor-character-agent-production" "storytailor-content-safety-agent-production" "storytailor-conversation-agent-production" "storytailor-conversational-story-director-agent-production" "storytailor-event-system-agent-production" "storytailor-health-monitoring-agent-production" "storytailor-performance-optimization-agent-production" "storytailor-ui-tokens-agent-production"; do
  test_agent_deep "${AGENT}" "" "" ""
done

# Summary
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                        Test Summary                               ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"

echo -e "${CYAN}Total Agents: ${TOTAL}${NC}"
echo -e "${GREEN}Verified: ${VERIFIED}/${TOTAL}${NC}"
echo -e "${YELLOW}Needs Work: ${NEEDS_WORK}/${TOTAL}${NC}"
echo ""
echo -e "${CYAN}Results saved to: ${RESULTS_FILE}${NC}"

if [ "${NEEDS_WORK}" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Some agents need work. Check ${RESULTS_FILE} for details.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All agents verified!${NC}"
  exit 0
fi
