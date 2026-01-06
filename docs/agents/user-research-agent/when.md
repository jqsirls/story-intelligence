# User Research Agent - When

**Status**: ✅ Active  
**Last Updated**: 2025-12-14

## When to Use Fieldnotes

Fieldnotes is designed for continuous operation, providing both scheduled insights and on-demand analysis.

## Scheduled Operations

### Hourly Aggregation

**When**: Every hour, automatically

**What happens**:
- Data aggregation (SQL only, $0 cost)
- Event counting and basic statistics
- No LLM calls, pure SQL operations

**Use case**: Continuous data collection and basic metrics

**Configuration**: EventBridge rule `fieldnotes-hourly-production`

### Daily Pattern Detection

**When**: Daily at 2 AM UTC, automatically

**What happens**:
- Pattern detection using cheap LLM (GPT-4o-mini)
- Anomaly detection
- Trend identification
- Cost: ~$2-5/day

**Use case**: Daily pattern monitoring and anomaly detection

**Configuration**: EventBridge rule `fieldnotes-daily-production`

### Weekly Brief Generation

**When**: Every Monday at 9 AM UTC, automatically

**What happens**:
- Full analysis across all five tracks
- Weekly brief generation using premium LLM (Claude Sonnet)
- Delivery via configured channels (Slack, Email, Webhook)
- Cost: ~$10-20/week

**Use case**: Weekly research brief with critical findings, tensions, and opportunities

**Configuration**: EventBridge rule `fieldnotes-weekly-production`

## On-Demand Operations

### Feature Pre-Launch Analysis

**When**: Before building a major feature

**Use case**: Pre-mortem analysis to identify risks before development

**How to trigger**:
```bash
curl -X POST "${FUNCTION_URL}/api/v1/pre-launch" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "storytailor",
    "feature": {
      "name": "Quick Story Mode",
      "description": "Fast-path story creation",
      "targetAudience": "parents"
    }
  }'
```

**Output**: Pre-launch risk memo with ship/don't ship/fix first recommendation

### Behavior Analysis

**When**: Need insights on specific timeframe or focus area

**Use case**: Understanding user behavior patterns for specific time period

**How to trigger**:
```bash
curl -X POST "${FUNCTION_URL}/api/v1/analyze" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "storytailor",
    "timeframe": "7 days",
    "focus": "all"
  }'
```

**Output**: Analysis result with insights, patterns, and track evaluations

### Agent Challenge

**When**: Need to question another agent's output or decision

**Use case**: Cross-validate agent decisions with data-backed questions

**How to trigger**:
```bash
curl -X POST "${FUNCTION_URL}/api/v1/challenge" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "storytailor",
    "agentName": "content-agent",
    "question": "Why are princess stories showing low retention?"
  }'
```

**Output**: Agent challenge with synthesis and actionability assessment

### Cost Status Check

**When**: Monitor cost usage and budget status

**Use case**: Check if approaching cost limits or need to adjust budget

**How to trigger**:
```bash
curl "${FUNCTION_URL}/api/v1/cost/status?tenantId=storytailor" \
  -H "X-API-Key: ${API_KEY}"
```

**Output**: Cost status with current usage, limit, and status (normal/warning/blocked)

## Integration Points

### With Other Agents

Fieldnotes can challenge and interrogate other agents:

- **Content Agent**: "Why are certain story types showing low retention?"
- **Library Agent**: "What patterns exist in abandoned story creation flows?"
- **Emotion Agent**: "Are emotional check-ins correlating with engagement?"
- **Commerce Agent**: "What features drive subscription conversions?"

**When to use**: When you need data-backed validation of another agent's decisions

### With Product Analytics

Fieldnotes consumes:
- Event store data
- User behavior patterns
- Support ticket data
- Internal roadmap information

**When to use**: Continuous monitoring of product health and user behavior

### With Delivery Channels

Fieldnotes delivers via:
- **Slack**: Weekly briefs and critical findings
- **Email**: Scheduled reports and alerts
- **Webhooks**: Custom integrations (Make.com, Zapier, Buildship)

**When to use**: Configure delivery channels for automatic insight delivery

## Usage Patterns

### Continuous Monitoring

**Pattern**: Let scheduled tasks run automatically
- Hourly aggregation (data collection)
- Daily pattern detection (anomaly detection)
- Weekly briefs (comprehensive insights)

**Best for**: Ongoing product health monitoring

### Feature Development

**Pattern**: Use pre-launch analysis before building
1. Propose feature
2. Run pre-launch memo
3. Review risks and recommendations
4. Fix issues before building
5. Build with confidence

**Best for**: Risk mitigation before development

### Ad-Hoc Analysis

**Pattern**: On-demand analysis for specific questions
- Behavior analysis for specific timeframe
- Agent challenges for cross-validation
- Cost monitoring for budget management

**Best for**: Answering specific questions or investigating issues

## When NOT to Use

Fieldnotes is NOT designed for:

1. **Real-time analysis** - Designed for batch processing (hourly/daily/weekly)
2. **Individual user analysis** - Focuses on patterns, not individual users
3. **A/B test analysis** - Use dedicated analytics tools for A/B tests
4. **Financial reporting** - Not a financial analytics tool
5. **Security monitoring** - Use security tools for threat detection

## Best Practices

### Scheduled Tasks

1. **Let them run automatically** - Don't disable scheduled tasks
2. **Monitor CloudWatch logs** - Check for errors weekly
3. **Review weekly briefs** - Act on at least one insight per week
4. **Configure delivery channels** - Ensure insights reach the right people

### On-Demand Analysis

1. **Use pre-launch memos** - Before building major features
2. **Challenge agents** - When you need data-backed validation
3. **Monitor costs** - Check cost status monthly
4. **Analyze specific timeframes** - When investigating issues

### Integration

1. **Configure Slack webhook** - For team visibility
2. **Set up email recipients** - For stakeholders
3. **Use webhooks** - For custom integrations (Make.com, Zapier)
4. **Challenge other agents** - For cross-validation

## Related Documentation

- [What It Does](./what.md) - Detailed functionality
- [Where It's Deployed](./where.md) - Deployment and access information
- [Development Guide](./development.md) - API reference and technical details
