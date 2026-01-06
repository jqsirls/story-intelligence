import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  InappropriateContentRequest,
  InappropriateContentResult,
  InappropriateCategory,
  EducationalOpportunity
} from '../types';

export class InappropriateContentHandler {
  private openai: OpenAI;
  private logger: Logger;

  // Inappropriate content patterns and keywords
  private readonly contentPatterns = {
    [InappropriateCategory.SEXUAL_CONTENT]: {
      keywords: ['sex', 'naked', 'private parts', 'touching', 'kiss', 'boyfriend', 'girlfriend'],
      phrases: ['take off clothes', 'show me', 'touch me', 'private areas'],
      contextClues: ['romantic', 'intimate', 'adult content', 'mature themes']
    },
    [InappropriateCategory.VIOLENCE]: {
      keywords: ['kill', 'murder', 'blood', 'gun', 'knife', 'fight', 'hurt', 'punch', 'kick'],
      phrases: ['hurt someone', 'make them bleed', 'use weapons', 'violent story'],
      contextClues: ['aggressive', 'harmful', 'dangerous actions', 'causing pain']
    },
    [InappropriateCategory.PROFANITY]: {
      keywords: ['damn', 'hell', 'stupid', 'idiot', 'shut up', 'hate'],
      phrases: ['bad words', 'curse words', 'mean language'],
      contextClues: ['inappropriate language', 'offensive terms', 'rude words']
    },
    [InappropriateCategory.HATE_SPEECH]: {
      keywords: ['hate', 'racist', 'discrimination', 'prejudice'],
      phrases: ['hate people', 'don\'t like because', 'they\'re different'],
      contextClues: ['discriminatory', 'prejudiced', 'intolerant', 'biased']
    },
    [InappropriateCategory.DANGEROUS_ACTIVITIES]: {
      keywords: ['fire', 'matches', 'climb', 'jump', 'dangerous', 'risky'],
      phrases: ['play with fire', 'dangerous stunts', 'risky behavior', 'unsafe activities'],
      contextClues: ['hazardous', 'unsafe', 'could get hurt', 'dangerous situation']
    },
    [InappropriateCategory.SUBSTANCE_USE]: {
      keywords: ['alcohol', 'beer', 'wine', 'drugs', 'smoking', 'cigarettes'],
      phrases: ['drinking alcohol', 'using drugs', 'smoking cigarettes', 'getting drunk'],
      contextClues: ['substance abuse', 'intoxication', 'addiction', 'illegal substances']
    },
    [InappropriateCategory.INAPPROPRIATE_RELATIONSHIPS]: {
      keywords: ['adult friend', 'secret relationship', 'older person', 'stranger'],
      phrases: ['adult boyfriend', 'secret friend', 'don\'t tell parents', 'special relationship'],
      contextClues: ['age inappropriate', 'secretive', 'adult-child relationship', 'grooming']
    },
    [InappropriateCategory.PERSONAL_INFORMATION]: {
      keywords: ['address', 'phone number', 'school name', 'real name', 'location'],
      phrases: ['where I live', 'my phone number', 'my school', 'my real name'],
      contextClues: ['personal details', 'identifying information', 'private data', 'location sharing']
    },
    [InappropriateCategory.SCARY_CONTENT]: {
      keywords: ['scary', 'monster', 'ghost', 'nightmare', 'frightening', 'terrifying'],
      phrases: ['really scary', 'give nightmares', 'too frightening', 'very scary'],
      contextClues: ['age inappropriate fear', 'traumatic content', 'disturbing imagery']
    }
  };

