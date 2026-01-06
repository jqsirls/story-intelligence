/**
 * Multi-Agent Personality System Testing
 * Validates personality consistency, emotional intelligence, and age-appropriate adaptation
 */

import { TestResult } from './TestOrchestrator';
import { PersonalityFramework } from '../../packages/personality-agent/src/PersonalityFramework';
import { EmotionalIntelligenceIntegrator } from '../../packages/personality-agent/src/intelligence/EmotionalIntelligenceIntegrator';
import { AgePersonalityAdapter } from '../../packages/personality-agent/src/adapters/AgePersonalityAdapter';

export interface PersonalityTestRequest {
  ageRange: '3-5' | '6-8' | '9-12';
  emotionalContext: {
    mood: string;
    energy: number;
    engagement: number;
  };
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  expectedPersonalityTraits: string[];
}

export interface PersonalityConsistencyResult {
  traitConsistency: number;
  responseVariability: number;
  ageAppropriateAdaptation: number;
  emotionalIntelligenceScore: number;
  passed: boolean;
}

export interface EmotionalIntelligenceResult {
  empathyScore: number;
  emotionalRecognition: number;
  responseAppropriateness: number;
  adaptationCapability: number;
  passed: boolean;
}

export interface PersonalityTestResult extends TestResult {
  personalityConsistency?: PersonalityConsistencyResult;
  emotionalIntelligence?: EmotionalIntelligenceResult;
  ageAdaptation?: {
    vocabularyLevel: number;
    complexityLevel: number;
    interactionStyle: number;
    passed: boolean;
  };
}

export class PersonalityAgentValidator {
  private personalityFramework: PersonalityFramework;
  private emotionalIntelligence: EmotionalIntelligenceIntegrator;
  private ageAdapter: AgePersonalityAdapter;
  private testHistory: Map<string, PersonalityTestResult[]>;

  constructor() {
    this.personalityFramework = new PersonalityFramework();
    this.emotionalIntelligence = new EmotionalIntelligenceIntegrator();
    this.ageAdapter = new AgePersonalityAdapter();
    this.testHistory = new Map();
  }

  /**
   * Validate personality coordination across multiple interactions
   */
  async validatePersonalityCoordination(request: PersonalityTestRequest): Promise<PersonalityTestResult> {
    const startTime = Date.now();
    
    try {
      // Test personality consistency
      const personalityConsistency = await this.testPersonalityConsistency(request);
      
      // Test emotional intelligence
      const emotionalIntelligence = await this.testEmotionalIntelligence(request);
      
      // Test age-appropriate adaptation
      const ageAdaptation = await this.testAgeAdaptation(request);
      
      // Determine overall success
      const passed = personalityConsistency.passed && 
                    emotionalIntelligence.passed && 
                    ageAdaptation.passed;
      
      const result: PersonalityTestResult = {
        testId: `personality-coordination-${Date.now()}`,
        passed,
        duration: Date.now() - startTime,
        personalityConsistency,
        emotionalIntelligence,
        ageAdaptation,
        metadata: {
          request,
          testTimestamp: Date.now()
        }
      };
      
      // Store test history
      const historyKey = `${request.ageRange}-${request.emotionalContext.mood}`;
      if (!this.testHistory.has(historyKey)) {
        this.testHistory.set(historyKey, []);
      }
      this.testHistory.get(historyKey)!.push(result);
      
      return result;
      
    } catch (error) {
      return {
        testId: `personality-coordination-${Date.now()}`,
        passed: false,
        duration: Date.now() - startTime,
        error: `Personality coordination test failed: ${error.message}`
      };
    }
  }

