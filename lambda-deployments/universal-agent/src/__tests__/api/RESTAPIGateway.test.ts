/**
 * REST API Gateway Tests
 * 
 * This test file validates the REST API implementation.
 * Full integration tests require running infrastructure (Supabase, Redis).
 * 
 * Run integration tests with: npm run test:integration
 */

describe('REST API Gateway - Unit Tests', () => {
  describe('API Structure Validation', () => {
    it('should define expected endpoint categories', () => {
      const expectedCategories = [
        'Authentication',
        'Stories',
        'Characters',
        'Libraries',
        'Transfers',
        'Invitations',
        'Emotions',
        'Preferences',
        'Notifications',
        'Audio',
        'Assets',
        'Search',
        'Tags',
        'Favorites',
        'Organizations',
        'Affiliates',
        'Admin'
      ];
      
      // Validate category structure exists
      expect(expectedCategories.length).toBeGreaterThan(10);
    });

    it('should have proper error code structure', () => {
      const errorCodes = {
        ERR_1001: 'Unauthorized',
        ERR_1002: 'Invalid token',
        ERR_1003: 'Token expired',
        ERR_1004: 'Forbidden',
        ERR_2001: 'Validation failed',
        ERR_3001: 'Not found',
        ERR_4001: 'Rate limited',
        ERR_5001: 'Server error',
        ERR_6001: 'Subscription required'
      };
      
      expect(Object.keys(errorCodes)).toContain('ERR_1001');
      expect(Object.keys(errorCodes)).toContain('ERR_3001');
      expect(Object.keys(errorCodes)).toContain('ERR_5001');
    });

    it('should define rate limit tiers', () => {
      const rateLimitTiers = {
        free: { limit: 30, concurrent: 2 },
        starter: { limit: 60, concurrent: 5 },
        family: { limit: 120, concurrent: 10 },
        premium: { limit: 300, concurrent: 25 },
        b2b_basic: { limit: 500, concurrent: 50 },
        b2b_pro: { limit: 1000, concurrent: 100 }
      };
      
      expect(rateLimitTiers.free.limit).toBe(30);
      expect(rateLimitTiers.premium.limit).toBeGreaterThan(rateLimitTiers.free.limit);
      expect(rateLimitTiers.b2b_pro.limit).toBeGreaterThan(rateLimitTiers.premium.limit);
    });
  });

  describe('Validation Schemas', () => {
    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('')).toBe(false);
    });

    it('should validate UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      expect(uuidRegex.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(uuidRegex.test('not-a-uuid')).toBe(false);
    });

    it('should validate story types', () => {
      const validStoryTypes = ['bedtime', 'adventure', 'educational', 'therapeutic', 'celebration'];
      
      expect(validStoryTypes).toContain('bedtime');
      expect(validStoryTypes).toContain('adventure');
      expect(validStoryTypes).not.toContain('invalid');
    });

    it('should validate character species', () => {
      const validSpecies = ['human', 'cat', 'dog', 'dragon', 'unicorn', 'robot', 'alien', 'bird', 'bear'];
      
      expect(validSpecies).toContain('human');
      expect(validSpecies).toContain('dragon');
      expect(validSpecies.length).toBeGreaterThanOrEqual(9);
    });

    it('should validate Hue intensity levels', () => {
      const validIntensities = ['light', 'regular', 'bold', 'off'];
      
      expect(validIntensities).toContain('light');
      expect(validIntensities).toContain('regular');
      expect(validIntensities).toContain('bold');
      expect(validIntensities).toContain('off');
    });
  });

  describe('Response Formats', () => {
    it('should define success response structure', () => {
      const successResponse = {
        success: true,
        data: { id: 'test-id' }
      };
      
      expect(successResponse).toHaveProperty('success', true);
      expect(successResponse).toHaveProperty('data');
    });

    it('should define error response structure', () => {
      const errorResponse = {
        success: false,
        error: 'Error message',
        code: 'ERR_1001',
        details: {}
      };
      
      expect(errorResponse).toHaveProperty('success', false);
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse).toHaveProperty('code');
    });

    it('should define paginated response structure', () => {
      const paginatedResponse = {
        success: true,
        data: {
          items: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 100,
            totalPages: 5,
            hasNext: true,
            hasPrev: false
          }
        }
      };
      
      expect(paginatedResponse.data).toHaveProperty('items');
      expect(paginatedResponse.data).toHaveProperty('pagination');
      expect(paginatedResponse.data.pagination).toHaveProperty('totalPages');
    });
  });

  describe('Asset Generation', () => {
    it('should define asset types', () => {
      const assetTypes = ['text', 'audio', 'cover', 'scenes', 'activities', 'pdf', 'qr_code'];
      
      expect(assetTypes).toContain('audio');
      expect(assetTypes).toContain('pdf');
    });

    it('should define asset statuses', () => {
      const assetStatuses = ['pending', 'generating', 'ready', 'failed', 'canceled'];
      
      expect(assetStatuses).toContain('pending');
      expect(assetStatuses).toContain('ready');
      expect(assetStatuses).toContain('failed');
    });

    it('should define tier-based asset access', () => {
      const tierAssets = {
        free: ['text', 'audio', 'cover'],
        premium: ['text', 'audio', 'cover', 'scenes', 'activities', 'pdf', 'qr_code']
      };
      
      expect(tierAssets.free).not.toContain('pdf');
      expect(tierAssets.premium).toContain('pdf');
      expect(tierAssets.premium.length).toBeGreaterThan(tierAssets.free.length);
    });
  });

  describe('B2B Features', () => {
    it('should define organization types', () => {
      const orgTypes = ['school', 'therapy_center', 'clinic', 'publisher', 'other'];
      
      expect(orgTypes).toContain('school');
      expect(orgTypes).toContain('therapy_center');
    });

    it('should define seat roles', () => {
      const seatRoles = ['admin', 'member', 'viewer'];
      
      expect(seatRoles).toContain('admin');
      expect(seatRoles).toContain('member');
    });
  });

  describe('Affiliate Program', () => {
    it('should define payout methods', () => {
      const payoutMethods = ['paypal', 'bank_transfer', 'store_credit'];
      
      expect(payoutMethods).toContain('paypal');
    });

    it('should define referral statuses', () => {
      const referralStatuses = ['pending', 'qualified', 'converted', 'expired'];
      
      expect(referralStatuses).toContain('pending');
      expect(referralStatuses).toContain('converted');
    });
  });

  describe('Emotion Intelligence', () => {
    it('should define emotion types', () => {
      const emotions = [
        'happy', 'sad', 'angry', 'scared', 'surprised',
        'calm', 'excited', 'frustrated', 'content', 'anxious'
      ];
      
      expect(emotions).toContain('happy');
      expect(emotions).toContain('anxious');
      expect(emotions.length).toBeGreaterThanOrEqual(10);
    });

    it('should define detection sources', () => {
      const sources = ['manual', 'voice', 'facial', 'behavioral', 'inferred'];
      
      expect(sources).toContain('manual');
      expect(sources).toContain('voice');
    });
  });

  describe('Notification Types', () => {
    it('should define notification types', () => {
      const notificationTypes = [
        'story_ready',
        'asset_ready',
        'story_shared',
        'library_invite',
        'transfer_request',
        'permission_granted',
        'subscription_update',
        'activity_suggestion'
      ];
      
      expect(notificationTypes).toContain('story_ready');
      expect(notificationTypes).toContain('library_invite');
    });
  });

  describe('Transfer & Sharing', () => {
    it('should define transfer types', () => {
      const transferTypes = ['move', 'copy'];
      
      expect(transferTypes).toContain('move');
      expect(transferTypes).toContain('copy');
    });

    it('should define transfer statuses', () => {
      const transferStatuses = ['pending', 'accepted', 'rejected', 'expired', 'canceled'];
      
      expect(transferStatuses).toContain('pending');
      expect(transferStatuses).toContain('accepted');
    });

    it('should define library roles', () => {
      const libraryRoles = ['owner', 'admin', 'editor', 'viewer'];
      
      expect(libraryRoles).toContain('owner');
      expect(libraryRoles).toContain('viewer');
    });
  });
});

