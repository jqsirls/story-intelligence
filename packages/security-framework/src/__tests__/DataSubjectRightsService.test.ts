import { DataSubjectRightsService, DataProvider } from '../privacy/DataSubjectRightsService';

describe('DataSubjectRightsService', () => {
  let service: DataSubjectRightsService;
  let mockDataProvider: DataProvider;

  beforeEach(() => {
    service = new DataSubjectRightsService();
    
    mockDataProvider = {
      getUserData: jest.fn().mockResolvedValue({
        data: { name: 'John Doe', email: 'john@example.com' },
        purposes: ['story_creation'],
        categories: ['personal_data'],
        recipients: ['internal'],
        retentionPeriod: 365,
        automatedDecisions: [],
        thirdCountryTransfers: []
      }),
      deleteUserData: jest.fn().mockResolvedValue({
        deletedTypes: ['personal_data'],
        retentionExceptions: []
      }),
      rectifyUserData: jest.fn().mockResolvedValue({ success: true }),
      restrictProcessing: jest.fn().mockResolvedValue({ success: true }),
      processObjection: jest.fn().mockResolvedValue({ success: true })
    };

    service.registerDataProvider('test_provider', mockDataProvider);
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('submitRequest', () => {
    it('should submit access request successfully', async () => {
      const request = await service.submitRequest('user123', 'access');

      expect(request).toBeDefined();
      expect(request.userId).toBe('user123');
      expect(request.requestType).toBe('access');
      expect(request.status).toBe('pending');
      expect(request.requestId).toBeTruthy();
    });

    it('should submit portability request successfully', async () => {
      const request = await service.submitRequest('user123', 'portability', { format: 'json' });

      expect(request).toBeDefined();
      expect(request.requestType).toBe('portability');
      expect(request.metadata.format).toBe('json');
    });

    it('should submit erasure request successfully', async () => {
      const request = await service.submitRequest('user123', 'erasure');

      expect(request).toBeDefined();
      expect(request.requestType).toBe('erasure');
    });
  });

  describe('exportUserData', () => {
    it('should export user data in JSON format', async () => {
      const result = await service.exportUserData('user123', 'json');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.format).toBe('json');
      expect(result.data).toBeTruthy();
      expect(result.checksum).toBeTruthy();
      expect(result.downloadUrl).toBeTruthy();
    });

    it('should export user data in XML format', async () => {
      const result = await service.exportUserData('user123', 'xml');

      expect(result).toBeDefined();
      expect(result.format).toBe('xml');
      expect(result.data).toContain('<?xml version="1.0"');
    });

    it('should export user data in CSV format', async () => {
      const result = await service.exportUserData('user123', 'csv');

      expect(result).toBeDefined();
      expect(result.format).toBe('csv');
      expect(result.data).toContain(',');
    });
  });

  describe('deleteUserData', () => {
    it('should delete user data successfully', async () => {
      const result = await service.deleteUserData('user123');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.deletedDataTypes).toContain('personal_data');
      expect(result.verificationHash).toBeTruthy();
      expect(mockDataProvider.deleteUserData).toHaveBeenCalledWith('user123', undefined);
    });

    it('should delete specific data types', async () => {
      const dataTypes = ['personal_data', 'usage_data'];
      const result = await service.deleteUserData('user123', dataTypes);

      expect(result).toBeDefined();
      expect(mockDataProvider.deleteUserData).toHaveBeenCalledWith('user123', dataTypes);
    });
  });

  describe('getRequestStatus', () => {
    it('should return request status', async () => {
      const request = await service.submitRequest('user123', 'access');
      const status = service.getRequestStatus(request.requestId);

      expect(status).toBeDefined();
      expect(status?.requestId).toBe(request.requestId);
    });

    it('should return undefined for non-existent request', () => {
      const status = service.getRequestStatus('non-existent');

      expect(status).toBeUndefined();
    });
  });

  describe('getUserRequests', () => {
    it('should return all requests for a user', async () => {
      await service.submitRequest('user123', 'access');
      await service.submitRequest('user123', 'portability');
      
      const requests = service.getUserRequests('user123');

      expect(requests).toHaveLength(2);
      expect(requests[0].userId).toBe('user123');
      expect(requests[1].userId).toBe('user123');
    });

    it('should return empty array for user with no requests', () => {
      const requests = service.getUserRequests('user456');

      expect(requests).toHaveLength(0);
    });
  });
});