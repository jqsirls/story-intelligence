# Alexa Multi-Agent System

Production-ready backend architecture integrating Storytailor with Amazon's Alexa AI Multi-Agent SDK.

## Architecture Overview

This system implements a hub-and-spoke multi-agent architecture with:

- **StorytailorAgent**: Universal conversation agent for channel-agnostic storytelling
- **Router**: Intent classification and delegation orchestrator
- **AuthAgent**: Account linking and authentication
- **ContentAgent**: Story and character generation
- **LibraryAgent**: Library management with RLS enforcement
- **EmotionAgent**: Emotion tracking and pattern detection
- **CommerceAgent**: Subscription and billing management
- **InsightsAgent**: Pattern analysis and recommendations

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Supabase CLI
- Redis

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd alexa-multi-agent-system
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure services:**
   ```bash
   npm run infrastructure:start
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Start all agents in development mode:**
   ```bash
   npm run agents:start
   ```

## Development Commands

### Infrastructure Management
- `npm run infrastructure:start` - Start Supabase and Redis
- `npm run infrastructure:stop` - Stop all infrastructure
- `npm run infrastructure:reset` - Reset and restart infrastructure

### Supabase Commands
- `npm run supabase:start` - Start local Supabase
- `npm run supabase:stop` - Stop Supabase
- `npm run supabase:reset` - Reset database

### Redis Commands
- `npm run redis:start` - Start Redis container
- `npm run redis:stop` - Stop Redis container

### Development
- `npm run dev` - Start all agents in watch mode
- `npm run build` - Build all packages
- `npm run test` - Run all tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages

### Protocol Buffers
- `npm run proto:build` - Build gRPC protocol definitions

## Project Structure

```
alexa-multi-agent-system/
├── packages/
│   ├── shared-types/          # Shared TypeScript types and schemas
│   ├── storytailor-agent/     # Universal conversation agent
│   ├── router/                # Intent classification and routing
│   ├── auth-agent/           # Authentication and account linking
│   ├── content-agent/        # Story and character generation
│   ├── library-agent/        # Library management
│   ├── emotion-agent/        # Emotion tracking
│   ├── commerce-agent/       # Billing and subscriptions
│   └── insights-agent/       # Analytics and recommendations
├── supabase/                 # Database migrations and config
├── docker-compose.yml        # Redis and development services
└── turbo.json               # Monorepo build configuration
```

## Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `REDIS_HOST` - Redis host (default: 127.0.0.1)
- `REDIS_PORT` - Redis port (default: 6379)
- `OPENAI_API_KEY` - OpenAI API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `STRIPE_SECRET_KEY` - Stripe secret key

### Database Setup

The system uses Supabase with Row Level Security (RLS) policies for COPPA/GDPR compliance:

1. Start Supabase: `npm run supabase:start`
2. Migrations are automatically applied
3. Access Supabase Studio at http://localhost:54323

### Redis Setup

Redis is used for conversation state caching and short-term memory:

1. Start Redis: `npm run redis:start`
2. Access Redis Commander at http://localhost:8081
3. Default configuration uses database 0 with `storytailor:` key prefix

## Testing

### Unit Tests
```bash
npm run test
```

### Coverage Reports
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## gRPC Services

Each agent exposes gRPC services defined in `packages/shared-types/src/schemas/agent-rpc.proto`:

- **AuthAgent**: Authentication and account linking
- **Router**: Intent classification and delegation
- **ContentAgent**: Story and character generation
- **LibraryAgent**: Library CRUD operations
- **EmotionAgent**: Emotion tracking and analysis
- **CommerceAgent**: Billing and subscription management

## Monitoring and Observability

### Health Checks
Each agent exposes health check endpoints:
- `GET /health` - Service health status
- `GET /metrics` - Service metrics

### Logging
Structured JSON logging with correlation IDs:
- Winston logger with configurable levels
- PII tokenization (SHA-256 hashing)
- Correlation ID tracking across services

### Error Handling
- Circuit breaker pattern for external APIs
- Exponential backoff for retries
- Graceful degradation strategies

## Compliance

### COPPA Compliance
- Verified parent email for under-13 users
- Automatic data retention policies
- Consent management workflows

### GDPR Compliance
- Right to be forgotten implementation
- Data export functionality
- Privacy-by-design architecture
- Automated PII detection and redaction

## Performance

### Scalability
- Stateless agent design
- Independent horizontal scaling
- Redis-based state management
- Connection pooling

### Latency Targets
- <800ms voice response time
- <150ms cold start performance
- Circuit breakers for external API failures

## Documentation

For comprehensive documentation, see the [docs directory](./docs/README.md).

**Quick Links**:
- [What This Is](./docs/WHAT_THIS_IS.md) - Product overview
- [Mental Model](./docs/MENTAL_MODEL.md) - System architecture
- [How We Work](./docs/HOW_WE_WORK.md) - Development workflow
- [Naming](./docs/NAMING.md) - Naming conventions
- [Ownership](./docs/OWNERSHIP.md) - Ownership and responsibilities
- [Decisions](./docs/DECISIONS.md) - Decision log
- [AGENTS.md](./AGENTS.md) - Guide for AI coding agents
- [Contributing](./CONTRIBUTING.md) - How to contribute

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a PR.

**Quick Checklist**:
1. Follow TypeScript strict mode
2. Maintain 90% test coverage
3. Use conventional commit messages
4. Update documentation for API changes
5. **No disposable artifacts** (see [How We Work](./docs/HOW_WE_WORK.md#disposable-artifacts-policy))

See [How We Work](./docs/HOW_WE_WORK.md) for detailed workflow and [CONTRIBUTING.md](./CONTRIBUTING.md) for full contribution guidelines.

## License

[License information]