# Library Agent - Usage Guidelines

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-11

## When to Use This Agent

### Always Use Library Agent For:
1. **Saving Stories**: All story persistence
2. **Saving Characters**: All character persistence
3. **Retrieving Libraries**: Getting user's story/character libraries
4. **Content Organization**: Organizing and searching content
5. **Metadata Management**: Managing story and character metadata

### Use Cases

#### Story Library Access
**When**: User wants to view their stories
**Library Agent Actions**:
- Retrieves all user stories
- Organizes by date, type, favorites
- Returns formatted list

#### Character Library Access
**When**: User wants to view their characters
**Library Agent Actions**:
- Retrieves all user characters
- Displays character cards
- Provides character details

#### Story Save
**When**: Content Agent creates a story
**Library Agent Actions**:
- Saves story to database
- Stores metadata
- Links assets
- Updates user library

## When NOT to Use It

### Story Generation
**When**: User wants to create a story
**Use**: Content Agent (Library Agent is called by Content Agent)

### Character Creation
**When**: User wants to create a character
**Use**: Content Agent (Library Agent is called by Content Agent)

### Content Moderation
**When**: Content needs safety screening
**Use**: Content Agent or Child Safety Agent (not Library Agent)

## Timing Considerations

### Library Retrieval
- **Response Time**: ~100-500ms
- **Cached Content**: ~10-50ms (if cached in Redis)

### Story/Character Save
- **Response Time**: ~100-300ms
- **Database Write**: ~50-200ms

## Best Practices

### 1. Always Use Library Agent for Persistence
```typescript
// Don't write directly to database
// Use Library Agent instead
await libraryAgent.saveStory(story);
```

### 2. Cache Frequently Accessed Content
```typescript
// Library Agent should cache frequently accessed libraries
const stories = await libraryAgent.getUserStories(userId); // Cached
```

### 3. Handle Errors Gracefully
```typescript
try {
  const stories = await libraryAgent.getUserStories(userId);
} catch (error) {
  // Handle gracefully, return empty library or cached content
}
```

## Common Patterns

### Pattern 1: Save Story After Creation
```typescript
// Content Agent creates story
const story = await contentAgent.createStory(...);

// Library Agent saves story
await libraryAgent.saveStory(story);
```

### Pattern 2: Retrieve Library for Display
```typescript
// User requests library
const stories = await libraryAgent.getUserStories(userId);
const characters = await libraryAgent.getUserCharacters(userId);
```

## Anti-Patterns to Avoid

1. **Direct Database Access**: Don't access database directly, use Library Agent
2. **Bypassing Library Agent**: Don't bypass Library Agent for persistence
3. **Not Handling Errors**: Always handle Library Agent errors gracefully
4. **Not Caching**: Cache frequently accessed libraries for performance