  /**
   * Test personality consistency across interactions
   */
  private async testPersonalityConsistency(request: PersonalityTestRequest): Promise<PersonalityConsistencyResult> {
    try {
      const responses: string[] = [];
      const personalityScores: number[] = [];
      
      // Generate multiple responses to test consistency
      for (let i = 0; i < 5; i++) {
        const testPrompt = `Respond to this child (age ${request.ageRange}): "Tell me about your favorite adventure!"`;
        
        const response = await this.personalityFramework.generatePersonalizedResponse({
          prompt: testPrompt,
          ageRange: request.ageRange,
          emotionalContext: request.emotionalContext,
          conversationHistory: request.conversationHistory
        });
        
        responses.push(response.content);
        personalityScores.push(response.personalityScore || 0.5);
      }
      
      // Analyze trait consistency
      const traitConsistency = this.analyzeTraitConsistency(responses, request.expectedPersonalityTraits);
      
      // Calculate response variability (should be low for consistency)
      const meanScore = personalityScores.reduce((sum, score) => sum + score, 0) / personalityScores.length;
      const variance = personalityScores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / personalityScores.length;
      const responseVariability = Math.max(0, 1 - Math.sqrt(variance));
      
      // Test age-appropriate adaptation
      const ageAppropriateAdaptation = await this.testAgeAppropriatePersonality(responses, request.ageRange);
      
      // Test emotional intelligence integration
      const emotionalIntelligenceScore = await this.testEmotionalPersonalityIntegration(responses, request.emotionalContext);
      
      return {
        traitConsistency,
        responseVariability,
        ageAppropriateAdaptation,
        emotionalIntelligenceScore,
        passed: traitConsistency >= 0.8 && 
                responseVariability >= 0.7 && 
                ageAppropriateAdaptation >= 0.8 &&
                emotionalIntelligenceScore >= 0.7
      };
      
    } catch (error) {
      console.error('Personality consistency test failed:', error);
      return {
        traitConsistency: 0,
        responseVariability: 0,
        ageAppropriateAdaptation: 0,
        emotionalIntelligenceScore: 0,
        passed: false
      };
    }
  }

  /**
   * Test emotional intelligence response verification
   */
  private async testEmotionalIntelligence(request: PersonalityTestRequest): Promise<EmotionalIntelligenceResult> {
    try {
      // Test empathy recognition
      const empathyScore = await this.testEmpathyRecognition(request);
      
      // Test emotional recognition capabilities
      const emotionalRecognition = await this.testEmotionalRecognition(request);
      
      // Test response appropriateness
      const responseAppropriateness = await this.testEmotionalResponseAppropriateness(request);
      
      // Test adaptation capability
      const adaptationCapability = await this.testEmotionalAdaptation(request);
      
      return {
        empathyScore,
        emotionalRecognition,
        responseAppropriateness,
        adaptationCapability,
        passed: empathyScore >= 0.7 && 
                emotionalRecognition >= 0.8 && 
                responseAppropriateness >= 0.8 &&
                adaptationCapability >= 0.7
      };
      
    } catch (error) {
      console.error('Emotional intelligence test failed:', error);
      return {
        empathyScore: 0,
        emotionalRecognition: 0,
        responseAppropriateness: 0,
        adaptationCapability: 0,
        passed: false
      };
    }
  }

  /**
   * Test age-appropriate adaptation
   */
  private async testAgeAdaptation(request: PersonalityTestRequest): Promise<{
    vocabularyLevel: number;
    complexityLevel: number;
    interactionStyle: number;
    passed: boolean;
  }> {
    try {
      const testPrompt = "Explain how friendship works to this child.";
      
      const response = await this.ageAdapter.adaptPersonalityForAge({
        content: testPrompt,
        ageRange: request.ageRange,
        personalityTraits: request.expectedPersonalityTraits
      });
      
      // Analyze vocabulary level
      const vocabularyLevel = this.analyzeVocabularyLevel(response.content, request.ageRange);
      
      // Analyze complexity level
      const complexityLevel = this.analyzeComplexityLevel(response.content, request.ageRange);
      
      // Analyze interaction style
      const interactionStyle = this.analyzeInteractionStyle(response.content, request.ageRange);
      
      return {
        vocabularyLevel,
        complexityLevel,
        interactionStyle,
        passed: vocabularyLevel >= 0.8 && complexityLevel >= 0.8 && interactionStyle >= 0.8
      };
      
    } catch (error) {
      console.error('Age adaptation test failed:', error);
      return {
        vocabularyLevel: 0,
        complexityLevel: 0,
        interactionStyle: 0,
        passed: false
      };
    }
  }

