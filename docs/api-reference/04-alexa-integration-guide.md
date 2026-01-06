# 🎤 Storytailor Alexa Integration Guide

## 📋 **Complete Amazon Alexa Integration Documentation**

This guide provides everything Amazon needs to integrate Alexa with the Storytailor Multi-Agent System.

---

## 🚀 **Quick Start for Amazon**

### **Integration Endpoint**
```
https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/alexa
```

### **Authentication**
```http
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json
X-Alexa-Skill-Id: amzn1.ask.skill.YOUR_SKILL_ID
```

### **Test Connection**
```bash
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/alexa/test \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 🏗️ **Skill Architecture**

### **Skill Manifest**
```json
{
  "manifest": {
    "publishingInformation": {
      "locales": {
        "en-US": {
          "name": "Storytailor",
          "summary": "Story Intelligence™ powered personalized storytelling for children",
          "description": "Create magical, personalized stories for children using advanced AI. Perfect for bedtime stories, educational content, and creative play.",
          "examplePhrases": [
            "Alexa, ask Storytailor to create a story about a brave mouse",
            "Alexa, tell Storytailor I want a bedtime story",
            "Alexa, ask Storytailor for an adventure story for my 7-year-old"
          ],
          "keywords": [
            "stories",
            "children",
            "bedtime",
            "AI",
            "personalized",
            "educational"
          ],
          "smallIconUri": "https://cdn.storytailor.com/alexa/icon-108.png",
          "largeIconUri": "https://cdn.storytailor.com/alexa/icon-512.png"
        }
      },
      "isAvailableWorldwide": true,
      "testingInstructions": "Say 'Alexa, ask Storytailor to create a story about friendship' to test story generation.",
      "category": "EDUCATION_AND_REFERENCE",
      "distributionCountries": ["US", "CA", "GB", "AU", "IN"]
    },
    "apis": {
      "custom": {
        "endpoint": {
          "uri": "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/alexa"
        },
        "interfaces": [
          {
            "type": "AUDIO_PLAYER"
          },
          {
            "type": "ALEXA_PRESENTATION_APL"
          }
        ]
      }
    },
    "manifestVersion": "1.0",
    "permissions": [
      {
        "name": "alexa::profile:given_name:read"
      },
      {
        "name": "alexa::devices:all:address:country_and_postal_code:read"
      }
    ],
    "privacyAndCompliance": {
      "allowsPurchases": false,
      "usesPersonalInfo": true,
      "isChildDirected": true,
      "isExportCompliant": true,
      "containsAds": false,
      "locales": {
        "en-US": {
          "privacyPolicyUrl": "https://storytailor.com/privacy",
          "termsOfUseUrl": "https://storytailor.com/terms"
        }
      }
    }
  }
}
```

### **Interaction Model**
```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "storytailor",
      "intents": [
        {
          "name": "GenerateStoryIntent",
          "slots": [
            {
              "name": "storyPrompt",
              "type": "AMAZON.SearchQuery",
              "samples": [
                "a story about {storyPrompt}",
                "something about {storyPrompt}",
                "{storyPrompt}"
              ]
            },
            {
              "name": "ageRange",
              "type": "AgeRangeType"
            },
            {
              "name": "mood",
              "type": "MoodType"
            },
            {
              "name": "length",
              "type": "LengthType"
            },
            {
              "name": "characters",
              "type": "AMAZON.SearchQuery"
            }
          ],
          "samples": [
            "create a story about {storyPrompt}",
            "tell me a story about {storyPrompt}",
            "generate a {mood} story about {storyPrompt}",
            "create a {length} story about {storyPrompt} for {ageRange} year olds",
            "tell me a story about {storyPrompt} with {characters}",
            "I want a story about {storyPrompt}",
            "make up a story about {storyPrompt}",
            "can you create a story about {storyPrompt}"
          ]
        },
        {
          "name": "GetMyStoriesIntent",
          "samples": [
            "what are my stories",
            "show me my stories",
            "list my stories",
            "what stories do I have",
            "read my stories"
          ]
        },
        {
          "name": "ReadStoryIntent",
          "slots": [
            {
              "name": "storyTitle",
              "type": "AMAZON.SearchQuery"
            }
          ],
          "samples": [
            "read {storyTitle}",
            "tell me {storyTitle}",
            "play {storyTitle}",
            "read the story {storyTitle}"
          ]
        },
        {
          "name": "SetPreferencesIntent",
          "slots": [
            {
              "name": "childName",
              "type": "AMAZON.US_FIRST_NAME"
            },
            {
              "name": "childAge",
              "type": "AMAZON.NUMBER"
            }
          ],
          "samples": [
            "my child's name is {childName}",
            "set child name to {childName}",
            "my child is {childAge} years old",
            "set age to {childAge}"
          ]
        },
        {
          "name": "AMAZON.HelpIntent"
        },
        {
          "name": "AMAZON.StopIntent"
        },
        {
          "name": "AMAZON.CancelIntent"
        },
        {
          "name": "AMAZON.NavigateHomeIntent"
        },
        {
          "name": "AMAZON.PauseIntent"
        },
        {
          "name": "AMAZON.ResumeIntent"
        }
      ],
      "types": [
        {
          "name": "AgeRangeType",
          "values": [
            {
              "name": {
                "value": "3-5",
                "synonyms": [
                  "three to five",
                  "preschool",
                  "toddler",
                  "young children"
                ]
              }
            },
            {
              "name": {
                "value": "6-8",
                "synonyms": [
                  "six to eight",
                  "early elementary",
                  "school age"
                ]
              }
            },
            {
              "name": {
                "value": "9-12",
                "synonyms": [
                  "nine to twelve",
                  "middle grade",
                  "older children"
                ]
              }
            }
          ]
        },
        {
          "name": "MoodType",
          "values": [
            {
              "name": {
                "value": "happy",
                "synonyms": ["cheerful", "joyful", "upbeat", "positive"]
              }
            },
            {
              "name": {
                "value": "adventurous",
                "synonyms": ["exciting", "thrilling", "action-packed"]
              }
            },
            {
              "name": {
                "value": "calm",
                "synonyms": ["peaceful", "relaxing", "soothing", "bedtime"]
              }
            },
            {
              "name": {
                "value": "educational",
                "synonyms": ["learning", "teaching", "informative"]
              }
            }
          ]
        },
        {
          "name": "LengthType",
          "values": [
            {
              "name": {
                "value": "short",
                "synonyms": ["brief", "quick", "little"]
              }
            },
            {
              "name": {
                "value": "medium",
                "synonyms": ["regular", "normal", "standard"]
              }
            },
            {
              "name": {
                "value": "long",
                "synonyms": ["extended", "detailed", "big"]
              }
            }
          ]
        }
      ]
    }
  }
}
```

---

## 🔧 **Lambda Handler Implementation**

### **Main Handler**
```javascript
const Alexa = require('ask-sdk-core');
const axios = require('axios');

