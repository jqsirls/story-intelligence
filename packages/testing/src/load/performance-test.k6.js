// K6 Load Test - 100K Concurrent Families Target
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const storyGenerationRate = new Rate('story_generation_success');
const p95ResponseTime = new Rate('p95_under_200ms');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 1000 },   // Ramp up to 1K users
    { duration: '10m', target: 10000 }, // Ramp up to 10K users
    { duration: '15m', target: 50000 }, // Ramp up to 50K users
    { duration: '20m', target: 100000 },// Ramp up to 100K users
    { duration: '30m', target: 100000 },// Stay at 100K for 30 min
    { duration: '10m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    errors: ['rate<0.01'],            // Error rate under 1%
    story_generation_success: ['rate>0.99'], // 99% success rate
  },
};

const BASE_URL = __ENV.API_URL || 'https://api.storytailor.ai/v1';

// Test data generators
function generateUser() {
  return {
    email: `loadtest_${randomString(10)}@test.com`,
    password: 'LoadTest123!',
    age: Math.floor(Math.random() * 10) + 8, // Ages 8-17
  };
}

function generateStoryRequest() {
  const types = ['adventure', 'bedtime', 'educational', 'therapeutic'];
  const themes = ['friendship', 'courage', 'discovery', 'kindness'];
  
  return {
    type: types[Math.floor(Math.random() * types.length)],
    theme: themes[Math.floor(Math.random() * themes.length)],
    duration: 'medium'
  };
}

// Virtual User Journey
export default function() {
  const user = generateUser();
  let authToken = '';
  let userId = '';
  
  // 1. User Registration
  const registerPayload = JSON.stringify({
    ...user,
    parentEmail: user.age < 13 ? 'parent@loadtest.com' : undefined
  });
  
  const registerRes = http.post(`${BASE_URL}/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const registerSuccess = check(registerRes, {
    'registration successful': (r) => r.status === 201,
    'received auth token': (r) => r.json('tokens.accessToken') !== undefined,
  });
  
  errorRate.add(!registerSuccess);
  
  if (registerSuccess) {
    const registerData = registerRes.json();
    authToken = registerData.tokens.accessToken;
    userId = registerData.user.id;
  } else {
    return; // Skip rest of journey if registration failed
  }
  
  sleep(1); // Think time
  
  // 2. Emotional Check-in
  const checkinRes = http.post(`${BASE_URL}/conversation/start`, 
    JSON.stringify({
      mood: 'happy',
      context: 'load_test'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
    }
  );
  
  check(checkinRes, {
    'checkin successful': (r) => r.status === 201,
  });
  
  sleep(2); // Think time
  
  // 3. Create Character
  const characterRes = http.post(`${BASE_URL}/characters`,
    JSON.stringify({
      name: `Hero_${randomString(5)}`,
      traits: ['brave', 'kind', 'curious'],
      appearance: 'A young explorer with bright eyes'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
    }
  );
  
  const characterSuccess = check(characterRes, {
    'character created': (r) => r.status === 201,
    'character has ID': (r) => r.json('character.id') !== undefined,
  });
  
  let characterId = '';
  if (characterSuccess) {
    characterId = characterRes.json('character.id');
  }
  
  sleep(2); // Think time
  
  // 4. Generate Story (Critical Path)
  const storyStartTime = Date.now();
  const storyRequest = generateStoryRequest();
  
  const storyRes = http.post(`${BASE_URL}/stories`,
    JSON.stringify({
      ...storyRequest,
      characterId: characterId
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      timeout: '30s', // 30 second timeout for story generation
    }
  );
  
  const storyDuration = Date.now() - storyStartTime;
  
  const storySuccess = check(storyRes, {
    'story generated': (r) => r.status === 201,
    'story has content': (r) => r.json('story.content') !== undefined,
    'story has audio': (r) => r.json('story.audioUrl') !== undefined,
    'response under 5s': (r) => storyDuration < 5000,
  });
  
  storyGenerationRate.add(storySuccess);
  p95ResponseTime.add(storyDuration < 200);
  
  if (storySuccess) {
    const storyId = storyRes.json('story.id');
    
    sleep(5); // Simulate reading time
    
    // 5. Track Reading Progress
    http.put(`${BASE_URL}/stories/${storyId}/progress`,
      JSON.stringify({
        progress: 0.5,
        timeSpent: 150
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
      }
    );
  }
  
  sleep(3); // Think time before next action
  
  // 6. Library Operations (Read-heavy)
  const libraryRes = http.get(`${BASE_URL}/library/stories`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
  });
  
  check(libraryRes, {
    'library retrieved': (r) => r.status === 200,
  });
  
  // 7. Search Operations
  const searchRes = http.get(`${BASE_URL}/library/search?q=adventure`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
  });
  
  check(searchRes, {
    'search successful': (r) => r.status === 200,
  });
  
  // Random sleep between iterations
  sleep(Math.random() * 5 + 5); // 5-10 seconds
}

// Scenario for different user behaviors
export const scenarios = {
  // New users creating first story
  new_users: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 5000 },
      { duration: '20m', target: 20000 },
      { duration: '5m', target: 0 },
    ],
    exec: 'newUserJourney',
  },
  
  // Returning users browsing library
  returning_users: {
    executor: 'constant-vus',
    vus: 50000,
    duration: '30m',
    exec: 'returningUserJourney',
  },
  
  // Peak bedtime story generation
  bedtime_rush: {
    executor: 'ramping-arrival-rate',
    startRate: 100,
    timeUnit: '1s',
    preAllocatedVUs: 10000,
    stages: [
      { duration: '5m', target: 1000 },  // Ramp up to 1000 RPS
      { duration: '15m', target: 5000 }, // Peak at 5000 RPS
      { duration: '5m', target: 100 },   // Cool down
    ],
    exec: 'bedtimeStoryGeneration',
  },
};

// Specialized test functions
export function newUserJourney() {
  // Full journey as defined in default function
  default();
}

export function returningUserJourney() {
  // Assume user already has token (would be loaded from data file in real test)
  const authToken = 'preset-token';
  
  // Browse library
  const libraryRes = http.get(`${BASE_URL}/library/stories?limit=20`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  
  check(libraryRes, {
    'library loaded': (r) => r.status === 200,
    'has stories': (r) => r.json('stories.length') > 0,
  });
  
  sleep(2);
  
  // Get recommendations
  const recsRes = http.get(`${BASE_URL}/library/recommendations`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  
  check(recsRes, {
    'recommendations loaded': (r) => r.status === 200,
  });
  
  sleep(Math.random() * 5 + 3);
}

export function bedtimeStoryGeneration() {
  const authToken = 'preset-token';
  const characterId = 'preset-character';
  
  const storyRes = http.post(`${BASE_URL}/stories`,
    JSON.stringify({
      type: 'bedtime',
      characterId: characterId,
      theme: 'peaceful dreams',
      options: {
        duration: 'short',
        mood: 'calming'
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
    }
  );
  
  const success = check(storyRes, {
    'bedtime story created': (r) => r.status === 201,
    'is calming': (r) => r.json('story.metadata.calmingScore') > 0.8,
  });
  
  storyGenerationRate.add(success);
  sleep(1);
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Peak VUs: ${data.metrics.vus.max}`);
  console.log(`Total Requests: ${data.metrics.http_reqs.count}`);
  console.log(`Error Rate: ${data.metrics.errors.rate}%`);
  console.log(`Story Success Rate: ${data.metrics.story_generation_success.rate}%`);
}