  /**
   * Analyze trait consistency in responses
   */
  private analyzeTraitConsistency(responses: string[], expectedTraits: string[]): number {
    let consistencyScore = 0;
    const traitCounts = new Map<string, number>();
    
    // Count trait occurrences across responses
    for (const response of responses) {
      for (const trait of expectedTraits) {
        const traitPresent = this.detectTraitInResponse(response, trait);
        if (traitPresent) {
          traitCounts.set(trait, (traitCounts.get(trait) || 0) + 1);
        }
      }
    }
    
    // Calculate consistency (traits should appear consistently)
    for (const trait of expectedTraits) {
      const occurrences = traitCounts.get(trait) || 0;
      const consistency = occurrences / responses.length;
      consistencyScore += consistency;
    }
    
    return expectedTraits.length > 0 ? consistencyScore / expectedTraits.length : 0;
  }

  /**
   * Test age-appropriate personality adaptation
   */
  private async testAgeAppropriatePersonality(responses: string[], ageRange: string): Promise<number> {
    let ageAppropriateScore = 0;
    
    for (const response of responses) {
      // Check vocabulary appropriateness
      const vocabularyScore = this.analyzeVocabularyLevel(response, ageRange);
      
      // Check interaction style appropriateness
      const interactionScore = this.analyzeInteractionStyle(response, ageRange);
      
      ageAppropriateScore += (vocabularyScore + interactionScore) / 2;
    }
    
    return responses.length > 0 ? ageAppropriateScore / responses.length : 0;
  }

  /**
   * Test emotional personality integration
   */
  private async testEmotionalPersonalityIntegration(responses: string[], emotionalContext: any): Promise<number> {
    let integrationScore = 0;
    
    for (const response of responses) {
      // Check if response matches emotional context
      const emotionalAlignment = this.analyzeEmotionalAlignment(response, emotionalContext);
      integrationScore += emotionalAlignment;
    }
    
    return responses.length > 0 ? integrationScore / responses.length : 0;
  }

  /**
   * Test empathy recognition
   */
  private async testEmpathyRecognition(request: PersonalityTestRequest): Promise<number> {
    const empathyTestCases = [
      "I'm feeling sad because my pet is sick",
      "I'm excited about my birthday party tomorrow",
      "I'm scared of the dark",
      "I'm proud that I learned to ride a bike"
    ];
    
    let empathyScore = 0;
    
    for (const testCase of empathyTestCases) {
      const response = await this.emotionalIntelligence.processEmotionalInput({
        userInput: testCase,
        ageRange: request.ageRange,
        context: request.emotionalContext
      });
      
      // Analyze empathetic response
      const empathy = this.analyzeEmpathyInResponse(response.response, testCase);
      empathyScore += empathy;
    }
    
    return empathyTestCases.length > 0 ? empathyScore / empathyTestCases.length : 0;
  }

  /**
   * Test emotional recognition capabilities
   */
  private async testEmotionalRecognition(request: PersonalityTestRequest): Promise<number> {
    const emotionalInputs = [
      { text: "I'm so happy!", expectedEmotion: "joy" },
      { text: "This is scary...", expectedEmotion: "fear" },
      { text: "I'm angry about this!", expectedEmotion: "anger" },
      { text: "I feel lonely", expectedEmotion: "sadness" }
    ];
    
    let recognitionScore = 0;
    
    for (const input of emotionalInputs) {
      const result = await this.emotionalIntelligence.recognizeEmotion({
        text: input.text,
        context: request.emotionalContext
      });
      
      // Check if recognized emotion matches expected
      const accuracy = result.detectedEmotion === input.expectedEmotion ? 1 : 0;
      recognitionScore += accuracy;
    }
    
    return emotionalInputs.length > 0 ? recognitionScore / emotionalInputs.length : 0;
  }

  /**
   * Test emotional response appropriateness
   */
  private async testEmotionalResponseAppropriateness(request: PersonalityTestRequest): Promise<number> {
    const testScenarios = [
      { input: "I lost my favorite toy", expectedTone: "comforting" },
      { input: "I won the game!", expectedTone: "celebratory" },
      { input: "I'm nervous about school", expectedTone: "reassuring" }
    ];
    
    let appropriatenessScore = 0;
    
    for (const scenario of testScenarios) {
      const response = await this.emotionalIntelligence.generateEmotionalResponse({
        userInput: scenario.input,
        ageRange: request.ageRange,
        context: request.emotionalContext
      });
      
      // Analyze tone appropriateness
      const toneMatch = this.analyzeToneAppropriateness(response.content, scenario.expectedTone);
      appropriatenessScore += toneMatch;
    }
    
    return testScenarios.length > 0 ? appropriatenessScore / testScenarios.length : 0;
  }

