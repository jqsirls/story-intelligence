import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  CommunicationAdaptationRequest,
  CommunicationAdaptationResult,
  Adaptation,
  SpecialNeed
} from '../types';

export class CommunicationAdaptationService {
  private openai: OpenAI;
  private logger: Logger;

  // Adaptation rules and patterns
  private readonly adaptationRules = {
    autism: {
      vocabulary: 'concrete and literal language',
      pace: 'slower with clear pauses',
      structure: 'predictable and organized',
      tone: 'calm and consistent',
      avoidMetaphors: true,
      useVisualCues: true
    },
    adhd: {
      vocabulary: 'engaging and dynamic',
      pace: 'varied to maintain attention',
      structure: 'short segments with breaks',
      tone: 'energetic but not overwhelming',
      useRepetition: true,
      breakIntoSteps: true
    },
    speech_delay: {
      vocabulary: 'simple and clear',
      pace: 'very slow with long pauses',
      structure: 'short sentences',
      tone: 'patient and encouraging',
      allowProcessingTime: true,
      useSimpleWords: true
    },
    hearing_impairment: {
      vocabulary: 'clear and descriptive',
      pace: 'slower with emphasis',
      structure: 'visual descriptions',
      tone: 'clear articulation',
      useVisualCues: true,
      avoidAudioOnlyContent: true
    },
    cognitive_delay: {
      vocabulary: 'very simple and concrete',
      pace: 'very slow with repetition',
      structure: 'step-by-step progression',
      tone: 'patient and supportive',
      useRepetition: true,
      breakIntoSmallSteps: true
    },
    motor_difficulties: {
      vocabulary: 'standard but patient',
      pace: 'allow extra response time',
      structure: 'flexible timing',
      tone: 'understanding and patient',
      allowLongPauses: true,
      noTimePresure: true
    },
    anxiety_disorder: {
      vocabulary: 'calm and reassuring',
      pace: 'gentle and unhurried',
      structure: 'predictable and safe',
      tone: 'soothing and supportive',
      avoidStressors: true,
      provideReassurance: true
    },
    processing_disorder: {
      vocabulary: 'clear and unambiguous',
      pace: 'slow with processing breaks',
      structure: 'linear and logical',
      tone: 'patient and clear',
      allowProcessingTime: true,
      useSimpleStructure: true
    }
  };

