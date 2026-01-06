# @storytailor/health-monitoring

Comprehensive health monitoring orchestrator for all agents and services in the Storytailor platform.

## Overview

This package provides real-time health monitoring, alerting, and performance tracking for the entire Storytailor multi-agent system. Powered by Story Intelligence™, it ensures maximum uptime and optimal performance across all services.

## Features

### 🏥 **Comprehensive Health Checks**
- **Lambda Functions**: Real-time health monitoring for all deployed functions
- **External APIs**: OpenAI, ElevenLabs, Supabase connectivity verification
- **Multi-Agent System**: Individual agent status and coordination health
- **Database**: Connection pooling, query performance, and availability
- **Infrastructure**: CPU, memory, network, and resource utilization

### 📊 **Real-Time Monitoring Dashboard**
- **System Overview**: Overall health status with color-coded indicators
- **Service Details**: Individual service metrics, response times, error rates
- **Performance Metrics**: Detailed analytics with historical trends
- **Agent Coordination**: Multi-agent communication and circuit breaker status
- **Alert Management**: Active alerts with severity levels and resolution tracking

### 🚨 **Intelligent Alerting**
- **Threshold-Based Alerts**: Configurable thresholds for response time, error rate, uptime
- **Severity Classification**: Low, medium, high, and critical alert levels
- **Smart Notifications**: Slack, email, PagerDuty integration with rate limiting
- **Alert Aggregation**: Intelligent grouping to reduce notification noise
- **Escalation Rules**: Automatic escalation for unacknowledged critical alerts

### 📈 **Performance Analytics**
- **Health Scores**: Calculated health scores for each service and overall system
- **Uptime Tracking**: Service availability metrics with SLA compliance
- **Response Time Analytics**: Performance trends and bottleneck identification
- **Error Rate Monitoring**: Failure pattern analysis and root cause insights
- **Capacity Planning**: Resource utilization trends and scaling recommendations

## Installation

```bash
npm install @storytailor/health-monitoring
```

## Usage

### Basic Setup

```typescript
import { HealthMonitoringOrchestrator, DEFAULT_HEALTH_CONFIG } from '@storytailor/health-monitoring';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const config = {
  ...DEFAULT_HEALTH_CONFIG,
  services: [
    'storytailor-api-staging',
    'storytailor-knowledge-base-staging',
    'content-agent',
    'emotion-agent',
    'personality-agent'
  ]
};

const healthMonitor = new HealthMonitoringOrchestrator(config, logger);

// Start monitoring
await healthMonitor.start();

// Get system health
const health = await healthMonitor.getSystemHealth();
console.log('System Health:', health.overall);
```

### Advanced Configuration

```typescript
const config = {
  services: [
    'storytailor-api-staging',
    'storytailor-knowledge-base-staging',
    'router',
    'content-agent',
    'emotion-agent',
    'personality-agent',
    'auth-agent',
    'library-agent',
    'commerce-agent',
    'educational-agent',
    'therapeutic-agent',
    'accessibility-agent',
    'localization-agent',
    'conversation-intelligence',
    'analytics-intelligence',
    'insights-agent',
    'smart-home-agent',
    'child-safety-agent',
    'security-framework',
    'voice-synthesis',
    'supabase',
    'openai',
    'elevenlabs'
  ],
  checkInterval: 30000, // 30 seconds
  alertThresholds: {
    responseTime: 5000, // 5 seconds
    errorRate: 0.1, // 10%
    uptime: 99.0 // 99%
  },
  notifications: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channel: '#storytailor-alerts'
    },
    email: {
      to: ['ops@storytailor.com'],
      smtp: {
        host: 'smtp.sendgrid.net',
        auth: {
          user: process.env.SENDGRID_USER,
          pass: process.env.SENDGRID_API_KEY
        }
      }
    },
    pagerduty: {
      apiKey: process.env.PAGERDUTY_API_KEY,
      serviceKey: process.env.PAGERDUTY_SERVICE_KEY
    }
  }
};
```

### Event Handling

```typescript
healthMonitor.on('monitoring:started', () => {
  console.log('🏥 Health monitoring started');
});

healthMonitor.on('service:checked', (health) => {
  console.log(`✅ ${health.name}: ${health.status} (${health.responseTime}ms)`);
});

healthMonitor.on('alert:created', (alert) => {
  console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
});

healthMonitor.on('system:health', (summary) => {
  console.log(`📊 System: ${summary.healthy}/${summary.total} services healthy`);
});
```

## API Endpoints

When integrated with the main API Lambda, the following health endpoints become available:

### GET /health
Basic health check for load balancers and uptime monitoring.

### GET /health/dashboard
Comprehensive health dashboard with detailed system overview.