const STORYTAILOR_API_BASE = 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging';
const STORYTAILOR_API_KEY = process.env.STORYTAILOR_API_KEY;

// Launch Request Handler
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = `Welcome to Storytailor! I can create personalized stories for children. 
                        Try saying "create a story about a brave mouse" or "tell me a bedtime story."`;
    
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('What kind of story would you like me to create?')
      .getResponse();
  }
};

// Generate Story Intent Handler
const GenerateStoryIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GenerateStoryIntent';
  },
  
  async handle(handlerInput) {
    const slots = Alexa.getSlot(handlerInput.requestEnvelope, 'storyPrompt');
    const ageRangeSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'ageRange');
    const moodSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'mood');
    const lengthSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'length');
    
    const storyPrompt = slots?.value || 'a magical adventure';
    const ageRange = ageRangeSlot?.value || '6-8';
    const mood = moodSlot?.value || 'happy';
    const length = lengthSlot?.value || 'short';
    
    try {
      // Get user ID for personalization
      const userId = handlerInput.requestEnvelope.session.user.userId;
      
      // Call Storytailor API
      const response = await axios.post(`${STORYTAILOR_API_BASE}/v1/stories/generate`, {
        prompt: storyPrompt,
        ageRange: ageRange,
        mood: mood,
        length: length,
        platform: 'alexa',
        userId: userId
      }, {
        headers: {
          'Authorization': `Bearer ${STORYTAILOR_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const story = response.data.story;
      
      // Store story in session for potential replay
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      sessionAttributes.lastStory = story;
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      
      // Create response with story
      const speakOutput = `Here's your ${mood} story: ${story.title}. ${story.content}`;
      
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .withSimpleCard(story.title, story.content)
        .reprompt('Would you like me to create another story?')
        .getResponse();
        
    } catch (error) {
      console.error('Story generation error:', error);
      
      const errorOutput = `I'm sorry, I had trouble creating your story. Please try again with a different prompt.`;
      
      return handlerInput.responseBuilder
        .speak(errorOutput)
        .reprompt('What kind of story would you like me to create?')
        .getResponse();
    }
  }
};

// Get My Stories Intent Handler
const GetMyStoriesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetMyStoriesIntent';
  },
  
  async handle(handlerInput) {
    try {
      const userId = handlerInput.requestEnvelope.session.user.userId;
      
      // Get user's stories from Storytailor API
      const response = await axios.get(`${STORYTAILOR_API_BASE}/v1/stories`, {
        headers: {
          'Authorization': `Bearer ${STORYTAILOR_API_KEY}`,
          'X-User-ID': userId
        }
      });
      
      const stories = response.data.stories;
      
      if (stories.length === 0) {
        const speakOutput = `You don't have any stories yet. Try saying "create a story about friendship" to get started.`;
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt('What kind of story would you like me to create?')
          .getResponse();
      }
      
      const storyTitles = stories.slice(0, 5).map(story => story.title).join(', ');
      const speakOutput = `Here are your recent stories: ${storyTitles}. Which one would you like me to read?`;
      
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt('Which story would you like me to read?')
        .getResponse();
        
    } catch (error) {
      console.error('Get stories error:', error);
      
      const errorOutput = `I'm sorry, I couldn't retrieve your stories right now. Please try again later.`;
      
      return handlerInput.responseBuilder
        .speak(errorOutput)
        .getResponse();
    }
  }
};

