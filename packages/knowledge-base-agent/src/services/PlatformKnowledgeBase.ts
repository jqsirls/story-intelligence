import { Logger } from 'winston';
import { PlatformFeature, KnowledgeResponse, KnowledgeQuery, FAQItem } from '../types';

/**
 * Platform-specific knowledge base for user guidance and troubleshooting
 * Complements existing conversation router with platform help
 */
export class PlatformKnowledgeBase {
  private logger: Logger;
  private features: Map<string, PlatformFeature>;
  private faqs: Map<string, FAQItem>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.features = new Map();
    this.faqs = new Map();
    this.initializePlatformKnowledge();
    this.initializeFAQs();
  }

  /**
   * Query platform-specific knowledge
   */
  async queryPlatform(query: KnowledgeQuery): Promise<KnowledgeResponse | null> {
    const normalizedQuery = query.query.toLowerCase();
    
    // Check FAQs first
    const faqMatch = this.findMatchingFAQ(normalizedQuery);
    if (faqMatch) {
      return this.formatFAQResponse(faqMatch, query);
    }

    // Check platform features
    const featureMatch = this.findMatchingFeature(normalizedQuery);
    if (featureMatch) {
      return this.formatFeatureResponse(featureMatch, query);
    }

    return null;
  }

  /**
   * Get contextual help based on user's current state
   */
  getContextualHelp(context: any): string[] {
    const suggestions: string[] = [];

    // Based on conversation state
    if (context.conversationPhase === 'CHARACTER_CREATION') {
      suggestions.push(
        'Say things like "a brave mouse" or "a friendly dragon"',
        'You can include appearance details like "with blue eyes"',
        'Try adding personality traits like "who loves adventures"'
      );
    } else if (context.conversationPhase === 'STORY_BUILDING') {
      suggestions.push(
        'Make choices to guide your story direction',
        'Ask questions about characters or settings',
        'Say "what happens next?" to continue the adventure'
      );
    }

    // Based on user type
    if (context.userType === 'parent') {
      suggestions.push(
        'You can help guide the conversation with your child',
        'Stories adapt automatically to your child\'s age',
        'All content is privately stored in your family library'
      );
    }

    return suggestions;
  }

  private initializePlatformKnowledge(): void {
    // Story Creation Feature
    this.features.set('story_creation', {
      name: 'Story Creation',
      description: 'Create award-caliber stories through natural conversation using Story Intelligence™',
      userTypes: ['child', 'parent', 'teacher'],
      howToUse: [
        'Start by saying "Let\'s create a story" or "I want to make a story"',
        'Choose or create a character for your story',
        'Guide the story by making choices or asking questions',
        'Stories automatically adapt to the child\'s age and interests'
      ],
      tips: [
        'Stories use the hero\'s journey structure for engaging narratives',
        'All content is age-appropriate and positive',
        'You can create stories in multiple languages',
        'Each story generates suggested real-world activities'
      ],
      troubleshooting: [
        'If the story seems too simple/complex, mention the child\'s age',
        'Say "start over" if you want to begin a new story',
        'Ask "what are my choices?" if you need story direction options'
      ]
    });

    // Character Creation Feature
    this.features.set('character_creation', {
      name: 'Character Creation',
      description: 'Build diverse, inclusive characters through voice conversation',
      userTypes: ['child', 'parent', 'teacher'],
      howToUse: [
        'Describe your character\'s appearance, personality, and abilities',
        'Include details about species, traits, and special characteristics',
        'Characters are automatically validated for age-appropriateness',
        'All characters support full inclusivity options'
      ],
      tips: [
        'Be specific about what makes your character special',
        'You can create characters of any species or background',
        'Characters can have disabilities, different abilities, or special needs',
        'Each character gets beautiful AI-generated artwork'
      ],
      troubleshooting: [
        'If character creation gets stuck, try being more specific',
        'Say "my character is..." to provide more details',
        'Characters are saved to your library automatically'
      ]
    });

    // Library Management Feature
    this.features.set('library_management', {
      name: 'Library Management',
      description: 'Organize and manage your family\'s story and character collections',
      userTypes: ['parent', 'teacher', 'organization_admin'],
      howToUse: [
        'Access your library through the main menu',
        'Stories and characters are automatically organized',
        'Share stories with family members using permission settings',
        'Create sub-libraries for different children (COPPA compliant)'
      ],
      tips: [
        'Libraries support Owner, Admin, Editor, and Viewer permissions',
        'All content is encrypted and privately stored',
        'You can transfer stories between family members',
        'Export options available for backup'
      ],
      troubleshooting: [
        'Contact support if you can\'t access your library',
        'Check permissions if you can\'t edit shared content',
        'Sub-libraries for children under 13 require parental verification'
      ]
    });

    // Voice Interface Feature
    this.features.set('voice_interface', {
      name: 'Voice Interface',
      description: 'Natural voice conversation powered by Story Intelligence™',
      userTypes: ['child', 'parent', 'teacher'],
      howToUse: [
        'Speak naturally - no special commands needed',
        'The system understands context and conversation flow',
        'Works on Alexa, web browsers, and mobile devices',
        'Supports multiple languages and accents'
      ],
      tips: [
        'Speak clearly for best recognition',
        'Pause briefly between sentences',
        'Say "I didn\'t say that" if recognition is wrong',
        'Voice synthesis creates studio-quality narration'
      ],
      troubleshooting: [
        'Check microphone permissions in your browser',
        'Ensure good internet connection for real-time features',
        'Try speaking more slowly if recognition is poor'
      ]
    });

    this.logger.info('Platform knowledge base initialized');
  }

  private initializeFAQs(): void {
    // General Platform FAQs
    this.faqs.set('what_is_storytailor', {
      id: 'what_is_storytailor',
      question: 'What is Storytailor?',
      answer: 'Storytailor® is a revolutionary platform powered by Story Intelligence™ that creates award-caliber personal stories for families. Unlike traditional books, we create stories through conversation that generate real-world family activities and memories.',
      category: 'general',
      tags: ['platform', 'overview', 'story intelligence'],
      userTypes: ['all'],
      popularity: 100,
      lastUpdated: new Date().toISOString()
    });

    this.faqs.set('how_does_it_work', {
      id: 'how_does_it_work',
      question: 'How does Storytailor work?',
      answer: 'You have natural conversations with our Story Intelligence™ system to create characters and stories. The system uses advanced narrative understanding to craft award-caliber stories that adapt to your child\'s age and interests. Each story then suggests real-world activities to do together.',
      category: 'platform_usage',
      tags: ['how to use', 'story creation', 'conversation'],
      userTypes: ['parent', 'teacher'],
      popularity: 95,
      lastUpdated: new Date().toISOString()
    });

    this.faqs.set('age_appropriate', {
      id: 'age_appropriate',
      question: 'What ages is Storytailor appropriate for?',
      answer: 'Storytailor works for children ages 3-12+ and their families. Content automatically adapts to the child\'s developmental stage with age-appropriate vocabulary, story complexity, and themes. Parents and teachers can participate in story creation with children of any age.',
      category: 'features',
      tags: ['age groups', 'child development', 'safety'],
      userTypes: ['parent', 'teacher'],
      popularity: 90,
      lastUpdated: new Date().toISOString()
    });

    this.faqs.set('privacy_safety', {
      id: 'privacy_safety',
      question: 'Is Storytailor safe and private?',
      answer: 'Yes! Storytailor is COPPA/GDPR compliant with advanced privacy protection. All stories remain private to your family, content is age-appropriate and positive, and we use military-grade encryption. Stories are family treasures, not commercial products.',
      category: 'safety',
      tags: ['privacy', 'safety', 'COPPA', 'encryption'],
      userTypes: ['parent', 'teacher', 'organization_admin'],
      popularity: 85,
      lastUpdated: new Date().toISOString()
    });

    this.faqs.set('vs_books', {
      id: 'vs_books',
      question: 'Does Storytailor replace books and reading?',
      answer: 'No! Storytailor creates a completely new category focused on story creation + off-screen activities. We complement traditional reading by adding transcendent story creation time. Books are for reading together; Storytailor is for creating and doing together.',
      category: 'platform_positioning',
      tags: ['books', 'reading', 'new category', 'family activities'],
      userTypes: ['parent', 'teacher'],
      popularity: 80,
      lastUpdated: new Date().toISOString()
    });

    this.faqs.set('story_quality', {
      id: 'story_quality',
      question: 'What makes Storytailor stories high quality?',
      answer: 'Stories are powered by Story Intelligence™ and crafted to award-caliber standards using proven narrative structures like the hero\'s journey. Each story could theoretically win literary awards but remains a private family treasure. Art quality could hang in museums but stays in your family albums.',
      category: 'story_quality',
      tags: ['quality', 'awards', 'hero journey', 'art'],
      userTypes: ['parent', 'teacher'],
      popularity: 75,
      lastUpdated: new Date().toISOString()
    });

    this.logger.info('FAQ database initialized');
  }

  private findMatchingFAQ(query: string): FAQItem | null {
    for (const faq of this.faqs.values()) {
      if (this.queryMatchesFAQ(query, faq)) {
        return faq;
      }
    }
    return null;
  }

  private findMatchingFeature(query: string): PlatformFeature | null {
    for (const feature of this.features.values()) {
      if (this.queryMatchesFeature(query, feature)) {
        return feature;
      }
    }
    return null;
  }

  private queryMatchesFAQ(query: string, faq: FAQItem): boolean {
    const searchText = `${faq.question} ${faq.answer} ${faq.tags.join(' ')}`.toLowerCase();
    const queryWords = query.split(' ');
    return queryWords.some(word => word.length > 2 && searchText.includes(word));
  }

  private queryMatchesFeature(query: string, feature: PlatformFeature): boolean {
    const searchText = `${feature.name} ${feature.description}`.toLowerCase();
    const queryWords = query.split(' ');
    return queryWords.some(word => word.length > 2 && searchText.includes(word));
  }

  private formatFAQResponse(faq: FAQItem, query: KnowledgeQuery): KnowledgeResponse {
    return {
      id: `faq_${faq.id}_${Date.now()}`,
      query: query.query,
      answer: faq.answer,
      category: faq.category,
      confidence: 0.9,
      sources: [
        {
          type: 'faq',
          title: faq.question,
          excerpt: faq.answer.substring(0, 150) + '...'
        }
      ],
      relatedQuestions: this.getRelatedFAQs(faq),
      actionSuggestions: [
        {
          type: 'try_feature',
          label: 'Try Creating a Story',
          action: 'begin_story_creation',
          priority: 'medium'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  private formatFeatureResponse(feature: PlatformFeature, query: KnowledgeQuery): KnowledgeResponse {
    let answer = `**${feature.name}**\n\n${feature.description}\n\n`;
    
    answer += `**How to Use:**\n${feature.howToUse.map(step => `• ${step}`).join('\n')}\n\n`;
    
    if (feature.tips.length > 0) {
      answer += `**Tips:**\n${feature.tips.map(tip => `• ${tip}`).join('\n')}\n\n`;
    }
    
    if (feature.troubleshooting.length > 0) {
      answer += `**Troubleshooting:**\n${feature.troubleshooting.map(tip => `• ${tip}`).join('\n')}`;
    }

    return {
      id: `feature_${feature.name}_${Date.now()}`,
      query: query.query,
      answer,
      category: 'platform_features',
      confidence: 0.85,
      sources: [
        {
          type: 'documentation',
          title: `${feature.name} Guide`,
          excerpt: feature.description
        }
      ],
      relatedQuestions: [
        `How do I get started with ${feature.name}?`,
        `What are the benefits of ${feature.name}?`,
        `Can I use ${feature.name} with my family?`
      ],
      timestamp: new Date().toISOString()
    };
  }

  private getRelatedFAQs(currentFaq: FAQItem): string[] {
    const related: string[] = [];
    
    for (const faq of this.faqs.values()) {
      if (faq.id !== currentFaq.id && faq.category === currentFaq.category) {
        related.push(faq.question);
        if (related.length >= 3) break;
      }
    }
    
    return related;
  }
}