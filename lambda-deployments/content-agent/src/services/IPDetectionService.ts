/**
 * IP Detection Service
 * 
 * Detects copyrighted characters (IP) in story content and character names.
 * Provides attribution information with clear ownership disclaimers and personal use messaging.
 * Includes Redis caching for performance optimization.
 */

import { getIPAttribution, fuzzyMatchIP, IP_ATTRIBUTION_DB } from '../data/ipAttributionDatabase';
import * as crypto from 'crypto';

export interface IPDetectionResult {
  character: string;
  franchise: string;
  owner: string;
  confidence: 'high' | 'medium' | 'low';
  attributionText: string;
  personalUseMessage: string;
  ownershipDisclaimer: string;
}

export interface IPDetectionServiceConfig {
  redis?: any; // Redis client (optional)
  enableCache?: boolean;
  cacheTTL?: number; // TTL in seconds (default: 86400 = 24 hours)
}

export class IPDetectionService {
  private redis: any = null;
  private enableCache: boolean;
  private cacheTTL: number;

  constructor(config?: IPDetectionServiceConfig) {
    this.redis = config?.redis || null;
    this.enableCache = config?.enableCache !== false && this.redis !== null;
    this.cacheTTL = config?.cacheTTL || 86400; // 24 hours default
  }
  /**
   * Detect IP in story content and character names
   * @param storyContent - The full story text content
   * @param characterNames - Array of character names extracted from the story
   * @returns Array of IP detection results
   */
  async detectIP(storyContent: string, characterNames: string[]): Promise<IPDetectionResult[]> {
    // Check cache first
    if (this.enableCache) {
      const cacheKey = this.getCacheKey(storyContent, characterNames);
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const startTime = Date.now();
    const results: IPDetectionResult[] = [];
    const detectedCharacters = new Set<string>();

    // First, check character names (exact and fuzzy matching)
    for (const name of characterNames) {
      if (!name || name.trim().length === 0) continue;
      
      const result = await this.matchCharacterNameCached(name);
      if (result && !detectedCharacters.has(result.character.toLowerCase())) {
        results.push(result);
        detectedCharacters.add(result.character.toLowerCase());
      }
    }

    // Then, analyze story content with NLP patterns
    const contentResults = this.analyzeContentWithNLP(storyContent);
    for (const result of contentResults) {
      const key = result.character.toLowerCase();
      if (!detectedCharacters.has(key)) {
        results.push(result);
        detectedCharacters.add(key);
      }
    }

    const detectionTime = Date.now() - startTime;

    // Cache results
    if (this.enableCache && results.length > 0) {
      const cacheKey = this.getCacheKey(storyContent, characterNames);
      await this.setCachedResult(cacheKey, results, detectionTime);
    }

    return results;
  }

  /**
   * Get cache key for story content and character names
   */
  private getCacheKey(storyContent: string, characterNames: string[]): string {
    const content = `${storyContent}|${characterNames.sort().join(',')}`;
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `ip_detection:${hash}`;
  }

  /**
   * Get cached detection result
   */
  private async getCachedResult(cacheKey: string): Promise<IPDetectionResult[] | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Cache miss or error - continue with detection
      console.error('Cache read error', error);
    }

