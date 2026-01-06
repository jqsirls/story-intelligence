/**
 * Fieldnotes Lambda Handler
 * Wraps Express API server for AWS Lambda deployment
 */

// @ts-ignore - serverless-http types
const serverless = require('serverless-http');
import express, { Request, Response } from 'express';
import cors from 'cors';
import { ResearchEngine } from './core/ResearchEngine';
import { Logger } from './utils/logger';
import { Feature, APIResponse } from './types';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || '';

const logger = new Logger('Lambda');
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Initialize research engine (lazy initialization)
let engine: ResearchEngine | null = null;

function getEngine(): ResearchEngine {
  if (!engine) {
    engine = new ResearchEngine(SUPABASE_URL, SUPABASE_KEY, REDIS_URL);
  }
  return engine;
}

// Authentication middleware
const authenticate = (req: Request, res: Response, next: () => void) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      timestamp: new Date()
    } as APIResponse);
  }

  // Verify API key
  const validKey = process.env.FIELDNOTES_API_KEY;
  if (apiKey !== validKey) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
      timestamp: new Date()
    } as APIResponse);
  }

  next();
};

// Apply auth to all routes except health check
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/') {
    return next();
  }
  return authenticate(req, res, next);
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      service: 'fieldnotes',
      environment: process.env.ENVIRONMENT || 'production'
    },
    timestamp: new Date()
  } as APIResponse);
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'Fieldnotes',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        analyze: '/api/v1/analyze',
        brief: '/api/v1/brief',
        preLaunch: '/api/v1/pre-launch',
        challenge: '/api/v1/challenge',
        cost: '/api/v1/cost/status'
      }
    },
    timestamp: new Date()
  } as APIResponse);
});

// POST /api/v1/analyze - On-demand analysis
app.post('/api/v1/analyze', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor', timeframe = '7 days', focus, events } = req.body;

    const result = await getEngine().analyzeOnDemand({
      tenantId,
      timeframe,
      focus,
      events
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Analysis failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// GET /api/v1/brief - Get weekly brief
app.get('/api/v1/brief', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'storytailor';
    const brief = await getEngine().generateWeeklyBrief(tenantId);

    res.json({
      success: true,
      data: brief,
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Brief generation failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// POST /api/v1/pre-launch - Generate pre-launch memo
app.post('/api/v1/pre-launch', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor', feature } = req.body;

    if (!feature) {
      return res.status(400).json({
        success: false,
        error: 'Feature definition required',
        timestamp: new Date()
      } as APIResponse);
    }

    const memo = await getEngine().generatePreLaunchMemo(tenantId, feature as Feature);

    res.json({
      success: true,
      data: memo,
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Pre-launch memo generation failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// POST /api/v1/challenge - Challenge an agent
app.post('/api/v1/challenge', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor', agentName, question } = req.body;

    if (!agentName || !question) {
      return res.status(400).json({
        success: false,
        error: 'agentName and question required',
        timestamp: new Date()
      } as APIResponse);
    }

    const challenge = await getEngine().challengeAgent(tenantId, agentName, question);

    res.json({
      success: true,
      data: challenge,
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Agent challenge failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// GET /api/v1/cost/status - Get cost tracking status
app.get('/api/v1/cost/status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'storytailor';
    const status = await getEngine().getCostStatus(tenantId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Cost status check failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// Export serverless handler
export const handler = serverless.default(app, {
  binary: ['image/*', 'application/pdf']
});