  /**
   * Test emotional adaptation capability
   */
  private async testEmotionalAdaptation(request: PersonalityTestRequest): Promise<number> {
    const adaptationTests = [
      { mood: "happy", energy: 0.8 },
      { mood: "sad", energy: 0.3 },
      { mood: "excited", energy: 0.9 },
      { mood: "calm", energy: 0.5 }
    ];
    
    let adaptationScore = 0;
    
    for (const test of adaptationTests) {
      const adaptedContext = { ...request.emotionalContext, ...test };
      
      const response = await this.emotionalIntelligence.adaptToEmotionalState({
        emotionalContext: adaptedContext,
        ageRange: request.ageRange,
        basePersonality: request.expectedPersonalityTraits
      });
      
      // Analyze adaptation quality
      const adaptationQuality = this.analyzeAdaptationQuality(response, test);
      adaptationScore += adaptationQuality;
    }
    
    return adaptationTests.length > 0 ? adaptationScore / adaptationTests.length : 0;
  }

  /**
   * Detect trait presence in response
   */
  private detectTraitInResponse(response: string, trait: string): boolean {
    const traitKeywords = {
      'friendly': ['friend', 'nice', 'kind', 'warm', 'welcoming'],
      'enthusiastic': ['exciting', 'amazing', 'wonderful', 'fantastic', 'great'],
      'patient': ['take time', 'slowly', 'step by step', 'no rush'],
      'encouraging': ['you can do it', 'great job', 'keep trying', 'believe in you'],
      'playful': ['fun', 'play', 'game', 'silly', 'laugh']
    };
    
    const keywords = traitKeywords[trait.toLowerCase()] || [trait.toLowerCase()];
    const responseLower = response.toLowerCase();
    
    return keywords.some(keyword => responseLower.includes(keyword));
  }

  /**
   * Analyze vocabulary level for age appropriateness
   */
  private analyzeVocabularyLevel(text: string, ageRange: string): number {
    const words = text.split(' ');
    const ageAppropriateWords = words.filter(word => this.isAgeAppropriateWord(word, ageRange));
    
    return words.length > 0 ? ageAppropriateWords.length / words.length : 0;
  }

  /**
   * Analyze complexity level for age appropriateness
   */
  private analyzeComplexityLevel(text: string, ageRange: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = text.split(' ').length / sentences.length;
    
    const idealComplexity = {
      '3-5': 6,
      '6-8': 8,
      '9-12': 12
    };
    
    const ideal = idealComplexity[ageRange] || 8;
    const deviation = Math.abs(avgWordsPerSentence - ideal);
    
    return Math.max(0, 1 - (deviation / ideal));
  }

  /**
   * Analyze interaction style appropriateness
   */
  private analyzeInteractionStyle(text: string, ageRange: string): number {
    const interactionMarkers = {
      '3-5': ['let\'s', 'we can', 'together', 'fun', 'play'],
      '6-8': ['you can', 'try this', 'what do you think', 'imagine'],
      '9-12': ['consider', 'think about', 'what if', 'explore']
    };
    
    const markers = interactionMarkers[ageRange] || [];
    const textLower = text.toLowerCase();
    const foundMarkers = markers.filter(marker => textLower.includes(marker));
    
    return markers.length > 0 ? foundMarkers.length / markers.length : 0.5;
  }

  /**
   * Analyze emotional alignment with context
   */
  private analyzeEmotionalAlignment(response: string, emotionalContext: any): number {
    const moodKeywords = {
      'happy': ['happy', 'joy', 'excited', 'wonderful', 'great'],
      'sad': ['understand', 'sorry', 'comfort', 'better', 'help'],
      'excited': ['amazing', 'fantastic', 'wow', 'incredible', 'awesome'],
      'calm': ['peaceful', 'gentle', 'quiet', 'soft', 'relax']
    };
    
    const keywords = moodKeywords[emotionalContext.mood] || [];
    const responseLower = response.toLowerCase();
    const foundKeywords = keywords.filter(keyword => responseLower.includes(keyword));
    
    return keywords.length > 0 ? foundKeywords.length / keywords.length : 0.5;
  }

