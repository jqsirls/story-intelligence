# AI Integration Load Testing Infrastructure

This comprehensive load testing infrastructure provides advanced capabilities for testing AI integration performance, scalability, and reliability under various load conditions.

## 🚀 Features

### Core Components

1. **LoadTestingInfrastructure** - Main orchestrator for load testing
2. **ConcurrentRequestHandler** - Manages concurrent request execution
3. **ServiceScalabilityValidator** - Validates service scalability characteristics
4. **ResourceUtilizationMonitor** - Monitors system resources during testing
5. **PerformanceDegradationDetector** - Detects performance degradation patterns
6. **BottleneckIdentificationTool** - Identifies and analyzes performance bottlenecks

### Key Capabilities

- **Concurrent Request Handling** - Execute thousands of concurrent requests with proper resource management
- **Service Scalability Validation** - Test horizontal and vertical scaling behaviors
- **Resource Utilization Monitoring** - Track CPU, memory, network, and disk usage
- **Performance Degradation Detection** - Real-time detection of performance issues
- **Bottleneck Identification** - Automated identification of system bottlenecks
- **Predictive Analysis** - Predict future performance issues before they occur
- **Comprehensive Reporting** - Detailed reports with recommendations

## 📋 Requirements

The load testing infrastructure addresses the following requirements from the AI Integration Testing specification:

- **Requirement 6.1**: Multiple story requests handled efficiently
- **Requirement 6.5**: Response times maintained under 30 seconds
- **Concurrent Request Handling**: Support for high-volume concurrent requests
- **Service Scalability Validation**: Ensure services scale properly under load
- **Resource Utilization Monitoring**: Track system resource usage
- **Performance Degradation Detection**: Identify performance issues early
- **Bottleneck Identification**: Pinpoint system bottlenecks

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Install additional testing dependencies
npm install --save-dev @types/node
```

## 🎯 Quick Start

### Basic Load Test

```typescript
import { LoadTestingInfrastructure } from './LoadTestingInfrastructure';

const config = {
  testName: 'AI Integration Load Test',
  duration: 60000, // 1 minute
  maxConcurrentRequests: 50,
  rampUpTime: 10000,
  rampDownTime: 10000,
  endpoints: {
    openai: 'https://api.openai.com/v1/chat/completions',
    elevenlabs: 'https://api.elevenlabs.io/v1/text-to-speech',
    personality: 'https://api.storytailor.com/v1/personality',
    webvtt: 'https://api.storytailor.com/v1/webvtt'
  },
  thresholds: {
    maxResponseTime: 15000,
    maxErrorRate: 1,
    maxCpuUsage: 80,
    maxMemoryUsage: 85,
    minThroughput: 10
  },
  scenarios: [
    {
      name: 'Story Generation',
      weight: 40,
      endpoint: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      payload: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Tell me a story' }]
      },
      expectedResponseTime: 8000
    }
    // ... more scenarios
  ]
};

const loadTester = new LoadTestingInfrastructure(config);
const result = await loadTester.startLoadTest();
console.log('Test completed:', result);
```

### Scalability Testing

```typescript
import { ServiceScalabilityValidator } from './ServiceScalabilityValidator';

const scalabilityConfig = {
  serviceName: 'AI Integration Service',
  baseUrl: 'https://api.storytailor.com',
  testDuration: 180000,
  scalingSteps: [
    {
      name: 'Low Load',
      concurrency: 10,
      duration: 30000,
      expectedThroughput: 50,
      expectedResponseTime: 1000
    },
    {
      name: 'High Load',
      concurrency: 100,
      duration: 30000,
      expectedThroughput: 300,
      expectedResponseTime: 2000
    }
  ],
  thresholds: {
    maxResponseTimeDegradation: 50,
    maxThroughputDegradation: 30,
    maxErrorRateIncrease: 5,
    minScalingEfficiency: 70
  },
  endpoints: [
    {
      name: 'Story Generation',
      path: '/v1/stories',
      method: 'POST',
      weight: 60,
      criticalPath: true
    }
  ]
};

