# 🤖 Multi-Agent Connection Protocol (MACP)

## 📋 **Complete Guide for AI Platform Integration**

This document provides everything needed for AI platforms, agents, and MCP servers to successfully connect to the Storytailor Multi-Agent System.

---

## 🚀 **Quick Start for AI Platforms**

### **Connection Endpoint**
```
wss://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/agents
```

### **HTTP Fallback**
```
https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/agents
```

### **Authentication**
```http
Authorization: Bearer [REDACTED_JWT]
X-Agent-ID: your-unique-agent-id
X-Agent-Version: 1.0.0
Content-Type: application/json
```

### **Test Connection**
```bash
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/agents/register \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test-agent-001",
    "name": "Test AI Agent",
    "capabilities": ["story-generation", "content-analysis"]
  }'
```

---

## 🏗️ **Agent Registration Protocol**

### **Registration Request**
```json
{
  "agentId": "your-unique-agent-id",
  "name": "Your AI Agent Name",
  "version": "1.0.0",
  "type": "ai-assistant",
  "capabilities": [
    "story-generation",
    "voice-synthesis",
    "content-safety",
    "emotional-analysis",
    "educational-content",
    "accessibility-support"
  ],
  "endpoints": {
    "webhook": "https://your-agent.com/webhook/storytailor",
    "health": "https://your-agent.com/health",
    "metrics": "https://your-agent.com/metrics"
  },
  "authentication": {
    "type": "bearer",
    "token": "your-agent-authentication-token"
  },
  "configuration": {
    "maxConcurrentRequests": 10,
    "timeoutMs": 30000,
    "retryAttempts": 3,
    "supportedLanguages": ["en", "es", "fr"],
    "ageRanges": ["3-5", "6-8", "9-12"],
    "contentTypes": ["story", "educational", "therapeutic"]
  },
  "metadata": {
    "description": "AI agent specialized in children's storytelling",
    "vendor": "Your Company Name",
    "contactEmail": "support@yourcompany.com",
    "documentation": "https://docs.yourcompany.com/storytailor-integration"
  }
}
```

### **Registration Response**
```json
{
  "success": true,
  "agentId": "your-unique-agent-id",
  "registrationId": "reg-550e8400-e29b-41d4-a716-446655440000",
  "status": "active",
  "assignedCapabilities": [
    "story-generation",
    "content-safety"
  ],
  "connectionInfo": {
    "websocketUrl": "wss://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/agents/your-unique-agent-id",
    "heartbeatInterval": 30000,
    "maxMessageSize": 1048576
  },
  "credentials": {
    "agentToken": "agent-token-for-authentication",
    "refreshToken": "refresh-token-for-renewal"
  },
  "routing": {
    "priority": 100,
    "loadBalancing": "round-robin",
    "failoverAgents": ["backup-agent-001"]
  }
}
```

---

## 📡 **Message Protocol**

### **Message Format**
```json
{
  "messageId": "msg-550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-08-02T07:02:19.315Z",
  "version": "1.0",
  "source": {
    "agentId": "storytailor-universal-agent",
    "type": "orchestrator"
  },
  "target": {
    "agentId": "your-agent-id",
    "type": "specialist"
  },
  "messageType": "story-generation-request",
  "priority": "normal",
  "timeout": 30000,
  "payload": {
    "requestId": "req-123456",
    "prompt": "Create a story about friendship",
    "context": {
      "userId": "user-550e8400-e29b-41d4-a716-446655440000",
      "sessionId": "session-789012",
      "conversationId": "conv-345678",
      "userPreferences": {
        "ageRange": "6-8",
        "mood": "happy",
        "length": "medium",
        "characters": ["mouse", "cat"],
        "themes": ["friendship", "adventure"]
      },
      "parentalControls": {
        "coppaProtected": false,
        "contentFiltering": "moderate",
        "timeRestrictions": null
      }
    },
    "requirements": {
      "maxWordCount": 500,
      "includeAudio": false,
      "language": "en",
      "safetyLevel": "child-safe"
    }
  },
  "metadata": {
    "correlationId": "corr-abcdef123456",
    "traceId": "trace-fedcba654321",
    "retryCount": 0,
    "previousAgents": []
  }
}
```