// Help Intent Handler
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = `I'm Storytailor, your AI storytelling assistant! I can create personalized stories for children. 
                        Here are some things you can try:
                        Say "create a story about a brave mouse" to generate a new story.
                        Say "tell me a bedtime story" for a calming story.
                        Say "what are my stories" to hear your saved stories.
                        What would you like to do?`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('What kind of story would you like me to create?')
      .getResponse();
  }
};

// Cancel and Stop Intent Handler
const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Thanks for using Storytailor! Sweet dreams!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

// Session Ended Request Handler
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.getResponse();
  }
};

// Error Handler
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
    console.log(`Error handled: ${JSON.stringify(error)}`);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

// Skill Builder
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GenerateStoryIntentHandler,
    GetMyStoriesIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('Storytailor/1.0')
  .lambda();
```

---

## 🔐 **Account Linking Configuration**

### **OAuth 2.0 Setup**
```json
{
  "accountLinkingRequest": {
    "type": "AUTH_CODE",
    "authorizationUri": "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/oauth/authorize",
    "accessTokenUri": "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/oauth/token",
    "clientId": "alexa-storytailor-client",
    "clientSecret": "your-client-secret",
    "scopes": [
      "stories:generate",
      "stories:read",
      "profile:read"
    ],
    "domains": [
      "storytailor.com"
    ],
    "defaultTokenExpirationInSeconds": 3600
  }
}
```

### **Authorization Flow**
```javascript
// Authorization endpoint handler
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, scope, state } = req.query;
  
  // Validate client_id
  if (client_id !== 'alexa-storytailor-client') {
    return res.status(400).json({ error: 'invalid_client' });
  }
  
  // Redirect to login page with parameters
  const loginUrl = `https://storytailor.com/login?` +
    `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${encodeURIComponent(state)}`;
    
  res.redirect(loginUrl);
});

