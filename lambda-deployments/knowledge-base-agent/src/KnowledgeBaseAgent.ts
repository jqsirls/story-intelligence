import { Logger } from 'winston';
import { 
  KnowledgeQuery, 
  KnowledgeResponse, 
  KnowledgeBaseConfig, 
  HelpContext,
  SupportEscalation,
  KnowledgeQuerySchema 
} from './types';
import { StoryIntelligenceKnowledgeBase } from './services/StoryIntelligenceKnowledgeBase';
import { PlatformKnowledgeBase } from './services/PlatformKnowledgeBase';

/**
 * Knowledge Base Agent - Complements existing conversation router
 * Provides platform guidance, FAQ handling, and Story Intelligence™ education
 * 
 * Designed to integrate with existing multi-agent system without conflicts
 */
export class KnowledgeBaseAgent {
  private logger: Logger;
  private config: KnowledgeBaseConfig;
  private storyIntelligenceKB: StoryIntelligenceKnowledgeBase;
  private platformKB: PlatformKnowledgeBase;
  private escalationQueue: Map<string, SupportEscalation>;

  constructor(logger: Logger, config?: Partial<KnowledgeBaseConfig>) {
    this.logger = logger;
    this.config = {
      confidenceThreshold: 0.7,
      maxRelatedQuestions: 5,
      enableAutoEscalation: true,
      supportContactInfo: {
        email: 'support@storytailor.com',
        chatUrl: 'https://storytailor.com/chat',
        phoneNumber: undefined
      },
      ...config
    };
    
    this.storyIntelligenceKB = new StoryIntelligenceKnowledgeBase(logger);
    this.platformKB = new PlatformKnowledgeBase(logger);
    this.escalationQueue = new Map();
    
    this.logger.info('KnowledgeBaseAgent initialized');
  }

