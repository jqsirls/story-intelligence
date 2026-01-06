# Kid Communication Intelligence Test Suite

Comprehensive test suite for the Kid Communication Intelligence System, including unit tests, integration tests, and simulation tests.

## Test Structure

### Unit Tests
- `kid-intelligence-service.test.ts` - Core service tests
- Tests initialization, audio preprocessing, transcription enhancement, and multimodal processing

### Simulation Tests
- `simulations/child-speech-simulation.test.ts` - Real-world child speech pattern simulations
- Tests age-specific speech patterns (3-4, 5-7, 8-10)
- Tests invented words, incomplete thoughts, topic jumps, emotional speech

### Integration Tests
- `integration/universal-agent-integration.test.ts` - Integration with Universal Agent
- Tests voice input processing, edge case handling, and end-to-end conversation flows

## Running Tests

```bash
# Run all Kid Intelligence tests
npm test -- tests/kid-communication-intelligence

# Run simulation tests only
npm test -- tests/kid-communication-intelligence/simulations

# Run integration tests only
npm test -- tests/kid-communication-intelligence/integration

# Run with coverage
npm test -- --coverage tests/kid-communication-intelligence
```

## Test Scenarios Covered

### Age 3-4 Patterns
- Invented words (e.g., "wuggy" for "thing")
- Incomplete thoughts with ellipsis
- Repetitive speech patterns
- Simple emotional expressions

### Age 5-7 Patterns
- Topic jumps and non-linear logic
- Question cascades
- Emotional speech with context
- Complex invented words

### Age 8-10 Patterns
- Complex invented words with context inference
- Question cascades
- Multi-part requests
- Abstract concepts

### Real-World Scenarios
- Mixed invented and real words
- Emotional distress signals
- Voice characteristic adaptation over time
- Multimodal input (voice + gesture)

## Requirements

- Jest test framework
- TypeScript support
- Mock Supabase and Redis (or test credentials)
- Test logger utility from `tests/helpers/setup.ts`
