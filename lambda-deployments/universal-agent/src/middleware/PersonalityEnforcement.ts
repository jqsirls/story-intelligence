/**
 * Personality Enforcement Middleware
 * Validates all text output against Storytailor personality guidelines
 * Throws ERR_FORBIDDEN_TERM for violations
 */

export interface PersonalityValidationError extends Error {
  code: 'ERR_FORBIDDEN_TERM';
  term: string;
  suggestions: string[];
}

// Forbidden terminology that must be replaced with Story Intelligence™ branding
const FORBIDDEN_TERMS = [
  {
    term: 'AI-powered',
    replacements: ['Story Intelligence™ powered', 'SI Powered', 'powered by Story Intelligence™']
  },
  {
    term: 'AI-driven', 
    replacements: ['Story Intelligence™ enhanced', 'SI Enhanced', 'enhanced by Story Intelligence™']
  },
  {
    term: 'AI-led',
    replacements: ['Story Intelligence™ guided', 'SI Guided', 'guided by Story Intelligence™']
  },
  {
    term: 'personalized',
    replacements: ['age-appropriate', 'tailored', 'customized']
  },
  {
    term: 'GPT',
    replacements: ['Story Intelligence™', 'SI', 'advanced language technology']
  },
  {
    term: 'LLM',
    replacements: ['Story Intelligence™', 'SI', 'narrative intelligence']
  },
  {
    term: 'algorithm',
    replacements: ['Story Intelligence™', 'narrative framework', 'story creation system']
  },
  {
    term: 'machine learning',
    replacements: ['Story Intelligence™', 'adaptive storytelling', 'intelligent narrative system']
  }
];

// Business jargon that violates personality guidelines
const BUSINESS_JARGON = [
  'optimize', 'implement', 'leverage', 'utilize', 'solutioning', 'synergize'
];

/**
 * Validates text against personality guidelines
 * @param text Text to validate
 * @param context Context for validation (e.g., 'story_output', 'api_response')
 * @throws PersonalityValidationError if violations found
 */
export function validatePersonality(text: string, context: string = 'general'): void {
  const violations: { term: string; suggestions: string[] }[] = [];

  // Check for forbidden terms
  FORBIDDEN_TERMS.forEach(({ term, replacements }) => {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      violations.push({ term, suggestions: replacements });
    }
  });

  // Check for business jargon
  BUSINESS_JARGON.forEach(term => {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      violations.push({ 
        term, 
        suggestions: ['Use simple, clear language instead'] 
      });
    }
  });

  // Throw error for first violation found
  if (violations.length > 0) {
    const violation = violations[0];
    const error = new Error(
      `ERR_FORBIDDEN_TERM: "${violation.term}" violates personality guidelines. ` +
      `Suggestions: ${violation.suggestions.join(', ')}`
    ) as PersonalityValidationError;
    
    error.code = 'ERR_FORBIDDEN_TERM';
    error.term = violation.term;
    error.suggestions = violation.suggestions;
    
    throw error;
  }
}

/**
 * Validates sentence length (max 18 words for user-facing content)
 * @param text Text to validate
 * @param maxWords Maximum words allowed (default 18)
 * @throws Error if sentence exceeds word limit
 */
export function validateSentenceLength(text: string, maxWords: number = 18): void {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  for (const sentence of sentences) {
    const wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount > maxWords) {
      throw new Error(
        `ERR_SENTENCE_TOO_LONG: Sentence has ${wordCount} words (max ${maxWords}). ` +
        `Use shorter, punchier sentences for better engagement.`
      );
    }
  }
}

/**
 * Validates against passive voice usage
 * @param text Text to validate
 * @throws Error if passive voice detected in user-facing content
 */
export function validateActiveVoice(text: string): void {
  // Common passive voice patterns
  const passivePatterns = [
    /\b(is|are|was|were|being|been)\s+\w+ed\b/gi,
    /\b(is|are|was|were)\s+\w+en\b/gi,
    /\bwill be\s+\w+ed\b/gi
  ];

  for (const pattern of passivePatterns) {
    if (pattern.test(text)) {
      throw new Error(
        'ERR_PASSIVE_VOICE: Use active voice for more engaging storytelling. ' +
        'Transform passive constructions to active voice.'
      );
    }
  }
}

/**
 * Complete personality validation for all guidelines
 * @param text Text to validate
 * @param options Validation options
 */
export function validateComplete(
  text: string, 
  options: {
    context?: string;
    maxWords?: number;
    checkPassiveVoice?: boolean;
  } = {}
): void {
  const { context = 'general', maxWords = 18, checkPassiveVoice = true } = options;

  // Core terminology validation
  validatePersonality(text, context);
  
  // Sentence length validation (user-facing content only)
  if (context === 'story_output' || context === 'user_response') {
    validateSentenceLength(text, maxWords);
  }
  
  // Active voice validation (story content only)
  if (checkPassiveVoice && context === 'story_output') {
    validateActiveVoice(text);
  }
}

/**
 * Auto-correct common personality violations
 * @param text Text to correct
 * @returns Corrected text
 */
export function autoCorrectPersonality(text: string): string {
  let correctedText = text;

  FORBIDDEN_TERMS.forEach(({ term, replacements }) => {
    const regex = new RegExp(term, 'gi');
    correctedText = correctedText.replace(regex, replacements[0]);
  });

  return correctedText;
}

/**
 * Middleware function for Express routes
 */
export function personalityMiddleware() {
  return (req: any, res: any, next: any) => {
    // Wrap res.json to validate responses
    const originalJson = res.json;
    res.json = function(obj: any) {
      try {
        // Validate response content if it contains user-facing text
        if (obj && typeof obj === 'object') {
          const textFields = ['message', 'content', 'story', 'response'];
          textFields.forEach(field => {
            if (obj[field] && typeof obj[field] === 'string') {
              validateComplete(obj[field], { context: 'api_response' });
            }
          });
        }
        return originalJson.call(this, obj);
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          return originalJson.call(this, {
            success: false,
            error: error.message,
            code: (error as any).code
          });
        }
        throw error;
      }
    };
    next();
  };
}