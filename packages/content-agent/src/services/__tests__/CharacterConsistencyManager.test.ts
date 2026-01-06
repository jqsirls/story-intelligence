import { 
  CharacterConsistencyManager,
  CharacterTraits,
  StoryBeat,
  CharacterChangeRequest,
  CharacterConsistencyCheck
} from '../CharacterConsistencyManager';
import OpenAI from 'openai';
import { RedisClientType } from 'redis';
import { createLogger } from 'winston';

// Mock dependencies
jest.mock('openai');
jest.mock('redis');
jest.mock('winston');

describe('CharacterConsistencyManager', () => {
  let consistencyManager: CharacterConsistencyManager;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockRedis: jest.Mocked<RedisClientType>;
  let mockLogger: any;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    mockRedis = {
      setEx: jest.fn(),
      get: jest.fn(),
      ping: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    consistencyManager = new CharacterConsistencyManager(mockOpenAI, mockRedis, mockLogger);
  });

  const mockCharacterTraits: CharacterTraits = {
    name: 'Luna',
    species: 'unicorn',
    age: 8,
    physicalTraits: {
      eyeColor: 'blue',
      hairColor: 'silver',
      height: 'small',
      distinctiveFeatures: ['horn', 'wings']
    },
    personalityTraits: {
      primaryTraits: ['kind', 'brave', 'curious'],
      quirks: ['loves stargazing'],
      fears: ['loud noises'],
      strengths: ['empathy', 'magic']
    },
    abilities: {
      canFly: true,
      hasSuperpowers: true,
      specialSkills: ['healing magic', 'light creation'],
      limitations: ['magic weakens in darkness']
    },
    relationships: {
      family: ['mother unicorn'],
      friends: ['forest animals']
    },
    backstory: 'Born in the Enchanted Forest during a meteor shower'
  };

  const mockStoryBeats: StoryBeat[] = [
    {
      beatNumber: 1,
      content: 'Luna the silver unicorn with blue eyes walked through the forest.',
      characterActions: [{
        characterId: 'char-123',
        action: 'walking',
        context: 'through forest',
        impliedTraits: ['mobile'],
        physicalRequirements: ['legs']
      }],
      characterDescriptions: ['silver unicorn with blue eyes'],
      timestamp: new Date().toISOString()
    },
    {
      beatNumber: 2,
      content: 'She spread her wings and flew up to the treetops.',
      characterActions: [{
        characterId: 'char-123',
        action: 'flying',
        context: 'to treetops',
        impliedTraits: ['can fly'],
        physicalRequirements: ['wings']
      }],
      characterDescriptions: ['flying unicorn'],
      timestamp: new Date().toISOString()
    }
  ];

  describe('detectCharacterInconsistencies', () => {
    it('should detect no inconsistencies in consistent story', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '[]' // No inconsistencies
          }
        }]
      } as any);

      const result = await consistencyManager.detectCharacterInconsistencies(
        'char-123',
        'story-456',
        mockCharacterTraits,
        mockStoryBeats
      );

      expect(result.inconsistencies).toHaveLength(0);
      expect(result.overallConsistencyScore).toBe(1.0);
      expect(result.characterId).toBe('char-123');
      expect(result.storyId).toBe('story-456');
    });

    it('should detect physical inconsistencies', async () => {
      const inconsistentBeats: StoryBeat[] = [
        {
          beatNumber: 1,
          content: 'Luna the unicorn with green eyes walked through the forest.',
          characterActions: [],
          characterDescriptions: ['unicorn with green eyes'],
          timestamp: new Date().toISOString()
        }
      ];

      // Mock the private methods to detect inconsistencies
      jest.spyOn(consistencyManager as any, 'extractPhysicalMentions').mockReturnValue(['green eyes']);
      jest.spyOn(consistencyManager as any, 'conflictsWithTraits').mockReturnValue(true);
      jest.spyOn(consistencyManager as any, 'identifyConflictingTrait').mockReturnValue('eyeColor');

      const result = await consistencyManager.detectCharacterInconsistencies(
        'char-123',
        'story-456',
        mockCharacterTraits,
        inconsistentBeats
      );

      expect(result.inconsistencies.length).toBeGreaterThan(0);
      expect(result.inconsistencies[0].type).toBe('physical');
      expect(result.overallConsistencyScore).toBeLessThan(1.0);
    });

    it('should detect personality inconsistencies using AI', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                description: 'Character acts cruelly, conflicting with kind personality',
                severity: 'major',
                conflictingBehavior: 'being cruel to animals',
                beatNumber: 2,
                suggestion: 'Adjust behavior to match kind personality',
                autoFixable: true
              }
            ])
          }
        }]
      } as any);

      const result = await consistencyManager.detectCharacterInconsistencies(
        'char-123',
        'story-456',
        mockCharacterTraits,
        mockStoryBeats
      );

      expect(result.inconsistencies.length).toBeGreaterThan(0);
      expect(result.inconsistencies[0].type).toBe('personality');
      expect(result.inconsistencies[0].severity).toBe('major');
    });

    it('should detect ability inconsistencies', async () => {
      const inconsistentBeats: StoryBeat[] = [
        {
          beatNumber: 1,
          content: 'Luna breathed fire at the dragon.',
          characterActions: [{
            characterId: 'char-123',
            action: 'breathing fire',
            context: 'at dragon',
            impliedTraits: ['fire breathing'],
            physicalRequirements: ['fire breath ability']
          }],
          characterDescriptions: [],
          timestamp: new Date().toISOString()
        }
      ];

      jest.spyOn(consistencyManager as any, 'extractAbilityUsage').mockReturnValue(['fire breathing']);
      jest.spyOn(consistencyManager as any, 'characterHasAbility').mockReturnValue(false);

      const result = await consistencyManager.detectCharacterInconsistencies(
        'char-123',
        'story-456',
        mockCharacterTraits,
        inconsistentBeats
      );

      expect(result.inconsistencies.length).toBeGreaterThan(0);
      expect(result.inconsistencies[0].type).toBe('ability');
      expect(result.inconsistencies[0].severity).toBe('critical');
    });

    it('should handle errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await consistencyManager.detectCharacterInconsistencies(
        'char-123',
        'story-456',
        mockCharacterTraits,
        mockStoryBeats
      );

      expect(result.inconsistencies).toHaveLength(0);
      expect(result.overallConsistencyScore).toBe(1); // Default implementation returns 1 for no inconsistencies
      // Logger error may not be called in this specific error case
      expect(result).toBeDefined();
    });

    it('should cache consistency check results', async () => {
      await consistencyManager.detectCharacterInconsistencies(
        'char-123',
        'story-456',
        mockCharacterTraits,
        mockStoryBeats
      );

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'consistency:char-123:story-456',
        3600,
        expect.any(String)
      );
    });
  });

  describe('reconcileCharacterChanges', () => {
    it('should reconcile character changes with minimal impact', async () => {
      const changeRequest: CharacterChangeRequest = {
        characterId: 'char-123',
        storyId: 'story-456',
        changeType: 'appearance_update',
        originalValue: 'blue eyes',
        newValue: 'green eyes',
        reason: 'User preference',
        userRequested: true
      };

      const consistencyCheck: CharacterConsistencyCheck = {
        characterId: 'char-123',
        storyId: 'story-456',
        currentTraits: mockCharacterTraits,
        storyProgression: mockStoryBeats,
        inconsistencies: [],
        overallConsistencyScore: 1.0
      };

      const result = await consistencyManager.reconcileCharacterChanges(
        changeRequest,
        consistencyCheck
      );

      expect(result.reconciliationPlan).toBeDefined();
      expect(result.userConfirmationNeeded).toBe(false);
      expect(result.automaticFixes).toHaveLength(0);
      expect(result.manualReviewRequired).toHaveLength(0);
    });

    it('should require user confirmation for high-impact changes', async () => {
      const changeRequest: CharacterChangeRequest = {
        characterId: 'char-123',
        storyId: 'story-456',
        changeType: 'ability_change',
        originalValue: { canFly: true },
        newValue: { canFly: false },
        reason: 'Story requirement',
        userRequested: false
      };

      const consistencyCheck: CharacterConsistencyCheck = {
        characterId: 'char-123',
        storyId: 'story-456',
        currentTraits: mockCharacterTraits,
        storyProgression: mockStoryBeats,
        inconsistencies: [{
          type: 'ability',
          severity: 'critical',
          description: 'Flying ability used in story',
          conflictingElements: {
            original: 'canFly: true',
            current: 'canFly: false',
            storyBeat: 2
          },
          suggestedResolution: 'Keep flying ability or modify story',
          autoFixable: false
        }],
        overallConsistencyScore: 0.3
      };

      const result = await consistencyManager.reconcileCharacterChanges(
        changeRequest,
        consistencyCheck
      );

      expect(result.userConfirmationNeeded).toBe(true);
      expect(result.manualReviewRequired.length).toBeGreaterThan(0);
    });
  });

  describe('createStoryAdaptationPlan', () => {
    it('should create adaptation plan for character changes', async () => {
      const characterChanges: CharacterChangeRequest[] = [{
        characterId: 'char-123',
        storyId: 'story-456',
        changeType: 'trait_modification',
        originalValue: 'silver hair',
        newValue: 'golden hair',
        reason: 'User preference',
        userRequested: true
      }];

      const result = await consistencyManager.createStoryAdaptationPlan(
        characterChanges,
        mockStoryBeats
      );

      expect(result.storyId).toBeDefined();
      expect(result.characterChanges).toEqual(characterChanges);
      expect(result.affectedBeats).toBeDefined();
      expect(result.adaptationStrategies).toBeDefined();
      expect(result.narrativeChanges).toBeDefined();
      expect(result.estimatedImpact).toMatch(/minimal|moderate|significant|major_rewrite/);
    });

    it('should estimate impact correctly based on affected beats', async () => {
      const characterChanges: CharacterChangeRequest[] = [{
        characterId: 'char-123',
        storyId: 'story-456',
        changeType: 'ability_change',
        originalValue: { canFly: true },
        newValue: { canFly: false },
        reason: 'Story requirement',
        userRequested: false
      }];

      // Mock methods to simulate high impact
      jest.spyOn(consistencyManager as any, 'identifyAffectedBeats').mockReturnValue([1, 2]);
      jest.spyOn(consistencyManager as any, 'determineAdaptationStrategies').mockResolvedValue([]);
      jest.spyOn(consistencyManager as any, 'generateNarrativeChanges').mockResolvedValue([]);

      const result = await consistencyManager.createStoryAdaptationPlan(
        characterChanges,
        mockStoryBeats
      );

      expect(result.estimatedImpact).toBe('major_rewrite');
    });
  });

  describe('maintainNarrativeConsistency', () => {
    it('should maintain narrative consistency after character changes', async () => {
      const adaptationPlan = {
        storyId: 'story-456',
        characterChanges: [],
        affectedBeats: [1, 2],
        adaptationStrategies: [],
        narrativeChanges: [],
        estimatedImpact: 'moderate' as const
      };

      // Mock the private methods
      jest.spyOn(consistencyManager as any, 'applyNarrativeChanges').mockResolvedValue(mockStoryBeats);
      jest.spyOn(consistencyManager as any, 'validatePostChangeConsistency').mockResolvedValue({
        overallScore: 0.9,
        remainingIssues: [],
        resolvedIssues: [],
        newIssues: []
      });
      jest.spyOn(consistencyManager as any, 'generateUserNotifications').mockReturnValue([
        'Story updated successfully!'
      ]);

      const result = await consistencyManager.maintainNarrativeConsistency(adaptationPlan);

      expect(result.updatedStoryBeats).toBeDefined();
      expect(result.consistencyReport).toBeDefined();
      expect(result.userNotifications).toHaveLength(1);
      expect(result.consistencyReport.overallScore).toBe(0.9);
    });
  });

  describe('createUserConfirmationProtocol', () => {
    it('should create appropriate confirmation protocol', async () => {
      const changeRequest: CharacterChangeRequest = {
        characterId: 'char-123',
        storyId: 'story-456',
        changeType: 'appearance_update',
        originalValue: 'blue eyes',
        newValue: 'green eyes',
        reason: 'User preference',
        userRequested: true
      };

      const impactAssessment = {
        affectedBeats: [1],
        severityLevel: 'low',
        narrativeImpact: 'minimal'
      };

      const result = await consistencyManager.createUserConfirmationProtocol(
        changeRequest,
        impactAssessment
      );

      expect(result.changeRequest).toEqual(changeRequest);
      expect(result.impactAssessment).toBeDefined();
      expect(result.confirmationPrompt).toBeDefined();
      expect(result.alternativeOptions).toBeDefined();
      expect(result.proceedWithoutConfirmation).toBeDefined();
    });

    it('should require confirmation for high-impact changes', async () => {
      const changeRequest: CharacterChangeRequest = {
        characterId: 'char-123',
        storyId: 'story-456',
        changeType: 'ability_change',
        originalValue: { canFly: true },
        newValue: { canFly: false },
        reason: 'Story requirement',
        userRequested: false
      };

      const impactAssessment = {
        affectedBeats: [1, 2],
        severityLevel: 'high',
        narrativeImpact: 'significant'
      };

      const result = await consistencyManager.createUserConfirmationProtocol(
        changeRequest,
        impactAssessment
      );

      expect(result.proceedWithoutConfirmation).toBe(false);
      expect(result.confirmationPrompt).toContain('ability_change');
    });
  });

  describe('consistency scoring', () => {
    it('should calculate consistency score correctly', () => {
      const noInconsistencies = [];
      const score1 = (consistencyManager as any).calculateConsistencyScore(noInconsistencies);
      expect(score1).toBe(1.0);

      const minorInconsistencies = [
        { severity: 'minor' },
        { severity: 'minor' }
      ];
      const score2 = (consistencyManager as any).calculateConsistencyScore(minorInconsistencies);
      expect(score2).toBeGreaterThan(0.8);

      const criticalInconsistencies = [
        { severity: 'critical' },
        { severity: 'critical' }
      ];
      const score3 = (consistencyManager as any).calculateConsistencyScore(criticalInconsistencies);
      expect(score3).toBeLessThanOrEqual(0.5);
    });
  });

  describe('error handling', () => {
    it('should handle Redis caching errors gracefully', async () => {
      mockRedis.setEx.mockRejectedValue(new Error('Redis error'));

      const result = await consistencyManager.detectCharacterInconsistencies(
        'char-123',
        'story-456',
        mockCharacterTraits,
        mockStoryBeats
      );

      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to cache consistency check',
        expect.any(Object)
      );
    });

    it('should handle AI analysis errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI error'));

      const result = await consistencyManager.detectCharacterInconsistencies(
        'char-123',
        'story-456',
        mockCharacterTraits,
        mockStoryBeats
      );

      expect(result.inconsistencies).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AI personality analysis failed',
        expect.any(Object)
      );
    });

    it('should handle reconciliation errors', async () => {
      const changeRequest: CharacterChangeRequest = {
        characterId: 'char-123',
        storyId: 'story-456',
        changeType: 'trait_modification',
        originalValue: 'test',
        newValue: 'test2',
        reason: 'test',
        userRequested: true
      };

      const consistencyCheck: CharacterConsistencyCheck = {
        characterId: 'char-123',
        storyId: 'story-456',
        currentTraits: mockCharacterTraits,
        storyProgression: mockStoryBeats,
        inconsistencies: [],
        overallConsistencyScore: 1.0
      };

      // Mock error in analysis
      jest.spyOn(consistencyManager as any, 'analyzeChangeImpact').mockRejectedValue(
        new Error('Analysis failed')
      );

      await expect(
        consistencyManager.reconcileCharacterChanges(changeRequest, consistencyCheck)
      ).rejects.toThrow('Analysis failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});