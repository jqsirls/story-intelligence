/**
 * Knowledge Base Agent Lambda Handler  
 * Answers questions about Story Intelligence and platform features
 */

export const handler = async (event: any): Promise<any> => {
  console.log('[Knowledge Base Agent] Invoked');

  try {
    let body: any = event;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    
    const action = body.action || body.intent?.type || body.intent?.parameters?.action;
    const data = { ...body.data, ...body.intent?.parameters, ...body };

    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentName: 'knowledgeBase',
          success: true,
          data: {
            status: 'healthy', 
            service: 'knowledge-base-agent'
          }
        })
      };
    }

    if (action === 'query' || action === 'answer_question') {
      const question = data.question || data.query || data.text || '';
      
      // Simple knowledge base responses
      let answer = "I'm here to help you create amazing stories!";
      
      if (question.toLowerCase().includes('story intelligence')) {
        answer = "Story Intelligence™ is our therapeutic storytelling platform that creates personalized, emotionally aware stories for children.";
      } else if (question.toLowerCase().includes('how') || question.toLowerCase().includes('work')) {
        answer = "I help create stories by understanding how you feel and what you enjoy, then crafting tales that are just right for you!";
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'knowledge',
          success: true,
          data: {
            answer,
            question,
            confidence: 0.85
          }
        })
      };
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Unknown action: ${action}` })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal error' })
    };
  }
};

