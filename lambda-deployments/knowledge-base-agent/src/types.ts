import { z } from 'zod';

// Knowledge Base Query Types
export const KnowledgeQuerySchema = z.object({
  query: z.string().min(1).max(500),
  category: z.enum(['platform_usage', 'story_creation', 'account_management', 'troubleshooting', 'features', 'general']).optional(),
  userId: z.string().uuid().optional(),
  context: z.object({
    currentPage: z.string().optional(),
    userType: z.enum(['child', 'parent', 'teacher', 'organization_admin']).optional(),
    previousQueries: z.array(z.string()).optional()
  }).optional()
});

export type KnowledgeQuery = z.infer<typeof KnowledgeQuerySchema>;

// Knowledge Response Types
export interface KnowledgeResponse {
  id: string;
  query: string;
  answer: string;
  category: string;
  confidence: number; // 0-1
  sources: KnowledgeSource[];
  relatedQuestions: string[];
  actionSuggestions?: ActionSuggestion[];
  timestamp: string;
}

export interface KnowledgeSource {
  type: 'documentation' | 'faq' | 'tutorial' | 'help_article';
  title: string;
  url?: string;
  excerpt: string;
}

export interface ActionSuggestion {
  type: 'navigate' | 'contact_support' | 'try_feature' | 'watch_tutorial';
  label: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

// FAQ Types
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  userTypes: string[];
  popularity: number;
  lastUpdated: string;
}

// Help Context Types
export interface HelpContext {
  sessionId: string;
  userId?: string;
  userType?: string;
  currentFeature?: string;
  conversationState?: any;
  recentErrors?: string[];
}

// Support Escalation Types
export interface SupportEscalation {
  id: string;
  userId: string;
  query: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: HelpContext;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'resolved';
}

// Knowledge Base Configuration
export interface KnowledgeBaseConfig {
  confidenceThreshold: number; // Minimum confidence to return answer
  maxRelatedQuestions: number;
  enableAutoEscalation: boolean;
  supportContactInfo: {
    email: string;
    chatUrl?: string;
    phoneNumber?: string;
  };
}

// Story Intelligence Specific Knowledge
export interface StoryIntelligenceKnowledge {
  concept: string;
  explanation: string;
  examples: string[];
  benefits: string[];
  differentiators: string[];
}

// Platform Features Knowledge
export interface PlatformFeature {
  name: string;
  description: string;
  userTypes: string[];
  howToUse: string[];
  tips: string[];
  troubleshooting: string[];
}

// No default export to avoid ESM/CJS interop confusing types as values