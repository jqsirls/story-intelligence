/**
 * Personality Agent Lambda Handler
 * Age-appropriate adaptation and personality consistency
 */

export const handler = async (event: any): Promise<any> => {
  console.log('[Personality Agent] Invoked', { hasBody: !!event.body });

  try {
    let body: any = event;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    
    const action = body.action || body.intent?.type || body.intent?.parameters?.action;
    const data = { 
      ...body.data, 
      ...body.intent?.parameters,
      ...body,
      userId: body.userId || body.intent?.parameters?.userId || body.memoryState?.userId,
      age: body.age || body.userAge || body.memoryState?.context?.age || 7
    };

    // Health check
    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentName: 'personality',
          success: true,
          data: {
            status: 'healthy', 
            service: 'personality-agent',
            features: { ageAdaptation: true, personalityConsistency: true }
          }
        })
      };
    }

    // Adapt content for age
    if (action === 'adapt' || action === 'adapt_for_age') {
      const age = data.age;
      const content = data.content || data.text || '';
      
      // Simple age-appropriate adaptation
      const adaptedContent = age < 5 
        ? content.replace(/difficult|hard|challenging/gi, 'fun')
        : age < 8 
        ? content.replace(/complex/gi, 'interesting')
        : content;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'personality',
          success: true,
          data: {
            adaptedContent,
            age,
            adaptationApplied: true,
            tone: age < 5 ? 'simple' : age < 8 ? 'gentle' : 'engaging'
          }
        })
      };
    }

    // Get personality profile
    if (action === 'get_profile') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'personality',
          success: true,
          data: {
            profile: {
              age: data.age,
              tone: data.age < 5 ? 'simple' : data.age < 8 ? 'gentle' : 'engaging',
              vocabulary: data.age < 5 ? 'basic' : data.age < 8 ? 'intermediate' : 'advanced',
              complexityLevel: Math.min(10, Math.floor(data.age / 2))
            }
          }
        })
      };
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Unknown action: ${action || 'none'}` })
    };

  } catch (error) {
    console.error('[Personality Agent] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal error'
      })
    };
  }
};

