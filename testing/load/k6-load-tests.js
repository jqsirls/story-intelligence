// K6 Load Testing Suite for Storytailor Multi-Agent System
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const conversationStartTime = new Trend('conversation_start_time');
const messageResponseTime = new Trend('message_response_time');
const voiceProcessingTime = new Trend('voice_processing_time');
const storyGenerationTime = new Trend('story_generation_time');
const coldStartTime = new Trend('cold_start_time');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
  scenarios: {
    // Baseline load test - 500 RPS requirement
    baseline_load: {
      executor: 'constant-arrival-rate',
      rate: 500, // 500 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      tags: { test_type: 'baseline' },
    },
    
    // Spike test - sudden traffic increase
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '1m', target: 1000 }, // Spike to 1000 RPS
        { duration: '2m', target: 100 },
      ],
      tags: { test_type: 'spike' },
    },
    
    // Stress test - find breaking point
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 500,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 1500 },
        { duration: '5m', target: 2000 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 500 },
      ],
      tags: { test_type: 'stress' },
    },
    
    // Cold start test - Lambda performance
    cold_start_test: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 100,
      maxDuration: '10m',
      tags: { test_type: 'cold_start' },
    },
    
    // WebSocket conversation test
    websocket_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      tags: { test_type: 'websocket' },
    },
  },
  
  thresholds: {
    // Performance requirements
    'response_time': ['p(95)<800'], // 95% under 800ms
    'conversation_start_time': ['p(95)<1000'], // Conversation start under 1s
    'message_response_time': ['p(95)<800'], // Message response under 800ms
    'voice_processing_time': ['p(95)<500'], // Voice processing under 500ms
    'story_generation_time': ['p(95)<5000'], // Story generation under 5s
    'cold_start_time': ['p(95)<150'], // Cold start under 150ms requirement
    'errors': ['rate<0.01'], // Error rate under 1%
    'http_req_failed': ['rate<0.01'], // HTTP failure rate under 1%
    'http_req_duration': ['p(95)<800'], // 95% of requests under 800ms
  },
};\n\n// Test data\nconst API_BASE_URL = __ENV.API_BASE_URL || 'https://orchestrator.storytailor.com';\nconst WS_BASE_URL = __ENV.WS_BASE_URL || 'wss://orchestrator.storytailor.com';\nconst API_KEY = __ENV.API_KEY || 'test-api-key';\n\n// Test user data\nconst testUsers = [\n  { email: 'test1@example.com', age: 5 },\n  { email: 'test2@example.com', age: 8 },\n  { email: 'test3@example.com', age: 10 },\n  { email: 'test4@example.com', age: 12 },\n];\n\nconst storyPrompts = [\n  'I want a bedtime story about a brave little mouse',\n  'Tell me an adventure story with a dragon',\n  'Create a story about friendship and kindness',\n  'I want a story about going to school for the first time',\n  'Tell me about a magical forest adventure',\n];\n\nconst characterTraits = [\n  { species: 'human', age: 7, gender: 'girl', ethnicity: 'mixed' },\n  { species: 'animal', age: 5, gender: 'boy', animal_type: 'cat' },\n  { species: 'robot', age: 10, gender: 'non-binary' },\n  { species: 'magical', age: 8, gender: 'girl', creature_type: 'fairy' },\n];\n\n// Utility functions\nfunction getRandomUser() {\n  return testUsers[Math.floor(Math.random() * testUsers.length)];\n}\n\nfunction getRandomPrompt() {\n  return storyPrompts[Math.floor(Math.random() * storyPrompts.length)];\n}\n\nfunction getRandomCharacter() {\n  return characterTraits[Math.floor(Math.random() * characterTraits.length)];\n}\n\nfunction makeAuthenticatedRequest(method, url, payload = null) {\n  const headers = {\n    'Authorization': `Bearer ${API_KEY}`,\n    'Content-Type': 'application/json',\n  };\n  \n  const params = {\n    headers,\n    timeout: '30s',\n  };\n  \n  totalRequests.add(1);\n  \n  let response;\n  const startTime = Date.now();\n  \n  if (method === 'GET') {\n    response = http.get(url, params);\n  } else if (method === 'POST') {\n    response = http.post(url, JSON.stringify(payload), params);\n  } else if (method === 'PUT') {\n    response = http.put(url, JSON.stringify(payload), params);\n  } else if (method === 'DELETE') {\n    response = http.del(url, null, params);\n  }\n  \n  const duration = Date.now() - startTime;\n  responseTime.add(duration);\n  \n  const success = check(response, {\n    'status is 2xx': (r) => r.status >= 200 && r.status < 300,\n    'response time < 800ms': (r) => r.timings.duration < 800,\n  });\n  \n  if (!success) {\n    errorRate.add(1);\n  }\n  \n  return response;\n}\n\n// Test scenarios\nexport default function() {\n  const scenario = __ENV.K6_SCENARIO_NAME || 'baseline_load';\n  \n  switch (scenario) {\n    case 'baseline_load':\n      baselineLoadTest();\n      break;\n    case 'spike_test':\n      spikeTest();\n      break;\n    case 'stress_test':\n      stressTest();\n      break;\n    case 'cold_start_test':\n      coldStartTest();\n      break;\n    case 'websocket_test':\n      websocketTest();\n      break;\n    default:\n      baselineLoadTest();\n  }\n}\n\nfunction baselineLoadTest() {\n  // Test conversation flow\n  const user = getRandomUser();\n  \n  // 1. Start conversation\n  const startTime = Date.now();\n  const sessionResponse = makeAuthenticatedRequest('POST', `${API_BASE_URL}/v1/conversation/start`, {\n    platform: 'api',\n    language: 'en-US',\n    voiceEnabled: false,\n    smartHomeEnabled: false,\n    user: user\n  });\n  \n  conversationStartTime.add(Date.now() - startTime);\n  \n  if (sessionResponse.status !== 200) {\n    return;\n  }\n  \n  const session = JSON.parse(sessionResponse.body);\n  const sessionId = session.sessionId;\n  \n  // 2. Send message\n  const messageStart = Date.now();\n  const messageResponse = makeAuthenticatedRequest('POST', `${API_BASE_URL}/v1/conversation/message`, {\n    sessionId: sessionId,\n    message: {\n      type: 'text',\n      content: getRandomPrompt()\n    }\n  });\n  \n  messageResponseTime.add(Date.now() - messageStart);\n  \n  // 3. Create character (30% of conversations)\n  if (Math.random() < 0.3) {\n    makeAuthenticatedRequest('POST', `${API_BASE_URL}/v1/characters`, {\n      sessionId: sessionId,\n      character: getRandomCharacter()\n    });\n  }\n  \n  // 4. Generate story (20% of conversations)\n  if (Math.random() < 0.2) {\n    const storyStart = Date.now();\n    makeAuthenticatedRequest('POST', `${API_BASE_URL}/v1/stories`, {\n      sessionId: sessionId,\n      storyType: 'adventure',\n      generateAssets: true\n    });\n    storyGenerationTime.add(Date.now() - storyStart);\n  }\n  \n  // 5. End conversation\n  makeAuthenticatedRequest('POST', `${API_BASE_URL}/v1/conversation/end`, {\n    sessionId: sessionId\n  });\n  \n  sleep(1);\n}\n\nfunction spikeTest() {\n  // Simplified test for spike scenarios\n  const healthResponse = makeAuthenticatedRequest('GET', `${API_BASE_URL}/health`);\n  \n  check(healthResponse, {\n    'health check passes': (r) => r.status === 200,\n  });\n  \n  sleep(0.1);\n}\n\nfunction stressTest() {\n  // More intensive operations for stress testing\n  const user = getRandomUser();\n  \n  // Start multiple concurrent conversations\n  const sessions = [];\n  \n  for (let i = 0; i < 3; i++) {\n    const sessionResponse = makeAuthenticatedRequest('POST', `${API_BASE_URL}/v1/conversation/start`, {\n      platform: 'api',\n      user: user\n    });\n    \n    if (sessionResponse.status === 200) {\n      sessions.push(JSON.parse(sessionResponse.body).sessionId);\n    }\n  }\n  \n  // Send messages to all sessions\n  sessions.forEach(sessionId => {\n    makeAuthenticatedRequest('POST', `${API_BASE_URL}/v1/conversation/message`, {\n      sessionId: sessionId,\n      message: {\n        type: 'text',\n        content: getRandomPrompt()\n      }\n    });\n  });\n  \n  // Clean up sessions\n  sessions.forEach(sessionId => {\n    makeAuthenticatedRequest('POST', `${API_BASE_URL}/v1/conversation/end`, {\n      sessionId: sessionId\n    });\n  });\n  \n  sleep(0.5);\n}\n\nfunction coldStartTest() {\n  // Test cold start performance\n  const startTime = Date.now();\n  \n  const response = makeAuthenticatedRequest('GET', `${API_BASE_URL}/health`);\n  \n  const duration = Date.now() - startTime;\n  coldStartTime.add(duration);\n  \n  check(response, {\n    'cold start under 150ms': () => duration < 150,\n    'status is 200': (r) => r.status === 200,\n  });\n  \n  sleep(5); // Wait between cold starts\n}\n\nfunction websocketTest() {\n  const url = `${WS_BASE_URL}/ws`;\n  \n  const response = ws.connect(url, {\n    headers: {\n      'Authorization': `Bearer ${API_KEY}`,\n    },\n  }, function (socket) {\n    socket.on('open', function open() {\n      console.log('WebSocket connected');\n      \n      // Start conversation\n      socket.send(JSON.stringify({\n        type: 'start_conversation',\n        config: {\n          platform: 'websocket',\n          voiceEnabled: false\n        }\n      }));\n    });\n    \n    socket.on('message', function message(data) {\n      const msg = JSON.parse(data);\n      \n      if (msg.type === 'conversation_started') {\n        // Send a message\n        socket.send(JSON.stringify({\n          type: 'message',\n          sessionId: msg.session.sessionId,\n          message: {\n            type: 'text',\n            content: getRandomPrompt()\n          }\n        }));\n      } else if (msg.type === 'response_complete') {\n        // Close connection after response\n        socket.close();\n      }\n    });\n    \n    socket.on('error', function error(e) {\n      console.log('WebSocket error:', e);\n      errorRate.add(1);\n    });\n    \n    // Timeout after 30 seconds\n    setTimeout(() => {\n      socket.close();\n    }, 30000);\n  });\n  \n  check(response, {\n    'WebSocket connection successful': (r) => r && r.status === 101,\n  });\n}\n\n// Setup function\nexport function setup() {\n  console.log('Starting load tests...');\n  console.log(`API Base URL: ${API_BASE_URL}`);\n  console.log(`WebSocket URL: ${WS_BASE_URL}`);\n  \n  // Warm up the system\n  const warmupResponse = http.get(`${API_BASE_URL}/health`);\n  console.log(`Warmup response: ${warmupResponse.status}`);\n  \n  return {\n    apiBaseUrl: API_BASE_URL,\n    wsBaseUrl: WS_BASE_URL,\n  };\n}\n\n// Teardown function\nexport function teardown(data) {\n  console.log('Load tests completed');\n  console.log(`Total requests: ${totalRequests.count}`);\n  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);\n  console.log(`Average response time: ${responseTime.avg.toFixed(2)}ms`);\n}"