const validator = new ServiceScalabilityValidator(scalabilityConfig);
const result = await validator.runScalabilityTest();
```

### Resource Monitoring

```typescript
import { ResourceUtilizationMonitor } from './ResourceUtilizationMonitor';

const monitor = new ResourceUtilizationMonitor({
  monitoringInterval: 2000,
  enableDetailedMetrics: true,
  saveMetricsToFile: true,
  alertThresholds: {
    cpu: { warning: 70, critical: 85 },
    memory: { warning: 75, critical: 90 },
    disk: { warning: 80, critical: 95 },
    network: {
      warningBytesPerSec: 100 * 1024 * 1024,
      criticalBytesPerSec: 500 * 1024 * 1024
    }
  }
});

await monitor.startMonitoring();
// ... run your tests
const snapshots = await monitor.stopMonitoring();
```

## 📊 Running Tests

### Command Line Usage

```bash
# Run comprehensive load test
npm run test:load

# Run specific test type
ts-node testing/ai-integration/examples/load-testing-example.ts comprehensive
ts-node testing/ai-integration/examples/load-testing-example.ts scalability
ts-node testing/ai-integration/examples/load-testing-example.ts both
```

### Environment Variables

Set the following environment variables for testing:

```bash
# API Endpoints
export OPENAI_API_URL="https://api.openai.com/v1/chat/completions"
export ELEVENLABS_API_URL="https://api.elevenlabs.io/v1/text-to-speech"
export PERSONALITY_API_URL="https://api.storytailor.com/v1/personality"
export WEBVTT_API_URL="https://api.storytailor.com/v1/webvtt"

# API Keys
export OPENAI_API_KEY="your-openai-api-key"
export ELEVENLABS_API_KEY="your-elevenlabs-api-key"
export STORYTAILOR_API_KEY="your-storytailor-api-key"

# Voice Configuration
export ELEVENLABS_VOICE_ID="your-voice-id"
```

### Jest Tests

```bash
# Run unit tests
npm test testing/ai-integration/__tests__/LoadTestingInfrastructure.test.ts

# Run all load testing tests
npm test testing/ai-integration/__tests__/
```

## 📈 Monitoring and Alerts

### Real-time Monitoring

The infrastructure provides real-time monitoring of:

- **Request Metrics**: Response times, throughput, error rates
- **System Resources**: CPU, memory, network, disk usage
- **Performance Trends**: Degradation patterns and predictions
- **Bottlenecks**: Automated identification and root cause analysis

### Alert Types

1. **Performance Alerts**
   - Response time degradation
   - Throughput decrease
   - Error rate increase
   - Latency spikes

2. **Resource Alerts**
   - High CPU usage
   - Memory exhaustion
   - Disk space issues
   - Network congestion

3. **Bottleneck Alerts**
   - Component-specific bottlenecks
   - Correlation analysis
   - Root cause identification

### Event Listeners

```typescript
loadTester.on('performanceDegradation', (data) => {
  console.log(`Performance degradation: ${data.degradationFactor}x slower`);
});

resourceMonitor.on('resourceAlert', (alert) => {
  console.log(`Resource alert: ${alert.message}`);
});

degradationDetector.on('anomalyDetected', (anomaly) => {
  console.log(`Anomaly detected: ${anomaly.description}`);
});

