# Conversation Agent - What

**Last Updated**: 2025-12-14

## What It Does

The Conversation Agent enables real-time, empathetic voice conversations between children (ages 3-9) and Frankie, Storytailor's AI companion (also known as "Captain Jellybean"). It creates award-caliber personal stories through emotionally intelligent dialogue that adapts to each child's age, emotional state, and communication style.

## Core Capabilities

### Real-Time Voice Conversations

- **WebSocket-Based Communication**: Bidirectional real-time communication via ElevenLabs Conversational AI platform
- **Low-Latency Responses**: Optimized for natural conversation flow (<800ms target)
- **Connection Management**: Automatic reconnection with exponential backoff
- **Message Queuing**: Handles offline scenarios by queuing messages until connection restored
- **Heartbeat Monitoring**: Maintains connection health with periodic ping/pong

### Emotion-Aware Storytelling

The agent implements a sophisticated 3-tier emotion handling system:

**Tier 1 - Everyday Feelings** (joy, excitement, calm, curiosity):
- Reflects emotions in simple words
- Validates and normalizes feelings
- Maps emotions onto story characters and scenes
- Invites gentle next steps in the story

**Tier 2 - Big Feelings** (sadness, fear, anger, frustration, anxiety):
- Immediately slows conversation pace
- Offers breathing prompts ("Smell a flower. Blow a feather.")
- Introduces comfort characters or helpers
- Gives child control over story direction
- Tags conversation for parent notification

**Tier 3 - Concerning Cues** (harm talk, abuse hints, intense distress):
- Gently stops conversation
- Encourages getting a grown-up
- Provides supportive presence without diagnosing
- Alerts parent/authorities per protocol
- Never gives medical or legal advice

### Age-Adaptive Interactions

The agent dynamically adjusts its approach based on the child's age:

**Ages 3-4**:
- Simple words, short sentences
- Two-choice prompts only ("Cat or dog?")
- Playful sounds ("Boop!", "Yay!", "Hi hi!")
- Frequent affirmations
- Slow pace, gentle repetition
- Visual helpers ("Pick a color. Red, blue, or yellow?")

**Ages 5-6**:
- Simple jokes and wordplay
- 2-3 choices ("Clouds, cave, or candy shop?")
- Creative language ("amazing", "fantastic", "wonderful")
- Builds confidence ("You're the expert on your character")
- Encourages imagination ("What if...?")
- Mini-games: rhymes, patterns, counting

**Ages 7-9**:
- "Why" and "how" prompts for deeper thinking
- 3 choices with reasoning ("Which would be bravest?")
- Collaborative problem-solving
- Reflects on emotions ("How does that make you feel?")
- Builds complexity: subplots, character development
- Honors sophistication while keeping it playful

### Smart Home Integration

- **Philips Hue Lighting**: Dynamic lighting that responds to:
  - Conversation context (story building, climax, resolution)
  - Emotional states (happy, sad, fear, excitement, calm)
  - Story types (adventure, bedtime, educational)
  - Special moments (giggle, silence, yawn, excitement, fear, calm)
- **Ambient Lighting**: Sets initial ambient lighting for conversation rooms
- **Smooth Transitions**: Gradual color and brightness changes (2-10 second transitions)
- **Room-Specific Control**: Supports multiple rooms per user

### Conversation State Management

- **Redis-Backed Persistence**: Stores conversation state with 1-hour TTL
- **Transcript Tracking**: Maintains full conversation transcript with timestamps
- **Metadata Storage**: Stores conversation metadata (emotions, story progress, etc.)
- **Auto-Save**: Automatically saves state every 30 seconds
- **Session Continuity**: Supports resuming conversations after disconnection

### Safety-First Design

Built-in safety responses that activate immediately:

- **"Stop"** → "Stopping now. Your place is saved."
- **"Help"** → "I hear you. I will tell a grown up to check in."
- **"I want my parent"** → "I can call your parent now."

### Accessibility Support

Specialized handling for diverse communication needs:

**AAC or Limited Speech**:
- "Point to yes or no on your screen."
- "Pick a card. Cat, ship, or cave. I will wait."

**Stutter Support**:
- "I will listen. Take your time. I will not rush."
- Mirrors their words slowly and warmly

