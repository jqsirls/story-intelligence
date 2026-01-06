import { z } from 'zod';

// Request Context Schema
export const RequestContextSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  correlationId: z.string(),
  jwt: z.string(),
  metadata: z.record(z.string()).optional(),
});

export type RequestContext = z.infer<typeof RequestContextSchema>;

// Agent Response Schema
export const AgentErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
  correlationId: z.string(),
});

export const AgentResponseSchema = z.object({
  success: z.boolean(),
  data: z.string().optional(), // JSON serialized data
  error: AgentErrorSchema.optional(),
  processingTimeMs: z.number(),
});

export type AgentError = z.infer<typeof AgentErrorSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Intent Classification
export const IntentResultSchema = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1),
  parameters: z.string().optional(), // JSON serialized
  context: z.string().optional(), // JSON serialized
});

export type IntentResult = z.infer<typeof IntentResultSchema>;

// Customer Response
export const CustomerResponseSchema = z.object({
  text: z.string(),
  audioUrl: z.string().optional(),
  visualContent: z.string().optional(), // JSON serialized APL cards, etc.
  nextAction: z.string().optional(),
});

export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;

// Auth Results
export const AuthResultSchema = z.object({
  success: z.boolean(),
  userId: z.string().optional(),
  jwt: z.string().optional(),
  refreshToken: z.string().optional(),
  error: z.string().optional(),
});

export const LinkAccountResponseSchema = z.object({
  voiceCode: z.string(),
  tempJwt: z.string(),
  expiresAt: z.string(),
});

export type AuthResult = z.infer<typeof AuthResultSchema>;
export type LinkAccountResponse = z.infer<typeof LinkAccountResponseSchema>;

// Character and Story Results
export const CharacterResultSchema = z.object({
  characterId: z.string(),
  characterData: z.string(), // JSON serialized Character
});

export const StoryResultSchema = z.object({
  storyId: z.string(),
  storyData: z.string(), // JSON serialized Story
});

export const StoryDraftResultSchema = z.object({
  storyDraftId: z.string(),
  storyDraftData: z.string(), // JSON serialized StoryDraft
});

export const StoryBeatResultSchema = z.object({
  storyBeatData: z.string(), // JSON serialized StoryBeat
});

export const StoryUpdateResultSchema = z.object({
  storyUpdateData: z.string(), // JSON serialized StoryUpdate
});

export const StoryTypeResultSchema = z.object({
  storyType: z.string(),
  confidence: z.number().min(0).max(1),
});

export type CharacterResult = z.infer<typeof CharacterResultSchema>;
export type StoryResult = z.infer<typeof StoryResultSchema>;
export type StoryDraftResult = z.infer<typeof StoryDraftResultSchema>;
export type StoryBeatResult = z.infer<typeof StoryBeatResultSchema>;
export type StoryUpdateResult = z.infer<typeof StoryUpdateResultSchema>;
export type StoryTypeResult = z.infer<typeof StoryTypeResultSchema>;

// Library Results
export const LibraryResultSchema = z.object({
  libraryId: z.string(),
  libraryData: z.string(), // JSON serialized Library
});

export const StoriesResultSchema = z.object({
  storyData: z.array(z.string()), // JSON serialized Story[]
});

export type LibraryResult = z.infer<typeof LibraryResultSchema>;
export type StoriesResult = z.infer<typeof StoriesResultSchema>;

// Emotion Results
export const EmotionResultSchema = z.object({
  detected: z.boolean(),
  mood: z.string(),
  confidence: z.number().min(0).max(1),
  timestamp: z.string(),
});

export const EmotionPatternsResultSchema = z.object({
  patternData: z.array(z.string()), // JSON serialized EmotionPattern[]
});

export const SentimentResultSchema = z.object({
  sentiment: z.string(),
  confidence: z.number().min(0).max(1),
  emotions: z.array(z.string()),
});

export type EmotionResult = z.infer<typeof EmotionResultSchema>;
export type EmotionPatternsResult = z.infer<typeof EmotionPatternsResultSchema>;
export type SentimentResult = z.infer<typeof SentimentResultSchema>;

// Commerce Results
export const CheckoutResultSchema = z.object({
  sessionId: z.string(),
  url: z.string(),
  expiresAt: z.string(),
});

export const DiscountResultSchema = z.object({
  applied: z.boolean(),
  discountAmount: z.number(),
  discountPercentage: z.number(),
  couponCode: z.string().optional(),
});

export const SubscriptionResultSchema = z.object({
  success: z.boolean(),
  subscriptionData: z.string().optional(), // JSON serialized Subscription
  error: z.string().optional(),
});

export type CheckoutResult = z.infer<typeof CheckoutResultSchema>;
export type DiscountResult = z.infer<typeof DiscountResultSchema>;
export type SubscriptionResult = z.infer<typeof SubscriptionResultSchema>;