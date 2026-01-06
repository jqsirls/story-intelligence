#!/usr/bin/env ts-node

/**
 * Load Testing Infrastructure Example
 * 
 * This example demonstrates how to use the comprehensive load testing infrastructure
 * for AI integration testing, including concurrent request handling, scalability validation,
 * resource monitoring, performance degradation detection, and bottleneck identification.
 */

import { LoadTestingInfrastructure, LoadTestConfig } from '../LoadTestingInfrastructure';
import { ServiceScalabilityValidator, ScalabilityTestConfig } from '../ServiceScalabilityValidator';
import { ResourceUtilizationMonitor, ResourceMonitorConfig } from '../ResourceUtilizationMonitor';
import { PerformanceDegradationDetector, DegradationDetectorConfig } from '../PerformanceDegradationDetector';
import { BottleneckIdentificationTool, BottleneckAnalysisConfig } from '../BottleneckIdentificationTool';

async function runComprehensiveLoadTest() {
  console.log('🚀 Starting Comprehensive AI Integration Load Test');
  console.log('=' .repeat(60));

  // 1. Configure Load Testing Infrastructure
  const loadTestConfig: LoadTestConfig = {
    testName: 'AI Integration Comprehensive Load Test',
    duration: 300000, // 5 minutes
    maxConcurrentRequests: 100,
    rampUpTime: 60000, // 1 minute ramp-up
    rampDownTime: 60000, // 1 minute ramp-down
    
    endpoints: {
      openai: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
      elevenlabs: process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1/text-to-speech',
      personality: process.env.PERSONALITY_API_URL || 'https://api.storytailor.com/v1/personality',
      webvtt: process.env.WEBVTT_API_URL || 'https://api.storytailor.com/v1/webvtt'
    },
    
    thresholds: {
      maxResponseTime: 15000, // 15 seconds for story generation
      maxErrorRate: 1, // 1% error rate
      maxCpuUsage: 80, // 80% CPU usage
      maxMemoryUsage: 85, // 85% memory usage
      minThroughput: 10 // 10 requests per second minimum
    },
    
    scenarios: [
      {
        name: 'Story Generation - OpenAI',
        weight: 35,
        endpoint: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        payload: {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a creative storyteller for children aged 5-8. Create engaging, safe, and educational stories.'
            },
            {
              role: 'user',
              content: 'Tell me a short adventure story about a brave little mouse who helps other animals in the forest.'
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        expectedResponseTime: 8000
      },
      {
        name: 'Voice Synthesis - ElevenLabs',
        weight: 25,
        endpoint: process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1/text-to-speech',
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        payload: {
          text: 'Once upon a time, in a magical forest, there lived a brave little mouse named Pip. Pip was known throughout the forest for his kind heart and adventurous spirit.',
          voice_id: process.env.ELEVENLABS_VOICE_ID || 'default-voice',
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        },
        expectedResponseTime: 12000
      },
      {
        name: 'Personality Analysis',
        weight: 20,
        endpoint: process.env.PERSONALITY_API_URL || 'https://api.storytailor.com/v1/personality',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STORYTAILOR_API_KEY}`,
          'Content-Type': 'application/json'
        },
        payload: {
          age: Math.floor(Math.random() * 8) + 3, // Age 3-10
          preferences: ['adventure', 'animals', 'friendship', 'magic'],
          personality_traits: ['curious', 'brave', 'kind'],
          story_context: 'bedtime_story'
        },
        expectedResponseTime: 2000
      },
      {
        name: 'WebVTT Synchronization',
        weight: 15,
        endpoint: process.env.WEBVTT_API_URL || 'https://api.storytailor.com/v1/webvtt',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STORYTAILOR_API_KEY}`,
          'Content-Type': 'application/json'
        },
        payload: {
          text: 'Once upon a time, there was a brave little mouse.',
          audio_url: 'https://example.com/audio.mp3',
          sync_precision: 'word_level'
        },
        expectedResponseTime: 3000
      },
      {
        name: 'Health Check',
        weight: 5,
        endpoint: process.env.HEALTH_CHECK_URL || 'https://api.storytailor.com/health',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.STORYTAILOR_API_KEY}`
        },
        expectedResponseTime: 500
      }
    ]
  };

  // 2. Configure Resource Monitoring
  const resourceMonitorConfig: ResourceMonitorConfig = {
    monitoringInterval: 2000, // 2 seconds
    enableDetailedMetrics: true,
    saveMetricsToFile: true,
    metricsFilePath: './testing/ai-integration/results/resource-metrics.json',
    alertThresholds: {
      cpu: { warning: 70, critical: 85 },
      memory: { warning: 75, critical: 90 },
      disk: { warning: 80, critical: 95 },
      network: {
        warningBytesPerSec: 100 * 1024 * 1024, // 100 MB/s
        criticalBytesPerSec: 500 * 1024 * 1024 // 500 MB/s
      }
    }
  };

  // 3. Configure Performance Degradation Detection
  const degradationDetectorConfig: DegradationDetectorConfig = {
    windowSize: 50,
    analysisInterval: 5000, // 5 seconds
    enablePredictiveAnalysis: true,
    enableAnomalyDetection: true,
    alertThresholds: {
      responseTime: { warningIncrease: 25, criticalIncrease: 50 },
      throughput: { warningDecrease: 20, criticalDecrease: 40 },
      errorRate: { warningIncrease: 2, criticalIncrease: 5 },
      latency: { warningIncrease: 30, criticalIncrease: 60 }
    }
  };

  // 4. Configure Bottleneck Identification
  const bottleneckAnalysisConfig: BottleneckAnalysisConfig = {
    analysisInterval: 10000, // 10 seconds
    correlationThreshold: 0.7,
    enableRootCauseAnalysis: true,
    enablePredictiveBottleneckDetection: true,
    bottleneckThresholds: {
      cpu: { warning: 70, critical: 85 },
      memory: { warning: 75, critical: 90 },
      network: {
        latencyWarning: 100,
        latencyCritical: 500,
        bandwidthWarning: 100 * 1024 * 1024,
        bandwidthCritical: 500 * 1024 * 1024
      },
      database: {
        connectionPoolWarning: 70,
        connectionPoolCritical: 90,
        queryTimeWarning: 1000,
        queryTimeCritical: 5000
      },
      application: {
        responseTimeWarning: 5000,
        responseTimeCritical: 15000,
        throughputWarning: 5,
        errorRateWarning: 2
      }
    }
  };

  // 5. Initialize all components
  const loadTester = new LoadTestingInfrastructure(loadTestConfig);
  const resourceMonitor = new ResourceUtilizationMonitor(resourceMonitorConfig);
  const degradationDetector = new PerformanceDegradationDetector(degradationDetectorConfig);
  const bottleneckTool = new BottleneckIdentificationTool(bottleneckAnalysisConfig);

  // 6. Set up event listeners
  setupEventListeners(loadTester, resourceMonitor, degradationDetector, bottleneckTool);

  try {
    console.log('📊 Starting resource monitoring...');
    await resourceMonitor.startMonitoring();

    console.log('🔍 Starting performance degradation detection...');
    degradationDetector.start();

    console.log('🔧 Starting bottleneck identification...');
    bottleneckTool.start();

    console.log('⚡ Starting load test...');
    const loadTestResult = await loadTester.startLoadTest();

    console.log('📈 Load test completed! Generating comprehensive report...');
    
    // 7. Stop monitoring components
    const resourceSnapshots = await resourceMonitor.stopMonitoring();
    degradationDetector.stop();
    bottleneckTool.stop();

    // 8. Generate comprehensive report
    await generateComprehensiveReport(
      loadTestResult,
      resourceSnapshots,
      degradationDetector.getAlerts(),
      bottleneckTool.getBottlenecks(),
      resourceMonitor.getResourceTrends()
    );

    console.log('✅ Comprehensive load test completed successfully!');

  } catch (error) {
    console.error('❌ Load test failed:', error);
    
    // Clean up
    await resourceMonitor.stopMonitoring();
    degradationDetector.stop();
    bottleneckTool.stop();
    
    process.exit(1);
  }
}

function setupEventListeners(
  loadTester: LoadTestingInfrastructure,
  resourceMonitor: ResourceUtilizationMonitor,
  degradationDetector: PerformanceDegradationDetector,
  bottleneckTool: BottleneckIdentificationTool
) {
  // Load tester events
  loadTester.on('rampUpProgress', (data) => {
    console.log(`📈 Ramp-up progress: ${data.progress.toFixed(1)}% (${data.currentConcurrency} concurrent requests)`);
  });

  loadTester.on('sustainedLoadComplete', (data) => {
    console.log(`⚡ Sustained load phase completed (${data.concurrency} concurrent requests for ${data.duration}ms)`);
  });

  loadTester.on('rampDownProgress', (data) => {
    console.log(`📉 Ramp-down progress: ${data.progress.toFixed(1)}% (${data.currentConcurrency} concurrent requests)`);
  });

  loadTester.on('performanceDegradation', (data) => {
    console.log(`⚠️  Performance degradation detected in ${data.scenario}: ${data.degradationFactor.toFixed(2)}x slower than expected`);
  });

  loadTester.on('requestError', (error) => {
    console.log(`❌ Request error: ${error.message}`);
  });

  // Resource monitor events
  resourceMonitor.on('resourceAlert', (alert) => {
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${emoji} Resource alert: ${alert.message}`);
  });

  resourceMonitor.on('performanceDegradation', (data) => {
    console.log(`📊 Resource degradation: ${data.degradations.join(', ')}`);
  });

  // Performance degradation detector events
  degradationDetector.on('degradationAlert', (alert) => {
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${emoji} Performance alert: ${alert.message} (${alert.degradationPercentage.toFixed(1)}% degradation)`);
  });

  degradationDetector.on('anomalyDetected', (anomaly) => {
    console.log(`🔍 Anomaly detected in ${anomaly.metric}: ${anomaly.description}`);
  });

  degradationDetector.on('predictiveAlert', (prediction) => {
    console.log(`🔮 Predictive alert: ${prediction.message}`);
  });

  // Bottleneck identification events
  bottleneckTool.on('bottleneckIdentified', (bottleneck) => {
    const emoji = bottleneck.severity === 'critical' ? '🚨' : bottleneck.severity === 'high' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} Bottleneck identified: ${bottleneck.description}`);
  });

  bottleneckTool.on('rootCauseIdentified', (rootCause) => {
    console.log(`🔍 Root cause identified: ${rootCause.recommendation}`);
  });
}

