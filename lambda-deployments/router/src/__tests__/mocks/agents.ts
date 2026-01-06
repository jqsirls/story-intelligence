// Mock agent responses
import { AgentResponse } from '../../types';

export const mockAgentResponses: Record<string, AgentResponse> = {
  'content-agent': {
    success: true,
    message: 'Let\'s create a wonderful bedtime story together! What kind of character would you like for your story?',
    conversationId: 'test-conversation',
    data: {
      intent: 'createStory',
      storyType: 'bedtime',
      response: 'bedtime story creation started',
      speechText: 'Let\'s create a wonderful bedtime story together! What kind of character would you like for your story?'
    },
    nextPhase: 'character_creation'
  },
  'auth-agent': {
    success: true,
    message: 'User authenticated successfully',
    conversationId: 'test-conversation',
    data: {
      authenticated: true,
      userId: 'test-user-123'
    }
  },
  'emotion-agent': {
    success: true,
    message: 'Emotion recorded',
    conversationId: 'test-conversation',
    data: {
      mood: 'happy',
      confidence: 0.9
    }
  },
  'library-agent': {
    success: true,
    message: 'Story saved to library',
    conversationId: 'test-conversation',
    data: {
      storyId: 'test-story-123',
      saved: true
    }
  },
  'voice-synthesis-agent': {
    success: true,
    message: 'Voice synthesis complete',
    conversationId: 'test-conversation',
    data: {
      audioUrl: 'https://example.com/audio.mp3'
    }
  }
};

// Mock HTTP agent calls
export const mockAgentCall = jest.fn().mockImplementation((endpoint: string, payload: any) => {
  // Extract agent name from endpoint
  const agentMatch = endpoint.match(/http:\/\/localhost:\d+\/(\w+)/);
  const agentName = agentMatch ? `${agentMatch[1]}-agent` : 'unknown-agent';
  
  // Return appropriate mock response
  const response = mockAgentResponses[agentName] || {
    success: false,
    message: 'Unknown agent',
    conversationId: 'test-conversation',
    error: 'Agent not found'
  };
  
  // Add metadata from the response data to the main response for test compatibility
  if (response.data) {
    return {
      ...response,
      ...response.data
    };
  }
  
  return response;
});