import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Character Agent (Simple) invoked', event);

  let body: any = {};
  
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      body = event.body;
    }
  }
  
  const action = body.action || (event as any).action;

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
            characterCreation: true,
            inclusivity: true,
            headshots: true,
          },
        },
      }),
    };
  }

  // Mock character creation
  if (action === 'create_character') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'character',
        success: true,
        data: {
          characterId: `char-${Date.now()}`,
          name: body.name || 'Character',
          message: 'Character created successfully (simplified mode)',
        },
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentName: 'character',
      success: true,
      data: {
        message: 'Character agent operational',
        availableActions: ['health', 'create_character'],
      },
    }),
  };
};

