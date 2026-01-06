# Code Generators

Accelerate your integration with Storytailor's code generators. Generate production-ready code for common integration patterns across multiple platforms and languages.

## 🚀 Quick Start

### Online Code Generator
**[Launch Code Generator →](https://tools.storytailor.com/code-generator)**

### CLI Tool
```bash
npm install -g @storytailor/cli
storytailor generate --help
```

## Available Generators

### 1. SDK Integration Generators

#### Web SDK Integration
Generate complete web integration code:

```bash
storytailor generate web-sdk \
  --framework react \
  --features voice,offline,theming \
  --output ./src/components/
```

**Generated Files:**
- `StorytellerWidget.jsx` - Main component
- `storyteller-config.js` - Configuration
- `storyteller-styles.css` - Styling
- `README.md` - Integration guide

#### Mobile SDK Integration
Generate native mobile app integration:

```bash
# iOS Swift
storytailor generate ios-sdk \
  --language swift \
  --features voice,offline,push \
  --output ./ios/Storyteller/

# Android Kotlin  
storytailor generate android-sdk \
  --language kotlin \
  --features voice,offline,push \
  --output ./android/app/src/main/

# React Native
storytailor generate react-native-sdk \
  --features voice,offline,push \
  --output ./src/storyteller/
```

### 2. API Integration Generators

#### REST API Client
Generate complete API client libraries:

```bash
storytailor generate api-client \
  --language javascript \
  --features auth,webhooks,streaming \
  --output ./src/api/
```

**Supported Languages:**
- JavaScript/TypeScript
- Python
- PHP
- Java
- C#
- Go
- Ruby
- Swift
- Kotlin

#### GraphQL Integration
Generate GraphQL client and queries:

```bash
storytailor generate graphql \
  --client apollo \
  --features subscriptions,caching \
  --output ./src/graphql/
```

### 3. Webhook Handlers

#### Express.js Webhook Handler
```bash
storytailor generate webhook \
  --framework express \
  --events story.completed,character.created \
  --output ./src/webhooks/
```

**Generated Code:**
```javascript
// webhook-handler.js
const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// Webhook signature verification
const verifySignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Story completed webhook
router.post('/story-completed', (req, res) => {
  const signature = req.headers['x-storytailor-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifySignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }
  
  const { storyId, title, completedAt } = req.body.data;
  
  // Your business logic here
  console.log(`Story completed: ${title} (${storyId})`);
  
  res.status(200).send('OK');
});

module.exports = router;
```

### 4. Voice Platform Extensions

#### Alexa Skill Integration
```bash
storytailor generate alexa-skill \
  --skill-name "My Story App" \
  --features account-linking,apl \
  --output ./alexa-skill/
```

#### Google Assistant Action
```bash
storytailor generate google-action \
  --action-name "My Story App" \
  --features account-linking,rich-responses \
  --output ./google-action/
```

### 5. White-Label Solutions

#### Complete Application Generator
```bash
storytailor generate white-label \
  --platform web \
  --framework react \
  --features auth,billing,admin \
  --branding custom \
  --output ./white-label-app/
```

**Generated Application Structure:**
```
white-label-app/
├── src/
│   ├── components/
│   │   ├── StorytellerChat/
│   │   ├── UserDashboard/
│   │   └── AdminPanel/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Stories.jsx
│   │   └── Settings.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── billing.js
│   └── styles/
│       ├── theme.css
│       └── components.css
├── public/
├── package.json
└── README.md
```

## Interactive Code Generator

### Web Interface

Visit **[tools.storytailor.com/code-generator](https://tools.storytailor.com/code-generator)** for an interactive experience:

1. **Select Integration Type**
   - Web SDK
   - Mobile SDK
   - API Client
   - Webhook Handler
   - Voice Platform
   - White-Label App

2. **Choose Platform/Framework**
   - React, Vue, Angular, Vanilla JS
   - iOS (Swift), Android (Kotlin), React Native
   - Node.js, Python, PHP, Java, etc.

3. **Configure Features**
   - Voice input/output
   - Offline support
   - Real-time streaming
   - Push notifications
   - Custom theming

4. **Customize Settings**
   - API endpoints
   - Authentication method
   - Branding options
   - Error handling

5. **Generate & Download**
   - Preview generated code
   - Download as ZIP
   - Get integration instructions

### Configuration Options

#### Basic Configuration
```json
{
  "platform": "web",
  "framework": "react",
  "language": "javascript",
  "features": [
    "voice",
    "offline",
    "theming",
    "analytics"
  ],
  "apiVersion": "v1",
  "environment": "production"
}
```

#### Advanced Configuration
```json
{
  "platform": "web",
  "framework": "react",
  "language": "typescript",
  "features": {
    "voice": {
      "enabled": true,
      "autoPlay": true,
      "voiceSettings": {
        "speed": 1.0,
        "gender": "neutral"
      }
    },
    "offline": {
      "enabled": true,
      "maxStoredStories": 10,
      "syncOnReconnect": true
    },
    "theming": {
      "enabled": true,
      "customCSS": true,
      "themes": ["default", "dark", "child-friendly"]
    },
    "analytics": {
      "enabled": true,
      "events": ["story_start", "story_complete", "character_create"]
    }
  },
  "branding": {
    "appName": "My Story App",
    "primaryColor": "#6366f1",
    "logo": "https://example.com/logo.png"
  },
  "deployment": {
    "target": "vercel",
    "environment": "production",
    "customDomain": "stories.myapp.com"
  }
}
```

## CLI Code Generator

### Installation
```bash
npm install -g @storytailor/cli
```

### Basic Usage
```bash
# Generate web SDK integration
storytailor generate web-sdk --framework react --output ./src/

# Generate API client
storytailor generate api-client --language python --output ./api/

# Generate webhook handler
storytailor generate webhook --framework express --output ./webhooks/
```

### Advanced Usage
```bash
# Use configuration file
storytailor generate --config storytailor.config.json

# Interactive mode
storytailor generate --interactive

# Preview without generating files
storytailor generate web-sdk --framework react --preview

# Generate with custom template
storytailor generate --template ./custom-template/ --output ./src/
```

### Configuration File
```json
// storytailor.config.json
{
  "apiKey": "your-api-key",
  "defaultFramework": "react",
  "defaultLanguage": "typescript",
  "outputDirectory": "./src/storyteller/",
  "features": {
    "voice": true,
    "offline": true,
    "theming": true
  },
  "branding": {
    "appName": "My Story App",
    "primaryColor": "#6366f1"
  }
}
```

## Generated Code Examples

### React Component Generator

**Input:**
```bash
storytailor generate web-sdk \
  --framework react \
  --language typescript \
  --features voice,theming
```

**Generated Component:**
```typescript
// StorytellerWidget.tsx
import React, { useEffect, useRef, useState } from 'react';
import { StorytellerWebSDK, Story, Character } from '@storytailor/web-sdk';

interface StorytellerWidgetProps {
  apiKey: string;
  userId?: string;
  theme?: 'default' | 'dark' | 'child-friendly';
  voiceEnabled?: boolean;
  onStoryComplete?: (story: Story) => void;
  onCharacterCreate?: (character: Character) => void;
  onError?: (error: Error) => void;
}

export const StorytellerWidget: React.FC<StorytellerWidgetProps> = ({
  apiKey,
  userId,
  theme = 'default',
  voiceEnabled = true,
  onStoryComplete,
  onCharacterCreate,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<StorytellerWebSDK | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || sdkRef.current) return;

    const initializeSDK = async () => {
      try {
        sdkRef.current = new StorytellerWebSDK({
          apiKey,
          containerId: containerRef.current!.id,
          userId,
          theme,
          voiceEnabled,
          onReady: () => setIsLoading(false),
          onStoryComplete: (story) => {
            console.log('Story completed:', story);
            onStoryComplete?.(story);
          },
          onCharacterCreated: (character) => {
            console.log('Character created:', character);
            onCharacterCreate?.(character);
          },
          onError: (err) => {
            console.error('Storyteller error:', err);
            setError(err.message);
            onError?.(err);
          }
        });

        await sdkRef.current.initialize();
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        setIsLoading(false);
        onError?.(error);
      }
    };

    initializeSDK();

    return () => {
      if (sdkRef.current) {
        sdkRef.current.destroy();
        sdkRef.current = null;
      }
    };
  }, [apiKey, userId, theme, voiceEnabled, onStoryComplete, onCharacterCreate, onError]);

  if (error) {
    return (
      <div className="storyteller-error">
        <p>Error loading Storyteller: {error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="storyteller-container">
      {isLoading && (
        <div className="storyteller-loading">
          <div className="spinner" />
          <p>Loading Storyteller...</p>
        </div>
      )}
      <div
        ref={containerRef}
        id="storyteller-widget"
        className={`storyteller-widget theme-${theme}`}
      />
    </div>
  );
};

export default StorytellerWidget;
```

### Python API Client Generator

**Input:**
```bash
storytailor generate api-client \
  --language python \
  --features auth,async,retry
```

**Generated Client:**
```python
# storytailor_client.py
import asyncio
import aiohttp
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Story:
    id: str
    title: str
    content: str
    character: Dict[str, Any]
    created_at: datetime
    completed_at: Optional[datetime] = None

@dataclass
class Character:
    id: str
    name: str
    species: str
    traits: Dict[str, Any]
    created_at: datetime

class StorytellerAPIError(Exception):
    def __init__(self, message: str, status_code: int = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class StorytellerClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.storytailor.com/v1",
        timeout: int = 30,
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.max_retries = max_retries
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=self.timeout,
            headers={
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'Storytailor-Python-Client/1.0.0'
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not self.session:
            raise StorytellerAPIError("Client session not initialized. Use async context manager.")

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        for attempt in range(self.max_retries + 1):
            try:
                async with self.session.request(
                    method,
                    url,
                    json=data,
                    params=params
                ) as response:
                    response_data = await response.json()
                    
                    if response.status >= 400:
                        raise StorytellerAPIError(
                            response_data.get('error', {}).get('message', 'Unknown error'),
                            response.status
                        )
                    
                    return response_data
                    
            except aiohttp.ClientError as e:
                if attempt == self.max_retries:
                    raise StorytellerAPIError(f"Request failed after {self.max_retries} retries: {str(e)}")
                
                # Exponential backoff
                await asyncio.sleep(2 ** attempt)

    # Conversation methods
    async def start_conversation(
        self,
        user_id: str,
        story_type: str = "adventure",
        age_group: str = "6-8",
        language: str = "en",
        voice_enabled: bool = True
    ) -> Dict[str, Any]:
        """Start a new storytelling conversation."""
        data = {
            "userId": user_id,
            "storyType": story_type,
            "ageGroup": age_group,
            "language": language,
            "voiceEnabled": voice_enabled
        }
        return await self._make_request("POST", "/conversations", data)

    async def send_message(
        self,
        conversation_id: str,
        message: str,
        message_type: str = "text"
    ) -> Dict[str, Any]:
        """Send a message in a conversation."""
        data = {
            "message": message,
            "messageType": message_type,
            "metadata": {
                "timestamp": datetime.utcnow().isoformat(),
                "platform": "api"
            }
        }
        return await self._make_request("POST", f"/conversations/{conversation_id}/messages", data)

    # Story methods
    async def create_story(
        self,
        title: str,
        character: Dict[str, Any],
        story_type: str = "adventure",
        age_group: str = "6-8",
        generate_assets: bool = True
    ) -> Story:
        """Create a new story."""
        data = {
            "title": title,
            "character": character,
            "storyType": story_type,
            "ageGroup": age_group,
            "generateAssets": generate_assets
        }
        response = await self._make_request("POST", "/stories", data)
        return Story(**response['data'])

    async def get_story(self, story_id: str) -> Story:
        """Get a story by ID."""
        response = await self._make_request("GET", f"/stories/{story_id}")
        return Story(**response['data'])

    async def list_stories(
        self,
        user_id: Optional[str] = None,
        library_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Story]:
        """List stories with optional filtering."""
        params = {"limit": limit, "offset": offset}
        if user_id:
            params["userId"] = user_id
        if library_id:
            params["libraryId"] = library_id
            
        response = await self._make_request("GET", "/stories", params=params)
        return [Story(**story) for story in response['data']]

    # Character methods
    async def create_character(
        self,
        name: str,
        species: str,
        traits: Dict[str, Any]
    ) -> Character:
        """Create a new character."""
        data = {
            "name": name,
            "species": species,
            "traits": traits
        }
        response = await self._make_request("POST", "/characters", data)
        return Character(**response['data'])

    # Voice methods
    async def synthesize_speech(
        self,
        text: str,
        voice: str = "child-friendly-narrator",
        speed: float = 1.0,
        emotion: str = "neutral",
        format: str = "mp3"
    ) -> Dict[str, Any]:
        """Convert text to speech."""
        data = {
            "text": text,
            "voice": voice,
            "speed": speed,
            "emotion": emotion,
            "format": format
        }
        return await self._make_request("POST", "/voice/synthesize", data)

# Usage example
async def main():
    async with StorytellerClient("your-api-key") as client:
        # Start a conversation
        conversation = await client.start_conversation(
            user_id="user-123",
            story_type="adventure"
        )
        
        # Send a message
        response = await client.send_message(
            conversation["data"]["conversationId"],
            "I want to create a story about a brave dragon"
        )
        
        # Create a character
        character = await client.create_character(
            name="Spark",
            species="dragon",
            traits={
                "personality": ["brave", "kind", "curious"],
                "abilities": ["fire-breathing", "flying"]
            }
        )
        
        print(f"Created character: {character.name}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Custom Templates

### Creating Custom Templates

Create your own code generation templates:

```bash
# Create template directory
mkdir my-custom-template

# Template structure
my-custom-template/
├── template.json          # Template configuration
├── files/                 # Template files
│   ├── {{component}}.tsx.hbs
│   ├── config.js.hbs
│   └── README.md.hbs
└── hooks/                 # Pre/post generation hooks
    ├── pre-generate.js
    └── post-generate.js
```

**Template Configuration:**
```json
// template.json
{
  "name": "My Custom Template",
  "description": "Custom React component with advanced features",
  "version": "1.0.0",
  "platform": "web",
  "framework": "react",
  "language": "typescript",
  "variables": {
    "componentName": {
      "type": "string",
      "description": "Name of the component",
      "default": "StorytellerWidget"
    },
    "features": {
      "type": "array",
      "description": "Features to include",
      "options": ["voice", "offline", "theming", "analytics"]
    }
  },
  "files": [
    {
      "template": "{{component}}.tsx.hbs",
      "output": "{{componentName}}.tsx"
    },
    {
      "template": "config.js.hbs", 
      "output": "storyteller-config.js"
    }
  ]
}
```

### Using Custom Templates

```bash
# Use custom template
storytailor generate --template ./my-custom-template/ --output ./src/

# Publish template to registry
storytailor template publish ./my-custom-template/

# Use published template
storytailor generate --template my-custom-template --output ./src/
```

## Integration with IDEs

### VS Code Extension

Install the Storytailor Code Generator extension:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Storytailor Code Generator"
4. Install and reload

**Features:**
- Right-click context menu for code generation
- Integrated template browser
- Live preview of generated code
- Automatic file creation and organization

### JetBrains Plugin

Available for IntelliJ IDEA, WebStorm, PyCharm, and other JetBrains IDEs:

1. Go to File → Settings → Plugins
2. Search for "Storytailor Code Generator"
3. Install and restart IDE

## Best Practices

### Code Organization

```
src/
├── storyteller/
│   ├── components/        # Generated UI components
│   ├── services/         # Generated API clients
│   ├── hooks/            # Generated React hooks
│   ├── types/            # Generated TypeScript types
│   └── config/           # Configuration files
├── assets/               # Static assets
└── styles/               # Styling files
```

### Configuration Management

```javascript
// storyteller.config.js
export default {
  apiKey: process.env.STORYTAILOR_API_KEY,
  environment: process.env.NODE_ENV,
  features: {
    voice: true,
    offline: process.env.NODE_ENV === 'production',
    analytics: process.env.NODE_ENV === 'production'
  },
  theme: {
    primaryColor: '#6366f1',
    fontFamily: 'Inter, sans-serif'
  }
};
```

### Error Handling

```javascript
// Generated error handling
class StorytellerError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'StorytellerError';
    this.code = code;
    this.details = details;
  }
}

const handleStorytellerError = (error) => {
  console.error('Storyteller Error:', error);
  
  // Log to analytics service
  analytics.track('storyteller_error', {
    error_code: error.code,
    error_message: error.message
  });
  
  // Show user-friendly message
  showNotification('Something went wrong. Please try again.');
};
```

## Support and Community

### Getting Help

- **Documentation**: [Integration Guides](../integration-guides/README.md)
- **API Reference**: [API Documentation](../api-reference/README.md)
- **Community**: [Developer Forum](https://community.storytailor.com)
- **Support**: [Contact Support](../support/contact.md)

### Contributing

Help improve the code generators:

- **Templates**: Submit custom templates
- **Bug Reports**: [GitHub Issues](https://github.com/storytailor/code-generators/issues)
- **Feature Requests**: [Feature Requests](https://github.com/storytailor/code-generators/discussions)

---

## Quick Links

- 🚀 **[Launch Code Generator](https://tools.storytailor.com/code-generator)**
- 📖 **[Integration Guides](../integration-guides/README.md)**
- 🔍 **[API Explorer](./api-explorer.md)**
- 🧪 **[Testing Tools](./testing.md)**
- 📊 **[Developer Dashboard](./dashboard.md)**