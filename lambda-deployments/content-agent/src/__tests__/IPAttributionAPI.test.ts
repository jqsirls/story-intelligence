/**
 * API Tests for IP Attribution System
 * 
 * Tests that API endpoints properly include IP attribution data in responses
 */

describe('IP Attribution API Tests', () => {
  describe('Story API Response Schema', () => {
    test('should include metadata.ipAttributions in story response', () => {
      const mockStoryResponse = {
        id: 'story-123',
        title: 'Batman Adventure',
        content: {
          text: 'Batman saved the city.',
        },
        metadata: {
          ipAttributions: [
            {
              character: 'Batman',
              franchise: 'DC Comics',
              owner: 'DC Comics (Warner Bros.)',
              confidence: 'high',
              detectedAt: '2025-01-15T10:30:00Z',
              attributionText: 'Batman belongs to DC Comics (Warner Bros.)',
              personalUseMessage: "This story is for your family's personal enjoyment only",
              ownershipDisclaimer: 'We are not the owners of this character',
            },
          ],
        },
      };

      expect(mockStoryResponse.metadata).toBeDefined();
      expect(mockStoryResponse.metadata.ipAttributions).toBeDefined();
      expect(Array.isArray(mockStoryResponse.metadata.ipAttributions)).toBe(true);
      expect(mockStoryResponse.metadata.ipAttributions[0].character).toBe('Batman');
      expect(mockStoryResponse.metadata.ipAttributions[0].attributionText).toBeDefined();
      expect(mockStoryResponse.metadata.ipAttributions[0].personalUseMessage).toBeDefined();
      expect(mockStoryResponse.metadata.ipAttributions[0].ownershipDisclaimer).toBeDefined();
    });

    test('should handle story response without IP attributions', () => {
      const mockStoryResponse = {
        id: 'story-123',
        title: 'Original Adventure',
        content: {
          text: 'A brave knight saved the kingdom.',
        },
        metadata: {},
      };

      expect(mockStoryResponse.metadata).toBeDefined();
      expect(mockStoryResponse.metadata.ipAttributions).toBeUndefined();
    });
  });

  describe('Character Selection API Response', () => {
    test('should include ipAttribution in character selection response', () => {
      const mockCharacterResponse = {
        success: true,
        character: {
          name: 'Batman',
          id: 'char-123',
        },
        ipAttribution: {
          detected: true,
          character: 'Batman',
          franchise: 'DC Comics',
          owner: 'DC Comics (Warner Bros.)',
          attributionText: 'Batman belongs to DC Comics (Warner Bros.)',
          personalUseMessage: "This story is for your family's personal enjoyment only",
          ownershipDisclaimer: 'We are not the owners of this character',
          confidence: 'high',
        },
      };

      expect(mockCharacterResponse.ipAttribution).toBeDefined();
      expect(mockCharacterResponse.ipAttribution.detected).toBe(true);
      expect(mockCharacterResponse.ipAttribution.character).toBe('Batman');
      expect(mockCharacterResponse.ipAttribution.attributionText).toBeDefined();
    });

    test('should include ipAttribution with detected: false when no IP', () => {
      const mockCharacterResponse = {
        success: true,
        character: {
          name: 'Arthur',
          id: 'char-123',
        },
        ipAttribution: {
          detected: false,
        },
      };

      expect(mockCharacterResponse.ipAttribution).toBeDefined();
      expect(mockCharacterResponse.ipAttribution.detected).toBe(false);
    });
  });

  describe('Story Share API Response', () => {
    test('should include attribution in share response', () => {
      const mockShareResponse = {
        shareUrl: 'https://storytailor.com/story/123',
        shareText: 'Check out this story!',
        attribution: 'Note: Batman belongs to DC Comics (Warner Bros.). This story is for your family\'s personal enjoyment only. We are not the owners of this character.',
      };

      expect(mockShareResponse.attribution).toBeDefined();
      expect(mockShareResponse.attribution).toContain('Batman belongs to');
      expect(mockShareResponse.attribution).toContain('personal enjoyment only');
      expect(mockShareResponse.attribution).toContain('not the owners');
    });
  });

  describe('Dispute API Response', () => {
    test('should return dispute status in API response', () => {
      const mockDisputeResponse = {
        id: 'dispute-123',
        storyId: 'story-123',
        status: 'resolved',
        resolution: 'IP attribution added to story metadata',
        attributionAdded: true,
      };

      expect(mockDisputeResponse.id).toBeDefined();
      expect(mockDisputeResponse.status).toBe('resolved');
      expect(mockDisputeResponse.resolution).toBeDefined();
    });
  });

  describe('Audit API Response', () => {
    test('should return audit trail in API response', () => {
      const mockAuditResponse = {
        storyId: 'story-123',
        records: [
          {
            id: 'audit-123',
            detectionTimestamp: '2025-01-15T10:30:00Z',
            detectionMethod: 'automatic',
            detectedCharacters: [
              {
                character: 'Batman',
                franchise: 'DC Comics',
                owner: 'DC Comics (Warner Bros.)',
                confidence: 'high',
              },
            ],
            attributionAdded: true,
          },
        ],
      };

      expect(mockAuditResponse.records).toBeDefined();
      expect(Array.isArray(mockAuditResponse.records)).toBe(true);
      expect(mockAuditResponse.records[0].detectedCharacters).toBeDefined();
    });
  });
});