    return null;
  }

  /**
   * Cache detection result
   */
  private async setCachedResult(
    cacheKey: string,
    results: IPDetectionResult[],
    detectionTime: number
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const cacheValue = JSON.stringify({
        results,
        detectionTime,
        cachedAt: new Date().toISOString(),
      });
      await this.redis.setex(cacheKey, this.cacheTTL, cacheValue);
    } catch (error) {
      // Cache write error - log but don't fail
      console.error('Cache write error', error);
    }
  }

  /**
   * Match character name with caching
   */
  private async matchCharacterNameCached(characterName: string): Promise<IPDetectionResult | null> {
    if (!this.enableCache) {
      return this.matchCharacterName(characterName);
    }

    const cacheKey = `ip_char:${characterName.toLowerCase()}`;
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Cache miss - continue
    }

    const result = this.matchCharacterName(characterName);
    
    if (result) {
      try {
        // Cache character lookup permanently (no TTL)
        await this.redis.set(cacheKey, JSON.stringify(result));
      } catch (error) {
        // Cache write error - continue
      }
    }

    return result;
  }

  /**
   * Match character name against IP database
   * @param characterName - The character name to check
   * @returns IP detection result if found, null otherwise
   */
  private matchCharacterName(characterName: string): IPDetectionResult | null {
    const normalizedName = characterName.trim();
    
    // Try exact match first (high confidence)
    let entry = getIPAttribution(normalizedName);
    let confidence: 'high' | 'medium' | 'low' = 'high';
    let matchedCharacter = normalizedName;

    // If no exact match, try fuzzy match (medium confidence)
    if (!entry) {
      entry = fuzzyMatchIP(normalizedName);
      confidence = 'medium';
    }

    // If still no match, try case-insensitive and variant matching (low confidence)
    if (!entry) {
      const lowerName = normalizedName.toLowerCase();
      for (const [key, value] of Object.entries(IP_ATTRIBUTION_DB)) {
        if (key.toLowerCase() === lowerName) {
          entry = value;
          matchedCharacter = key;
          confidence = 'medium';
          break;
        }
        if (value.variants?.some(v => v.toLowerCase() === lowerName)) {
          entry = value;
          matchedCharacter = key;
          confidence = 'low';
          break;
        }
      }
    }

    if (!entry) {
      return null;
    }

    return {
      character: matchedCharacter,
      franchise: entry.franchise,
      owner: entry.owner,
      confidence,
      attributionText: this.getAttributionText(matchedCharacter, entry.owner),
      personalUseMessage: this.getPersonalUseMessage(),
      ownershipDisclaimer: this.getOwnershipDisclaimer(matchedCharacter, entry.owner),
    };
  }

  /**
   * Analyze story content with NLP patterns to detect IP
   * @param content - The story content to analyze
   * @returns Array of IP detection results
   */
  private analyzeContentWithNLP(content: string): IPDetectionResult[] {
    const results: IPDetectionResult[] = [];
    const contentLower = content.toLowerCase();

    // Pattern matching for character descriptions
    const patterns: Array<{ pattern: RegExp; character: string; franchise: string; owner: string }> = [
      // Marvel patterns
      { pattern: /web[-\s]?slinging|spider[-\s]?sense|uncle ben/i, character: 'Spiderman', franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
      { pattern: /arc reactor|iron suit|tony stark/i, character: 'Iron Man', franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
      { pattern: /vibranium|wakanda|black panther/i, character: 'Black Panther', franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
      { pattern: /mjolnir|asgard|thunder god/i, character: 'Thor', franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
      { pattern: /hulk smash|bruce banner|gamma radiation/i, character: 'Hulk', franchise: 'Marvel', owner: 'Marvel Comics (Disney)' },
      
      // DC patterns
      { pattern: /gotham city|bat[-\s]?signal|wayne manor|dark knight/i, character: 'Batman', franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
      { pattern: /krypton|super[-\s]?strength|flying|clark kent/i, character: 'Superman', franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
      { pattern: /themyscira|lasso of truth|amazon warrior/i, character: 'Wonder Woman', franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
      { pattern: /speed force|flash|barry allen/i, character: 'The Flash', franchise: 'DC Comics', owner: 'DC Comics (Warner Bros.)' },
      
      // Disney patterns
      { pattern: /let it go|frozen|ice powers|arendelle/i, character: 'Elsa', franchise: 'Disney', owner: 'The Walt Disney Company' },
      { pattern: /prince charming|glass slipper|cinderella/i, character: 'Cinderella', franchise: 'Disney', owner: 'The Walt Disney Company' },
      { pattern: /seven dwarfs|poison apple|snow white/i, character: 'Snow White', franchise: 'Disney', owner: 'The Walt Disney Company' },
      { pattern: /under the sea|mermaid|ariel/i, character: 'Ariel', franchise: 'Disney', owner: 'The Walt Disney Company' },
      { pattern: /beast|enchanted rose|belle/i, character: 'Belle', franchise: 'Disney', owner: 'The Walt Disney Company' },
      { pattern: /magic carpet|genie|aladdin/i, character: 'Aladdin', franchise: 'Disney', owner: 'The Walt Disney Company' },
      { pattern: /hakuna matata|simba|pride rock/i, character: 'Simba', franchise: 'Disney', owner: 'The Walt Disney Company' },
      { pattern: /to infinity and beyond|buzz lightyear/i, character: 'Buzz Lightyear', franchise: 'Disney', owner: 'The Walt Disney Company' },
      { pattern: /you\'ve got a friend in me|woody/i, character: 'Woody', franchise: 'Disney', owner: 'The Walt Disney Company' },
      
      // Tier A Global Giants (Ages 3-10)
      // PAW Patrol patterns
      { pattern: /paw patrol|adventure bay|puppy power/i, character: 'PAW Patrol', franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
      { pattern: /no job too big|no pup too small/i, character: 'PAW Patrol', franchise: 'PAW Patrol', owner: 'Paramount (Nickelodeon)' },
      
      // Bluey patterns
      { pattern: /bluey|heeler family|keepy uppy/i, character: 'Bluey', franchise: 'Bluey', owner: 'BBC Studios (Ludo Studio)' },
      
      // SpongeBob patterns
      { pattern: /spongebob|bikini bottom|krusty krab/i, character: 'SpongeBob', franchise: 'SpongeBob SquarePants', owner: 'Paramount (Nickelodeon)' },
      { pattern: /patrick star|squidward|gary the snail/i, character: 'SpongeBob', franchise: 'SpongeBob SquarePants', owner: 'Paramount (Nickelodeon)' },
      
      // Peppa Pig patterns
      { pattern: /peppa pig|george pig|muddy puddles/i, character: 'Peppa Pig', franchise: 'Peppa Pig', owner: 'Entertainment One (Hasbro)' },
      
      // Masha and the Bear patterns
      { pattern: /masha and the bear|masha|the bear/i, character: 'Masha', franchise: 'Masha and the Bear', owner: 'Animaccord' },
      
      // Minecraft patterns
      { pattern: /minecraft|creeper|enderman|steve|alex/i, character: 'Minecraft', franchise: 'Minecraft', owner: 'Microsoft (Mojang Studios)' },
      
      // Roblox patterns
      { pattern: /roblox|robloxian|roblox avatar/i, character: 'Roblox', franchise: 'Roblox', owner: 'Roblox Corporation' },
      
      // Pokémon patterns
      { pattern: /pokemon|pokémon|gotta catch|poké ball|pikachu|charizard/i, character: 'Pikachu', franchise: 'Pokémon', owner: 'The Pokémon Company' },
      
      // LEGO patterns
      { pattern: /lego|lego brick|lego minifigure|lego set/i, character: 'LEGO', franchise: 'LEGO', owner: 'The LEGO Group' },
      
      // Barbie patterns
      { pattern: /barbie|barbie doll|dreamhouse/i, character: 'Barbie', franchise: 'Barbie', owner: 'Mattel' },
      
      // Harry Potter patterns
      { pattern: /hogwarts|wizard|magic wand|quidditch/i, character: 'Harry Potter', franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment' },
      { pattern: /you\'re a wizard|voldemort|he who must not be named/i, character: 'Harry Potter', franchise: 'Harry Potter', owner: 'Warner Bros. Entertainment' },
      
      // Anime & International IP (Ages 0-10)
      // Doraemon patterns
      { pattern: /doraemon|robot cat|fourth dimensional pocket|anywhere door/i, character: 'Doraemon', franchise: 'Doraemon', owner: 'Fujiko F. Fujio (Shogakukan)' },
      { pattern: /nobita|shizuka|gian|suneo/i, character: 'Doraemon', franchise: 'Doraemon', owner: 'Fujiko F. Fujio (Shogakukan)' },
      
      // Naruto patterns
      { pattern: /naruto|hidden leaf village|ninja|rasengan|shadow clone/i, character: 'Naruto', franchise: 'Naruto', owner: 'Shueisha' },
      { pattern: /sasuke|sharingan|uchiha|sakura|kakashi/i, character: 'Naruto', franchise: 'Naruto', owner: 'Shueisha' },
      { pattern: /naruto shippuden|nine tailed fox|kurama/i, character: 'Naruto', franchise: 'Naruto', owner: 'Shueisha' },
      
      // One Piece patterns
      { pattern: /one piece|straw hat|pirate|devil fruit|grand line/i, character: 'Luffy', franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
      { pattern: /luffy|zoro|nami|usopp|sanji|chopper/i, character: 'Luffy', franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
      { pattern: /going merry|thousand sunny|nakama/i, character: 'Luffy', franchise: 'One Piece', owner: 'Shueisha (Eiichiro Oda)' },
      
      // Little Witch Academia patterns
      { pattern: /little witch academia|akko|diana|sucy|lotte/i, character: 'Atsuko Kagari', franchise: 'Little Witch Academia', owner: 'Trigger (Studio Trigger)' },
      { pattern: /luna nova|shiny rod|magic academy/i, character: 'Atsuko Kagari', franchise: 'Little Witch Academia', owner: 'Trigger (Studio Trigger)' },
      
      // Pocoyo patterns
      { pattern: /pocoyo|pocoyó|pato|elly|sleepy bird|loula/i, character: 'Pocoyo', franchise: 'Pocoyo', owner: 'Zinkia Entertainment' },
      
      // Dragon Ball patterns
      { pattern: /dragon ball|dragonball|kamehameha|super saiyan|saiyan/i, character: 'Goku', franchise: 'Dragon Ball', owner: 'Shueisha' },
      { pattern: /goku|vegeta|gohan|piccolo|krillin|bulma/i, character: 'Goku', franchise: 'Dragon Ball', owner: 'Shueisha' },
      { pattern: /dragon balls|shenron|namek|frieza|cell|majin buu/i, character: 'Goku', franchise: 'Dragon Ball', owner: 'Shueisha' },
    ];

    for (const { pattern, character, franchise, owner } of patterns) {
      if (pattern.test(content)) {
        // Check if we already detected this character
        const alreadyDetected = results.some(r => r.character.toLowerCase() === character.toLowerCase());
        if (!alreadyDetected) {
          results.push({
            character,
            franchise,
            owner,
            confidence: 'low', // NLP patterns are lower confidence
            attributionText: this.getAttributionText(character, owner),
            personalUseMessage: this.getPersonalUseMessage(),
            ownershipDisclaimer: this.getOwnershipDisclaimer(character, owner),
          });
        }
      }
    }

    return results;
  }

  /**
   * Generate attribution text
   * @param character - The character name
   * @param owner - The IP owner
   * @returns Attribution text
   */
  private getAttributionText(character: string, owner: string): string {
    return `${character} belongs to ${owner}`;
  }

  /**
   * Generate personal use message
   * @returns Personal use message
   */
  private getPersonalUseMessage(): string {
    return "This story is for your family's personal enjoyment only";
  }

  /**
   * Generate ownership disclaimer
   * @param character - The character name
   * @param owner - The IP owner
   * @returns Ownership disclaimer
   */
  private getOwnershipDisclaimer(character: string, owner: string): string {
    return "We are not the owners of this character";
  }

  /**
   * Format full attribution message for conversational interfaces
   * @param result - IP detection result
   * @returns Formatted attribution message
   */
  formatAttributionMessage(result: IPDetectionResult): string {
    return `Note: ${result.attributionText}. ${result.personalUseMessage}. ${result.ownershipDisclaimer}.`;
  }

  /**
   * Format attribution for JSON/API responses
   * @param results - Array of IP detection results
   * @returns Formatted attribution object
   */
  formatAttributionForAPI(results: IPDetectionResult[]): {
    detected: boolean;
    attributions: IPDetectionResult[];
    fullMessage?: string;
  } {
    if (results.length === 0) {
      return { detected: false, attributions: [] };
    }

    const fullMessage = results
      .map(r => this.formatAttributionMessage(r))
      .join(' ');

    return {
      detected: true,
      attributions: results,
      fullMessage,
    };
  }
}
