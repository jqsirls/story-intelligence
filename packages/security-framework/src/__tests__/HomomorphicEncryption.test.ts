import { HomomorphicEncryptionService } from '../privacy/HomomorphicEncryption';

describe('HomomorphicEncryptionService', () => {
  let service: HomomorphicEncryptionService;
  let keyId: string;

  beforeEach(() => {
    service = new HomomorphicEncryptionService(64); // Much smaller key size for tests
    keyId = service.generateKeyPair();
  });

  describe('generateKeyPair', () => {
    it('should generate a key pair successfully', () => {
      const newKeyId = service.generateKeyPair();

      expect(newKeyId).toBeTruthy();
      expect(typeof newKeyId).toBe('string');
      
      const publicKey = service.getPublicKey(newKeyId);
      expect(publicKey).toBeDefined();
      expect(publicKey?.n).toBeDefined();
      expect(publicKey?.g).toBeDefined();
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a positive number', () => {
      const originalValue = 42;
      
      const encrypted = service.encrypt(originalValue, keyId);
      const decrypted = service.decrypt(encrypted);

      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.keyId).toBe(keyId);
      expect(decrypted).toBe(originalValue);
    });

    it('should encrypt and decrypt zero', () => {
      const originalValue = 0;
      
      const encrypted = service.encrypt(originalValue, keyId);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(originalValue);
    });

    it('should produce different ciphertexts for same value', () => {
      const value = 100;
      
      const encrypted1 = service.encrypt(value, keyId);
      const encrypted2 = service.encrypt(value, keyId);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      
      const decrypted1 = service.decrypt(encrypted1);
      const decrypted2 = service.decrypt(encrypted2);
      
      expect(decrypted1).toBe(value);
      expect(decrypted2).toBe(value);
    });
  });

  describe('homomorphic operations', () => {
    it('should perform homomorphic addition', () => {
      const value1 = 10;
      const value2 = 20;
      
      const encrypted1 = service.encrypt(value1, keyId);
      const encrypted2 = service.encrypt(value2, keyId);
      
      const encryptedSum = service.add(encrypted1, encrypted2);
      const decryptedSum = service.decrypt(encryptedSum);

      expect(decryptedSum).toBe(value1 + value2);
    });

    it('should perform homomorphic subtraction', () => {
      const value1 = 30;
      const value2 = 10;
      
      const encrypted1 = service.encrypt(value1, keyId);
      const encrypted2 = service.encrypt(value2, keyId);
      
      const encryptedDiff = service.subtract(encrypted1, encrypted2);
      const decryptedDiff = service.decrypt(encryptedDiff);

      expect(decryptedDiff).toBe(value1 - value2);
    });

    it('should perform homomorphic multiplication by constant', () => {
      const value = 15;
      const constant = 3;
      
      const encrypted = service.encrypt(value, keyId);
      const encryptedProduct = service.multiplyByConstant(encrypted, constant);
      const decryptedProduct = service.decrypt(encryptedProduct);

      expect(decryptedProduct).toBe(value * constant);
    });

    it('should compute homomorphic sum of multiple values', () => {
      const values = [5, 10, 15, 20];
      const expectedSum = values.reduce((a, b) => a + b, 0);
      
      const encryptedValues = values.map(v => service.encrypt(v, keyId));
      const encryptedSum = service.sum(encryptedValues);
      const decryptedSum = service.decrypt(encryptedSum);

      expect(decryptedSum).toBe(expectedSum);
    });

    it('should compute homomorphic average (sum for division outside)', () => {
      const values = [10, 20, 30, 40];
      const expectedSum = values.reduce((a, b) => a + b, 0);
      
      const encryptedValues = values.map(v => service.encrypt(v, keyId));
      const encryptedAverage = service.average(encryptedValues);
      const decryptedSum = service.decrypt(encryptedAverage);

      // Since we return sum for external division, check the sum
      expect(decryptedSum).toBe(expectedSum);
      expect(encryptedAverage.metadata?.operation).toBe('average');
      expect(encryptedAverage.metadata?.count).toBe(4);
    });
  });

  describe('batch operations', () => {
    it('should perform batch addition', async () => {
      const value1 = 25;
      const value2 = 35;
      
      const encrypted1 = service.encrypt(value1, keyId);
      const encrypted2 = service.encrypt(value2, keyId);
      
      const operationId = await service.batchOperation('add', [encrypted1, encrypted2]);
      
      // Wait a bit for async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const operation = service.getOperationResult(operationId);
      
      expect(operation).toBeDefined();
      expect(operation?.status).toBe('completed');
      expect(operation?.result).toBeDefined();
      
      if (operation?.result) {
        const decryptedResult = service.decrypt(operation.result);
        expect(decryptedResult).toBe(value1 + value2);
      }
    });

    it('should perform batch multiplication', async () => {
      const value = 12;
      const constant = 4;
      
      const encrypted = service.encrypt(value, keyId);
      
      const operationId = await service.batchOperation('multiply', [encrypted], { constant });
      
      // Wait a bit for async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const operation = service.getOperationResult(operationId);
      
      expect(operation).toBeDefined();
      expect(operation?.status).toBe('completed');
      
      if (operation?.result) {
        const decryptedResult = service.decrypt(operation.result);
        expect(decryptedResult).toBe(value * constant);
      }
    });
  });

  describe('processSensitiveAnalytics', () => {
    it('should process analytics data homomorphically', async () => {
      const data = [10, 20, 30, 40, 50];
      const operations = ['sum', 'average', 'count'];
      
      const result = await service.processSensitiveAnalytics(data, operations);

      expect(result).toBeDefined();
      expect(result.encryptedResults).toBeDefined();
      expect(result.plaintextResults).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);

      expect(result.plaintextResults.sum).toBe(150);
      expect(result.plaintextResults.average).toBe(30);
      expect(result.plaintextResults.count).toBe(5);

      // Verify encrypted results can be decrypted to same values
      if (result.encryptedResults.sum) {
        const decryptedSum = service.decrypt(result.encryptedResults.sum);
        expect(decryptedSum).toBe(150);
      }
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid key ID', () => {
      expect(() => {
        service.encrypt(42, 'invalid_key_id');
      }).toThrow('Key pair not found');
    });

    it('should throw error when adding values with different keys', () => {
      const keyId2 = service.generateKeyPair();
      
      const encrypted1 = service.encrypt(10, keyId);
      const encrypted2 = service.encrypt(20, keyId2);

      expect(() => {
        service.add(encrypted1, encrypted2);
      }).toThrow('Cannot add values encrypted with different keys');
    });

    it('should throw error for empty sum', () => {
      expect(() => {
        service.sum([]);
      }).toThrow('Cannot compute sum of empty array');
    });
  });

  describe('getStatistics', () => {
    it('should return encryption statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.keyPairsGenerated).toBeGreaterThan(0);
      expect(stats.operationsPerformed).toBeGreaterThanOrEqual(0);
      expect(stats.averageKeySize).toBeGreaterThan(0);
    });
  });
});