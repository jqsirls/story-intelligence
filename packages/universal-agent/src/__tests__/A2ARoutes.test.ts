/**
 * A2A Routes Tests
 */

import request from 'supertest';
import { RESTAPIGateway } from '../api/RESTAPIGateway';
import { Logger } from 'winston';

describe('A2A Routes', () => {
  let gateway: RESTAPIGateway;
  let mockLogger: Logger;

  beforeAll(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as unknown as Logger;

    gateway = new RESTAPIGateway(null, mockLogger);
  });

  it('should return agent card on GET /a2a/discovery', async () => {
    const response = await request(gateway.app)
      .get('/a2a/discovery')
      .expect(200);

    expect(response.body).toHaveProperty('agentCard');
    expect(response.body.agentCard).toHaveProperty('id', 'storytailor-agent');
    expect(response.body.agentCard).toHaveProperty('capabilities');
  });

  it('should handle JSON-RPC message on POST /a2a/message', async () => {
    const response = await request(gateway.app)
      .post('/a2a/message')
      .send({
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'story.generate',
        params: {}
      })
      .expect(200);

    expect(response.body).toHaveProperty('jsonrpc', '2.0');
    expect(response.body).toHaveProperty('id', 'test-123');
  });

  it('should create task on POST /a2a/task', async () => {
    const response = await request(gateway.app)
      .post('/a2a/task')
      .send({
        method: 'story.generate',
        params: {},
        clientAgentId: 'test-client'
      })
      .expect(200);

    expect(response.body).toHaveProperty('taskId');
    expect(response.body).toHaveProperty('state', 'submitted');
  });

  it('should return task status on GET /a2a/status', async () => {
    // First create a task
    const createResponse = await request(gateway.app)
      .post('/a2a/task')
      .send({
        method: 'test.method',
        params: {},
        clientAgentId: 'test-client'
      });

    const taskId = createResponse.body.taskId;

    const statusResponse = await request(gateway.app)
      .get(`/a2a/status?taskId=${taskId}`)
      .expect(200);

    expect(statusResponse.body).toHaveProperty('taskId', taskId);
    expect(statusResponse.body).toHaveProperty('state');
  });

  it('should handle webhook on POST /a2a/webhook', async () => {
    const response = await request(gateway.app)
      .post('/a2a/webhook')
      .send({
        event: 'test.event',
        data: {},
        timestamp: new Date().toISOString()
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});