  private readonly vocabularyLevels = {
    simple: {
      maxSyllables: 2,
      maxSentenceLength: 8,
      avoidComplexGrammar: true,
      useCommonWords: true
    },
    standard: {
      maxSyllables: 3,
      maxSentenceLength: 12,
      allowModerateComplexity: true,
      useAgeAppropriate: true
    },
    advanced: {
      maxSyllables: 4,
      maxSentenceLength: 16,
      allowComplexGrammar: true,
      useRichVocabulary: true
    }
  };

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('CommunicationAdaptationService initialized');
  }

  async adaptMessage(request: CommunicationAdaptationRequest): Promise<CommunicationAdaptationResult> {
    try {
      // Analyze the current message
      const messageAnalysis = this.analyzeMessage(request.currentMessage);
      
      // Determine required adaptations
      const requiredAdaptations = this.determineAdaptations(request);
      
      // Apply adaptations
      let adaptedMessage = request.currentMessage;
      const adaptationsMade: Adaptation[] = [];

      // Apply vocabulary adaptations
      if (requiredAdaptations.vocabulary) {
        const vocabResult = await this.adaptVocabulary(adaptedMessage, request.communicationProfile.vocabularyLevel);
        adaptedMessage = vocabResult.adaptedText;
        adaptationsMade.push(...vocabResult.adaptations);
      }

      // Apply pace adaptations
      if (requiredAdaptations.pace) {
        const paceResult = this.adaptPace(adaptedMessage, request.communicationProfile.preferredPace);
        adaptedMessage = paceResult.adaptedText;
        adaptationsMade.push(...paceResult.adaptations);
      }

      // Apply structure adaptations
      if (requiredAdaptations.structure) {
        const structureResult = this.adaptStructure(adaptedMessage, request.specialNeeds);
        adaptedMessage = structureResult.adaptedText;
        adaptationsMade.push(...structureResult.adaptations);
      }

      // Apply tone adaptations
      if (requiredAdaptations.tone) {
        const toneResult = await this.adaptTone(adaptedMessage, request.specialNeeds, request.userAge);
        adaptedMessage = toneResult.adaptedText;
        adaptationsMade.push(...toneResult.adaptations);
      }

      // Apply length adaptations
      if (requiredAdaptations.length) {
        const lengthResult = this.adaptLength(adaptedMessage, request.communicationProfile.attentionSpan);
        adaptedMessage = lengthResult.adaptedText;
        adaptationsMade.push(...lengthResult.adaptations);
      }

      // Calculate estimated processing time
      const estimatedProcessingTime = this.calculateProcessingTime(
        adaptedMessage,
        request.communicationProfile.processingDelay,
        request.specialNeeds
      );

      // Generate follow-up suggestions
      const followUpSuggestions = this.generateFollowUpSuggestions(request);

      // Generate engagement strategy
      const engagementStrategy = this.generateEngagementStrategy(request);

      const result: CommunicationAdaptationResult = {
        adaptedMessage,
        adaptationsMade,
        estimatedProcessingTime,
        followUpSuggestions,
        engagementStrategy
      };

      this.logger.debug('Communication adaptation completed', {
        userId: request.userId,
        originalLength: request.currentMessage.length,
        adaptedLength: adaptedMessage.length,
        adaptationCount: adaptationsMade.length,
        estimatedProcessingTime
      });

      return result;

    } catch (error) {
      this.logger.error('Error in communication adaptation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });

      // Return original message with minimal adaptation
      return {
        adaptedMessage: request.currentMessage,
        adaptationsMade: [],
        estimatedProcessingTime: 3000, // Default 3 seconds
        followUpSuggestions: ['Take your time to respond', 'Let me know if you need me to repeat anything'],
        engagementStrategy: 'patient_and_supportive'
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
      this.logger.warn('CommunicationAdaptationService health check failed', { error });
      return false;
    }
  }

  private analyzeMessage(message: string): {
    wordCount: number;
    sentenceCount: number;
    averageWordsPerSentence: number;
    complexWords: string[];
    readingLevel: 'simple' | 'standard' | 'advanced';
  } {
    const words = message.split(/\s+/).filter(word => word.length > 0);
    const sentences = message.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    const complexWords = words.filter(word => 
      word.length > 6 || 
      /[^aeiouAEIOU\s]{3,}/.test(word) || // 3+ consecutive consonants
      word.includes('-') ||
      word.includes('\'')
    );

    const averageWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    
    let readingLevel: 'simple' | 'standard' | 'advanced' = 'standard';
    if (averageWordsPerSentence <= 8 && complexWords.length <= 2) {
      readingLevel = 'simple';
    } else if (averageWordsPerSentence >= 15 || complexWords.length >= 8) {
      readingLevel = 'advanced';
    }

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      averageWordsPerSentence,
      complexWords,
      readingLevel
    };
  }

  private determineAdaptations(request: CommunicationAdaptationRequest): {
    vocabulary: boolean;
    pace: boolean;
    structure: boolean;
    tone: boolean;
    length: boolean;
  } {
    const adaptations = {
      vocabulary: false,
      pace: false,
      structure: false,
      tone: false,
      length: false
    };

    // Check if vocabulary adaptation is needed
    if (request.communicationProfile.vocabularyLevel !== 'standard') {
      adaptations.vocabulary = true;
    }

    // Check if pace adaptation is needed
    if (request.communicationProfile.preferredPace !== 'normal' || 
        request.communicationProfile.processingDelay > 0) {
      adaptations.pace = true;
    }

    // Check if structure adaptation is needed based on special needs
    if (request.specialNeeds && request.specialNeeds.length > 0) {
      adaptations.structure = true;
      adaptations.tone = true;
    }

    // Check if length adaptation is needed based on attention span
    if (request.communicationProfile.attentionSpan < 30) { // Less than 30 seconds
      adaptations.length = true;
    }

    return adaptations;
  }

  private async adaptVocabulary(
    message: string, 
    vocabularyLevel: 'simple' | 'standard' | 'advanced'
  ): Promise<{ adaptedText: string; adaptations: Adaptation[] }> {
    if (vocabularyLevel === 'standard') {
      return { adaptedText: message, adaptations: [] };
    }

    try {
      const prompt = `Adapt the following message to ${vocabularyLevel} vocabulary level:

Original message: "${message}"

Requirements for ${vocabularyLevel} level:
${vocabularyLevel === 'simple' ? 
  '- Use simple, common words (1-2 syllables preferred)\n- Short sentences (8 words or less)\n- Avoid complex grammar\n- Use concrete, literal language' :
  '- Use rich, varied vocabulary\n- Complex sentence structures allowed\n- Advanced concepts and metaphors welcome\n- Longer sentences acceptable'
}

Respond with only the adapted message, maintaining the same meaning and tone.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in adapting communication for different vocabulary levels while preserving meaning and tone.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const adaptedText = response.choices[0]?.message?.content?.trim() || message;
      
      const adaptations: Adaptation[] = [];
      if (adaptedText !== message) {
        adaptations.push({
          type: 'vocabulary',
          originalElement: message,
          adaptedElement: adaptedText,
          reason: `Adapted to ${vocabularyLevel} vocabulary level`
        });
      }

      return { adaptedText, adaptations };

    } catch (error) {
      this.logger.warn('Vocabulary adaptation failed, using original message', { error });
      return { adaptedText: message, adaptations: [] };
    }
  }

  private adaptPace(
    message: string, 
    preferredPace: 'slow' | 'normal' | 'fast'
  ): { adaptedText: string; adaptations: Adaptation[] } {
    const adaptations: Adaptation[] = [];
    let adaptedText = message;

    if (preferredPace === 'slow') {
      // Add pauses and break up long sentences
      adaptedText = message
        .replace(/,/g, ', ... ') // Add pauses after commas
        .replace(/\./g, '. ... ') // Add pauses after periods
        .replace(/\?/g, '? ... ') // Add pauses after questions
        .replace(/!/g, '! ... '); // Add pauses after exclamations

      if (adaptedText !== message) {
        adaptations.push({
          type: 'pace',
          originalElement: message,
          adaptedElement: adaptedText,
          reason: 'Added pauses for slower pace'
        });
      }
    } else if (preferredPace === 'fast') {
      // Remove unnecessary pauses and make more concise
      adaptedText = message
        .replace(/\s+/g, ' ') // Remove extra spaces
        .replace(/,\s+/g, ', ') // Tighten comma spacing
        .trim();

      if (adaptedText !== message) {
        adaptations.push({
          type: 'pace',
          originalElement: message,
          adaptedElement: adaptedText,
          reason: 'Tightened pacing for faster delivery'
        });
      }
    }

    return { adaptedText, adaptations };
  }

  private adaptStructure(
    message: string, 
    specialNeeds?: SpecialNeed[]
  ): { adaptedText: string; adaptations: Adaptation[] } {
    const adaptations: Adaptation[] = [];
    let adaptedText = message;

    if (!specialNeeds || specialNeeds.length === 0) {
      return { adaptedText, adaptations };
    }

    // Apply structure adaptations based on special needs
    for (const need of specialNeeds) {
      const rules = this.adaptationRules[need.type];
      if (!rules) continue;

      if (rules.breakIntoSteps || rules.breakIntoSmallSteps) {
        // Break long sentences into shorter ones
        const sentences = adaptedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 0 && sentences.some(s => s.split(' ').length > 10)) {
          const shortenedSentences = sentences.map(sentence => {
            const words = sentence.trim().split(' ');
            if (words.length > 10) {
              // Break into smaller chunks
              const chunks = [];
              for (let i = 0; i < words.length; i += 6) {
                chunks.push(words.slice(i, i + 6).join(' '));
              }
              return chunks.join('. ');
            }
            return sentence.trim();
          });

          adaptedText = shortenedSentences.join('. ') + '.';
          
          adaptations.push({
            type: 'structure',
            originalElement: message,
            adaptedElement: adaptedText,
            reason: `Broke into smaller steps for ${need.type}`
          });
        }
      }

      if (rules.useVisualCues) {
        // Add visual structure cues
        if (!adaptedText.includes('•') && !adaptedText.includes('-')) {
          // Add bullet points if listing multiple things
          const listPattern = /(\w+),\s*(\w+),?\s*(and\s+\w+)?/g;
          if (listPattern.test(adaptedText)) {
            adaptedText = adaptedText.replace(listPattern, (match, first, second, third) => {
              let result = `• ${first}\n• ${second}`;
              if (third) {
                result += `\n• ${third.replace('and ', '')}`;
              }
              return result;
            });

            adaptations.push({
              type: 'structure',
              originalElement: message,
              adaptedElement: adaptedText,
              reason: `Added visual structure for ${need.type}`
            });
          }
        }
      }
    }

    return { adaptedText, adaptations };
  }

  private async adaptTone(
    message: string, 
    specialNeeds?: SpecialNeed[], 
    userAge?: number
  ): Promise<{ adaptedText: string; adaptations: Adaptation[] }> {
    if (!specialNeeds || specialNeeds.length === 0) {
      return { adaptedText: message, adaptations: [] };
    }

    try {
      const needsDescriptions = specialNeeds.map(need => {
        const rules = this.adaptationRules[need.type];
        return `${need.type} (${need.severity}): ${rules?.tone || 'supportive'}`;
      }).join(', ');

      const prompt = `Adapt the tone of this message for a child with special needs:

Original message: "${message}"

Special needs considerations: ${needsDescriptions}
Child's age: ${userAge || 'unknown'}

Adapt the tone to be:
- Patient and understanding
- Encouraging and supportive
- Appropriate for the child's needs
- Maintain the same core message

Respond with only the adapted message.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in adapting communication tone for children with special needs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const adaptedText = response.choices[0]?.message?.content?.trim() || message;
      
      const adaptations: Adaptation[] = [];
      if (adaptedText !== message) {
        adaptations.push({
          type: 'tone',
          originalElement: message,
          adaptedElement: adaptedText,
          reason: `Adapted tone for special needs: ${specialNeeds.map(n => n.type).join(', ')}`
        });
      }

      return { adaptedText, adaptations };

    } catch (error) {
      this.logger.warn('Tone adaptation failed, using original message', { error });
      return { adaptedText: message, adaptations: [] };
    }
  }

  private adaptLength(
    message: string, 
    attentionSpan: number
  ): { adaptedText: string; adaptations: Adaptation[] } {
    const adaptations: Adaptation[] = [];
    
    // Estimate reading time (average 200 words per minute for children)
    const words = message.split(/\s+/).length;
    const estimatedReadingTime = (words / 200) * 60; // in seconds

    if (estimatedReadingTime > attentionSpan) {
      // Need to shorten the message
      const targetWords = Math.floor((attentionSpan / 60) * 200);
      const wordsArray = message.split(/\s+/);
      
      if (wordsArray.length > targetWords) {
        // Keep the most important parts (beginning and end)
        const keepFromStart = Math.floor(targetWords * 0.7);
        const keepFromEnd = targetWords - keepFromStart;
        
        const adaptedWords = [
          ...wordsArray.slice(0, keepFromStart),
          '...',
          ...wordsArray.slice(-keepFromEnd)
        ];
        
        const adaptedText = adaptedWords.join(' ');
        
        adaptations.push({
          type: 'length',
          originalElement: message,
          adaptedElement: adaptedText,
          reason: `Shortened to fit ${attentionSpan}s attention span`
        });

        return { adaptedText, adaptations };
      }
    }

    return { adaptedText: message, adaptations };
  }

  private calculateProcessingTime(
    message: string, 
    baseProcessingDelay: number, 
    specialNeeds?: SpecialNeed[]
  ): number {
    // Base time: reading time + processing delay
    const words = message.split(/\s+/).length;
    const readingTime = (words / 150) * 1000; // ms (slower reading for children)
    let processingTime = readingTime + baseProcessingDelay;

    // Adjust for special needs
    if (specialNeeds) {
      for (const need of specialNeeds) {
        switch (need.type) {
          case 'speech_delay':
          case 'processing_disorder':
            processingTime *= need.severity === 'severe' ? 2.5 : need.severity === 'moderate' ? 2.0 : 1.5;
            break;
          case 'cognitive_delay':
            processingTime *= need.severity === 'severe' ? 3.0 : need.severity === 'moderate' ? 2.5 : 2.0;
            break;
          case 'autism':
            processingTime *= need.severity === 'severe' ? 2.0 : need.severity === 'moderate' ? 1.7 : 1.3;
            break;
          case 'adhd':
            // ADHD might actually process faster but need more time to focus
            processingTime *= need.severity === 'severe' ? 1.8 : need.severity === 'moderate' ? 1.5 : 1.2;
            break;
          case 'anxiety_disorder':
            processingTime *= need.severity === 'severe' ? 1.7 : need.severity === 'moderate' ? 1.4 : 1.2;
            break;
        }
      }
    }

    return Math.round(processingTime);
  }

  private generateFollowUpSuggestions(request: CommunicationAdaptationRequest): string[] {
    const suggestions: string[] = [];

    // Base suggestions
    suggestions.push('Take your time to think about it');
    suggestions.push('Let me know if you need me to explain anything');

    // Add special needs specific suggestions
    if (request.specialNeeds) {
      for (const need of request.specialNeeds) {
        switch (need.type) {
          case 'speech_delay':
            suggestions.push('You can take as long as you need to respond');
            suggestions.push('I can repeat anything if you need me to');
            break;
          case 'autism':
            suggestions.push('I can break this down into smaller steps if helpful');
            suggestions.push('Let me know if you need more specific details');
            break;
          case 'adhd':
            suggestions.push('We can take breaks whenever you need');
            suggestions.push('Feel free to ask questions if your mind wanders');
            break;
          case 'anxiety_disorder':
            suggestions.push('There\'s no pressure to respond quickly');
            suggestions.push('Remember, there are no wrong answers');
            break;
          case 'processing_disorder':
            suggestions.push('I can say this in a different way if it helps');
            suggestions.push('Take all the time you need to process this');
            break;
        }
      }
    }

    // Remove duplicates and limit to 4 suggestions
    return [...new Set(suggestions)].slice(0, 4);
  }

  private generateEngagementStrategy(request: CommunicationAdaptationRequest): string {
    if (!request.specialNeeds || request.specialNeeds.length === 0) {
      return 'patient_and_supportive';
    }

    // Determine primary engagement strategy based on most severe need
    const severestNeed = request.specialNeeds.reduce((prev, current) => {
      const severityOrder = { mild: 1, moderate: 2, severe: 3 };
      return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
    });

    switch (severestNeed.type) {
      case 'autism':
        return 'structured_and_predictable';
      case 'adhd':
        return 'dynamic_and_engaging';
      case 'speech_delay':
      case 'processing_disorder':
        return 'patient_and_slow_paced';
      case 'anxiety_disorder':
        return 'calm_and_reassuring';
      case 'cognitive_delay':
        return 'simple_and_repetitive';
      case 'motor_difficulties':
        return 'flexible_timing';
      case 'hearing_impairment':
        return 'visual_and_descriptive';
      default:
        return 'patient_and_supportive';
    }
  }
}