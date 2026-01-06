import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  DisclosureDetectionRequest,
  DisclosureDetectionResult,
  DisclosureType,
  DetectedConcern
} from '../types';

export class DisclosureDetectionService {
  private openai: OpenAI;
  private logger: Logger;

  // Disclosure detection patterns and keywords
  private readonly disclosurePatterns = {
    [DisclosureType.PHYSICAL_ABUSE]: {
      keywords: ['hit', 'hurt', 'bruise', 'pain', 'punch', 'kick', 'slap', 'beat', 'violence', 'injury'],
      phrases: ['someone hurt me', 'they hit me', 'it hurts when', 'made me bleed', 'left marks'],
      contextClues: ['afraid to go home', 'scared of', 'don\'t want to tell', 'secret about pain']
    },
    [DisclosureType.EMOTIONAL_ABUSE]: {
      keywords: ['stupid', 'worthless', 'hate', 'yell', 'scream', 'mean', 'cruel', 'nasty'],
      phrases: ['they say I\'m', 'always yelling', 'makes me feel bad', 'calls me names'],
      contextClues: ['feel worthless', 'nobody loves me', 'always my fault', 'can\'t do anything right']
    },
    [DisclosureType.SEXUAL_ABUSE]: {
      keywords: ['touch', 'private', 'secret', 'uncomfortable', 'wrong touching', 'inappropriate'],
      phrases: ['touched me where', 'made me touch', 'secret game', 'don\'t tell anyone'],
      contextClues: ['feels wrong', 'uncomfortable touching', 'private parts', 'secret between us']
    },
    [DisclosureType.NEGLECT]: {
      keywords: ['hungry', 'cold', 'alone', 'dirty', 'no food', 'nobody home', 'take care'],
      phrases: ['no one feeds me', 'left alone', 'no clean clothes', 'nobody cares'],
      contextClues: ['always hungry', 'take care of myself', 'no one around', 'fend for myself']
    },
    [DisclosureType.BULLYING]: {
      keywords: ['bully', 'mean kids', 'pick on', 'tease', 'exclude', 'threaten', 'gang up'],
      phrases: ['kids are mean', 'they pick on me', 'won\'t let me play', 'say mean things'],
      contextClues: ['afraid at school', 'don\'t want to go', 'no friends', 'everyone hates me']
    },
    [DisclosureType.SELF_HARM]: {
      keywords: ['cut', 'hurt myself', 'scratch', 'burn', 'pain', 'deserve pain', 'punish myself'],
      phrases: ['I hurt myself', 'cut my skin', 'make the pain stop', 'deserve to hurt'],
      contextClues: ['feel better when hurt', 'control the pain', 'punish myself', 'release feelings']
    },
    [DisclosureType.SUICIDAL_IDEATION]: {
      keywords: ['die', 'kill myself', 'end it', 'not worth living', 'better off dead', 'suicide'],
      phrases: ['want to die', 'kill myself', 'end my life', 'better without me'],
      contextClues: ['no point living', 'everyone would be better', 'tired of living', 'want it to stop']
    },
    [DisclosureType.SUBSTANCE_ABUSE]: {
      keywords: ['drugs', 'alcohol', 'pills', 'drinking', 'smoking', 'high', 'drunk'],
      phrases: ['tried drugs', 'drinking alcohol', 'taking pills', 'getting high'],
      contextClues: ['parents drink too much', 'found drugs', 'offered substances', 'peer pressure']
    },
    [DisclosureType.DOMESTIC_VIOLENCE]: {
      keywords: ['fighting', 'violence', 'police', 'screaming', 'throwing things', 'scared'],
      phrases: ['parents fight', 'violence at home', 'police came', 'afraid they\'ll hurt'],
      contextClues: ['loud fighting', 'things get broken', 'hide when they fight', 'scared for safety']
    },
    [DisclosureType.MENTAL_HEALTH_CRISIS]: {
      keywords: ['depressed', 'anxious', 'panic', 'scared', 'overwhelmed', 'can\'t cope'],
      phrases: ['feel so sad', 'can\'t handle', 'everything is wrong', 'losing control'],
      contextClues: ['can\'t sleep', 'no energy', 'everything hurts', 'can\'t think straight']
    },
    [DisclosureType.UNSAFE_SITUATION]: {
      keywords: ['danger', 'unsafe', 'scared', 'threatened', 'stranger', 'followed'],
      phrases: ['not safe', 'someone following', 'stranger approached', 'feels dangerous'],
      contextClues: ['afraid to go', 'unsafe place', 'bad feeling', 'something wrong']
    }
  };

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('DisclosureDetectionService initialized');
  }

  async detectDisclosure(request: DisclosureDetectionRequest): Promise<DisclosureDetectionResult> {
    try {
      // First pass: Pattern-based detection
      const patternResults = this.detectPatternsInText(request.userInput, request.conversationContext);
      
      // Second pass: SI Enhanced contextual analysis
      const aiAnalysis = await this.performAIAnalysis(request);
      
      // Combine results
      const combinedResult = this.combineDetectionResults(patternResults, aiAnalysis, request);
      
      this.logger.debug('Disclosure detection completed', {
        userId: request.userId,
        hasDisclosure: combinedResult.hasDisclosure,
        disclosureType: combinedResult.disclosureType,
        severity: combinedResult.severity,
        confidence: combinedResult.confidence
      });

      return combinedResult;

    } catch (error) {
      this.logger.error('Error in disclosure detection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      
      // Return safe default
      return {
        hasDisclosure: false,
        disclosureType: DisclosureType.NONE,
        severity: 'low',
        confidence: 0,
        detectedConcerns: [],
        requiresMandatoryReporting: false,
        requiresImmediateIntervention: false,
        suggestedResponse: 'I\'m here to help you create wonderful stories. What kind of adventure would you like to go on?',
        escalationRequired: false
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test AI analysis with a simple, safe input
      await this.performAIAnalysis({
        userId: 'health_check',
        sessionId: 'health_check',
        userInput: 'I want to create a happy story',
        conversationContext: [],
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      this.logger.warn('DisclosureDetectionService health check failed', { error });
      return false;
    }
  }

  private detectPatternsInText(userInput: string, conversationContext: string[]): {
    detectedTypes: DisclosureType[];
    concerns: DetectedConcern[];
    maxSeverity: number;
  } {
    const detectedTypes: DisclosureType[] = [];
    const concerns: DetectedConcern[] = [];
    let maxSeverity = 0;

    const fullText = [userInput, ...conversationContext].join(' ').toLowerCase();

    // Check each disclosure type
    Object.entries(this.disclosurePatterns).forEach(([type, patterns]) => {
      const disclosureType = type as DisclosureType;
      const indicators: string[] = [];
      const contextualClues: string[] = [];
      const riskFactors: string[] = [];
      let typeConfidence = 0;
      let typeSeverity = 0;

      // Check keywords
      patterns.keywords.forEach(keyword => {
        if (fullText.includes(keyword.toLowerCase())) {
          indicators.push(`Keyword: ${keyword}`);
          typeConfidence += 0.1;
          typeSeverity += 0.2;
        }
      });

      // Check phrases
      patterns.phrases.forEach(phrase => {
        if (fullText.includes(phrase.toLowerCase())) {
          indicators.push(`Phrase: ${phrase}`);
          typeConfidence += 0.3;
          typeSeverity += 0.4;
        }
      });

      // Check context clues
      patterns.contextClues.forEach(clue => {
        if (fullText.includes(clue.toLowerCase())) {
          contextualClues.push(clue);
          typeConfidence += 0.2;
          typeSeverity += 0.3;
        }
      });

      // If we found indicators, add this as a detected concern
      if (indicators.length > 0 || contextualClues.length > 0) {
        detectedTypes.push(disclosureType);
        
        // Adjust severity based on disclosure type
        if ([DisclosureType.SEXUAL_ABUSE, DisclosureType.SUICIDAL_IDEATION, DisclosureType.SELF_HARM].includes(disclosureType)) {
          typeSeverity = Math.min(typeSeverity * 1.5, 1.0); // Increase severity for critical types
        }

        concerns.push({
          type: disclosureType,
          indicators,
          severity: Math.min(typeSeverity, 1.0),
          confidence: Math.min(typeConfidence, 1.0),
          contextualClues,
          riskFactors
        });

        maxSeverity = Math.max(maxSeverity, typeSeverity);
      }
    });

    return { detectedTypes, concerns, maxSeverity };
  }

  private async performAIAnalysis(request: DisclosureDetectionRequest): Promise<{
    hasDisclosure: boolean;
    disclosureType: DisclosureType;
    severity: number;
    confidence: number;
    reasoning: string;
  }> {
    try {
      const prompt = `You are a child safety expert analyzing a child's message for potential disclosures of abuse, neglect, or other safety concerns.

IMPORTANT: This is for child protection purposes. Analyze the following message and conversation context for any signs of:
- Physical abuse or violence
- Emotional abuse or psychological harm
- Sexual abuse or inappropriate contact
- Neglect or lack of care
- Bullying or peer victimization
- Self-harm or suicidal thoughts
- Substance abuse
- Domestic violence exposure
- Mental health crisis
- Unsafe situations

Child's message: "${request.userInput}"

Conversation context: ${request.conversationContext.join(' | ')}

Child's age: ${request.userAge || 'unknown'}

Respond with a JSON object containing:
{
  "hasDisclosure": boolean,
  "disclosureType": "none|physical_abuse|emotional_abuse|sexual_abuse|neglect|bullying|self_harm|suicidal_ideation|substance_abuse|domestic_violence|mental_health_crisis|unsafe_situation",
  "severity": number (0-1 scale),
  "confidence": number (0-1 scale),
  "reasoning": "Brief explanation of analysis"
}

Be extremely careful and err on the side of caution. Even subtle indicators should be flagged for professional review.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_SAFETY || process.env.OPENAI_MODEL_ROUTING || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a child safety expert. Analyze messages for potential disclosures with extreme care and sensitivity.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent analysis
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI analysis');
      }

      // Parse JSON response
      const analysis = JSON.parse(content);
      
      return {
        hasDisclosure: analysis.hasDisclosure || false,
        disclosureType: analysis.disclosureType || DisclosureType.NONE,
        severity: Math.min(Math.max(analysis.severity || 0, 0), 1),
        confidence: Math.min(Math.max(analysis.confidence || 0, 0), 1),
        reasoning: analysis.reasoning || 'AI analysis completed'
      };

    } catch (error) {
      this.logger.warn('AI analysis failed, falling back to pattern detection', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        hasDisclosure: false,
        disclosureType: DisclosureType.NONE,
        severity: 0,
        confidence: 0,
        reasoning: 'AI analysis unavailable'
      };
    }
  }

  private combineDetectionResults(
    patternResults: { detectedTypes: DisclosureType[]; concerns: DetectedConcern[]; maxSeverity: number },
    aiAnalysis: { hasDisclosure: boolean; disclosureType: DisclosureType; severity: number; confidence: number; reasoning: string },
    request: DisclosureDetectionRequest
  ): DisclosureDetectionResult {
    
    // Determine if there's a disclosure
    const hasDisclosure = patternResults.detectedTypes.length > 0 || aiAnalysis.hasDisclosure;
    
    // Determine primary disclosure type
    let disclosureType = DisclosureType.NONE;
    if (aiAnalysis.hasDisclosure && aiAnalysis.disclosureType !== DisclosureType.NONE) {
      disclosureType = aiAnalysis.disclosureType;
    } else if (patternResults.detectedTypes.length > 0) {
      // Use the most severe pattern-detected type
      disclosureType = patternResults.detectedTypes[0];
    }

    // Calculate combined severity
    const combinedSeverity = Math.max(patternResults.maxSeverity, aiAnalysis.severity);
    let severityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (combinedSeverity >= 0.8) severityLevel = 'critical';
    else if (combinedSeverity >= 0.6) severityLevel = 'high';
    else if (combinedSeverity >= 0.3) severityLevel = 'medium';

    // Calculate combined confidence
    const combinedConfidence = Math.max(
      patternResults.concerns.reduce((max, c) => Math.max(max, c.confidence), 0),
      aiAnalysis.confidence
    );

    // Determine if mandatory reporting is required
    const requiresMandatoryReporting = severityLevel === 'critical' || 
      [DisclosureType.PHYSICAL_ABUSE, DisclosureType.SEXUAL_ABUSE, DisclosureType.NEGLECT].includes(disclosureType);

    // Determine if immediate intervention is required
    const requiresImmediateIntervention = severityLevel === 'critical' ||
      [DisclosureType.SUICIDAL_IDEATION, DisclosureType.SELF_HARM].includes(disclosureType);

    // Generate appropriate response
    const suggestedResponse = this.generateSuggestedResponse(disclosureType, severityLevel, request.userAge);

    // Determine if escalation is required
    const escalationRequired = severityLevel === 'high' || severityLevel === 'critical' || requiresMandatoryReporting;

    return {
      hasDisclosure,
      disclosureType,
      severity: combinedSeverity >= 0.8 ? 'critical' : combinedSeverity >= 0.6 ? 'high' : combinedSeverity >= 0.3 ? 'medium' : 'low',
      confidence: combinedConfidence,
      detectedConcerns: patternResults.concerns,
      requiresMandatoryReporting,
      requiresImmediateIntervention,
      suggestedResponse,
      escalationRequired
    };
  }

  private generateSuggestedResponse(
    disclosureType: DisclosureType, 
    severity: 'low' | 'medium' | 'high' | 'critical',
    userAge?: number
  ): string {
    const isYoungChild = userAge && userAge < 8;

    // Crisis responses for immediate danger
    if (disclosureType === DisclosureType.SUICIDAL_IDEATION) {
      return isYoungChild 
        ? "I'm really glad you told me how you're feeling. You're very important and there are people who want to help you feel better. Let's talk to a grown-up who can help right now."
        : "Thank you for trusting me with your feelings. What you're going through sounds really hard, and I want you to know that you matter and there are people who can help. Let's get you connected with someone who can support you right away.";
    }

    if (disclosureType === DisclosureType.SELF_HARM) {
      return isYoungChild
        ? "I'm concerned about you hurting yourself. You deserve to feel safe and happy. Let's talk to someone who can help you feel better in a safe way."
        : "I'm really concerned about what you've shared. Hurting yourself isn't something you should go through alone. There are people who understand and can help you find better ways to cope with difficult feelings.";
    }

    if ([DisclosureType.PHYSICAL_ABUSE, DisclosureType.SEXUAL_ABUSE].includes(disclosureType)) {
      return isYoungChild
        ? "Thank you for telling me. You're very brave. What happened to you is not okay, and it's not your fault. Let's make sure you're safe and get help from people who care about you."
        : "I'm really glad you felt safe enough to share this with me. What you've described is not okay, and I want you to know that it's not your fault. You deserve to be safe and protected. Let's get you connected with people who can help.";
    }

    if (disclosureType === DisclosureType.NEGLECT) {
      return isYoungChild
        ? "It sounds like things have been hard for you. Every child deserves to be taken care of. Let's talk to someone who can help make sure you have what you need."
        : "It sounds like you haven't been getting the care and support you need. That must be really difficult. Every young person deserves to have their basic needs met and to feel cared for.";
    }

    if (disclosureType === DisclosureType.BULLYING) {
      return isYoungChild
        ? "I'm sorry that kids are being mean to you. That's not okay, and you don't deserve to be treated that way. Let's think about ways to help you feel safer and happier."
        : "I'm sorry you're dealing with bullying. No one deserves to be treated that way, and it's not your fault. There are ways to address this situation and help you feel safer.";
    }

    if (disclosureType === DisclosureType.MENTAL_HEALTH_CRISIS) {
      return isYoungChild
        ? "It sounds like you're having some big, difficult feelings. That's okay - everyone has hard times. Let's talk to someone who can help you feel better."
        : "It sounds like you're going through a really tough time emotionally. Those feelings can be overwhelming, but you don't have to handle them alone. There are people who can help.";
    }

    // Default supportive response
    return isYoungChild
      ? "Thank you for sharing with me. I want to make sure you're okay. Let's talk to a grown-up who can help, and then we can create a wonderful story together."
      : "Thank you for trusting me with what you've shared. I want to make sure you get the support you need. Let's connect you with someone who can help, and then we can focus on creating something positive together.";
  }
}