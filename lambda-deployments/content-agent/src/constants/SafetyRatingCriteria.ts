/**
 * Therapeutic-Grade Safety Rating Criteria
 * 
 * These definitions are intentionally MORE STRICT than MPAA/industry standards
 * because Storytailor stories are therapeutic tools, not just entertainment.
 * 
 * Rigorous definitions ensure consistent AI evaluation across model updates.
 */

export type SafetyRating = 'G' | 'PG' | 'PG-13' | 'R';

export interface RatingCriteria {
  description: string;
  allowed: string[];
  forbidden: string[];
  examples: {
    acceptable: string[];
    unacceptable: string[];
  };
  note?: string;
}

/**
 * Complete safety rating criteria with explicit examples
 */
export const SAFETY_RATING_CRITERIA: Record<SafetyRating, RatingCriteria> = {
  'G': {
    description: 'Very safe for all children ages 3-10 (TARGET for all Storytailor content)',
    
    allowed: [
      'Friendly characters and animals in positive scenarios',
      'Gentle challenges (finding lost items, solving simple puzzles)',
      'Positive emotions: joy, curiosity, wonder, excitement',
      'Mild suspense: "What\'s behind the door?" "What surprise awaits?"',
      'Characters helping each other, sharing, cooperating',
      'Nature scenes, playful activities, learning moments',
      'Characters using wheelchairs, hearing aids, prosthetics, or other assistive devices shown with dignity',
      'Characters of diverse ethnicities, body types, and abilities',
      'Soft, warm, inviting environments',
      'Safe playground activities, gentle adventures',
      'Characters showing emotions like determination, focus, or thoughtfulness',
      'Inclusive representation of disabilities and differences',
      'Characters with Down syndrome, autism, vitiligo, etc. portrayed authentically'
    ],
    
    forbidden: [
      'Violence of ANY kind (even cartoon/comic)',
      'Kissing, romance, dating, holding hands romantically',
      'Characters in visible distress, crying profusely, or scared',
      'Blood, injuries, bruises, bandages, casts, medical equipment (except assistive devices)',
      'Medical procedures, hospital settings, doctors with needles',
      'Scary or threatening imagery or characters',
      'Fire, sharp objects, weapons (even toy swords/guns)',
      'Dark lighting, shadows creating fear, spooky environments',
      'Drugs, alcohol, cigarettes, medicines, pills',
      'Self-harm or dangerous behavior',
      'Strangers approaching children without trusted adult present',
      'Children alone in unsafe situations',
      'Realistic depictions of accidents or falls',
      'Character faces showing fear, terror, or pain',
      'Tight spaces that could trigger claustrophobia',
      'Heights depicted in scary way (vs. adventure way)',
      '"Fixing" or "normalizing" disabilities (wheelchair users standing, Down syndrome features smoothed)'
    ],
    
    examples: {
      acceptable: [
        'A child in a wheelchair exploring a colorful garden with butterflies',
        'Two friends building a sandcastle together on a sunny beach',
        'A character discovering a friendly butterfly in a meadow',
        'Child using a hearing aid listening to birds singing',
        'Character showing determination while solving a puzzle',
        'Child with prosthetic leg playing in a park',
        'Friends sharing a snack under a tree',
        'Character looking thoughtful while reading a book',
        'Child with Down syndrome laughing while playing with blocks',
        'Autistic character wearing colorful headphones, focused on patterns',
        'Character with vitiligo patches showing unique skin patterns confidently'
      ],
      unacceptable: [
        'A character crying or looking scared (even mildly)',
        'A character falling down stairs (even safely)',
        'A dark forest or spooky house',
        'Character with a bandage or any injury visible',
        'Two characters about to hug tightly (could imply romance)',
        'Child alone in a room without adult presence suggested',
        'Character wielding even a toy sword',
        'Medical setting of any kind',
        'Wheelchair user shown standing (erasing disability)',
        'Down syndrome features smoothed to look "typical" (AI bias)',
        'Dark skin lightened to medium tone (AI bias)',
        'Vitiligo patches removed or barely visible (AI bias)'
      ]
    },
    
    note: 'G-rated is TARGET for ALL Storytailor content. Images rated higher require adjustment.'
  },
  
  'PG': {
    description: 'Safe with mild challenges, suitable for ages 6-10 (ACCEPTABLE but less preferred)',
    
    allowed: [
      'Everything from G rating',
      'Mild physical comedy (character harmlessly slipping but getting up with smile)',
      'Slight challenge tension (climbing safe playground equipment with concentration)',
      'Cartoon-style obstacles in safe environment',
      'Characters showing determination, effort, or focus on task',
      'Mild weather challenges (gentle rain, light wind)',
      'Playful competition (races, games) with good sportsmanship'
    ],
    
    forbidden: [
      'Everything forbidden in G, plus:',
      'Visible injuries or pain expressions',
      'Blood or bodily fluids of any kind',
      'Realistic danger scenarios',
      'Any romantic elements whatsoever',
      'Weapons or combat (even cartoon)',
      'Realistic medical situations',
      'Characters in actual peril',
      'Scary environments or lighting'
    ],
    
    examples: {
      acceptable: [
        'A character confidently jumping over a small puddle',
        'Friends working together to reach something on a shelf',
        'A character showing determination while climbing playground ladder',
        'Child concentrating hard on building a tower',
        'Light rain in background with character holding umbrella',
        'Friendly race with all participants smiling'
      ],
      unacceptable: [
        'A character with even a small bandage',
        'Two characters about to kiss (even on cheek)',
        'A character wielding a toy sword',
        'Medical procedure of any kind',
        'Character looking genuinely frightened',
        'Realistic depiction of height or falling'
      ]
    }
  },
  
  'PG-13': {
    description: 'NOT ACCEPTABLE for Storytailor',
    allowed: [],
    forbidden: ['Everything - this rating triggers automatic rejection'],
    examples: {
      acceptable: [],
      unacceptable: ['Any content rated PG-13 by vision model']
    },
    note: 'If an image receives PG-13 rating, it MUST be regenerated with safety adjustments. Maximum 2 retries.'
  },
  
  'R': {
    description: 'ABSOLUTELY NOT ACCEPTABLE - Immediate rejection',
    allowed: [],
    forbidden: ['Everything - this rating triggers immediate failure'],
    examples: {
      acceptable: [],
      unacceptable: ['Any content rated R by vision model']
    },
    note: 'R-rated content should never occur with proper prompts. If it does, investigate prompt engineering.'
  }
};

