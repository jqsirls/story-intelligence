// Jest setup file for storytailor-agent package

// Mock Alexa SDK
jest.mock('ask-sdk-core', () => ({
  SkillBuilders: {
    custom: jest.fn(() => ({
      addRequestHandlers: jest.fn().mockReturnThis(),
      addErrorHandlers: jest.fn().mockReturnThis(),
      withApiClient: jest.fn().mockReturnThis(),
      create: jest.fn(() => ({
        invoke: jest.fn().mockResolvedValue({
          response: {
            outputSpeech: { type: 'PlainText', text: 'Test response' },
            shouldEndSession: false
          }
        })
      }))
    }))
  },
  getRequestType: jest.fn(),
  getIntentName: jest.fn(),
  getSlotValue: jest.fn()
}));

// Mock ElevenLabs
jest.mock('elevenlabs-node', () => ({
  ElevenLabsAPI: jest.fn().mockImplementation(() => ({
    textToSpeech: jest.fn().mockResolvedValue({
      audio: Buffer.from('mock-audio-data')
    }),
    getVoices: jest.fn().mockResolvedValue([
      { voice_id: 'voice-1', name: 'Test Voice' }
    ])
  }))
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1)
  }))
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn()
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key';
process.env.REDIS_URL = 'redis://localhost:6379';