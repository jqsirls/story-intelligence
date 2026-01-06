Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2.6 - Prompts library index with code references

# Prompts Library

## Overview

This directory contains all prompts used throughout the Storytailor platform, organized by category. All prompts are extracted from actual code with file paths and line numbers for verification.

## Categories

1. **[Conversation Prompts](./conversation.md)** - Frankie system prompt, emotion response guidance, conversational responses
2. **[Content Generation Prompts](./content-generation.md)** - Story creation, hero's journey, story beats, character generation
3. **[Visual Generation Prompts](./visual-generation.md)** - Art generation, character art, cover art, body illustrations, global art style
4. **[Voice Generation Prompts](./voice-generation.md)** - Narration, audio generation
5. **[Safety Prompts](./safety.md)** - Content moderation, inappropriate content detection, disclosure detection, crisis detection
6. **[Orchestration Prompts](./orchestration.md)** - Intent classification, story type classification, character extraction

## Usage

Each prompt document includes:
- Full prompt text
- Code location (file path and line numbers)
- Context and parameters
- Age-appropriate variations
- Related prompts

## Code References

All prompts are verified against actual code in:
- `packages/content-agent/src/services/`
- `packages/router/src/services/`
- `packages/content-agent/src/services/`
- `lambda-deployments/conversation-agent/src/prompts/`
- `lambda-deployments/content-agent/src/constants/`
