# Agent to Lambda Function Mapping

**Date**: 2025-12-14  
**Purpose**: Map all agents from AGENT_INDEX.md to deployed Lambda functions  
**Total Lambda Functions**: 35  
**Total Agents Documented**: 21+

## Mapping Methodology

- **Source**: `agentic-ux/AGENT_INDEX.md` - Documented agents
- **Target**: AWS Lambda functions with `storytailor-*-production` pattern
- **Naming Convention**: `storytailor-{agent-name}-{environment}` or `storytailor-{agent-name}-agent-{environment}`

## Complete Agent to Lambda Mapping

| Agent Name (from AGENT_INDEX.md) | Lambda Function Name | Status | Notes |
|----------------------------------|---------------------|--------|-------|
| Router | `storytailor-router-production` | ✅ Found | Core orchestration |
| Universal Agent | `storytailor-universal-agent-production` | ✅ Found | API gateway (has deployment issue) |
| Content Agent | `storytailor-content-production` | ✅ Found | Also: `storytailor-content-agent-production` |
| Conversation Agent | `storytailor-conversation-agent-production` | ✅ Found | |
| Emotion Agent | `storytailor-emotion-agent-production` | ✅ Found | |
| Personality Agent | `storytailor-personality-agent-production` | ✅ Found | |
| Auth Agent | `storytailor-auth-agent-production` | ✅ Found | |
| Library Agent | `storytailor-library-agent-production` | ✅ Found | |
| Child Safety Agent | `storytailor-child-safety-agent-production` | ✅ Found | |
| Commerce Agent | `storytailor-commerce-agent-production` | ✅ Found | |
| Educational Agent | `storytailor-educational-agent-production` | ✅ Found | |
| Therapeutic Agent | `storytailor-therapeutic-agent-production` | ✅ Found | |
| Knowledge Base Agent | `storytailor-knowledge-base-agent-production` | ✅ Found | |
| Accessibility Agent | `storytailor-accessibility-agent-production` | ✅ Found | |
| Localization Agent | `storytailor-localization-agent-production` | ✅ Found | |
| Smart Home Agent | `storytailor-smart-home-agent-production` | ✅ Found | |
| Storytailor Agent | Not found as separate Lambda | ⚠️ Missing | May be bundled in universal-agent |
| Conversation Intelligence | `storytailor-conversation-intelligence-production` | ✅ Found | |
| Analytics Intelligence | `storytailor-analytics-intelligence-production` | ✅ Found | |
| Insights Agent | `storytailor-insights-agent-production` | ✅ Found | |
| User Research Agent (Fieldnotes) | `storytailor-fieldnotes-api-production`, `storytailor-fieldnotes-scheduled-production` | ✅ Found | Two Lambda functions: API and scheduled tasks |
| IDP Agent | `storytailor-idp-agent-production` | ✅ Found | |
| Kid Communication Intelligence | Not found as separate Lambda | ⚠️ Missing | Feature flag enabled, may be bundled |
| Voice Synthesis | `storytailor-voice-synthesis-agent-production` | ✅ Found | |
| Content Safety | `storytailor-content-safety-agent-production` | ✅ Found | |
| Event System | `storytailor-event-system-production` | ✅ Found | |
| Health Monitoring | `storytailor-health-monitoring-agent-production` | ✅ Found | |

## Additional Lambda Functions (Not in AGENT_INDEX.md)

| Lambda Function Name | Possible Agent | Status | Notes |
|---------------------|----------------|--------|-------|
| `storytailor-character-agent-production` | Character Agent | ✅ Found | Not in AGENT_INDEX.md |
| `storytailor-security-framework-production` | Security Framework | ✅ Found | Not in AGENT_INDEX.md |
| `storytailor-mcp-server-production` | MCP Server | ✅ Found | Infrastructure, not an agent |
| `storytailor-analytics-agent-production` | Analytics Agent | ✅ Found | Different from Analytics Intelligence? |
| `storytailor-token-service-production` | Token Service | ✅ Found | Infrastructure service |
| `storytailor-avatar-agent-production` | Avatar Agent | ✅ Found | Not in AGENT_INDEX.md |
| `storytailor-performance-optimization-production` | Performance Optimization | ✅ Found | Infrastructure service |
| `storytailor-conversational-story-director-production` | Conversational Story Director | ✅ Found | Not in AGENT_INDEX.md |