  /**
   * Analyze empathy in response
   */
  private analyzeEmpathyInResponse(response: string, userInput: string): number {
    const empathyMarkers = [
      'I understand', 'I can see', 'that sounds', 'I hear you',
      'it\'s okay', 'I\'m here', 'you\'re not alone', 'I care'
    ];
    
    const responseLower = response.toLowerCase();
    const foundMarkers = empathyMarkers.filter(marker => responseLower.includes(marker));
    
    return empathyMarkers.length > 0 ? foundMarkers.length / empathyMarkers.length : 0;
  }

  /**
   * Analyze tone appropriateness
   */
  private analyzeToneAppropriateness(response: string, expectedTone: string): number {
    const toneKeywords = {
      'comforting': ['it\'s okay', 'I\'m here', 'you\'re safe', 'don\'t worry'],
      'celebratory': ['congratulations', 'amazing', 'so proud', 'fantastic'],
      'reassuring': ['you can do it', 'I believe', 'you\'re brave', 'it\'ll be okay']
    };
    
    const keywords = toneKeywords[expectedTone] || [];
    const responseLower = response.toLowerCase();
    const foundKeywords = keywords.filter(keyword => responseLower.includes(keyword));
    
    return keywords.length > 0 ? foundKeywords.length / keywords.length : 0;
  }

  /**
   * Analyze adaptation quality
   */
  private analyzeAdaptationQuality(response: any, testContext: any): number {
    // Simplified analysis - in real implementation would be more sophisticated
    const energyAlignment = Math.abs(response.energyLevel - testContext.energy) <= 0.2 ? 1 : 0;
    const moodAlignment = response.mood === testContext.mood ? 1 : 0;
    
    return (energyAlignment + moodAlignment) / 2;
  }

  /**
   * Check if word is age-appropriate
   */
  private isAgeAppropriateWord(word: string, ageRange: string): boolean {
    const complexWords = {
      '3-5': ['difficult', 'complicated', 'extraordinary'],
      '6-8': ['extraordinary', 'magnificent', 'tremendous'],
      '9-12': ['incomprehensible', 'extraordinary']
    };
    
    const inappropriate = complexWords[ageRange] || [];
    return !inappropriate.includes(word.toLowerCase()) && word.length <= 10;
  }

  /**
   * Get test history for analysis
   */
  getTestHistory(): Map<string, PersonalityTestResult[]> {
    return new Map(this.testHistory);
  }

  /**
   * Generate personality test report
   */
  generatePersonalityReport(): {
    totalTests: number;
    passedTests: number;
    averageConsistency: number;
    averageEmotionalIntelligence: number;
    averageAgeAdaptation: number;
    recommendations: string[];
  } {
    let totalTests = 0;
    let passedTests = 0;
    let totalConsistency = 0;
    let totalEmotionalIntelligence = 0;
    let totalAgeAdaptation = 0;
    const recommendations: string[] = [];
    
    for (const results of this.testHistory.values()) {
      for (const result of results) {
        totalTests++;
        if (result.passed) passedTests++;
        
        if (result.personalityConsistency) {
          totalConsistency += result.personalityConsistency.traitConsistency;
        }
        
        if (result.emotionalIntelligence) {
          totalEmotionalIntelligence += result.emotionalIntelligence.empathyScore;
        }
        
        if (result.ageAdaptation) {
          totalAgeAdaptation += result.ageAdaptation.vocabularyLevel;
        }
      }
    }
    
    const averageConsistency = totalTests > 0 ? totalConsistency / totalTests : 0;
    const averageEmotionalIntelligence = totalTests > 0 ? totalEmotionalIntelligence / totalTests : 0;
    const averageAgeAdaptation = totalTests > 0 ? totalAgeAdaptation / totalTests : 0;
    
    // Generate recommendations
    if (averageConsistency < 0.8) {
      recommendations.push('Improve personality trait consistency across interactions');
    }
    if (averageEmotionalIntelligence < 0.7) {
      recommendations.push('Enhance emotional intelligence and empathy responses');
    }
    if (averageAgeAdaptation < 0.8) {
      recommendations.push('Better adapt vocabulary and complexity for different age ranges');
    }
    
    return {
      totalTests,
      passedTests,
      averageConsistency,
      averageEmotionalIntelligence,
      averageAgeAdaptation,
      recommendations
    };
  }
}