  /**
   * Main query handler - integrates with existing conversation router
   * Returns null if query should be handled by other agents
   */
  async handleQuery(query: KnowledgeQuery): Promise<KnowledgeResponse | null> {
    try {
      // Validate query
      const validatedQuery = KnowledgeQuerySchema.parse(query);
      
      this.logger.info('Processing knowledge query', { 
        query: validatedQuery.query,
        category: validatedQuery.category,
        userId: validatedQuery.userId 
      });

      // Try Story Intelligence knowledge base first
      let response = await this.storyIntelligenceKB.queryStoryIntelligence(validatedQuery);
      
      // If no SI match, try platform knowledge base
      if (!response) {
        response = await this.platformKB.queryPlatform(validatedQuery);
      }

      // If still no match and confidence is too low, escalate
      if (!response || response.confidence < this.config.confidenceThreshold) {
        if (this.config.enableAutoEscalation) {
          await this.escalateToSupport(validatedQuery);
        }
        return this.generateFallbackResponse(validatedQuery);
      }

      // Enhance response with contextual help if available
      if (validatedQuery.context) {
        response = await this.enhanceWithContext(response, validatedQuery.context);
      }

      this.logger.info('Knowledge query resolved', { 
        queryId: response.id,
        confidence: response.confidence,
        category: response.category 
      });

      return response;

    } catch (error) {
      this.logger.error('Error processing knowledge query', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.query 
      });
      
      return this.generateErrorResponse(query);
    }
  }

  /**
   * Get contextual help suggestions based on current user state
   * Integrates with existing conversation state management
   */
  async getContextualHelp(context: HelpContext): Promise<string[]> {
    try {
      const suggestions = this.platformKB.getContextualHelp(context);
      
      // Add Story Intelligence specific suggestions
      const siSuggestions = this.getSIContextualSuggestions(context);
      
      return [...suggestions, ...siSuggestions].slice(0, 5);
      
    } catch (error) {
      this.logger.error('Error generating contextual help', { error });
      return ['Ask me anything about Storytailor and Story Intelligence™!'];
    }
  }

  /**
   * Check if query should be handled by knowledge base
   * Helps existing router determine delegation
   */
  canHandleQuery(query: string): boolean {
    const knowledgeKeywords = [
      'help', 'how', 'what', 'why', 'explain', 'guide',
      'faq', 'question', 'support', 'problem', 'issue',
      'story intelligence', 'storytailor', 'features',
      'account', 'library', 'character', 'privacy'
    ];

    const normalizedQuery = query.toLowerCase();
    return knowledgeKeywords.some(keyword => normalizedQuery.includes(keyword));
  }

  /**
   * Get Story Intelligence branding information
   * For use by other agents to maintain consistent messaging
   */
  getStoryIntelligenceBranding() {
    return this.storyIntelligenceKB.getStoryIntelligenceBranding();
  }

  /**
   * Get SI vs AI messaging
   * For use by other agents to maintain brand consistency
   */
  getSIvsAIMessaging() {
    return this.storyIntelligenceKB.getSIvsAIMessaging();
  }

  private async enhanceWithContext(
    response: KnowledgeResponse, 
    context: any
  ): Promise<KnowledgeResponse> {
    const contextualSuggestions = await this.getContextualHelp(context as HelpContext);
    
    if (contextualSuggestions.length > 0) {
      response.answer += '\n\n**For your current situation:**\n' + 
        contextualSuggestions.map(s => `• ${s}`).join('\n');
    }
    
    return response;
  }

  private getSIContextualSuggestions(context: HelpContext): string[] {
    const suggestions: string[] = [];
    
    // Based on user type
    if (context.userType === 'parent') {
      suggestions.push('All stories are powered by Story Intelligence™ for award-caliber quality');
    } else if (context.userType === 'teacher') {
      suggestions.push('Story Intelligence™ creates curriculum-aligned educational content');
    }
    
    // Based on current feature
    if (context.currentFeature === 'story_creation') {
      suggestions.push('Your stories will meet publishing-ready quality standards');
    }
    
    return suggestions;
  }

  private async escalateToSupport(query: KnowledgeQuery): Promise<void> {
    const escalation: SupportEscalation = {
      id: `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: query.userId || 'anonymous',
      query: query.query,
      category: query.category || 'general',
      priority: 'medium',
      context: query.context as HelpContext || {},
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    this.escalationQueue.set(escalation.id, escalation);
    
    this.logger.info('Query escalated to support', { 
      escalationId: escalation.id,
      query: query.query 
    });
  }

  private generateFallbackResponse(query: KnowledgeQuery): KnowledgeResponse {
    return {
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: query.query,
      answer: `I'd be happy to help! While I don't have a specific answer for that question, here are some ways to get help:

• **Try asking differently** - I understand questions about Story Intelligence™, platform features, and account management
• **Contact our support team** at ${this.config.supportContactInfo.email}
• **Start creating a story** - often the best way to learn is by trying!

Remember, Storytailor® is powered by Story Intelligence™ to create award-caliber personal stories for your family.`,
      category: 'support',
      confidence: 0.5,
      sources: [],
      relatedQuestions: [
        'What is Story Intelligence?',
        'How do I create my first story?',
        'What makes Storytailor different?'
      ],
      actionSuggestions: [
        {
          type: 'contact_support',
          label: 'Contact Support',
          action: this.config.supportContactInfo.email,
          priority: 'medium'
        },
        {
          type: 'try_feature',
          label: 'Start Creating',
          action: 'begin_story_creation',
          priority: 'high'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  private generateErrorResponse(query: KnowledgeQuery): KnowledgeResponse {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: query.query,
      answer: 'I encountered an issue processing your question. Please try asking again or contact our support team for assistance.',
      category: 'error',
      confidence: 0.1,
      sources: [],
      relatedQuestions: [],
      actionSuggestions: [
        {
          type: 'contact_support',
          label: 'Contact Support',
          action: this.config.supportContactInfo.email,
          priority: 'high'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get pending support escalations (for admin dashboard)
   */
  getPendingEscalations(): SupportEscalation[] {
    return Array.from(this.escalationQueue.values())
      .filter(esc => esc.status === 'pending')
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  /**
   * Update escalation status (for support team)
   */
  updateEscalationStatus(escalationId: string, status: 'in_progress' | 'resolved'): boolean {
    const escalation = this.escalationQueue.get(escalationId);
    if (escalation) {
      escalation.status = status;
      this.logger.info('Escalation status updated', { escalationId, status });
      return true;
    }
    return false;
  }
}