/**
 * Build vision model prompt for safety review
 * Includes all criteria in detail for consistent evaluation
 */
export function buildSafetyReviewPrompt(
  targetRating: 'G' | 'PG',
  characterName?: string
): string {
  const criteria = SAFETY_RATING_CRITERIA[targetRating];
  
  const nameInstruction = characterName
    ? `The main child character in this story is named "${characterName}". When appropriate, refer to them by this name in the alt_text.`
    : `If the image clearly focuses on a child character, describe them in general terms without inventing a name.`;

  return `
You are a content safety reviewer for therapeutic children's storytelling (ages 3-10).

${nameInstruction}

TARGET RATING: ${targetRating}

RATING CRITERIA FOR ${targetRating}:

DESCRIPTION: ${criteria.description}

ALLOWED ELEMENTS:
${criteria.allowed.map(item => `• ${item}`).join('\n')}

STRICTLY FORBIDDEN:
${criteria.forbidden.map(item => `• ${item}`).join('\n')}

ACCEPTABLE EXAMPLES:
${criteria.examples.acceptable.map(item => `✓ ${item}`).join('\n')}

UNACCEPTABLE EXAMPLES:
${criteria.examples.unacceptable.map(item => `✗ ${item}`).join('\n')}

${criteria.note ? `\nNOTE: ${criteria.note}` : ''}

CRITICAL FOR INCLUSIVITY:
- Authentic representation of disabilities is REQUIRED (not erasure)
- Assistive devices, disability features must be visible (not "fixed")
- Down syndrome, vitiligo, prosthetics, etc. MUST be shown accurately
- AI bias toward "perfect" features is NOT acceptable

---

YOUR TASKS:
1. Analyze this image against the ${targetRating} criteria above
2. Assign rating: G, PG, PG-13, or R
3. Determine if image is child-safe based on Storytailor therapeutic standards
4. Check that inclusivity features are present (not erased by AI bias)
5. Identify specific elements that caused the rating (if above G)
6. Write alt text (20-60 words, descriptive, accessible, no "image of" prefix)
7. If not acceptable: provide MINIMAL prompt adjustments to remove ONLY unsafe elements
   - DO NOT change character identity, ethnicity, disabilities, or cultural markers
   - ONLY address safety violations

Return STRICT JSON:
{
  "rating": "G" | "PG" | "PG-13" | "R",
  "is_child_safe": boolean,
  "reasons": string[],
  "alt_text": string,
  "suggested_fix_prompt": string,
  "specific_violations": string[]
}
`.trim();
}

/**
 * Check if rating is acceptable for Storytailor standards
 */
export function isRatingAcceptable(
  rating: SafetyRating,
  targetRating: 'G' | 'PG'
): boolean {
  const order: SafetyRating[] = ['G', 'PG', 'PG-13', 'R'];
  const ratingIndex = order.indexOf(rating);
  const targetIndex = order.indexOf(targetRating);
  
  return ratingIndex <= targetIndex;
}
