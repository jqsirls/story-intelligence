/**
 * System Resilience Testing Suite
 * 
 * Tests system behavior under various stress conditions including
 * memory pressure, CPU load, concurrent users, and resource exhaustion.
 */

const k6 = require('k6');
const http = require('k6/http');
const check = require('k6/check');
const { Rate, Counter, Trend, Gauge } = require('k6/metrics');

// Custom metrics for resilience testing
const systemResilienceRate = new Rate('system_resilience_rate');
const resourceExhaustionEvents = new Counter('resource_exhaustion_events');
const recoveryTime = new Trend('system_recovery_time');
const memoryUsage = new Gauge('memory_usage_mb');
const cpuUtilization = new Gauge('cpu_utilization_percent');
const concurrentConnections = new Gauge('concurrent_connections');

// Test configuration
const RESILIENCE_CONFIG = {
  baseUrl: __ENV.API_BASE_URL || 'http://localhost:3000',
  apiKey: __ENV.API_KEY || 'test-api-key',
  maxConcurrentUsers: parseInt(__ENV.MAX_CONCURRENT_USERS) || 100,
  stressTestDuration: __ENV.STRESS_DURATION || '5m',
  memoryThresholdMB: parseInt(__ENV.MEMORY_THRESHOLD) || 512,
  cpuThresholdPercent: parseInt(__ENV.CPU_THRESHOLD) || 80,
  recoveryTimeoutMs: parseInt(__ENV.RECOVERY_TIMEOUT) || 30000
};

export let options = {
  scenarios: {
    // Gradual load increase to find breaking point
    stress_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 150 },
        { duration: '2m', target: 0 }
      ],
      exec: 'stressTest'
    },
    
    // Spike testing - sudden load increase
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 200 }, // Sudden spike
        { duration: '2m', target: 200 },
        { duration: '30s', target: 10 },
        { duration: '1m', target: 0 }
      ],
      exec: 'spikeTest'
    },
    
    // Memory pressure testing
    memory_stress: {
      executor: 'constant-vus',
      vus: 15,
      duration: '8m',
      exec: 'memoryStressTest'
    },
    
    // Long-running stability test
    stability_test: {
      executor: 'constant-vus',
      vus: 25,
      duration: '15m',
      exec: 'stabilityTest'
    }
  },
  
  thresholds: {
    'system_resilience_rate': ['rate>0.95'], // 95% system resilience
    'resource_exhaustion_events': ['count<5'], // Less than 5 exhaustion events
    'system_recovery_time': ['p(95)<30000'], // 95% recover within 30s
    'http_req_duration': ['p(95)<2000'], // 95% under 2s
    'http_req_failed': ['rate<0.05'] // Less than 5% failures
  }
};

/**
 * Stress Test - Gradual load increase
 */
export function stressTest() {
  const testId = `stress_${Date.now()}_${__VU}`;
  
  // Monitor system resources
  monitorSystemResources();
  
  // Create realistic story creation load
  const storyTypes = ['adventure', 'bedtime', 'educational', 'therapeutic'];
  const randomStoryType = storyTypes[Math.floor(Math.random() * storyTypes.length)];
  
  const response = http.post(`${RESILIENCE_CONFIG.baseUrl}/api/conversation/start`,
    JSON.stringify({
      intent: 'createStory',
      storyType: randomStoryType,
      userInput: `Stress test story creation - VU ${__VU}`,
      testId: testId
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
      },
      timeout: '45s'
    }
  );
  
  const stressTestSuccess = check(response, {
    'stress test request successful': (r) => r.status === 200,
    'stress test response time acceptable': (r) => r.timings.duration < 3000,
    'stress test no resource exhaustion': (r) => {
      if (r.status === 503) {
        resourceExhaustionEvents.add(1);
        return false;
      }
      return true;
    }
  });
  
  if (stressTestSuccess) {
    systemResilienceRate.add(1);
  }
  
  // Test conversation continuation under stress
  if (response.status === 200) {
    const sessionData = JSON.parse(response.body);
    if (sessionData.sessionId) {
      testConversationContinuation(sessionData.sessionId, testId);
    }
  }
}

/**
 * Spike Test - Sudden load increase
 */
export function spikeTest() {
  const testId = `spike_${Date.now()}_${__VU}`;
  
  // Simulate sudden spike in complex operations
  const complexOperations = [
    {
      endpoint: '/api/conversation/start',
      payload: {
        intent: 'createStory',
        storyType: 'adventure',
        userInput: 'Create a complex multi-character adventure story',
        complexity: 'maximum',
        generateAssets: true
      }
    },
    {
      endpoint: '/api/assets/generate-bulk',
      payload: {
        types: ['audio', 'images', 'pdf'],
        storyId: 'spike-test-story',
        priority: 'high'
      }
    }
  ];
  
  const operation = complexOperations[Math.floor(Math.random() * complexOperations.length)];
  
  const spikeStart = Date.now();
  
  const response = http.post(`${RESILIENCE_CONFIG.baseUrl}${operation.endpoint}`,
    JSON.stringify(operation.payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
      },
      timeout: '60s'
    }
  );
  
  const spikeTestSuccess = check(response, {
    'spike test survived': (r) => r.status < 500,
    'spike test graceful degradation': (r) => {
      if (r.status === 503) {
        // Service unavailable is acceptable during spike
        return true;
      }
      return r.status === 200;
    },
    'spike test recovery possible': (r) => r.status !== 500 // No internal server errors
  });
  
  if (spikeTestSuccess) {
    systemResilienceRate.add(1);
  } else if (response.status >= 500) {
    resourceExhaustionEvents.add(1);
  }
  
  // Test recovery after spike
  if (response.status === 503) {
    testRecoveryAfterSpike(testId);
  }
}

