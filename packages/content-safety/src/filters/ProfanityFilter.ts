import { Logger } from 'winston';
import {
  ContentSafetyRequest,
  PreGenerationFilter,
  PreFilterResult
} from '../types';

export class ProfanityFilter implements PreGenerationFilter {
  name = 'profanity_filter';
  priority = 70;
  enabled = true;

  private logger: Logger;
  private profanityList: Set<string>;
  private leetSpeakMap: Map<string, string>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeProfanityList();
    this.initializeLeetSpeakMap();
  }

  async filter(request: ContentSafetyRequest): Promise<PreFilterResult> {
    this.logger.debug('Running profanity filter', {
      contentType: request.contentType,
      contentLength: request.content.length
    });

    const warnings: string[] = [];
    const modifications: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      const content = request.content.toLowerCase();
      
      // Check for direct profanity
      const directProfanity = this.detectDirectProfanity(content);
      if (directProfanity.found.length > 0) {
        warnings.push(`Direct profanity detected: ${directProfanity.found.length} instances`);
        riskLevel = 'high';
      }

      // Check for leetspeak/obfuscated profanity
      const obfuscatedProfanity = this.detectObfuscatedProfanity(content);
      if (obfuscatedProfanity.found.length > 0) {
        warnings.push(`Obfuscated profanity detected: ${obfuscatedProfanity.found.length} instances`);
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      // Check for inappropriate slang
      const inappropriateSlang = this.detectInappropriateSlang(content);
      if (inappropriateSlang.found.length > 0) {
        warnings.push(`Inappropriate slang detected: ${inappropriateSlang.found.length} instances`);
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      // Check for context-based inappropriate language
      const contextualIssues = this.detectContextualInappropriateness(content, request);
      if (contextualIssues.found.length > 0) {
        warnings.push(`Contextually inappropriate language: ${contextualIssues.found.length} instances`);
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      // Age-specific profanity checks
      if (request.userAge) {
        const ageSpecificIssues = this.checkAgeSpecificLanguage(content, request.userAge);
        if (ageSpecificIssues.found.length > 0) {
          warnings.push(`Age-inappropriate language for ${request.userAge} year old`);
          riskLevel = 'high';
        }
      }

      this.logger.debug('Profanity filter completed', {
        riskLevel,
        warningCount: warnings.length,
        totalIssues: directProfanity.found.length + obfuscatedProfanity.found.length + 
                    inappropriateSlang.found.length + contextualIssues.found.length
      });

      return {
        allowed: riskLevel !== 'high',
        riskLevel,
        warnings: [...new Set(warnings)],
        modifications: [...new Set(modifications)]
      };

    } catch (error) {
      this.logger.error('Error in profanity filter', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        allowed: false,
        riskLevel: 'high',
        warnings: ['Profanity filter encountered an error'],
        modifications: []
      };
    }
  }

  private initializeProfanityList(): void {
    // Basic profanity list - in production, this would be more comprehensive
    // and loaded from a secure configuration
    this.profanityList = new Set([
      // Mild profanity
      'damn', 'hell', 'crap', 'piss', 'ass', 'bitch',
      // Strong profanity
      'fuck', 'shit', 'bastard', 'whore', 'slut',
      // Offensive terms
      'retard', 'faggot', 'nigger', 'chink', 'spic',
      // Religious profanity
      'goddamn', 'jesus christ', 'holy shit',
      // Body parts (inappropriate context)
      'penis', 'vagina', 'boobs', 'tits', 'cock', 'pussy',
      // Sexual terms
      'sex', 'sexual', 'porn', 'masturbate', 'orgasm'
    ]);
  }

  private initializeLeetSpeakMap(): void {
    this.leetSpeakMap = new Map([
      ['@', 'a'], ['4', 'a'], ['3', 'e'], ['1', 'i'], ['!', 'i'],
      ['0', 'o'], ['5', 's'], ['7', 't'], ['$', 's'], ['#', 'h'],
      ['+', 't'], ['|', 'l'], ['/', ''], ['\\', ''], ['-', ''],
      ['_', ''], ['.', ''], ['*', ''], ['%', '']
    ]);
  }

  private detectDirectProfanity(content: string): { found: string[]; severity: number } {
    const found: string[] = [];
    let severity = 0;

    // Check each word in the profanity list
    for (const profanity of this.profanityList) {
      const regex = new RegExp(`\\b${profanity}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        found.push(...matches);
        severity += matches.length * this.getProfanitySeverity(profanity);
      }
    }

    return { found, severity };
  }

  private detectObfuscatedProfanity(content: string): { found: string[]; severity: number } {
    const found: string[] = [];
    let severity = 0;

    // Convert leetspeak to normal text
    let normalizedContent = content;
    for (const [leet, normal] of this.leetSpeakMap) {
      normalizedContent = normalizedContent.replace(new RegExp(leet, 'g'), normal);
    }

    // Check for profanity in normalized content
    for (const profanity of this.profanityList) {
      const regex = new RegExp(`\\b${profanity}\\b`, 'gi');
      const matches = normalizedContent.match(regex);
      if (matches && !content.match(new RegExp(`\\b${profanity}\\b`, 'gi'))) {
        // Found obfuscated version
        found.push(...matches);
        severity += matches.length * this.getProfanitySeverity(profanity) * 1.5; // Higher severity for obfuscation
      }
    }

    // Check for character substitution patterns
    const substitutionPatterns = [
      { pattern: /f\*+ck/gi, word: 'fuck' },
      { pattern: /s\*+t/gi, word: 'shit' },
      { pattern: /b\*+ch/gi, word: 'bitch' },
      { pattern: /d\*+n/gi, word: 'damn' },
      { pattern: /h\*+l/gi, word: 'hell' }
    ];

    for (const { pattern, word } of substitutionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        found.push(...matches);
        severity += matches.length * this.getProfanitySeverity(word);
      }
    }

    return { found, severity };
  }

  private detectInappropriateSlang(content: string): { found: string[]; severity: number } {
    const found: string[] = [];
    let severity = 0;

    const inappropriateSlang = [
      'wtf', 'omfg', 'stfu', 'gtfo', 'milf', 'dilf',
      'thot', 'simp', 'incel', 'chad', 'karen',
      'boomer', 'zoomer', 'normie', 'based', 'cringe'
    ];

    for (const slang of inappropriateSlang) {
      const regex = new RegExp(`\\b${slang}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        found.push(...matches);
        severity += matches.length * 0.5; // Lower severity than direct profanity
      }
    }

    return { found, severity };
  }

  private detectContextualInappropriateness(
    content: string, 
    request: ContentSafetyRequest
  ): { found: string[]; severity: number } {
    const found: string[] = [];
    let severity = 0;

    // Context-specific inappropriate terms
    if (request.contentType === 'story' && request.userAge && request.userAge < 13) {
      const childInappropriate = [
        'sexy', 'hot', 'horny', 'aroused', 'turned on',
        'make out', 'hook up', 'one night stand',
        'drunk', 'wasted', 'high', 'stoned', 'blazed'
      ];

      for (const term of childInappropriate) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          found.push(...matches);
          severity += matches.length * 2; // Higher severity for children's content
        }
      }
    }

    // Educational content should avoid certain terms
    if (request.contentType === 'activity' || request.context?.userPreferences?.educational) {
      const educationallyInappropriate = [
        'stupid', 'dumb', 'idiot', 'moron', 'retard',
        'loser', 'failure', 'worthless', 'useless'
      ];

      for (const term of educationallyInappropriate) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          found.push(...matches);
          severity += matches.length * 1.5;
        }
      }
    }

    return { found, severity };
  }

  private checkAgeSpecificLanguage(content: string, age: number): { found: string[]; severity: number } {
    const found: string[] = [];
    let severity = 0;

    if (age < 5) {
      // Very strict for toddlers
      const toddlerInappropriate = [
        'poop', 'pee', 'fart', 'butt', 'stupid', 'hate',
        'kill', 'die', 'dead', 'blood', 'gun', 'knife'
      ];

      for (const term of toddlerInappropriate) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          found.push(...matches);
          severity += matches.length * 3; // Very high severity for toddlers
        }
      }
    } else if (age < 8) {
      // Strict for young children
      const youngChildInappropriate = [
        'stupid', 'dumb', 'hate', 'kill', 'die', 'dead',
        'blood', 'violence', 'fight', 'war', 'battle'
      ];

      for (const term of youngChildInappropriate) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          found.push(...matches);
          severity += matches.length * 2;
        }
      }
    } else if (age < 13) {
      // Moderate restrictions for pre-teens
      const preteenInappropriate = [
        'sexy', 'hot', 'horny', 'sexual', 'sex',
        'drunk', 'alcohol', 'beer', 'wine', 'drugs'
      ];

      for (const term of preteenInappropriate) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          found.push(...matches);
          severity += matches.length * 1.5;
        }
      }
    }

    return { found, severity };
  }

  private getProfanitySeverity(word: string): number {
    // Assign severity scores to different types of profanity
    const severityMap: Record<string, number> = {
      // Mild profanity
      'damn': 1, 'hell': 1, 'crap': 1, 'piss': 1,
      // Moderate profanity
      'ass': 2, 'bitch': 2, 'bastard': 2,
      // Strong profanity
      'fuck': 3, 'shit': 3,
      // Highly offensive
      'nigger': 5, 'faggot': 5, 'retard': 4,
      // Sexual content
      'cock': 3, 'pussy': 3, 'tits': 2, 'boobs': 1
    };

    return severityMap[word.toLowerCase()] || 1;
  }
}