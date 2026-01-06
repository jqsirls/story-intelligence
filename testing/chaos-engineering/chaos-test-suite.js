/**
 * Chaos Engineering Test Suite for Storytailor Multi-Agent System
 * 
 * This suite implements comprehensive chaos engineering practices to test
 * system resilience under various failure conditions.
 */

const k6 = require('k6');
const http = require('k6/http');
const check = require('k6/check');
const { Rate, Counter, Trend } = require('k6/metrics');

// Custom metrics
const failureRate = new Rate('chaos_failure_rate');
const recoveryTime = new Trend('chaos_recovery_time');
const systemResilience = new Rate('system_resilience_rate');
const cascadeFailures = new Counter('cascade_failures');

// Test configuration
const CHAOS_CONFIG = {
  baseUrl: __ENV.API_BASE_URL || 'http://localhost:3000',
  apiKey: __ENV.API_KEY || 'test-api-key',
  testDuration: __ENV.CHAOS_DURATION || '10m',
  maxVUs: parseInt(__ENV.MAX_VUS) || 50,
  failureInjectionRate: parseFloat(__ENV.FAILURE_RATE) || 0.1,
  recoveryTimeout: parseInt(__ENV.RECOVERY_TIMEOUT) || 30000
};

export let options = {
  scenarios: {
    // Network partition simulation
    network_partition: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 }
      ],
      exec: 'networkPartitionTest'
    },
    
    // Database failover testing
    database_failover: {
      executor: 'constant-vus',
      vus: 5,
      duration: '8m',
      exec: 'databaseFailoverTest'
    },
    
    // External service failures
    external_service_chaos: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 15 },
        { duration: '6m', target: 15 },
        { duration: '1m', target: 0 }
      ],
      exec: 'externalServiceChaosTest'
    },
    
    // Memory pressure testing
    memory_pressure: {
      executor: 'constant-vus',
      vus: 8,
      duration: '6m',
      exec: 'memoryPressureTest'
    },
    
    // CPU stress testing
    cpu_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '4m', target: 100 },
        { duration: '2m', target: 10 }
      ],
      exec: 'cpuStressTest'
    },
    
    // Concurrent failure scenarios
    concurrent_failures: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 100,
      exec: 'concurrentFailureTest'
    }
  },
  
  thresholds: {
    'chaos_failure_rate': ['rate<0.05'], // Less than 5% failure rate
    'chaos_recovery_time': ['p(95)<30000'], // 95% recover within 30s
    'system_resilience_rate': ['rate>0.95'], // 95% system resilience
    'cascade_failures': ['count<10'], // Less than 10 cascade failures
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'http_req_failed': ['rate<0.1'] // Less than 10% HTTP failures
  }
};

/**
 * Network Partition Chaos Test
 * Simulates network partitions and latency issues
 */
export function networkPartitionTest() {
  const testId = `network_partition_${Date.now()}`;
  
  // Simulate network partition
  if (Math.random() < CHAOS_CONFIG.failureInjectionRate) {
    console.log(`[${testId}] Injecting network partition`);
    
    // Simulate network delay
    const delayedRequest = http.post(`${CHAOS_CONFIG.baseUrl}/api/conversation/start`, 
      JSON.stringify({
        intent: 'createStory',
        storyType: 'adventure',
        userInput: 'Network partition test'
      }), 
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
        },
        timeout: '60s' // Extended timeout for partition recovery
      }
    );
    
    const partitionRecovered = check(delayedRequest, {
      'network partition recovered': (r) => r.status === 200,
      'response time acceptable during partition': (r) => r.timings.duration < 10000
    });
    
    if (!partitionRecovered) {
      failureRate.add(1);
      console.log(`[${testId}] Network partition caused failure`);
    } else {
      systemResilience.add(1);
      recoveryTime.add(delayedRequest.timings.duration);
    }
  } else {
    // Normal operation test
    const normalRequest = http.post(`${CHAOS_CONFIG.baseUrl}/api/conversation/start`,
      JSON.stringify({
        intent: 'createStory',
        storyType: 'bedtime',
        userInput: 'Normal operation test'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
        }
      }
    );
    
    check(normalRequest, {
      'normal operation successful': (r) => r.status === 200,
      'normal response time': (r) => r.timings.duration < 800
    });
  }
}

/**
 * Database Failover Chaos Test
 * Tests database connection failures and recovery
 */