async function generateComprehensiveReport(
  loadTestResult: any,
  resourceSnapshots: any[],
  degradationAlerts: any[],
  bottlenecks: any[],
  resourceTrends: any[]
) {
  const report = {
    summary: {
      testName: loadTestResult.testName,
      duration: loadTestResult.endTime - loadTestResult.startTime,
      totalRequests: loadTestResult.totalRequests,
      successRate: ((loadTestResult.successfulRequests / loadTestResult.totalRequests) * 100).toFixed(2),
      averageResponseTime: loadTestResult.averageResponseTime.toFixed(2),
      throughput: loadTestResult.throughput.toFixed(2),
      overallResult: loadTestResult.overallResult
    },
    performance: {
      responseTimeP95: loadTestResult.p95ResponseTime.toFixed(2),
      responseTimeP99: loadTestResult.p99ResponseTime.toFixed(2),
      maxResponseTime: loadTestResult.maxResponseTime.toFixed(2),
      minResponseTime: loadTestResult.minResponseTime.toFixed(2),
      errorRate: loadTestResult.errorRate.toFixed(2)
    },
    resources: {
      totalSnapshots: resourceSnapshots.length,
      peakCpuUsage: Math.max(...resourceSnapshots.map(s => s.cpu.usage)).toFixed(2),
      peakMemoryUsage: Math.max(...resourceSnapshots.map(s => s.memory.percentage)).toFixed(2),
      trends: resourceTrends.map(t => ({
        resource: t.resource,
        metric: t.metric,
        trend: t.trend,
        confidence: (t.confidence * 100).toFixed(1)
      }))
    },
    degradation: {
      totalAlerts: degradationAlerts.length,
      criticalAlerts: degradationAlerts.filter(a => a.severity === 'critical').length,
      warningAlerts: degradationAlerts.filter(a => a.severity === 'warning').length,
      anomalies: degradationAlerts.filter(a => a.type === 'anomaly').length
    },
    bottlenecks: {
      totalBottlenecks: bottlenecks.length,
      criticalBottlenecks: bottlenecks.filter(b => b.severity === 'critical').length,
      highBottlenecks: bottlenecks.filter(b => b.severity === 'high').length,
      components: [...new Set(bottlenecks.map(b => b.component))]
    },
    recommendations: [
      ...loadTestResult.recommendations,
      ...bottlenecks.flatMap((b: any) => b.recommendations)
    ].filter((rec, index, arr) => arr.indexOf(rec) === index) // Remove duplicates
  };

  // Save comprehensive report
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const reportPath = path.join(process.cwd(), 'testing', 'ai-integration', 'results', 'comprehensive-load-test-report.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  // Print summary to console
  console.log('\n📋 COMPREHENSIVE LOAD TEST REPORT');
  console.log('=' .repeat(60));
  console.log(`Test Name: ${report.summary.testName}`);
  console.log(`Duration: ${(parseInt(report.summary.duration) / 1000).toFixed(1)} seconds`);
  console.log(`Total Requests: ${report.summary.totalRequests}`);
  console.log(`Success Rate: ${report.summary.successRate}%`);
  console.log(`Average Response Time: ${report.summary.averageResponseTime}ms`);
  console.log(`Throughput: ${report.summary.throughput} RPS`);
  console.log(`Overall Result: ${report.summary.overallResult.toUpperCase()}`);
  
  console.log('\n📊 PERFORMANCE METRICS');
  console.log('-' .repeat(30));
  console.log(`P95 Response Time: ${report.performance.responseTimeP95}ms`);
  console.log(`P99 Response Time: ${report.performance.responseTimeP99}ms`);
  console.log(`Error Rate: ${report.performance.errorRate}%`);
  
  console.log('\n💻 RESOURCE UTILIZATION');
  console.log('-' .repeat(30));
  console.log(`Peak CPU Usage: ${report.resources.peakCpuUsage}%`);
  console.log(`Peak Memory Usage: ${report.resources.peakMemoryUsage}%`);
  
  console.log('\n🚨 ALERTS & BOTTLENECKS');
  console.log('-' .repeat(30));
  console.log(`Total Degradation Alerts: ${report.degradation.totalAlerts}`);
  console.log(`Critical Alerts: ${report.degradation.criticalAlerts}`);
  console.log(`Total Bottlenecks: ${report.bottlenecks.totalBottlenecks}`);
  console.log(`Critical Bottlenecks: ${report.bottlenecks.criticalBottlenecks}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-' .repeat(30));
    report.recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

async function runScalabilityTest() {
  console.log('\n🔄 Running Service Scalability Test');
  console.log('=' .repeat(60));

  const scalabilityConfig: ScalabilityTestConfig = {
    serviceName: 'AI Integration Service',
    baseUrl: process.env.API_BASE_URL || 'https://api.storytailor.com',
    testDuration: 180000, // 3 minutes
    scalingSteps: [
      {
        name: 'Baseline Load',
        concurrency: 10,
        duration: 30000,
        expectedThroughput: 50,
        expectedResponseTime: 1000
      },
      {
        name: 'Low Load',
        concurrency: 25,
        duration: 30000,
        expectedThroughput: 100,
        expectedResponseTime: 1200
      },
      {
        name: 'Medium Load',
        concurrency: 50,
        duration: 30000,
        expectedThroughput: 180,
        expectedResponseTime: 1500
      },
      {
        name: 'High Load',
        concurrency: 100,
        duration: 30000,
        expectedThroughput: 300,
        expectedResponseTime: 2000
      },
      {
        name: 'Peak Load',
        concurrency: 150,
        duration: 30000,
        expectedThroughput: 400,
        expectedResponseTime: 3000
      },
      {
        name: 'Stress Load',
        concurrency: 200,
        duration: 30000,
        expectedThroughput: 450,
        expectedResponseTime: 5000
      }
    ],
    thresholds: {
      maxResponseTimeDegradation: 100, // 100% increase allowed
      maxThroughputDegradation: 50, // 50% decrease allowed
      maxErrorRateIncrease: 10, // 10% error rate allowed
      minScalingEfficiency: 60 // 60% minimum scaling efficiency
    },
    endpoints: [
      {
        name: 'Health Check',
        path: '/health',
        method: 'GET',
        weight: 20,
        criticalPath: true
      },
      {
        name: 'Story Generation',
        path: '/v1/stories',
        method: 'POST',
        payload: {
          prompt: 'Tell me a story about friendship',
          age: 7,
          length: 'short'
        },
        weight: 40,
        criticalPath: true
      },
      {
        name: 'Voice Synthesis',
        path: '/v1/voice/synthesize',
        method: 'POST',
        payload: {
          text: 'Hello, this is a test.',
          voice: 'child-friendly'
        },
        weight: 30,
        criticalPath: true
      },
      {
        name: 'Personality Analysis',
        path: '/v1/personality/analyze',
        method: 'POST',
        payload: {
          age: 8,
          preferences: ['adventure', 'animals']
        },
        weight: 10,
        criticalPath: false
      }
    ]
  };

  const scalabilityValidator = new ServiceScalabilityValidator(scalabilityConfig);

  // Set up event listeners
  scalabilityValidator.on('stepCompleted', (metrics) => {
    console.log(`✅ Step "${metrics.step}" completed:`);
    console.log(`   Concurrency: ${metrics.concurrency}`);
    console.log(`   Throughput: ${metrics.throughput.toFixed(2)} RPS`);
    console.log(`   Avg Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Error Rate: ${metrics.errorRate.toFixed(2)}%`);
    console.log(`   Scaling Efficiency: ${metrics.scalingEfficiency.toFixed(2)}%`);
    
    if (metrics.bottlenecks.length > 0) {
      console.log(`   Bottlenecks: ${metrics.bottlenecks.join(', ')}`);
    }
  });

  scalabilityValidator.on('thresholdViolations', (data) => {
    console.log(`⚠️  Threshold violations in step "${data.step}":`);
    data.violations.forEach(violation => {
      console.log(`   - ${violation}`);
    });
  });

  try {
    const result = await scalabilityValidator.runScalabilityTest();
    
    console.log('\n📊 SCALABILITY TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`Service: ${result.serviceName}`);
    console.log(`Overall Result: ${result.overallResult.toUpperCase()}`);
    console.log(`Scalability Score: ${result.scalabilityScore.toFixed(1)}/100`);
    
    console.log('\n📈 SCALING ANALYSIS');
    console.log('-' .repeat(30));
    console.log(`Linear Scaling Range: ${result.scalingAnalysis.linearScalingRange.min} - ${result.scalingAnalysis.linearScalingRange.max} concurrent requests`);
    console.log(`Scaling Breakpoint: ${result.scalingAnalysis.scalingBreakpoint} concurrent requests`);
    console.log(`Optimal Concurrency: ${result.scalingAnalysis.optimalConcurrency} concurrent requests`);
    console.log(`Scaling Efficiency Trend: ${result.scalingAnalysis.scalingEfficiencyTrend}`);
    
    if (result.scalingAnalysis.bottleneckComponents.length > 0) {
      console.log(`Bottleneck Components: ${result.scalingAnalysis.bottleneckComponents.join(', ')}`);
    }
    
    if (result.recommendations.length > 0) {
      console.log('\n💡 SCALABILITY RECOMMENDATIONS');
      console.log('-' .repeat(30));
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

  } catch (error) {
    console.error('❌ Scalability test failed:', error);
  }
}

// Main execution
async function main() {
  console.log('🎯 AI Integration Load Testing Suite');
  console.log('=' .repeat(60));
  
  const args = process.argv.slice(2);
  const testType = args[0] || 'comprehensive';

  switch (testType) {
    case 'comprehensive':
      await runComprehensiveLoadTest();
      break;
    case 'scalability':
      await runScalabilityTest();
      break;
    case 'both':
      await runComprehensiveLoadTest();
      await runScalabilityTest();
      break;
    default:
      console.log('Usage: ts-node load-testing-example.ts [comprehensive|scalability|both]');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export {
  runComprehensiveLoadTest,
  runScalabilityTest
};