### **Response Format**
```json
{
  "messageId": "msg-550e8400-e29b-41d4-a716-446655440000",
  "responseId": "resp-550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-08-02T07:02:25.123Z",
  "source": {
    "agentId": "your-agent-id",
    "type": "specialist"
  },
  "target": {
    "agentId": "storytailor-universal-agent",
    "type": "orchestrator"
  },
  "messageType": "story-generation-response",
  "status": "success",
  "processingTime": 5808,
  "payload": {
    "requestId": "req-123456",
    "story": {
      "id": "story-550e8400-e29b-41d4-a716-446655440002",
      "title": "The Unlikely Friendship",
      "content": "Once upon a time, in a cozy little town...",
      "metadata": {
        "wordCount": 342,
        "estimatedReadingTime": 3,
        "safetyScore": 0.98,
        "themes": ["friendship", "kindness", "acceptance"],
        "characters": ["Whiskers the Mouse", "Mittens the Cat"],
        "ageAppropriate": "6-8",
        "educationalValue": "social-emotional learning"
      }
    },
    "confidence": 0.95,
    "alternatives": [
      {
        "title": "Mouse and Cat Adventures",
        "confidence": 0.87
      }
    ]
  },
  "metadata": {
    "correlationId": "corr-abcdef123456",
    "traceId": "trace-fedcba654321",
    "agentVersion": "1.0.0",
    "modelUsed": "your-ai-model-v2",
    "resourcesUsed": {
      "computeTime": 5.8,
      "memoryMB": 256,
      "apiCalls": 1
    }
  }
}
```

---

## 🔄 **Message Types**

### **Story Generation**
```json
{
  "messageType": "story-generation-request",
  "payload": {
    "prompt": "Create a story about...",
    "context": { /* user context */ },
    "requirements": { /* story requirements */ }
  }
}
```

### **Content Safety Check**
```json
{
  "messageType": "content-safety-request",
  "payload": {
    "content": "Story content to validate...",
    "ageRange": "6-8",
    "safetyLevel": "strict"
  }
}
```

### **Voice Synthesis**
```json
{
  "messageType": "voice-synthesis-request",
  "payload": {
    "text": "Text to synthesize...",
    "voiceId": "child-friendly-voice",
    "speed": 1.0,
    "includeTimestamps": true
  }
}
```

### **Emotional Analysis**
```json
{
  "messageType": "emotional-analysis-request",
  "payload": {
    "userInput": "I'm feeling sad today",
    "context": {
      "previousEmotions": ["happy", "excited"],
      "sessionDuration": 1200
    }
  }
}
```

### **Educational Content**
```json
{
  "messageType": "educational-content-request",
  "payload": {
    "subject": "mathematics",
    "gradeLevel": "2nd",
    "learningObjective": "addition with regrouping",
    "storyIntegration": true
  }
}
```

---

## 🌐 **WebSocket Connection**