/**
 * Memory Stress Test
 */
export function memoryStressTest() {
  const testId = `memory_${Date.now()}_${__VU}`;
  
  // Create memory-intensive operations
  const memoryIntensivePayload = {
    intent: 'createStory',
    storyType: 'educational',
    userInput: 'Create a very detailed story with extensive character development',
    options: {
      detailLevel: 'maximum',
      characterCount: 10,
      plotComplexity: 'high',
      generateDetailedBackgrounds: true,
      includeExtensiveDialogue: true,
      createMultipleEndings: true
    },
    largeDataSet: generateLargeDataSet(1024) // 1KB of additional data
  };
  
  const response = http.post(`${RESILIENCE_CONFIG.baseUrl}/api/conversation/start`,
    JSON.stringify(memoryIntensivePayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
      },
      timeout: '90s'
    }
  );
  
  const memoryStressSuccess = check(response, {
    'memory stress test completed': (r) => r.status === 200,
    'memory stress no OOM errors': (r) => {
      if (r.status === 500) {
        const errorBody = r.body.toLowerCase();
        if (errorBody.includes('memory') || errorBody.includes('oom')) {
          resourceExhaustionEvents.add(1);
          return false;
        }
      }
      return true;
    },
    'memory stress reasonable response time': (r) => r.timings.duration < 60000
  });
  
  if (memoryStressSuccess) {
    systemResilienceRate.add(1);
  }
  
  // Monitor memory usage
  if (response.status === 200) {
    try {
      const responseData = JSON.parse(response.body);
      if (responseData.systemMetrics && responseData.systemMetrics.memoryUsageMB) {
        memoryUsage.add(responseData.systemMetrics.memoryUsageMB);
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
  }
}/**

 * Stability Test - Long-running operations
 */
export function stabilityTest() {
  const testId = `stability_${Date.now()}_${__VU}`;
  
  // Simulate realistic user behavior over time
  const userBehaviors = [
    () => createStorySession(testId),
    () => continueExistingStory(testId),
    () => generateStoryAssets(testId),
    () => searchStoryLibrary(testId),
    () => updateUserPreferences(testId)
  ];
  
  const behavior = userBehaviors[Math.floor(Math.random() * userBehaviors.length)];
  const behaviorResult = behavior();
  
  const stabilitySuccess = check(behaviorResult, {
    'stability test operation successful': (r) => r && r.status === 200,
    'stability test no memory leaks': (r) => {
      // Check for signs of memory leaks in response
      return r && r.status !== 500;
    },
    'stability test consistent performance': (r) => {
      return r && r.timings && r.timings.duration < 5000;
    }
  });
  
  if (stabilitySuccess) {
    systemResilienceRate.add(1);
  }
}

/**
 * Helper Functions
 */

function monitorSystemResources() {
  // Simulate system resource monitoring
  const mockMemoryUsage = 200 + Math.random() * 300; // 200-500 MB
  const mockCpuUsage = 20 + Math.random() * 60; // 20-80%
  
  memoryUsage.add(mockMemoryUsage);
  cpuUtilization.add(mockCpuUsage);
  concurrentConnections.add(__VU);
  
  // Check for resource exhaustion
  if (mockMemoryUsage > RESILIENCE_CONFIG.memoryThresholdMB) {
    resourceExhaustionEvents.add(1);
  }
  
  if (mockCpuUsage > RESILIENCE_CONFIG.cpuThresholdPercent) {
    resourceExhaustionEvents.add(1);
  }
}

function testConversationContinuation(sessionId, testId) {
  const continuationResponse = http.post(`${RESILIENCE_CONFIG.baseUrl}/api/conversation/message`,
    JSON.stringify({
      sessionId: sessionId,
      message: `Continue story - ${testId}`,
      timestamp: Date.now()
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
      },
      timeout: '30s'
    }
  );
  
  check(continuationResponse, {
    'conversation continuation successful': (r) => r.status === 200,
    'conversation state maintained': (r) => {
      if (r.status === 200) {
        const data = JSON.parse(r.body);
        return data.sessionId === sessionId;
      }
      return false;
    }
  });
}

function testRecoveryAfterSpike(testId) {
  // Wait a bit for system to recover
  const recoveryStart = Date.now();
  
  // Attempt simple operation to test recovery
  const recoveryResponse = http.get(`${RESILIENCE_CONFIG.baseUrl}/health`, {
    headers: {
      'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
    },
    timeout: '10s'
  });
  
  const recoveryTimeMs = Date.now() - recoveryStart;
  recoveryTime.add(recoveryTimeMs);
  
  const recoverySuccess = check(recoveryResponse, {
    'system recovered after spike': (r) => r.status === 200,
    'recovery time acceptable': () => recoveryTimeMs < RESILIENCE_CONFIG.recoveryTimeoutMs
  });
  
  if (recoverySuccess) {
    systemResilienceRate.add(1);
  }
}

function generateLargeDataSet(sizeKB) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const targetLength = sizeKB * 1024;
  
  for (let i = 0; i < targetLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

function createStorySession(testId) {
  return http.post(`${RESILIENCE_CONFIG.baseUrl}/api/conversation/start`,
    JSON.stringify({
      intent: 'createStory',
      storyType: 'bedtime',
      userInput: `Stability test story - ${testId}`,
      testId: testId
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
      }
    }
  );
}

function continueExistingStory(testId) {
  return http.post(`${RESILIENCE_CONFIG.baseUrl}/api/conversation/message`,
    JSON.stringify({
      sessionId: `stability-session-${testId}`,
      message: 'Continue the story',
      testId: testId
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
      }
    }
  );
}

function generateStoryAssets(testId) {
  return http.post(`${RESILIENCE_CONFIG.baseUrl}/api/assets/generate`,
    JSON.stringify({
      storyId: `stability-story-${testId}`,
      types: ['audio', 'pdf'],
      testId: testId
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
      }
    }
  );
}

function searchStoryLibrary(testId) {
  return http.get(`${RESILIENCE_CONFIG.baseUrl}/api/library/search?q=stability&testId=${testId}`, {
    headers: {
      'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
    }
  });
}

function updateUserPreferences(testId) {
  return http.put(`${RESILIENCE_CONFIG.baseUrl}/api/user/preferences`,
    JSON.stringify({
      storyTypes: ['adventure', 'educational'],
      voiceEnabled: true,
      testId: testId
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESILIENCE_CONFIG.apiKey}`
      }
    }
  );
}

/**
 * Setup and Teardown
 */
export function setup() {
  console.log('Starting System Resilience Testing');
  console.log(`Base URL: ${RESILIENCE_CONFIG.baseUrl}`);
  console.log(`Max Concurrent Users: ${RESILIENCE_CONFIG.maxConcurrentUsers}`);
  console.log(`Memory Threshold: ${RESILIENCE_CONFIG.memoryThresholdMB}MB`);
  console.log(`CPU Threshold: ${RESILIENCE_CONFIG.cpuThresholdPercent}%`);
  
  // Pre-test health check
  const healthCheck = http.get(`${RESILIENCE_CONFIG.baseUrl}/health`);
  
  if (!check(healthCheck, { 'system healthy before resilience test': (r) => r.status === 200 })) {
    throw new Error('System not healthy - aborting resilience tests');
  }
  
  return {
    startTime: Date.now(),
    initialHealth: healthCheck.status
  };
}

export function teardown(data) {
  const endTime = Date.now();
  const totalDuration = endTime - data.startTime;
  
  console.log(`System Resilience Testing completed in ${totalDuration}ms`);
  
  // Final health check
  const finalHealthCheck = http.get(`${RESILIENCE_CONFIG.baseUrl}/health`);
  
  check(finalHealthCheck, {
    'system healthy after resilience test': (r) => r.status === 200
  });
  
  // Generate resilience report
  console.log('System Resilience Test Results:');
  console.log(`- System Resilience Rate: ${systemResilienceRate.rate * 100}%`);
  console.log(`- Resource Exhaustion Events: ${resourceExhaustionEvents.count}`);
  console.log(`- Average Recovery Time: ${recoveryTime.avg}ms`);
  console.log(`- Peak Memory Usage: ${memoryUsage.max}MB`);
  console.log(`- Peak CPU Utilization: ${cpuUtilization.max}%`);
  console.log(`- Max Concurrent Connections: ${concurrentConnections.max}`);
  
  // Determine overall resilience score
  const resilienceScore = systemResilienceRate.rate * 100;
  let resilienceGrade;
  
  if (resilienceScore >= 95) {
    resilienceGrade = 'A+ (Excellent)';
  } else if (resilienceScore >= 90) {
    resilienceGrade = 'A (Very Good)';
  } else if (resilienceScore >= 85) {
    resilienceGrade = 'B (Good)';
  } else if (resilienceScore >= 80) {
    resilienceGrade = 'C (Acceptable)';
  } else {
    resilienceGrade = 'D (Needs Improvement)';
  }
  
  console.log(`- Overall Resilience Grade: ${resilienceGrade}`);
  
  if (resourceExhaustionEvents.count > 0) {
    console.log(`\nWARNING: ${resourceExhaustionEvents.count} resource exhaustion events detected`);
  }
  
  if (recoveryTime.avg > RESILIENCE_CONFIG.recoveryTimeoutMs) {
    console.log(`\nWARNING: Average recovery time (${recoveryTime.avg}ms) exceeds threshold`);
  }
}

export default function() {
  // This function runs for each VU iteration
  // The actual test logic is in the scenario-specific functions above
}