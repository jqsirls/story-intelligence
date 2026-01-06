// Global test setup
process.env.NODE_ENV = 'test';

// Mock external dependencies that may not be installed
jest.mock('web3', () => ({
  default: jest.fn(),
  Web3: jest.fn()
}), { virtual: true });

jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn(),
    Contract: jest.fn(),
    keccak256: jest.fn(),
    toUtf8Bytes: jest.fn(),
    verifyMessage: jest.fn()
  }
}), { virtual: true });

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    lpush: jest.fn(),
    expire: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    pipeline: jest.fn(() => ({
      lpush: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    })),
    quit: jest.fn()
  }));
}, { virtual: true });