// Token exchange endpoint
app.post('/oauth/token', async (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;
  
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  
  // Validate client credentials
  if (client_id !== 'alexa-storytailor-client' || client_secret !== process.env.ALEXA_CLIENT_SECRET) {
    return res.status(401).json({ error: 'invalid_client' });
  }
  
  try {
    // Exchange code for tokens
    const user = await validateAuthorizationCode(code);
    const tokens = generateTokens(user.id);
    
    res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } catch (error) {
    res.status(400).json({ error: 'invalid_grant' });
  }
});
```

---

## 🎵 **Audio & APL Support**

### **Audio Player Integration**
```javascript
const AudioPlayerHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayStoryAudioIntent';
  },
  
  async handle(handlerInput) {
    const storyId = Alexa.getSlotValue(handlerInput.requestEnvelope, 'storyId');
    
    try {
      // Get audio URL from Storytailor API
      const response = await axios.post(`${STORYTAILOR_API_BASE}/v1/stories/${storyId}/synthesize`, {
        voiceId: 'alexa-child-friendly',
        speed: 1.0,
        includeWebVTT: false
      }, {
        headers: {
          'Authorization': `Bearer ${STORYTAILOR_API_KEY}`
        }
      });
      
      const audioUrl = response.data.audio.url;
      
      return handlerInput.responseBuilder
        .addAudioPlayerPlayDirective('REPLACE_ALL', audioUrl, storyId, 0)
        .getResponse();
        
    } catch (error) {
      console.error('Audio generation error:', error);
      return handlerInput.responseBuilder
        .speak('Sorry, I couldn\'t generate audio for that story.')
        .getResponse();
    }
  }
};
```

### **APL (Alexa Presentation Language) Support**
```json
{
  "type": "APL",
  "version": "1.6",
  "mainTemplate": {
    "parameters": [
      "storyTitle",
      "storyContent",
      "characterImages"
    ],
    "items": [
      {
        "type": "Container",
        "width": "100vw",
        "height": "100vh",
        "items": [
          {
            "type": "Text",
            "text": "${storyTitle}",
            "style": "textStyleDisplay1",
            "textAlign": "center",
            "color": "#FF6B6B"
          },
          {
            "type": "ScrollView",
            "width": "90vw",
            "height": "70vh",
            "item": {
              "type": "Text",
              "text": "${storyContent}",
              "style": "textStyleBody",
              "textAlign": "left"
            }
          }
        ]
      }
    ]
  }
}
```

---

## 👶 **COPPA Compliance**

### **Child-Directed Skill Configuration**
```json
{
  "privacyAndCompliance": {
    "isChildDirected": true,
    "containsAds": false,
    "allowsPurchases": false,
    "usesPersonalInfo": true,
    "locales": {
      "en-US": {
        "privacyPolicyUrl": "https://storytailor.com/privacy-children",
        "termsOfUseUrl": "https://storytailor.com/terms-children"
      }
    }
  }
}
```

### **Parental Consent Flow**
```javascript
const ParentalConsentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ParentalConsentIntent';
  },
  
  handle(handlerInput) {
    const speakOutput = `To use Storytailor with children under 13, we need parental consent. 
                        Please visit storytailor.com/consent on your phone or computer to complete the consent process.`;
    
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .withSimpleCard('Parental Consent Required', 'Visit storytailor.com/consent to provide consent.')
      .getResponse();
  }
};
```

---

## 📊 **Analytics & Monitoring**

### **Skill Metrics**
```javascript
const logSkillMetrics = (handlerInput, eventType, metadata = {}) => {
  const userId = handlerInput.requestEnvelope.session.user.userId;
  const sessionId = handlerInput.requestEnvelope.session.sessionId;
  
  // Send metrics to Storytailor analytics
  axios.post(`${STORYTAILOR_API_BASE}/v1/analytics/alexa`, {
    eventType,
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
    metadata
  }, {
    headers: {
      'Authorization': `Bearer ${STORYTAILOR_API_KEY}`
    }
  }).catch(error => {
    console.error('Analytics error:', error);
  });
};

