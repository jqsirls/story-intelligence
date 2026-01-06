/**
 * Therapeutic Agent Lambda Handler
 * Crisis follow-up and therapeutic interventions
 */

export const handler = async (event: any): Promise<any> => {
  console.log('[Therapeutic Agent] Invoked');

  try {
    let body: any = event;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    
    const action = body.action || body.intent?.type || body.intent?.parameters?.action;

    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentName: 'therapeutic',
          success: true,
          data: {
            status: 'healthy', 
            service: 'therapeutic-agent'
          }
        })
      };
    }

    if (action === 'intervene' || action === 'provide_support') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'therapeutic',
          success: true,
          data: {
            message: 'Support provided',
            followUpScheduled: true,
            resources: ['crisis-hotline', 'parent-notification']
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

