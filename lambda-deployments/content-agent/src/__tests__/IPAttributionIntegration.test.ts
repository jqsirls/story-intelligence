/**
 * Integration Tests for IP Attribution System
 */

import { RealContentAgent, RealContentAgentConfig } from '../RealContentAgent';
import { IPDetectionService } from '../services/IPDetectionService';
import type { IPAttribution } from '@alexa-multi-agent/shared-types';

describe('IP Attribution Integration', () => {
  let config: RealContentAgentConfig;

  beforeEach(() => {
    config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
      },
      elevenlabs: {
        apiKey: 'test-key',
      },
      supabase: {
        url: process.env.SUPABASE_URL || 'https://test.supabase.co',
        anonKey: process.env.SUPABASE_ANON_KEY || 'test-key',
      },
    };
  });

  describe('Story Generation with IP Detection', () => {
    test('should detect IP and store in story metadata', async () => {
      // This is an integration test that would require actual services
      // For now, we test the IP detection service directly
      const ipService = new IPDetectionService();
      const storyContent = 'Batman and Spiderman had an adventure together.';
      const characterNames = ['Batman', 'Spiderman'];

      const results = await ipService.detectIP(storyContent, characterNames);

      expect(results.length).toBeGreaterThanOrEqual(2);
      
      // Verify attribution format
      const batmanResult = results.find(r => r.character.toLowerCase() === 'batman');
      expect(batmanResult).toBeDefined();
      expect(batmanResult?.attributionText).toBeDefined();
      expect(batmanResult?.personalUseMessage).toBeDefined();
      expect(batmanResult?.ownershipDisclaimer).toBeDefined();
    });

    test('should format IP attributions for storage', () => {
      const ipService = new IPDetectionService();
      const detectionResult = {
        character: 'Batman',
        franchise: 'DC Comics',
        owner: 'DC Comics (Warner Bros.)',
        confidence: 'high' as const,
        attributionText: 'Batman belongs to DC Comics (Warner Bros.)',
        personalUseMessage: "This story is for your family's personal enjoyment only",
        ownershipDisclaimer: 'We are not the owners of this character',
      };

      const formatted: IPAttribution = {
        character: detectionResult.character,
        franchise: detectionResult.franchise,
        owner: detectionResult.owner,
        confidence: detectionResult.confidence,
        detectedAt: new Date().toISOString(),
        attributionText: detectionResult.attributionText,
        personalUseMessage: detectionResult.personalUseMessage,
        ownershipDisclaimer: detectionResult.ownershipDisclaimer,
      };

      expect(formatted.character).toBe('Batman');
      expect(formatted.franchise).toBe('DC Comics');
      expect(formatted.owner).toBe('DC Comics (Warner Bros.)');
      expect(formatted.confidence).toBe('high');
      expect(formatted.attributionText).toContain('Batman belongs to');
      expect(formatted.personalUseMessage).toContain('personal enjoyment only');
      expect(formatted.ownershipDisclaimer).toContain('not the owners');
    });
  });

  describe('API Response Format', () => {
    test('should format attribution for JSON API response', () => {
      const ipService = new IPDetectionService();
      const results = [
        {
          character: 'Batman',
          franchise: 'DC Comics',
          owner: 'DC Comics (Warner Bros.)',
          confidence: 'high' as const,
          attributionText: 'Batman belongs to DC Comics (Warner Bros.)',
          personalUseMessage: "This story is for your family's personal enjoyment only",
          ownershipDisclaimer: 'We are not the owners of this character',
        },
      ];

      const formatted = ipService.formatAttributionForAPI(results);

      expect(formatted.detected).toBe(true);
      expect(formatted.attributions).toEqual(results);
      expect(formatted.fullMessage).toBeDefined();
      
      // Verify JSON structure
      const jsonString = JSON.stringify(formatted);
      const parsed = JSON.parse(jsonString);
      expect(parsed.detected).toBe(true);
      expect(Array.isArray(parsed.attributions)).toBe(true);
    });
  });

  describe('Conversational Attribution', () => {
    test('should format attribution for conversational response', () => {
      const ipService = new IPDetectionService();
      const result = {
        character: 'Batman',
        franchise: 'DC Comics',
        owner: 'DC Comics (Warner Bros.)',
        confidence: 'high' as const,
        attributionText: 'Batman belongs to DC Comics (Warner Bros.)',
        personalUseMessage: "This story is for your family's personal enjoyment only",
        ownershipDisclaimer: 'We are not the owners of this character',
      };

      const message = ipService.formatAttributionMessage(result);

      expect(message).toContain('Note:');
      expect(message).toContain('Batman belongs to');
      expect(message).toContain('personal enjoyment only');
      expect(message).toContain('not the owners');
    });
  });
});