bottleneckTool.on('bottleneckIdentified', (bottleneck) => {
  console.log(`Bottleneck: ${bottleneck.description}`);
});
```

## 📋 Test Scenarios

### AI Service Scenarios

1. **Story Generation (OpenAI)**
   - Weight: 35%
   - Expected Response Time: 8 seconds
   - Payload: GPT-3.5-turbo with story prompts

2. **Voice Synthesis (ElevenLabs)**
   - Weight: 25%
   - Expected Response Time: 12 seconds
   - Payload: Text-to-speech with child-friendly voices

3. **Personality Analysis**
   - Weight: 20%
   - Expected Response Time: 2 seconds
   - Payload: Age-appropriate personality traits

4. **WebVTT Synchronization**
   - Weight: 15%
   - Expected Response Time: 3 seconds
   - Payload: Audio-text synchronization

5. **Health Checks**
   - Weight: 5%
   - Expected Response Time: 500ms
   - Payload: System health validation

### Load Patterns

- **Ramp-up Phase**: Gradually increase load to target concurrency
- **Sustained Load**: Maintain peak load for specified duration
- **Ramp-down Phase**: Gradually decrease load to zero
- **Spike Testing**: Sudden load increases to test resilience
- **Stress Testing**: Beyond normal capacity to find breaking points

## 📊 Reporting

### Comprehensive Reports

The infrastructure generates detailed reports including:

- **Performance Metrics**: Response times, throughput, error rates
- **Resource Utilization**: CPU, memory, network, disk usage
- **Scalability Analysis**: Linear scaling ranges, breakpoints
- **Bottleneck Analysis**: Component bottlenecks and correlations
- **Recommendations**: Actionable optimization suggestions

### Report Formats

- **JSON**: Machine-readable detailed data
- **Console**: Human-readable summary
- **Charts**: Visual performance trends (when integrated with visualization tools)

### Sample Report Structure

```json
{
  "summary": {
    "testName": "AI Integration Load Test",
    "duration": 300000,
    "totalRequests": 15000,
    "successRate": "99.2%",
    "averageResponseTime": "2.5s",
    "throughput": "50 RPS",
    "overallResult": "passed"
  },
  "performance": {
    "responseTimeP95": "8.2s",
    "responseTimeP99": "12.1s",
    "errorRate": "0.8%"
  },
  "resources": {
    "peakCpuUsage": "78%",
    "peakMemoryUsage": "82%",
    "trends": [...]
  },
  "bottlenecks": {
    "totalBottlenecks": 3,
    "criticalBottlenecks": 0,
    "components": ["Network", "Database"]
  },
  "recommendations": [
    "Implement response caching for AI services",
    "Scale horizontally during peak loads",
    "Optimize database connection pooling"
  ]
}
```

## 🔧 Configuration

### Load Test Configuration

```typescript
interface LoadTestConfig {
  testName: string;
  duration: number; // milliseconds
  maxConcurrentRequests: number;
  rampUpTime: number;
  rampDownTime: number;
  endpoints: {
    openai: string;
    elevenlabs: string;
    personality: string;
    webvtt: string;
  };
  thresholds: {
    maxResponseTime: number;
    maxErrorRate: number;
    maxCpuUsage: number;
    maxMemoryUsage: number;
    minThroughput: number;
  };
  scenarios: LoadTestScenario[];
}
```

### Scalability Test Configuration

```typescript
interface ScalabilityTestConfig {
  serviceName: string;
  baseUrl: string;
  testDuration: number;
  scalingSteps: ScalingStep[];
  thresholds: ScalabilityThresholds;
  endpoints: ScalabilityEndpoint[];
}
```

### Resource Monitor Configuration

```typescript
interface ResourceMonitorConfig {
  monitoringInterval: number;
  alertThresholds: ResourceThresholds;
  enableDetailedMetrics: boolean;
  saveMetricsToFile: boolean;
  metricsFilePath?: string;
}
```

## 🚨 Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce `maxConcurrentRequests`
   - Increase `monitoringInterval`
   - Enable garbage collection optimization

2. **Network Timeouts**
   - Increase `requestTimeout` in ConcurrentRequestHandler
   - Check network connectivity
   - Verify API endpoints are accessible

3. **Resource Monitoring Failures**
   - Ensure sufficient permissions for system monitoring
   - Check platform-specific monitoring commands
   - Verify disk space for metrics files

4. **Bottleneck Detection Issues**
   - Increase `correlationThreshold` for more sensitive detection
   - Ensure sufficient data points for analysis
   - Check system resource availability

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG = 'load-testing:*';
```

