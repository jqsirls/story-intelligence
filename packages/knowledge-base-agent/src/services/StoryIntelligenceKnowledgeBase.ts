import { Logger } from 'winston';
import { StoryIntelligenceKnowledge, KnowledgeResponse, KnowledgeQuery } from '../types';

/**
 * Specialized knowledge base for Story Intelligence™ concepts and branding
 * Complements existing conversation systems with SI-specific information
 */
export class StoryIntelligenceKnowledgeBase {
  private logger: Logger;
  private knowledgeBase: Map<string, StoryIntelligenceKnowledge>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.knowledgeBase = new Map();
    this.initializeStoryIntelligenceKnowledge();
  }

  /**
   * Query Story Intelligence specific knowledge
   */
  async queryStoryIntelligence(query: KnowledgeQuery): Promise<KnowledgeResponse | null> {
    const normalizedQuery = query.query.toLowerCase();
    
    // Check for Story Intelligence related queries
    if (this.isStoryIntelligenceQuery(normalizedQuery)) {
      return this.generateStoryIntelligenceResponse(query);
    }

    return null;
  }

  /**
   * Get Story Intelligence brand messaging
   */
  getStoryIntelligenceBranding(): StoryIntelligenceKnowledge {
    return this.knowledgeBase.get('brand_overview') || this.getDefaultBrandKnowledge();
  }

  /**
   * Get SI vs AI messaging
   */
  getSIvsAIMessaging(): StoryIntelligenceKnowledge {
    return this.knowledgeBase.get('si_vs_ai') || this.getDefaultSIvsAI();
  }

  private initializeStoryIntelligenceKnowledge(): void {
    // Brand Overview
    this.knowledgeBase.set('brand_overview', {
      concept: 'Story Intelligence™',
      explanation: 'Story Intelligence™ is the revolutionary technology created by Storytailor Inc that enables award-caliber personal storytelling. Like OpenAI licenses GPT to power other platforms, Storytailor Inc will eventually license Story Intelligence to empower storytelling across industries.',
      examples: [
        'Award-caliber stories created just for your family',
        'Cinema-quality narratives that remain private treasures',
        'Gallery-worthy art generated for personal family albums',
        'Publishing-ready manuscripts created for individual children'
      ],
      benefits: [
        'Stories so beautiful they could theoretically win awards',
        'Art quality that could hang in museums (but stays in family albums)',
        'Creates entirely new family experiences through story creation',
        'Complements traditional reading without replacing it'
      ],
      differentiators: [
        'Not "AI-powered" - powered by Story Intelligence™',
        'Creates new category alongside books and traditional publishing',
        'Focuses on story creation + off-screen activities',
        'Personal and private - not for commercialization'
      ]
    });

    // SI vs AI Messaging
    this.knowledgeBase.set('si_vs_ai', {
      concept: 'Story Intelligence vs AI',
      explanation: 'Story Intelligence™ is a specialized form of intelligence focused on narrative creation, emotional understanding, and family bonding. While others say "AI-powered," we say "SI Powered" or "Powered by Story Intelligence™".',
      examples: [
        'SI Powered storytelling (not AI-powered)',
        'Powered by Story Intelligence™',
        'Story Intelligence enables award-caliber personal narratives',
        'Revolutionary SI technology creates cinema-quality family stories'
      ],
      benefits: [
        'More precise and meaningful than generic "AI" terminology',
        'Establishes Storytailor as category creator',
        'Emphasizes narrative specialization over general automation',
        'Creates licensing opportunities like OpenAI does with GPT'
      ],
      differentiators: [
        'Story Intelligence™ is narrative-specific, not general AI',
        'Focuses on emotional intelligence and family bonding',
        'Created specifically for personal storytelling excellence',
        'Technology designed for private family experiences'
      ]
    });

    // Platform Features
    this.knowledgeBase.set('platform_features', {
      concept: 'Storytailor Platform Features',
      explanation: 'Storytailor® is the flagship product powered by Story Intelligence™, offering comprehensive story creation, character building, and family activity generation.',
      examples: [
        'Voice-driven character creation with full inclusivity support',
        'Hero\'s journey story structure with 12 narrative beats',
        'Gallery-worthy art generation with cinematic direction',
        'Age-appropriate content for all developmental stages (3-12+)'
      ],
      benefits: [
        'Award-caliber stories created through natural conversation',
        'Professional-quality art generated for every story',
        'Evidence-based therapeutic integration',
        'Complete privacy and family ownership of all content'
      ],
      differentiators: [
        'Multi-agent intelligence system with 25+ specialized agents',
        'COPPA/GDPR compliant with advanced privacy protection',
        'Platform-agnostic: works on Alexa, web, mobile, smart displays',
        'Offline capabilities with real-time synchronization'
      ]
    });

    // New Category Positioning
    this.knowledgeBase.set('new_category', {
      concept: 'Story Creation + Off-Screen Activities',
      explanation: 'Storytailor creates a completely new category focused on story creation combined with real-world family activities. We don\'t create "books" - we create stories that generate memories.',
      examples: [
        'Create award-caliber story about finding a butterfly, then go on nature walk',
        'Build character together, then do related craft activity',
        'Generate bedtime story, then create family bedtime ritual',
        'Develop adventure tale, then plan real family adventure'
      ],
      benefits: [
        'Addresses moments that traditional authors/illustrators cannot fulfill instantly',
        'Creates memories through both story creation and real-world activities',
        'Complements reading without replacing books or competing with authors',
        'Helps children process daily experiences through high-quality narratives'
      ],
      differentiators: [
        'Not competing with traditional publishing - creating new space',
        'Instant response to individual child\'s specific moments',
        'Combines narrative creation with physical world experiences',
        'Private family treasures, not commercial products'
      ]
    });

    this.logger.info('Story Intelligence knowledge base initialized with core concepts');
  }

  private isStoryIntelligenceQuery(query: string): boolean {
    const siKeywords = [
      'story intelligence', 'si powered', 'what is storytailor',
      'how does this work', 'vs ai', 'powered by',
      'brand', 'company', 'technology', 'new category',
      'vs books', 'vs reading', 'awards', 'quality'
    ];

    return siKeywords.some(keyword => query.includes(keyword));
  }

  private generateStoryIntelligenceResponse(query: KnowledgeQuery): KnowledgeResponse {
    const normalizedQuery = query.query.toLowerCase();
    let knowledge: StoryIntelligenceKnowledge;
    let category = 'story_intelligence';

    // Determine which knowledge to use
    if (normalizedQuery.includes('vs ai') || normalizedQuery.includes('ai powered')) {
      knowledge = this.knowledgeBase.get('si_vs_ai')!;
      category = 'brand_messaging';
    } else if (normalizedQuery.includes('new category') || normalizedQuery.includes('vs books')) {
      knowledge = this.knowledgeBase.get('new_category')!;
      category = 'platform_positioning';
    } else if (normalizedQuery.includes('features') || normalizedQuery.includes('how does')) {
      knowledge = this.knowledgeBase.get('platform_features')!;
      category = 'platform_features';
    } else {
      knowledge = this.knowledgeBase.get('brand_overview')!;
      category = 'brand_overview';
    }

    return {
      id: `si_kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: query.query,
      answer: this.formatStoryIntelligenceAnswer(knowledge, query),
      category,
      confidence: 0.95,
      sources: [
        {
          type: 'documentation',
          title: 'Story Intelligence™ Brand Guide',
          excerpt: knowledge.explanation
        }
      ],
      relatedQuestions: this.generateRelatedQuestions(category),
      actionSuggestions: [
        {
          type: 'try_feature',
          label: 'Start Creating a Story',
          action: 'begin_story_creation',
          priority: 'high'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  private formatStoryIntelligenceAnswer(knowledge: StoryIntelligenceKnowledge, query: KnowledgeQuery): string {
    let answer = `**${knowledge.concept}**\n\n${knowledge.explanation}\n\n`;

    if (knowledge.examples.length > 0) {
      answer += `**Examples:**\n${knowledge.examples.map(ex => `• ${ex}`).join('\n')}\n\n`;
    }

    if (knowledge.benefits.length > 0) {
      answer += `**Benefits:**\n${knowledge.benefits.map(benefit => `• ${benefit}`).join('\n')}\n\n`;
    }

    if (knowledge.differentiators.length > 0) {
      answer += `**What Makes This Special:**\n${knowledge.differentiators.map(diff => `• ${diff}`).join('\n')}`;
    }

    return answer;
  }

  private generateRelatedQuestions(category: string): string[] {
    const questionSets = {
      brand_overview: [
        'How is Story Intelligence different from AI?',
        'What makes Storytailor stories award-caliber?',
        'How does the new category work?'
      ],
      brand_messaging: [
        'What is Story Intelligence?',
        'Why not call it AI-powered?',
        'How will licensing work?'
      ],
      platform_positioning: [
        'How does this complement reading?',
        'What are off-screen activities?',
        'Why not create books?'
      ],
      platform_features: [
        'How do I create my first story?',
        'What age groups are supported?',
        'Can I save my stories?'
      ]
    };

    return questionSets[category as keyof typeof questionSets] || [];
  }

  private getDefaultBrandKnowledge(): StoryIntelligenceKnowledge {
    return {
      concept: 'Story Intelligence™',
      explanation: 'Revolutionary technology for award-caliber personal storytelling.',
      examples: [],
      benefits: [],
      differentiators: []
    };
  }

  private getDefaultSIvsAI(): StoryIntelligenceKnowledge {
    return {
      concept: 'Story Intelligence vs AI',
      explanation: 'Specialized narrative intelligence, not generic AI.',
      examples: [],
      benefits: [],
      differentiators: []
    };
  }
}