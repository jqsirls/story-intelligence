# What This Is

**Last Updated**: 2025-12-13

## Product Overview

Storytailor is a production-ready multi-agent system for creating personalized, interactive storytelling experiences for children. The system integrates with Amazon's Alexa AI Multi-Agent SDK and provides a hub-and-spoke architecture for conversation management, content generation, and library management.

## What It Does

- **Conversational Storytelling**: Children interact with AI-powered characters through voice or text
- **Personalized Content**: Stories adapt to each child's preferences, reading level, and emotional state
- **Multi-Agent Architecture**: Specialized agents handle different aspects (content, emotions, library, commerce, etc.)
- **Safety First**: COPPA/GDPR compliant with child safety features built-in
- **Platform Integration**: Works with Alexa, web, mobile apps, and REST APIs

## Who It Serves

### Primary Users
- **Children (ages 3-12)**: Primary end users who interact with stories
- **Parents/Guardians**: Manage accounts, monitor usage, control content
- **Educators**: Use in classroom settings for educational storytelling

### Secondary Users
- **Developers**: Integrate Storytailor into their applications
- **Partners**: White-label or embed Storytailor functionality
- **Content Creators**: Create and publish stories to the platform

## What It Is Not

- **Not a general-purpose chatbot**: Focused specifically on storytelling
- **Not a content library**: Generates personalized content, not just serves existing stories
- **Not a standalone app**: Designed as a platform/SDK for integration
- **Not a social platform**: No user-to-user interaction features
- **Not an educational curriculum**: Supports education but doesn't prescribe curriculum

## Core Principles

1. **Child Safety**: All features designed with COPPA compliance and child safety as top priority
2. **Personalization**: Every interaction adapts to the individual child
3. **Multi-Modal**: Supports voice, text, and visual interactions
4. **Extensible**: Agent-based architecture allows adding new capabilities
5. **Production-Ready**: Built for scale, reliability, and maintainability

## Key Differentiators

- **Multi-Agent Architecture**: Specialized agents for different concerns (content, emotions, library, etc.)
- **Emotion-Aware**: Tracks and responds to child's emotional state
- **Age-Appropriate Communication**: Adapts language and content to child's developmental stage
- **Parental Controls**: Comprehensive dashboard for parents to manage child's experience
- **Developer-Friendly**: Well-documented APIs and SDKs for easy integration

## Technical Foundation

- **Backend**: TypeScript monorepo with Turbo for build orchestration
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Caching**: Redis for conversation state
- **Communication**: gRPC for inter-agent communication
- **Deployment**: AWS Lambda functions for serverless scaling
- **Testing**: Jest with 90% coverage target

## Related Documentation

- [Mental Model](./MENTAL_MODEL.md) - How the system works
- [How We Work](./HOW_WE_WORK.md) - Development workflow
- [Architecture Overview](../README.md#architecture-overview) - Technical architecture