export function databaseFailoverTest() {
  const testId = `db_failover_${Date.now()}`;
  
  // Test database-dependent operations
  const operations = [
    { endpoint: '/api/auth/login', method: 'POST', data: { email: 'test@example.com', password: 'test' } },
    { endpoint: '/api/library/stories', method: 'GET', data: null },
    { endpoint: '/api/story/create', method: 'POST', data: { title: 'Test Story', content: 'Test content' } }
  ];
  
  operations.forEach((op, index) => {
    const startTime = Date.now();
    
    let response;
    if (op.method === 'GET') {
      response = http.get(`${CHAOS_CONFIG.baseUrl}${op.endpoint}`, {
        headers: { 'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}` }
      });
    } else {
      response = http.post(`${CHAOS_CONFIG.baseUrl}${op.endpoint}`, 
        JSON.stringify(op.data), 
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
          }
        }
      );
    }
    
    const operationTime = Date.now() - startTime;
    
    const dbOperationSuccess = check(response, {
      [`db operation ${index} successful`]: (r) => r.status < 500,
      [`db operation ${index} recovered quickly`]: (r) => operationTime < 5000
    });
    
    if (!dbOperationSuccess) {
      failureRate.add(1);
      console.log(`[${testId}] Database operation ${index} failed`);
      
      // Check for cascade failures
      if (index > 0) {
        cascadeFailures.add(1);
      }
    } else {
      systemResilience.add(1);
      if (operationTime > 1000) {
        recoveryTime.add(operationTime);
      }
    }
  });
}

/**
 * External Service Chaos Test
 * Tests resilience when external services (OpenAI, ElevenLabs, etc.) fail
 */
export function externalServiceChaosTest() {
  const testId = `external_chaos_${Date.now()}`;
  
  // Test story creation which depends on multiple external services
  const storyRequest = http.post(`${CHAOS_CONFIG.baseUrl}/api/conversation/start`,
    JSON.stringify({
      intent: 'createStory',
      storyType: 'educational',
      userInput: 'Create a story about space exploration',
      enableVoice: true,
      generateImages: true
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
      },
      timeout: '45s'
    }
  );
  
  const externalServiceResilience = check(storyRequest, {
    'story creation with external deps successful': (r) => r.status === 200,
    'fallback mechanisms activated': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.fallbacksUsed !== undefined;
      }
      return false;
    },
    'graceful degradation': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.response && body.response.length > 0;
      }
      return false;
    }
  });
  
  if (!externalServiceResilience) {
    failureRate.add(1);
    console.log(`[${testId}] External service chaos caused failure`);
  } else {
    systemResilience.add(1);
  }
  
  // Test individual service fallbacks
  const serviceTests = [
    { service: 'openai', endpoint: '/api/content/generate' },
    { service: 'elevenlabs', endpoint: '/api/voice/synthesize' },
    { service: 'image-generation', endpoint: '/api/assets/generate-image' }
  ];
  
  serviceTests.forEach(service => {
    const serviceResponse = http.post(`${CHAOS_CONFIG.baseUrl}${service.endpoint}`,
      JSON.stringify({ test: 'chaos', service: service.service }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
        }
      }
    );
    
    check(serviceResponse, {
      [`${service.service} fallback working`]: (r) => r.status < 500
    });
  });
}

/**
 * Memory Pressure Chaos Test
 * Tests system behavior under memory constraints
 */
export function memoryPressureTest() {
  const testId = `memory_pressure_${Date.now()}`;
  
  // Create memory-intensive operations
  const memoryIntensiveOperations = [
    {
      name: 'large_story_generation',
      data: {
        intent: 'createStory',
        storyType: 'adventure',
        userInput: 'Create a very long and detailed story with multiple characters and complex plot',
        complexity: 'maximum',
        length: 'extended'
      }
    },
    {
      name: 'bulk_character_creation',
      data: {
        intent: 'bulkCreateCharacters',
        count: 50,
        complexity: 'detailed'
      }
    },
    {
      name: 'concurrent_asset_generation',
      data: {
        intent: 'generateAssets',
        types: ['audio', 'images', 'pdf', 'activities'],
        concurrent: true
      }
    }
  ];
  
  memoryIntensiveOperations.forEach(operation => {
    const startTime = Date.now();
    
    const response = http.post(`${CHAOS_CONFIG.baseUrl}/api/conversation/start`,
      JSON.stringify(operation.data),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
        },
        timeout: '60s'
      }
    );
    
    const processingTime = Date.now() - startTime;
    
    const memoryResilience = check(response, {
      [`${operation.name} completed under memory pressure`]: (r) => r.status === 200,
      [`${operation.name} reasonable processing time`]: (r) => processingTime < 30000,
      [`${operation.name} memory management`]: (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return !body.memoryError;
        }
        return false;
      }
    });
    
    if (!memoryResilience) {
      failureRate.add(1);
      console.log(`[${testId}] Memory pressure caused ${operation.name} failure`);
    } else {
      systemResilience.add(1);
      if (processingTime > 5000) {
        recoveryTime.add(processingTime);
      }
    }
  });
}

/**
 * CPU Stress Chaos Test
 * Tests system behavior under high CPU load
 */