### Performance Tuning

1. **Optimize Concurrent Requests**
   ```typescript
   const requestHandler = new ConcurrentRequestHandler({
     maxConcurrency: 100,
     connectionPoolSize: 200,
     requestTimeout: 30000,
     retryAttempts: 3,
     keepAlive: true,
     maxSockets: 100
   });
   ```

2. **Tune Resource Monitoring**
   ```typescript
   const monitor = new ResourceUtilizationMonitor({
     monitoringInterval: 5000, // Reduce frequency for lower overhead
     enableDetailedMetrics: false, // Disable for production
     saveMetricsToFile: false // Disable file I/O for performance
   });
   ```

## 🤝 Contributing

### Adding New Test Scenarios

1. Define scenario in configuration:
   ```typescript
   {
     name: 'New AI Service',
     weight: 10,
     endpoint: 'https://api.example.com/v1/service',
     method: 'POST',
     payload: { /* service-specific payload */ },
     expectedResponseTime: 5000
   }
   ```

2. Add endpoint to configuration:
   ```typescript
   endpoints: {
     // ... existing endpoints
     newService: 'https://api.example.com/v1/service'
   }
   ```

### Extending Monitoring

1. Add new metrics to `SystemMetrics` interface
2. Implement metric collection in `ResourceUtilizationMonitor`
3. Add threshold checking in `BottleneckIdentificationTool`
4. Update report generation to include new metrics

### Custom Bottleneck Detection

```typescript
class CustomBottleneckDetector extends BottleneckIdentificationTool {
  protected analyzeCustomBottlenecks(metrics: SystemMetrics): void {
    // Custom bottleneck detection logic
    if (metrics.customMetric > threshold) {
      this.identifyBottleneck({
        component: 'Custom Component',
        severity: 'high',
        type: 'custom',
        description: 'Custom bottleneck detected',
        // ... other properties
      });
    }
  }
}
```

## 📚 API Reference

### LoadTestingInfrastructure

- `startLoadTest(): Promise<LoadTestResult>` - Start the load test
- `stopLoadTest(): Promise<void>` - Stop the load test
- Events: `rampUpProgress`, `sustainedLoadComplete`, `rampDownProgress`, `performanceDegradation`, `requestError`

### ServiceScalabilityValidator

- `runScalabilityTest(): Promise<ScalabilityTestResult>` - Run scalability test
- `getPerformanceTrends(): PerformanceTrend[]` - Get performance trends
- Events: `stepCompleted`, `thresholdViolations`, `bottlenecksDetected`

### ResourceUtilizationMonitor

- `startMonitoring(): Promise<void>` - Start resource monitoring
- `stopMonitoring(): Promise<ResourceSnapshot[]>` - Stop monitoring and get snapshots
- `getCurrentSnapshot(): Promise<ResourceSnapshot>` - Get current resource snapshot
- Events: `resourceAlert`, `performanceDegradation`, `snapshotTaken`

### PerformanceDegradationDetector

- `start(): void` - Start degradation detection
- `stop(): void` - Stop degradation detection
- `addDataPoint(dataPoint: PerformanceDataPoint): void` - Add performance data
- Events: `degradationAlert`, `anomalyDetected`, `predictiveAlert`

### BottleneckIdentificationTool

- `start(): void` - Start bottleneck identification
- `stop(): void` - Stop bottleneck identification
- `addMetrics(metrics: SystemMetrics): void` - Add system metrics
- Events: `bottleneckIdentified`, `rootCauseIdentified`

## 📄 License

This load testing infrastructure is part of the Storytailor AI Integration Testing suite and follows the same licensing terms as the main project.