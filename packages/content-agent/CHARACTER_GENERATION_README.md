# Voice-Driven Character Generation System

## Overview

The Voice-Driven Character Generation System is a comprehensive solution for creating rich, diverse, and age-appropriate characters through natural conversation. It supports the full character creation lifecycle from initial conversation to database persistence, with built-in validation, inclusivity support, and COPPA compliance.

## Features

### 🎭 Conversational Character Creation
- **Natural Language Processing**: Extracts character traits from natural conversation
- **Phase-Based Flow**: Guides users through character creation phases (greeting → basic traits → species → appearance → personality → inclusivity → validation → confirmation)
- **Age-Appropriate Interaction**: Adapts conversation style based on child's age
- **Real-Time Validation**: Validates character traits as they're collected

### 🌈 Comprehensive Inclusivity Support
- **Multi-Racial Characters**: Support for mixed-race and multi-ethnic characters
- **Disability Representation**: Autism, wheelchair users, prosthetics, Down syndrome, asthma, and more
- **Species Diversity**: Human, animal, robot, magical creature, elemental, superhero, monster
- **Cultural Sensitivity**: Age-appropriate handling of diverse backgrounds

### 🔒 Safety & Compliance
- **COPPA Compliance**: Parent consent validation for users under 13
- **Content Moderation**: OpenAI moderation integration with custom safety filters
- **Age Appropriateness**: Automatic validation of character traits for target age
- **Privacy Protection**: PII hashing and data retention policies

### 💾 Database Integration
- **Library Association**: Characters belong to libraries with permission-based access
- **CRUD Operations**: Full create, read, update, delete functionality
- **Search & Filtering**: Advanced character search with multiple filters
- **Statistics**: Character analytics and distribution metrics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ContentAgent                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Character       │  │ Character        │  │ Character   │ │
│  │ Generation      │  │ Conversation     │  │ Database    │ │
│  │ Service         │  │ Manager          │  │ Service     │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    Supabase       │
                    │   (Characters     │
                    │    Database)      │
                    └───────────────────┘
```

## Usage Examples

### Basic Character Creation

```typescript
import { ContentAgent } from '@alexa-multi-agent/content-agent';

const contentAgent = new ContentAgent(config);
await contentAgent.initialize();

// Start character conversation
const conversation = await contentAgent.startCharacterConversation(
  'user_123',
  'library_456',
  8 // Child's age
);

// Continue conversation with user input
const response = await contentAgent.continueCharacterConversation(
  conversation.sessionId,
  "I want to create a character named Luna who is a magical unicorn",
  8
);

// Character will be automatically created when conversation is complete
if (response.character) {
  console.log('Character created:', response.character);
}
```

### Direct Character Creation

```typescript
// Create character directly from traits
const character = await contentAgent.createCharacter(
  'library_456',
  'Alex',
  {
    name: 'Alex',
    age: 9,
    species: 'human',
    appearance: {
      eyeColor: 'brown',
      hairColor: 'curly black',
      devices: ['hearing aid']
    },
    personality: ['creative', 'determined'],
    inclusivityTraits: [{
      type: 'autism',
      description: 'Sees patterns others miss',
      storyIntegration: 'Uses unique perspective to solve problems'
    }]
  },
  'A creative 9-year-old human with brown eyes and curly black hair'
);
```

### Character Management

```typescript
// Get all characters in a library
const characters = await contentAgent.getLibraryCharacters('library_456');

// Search characters with filters
const magicalCharacters = await contentAgent.searchCharacters({
  libraryId: 'library_456',
  species: 'magical_creature',
  ageRange: { min: 5, max: 12 },
  hasInclusivityTraits: true
});

// Update character
const updatedCharacter = await contentAgent.updateCharacter('char_123', {
  appearanceUrl: 'https://example.com/character-art.jpg'
});

// Delete character
await contentAgent.deleteCharacter('char_123');

