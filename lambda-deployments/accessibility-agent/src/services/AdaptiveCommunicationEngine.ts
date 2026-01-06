import { SupabaseClient } from '@supabase/supabase-js';
import {
  AccessibilityProfile,
  CommunicationAdaptation,
  ResponseAdaptation,
  AdaptationError,
} from '../types';

export class AdaptiveCommunicationEngine {
  constructor(private supabase: SupabaseClient) {}

  async adaptResponse(
    originalResponse: string,
    profile: AccessibilityProfile,
    context?: any
  ): Promise<string> {
    try {
      let adaptedResponse = originalResponse;
      const adaptationTypes: (
        'simplified_vocabulary' |
        'slower_pace' |
        'shorter_sentences' |
        'visual_cues' |
        'repetition' |
        'structured_format' |
        'memory_aids'
      )[] = [];

      // Apply vocabulary simplification
      if (profile.vocabularyLevel === 'simple' || profile.simplifiedLanguageMode) {
        adaptedResponse = await this.simplifyVocabulary(adaptedResponse, profile);
        adaptationTypes.push('simplified_vocabulary');
      }

      // Apply sentence structure simplification
      if (profile.simplifiedLanguageMode || profile.attentionSpanMinutes < 10) {
        adaptedResponse = this.simplifySentenceStructure(adaptedResponse);
        adaptationTypes.push('shorter_sentences');
      }

      // Add memory aids if enabled
      if (profile.memoryAidsEnabled) {
        adaptedResponse = this.addMemoryAids(adaptedResponse, context);
        adaptationTypes.push('memory_aids');
      }

      // Add repetition if needed
      if (profile.repetitionFrequency > 1) {
        adaptedResponse = this.addRepetition(adaptedResponse, profile.repetitionFrequency);
        adaptationTypes.push('repetition');
      }

      // Structure prompts if needed
      if (profile.structuredPrompts) {
        adaptedResponse = this.structurePrompts(adaptedResponse);
        adaptationTypes.push('structured_format');
      }

      // Add visual cues if enabled
      if (profile.visualCuesEnabled) {
        adaptedResponse = this.addVisualCues(adaptedResponse);
        adaptationTypes.push('visual_cues');
      }

      // Log the adaptation
      await this.logAdaptation({
        originalResponse,
        adaptedResponse,
        adaptationTypes,
        targetProfile: profile.id,
      });

      return adaptedResponse;
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to adapt response: ${message}`, { originalResponse, profile: profile.id });
    }
  }

  async processSpeechDelay(
    input: string,
    profile: AccessibilityProfile,
    sessionId: string
  ): Promise<{ processedInput: string; delayApplied: number }> {
    try {
      const delayApplied = profile.speechProcessingDelay;
      
      // If no delay needed, return immediately
      if (delayApplied === 0) {
        return { processedInput: input, delayApplied: 0 };
      }

      // Apply processing delay
      await new Promise(resolve => setTimeout(resolve, delayApplied));

      // Process input with additional time for comprehension
      let processedInput = input;

      // Apply additional processing for speech difficulties
      if (profile.extendedResponseTime) {
        processedInput = await this.enhanceSpeechProcessing(input, profile);
      }

      // Log the adaptation
      await this.logCommunicationAdaptation({
        userId: profile.userId,
        sessionId,
        adaptationType: 'speech_delay',
        originalInput: input,
        adaptedResponse: processedInput,
        adaptationReason: `Applied ${delayApplied}ms speech processing delay`,
        timestamp: new Date(),
      });

      return { processedInput, delayApplied };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process speech delay: ${message}`, { input, profile: profile.id });
    }
  }

  private async simplifyVocabulary(text: string, profile: AccessibilityProfile): Promise<string> {
    // Simple vocabulary replacements
    const vocabularyMap: Record<string, string> = {
      // Complex to simple word mappings
      'magnificent': 'great',
      'extraordinary': 'amazing',
      'tremendous': 'big',
      'fascinating': 'cool',
      'adventure': 'trip',
      'journey': 'trip',
      'discover': 'find',
      'explore': 'look around',
      'mysterious': 'strange',
      'incredible': 'amazing',
      'wonderful': 'great',
      'fantastic': 'great',
      'marvelous': 'great',
      'spectacular': 'amazing',
      'enormous': 'very big',
      'tiny': 'very small',
      'gigantic': 'huge',
      'miniature': 'small',
    };

    let simplifiedText = text;

    // Apply custom vocabulary terms if available
    for (const term of profile.customVocabularyTerms) {
      const [complex, simple] = term.split(':');
      if (complex && simple) {
        const regex = new RegExp(`\\b${complex}\\b`, 'gi');
        simplifiedText = simplifiedText.replace(regex, simple);
      }
    }

    // Apply standard vocabulary simplifications
    for (const [complex, simple] of Object.entries(vocabularyMap)) {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplifiedText = simplifiedText.replace(regex, simple);
    }

    return simplifiedText;
  }

  private simplifySentenceStructure(text: string): string {
    // Break long sentences into shorter ones
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const simplifiedSentences: string[] = [];

    for (const sentence of sentences) {
      const words = sentence.trim().split(' ');
      
      // If sentence is too long, break it down
      if (words.length > 12) {
        // Find natural break points (conjunctions, commas)
        const breakPoints = ['and', 'but', 'or', 'so', 'because', 'when', 'while', 'if'];
        let currentSentence: string[] = [];
        
        for (const word of words) {
          currentSentence.push(word);
          
          if (breakPoints.includes(word.toLowerCase()) && currentSentence.length > 6) {
            simplifiedSentences.push(currentSentence.slice(0, -1).join(' ') + '.');
            currentSentence = [word];
          }
        }
        
        if (currentSentence.length > 0) {
          simplifiedSentences.push(currentSentence.join(' ') + '.');
        }
      } else {
        simplifiedSentences.push(sentence.trim() + '.');
      }
    }

    return simplifiedSentences.join(' ');
  }

  private addMemoryAids(text: string, context?: any): string {
    // Add contextual reminders and memory aids
    let enhancedText = text;

    // Add character name reminders
    if (context?.characterName) {
      enhancedText = enhancedText.replace(
        /\b(he|she|they)\b/gi,
        `$1 (${context.characterName})`
      );
    }

    // Add location reminders
    if (context?.location) {
      enhancedText += ` Remember, we're in ${context.location}.`;
    }

    // Add story progress reminders
    if (context?.storyProgress) {
      enhancedText = `So far in our story: ${context.storyProgress}. ${enhancedText}`;
    }

    return enhancedText;
  }

  private addRepetition(text: string, frequency: number): string {
    if (frequency <= 1) return text;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const repeatedSentences: string[] = [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 0) {
        // Add the original sentence
        repeatedSentences.push(trimmed + '.');
        
        // Add repetitions with slight variations
        for (let i = 1; i < frequency; i++) {
          const variations = [
            `Let me say that again: ${trimmed}.`,
            `In other words, ${trimmed}.`,
            `To repeat, ${trimmed}.`,
          ];
          repeatedSentences.push(variations[i % variations.length]);
        }
      }
    }

    return repeatedSentences.join(' ');
  }

  private structurePrompts(text: string): string {
    // Add clear structure to prompts
    const structuredText = text
      .replace(/^/, '🎯 ')  // Add target emoji at start
      .replace(/\?$/, '? 🤔')  // Add thinking emoji after questions
      .replace(/!$/, '! ✨');  // Add sparkle emoji after exclamations

    // Add numbered steps if multiple instructions
    const sentences = structuredText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) {
      return sentences
        .map((sentence, index) => `${index + 1}. ${sentence.trim()}.`)
        .join('\n');
    }

    return structuredText;
  }

  private addVisualCues(text: string): string {
    // Add visual cues and emojis for better comprehension
    const cueMap: Record<string, string> = {
      'happy': '😊',
      'sad': '😢',
      'excited': '🎉',
      'scared': '😰',
      'angry': '😠',
      'surprised': '😲',
      'thinking': '🤔',
      'question': '❓',
      'important': '⚠️',
      'good': '👍',
      'bad': '👎',
      'yes': '✅',
      'no': '❌',
      'story': '📚',
      'character': '👤',
      'adventure': '🗺️',
      'magic': '✨',
      'forest': '🌲',
      'castle': '🏰',
      'dragon': '🐉',
      'princess': '👸',
      'prince': '🤴',
    };

    let enhancedText = text;

    for (const [word, emoji] of Object.entries(cueMap)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      enhancedText = enhancedText.replace(regex, `${word} ${emoji}`);
    }

    return enhancedText;
  }

  private async enhanceSpeechProcessing(input: string, profile: AccessibilityProfile): Promise<string> {
    // Enhanced processing for speech difficulties
    let processedInput = input;

    // Normalize common speech patterns
    const speechPatterns: Record<string, string> = {
      'um': '',
      'uh': '',
      'like': '',
      'you know': '',
    };

    for (const [pattern, replacement] of Object.entries(speechPatterns)) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      processedInput = processedInput.replace(regex, replacement);
    }

    // Clean up extra spaces
    processedInput = processedInput.replace(/\s+/g, ' ').trim();

    return processedInput;
  }

  private async logAdaptation(adaptation: ResponseAdaptation): Promise<void> {
    try {
      await this.supabase
        .from('response_adaptations')
        .insert({
          ...adaptation,
          timestamp: new Date(),
        });
    } catch (error: unknown) {
      // Log error but don't throw - adaptation logging shouldn't break the main flow
      console.error('Failed to log response adaptation:', error);
    }
  }

  private async logCommunicationAdaptation(adaptation: CommunicationAdaptation): Promise<void> {
    try {
      await this.supabase
        .from('communication_adaptations')
        .insert(adaptation);
    } catch (error: unknown) {
      // Log error but don't throw - adaptation logging shouldn't break the main flow
      console.error('Failed to log communication adaptation:', error);
    }
  }
}