## Mapping Summary

### Agents with Lambda Functions: 25/27 (93%)
- ✅ 25 agents have corresponding Lambda functions
- ⚠️ 2 agents missing as separate Lambdas (may be bundled):
  - Storytailor Agent
  - Kid Communication Intelligence

### Additional Functions: 8
- 8 Lambda functions exist that are not explicitly listed in AGENT_INDEX.md
- These may be:
  - Infrastructure services (MCP server, token service, performance optimization)
  - Agents not yet documented in AGENT_INDEX.md
  - Alternative names for existing agents

### Special Cases

**User Research Agent (Fieldnotes)** has two Lambda functions:
- `storytailor-fieldnotes-api-production` - REST API endpoints
- `storytailor-fieldnotes-scheduled-production` - Scheduled tasks (hourly/daily/weekly)

Both functions are deployed via `scripts/deploy-user-research-agent.sh`.

## Router Agent Endpoint Configuration

From `packages/router/src/config.ts`, Router expects these agent endpoints:

| Agent | Environment Variable | Default Endpoint | Production Lambda |
|-------|---------------------|-------------------|-------------------|
| auth | `AUTH_AGENT_ENDPOINT` | `http://localhost:3001/auth` | `storytailor-auth-agent-production` |
| content | `CONTENT_AGENT_ENDPOINT` | `http://localhost:3002/content` | `storytailor-content-production` or `storytailor-content-agent-production` |
| library | `LIBRARY_AGENT_ENDPOINT` | `http://localhost:3003/library` | `storytailor-library-agent-production` |
| emotion | `EMOTION_AGENT_ENDPOINT` | `http://localhost:3004/emotion` | `storytailor-emotion-agent-production` |
| commerce | `COMMERCE_AGENT_ENDPOINT` | `http://localhost:3005/commerce` | `storytailor-commerce-agent-production` |
| insights | `INSIGHTS_AGENT_ENDPOINT` | `http://localhost:3006/insights` | `storytailor-insights-agent-production` |

**Note**: Router configuration only includes 6 agents, but 35 Lambda functions exist. This suggests:
1. Router may invoke agents via Lambda invoke (not HTTP endpoints)
2. Some agents may not be directly routed by Router
3. Agent endpoints may be configured via Lambda Function URLs or API Gateway
4. Some agents (like Fieldnotes) operate independently via Function URLs

## Issues and Gaps

1. **Universal Agent Deployment Issue** (CRITICAL)
   - Error: `Cannot find module '@alexa-multi-agent/router'`
   - Impact: Blocks all API testing
   - Action: Redeploy with router dependency bundled

2. **Agent Endpoint Configuration Unknown**
   - Router config shows HTTP endpoints, but most Lambdas don't have Function URLs
   - Need to verify how Router actually invokes agents (Lambda invoke vs HTTP)

3. **Missing Agents in AGENT_INDEX.md**
   - Character Agent exists but not in index
   - Avatar Agent exists but not in index
   - Conversational Story Director exists but not in index

4. **Duplicate/Alternative Names**
   - `storytailor-content-production` vs `storytailor-content-agent-production`
   - `storytailor-analytics-intelligence-production` vs `storytailor-analytics-agent-production`

## Next Steps

1. Verify Router agent invocation method (Lambda invoke vs HTTP)
2. Fix Universal Agent deployment
3. Update AGENT_INDEX.md with missing agents
4. Document agent endpoint configuration for Router
5. Test Router orchestration with actual agent invocations