// Get library statistics
const stats = await contentAgent.getLibraryCharacterStats('library_456');
```

## Character Traits Structure

```typescript
interface CharacterTraits {
  name: string;
  age?: number;
  species: 'human' | 'robot' | 'monster' | 'magical_creature' | 'elemental' | 'superhero' | 'animal';
  race?: string[]; // For human-type species
  ethnicity?: string[]; // Multi-racial support
  gender?: string;
  inclusivityTraits?: InclusivityTrait[];
  appearance: {
    eyeColor?: string;
    hairColor?: string;
    hairTexture?: string;
    clothing?: string;
    height?: string;
    weight?: string;
    accessories?: string[];
    scars?: string[];
    devices?: string[]; // Prosthetics, wheelchairs, etc.
  };
  personality?: string[];
  interests?: string[];
  strengths?: string[];
  challenges?: string[];
}
```

## Conversation Phases

1. **Greeting**: Welcome and introduction
2. **Basic Traits**: Name and age collection
3. **Species Selection**: Choose character type
4. **Appearance Details**: Physical description
5. **Personality Traits**: Character personality
6. **Inclusivity Traits**: Optional diversity traits
7. **Validation**: Review and validate character
8. **Confirmation**: Final approval
9. **Complete**: Character creation finished

## Inclusivity Support

### Supported Inclusivity Traits
- **Autism**: Characters who think and learn differently
- **Wheelchair**: Characters who use wheelchairs
- **Prosthetic**: Characters with prosthetic limbs
- **Down Syndrome**: Characters with Down syndrome
- **Asthma**: Characters who need inhalers
- **Foster**: Characters in foster care
- **Gifted**: Characters with exceptional abilities
- **Other**: Custom inclusivity traits

### Multi-Racial Support
```typescript
const multiRacialCharacter = {
  name: 'Maya',
  species: 'human',
  race: ['Asian', 'White'],
  ethnicity: ['Japanese', 'Irish'],
  // ... other traits
};
```

## Validation System

### Age Appropriateness
- Character age validation relative to user age
- Content safety checks for personality traits
- Automatic filtering of inappropriate content

### Required Fields
- Name (required)
- Age (required)
- Species (required)
- Basic appearance details (recommended)

### Safety Checks
- Flags violent or scary personality traits
- Validates age appropriateness
- Ensures positive, child-friendly characteristics

## Database Schema

```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES libraries NOT NULL,
  story_id UUID REFERENCES stories, -- Optional
  name TEXT NOT NULL,
  traits JSONB NOT NULL,
  art_prompt TEXT,
  appearance_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Reference

### ContentAgent Methods

#### Character Conversation
- `startCharacterConversation(userId, libraryId, ageContext?)`: Start new conversation
- `continueCharacterConversation(sessionId, userInput, ageContext?)`: Continue conversation
- `getCharacterConversationSession(sessionId)`: Get session details
- `endCharacterConversationSession(sessionId)`: End session

#### Character CRUD
- `createCharacter(libraryId, name, traits, artPrompt?)`: Create character
- `getCharacter(characterId)`: Get character by ID
- `updateCharacter(characterId, updates)`: Update character
- `deleteCharacter(characterId)`: Delete character
- `getLibraryCharacters(libraryId)`: Get all library characters

#### Character Search & Analytics
- `searchCharacters(options)`: Search with filters
- `isCharacterNameUnique(libraryId, name, excludeId?)`: Check name uniqueness
- `getLibraryCharacterStats(libraryId)`: Get statistics

#### Validation & Options
- `validateCharacter(traits, ageContext?)`: Validate character
- `getCharacterSpeciesOptions()`: Get species options
- `getCharacterInclusivityOptions()`: Get inclusivity options

## Testing

```bash
# Run character generation tests
npm test -- --testPathPattern=CharacterGenerationService.test.ts

# Run database service tests
npm test -- --testPathPattern=CharacterDatabaseService.test.ts

# Run all content agent tests
npm test
```

## Example Usage

See `character-generation-example.ts` for comprehensive usage examples including:
- Complete conversation flow
- Character validation
- Inclusivity support
- CRUD operations
- Error handling

## Configuration

```typescript
const config: ContentAgentConfig = {
  openaiApiKey: 'your-openai-key',
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  redisUrl: 'redis://localhost:6379',
  moderationEnabled: true,
  logLevel: 'info'
};
```

## Error Handling

The system includes comprehensive error handling for:
- API failures (OpenAI, Supabase)
- Permission violations
- COPPA compliance issues
- Validation failures
- Network connectivity issues

## Performance Considerations

- **Caching**: Redis caching for conversation sessions
- **Validation**: Client-side and server-side validation
- **Pagination**: Search results support pagination
- **Indexing**: Database indexes for performance
- **Connection Pooling**: Supabase connection management

## Security Features

- **Row-Level Security**: Database-level permission enforcement
- **PII Protection**: Automatic hashing of sensitive data
- **Content Moderation**: Multi-layer safety checks
- **Audit Logging**: Complete audit trail
- **COPPA Compliance**: Under-13 protection

## Future Enhancements

- Voice-to-text integration for true voice input
- Real-time character art generation
- Character animation support
- Multi-language character creation
- Advanced personality assessment
- Character relationship mapping