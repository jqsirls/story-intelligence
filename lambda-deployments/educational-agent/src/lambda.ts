/**
 * Educational Agent Lambda Handler
 */
export const handler = async (event: any): Promise<any> => {
  try {
    let body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : event;
    const action = body.action || body.intent?.type;

    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'healthy', service: 'educational-agent' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName: 'educational', success: true, data: { message: 'Educational tools ready' } })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal error' })
    };
  }
};