  // Educational opportunities for different inappropriate categories
  private readonly educationalOpportunities = {
    [InappropriateCategory.SEXUAL_CONTENT]: {
      topic: 'Body Safety and Privacy',
      ageAppropriateExplanation: 'Our bodies are private and special. Some topics are for when we\'re older.',
      teachingMoment: 'This is a great time to talk about body safety and appropriate boundaries.',
      parentGuidance: 'Consider having an age-appropriate conversation about body safety and privacy.'
    },
    [InappropriateCategory.VIOLENCE]: {
      topic: 'Conflict Resolution and Kindness',
      ageAppropriateExplanation: 'We solve problems with words, not by hurting others. Everyone deserves to feel safe.',
      teachingMoment: 'Let\'s explore how characters can solve problems peacefully and kindly.',
      parentGuidance: 'This could be an opportunity to discuss peaceful problem-solving and empathy.'
    },
    [InappropriateCategory.PROFANITY]: {
      topic: 'Respectful Communication',
      ageAppropriateExplanation: 'We use kind words that make others feel good. Some words can hurt people\'s feelings.',
      teachingMoment: 'Let\'s think of powerful, positive words that make our stories even better.',
      parentGuidance: 'Consider discussing the impact of words and the importance of respectful communication.'
    },
    [InappropriateCategory.HATE_SPEECH]: {
      topic: 'Diversity and Inclusion',
      ageAppropriateExplanation: 'Everyone is different and special in their own way. Differences make the world interesting.',
      teachingMoment: 'Let\'s create characters that celebrate how wonderful it is that we\'re all different.',
      parentGuidance: 'This is an opportunity to discuss diversity, inclusion, and treating everyone with respect.'
    },
    [InappropriateCategory.DANGEROUS_ACTIVITIES]: {
      topic: 'Safety and Risk Assessment',
      ageAppropriateExplanation: 'We want our characters to have adventures while staying safe. Safety first!',
      teachingMoment: 'Let\'s think of exciting but safe adventures our characters can have.',
      parentGuidance: 'Consider discussing safety rules and why we avoid dangerous activities.'
    },
    [InappropriateCategory.SUBSTANCE_USE]: {
      topic: 'Healthy Choices',
      ageAppropriateExplanation: 'We make choices that keep our bodies and minds healthy and strong.',
      teachingMoment: 'Let\'s focus on characters who make healthy choices and take care of themselves.',
      parentGuidance: 'This could be a good time to discuss making healthy choices and avoiding harmful substances.'
    },
    [InappropriateCategory.PERSONAL_INFORMATION]: {
      topic: 'Privacy and Internet Safety',
      ageAppropriateExplanation: 'Some information about us is private and should only be shared with trusted adults.',
      teachingMoment: 'Let\'s create characters with fun, made-up details instead of real personal information.',
      parentGuidance: 'Consider reviewing internet safety and the importance of keeping personal information private.'
    },
    [InappropriateCategory.SCARY_CONTENT]: {
      topic: 'Age-Appropriate Content',
      ageAppropriateExplanation: 'Stories should make us feel happy and excited, not scared or worried.',
      teachingMoment: 'Let\'s create an adventure that\'s exciting but not too scary.',
      parentGuidance: 'Consider discussing what types of content are appropriate for your child\'s age and sensitivity.'
    }
  };

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('InappropriateContentHandler initialized');
  }

  async handleInappropriateContent(request: InappropriateContentRequest): Promise<InappropriateContentResult> {
    try {
      // First pass: Pattern-based detection
      const patternResults = this.detectInappropriatePatterns(request.userInput, request.conversationContext);
      
      // Second pass: SI Enhanced contextual analysis
      const aiAnalysis = await this.performAIContentAnalysis(request);
      
      // Combine results
      const combinedResult = this.combineContentResults(patternResults, aiAnalysis, request);
      
      this.logger.info('Inappropriate content handling completed', {
        userId: request.userId,
        isInappropriate: combinedResult.isInappropriate,
        categories: combinedResult.inappropriateCategories,
        severity: combinedResult.severity,
        patternConcern: combinedResult.patternConcern
      });

      return combinedResult;

    } catch (error) {
      this.logger.error('Error in inappropriate content handling', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      
      // Return safe default with generic redirection
      return {
        isInappropriate: false,
        inappropriateCategories: [],
        severity: 'mild',
        confidence: 0,
        redirectionResponse: 'Let\'s create a fun, positive story together! What kind of adventure would you like to go on?',
        escalationRequired: false,
        patternConcern: false
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test OpenAI connection directly for health check
      await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Health check test' }],
        max_tokens: 10
      });
      return true;
    } catch (error) {
      this.logger.warn('InappropriateContentHandler health check failed', { error });
      return false;
    }
  }

  private detectInappropriatePatterns(userInput: string, conversationContext: string[]): {
    detectedCategories: InappropriateCategory[];
    maxSeverity: number;
    confidence: number;
  } {
    const detectedCategories: InappropriateCategory[] = [];
    let maxSeverity = 0;
    let totalConfidence = 0;
    let detectionCount = 0;

    const fullText = [userInput, ...conversationContext].join(' ').toLowerCase();

    // Check each inappropriate category
    Object.entries(this.contentPatterns).forEach(([category, patterns]) => {
      const inappropriateCategory = category as InappropriateCategory;
      let categoryScore = 0;
      let categoryConfidence = 0;

      // Check keywords
      patterns.keywords.forEach(keyword => {
        if (fullText.includes(keyword.toLowerCase())) {
          categoryScore += 0.3;
          categoryConfidence += 0.2;
        }
      });

      // Check phrases (higher weight)
      patterns.phrases.forEach(phrase => {
        if (fullText.includes(phrase.toLowerCase())) {
          categoryScore += 0.6;
          categoryConfidence += 0.4;
        }
      });

      // Check context clues
      patterns.contextClues.forEach(clue => {
        if (fullText.includes(clue.toLowerCase())) {
          categoryScore += 0.4;
          categoryConfidence += 0.3;
        }
      });

      // If we found indicators for this category
      if (categoryScore > 0.3) {
        detectedCategories.push(inappropriateCategory);
        maxSeverity = Math.max(maxSeverity, Math.min(categoryScore, 1.0));
        totalConfidence += Math.min(categoryConfidence, 1.0);
        detectionCount++;
      }
    });

    const averageConfidence = detectionCount > 0 ? totalConfidence / detectionCount : 0;

    return {
      detectedCategories,
      maxSeverity,
      confidence: averageConfidence
    };
  }

  private async performAIContentAnalysis(request: InappropriateContentRequest): Promise<{
    isInappropriate: boolean;
    categories: InappropriateCategory[];
    severity: 'mild' | 'moderate' | 'severe' | 'extreme';
    confidence: number;
    reasoning: string;
  }> {
    try {
      const contextText = request.conversationContext.join(' | ');
      
      const prompt = `You are a child safety expert analyzing content for appropriateness for children.

Analyze the following user input for inappropriate content:

User input: "${request.userInput}"
Conversation context: ${contextText}
Child's age: ${request.userAge || 'unknown'}
Previous inappropriate requests: ${request.previousInappropriateRequests}

Check for these categories of inappropriate content:
- Sexual content or romantic themes inappropriate for children
- Violence, aggression, or harmful behavior
- Profanity or inappropriate language
- Hate speech or discriminatory content
- Dangerous activities that could cause harm
- Substance use (alcohol, drugs, smoking)
- Inappropriate relationships (age-inappropriate romantic content)
- Requests for personal information
- Scary content inappropriate for the child's age

Respond with a JSON object:
{
  "isInappropriate": boolean,
  "categories": ["category1", "category2"],
  "severity": "mild|moderate|severe|extreme",
  "confidence": number (0-1 scale),
  "reasoning": "Brief explanation"
}

Consider the child's developmental stage and err on the side of caution for child safety.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a child safety expert analyzing content for age-appropriateness with sensitivity and care.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 400
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI analysis');
      }

      const analysis = JSON.parse(content);
      
      // Map string categories to enum values
      const mappedCategories = (analysis.categories || [])
        .map((cat: string) => {
          const categoryMap: Record<string, InappropriateCategory> = {
            'sexual_content': InappropriateCategory.SEXUAL_CONTENT,
            'violence': InappropriateCategory.VIOLENCE,
            'profanity': InappropriateCategory.PROFANITY,
            'hate_speech': InappropriateCategory.HATE_SPEECH,
            'dangerous_activities': InappropriateCategory.DANGEROUS_ACTIVITIES,
            'substance_use': InappropriateCategory.SUBSTANCE_USE,
            'inappropriate_relationships': InappropriateCategory.INAPPROPRIATE_RELATIONSHIPS,
            'personal_information': InappropriateCategory.PERSONAL_INFORMATION,
            'scary_content': InappropriateCategory.SCARY_CONTENT
          };
          return categoryMap[cat] || null;
        })
        .filter((cat: InappropriateCategory | null) => cat !== null);

      return {
        isInappropriate: analysis.isInappropriate || false,
        categories: mappedCategories,
        severity: analysis.severity || 'mild',
        confidence: Math.min(Math.max(analysis.confidence || 0, 0), 1),
        reasoning: analysis.reasoning || 'AI analysis completed'
      };

    } catch (error) {
      this.logger.warn('AI content analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        isInappropriate: false,
        categories: [],
        severity: 'mild',
        confidence: 0,
        reasoning: 'AI analysis unavailable'
      };
    }
  }

  private combineContentResults(
    patternResults: { detectedCategories: InappropriateCategory[]; maxSeverity: number; confidence: number },
    aiAnalysis: { isInappropriate: boolean; categories: InappropriateCategory[]; severity: 'mild' | 'moderate' | 'severe' | 'extreme'; confidence: number },
    request: InappropriateContentRequest
  ): InappropriateContentResult {
    
    // Combine detected categories
    const allCategories = [...new Set([...patternResults.detectedCategories, ...aiAnalysis.categories])];
    const isInappropriate = allCategories.length > 0 || aiAnalysis.isInappropriate;

    // Determine severity
    const severityMap = { mild: 0.25, moderate: 0.5, severe: 0.75, extreme: 1.0 };
    const aiSeverityScore = severityMap[aiAnalysis.severity];
    const combinedSeverityScore = Math.max(patternResults.maxSeverity, aiSeverityScore);
    
    let severity: 'mild' | 'moderate' | 'severe' | 'extreme' = 'mild';
    if (combinedSeverityScore >= 0.8) severity = 'extreme';
    else if (combinedSeverityScore >= 0.6) severity = 'severe';
    else if (combinedSeverityScore >= 0.4) severity = 'moderate';

    // Calculate combined confidence
    const combinedConfidence = Math.max(patternResults.confidence, aiAnalysis.confidence);

    // Generate redirection response
    const redirectionResponse = this.generateRedirectionResponse(allCategories, severity, request.userAge);

    // Generate educational opportunity if appropriate
    const educationalOpportunity = this.generateEducationalOpportunity(allCategories, request.userAge);

    // Determine if escalation is required
    const escalationRequired = severity === 'severe' || severity === 'extreme' || 
      request.previousInappropriateRequests >= 3;

    // Check for pattern concern
    const patternConcern = request.previousInappropriateRequests >= 2 || 
      (request.previousInappropriateRequests >= 1 && (severity === 'severe' || severity === 'extreme'));

    return {
      isInappropriate,
      inappropriateCategories: allCategories,
      severity,
      confidence: combinedConfidence,
      redirectionResponse,
      educationalOpportunity,
      escalationRequired,
      patternConcern
    };
  }

  private generateRedirectionResponse(
    categories: InappropriateCategory[], 
    severity: 'mild' | 'moderate' | 'severe' | 'extreme',
    userAge?: number
  ): string {
    const isYoungChild = userAge && userAge < 8;

    if (categories.length === 0) {
      return isYoungChild
        ? "Let's create a fun, happy story together! What kind of adventure would you like to go on?"
        : "I'd love to help you create an amazing story! What kind of positive adventure should we explore?";
    }

    // Handle specific categories with tailored responses
    if (categories.includes(InappropriateCategory.SEXUAL_CONTENT)) {
      return isYoungChild
        ? "That's a topic for when you're older! Let's create a fun adventure story instead. Maybe about exploring a magical forest?"
        : "That's a topic that's more appropriate for when you're older. How about we create an exciting adventure or friendship story instead?";
    }

    if (categories.includes(InappropriateCategory.VIOLENCE)) {
      return isYoungChild
        ? "Let's make a story where everyone is kind and safe! How about a story where characters help each other and solve problems together?"
        : "I'd prefer to create stories where characters solve problems peacefully. How about an adventure where the heroes use creativity and teamwork instead?";
    }

    if (categories.includes(InappropriateCategory.PROFANITY)) {
      return isYoungChild
        ? "We use kind, happy words in our stories! Let's think of some really cool, positive words that make our characters awesome."
        : "Let's use powerful, positive language that makes our characters really shine! What amazing qualities should our hero have?";
    }

    if (categories.includes(InappropriateCategory.DANGEROUS_ACTIVITIES)) {
      return isYoungChild
        ? "Safety first! Let's create an exciting adventure where everyone stays safe. Maybe our character could be a brave explorer who's also very careful?"
        : "Let's create thrilling adventures that are also safe! How about a story where the characters have exciting challenges but use smart thinking to stay safe?";
    }

    if (categories.includes(InappropriateCategory.SCARY_CONTENT)) {
      return isYoungChild
        ? "Let's make a story that's exciting but not scary! How about a magical adventure with friendly creatures and happy surprises?"
        : "How about we create something exciting but not too intense? Maybe an adventure with mystery and discovery, but with a positive, uplifting tone?";
    }

    // Generic redirection for other categories or multiple categories
    if (severity === 'extreme' || severity === 'severe') {
      return isYoungChild
        ? "That's not something we can include in our stories. Let's create something really fun and positive instead! What makes you happy?"
        : "That's not appropriate for our stories. I'd love to help you create something positive and engaging instead. What kind of uplifting story interests you?";
    }

    return isYoungChild
      ? "Let's try a different idea for our story! What's something that makes you smile? We could create a story about that!"
      : "Let's explore a different direction for our story. What positive themes or adventures interest you? I'm excited to create something amazing with you!";
  }

  private generateEducationalOpportunity(
    categories: InappropriateCategory[], 
    userAge?: number
  ): EducationalOpportunity | undefined {
    if (categories.length === 0) {
      return undefined;
    }

    // Use the first (most prominent) category for educational opportunity
    const primaryCategory = categories[0];
    const opportunity = this.educationalOpportunities[primaryCategory];

    if (!opportunity) {
      return undefined;
    }

    // Adapt explanation for age
    let ageAppropriateExplanation = opportunity.ageAppropriateExplanation;
    if (userAge && userAge < 6) {
      // Simplify for very young children
      ageAppropriateExplanation = ageAppropriateExplanation
        .replace(/\b\w{8,}\b/g, match => {
          // Replace long words with simpler alternatives
          const simplifications: Record<string, string> = {
            'appropriate': 'right',
            'boundaries': 'rules',
            'communication': 'talking',
            'respectful': 'nice',
            'diversity': 'differences',
            'substances': 'things that aren\'t good for you'
          };
          return simplifications[match.toLowerCase()] || match;
        });
    }

    return {
      topic: opportunity.topic,
      ageAppropriateExplanation,
      teachingMoment: opportunity.teachingMoment,
      parentGuidance: opportunity.parentGuidance
    };
  }
}