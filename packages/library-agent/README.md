# LibraryAgent

The LibraryAgent is a comprehensive library management system with role-based access control, sub-library support, and emotional insights tracking. It provides COPPA-compliant features for managing children's story libraries with hierarchical permissions and emotional check-ins.

## Features

### Core Library Management (Task 7.1)
- **Library CRUD Operations**: Create, read, update, and delete libraries with automatic owner assignment
- **Cascade Deletion**: Safe deletion with cascade handling for stories and characters
- **Library Search**: Advanced filtering and search functionality
- **Insights Storage**: Pattern analysis and usage statistics for libraries

### Sub-Library System (Task 7.2)
- **Child Profiles**: Create sub-libraries for individual children/students
- **Avatar Selection**: Character avatar system (no child photos) for sub-library representation
- **Hierarchical Access**: Main library can filter and see all sub-library stories
- **Emotional Isolation**: Emotional check-ins scoped to individual sub-libraries
- **Pattern Detection**: Individual pattern analysis per sub-library

### Permission Management (Task 7.3)
- **Role-Based Access Control**: Owner, Admin, Editor, Viewer roles via permissions table
- **Transferable Ownership**: Owner role can be reassigned with proper validation
- **Permission Sharing**: Parents/teachers can grant access to others
- **Permission Inheritance**: Sub-libraries inherit permissions from parent libraries
- **COPPA Compliance**: Verified parent email requirement for under-13 libraries
- **Permission Validation**: Middleware for all operations

### Story and Character Management (Task 7.4)
- **Story CRUD**: Full story management with permission enforcement
- **Story Transfer**: Library-to-library transfers with acceptance workflow
- **Story Search**: Advanced search and filtering within accessible libraries
- **Character CRUD**: Character management with library association
- **Character Sharing**: Cross-library character sharing with copy/reference options

## Installation

```bash
npm install @alexa-multi-agent/library-agent
```

## Configuration

```typescript
import { LibraryAgent, LibraryAgentConfig } from '@alexa-multi-agent/library-agent';

const config: LibraryAgentConfig = {
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-anon-key',
  enableInsights: true,
  insightsUpdateInterval: 60 // minutes
};

const libraryAgent = new LibraryAgent(config);
```

## Usage Examples

### Basic Library Operations

```typescript
const context = {
  user_id: 'user-123',
  session_id: 'session-456',
  correlation_id: 'corr-789'
};

// Create a library
const library = await libraryAgent.createLibrary(
  { name: 'My Family Stories' },
  context
);

// Create a sub-library with avatar
const childLibrary = await libraryAgent.createSubLibrary(
  library.id,
  { 
    name: 'Emma\'s Stories',
    avatar_type: 'animal',
    avatar_data: {
      animal: 'unicorn',
      color: 'rainbow',
      accessories: ['crown', 'wings']
    }
  },
  context
);

// Get user's libraries
const userLibraries = await libraryAgent.getUserLibraries(context);
```

### Permission Management

```typescript
// Grant permission
await libraryAgent.grantPermission(
  libraryId,
  {
    user_id: 'teacher-456',
    role: 'Editor'
  },
  context
);

// Transfer ownership
await libraryAgent.transferOwnership(
  libraryId,
  'new-owner-789',
  context
);

// Get library permissions
const permissions = await libraryAgent.getLibraryPermissions(libraryId, context);
```

### Emotional Check-ins

```typescript
// Record emotional check-in
const checkin = await libraryAgent.recordEmotionalCheckin(
  subLibraryId,
  'happy',
  0.9,
  context,
  {
    activity: 'story_creation',
    notes: 'Child was excited about creating a character'
  }
);

// Get emotional patterns
const patterns = await libraryAgent.getSubLibraryEmotionalPatterns(
  subLibraryId,
  30, // last 30 days
  context
);

// Get mood summary
const moodSummary = await libraryAgent.getSubLibraryMoodSummary(
  subLibraryId,
  context
);
```

### Story Management

```typescript
// Get library stories
const stories = await libraryAgent.getLibraryStories(libraryId, context);

// Search stories
const searchResults = await libraryAgent.searchStories(
  'unicorn',
  [libraryId1, libraryId2],
  context
);

// Transfer story
const transferResponse = await libraryAgent.transferStory(
  {
    story_id: 'story-123',
    target_library_id: 'library-456',
    transfer_message: 'Would you like this story?'
  },
  context
);

// Respond to transfer
await libraryAgent.respondToStoryTransfer(
  transferResponse.transfer_id,
  'accepted',
  context,
  'Thank you for sharing!'
);
```

### Character Management

```typescript
// Get story characters
const characters = await libraryAgent.getStoryCharacters(storyId, context);

// Share character
const sharedCharacter = await libraryAgent.shareCharacter(
  {
    character_id: 'character-123',
    target_library_id: 'library-456',
    share_type: 'copy'
  },
  context
);

// Search characters
const unicornCharacters = await libraryAgent.searchCharacters(
  'unicorn',
  [libraryId1, libraryId2],
  context
);
```

## Database Schema

The LibraryAgent requires the following database tables:

- `libraries` - Main library storage
- `library_permissions` - Role-based access control
- `library_insights` - Pattern analysis and statistics
- `sub_library_avatars` - Avatar data for sub-libraries
- `story_transfer_requests` - Story transfer workflow
- `character_shares` - Character sharing across libraries
- `emotions` - Emotional check-ins with sub-library scoping

## COPPA Compliance

The system includes built-in COPPA compliance features:

- Parent consent verification for users under 13
- Automatic data retention policies
- Privacy-compliant emotional data handling
- Audit logging with PII protection

## Error Handling

The LibraryAgent uses typed error classes:

- `LibraryError` - General library operation errors
- `PermissionError` - Access control violations
- `COPPAComplianceError` - COPPA compliance violations
- `LibraryNotFoundError` - Library not found
- `StoryNotFoundError` - Story not found
- `CharacterNotFoundError` - Character not found

## Testing

```bash
npm test
```

## Building

```bash
npm run build
```

## License

This package is part of the Alexa Multi-Agent System and follows the same licensing terms.