### **Connection Establishment**
```javascript
const WebSocket = require('ws');

const ws = new WebSocket('wss://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/agents', {
  headers: {
    'Authorization': 'Bearer YOUR_AGENT_API_KEY',
    'X-Agent-ID': 'your-unique-agent-id',
    'X-Agent-Version': '1.0.0'
  }
});

ws.on('open', () => {
  console.log('Connected to Storytailor Multi-Agent System');
  
  // Send registration message
  ws.send(JSON.stringify({
    messageType: 'agent-register',
    agentId: 'your-unique-agent-id',
    capabilities: ['story-generation', 'content-safety']
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  handleIncomingMessage(message);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} - ${reason}`);
  // Implement reconnection logic
  setTimeout(reconnect, 5000);
});
```

### **Message Handling**
```javascript
async function handleIncomingMessage(message) {
  const { messageType, payload, messageId } = message;
  
  try {
    let response;
    
    switch (messageType) {
      case 'story-generation-request':
        response = await handleStoryGeneration(payload);
        break;
        
      case 'content-safety-request':
        response = await handleContentSafety(payload);
        break;
        
      case 'voice-synthesis-request':
        response = await handleVoiceSynthesis(payload);
        break;
        
      case 'heartbeat':
        response = { status: 'alive', timestamp: new Date().toISOString() };
        break;
        
      default:
        throw new Error(`Unknown message type: ${messageType}`);
    }
    
    // Send response
    ws.send(JSON.stringify({
      messageId,
      responseId: generateResponseId(),
      messageType: `${messageType.replace('-request', '-response')}`,
      status: 'success',
      payload: response,
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    // Send error response
    ws.send(JSON.stringify({
      messageId,
      responseId: generateResponseId(),
      messageType: `${messageType.replace('-request', '-response')}`,
      status: 'error',
      error: {
        code: error.code || 'PROCESSING_ERROR',
        message: error.message,
        details: error.details
      },
      timestamp: new Date().toISOString()
    }));
  }
}
```

---

## 🔌 **HTTP Webhook Integration**

### **Webhook Endpoint Setup**
```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Webhook endpoint for Storytailor messages
app.post('/webhook/storytailor', async (req, res) => {
  const { messageId, messageType, payload, source } = req.body;
  
  // Verify the request is from Storytailor
  const signature = req.headers['x-storytailor-signature'];
  if (!verifySignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  try {
    let result;
    
    switch (messageType) {
      case 'story-generation-request':
        result = await processStoryGeneration(payload);
        break;
        
      case 'content-safety-request':
        result = await processContentSafety(payload);
        break;
        
      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }
    
    res.json({
      messageId,
      status: 'success',
      result,
      processingTime: Date.now() - req.startTime
    });
    
  } catch (error) {
    res.status(500).json({
      messageId,
      status: 'error',
      error: {
        code: error.code || 'PROCESSING_ERROR',
        message: error.message
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agentId: 'your-unique-agent-id',
    version: '1.0.0',
    capabilities: ['story-generation', 'content-safety'],
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.listen(3000, () => {
  console.log('Agent webhook server running on port 3000');
});
```

---

## 🔐 **Security & Authentication**

### **API Key Management**
```javascript
// Generate agent API key
const generateAgentApiKey = () => {
  return `st_agent_${crypto.randomBytes(32).toString('hex')}`;
};

// Validate incoming requests
const validateRequest = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const agentId = req.headers['x-agent-id'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  // Validate token against registered agents
  if (!isValidAgentToken(token, agentId)) {
    return res.status(401).json({ error: 'Invalid agent token' });
  }
  
  req.agentId = agentId;
  next();
};
```

### **Message Signing**
```javascript
const crypto = require('crypto');

// Sign outgoing messages
const signMessage = (message, secret) => {
  const payload = JSON.stringify(message);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${signature}`;
};

// Verify incoming message signatures
const verifySignature = (message, signature, secret) => {
  const payload = JSON.stringify(message);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
};
```

---

## 📊 **MCP (Model Context Protocol) Integration**

### **MCP Server Configuration**
```json
{
  "name": "storytailor-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for Storytailor Multi-Agent System integration",
  "capabilities": {
    "tools": true,
    "resources": true,
    "prompts": true,
    "logging": true
  },
  "connection": {
    "type": "websocket",
    "url": "wss://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/mcp",
    "authentication": {
      "type": "bearer",
      "token": "YOUR_MCP_TOKEN"
    }
  }
}
```

### **Tool Definitions**
```json
{
  "tools": [
    {
      "name": "generate_story",
      "description": "Generate an Story Intelligence™ powered personalized story for children",
      "inputSchema": {
        "type": "object",
        "properties": {
          "prompt": {
            "type": "string",
            "description": "The story prompt or theme"
          },
          "ageRange": {
            "type": "string",
            "enum": ["3-5", "6-8", "9-12"],
            "description": "Target age range for the story"
          },
          "mood": {
            "type": "string",
            "enum": ["happy", "adventurous", "calm", "educational"],
            "description": "Desired mood or tone of the story"
          },
          "length": {
            "type": "string",
            "enum": ["short", "medium", "long"],
            "description": "Desired length of the story"
          },
          "characters": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Characters to include in the story"
          },
          "themes": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Educational or moral themes to incorporate"
          }
        },
        "required": ["prompt"]
      }
    },
    {
      "name": "synthesize_audio",
      "description": "Convert story text to child-friendly audio",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "Text content to synthesize"
          },
          "voiceId": {
            "type": "string",
            "description": "Voice ID for synthesis"
          },
          "speed": {
            "type": "number",
            "minimum": 0.5,
            "maximum": 2.0,
            "description": "Playback speed multiplier"
          },
          "includeTimestamps": {
            "type": "boolean",
            "description": "Include word-level timestamps"
          }
        },
        "required": ["text"]
      }
    },
    {
      "name": "validate_content_safety",
      "description": "Validate content for child safety and appropriateness",
      "inputSchema": {
        "type": "object",
        "properties": {
          "content": {
            "type": "string",
            "description": "Content to validate"
          },
          "ageRange": {
            "type": "string",
            "description": "Target age range"
          },
          "safetyLevel": {
            "type": "string",
            "enum": ["strict", "moderate", "permissive"],
            "description": "Safety validation level"
          }
        },
        "required": ["content"]
      }
    }
  ]
}
```

### **MCP Tool Implementation**
```javascript
// MCP Tool Handler
class StorytalorMCPServer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging';
  }
  
  async handleToolCall(toolName, parameters) {
    switch (toolName) {
      case 'generate_story':
        return await this.generateStory(parameters);
      case 'synthesize_audio':
        return await this.synthesizeAudio(parameters);
      case 'validate_content_safety':
        return await this.validateContentSafety(parameters);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
  
  async generateStory(params) {
    const response = await fetch(`${this.baseUrl}/v1/stories/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`Story generation failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      story: result.story,
      metadata: result.aiMetadata
    };
  }
  
  async synthesizeAudio(params) {
    const response = await fetch(`${this.baseUrl}/v1/audio/synthesize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`Audio synthesis failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      timestamps: result.timestamps
    };
  }
  
  async validateContentSafety(params) {
    const response = await fetch(`${this.baseUrl}/v1/safety/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`Content validation failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      approved: result.approved,
      safetyScore: result.score,
      issues: result.issues || []
    };
  }
}
```

---

## 🔄 **Load Balancing & Failover**

### **Agent Pool Management**
```json
{
  "agentPools": {
    "story-generation": {
      "agents": [
        {
          "agentId": "story-agent-001",
          "priority": 100,
          "weight": 50,
          "status": "active"
        },
        {
          "agentId": "story-agent-002",
          "priority": 90,
          "weight": 30,
          "status": "active"
        }
      ],
      "loadBalancing": "weighted-round-robin",
      "healthCheck": {
        "interval": 30000,
        "timeout": 5000,
        "retries": 3
      }
    }
  }
}
```

### **Failover Configuration**
```javascript
const failoverConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringPeriod: 300000
  }
};

async function executeWithFailover(message, agentPool) {
  let lastError;
  
  for (const agent of agentPool.agents) {
    try {
      const response = await sendMessageToAgent(message, agent);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`Agent ${agent.agentId} failed:`, error.message);
      
      // Mark agent as unhealthy if needed
      if (error.code === 'AGENT_UNAVAILABLE') {
        markAgentUnhealthy(agent.agentId);
      }
    }
  }
  
  throw new Error(`All agents failed. Last error: ${lastError.message}`);
}
```

---

## 📈 **Monitoring & Analytics**

### **Health Monitoring**
```javascript
// Health check endpoint for agents
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    agent: {
      id: 'your-agent-id',
      version: '1.0.0',
      uptime: process.uptime()
    },
    capabilities: {
      'story-generation': {
        status: 'operational',
        responseTime: 2.5,
        successRate: 0.98
      },
      'content-safety': {
        status: 'operational',
        responseTime: 0.8,
        successRate: 0.99
      }
    },
    resources: {
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      },
      cpu: process.cpuUsage()
    }
  };
  
  res.json(health);
});
```

### **Metrics Collection**
```javascript
const metrics = {
  messagesProcessed: 0,
  averageResponseTime: 0,
  errorRate: 0,
  lastError: null
};

function updateMetrics(processingTime, success) {
  metrics.messagesProcessed++;
  
  // Update average response time
  metrics.averageResponseTime = 
    (metrics.averageResponseTime * (metrics.messagesProcessed - 1) + processingTime) / 
    metrics.messagesProcessed;
  
  // Update error rate
  if (!success) {
    metrics.errorRate = 
      (metrics.errorRate * (metrics.messagesProcessed - 1) + 1) / 
      metrics.messagesProcessed;
  }
}
```

---

## 🧪 **Testing & Validation**

### **Integration Tests**
```javascript
const { StorytalorAgent } = require('./storytailor-agent');

describe('Storytailor Multi-Agent Integration', () => {
  let agent;
  
  beforeEach(() => {
    agent = new StorytalorAgent({
      agentId: 'test-agent',
      apiKey: process.env.TEST_API_KEY
    });
  });
  
  test('should register successfully', async () => {
    const result = await agent.register();
    expect(result.success).toBe(true);
    expect(result.agentId).toBe('test-agent');
  });
  
  test('should handle story generation request', async () => {
    const request = {
      messageType: 'story-generation-request',
      payload: {
        prompt: 'A brave little mouse',
        context: {
          ageRange: '6-8',
          mood: 'adventurous'
        }
      }
    };
    
    const response = await agent.handleMessage(request);
    
    expect(response.status).toBe('success');
    expect(response.payload.story).toBeDefined();
    expect(response.payload.story.title).toBeTruthy();
    expect(response.payload.story.content).toBeTruthy();
  });
  
  test('should handle content safety validation', async () => {
    const request = {
      messageType: 'content-safety-request',
      payload: {
        content: 'A happy story about friendship',
        ageRange: '6-8'
      }
    };
    
    const response = await agent.handleMessage(request);
    
    expect(response.status).toBe('success');
    expect(response.payload.approved).toBe(true);
    expect(response.payload.safetyScore).toBeGreaterThan(0.8);
  });
});
```

---

## 📞 **Support & Resources**

### **Developer Support**
- **Technical Documentation**: https://docs.storytailor.com/multi-agent
- **API Reference**: https://api.storytailor.com/docs
- **Discord Community**: https://discord.gg/storytailor-developers
- **Email Support**: multi-agent-support@storytailor.com

### **Integration Resources**
- **SDK Downloads**: https://github.com/storytailor/multi-agent-sdk
- **Example Implementations**: https://github.com/storytailor/agent-examples
- **Testing Tools**: https://tools.storytailor.com/agent-tester
- **Status Page**: https://status.storytailor.com

### **Certification Program**
- **Agent Certification**: https://certification.storytailor.com
- **Best Practices Guide**: https://docs.storytailor.com/best-practices
- **Performance Benchmarks**: https://benchmarks.storytailor.com

---

## 🎯 **Success Metrics**

### **Integration KPIs**
- **Connection Success Rate**: >99.5%
- **Message Processing Time**: <2 seconds P95
- **Agent Availability**: >99.9%
- **Error Rate**: <0.1%

### **Quality Metrics**
- **Story Generation Quality**: >4.5/5 rating
- **Content Safety Accuracy**: >99%
- **User Satisfaction**: >4.7/5 rating
- **Agent Response Consistency**: >95%

---

**🌟 Ready to join the Storytailor Multi-Agent Ecosystem?**

*This protocol enables seamless integration with AI platforms, ensuring high-quality, safe, and engaging storytelling experiences for children worldwide.*