```json
{
  "success": true,
  "data": {
    "overall": "healthy",
    "services": [...],
    "alerts": [...],
    "metrics": {
      "cpu": { "usage": 15, "loadAverage": [0.5, 0.7, 0.8] },
      "memory": { "used": 512, "total": 1024, "percentage": 50 },
      "requests": { "total": 1000, "errorsPerMinute": 0, "avgResponseTime": 150 },
      "agents": { "active": 8, "total": 15, "healthy": 14 },
      "database": { "connections": 5, "queryTime": 25 },
      "external": {
        "openai": true,
        "elevenlabs": true,
        "supabase": true
      }
    },
    "systemScore": 95,
    "uptime": { "system": 99.8, "agents": 99.5 }
  }
}
```

### GET /health/services
Detailed status of all monitored services.

### GET /health/agents
Multi-agent system health with circuit breaker status.

### GET /health/metrics
Real-time system performance metrics.

## Health Scoring

Each service receives a health score (0-100) based on:

- **Response Time**: Penalty for slow responses (>1s, >2s, >5s)
- **Error Rate**: Penalty for high error rates (>1%, >5%, >10%)
- **Status**: Penalty for degraded (-25) or unhealthy (-50) status
- **Uptime**: Bonus for high availability (>99%, >99.9%, >99.99%)

System score is calculated as weighted average with critical service emphasis.

## Alerting Rules

### Response Time Alerts
- **Medium**: Response time > threshold
- **High**: Response time > threshold × 2
- **Critical**: Service completely unresponsive

### Error Rate Alerts
- **Low**: Error rate > 1%
- **Medium**: Error rate > 5%
- **High**: Error rate > 10%
- **Critical**: Error rate > 50%

### Availability Alerts
- **Medium**: Uptime < 99%
- **High**: Uptime < 95%
- **Critical**: Service completely down

### Agent-Specific Alerts
- **Medium**: Agent degraded performance
- **High**: Agent coordination issues
- **Critical**: Agent complete failure

## Integration with Existing Infrastructure

### Supabase Integration
Stores metrics in `system_metrics`, `alert_rules`, and `system_alerts` tables.

### CloudWatch Integration
Sends custom metrics to CloudWatch for AWS monitoring.

### Datadog Integration
Forwards metrics to Datadog for advanced analytics.

### PagerDuty Integration
Creates incidents for critical alerts with context and runbooks.

## Deployment

### Standalone Service
```bash
# Install dependencies
npm install

# Build package
npm run build

# Start monitoring service
node dist/index.js
```

### Lambda Integration
The health monitoring is designed to be embedded in the main API Lambda:

```javascript
// In deploy-complete-system.sh
const healthMonitor = new HealthMonitoringOrchestrator(config, logger);

// Add health endpoints to routing
case '/health/dashboard':
  return await healthMonitor.getDetailedHealthReport();
```

## Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Optional - Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_API_KEY=your-pagerduty-key
SENDGRID_API_KEY=your-sendgrid-key

# Optional - Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_ALERT_THRESHOLD_RESPONSE_TIME=5000
HEALTH_ALERT_THRESHOLD_ERROR_RATE=0.1
```

## Monitoring Best Practices

### 1. Service Registration
Register all critical services for monitoring:
- Main API Lambda
- Agent Lambdas
- External APIs
- Database connections
- Cache layers

### 2. Threshold Configuration
Set appropriate thresholds based on SLA requirements:
- Response time: 95th percentile + buffer
- Error rate: Business impact tolerance
- Uptime: SLA commitment minus margin

### 3. Alert Management
Implement proper alert lifecycle:
- Immediate notification for critical issues
- Escalation for unacknowledged alerts
- Automatic resolution when issues clear
- Post-incident analysis and threshold tuning

### 4. Dashboard Design
Create role-specific dashboards:
- Executive: High-level system health
- Operations: Detailed service metrics
- Engineering: Performance analytics
- Support: User impact indicators

## Troubleshooting

### Common Issues

#### High Response Times
1. Check CPU and memory utilization
2. Analyze database query performance
3. Review recent deployments
4. Investigate external API latency

#### High Error Rates
1. Check application logs for error patterns
2. Verify external API connectivity
3. Review recent configuration changes
4. Analyze traffic patterns

#### Service Unavailability
1. Verify service deployment status
2. Check network connectivity
3. Review security group configurations
4. Analyze load balancer health

### Debug Mode
Enable verbose logging for troubleshooting:

```typescript
const config = {
  ...DEFAULT_HEALTH_CONFIG,
  debug: true,
  logLevel: 'debug'
};
```

## Contributing

When adding new services or metrics:

1. **Update Service List**: Add to default services configuration
2. **Implement Health Check**: Add service-specific health check method
3. **Configure Thresholds**: Set appropriate alert thresholds
4. **Add Tests**: Ensure comprehensive test coverage
5. **Update Documentation**: Document new monitoring capabilities

## License

Part of the Storytailor platform. All rights reserved.

---

**Powered by Story Intelligence™**

## Related Packages

- `@storytailor/api-contract` - API type definitions
- `@storytailor/ui-tokens` - Design system tokens
- `packages/event-system` - Event-driven monitoring infrastructure
- `packages/analytics-intelligence` - Advanced analytics and insights
 
 
 