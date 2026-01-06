/**
 * Unit Tests for IP Detection Service
 */

import { IPDetectionService } from '../IPDetectionService';

describe('IPDetectionService', () => {
  let service: IPDetectionService;

  beforeEach(() => {
    service = new IPDetectionService();
  });

  describe('detectIP', () => {
    test('should detect exact character name match (high confidence)', async () => {
      const storyContent = 'Once upon a time, Batman saved the city.';
      const characterNames = ['Batman'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results.length).toBeGreaterThan(0);
      const batmanResult = results.find(r => r.character.toLowerCase() === 'batman');
      expect(batmanResult).toBeDefined();
      expect(batmanResult?.confidence).toBe('high');
      expect(batmanResult?.franchise).toBe('DC Comics');
      expect(batmanResult?.owner).toBe('DC Comics (Warner Bros.)');
      expect(batmanResult?.attributionText).toContain('Batman belongs to');
      expect(batmanResult?.personalUseMessage).toContain('personal enjoyment only');
      expect(batmanResult?.ownershipDisclaimer).toContain('not the owners');
    });

    test('should detect variant character name (medium confidence)', async () => {
      const storyContent = 'Spiderman swung through the city.';
      const characterNames = ['Spiderman'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results.length).toBeGreaterThan(0);
      const spidermanResult = results.find(r => 
        r.character.toLowerCase().includes('spider')
      );
      expect(spidermanResult).toBeDefined();
      expect(spidermanResult?.franchise).toBe('Marvel');
      expect(spidermanResult?.owner).toBe('Marvel Comics (Disney)');
    });

    test('should detect IP from story content patterns (low confidence)', async () => {
      const storyContent = 'The web-slinging hero saved the day with his spider sense.';
      const characterNames = [];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results.length).toBeGreaterThan(0);
      const spidermanResult = results.find(r => 
        r.character.toLowerCase().includes('spider')
      );
      expect(spidermanResult).toBeDefined();
      expect(spidermanResult?.confidence).toBe('low');
    });

    test('should detect multiple IP characters', async () => {
      const storyContent = 'Batman and Spiderman teamed up to save the city.';
      const characterNames = ['Batman', 'Spiderman'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some(r => r.character.toLowerCase().includes('batman'))).toBe(true);
      expect(results.some(r => r.character.toLowerCase().includes('spider'))).toBe(true);
    });

    test('should return empty array when no IP detected', async () => {
      const storyContent = 'Once upon a time, there was a brave knight named Arthur.';
      const characterNames = ['Arthur'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results).toEqual([]);
    });

    test('should handle Disney characters', async () => {
      const storyContent = 'Elsa used her ice powers to create a beautiful castle.';
      const characterNames = ['Elsa'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results.length).toBeGreaterThan(0);
      const elsaResult = results.find(r => r.character.toLowerCase() === 'elsa');
      expect(elsaResult).toBeDefined();
      expect(elsaResult?.franchise).toBe('Disney');
      expect(elsaResult?.owner).toBe('The Walt Disney Company');
    });

    test('should handle Harry Potter characters', async () => {
      const storyContent = 'Harry Potter went to Hogwarts.';
      const characterNames = ['Harry Potter'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results.length).toBeGreaterThan(0);
      const harryResult = results.find(r => 
        r.character.toLowerCase().includes('harry')
      );
      expect(harryResult).toBeDefined();
      expect(harryResult?.franchise).toBe('Harry Potter');
      expect(harryResult?.owner).toBe('Warner Bros. Entertainment');
    });
  });

  describe('formatAttributionMessage', () => {
    test('should format attribution message correctly', () => {
      const result = {
        character: 'Batman',
        franchise: 'DC Comics',
        owner: 'DC Comics (Warner Bros.)',
        confidence: 'high' as const,
        attributionText: 'Batman belongs to DC Comics (Warner Bros.)',
        personalUseMessage: "This story is for your family's personal enjoyment only",
        ownershipDisclaimer: 'We are not the owners of this character',
      };

      const message = service.formatAttributionMessage(result);

      expect(message).toContain('Note:');
      expect(message).toContain('Batman belongs to');
      expect(message).toContain('personal enjoyment only');
      expect(message).toContain('not the owners');
    });
  });

  describe('formatAttributionForAPI', () => {
    test('should format attribution for API with detected IP', () => {
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

      const formatted = service.formatAttributionForAPI(results);

      expect(formatted.detected).toBe(true);
      expect(formatted.attributions).toEqual(results);
      expect(formatted.fullMessage).toBeDefined();
      expect(formatted.fullMessage).toContain('Batman');
    });

    test('should format attribution for API with no IP detected', () => {
      const results: any[] = [];

      const formatted = service.formatAttributionForAPI(results);

      expect(formatted.detected).toBe(false);
      expect(formatted.attributions).toEqual([]);
      expect(formatted.fullMessage).toBeUndefined();
    });
  });

  describe('confidence scoring', () => {
    test('should assign high confidence for exact matches', async () => {
      const storyContent = 'Batman is a hero.';
      const characterNames = ['Batman'];

      const results = await service.detectIP(storyContent, characterNames);

      const batmanResult = results.find(r => r.character.toLowerCase() === 'batman');
      expect(batmanResult?.confidence).toBe('high');
    });

    test('should assign medium confidence for case-insensitive matches', async () => {
      const storyContent = 'batman is a hero.';
      const characterNames = ['batman'];

      const results = await service.detectIP(storyContent, characterNames);

      const batmanResult = results.find(r => r.character.toLowerCase() === 'batman');
      expect(batmanResult?.confidence).toBe('medium');
    });

    test('should assign low confidence for NLP pattern matches', async () => {
      const storyContent = 'The dark knight saved Gotham.';
      const characterNames = [];

      const results = await service.detectIP(storyContent, characterNames);

      const batmanResult = results.find(r => r.character.toLowerCase() === 'batman');
      expect(batmanResult?.confidence).toBe('low');
    });
  });

  describe('message generation', () => {
    test('should generate correct attribution text', async () => {
      const storyContent = 'Batman is a hero.';
      const characterNames = ['Batman'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results[0].attributionText).toBe('Batman belongs to DC Comics (Warner Bros.)');
    });

    test('should generate personal use message', async () => {
      const storyContent = 'Batman is a hero.';
      const characterNames = ['Batman'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results[0].personalUseMessage).toBe("This story is for your family's personal enjoyment only");
    });

    test('should generate ownership disclaimer', async () => {
      const storyContent = 'Batman is a hero.';
      const characterNames = ['Batman'];

      const results = await service.detectIP(storyContent, characterNames);

      expect(results[0].ownershipDisclaimer).toBe('We are not the owners of this character');
    });
  });
});