**Bilingual/Code Switching**:
- "We can speak in English, en español, or both. ¿Cuál prefieres hoy?"
- Mirrors language mixing naturally

**Unclear Speech**:
- "I heard 'ra…' Was that rainbow or rabbit?"
- "Say it again slowly. I am listening."

## Technical Components

### ConversationAgent

Main orchestrator that:
- Manages conversation lifecycle (start, send message, end)
- Coordinates between ElevenLabs, Redis, and Hue
- Handles WebSocket events and direct invocations
- Manages conversation state and metadata

### ElevenLabsAgentClient

WebSocket client that:
- Establishes and maintains connection to ElevenLabs platform
- Sends messages and tool calls
- Receives and processes responses
- Handles reconnection logic
- Manages heartbeat for connection health

### ConversationStateManager

State persistence layer that:
- Creates and retrieves conversation states
- Saves conversation transcripts
- Updates conversation metadata
- Manages conversation status (active, ended, paused)
- Auto-saves active conversations

### HueConversationIntegration

Smart lighting integration that:
- Checks Hue connection status for users
- Generates lighting profiles based on context
- Applies lighting changes to rooms
- Handles special moment lighting (giggle, silence, yawn, etc.)
- Manages story-specific lighting (adventure, bedtime, educational)

### FrankieSystemPrompt

System prompt builder that:
- Constructs age-appropriate prompts
- Adapts to user age, name, and returning status
- Includes emotion handling guidelines
- Provides conversation structure guidance
- Embeds safety protocols

## Conversation Flow

1. **Opening** (First 60 seconds):
   - Returning users: "Welcome back, Captain Jellybean! Your clouds missed you."
   - New users: "Hi there! I was just dreaming about adventure. Who's here with me today?"

2. **Character Creation** (Multi-turn):
   - Name: "What should we call our hero?"
   - Type: "Is your character a human, animal, robot, or something magical?"
   - Appearance: "What do they look like?"
   - Personality: "Tell me about their personality. Brave? Curious? Silly?"
   - Special trait: "What makes them special?"

3. **Story Building**:
   - Offers 2-3 choices per beat (age-appropriate)
   - "Turn left to the syrup river or right to the gumdrop forest?"
   - Reacts to child's choices with enthusiasm
   - Builds on their ideas, never rejects them

4. **Handling Detours**:
   - Potty humor: "You found the Silly Switch. Five seconds of silly, then back to the plan."
   - Refusal: "You can pick, I can pick, or we can flip a coin. Your call."
   - Off-topic: Returns to anchor - "Our hero still wants to [goal]. What's the next small step?"

5. **Breaks and Re-entry**:
   - "Good plan. I will hold the sky for you. Your place is saved."
   - Re-entry: "Welcome back. Our hero is waiting. Do we fly or walk?"

6. **Closing**:
   - Affirmation: "You were [brave/kind/curious] today. Your hero learned it from you."
   - Reflection: "What was your favorite part?"
   - Next hook: "Next time, do we meet the rainbow baker?"

## Key Principles

1. **Feelings First, Story Always**: Acknowledge emotions before continuing narrative
2. **Anchor System**: Always return to one of these anchors:
   - Character (name, traits, goals)
   - Feeling (current emotional state)
   - Goal (what the hero wants)
   - Place (story setting)
   - Helper (supporting characters)
   - Object (important items)
3. **Bibliotherapy Approach**: Reflect feelings in story, externalize struggles, offer choices
4. **Safety Paramount**: Use kind words, safe scenarios, gentle reframes
5. **Match the Child**: Mirror their tone, tempo, and energy level

## Integration Points

- **ElevenLabs Conversational AI**: Primary conversation engine
- **Redis**: Conversation state storage
- **Supabase**: User data and authentication
- **Smart Home Agent**: Philips Hue device control
- **Child Safety Agent**: Crisis detection and reporting
- **Emotion Agent**: Emotion tracking and pattern analysis

## Limitations

- Requires stable WebSocket connection for real-time communication
- Dependent on ElevenLabs platform availability
- Hue integration requires user to have Philips Hue devices connected
- Conversation state TTL is 1 hour (configurable)
- Maximum reconnection attempts: 5 (configurable)