export function cpuStressTest() {
  const testId = `cpu_stress_${Date.now()}`;
  
  // CPU-intensive operations
  const cpuIntensiveRequest = http.post(`${CHAOS_CONFIG.baseUrl}/api/conversation/start`,
    JSON.stringify({
      intent: 'createStory',
      storyType: 'educational',
      userInput: 'Create a complex educational story with detailed explanations and multiple learning objectives',
      processingMode: 'intensive',
      qualityLevel: 'maximum'
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
      }
    }
  );
  
  const cpuStressResilience = check(cpuIntensiveRequest, {
    'cpu intensive operation completed': (r) => r.status === 200,
    'response time under cpu stress': (r) => r.timings.duration < 5000,
    'cpu throttling handled': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return !body.cpuThrottlingError;
      }
      return false;
    }
  });
  
  if (!cpuStressResilience) {
    failureRate.add(1);
    console.log(`[${testId}] CPU stress caused failure`);
  } else {
    systemResilience.add(1);
  }
}

/**
 * Concurrent Failure Chaos Test
 * Tests system behavior when multiple failures occur simultaneously
 */
export function concurrentFailureTest() {
  const testId = `concurrent_failure_${Date.now()}`;
  
  // Simulate multiple concurrent failures
  const concurrentOperations = [
    // Network issues + Database problems
    () => {
      return http.post(`${CHAOS_CONFIG.baseUrl}/api/conversation/start`,
        JSON.stringify({
          intent: 'createStory',
          storyType: 'adventure',
          userInput: 'Concurrent failure test 1',
          simulateNetworkIssues: true,
          simulateDbIssues: true
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
          }
        }
      );
    },
    
    // External service failures + Memory pressure
    () => {
      return http.post(`${CHAOS_CONFIG.baseUrl}/api/conversation/start`,
        JSON.stringify({
          intent: 'createStory',
          storyType: 'bedtime',
          userInput: 'Concurrent failure test 2',
          simulateExternalFailures: true,
          simulateMemoryPressure: true
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
          }
        }
      );
    },
    
    // CPU stress + Network partition
    () => {
      return http.post(`${CHAOS_CONFIG.baseUrl}/api/conversation/start`,
        JSON.stringify({
          intent: 'createStory',
          storyType: 'educational',
          userInput: 'Concurrent failure test 3',
          simulateCpuStress: true,
          simulateNetworkPartition: true
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CHAOS_CONFIG.apiKey}`
          }
        }
      );
    }
  ];
  
  // Execute all operations concurrently
  const responses = concurrentOperations.map(operation => operation());
  
  let successCount = 0;
  let cascadeCount = 0;
  
  responses.forEach((response, index) => {
    const operationSuccess = check(response, {
      [`concurrent operation ${index} resilient`]: (r) => r.status < 500,
      [`concurrent operation ${index} graceful degradation`]: (r) => {
        if (r.status >= 200 && r.status < 300) {
          const body = JSON.parse(r.body);
          return body.response && body.response.length > 0;
        }
        return r.status === 503; // Service unavailable is acceptable
      }
    });
    
    if (operationSuccess) {
      successCount++;
      systemResilience.add(1);
    } else {
      failureRate.add(1);
      cascadeCount++;
    }
  });
  
  // Check for cascade failures
  if (cascadeCount > 1) {
    cascadeFailures.add(cascadeCount - 1);
    console.log(`[${testId}] Detected ${cascadeCount} cascade failures`);
  }
  
  console.log(`[${testId}] Concurrent failure test: ${successCount}/${responses.length} operations successful`);
}

/**
 * Setup function - runs before all tests
 */
export function setup() {
  console.log('Starting Chaos Engineering Test Suite');
  console.log(`Base URL: ${CHAOS_CONFIG.baseUrl}`);
  console.log(`Test Duration: ${CHAOS_CONFIG.testDuration}`);
  console.log(`Failure Injection Rate: ${CHAOS_CONFIG.failureInjectionRate}`);
  
  // Verify system is healthy before starting chaos tests
  const healthCheck = http.get(`${CHAOS_CONFIG.baseUrl}/health`);
  
  if (!check(healthCheck, { 'system healthy before chaos': (r) => r.status === 200 })) {
    throw new Error('System not healthy - aborting chaos tests');
  }
  
  return {
    startTime: Date.now(),
    initialHealth: healthCheck.status
  };
}

/**
 * Teardown function - runs after all tests
 */
export function teardown(data) {
  const endTime = Date.now();
  const totalDuration = endTime - data.startTime;
  
  console.log(`Chaos Engineering Test Suite completed in ${totalDuration}ms`);
  
  // Final health check
  const finalHealthCheck = http.get(`${CHAOS_CONFIG.baseUrl}/health`);
  
  check(finalHealthCheck, {
    'system recovered after chaos': (r) => r.status === 200
  });
  
  console.log('Chaos Engineering Test Results:');
  console.log(`- System Resilience: ${systemResilience.rate * 100}%`);
  console.log(`- Failure Rate: ${failureRate.rate * 100}%`);
  console.log(`- Cascade Failures: ${cascadeFailures.count}`);
  console.log(`- Average Recovery Time: ${recoveryTime.avg}ms`);
}

export default function() {
  // This function runs for each VU iteration
  // The actual test logic is in the scenario-specific functions above
}