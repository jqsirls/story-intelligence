// Jest setup file for performance optimization tests

// Mock Redis to avoid requiring actual Redis connection in tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ttl: jest.fn().mockResolvedValue(-1),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined)
  }));
});

// Mock AWS SDK to avoid requiring actual AWS credentials
jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    getObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Body: Buffer.from('{}') })
    }),
    putObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  }))
}));

// Increase timeout for async tests
jest.setTimeout(10000);