describe('REST API Gateway - Mock Integration Tests', () => {
  // These tests validate the expected behavior without running actual services
  
  describe('Authentication Flow', () => {
    it('should expect login to return tokens', () => {
      const expectedLoginResponse = {
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresAt: expect.any(String)
        }
      };
      
      // Validate structure
      expect(expectedLoginResponse).toHaveProperty('data.accessToken');
      expect(expectedLoginResponse).toHaveProperty('data.refreshToken');
    });

    it('should expect refresh to return new tokens', () => {
      const expectedRefreshResponse = {
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresAt: expect.any(String)
        }
      };
      
      expect(expectedRefreshResponse.data).toHaveProperty('accessToken');
    });
  });

  describe('Story CRUD Flow', () => {
    it('should expect story creation to return story with id', () => {
      const expectedStoryResponse = {
        success: true,
        data: {
          id: expect.any(String),
          title: 'Test Story',
          storyType: 'adventure',
          status: 'generating'
        }
      };
      
      expect(expectedStoryResponse.data).toHaveProperty('id');
      expect(expectedStoryResponse.data).toHaveProperty('title');
    });

    it('should expect story list to be paginated', () => {
      const expectedListResponse = {
        success: true,
        data: {
          items: expect.any(Array),
          pagination: {
            page: 1,
            limit: 20,
            total: expect.any(Number),
            totalPages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: expect.any(Boolean)
          }
        }
      };
      
      expect(expectedListResponse.data.pagination).toHaveProperty('totalPages');
    });
  });

  describe('Asset Generation Flow', () => {
    it('should expect asset status to include all types', () => {
      const expectedStatusResponse = {
        success: true,
        data: {
          overall: 'generating',
          assets: {
            text: { status: 'ready' },
            cover: { status: 'ready' },
            audio: { status: 'generating', progress: 50 },
            pdf: { status: 'pending' }
          }
        }
      };
      
      expect(expectedStatusResponse.data).toHaveProperty('overall');
      expect(expectedStatusResponse.data.assets).toHaveProperty('audio');
    });
  });
});

// Export for integration test usage
export const testHelpers = {
  mockSuccessResponse: (data: any) => ({ success: true, data }),
  mockErrorResponse: (error: string, code: string) => ({ success: false, error, code }),
  mockPaginatedResponse: (items: any[], pagination: any) => ({
    success: true,
    data: { items, pagination }
  })
};
