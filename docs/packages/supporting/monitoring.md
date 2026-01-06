# @storytailor/monitoring

**Package**: `@storytailor/monitoring`  
**Location**: `packages/monitoring/`  
**Version**: 1.0.0

## Overview

Comprehensive monitoring and logging infrastructure for Storytailor multi-agent system. Provides observability, metrics, tracing, and alerting capabilities.

## Features

- **Winston Logging**: Structured logging with multiple transports
- **OpenTelemetry**: Distributed tracing
- **CloudWatch Integration**: AWS CloudWatch metrics and logs
- **StatsD**: Metrics collection
- **Redis Integration**: Log aggregation

## Installation

```bash
npm install @storytailor/monitoring
```

## Usage

```typescript
import { 
  Logger,
  MetricsCollector,
  Tracer,
  createLogger
} from '@storytailor/monitoring';

// Create logger
const logger = createLogger('agent-name');

// Log with context
logger.info('Agent started', { 
  agentName: 'content-agent',
  correlationId: 'corr-123'
});

// Collect metrics
const metrics = new MetricsCollector();
metrics.increment('agent.invocations', { agent: 'content-agent' });

// Distributed tracing
const tracer = new Tracer();
const span = tracer.startSpan('agent-operation');
```

## Related Documentation

- **Health Monitoring Agent**: See [Health Monitoring Agent](../../agents/health-monitoring/README.md)
- **System Monitoring**: See [System Documentation](../../system/inventory.md)

