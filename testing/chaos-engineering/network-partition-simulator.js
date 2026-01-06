/**
 * Network Partition Simulator for Chaos Engineering
 * 
 * Simulates various network conditions including partitions, latency,
 * packet loss, and bandwidth limitations to test system resilience.
 */

const http = require('k6/http');
const { check, sleep } = require('k6');
const { Rate, Trend, Counter } = require('k6/metrics');

// Custom metrics
const partitionRecoveryTime = new Trend('partition_recovery_time');
const networkResilienceRate = new Rate('network_resilience_rate');
const connectionFailures = new Counter('connection_failures');
const latencySpikes = new Counter('latency_spikes');

class NetworkPartitionSimulator {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.partitionProbability = config.partitionProbability || 0.1;
    this.latencyRange = config.latencyRange || { min: 100, max: 5000 };
    this.packetLossRate = config.packetLossRate || 0.05;
    this.bandwidthLimit = config.bandwidthLimit || 1000; // KB/s
  }

  /**
   * Simulate network partition between client and server
   */
  simulatePartition(duration = 5000) {
    console.log(`Simulating network partition for ${duration}ms`);
    
    const partitionStart = Date.now();
    
    // Attempt requests during partition
    const partitionRequests = [];
    const requestInterval = 500; // Try every 500ms
    
    while (Date.now() - partitionStart < duration) {
      const request = this.makePartitionedRequest();
      partitionRequests.push(request);
      sleep(requestInterval / 1000);
    }
    
    // Test recovery after partition
    const recoveryStart = Date.now();
    const recoveryRequest = this.makeRecoveryRequest();
    const recoveryTime = Date.now() - recoveryStart;
    
    partitionRecoveryTime.add(recoveryTime);
    
    const recoverySuccess = check(recoveryRequest, {
      'partition recovery successful': (r) => r.status === 200,
      'recovery time acceptable': () => recoveryTime < 10000
    });
    
    if (recoverySuccess) {
      networkResilienceRate.add(1);
    } else {
      connectionFailures.add(1);
    }
    
    return {
      partitionDuration: duration,
      recoveryTime: recoveryTime,
      requestsDuringPartition: partitionRequests.length,
      recoverySuccessful: recoverySuccess
    };
  }

  /**
   * Make request during network partition (should fail or timeout)
   */
  makePartitionedRequest() {
    try {
      const response = http.post(`${this.baseUrl}/api/conversation/start`,
        JSON.stringify({
          intent: 'createStory',
          storyType: 'adventure',
          userInput: 'Partition test message'
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: '2s' // Short timeout during partition
        }
      );
      
      // If we get a response during partition, it's unexpected
      if (response.status === 200) {
        console.log('Unexpected success during partition');
      }
      
      return response;
    } catch (error) {
      // Expected during partition
      return { status: 0, error: error.message };
    }
  }

  /**
   * Make request after partition recovery
   */
  makeRecoveryRequest() {
    return http.post(`${this.baseUrl}/api/conversation/start`,
      JSON.stringify({
        intent: 'createStory',
        storyType: 'bedtime',
        userInput: 'Recovery test message'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: '30s' // Longer timeout for recovery
      }
    );
  }

  /**
   * Simulate high latency conditions
   */
  simulateHighLatency(targetLatency = 2000) {
    console.log(`Simulating high latency: ${targetLatency}ms`);
    
    const latencyStart = Date.now();
    
    const response = http.post(`${this.baseUrl}/api/conversation/start`,
      JSON.stringify({
        intent: 'createStory',
        storyType: 'educational',
        userInput: 'High latency test',
        simulateLatency: targetLatency
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: '45s'
      }
    );
    
    const actualLatency = Date.now() - latencyStart;
    
    if (actualLatency > targetLatency * 1.5) {
      latencySpikes.add(1);
    }
    
    const latencyResilience = check(response, {
      'high latency request successful': (r) => r.status === 200,
      'graceful latency handling': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.response && body.response.length > 0;
        }
        return false;
      },
      'latency timeout handling': () => actualLatency < 40000
    });
    
    if (latencyResilience) {
      networkResilienceRate.add(1);
    } else {
      connectionFailures.add(1);
    }
    
    return {
      targetLatency,
      actualLatency,
      successful: latencyResilience
    };
  }

  /**
   * Simulate packet loss conditions
   */
  simulatePacketLoss(lossRate = 0.1) {
    console.log(`Simulating packet loss: ${lossRate * 100}%`);
    
    const attempts = 10;
    let successfulRequests = 0;
    let totalLatency = 0;
    
    for (let i = 0; i < attempts; i++) {
      // Simulate packet loss by randomly failing requests
      if (Math.random() < lossRate) {
        console.log(`Request ${i + 1} lost due to packet loss`);
        continue;
      }
      
      const requestStart = Date.now();
      
      const response = http.post(`${this.baseUrl}/api/conversation/message`,
        JSON.stringify({
          sessionId: 'packet-loss-test',
          message: `Packet loss test message ${i + 1}`,
          retryAttempt: i
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      const requestLatency = Date.now() - requestStart;
      totalLatency += requestLatency;
      
      const requestSuccess = check(response, {
        [`packet loss request ${i + 1} successful`]: (r) => r.status === 200
      });
      
      if (requestSuccess) {
        successfulRequests++;
      }
    }
    
    const successRate = successfulRequests / attempts;
    const averageLatency = totalLatency / successfulRequests || 0;
    
    const packetLossResilience = successRate > (1 - lossRate * 2); // Should handle 2x the loss rate
    
    if (packetLossResilience) {
      networkResilienceRate.add(1);
    } else {
      connectionFailures.add(1);
    }
    
    return {
      lossRate,
      successRate,
      averageLatency,
      resilient: packetLossResilience
    };
  }

  /**
   * Simulate bandwidth limitations
   */
  simulateBandwidthLimit(limitKBps = 100) {
    console.log(`Simulating bandwidth limit: ${limitKBps} KB/s`);
    
    // Create a large payload to test bandwidth limits
    const largePayload = {
      intent: 'createStory',
      storyType: 'adventure',
      userInput: 'A'.repeat(10000), // 10KB of data
      characterDetails: {
        name: 'TestCharacter',
        description: 'B'.repeat(5000), // 5KB more
        appearance: 'C'.repeat(3000) // 3KB more
      },
      storyPreferences: {
        length: 'extended',
        complexity: 'detailed',
        themes: ['adventure', 'friendship', 'courage'],
        additionalData: 'D'.repeat(2000) // 2KB more
      }
    };
    
    const transferStart = Date.now();
    
    const response = http.post(`${this.baseUrl}/api/conversation/start`,
      JSON.stringify(largePayload),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: '60s'
      }
    );
    
    const transferTime = Date.now() - transferStart;
    const payloadSize = JSON.stringify(largePayload).length / 1024; // KB
    const actualBandwidth = payloadSize / (transferTime / 1000); // KB/s
    
    const bandwidthResilience = check(response, {
      'bandwidth limited request successful': (r) => r.status === 200,
      'reasonable transfer time': () => transferTime < 30000,
      'bandwidth adaptation': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.response && body.response.length > 0;
        }
        return false;
      }
    });
    
    if (bandwidthResilience) {
      networkResilienceRate.add(1);
    } else {
      connectionFailures.add(1);
    }
    
    return {
      limitKBps,
      actualBandwidth,
      transferTime,
      payloadSize,
      resilient: bandwidthResilience
    };
  }

  /**
   * Simulate intermittent connectivity
   */
  simulateIntermittentConnectivity(duration = 30000) {
    console.log(`Simulating intermittent connectivity for ${duration}ms`);
    
    const testStart = Date.now();
    const results = [];
    
    while (Date.now() - testStart < duration) {
      // Randomly alternate between connected and disconnected states
      const isConnected = Math.random() > 0.3; // 70% connected, 30% disconnected
      
      if (isConnected) {
        const response = http.post(`${this.baseUrl}/api/conversation/message`,
          JSON.stringify({
            sessionId: 'intermittent-test',
            message: 'Intermittent connectivity test',
            timestamp: Date.now()
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: '5s'
          }
        );
        
        results.push({
          timestamp: Date.now(),
          connected: true,
          successful: response.status === 200,
          latency: response.timings.duration
        });
      } else {
        // Simulate disconnection
        results.push({
          timestamp: Date.now(),
          connected: false,
          successful: false,
          latency: 0
        });
      }
      
      sleep(1); // Wait 1 second between attempts
    }
    
    const totalAttempts = results.length;
    const successfulAttempts = results.filter(r => r.successful).length;
    const connectionAttempts = results.filter(r => r.connected).length;
    const successRate = successfulAttempts / connectionAttempts || 0;
    
    const intermittentResilience = successRate > 0.8; // 80% success rate when connected
    
    if (intermittentResilience) {
      networkResilienceRate.add(1);
    } else {
      connectionFailures.add(1);
    }
    
    return {
      duration,
      totalAttempts,
      connectionAttempts,
      successfulAttempts,
      successRate,
      resilient: intermittentResilience
    };
  }

  /**
   * Comprehensive network chaos test
   */
  runComprehensiveNetworkChaos() {
    console.log('Starting comprehensive network chaos test');
    
    const chaosResults = {
      partition: null,
      highLatency: null,
      packetLoss: null,
      bandwidthLimit: null,
      intermittent: null
    };
    
    try {
      // Test 1: Network Partition
      chaosResults.partition = this.simulatePartition(3000);
      sleep(2);
      
      // Test 2: High Latency
      chaosResults.highLatency = this.simulateHighLatency(1500);
      sleep(2);
      
      // Test 3: Packet Loss
      chaosResults.packetLoss = this.simulatePacketLoss(0.15);
      sleep(2);
      
      // Test 4: Bandwidth Limitation
      chaosResults.bandwidthLimit = this.simulateBandwidthLimit(50);
      sleep(2);
      
      // Test 5: Intermittent Connectivity
      chaosResults.intermittent = this.simulateIntermittentConnectivity(15000);
      
    } catch (error) {
      console.error('Network chaos test error:', error);
      connectionFailures.add(1);
    }
    
    // Calculate overall network resilience
    const resilientTests = Object.values(chaosResults).filter(result => 
      result && result.resilient !== false
    ).length;
    
    const totalTests = Object.keys(chaosResults).length;
    const overallResilience = resilientTests / totalTests;
    
    console.log(`Network chaos test completed: ${resilientTests}/${totalTests} tests resilient`);
    
    return {
      overallResilience,
      results: chaosResults
    };
  }
}

// Export for use in other chaos engineering tests
module.exports = NetworkPartitionSimulator;

// K6 test functions
export function networkPartitionChaosTest() {
  const config = {
    baseUrl: __ENV.API_BASE_URL || 'http://localhost:3000',
    apiKey: __ENV.API_KEY || 'test-api-key',
    partitionProbability: 0.2,
    latencyRange: { min: 500, max: 3000 }
  };
  
  const simulator = new NetworkPartitionSimulator(config);
  return simulator.runComprehensiveNetworkChaos();
}

export function setup() {
  console.log('Network Partition Simulator - Setup');
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Network chaos testing completed in ${duration}ms`);
  console.log(`Network resilience rate: ${networkResilienceRate.rate * 100}%`);
  console.log(`Connection failures: ${connectionFailures.count}`);
  console.log(`Latency spikes: ${latencySpikes.count}`);
}