// Usage in handlers
const GenerateStoryIntentHandler = {
  async handle(handlerInput) {
    // ... story generation logic ...
    
    // Log successful story generation
    logSkillMetrics(handlerInput, 'story_generated', {
      prompt: storyPrompt,
      ageRange: ageRange,
      mood: mood,
      wordCount: story.metadata.wordCount
    });
    
    return response;
  }
};
```

---

## 🧪 **Testing & Validation**

### **Unit Tests**
```javascript
const { handler } = require('./index');

describe('Storytailor Alexa Skill', () => {
  test('Launch request returns welcome message', async () => {
    const event = {
      version: '1.0',
      session: {
        new: true,
        sessionId: 'test-session',
        user: { userId: 'test-user' }
      },
      request: {
        type: 'LaunchRequest',
        requestId: 'test-request'
      }
    };
    
    const response = await handler(event);
    
    expect(response.response.outputSpeech.ssml).toContain('Welcome to Storytailor');
    expect(response.response.shouldEndSession).toBe(false);
  });
  
  test('Generate story intent creates story', async () => {
    const event = {
      version: '1.0',
      session: {
        sessionId: 'test-session',
        user: { userId: 'test-user' }
      },
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'GenerateStoryIntent',
          slots: {
            storyPrompt: { value: 'brave mouse' }
          }
        }
      }
    };
    
    const response = await handler(event);
    
    expect(response.response.outputSpeech.ssml).toContain('Here\'s your');
    expect(response.response.card).toBeDefined();
  });
});
```

### **Integration Tests**
```bash
# Test skill with ASK CLI
ask dialog --locale en-US

# Test utterances
User: create a story about a brave mouse
Alexa: Here's your happy story: The Cheese Quest. Once upon a time...

User: what are my stories
Alexa: Here are your recent stories: The Cheese Quest, The Magic Garden...

User: help
Alexa: I'm Storytailor, your AI storytelling assistant...
```

---

## 🚀 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Skill manifest configured
- [ ] Interaction model tested
- [ ] Lambda function deployed
- [ ] Account linking configured
- [ ] COPPA compliance verified
- [ ] Privacy policy updated
- [ ] Terms of service updated

### **Testing**
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Voice UI testing completed
- [ ] Multi-turn conversation testing
- [ ] Error handling testing
- [ ] Performance testing

### **Certification Requirements**
- [ ] Skill responds within 8 seconds
- [ ] Handles all required intents
- [ ] Provides appropriate help
- [ ] Handles errors gracefully
- [ ] Follows voice design guidelines
- [ ] COPPA compliant for child-directed content

---

## 📞 **Support & Resources**

### **Amazon Contacts**
- **Technical Integration**: alexa-integrations@storytailor.com
- **Business Development**: partnerships@storytailor.com
- **Support**: alexa-support@storytailor.com

### **Documentation**
- **API Reference**: https://docs.storytailor.com/alexa
- **Voice Design Guide**: https://docs.storytailor.com/voice-design
- **COPPA Compliance**: https://docs.storytailor.com/coppa

### **Testing Resources**
- **Skill Testing Tool**: https://developer.amazon.com/alexa/console/ask/test
- **Voice Simulator**: https://echosim.io
- **Analytics Dashboard**: https://analytics.storytailor.com/alexa

---

## 🎯 **Success Metrics**

### **Key Performance Indicators**
- **Story Generation Success Rate**: >95%
- **Average Response Time**: <3 seconds
- **User Retention**: >60% after 7 days
- **Story Completion Rate**: >80%
- **User Satisfaction**: >4.5/5 stars

### **Monitoring Endpoints**
- **Health Check**: `GET /alexa/health`
- **Metrics**: `GET /alexa/metrics`
- **Status**: `GET /alexa/status`

---

**🌟 Ready to bring Story Intelligence™ powered storytelling to millions of Alexa users worldwide!**

*This integration guide provides everything needed for a seamless Alexa + Storytailor experience.*