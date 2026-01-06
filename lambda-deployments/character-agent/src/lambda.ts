/**
 * CharacterAgent Lambda Handler
 * Inclusive character creation with conversational and API modes
 */

import { CharacterAgent } from './CharacterAgent';

let agent: CharacterAgent | null = null;

async function getAgent() {
  if (agent) return agent;
  
  const config = {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    supabaseUrl: process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co',
    supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
  };
  
  agent = new CharacterAgent(config);
  return agent;
}

export const handler = async (event: any): Promise<any> => {
  try {
    let body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : event;
    const action = body.action || body.intent?.type || body.intent?.parameters?.action;
    const data = { ...body.data, ...body.intent?.parameters, ...body };

    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'character',
          success: true,
          data: {
            status: 'healthy',
            service: 'character-agent',
            features: {
              conversational: true,
              inclusivity: true,
              dna: true,
              headshots: true,
              traits: 50
            }
          }
        })
      };
    }

    const characterAgent = await getAgent();

    // Start conversational character creation
    if (action === 'start_conversation' || action === 'create_character_conversational') {
      const result = await characterAgent.startConversation(
        data.userId || 'anonymous',
        data.userProfile
      );
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'character',
          success: true,
          data: {
            sessionId: result.sessionId,
            question: result.question,
            phase: 'name'
          }
        })
      };
    }

    // Process conversation turn
    if (action === 'process_turn' || action === 'continue_conversation') {
      const result = await characterAgent.processConversationTurn(
        data.sessionId,
        data.userResponse || data.message
      );
      
      if (result.complete && result.character) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'character',
            success: true,
            data: {
              complete: true,
              character: result.character,
              message: `Amazing! ${result.character.name} is ready! Want to create a story together?`
            }
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'character',
          success: true,
          data: {
            complete: false,
            question: result.question
          }
        })
      };
    }

    // Direct character creation (API mode)
    if (action === 'create_direct' || action === 'create_character') {
      const character = await characterAgent.createCharacterDirect(
        data.traits || data,
        data.userId || 'anonymous'
      );
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'character',
          success: true,
          data: {
            character,
            message: `Character ${character.name} created successfully!`
          }
        })
      };
    }

    // Get character DNA (for story images)
    if (action === 'get_dna') {
      const dna = await characterAgent.getCharacterDNA(data.characterId);
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'character',
          success: true,
          data: { dna }
        })
      };
    }

    // List user's characters
    if (action === 'list' || action === 'get_characters') {
      const characters = await characterAgent.listCharacters(data.userId);
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'character',
          success: true,
          data: { characters, count: characters.length }
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'character',
        success: true,
        data: { message: 'Character agent ready' }
      })
    };

  } catch (error) {
    console.error('[CharacterAgent] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'character',
        success: false,
        error: error instanceof Error ? error.message : 'Internal error'
      })
    };
  }
};

