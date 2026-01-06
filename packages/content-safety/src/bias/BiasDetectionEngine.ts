import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  ContentSafetyRequest,
  BiasDetectionResult
} from '../types';

export class BiasDetectionEngine {
  private openai: OpenAI;
  private logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('BiasDetectionEngine initialized');
  }

  async detectBias(content: string, request: ContentSafetyRequest): Promise<BiasDetectionResult> {
    this.logger.debug('Running bias detection', {
      contentType: request.contentType,
      contentLength: content.length
    });

    try {
      // Run multiple bias detection analyses
      const [
        demographicBias,
        genderBias,
        culturalBias,
        abilityBias,
        socioeconomicBias
      ] = await Promise.all([
        this.detectDemographicBias(content),
        this.detectGenderBias(content),
        this.detectCulturalBias(content),
        this.detectAbilityBias(content),
        this.detectSocioeconomicBias(content)
      ]);

      // Analyze representation
      const representationAnalysis = await this.analyzeRepresentation(content, request);

      // Combine bias scores
      const biasCategories = {
        demographic: demographicBias.score,
        gender: genderBias.score,
        cultural: culturalBias.score,
        ability: abilityBias.score,
        socioeconomic: socioeconomicBias.score
      };

      const overallBiasScore = this.calculateOverallBiasScore(biasCategories);

      // Collect all detected biases
      const detectedBiases = [
        ...demographicBias.biases,
        ...genderBias.biases,
        ...culturalBias.biases,
        ...abilityBias.biases,
        ...socioeconomicBias.biases
      ];

      this.logger.debug('Bias detection completed', {
        overallBiasScore,
        detectedBiasCount: detectedBiases.length,
        biasCategories
      });

      return {
        overallBiasScore,
        biasCategories,
        detectedBiases,
        representationAnalysis
      };

    } catch (error) {
      this.logger.error('Error in bias detection', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return neutral result on error
      return {
        overallBiasScore: 0,
        biasCategories: {
          demographic: 0,
          gender: 0,
          cultural: 0,
          ability: 0,
          socioeconomic: 0
        },
        detectedBiases: [],
        representationAnalysis: {
          characters: {
            diversity: 0.5,
            stereotypes: []
          },
          themes: {
            inclusive: true,
            problematic: []
          }
        }
      };
    }
  }

  private async detectDemographicBias(content: string): Promise<{
    score: number;
    biases: Array<{ type: string; severity: number; examples: string[]; correction: string }>;
  }> {
    const biases: Array<{ type: string; severity: number; examples: string[]; correction: string }> = [];
    let score = 0;

    // Check for racial/ethnic stereotypes
    const racialStereotypes = [
      { pattern: /asian.*math|math.*asian/gi, type: 'racial_stereotype', severity: 0.7 },
      { pattern: /black.*athletic|athletic.*black/gi, type: 'racial_stereotype', severity: 0.6 },
      { pattern: /white.*privileged|privileged.*white/gi, type: 'racial_stereotype', severity: 0.5 },
      { pattern: /hispanic.*lazy|lazy.*hispanic/gi, type: 'racial_stereotype', severity: 0.8 },
      { pattern: /native.*alcoholic|alcoholic.*native/gi, type: 'racial_stereotype', severity: 0.9 }
    ];

    for (const stereotype of racialStereotypes) {
      const matches = content.match(stereotype.pattern);
      if (matches) {
        biases.push({
          type: stereotype.type,
          severity: stereotype.severity,
          examples: matches,
          correction: 'Avoid racial stereotypes and present diverse, individualized characters'
        });
        score = Math.max(score, stereotype.severity);
      }
    }

    // Check for age-based bias
    const ageBiasPatterns = [
      { pattern: /old.*slow|slow.*old/gi, type: 'age_bias', severity: 0.6 },
      { pattern: /young.*irresponsible|irresponsible.*young/gi, type: 'age_bias', severity: 0.5 },
      { pattern: /elderly.*confused|confused.*elderly/gi, type: 'age_bias', severity: 0.7 }
    ];

    for (const pattern of ageBiasPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        biases.push({
          type: pattern.type,
          severity: pattern.severity,
          examples: matches,
          correction: 'Present age groups with dignity and avoid age-based stereotypes'
        });
        score = Math.max(score, pattern.severity);
      }
    }

    return { score, biases };
  }

  private async detectGenderBias(content: string): Promise<{
    score: number;
    biases: Array<{ type: string; severity: number; examples: string[]; correction: string }>;
  }> {
    const biases: Array<{ type: string; severity: number; examples: string[]; correction: string }> = [];
    let score = 0;

    // Check for gender stereotypes
    const genderStereotypes = [
      { pattern: /girls.*emotional|emotional.*girls/gi, type: 'gender_stereotype', severity: 0.6 },
      { pattern: /boys.*strong|strong.*boys/gi, type: 'gender_stereotype', severity: 0.5 },
      { pattern: /women.*nurturing|nurturing.*women/gi, type: 'gender_stereotype', severity: 0.4 },
      { pattern: /men.*aggressive|aggressive.*men/gi, type: 'gender_stereotype', severity: 0.6 },
      { pattern: /girls.*pink|pink.*girls/gi, type: 'gender_stereotype', severity: 0.3 },
      { pattern: /boys.*blue|blue.*boys/gi, type: 'gender_stereotype', severity: 0.3 }
    ];

    for (const stereotype of genderStereotypes) {
      const matches = content.match(stereotype.pattern);
      if (matches) {
        biases.push({
          type: stereotype.type,
          severity: stereotype.severity,
          examples: matches,
          correction: 'Avoid gender stereotypes and show diverse traits across all genders'
        });
        score = Math.max(score, stereotype.severity);
      }
    }

    // Check for gendered language in professions
    const genderedProfessions = [
      { pattern: /male nurse|female doctor/gi, type: 'gendered_profession', severity: 0.5 },
      { pattern: /lady boss|woman driver/gi, type: 'gendered_profession', severity: 0.6 },
      { pattern: /working mom|stay-at-home dad/gi, type: 'gendered_profession', severity: 0.4 }
    ];

    for (const profession of genderedProfessions) {
      const matches = content.match(profession.pattern);
      if (matches) {
        biases.push({
          type: profession.type,
          severity: profession.severity,
          examples: matches,
          correction: 'Use gender-neutral language for professions and roles'
        });
        score = Math.max(score, profession.severity);
      }
    }

    return { score, biases };
  }

  private async detectCulturalBias(content: string): Promise<{
    score: number;
    biases: Array<{ type: string; severity: number; examples: string[]; correction: string }>;
  }> {
    const biases: Array<{ type: string; severity: number; examples: string[]; correction: string }> = [];
    let score = 0;

    // Check for cultural stereotypes
    const culturalStereotypes = [
      { pattern: /western.*civilized|civilized.*western/gi, type: 'cultural_superiority', severity: 0.8 },
      { pattern: /primitive.*culture|culture.*primitive/gi, type: 'cultural_bias', severity: 0.9 },
      { pattern: /exotic.*foreign|foreign.*exotic/gi, type: 'cultural_othering', severity: 0.6 },
      { pattern: /traditional.*backwards|backwards.*traditional/gi, type: 'cultural_bias', severity: 0.7 }
    ];

    for (const stereotype of culturalStereotypes) {
      const matches = content.match(stereotype.pattern);
      if (matches) {
        biases.push({
          type: stereotype.type,
          severity: stereotype.severity,
          examples: matches,
          correction: 'Present all cultures with respect and avoid hierarchical comparisons'
        });
        score = Math.max(score, stereotype.severity);
      }
    }

    // Check for religious bias
    const religiousBias = [
      { pattern: /christian.*good|good.*christian/gi, type: 'religious_bias', severity: 0.6 },
      { pattern: /muslim.*terrorist|terrorist.*muslim/gi, type: 'religious_bias', severity: 0.9 },
      { pattern: /jewish.*money|money.*jewish/gi, type: 'religious_bias', severity: 0.8 }
    ];

    for (const bias of religiousBias) {
      const matches = content.match(bias.pattern);
      if (matches) {
        biases.push({
          type: bias.type,
          severity: bias.severity,
          examples: matches,
          correction: 'Avoid religious stereotypes and present faith communities respectfully'
        });
        score = Math.max(score, bias.severity);
      }
    }

    return { score, biases };
  }

  private async detectAbilityBias(content: string): Promise<{
    score: number;
    biases: Array<{ type: string; severity: number; examples: string[]; correction: string }>;
  }> {
    const biases: Array<{ type: string; severity: number; examples: string[]; correction: string }> = [];
    let score = 0;

    // Check for ableist language
    const ableistLanguage = [
      { pattern: /\b(crazy|insane|psycho|mental)\b/gi, type: 'ableist_language', severity: 0.7 },
      { pattern: /\b(retarded|retard|spastic)\b/gi, type: 'ableist_slur', severity: 0.9 },
      { pattern: /\b(lame|dumb|blind to|deaf to)\b/gi, type: 'ableist_metaphor', severity: 0.5 },
      { pattern: /wheelchair bound|suffers from/gi, type: 'disability_language', severity: 0.6 }
    ];

    for (const language of ableistLanguage) {
      const matches = content.match(language.pattern);
      if (matches) {
        biases.push({
          type: language.type,
          severity: language.severity,
          examples: matches,
          correction: 'Use person-first language and avoid ableist terms'
        });
        score = Math.max(score, language.severity);
      }
    }

    // Check for disability stereotypes
    const disabilityStereotypes = [
      { pattern: /disabled.*inspiring|inspiring.*disabled/gi, type: 'inspiration_porn', severity: 0.6 },
      { pattern: /blind.*helpless|helpless.*blind/gi, type: 'disability_stereotype', severity: 0.7 },
      { pattern: /autistic.*genius|genius.*autistic/gi, type: 'disability_stereotype', severity: 0.5 }
    ];

    for (const stereotype of disabilityStereotypes) {
      const matches = content.match(stereotype.pattern);
      if (matches) {
        biases.push({
          type: stereotype.type,
          severity: stereotype.severity,
          examples: matches,
          correction: 'Present people with disabilities as complete individuals, not stereotypes'
        });
        score = Math.max(score, stereotype.severity);
      }
    }

    return { score, biases };
  }

  private async detectSocioeconomicBias(content: string): Promise<{
    score: number;
    biases: Array<{ type: string; severity: number; examples: string[]; correction: string }>;
  }> {
    const biases: Array<{ type: string; severity: number; examples: string[]; correction: string }> = [];
    let score = 0;

    // Check for class-based stereotypes
    const classStereotypes = [
      { pattern: /poor.*lazy|lazy.*poor/gi, type: 'class_stereotype', severity: 0.8 },
      { pattern: /rich.*smart|smart.*rich/gi, type: 'class_stereotype', severity: 0.6 },
      { pattern: /homeless.*dangerous|dangerous.*homeless/gi, type: 'class_stereotype', severity: 0.7 },
      { pattern: /welfare.*cheats|cheats.*welfare/gi, type: 'class_stereotype', severity: 0.8 }
    ];

    for (const stereotype of classStereotypes) {
      const matches = content.match(stereotype.pattern);
      if (matches) {
        biases.push({
          type: stereotype.type,
          severity: stereotype.severity,
          examples: matches,
          correction: 'Avoid stereotypes about economic status and present diverse socioeconomic perspectives'
        });
        score = Math.max(score, stereotype.severity);
      }
    }

    // Check for education bias
    const educationBias = [
      { pattern: /college.*successful|successful.*college/gi, type: 'education_bias', severity: 0.5 },
      { pattern: /dropout.*failure|failure.*dropout/gi, type: 'education_bias', severity: 0.6 },
      { pattern: /ivy league.*elite|elite.*ivy league/gi, type: 'education_bias', severity: 0.4 }
    ];

    for (const bias of educationBias) {
      const matches = content.match(bias.pattern);
      if (matches) {
        biases.push({
          type: bias.type,
          severity: bias.severity,
          examples: matches,
          correction: 'Present diverse paths to success and avoid educational elitism'
        });
        score = Math.max(score, bias.severity);
      }
    }

    return { score, biases };
  }

  private async analyzeRepresentation(
    content: string, 
    request: ContentSafetyRequest
  ): Promise<{
    characters: { diversity: number; stereotypes: string[] };
    themes: { inclusive: boolean; problematic: string[] };
  }> {
    // Use OpenAI to analyze representation
    try {
      const prompt = `Analyze the following content for representation and inclusivity:

Content: "${content}"

Please evaluate:
1. Character diversity (gender, race, ability, age, etc.)
2. Presence of stereotypes
3. Inclusive themes vs problematic themes

Respond with a JSON object containing:
- diversity_score (0-1)
- stereotypes (array of strings)
- inclusive_themes (boolean)
- problematic_themes (array of strings)`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');

      return {
        characters: {
          diversity: analysis.diversity_score || 0.5,
          stereotypes: analysis.stereotypes || []
        },
        themes: {
          inclusive: analysis.inclusive_themes !== false,
          problematic: analysis.problematic_themes || []
        }
      };

    } catch (error) {
      this.logger.warn('Failed to analyze representation with OpenAI', { error });
      
      // Fallback to simple heuristic analysis
      return this.simpleRepresentationAnalysis(content);
    }
  }

  private simpleRepresentationAnalysis(content: string): {
    characters: { diversity: number; stereotypes: string[] };
    themes: { inclusive: boolean; problematic: string[] };
  } {
    const lowerContent = content.toLowerCase();
    
    // Simple diversity indicators
    const diversityIndicators = [
      'different', 'diverse', 'various', 'many types',
      'all kinds', 'everyone', 'inclusive', 'multicultural'
    ];
    
    const diversityScore = diversityIndicators.reduce((score, indicator) => 
      score + (lowerContent.includes(indicator) ? 0.1 : 0), 0);

    // Simple stereotype detection
    const commonStereotypes = [
      'boys are strong', 'girls are pretty', 'old people are slow',
      'rich people are smart', 'poor people are lazy'
    ];
    
    const foundStereotypes = commonStereotypes.filter(stereotype => 
      lowerContent.includes(stereotype));

    // Simple problematic theme detection
    const problematicThemes = [
      'violence', 'discrimination', 'exclusion', 'bullying', 'hatred'
    ];
    
    const foundProblematic = problematicThemes.filter(theme => 
      lowerContent.includes(theme));

    return {
      characters: {
        diversity: Math.min(1, diversityScore),
        stereotypes: foundStereotypes
      },
      themes: {
        inclusive: foundProblematic.length === 0,
        problematic: foundProblematic
      }
    };
  }

  private calculateOverallBiasScore(biasCategories: {
    demographic: number;
    gender: number;
    cultural: number;
    ability: number;
    socioeconomic: number;
  }): number {
    // Weighted average of bias categories
    const weights = {
      demographic: 0.25,
      gender: 0.2,
      cultural: 0.25,
      ability: 0.15,
      socioeconomic: 0.15
    };

    return Object.entries(biasCategories).reduce((total, [category, score]) => {
      const weight = weights[category as keyof typeof weights] || 0;
      return total + (score * weight);
    }, 0);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with neutral content
      const testContent = 'A person went to the store and bought some groceries.';
      const testRequest: ContentSafetyRequest = {
        content: testContent,
        contentType: 'story',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'health_check',
          requestId: 'health_check'
        }
      };

      const result = await this.detectBias(testContent, testRequest);
      return result.overallBiasScore >= 0; // Should return a valid score
    } catch (error) {
      this.logger.error('BiasDetectionEngine health check failed', { error });
      return false;
    }
  }
}