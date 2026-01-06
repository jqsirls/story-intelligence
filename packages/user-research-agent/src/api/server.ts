/**
 * Fieldnotes REST API Server
 * Express-based API for external access
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ResearchEngine } from '../core/ResearchEngine';
import { Logger } from '../utils/logger';
import { Feature, APIResponse } from '../types';

const PORT = process.env.FIELDNOTES_API_PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const logger = new Logger('API');
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Initialize research engine
const engine = new ResearchEngine(SUPABASE_URL, SUPABASE_KEY, REDIS_URL);

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
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
  if (req.path === '/health') {
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
      service: 'fieldnotes'
    },
    timestamp: new Date()
  } as APIResponse);
});

// POST /api/v1/analyze - On-demand analysis
app.post('/api/v1/analyze', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor', timeframe = '7 days', focus, events } = req.body;

    const result = await engine.analyzeOnDemand({
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

// POST /api/v1/pre-mortem - Feature risk assessment
app.post('/api/v1/pre-mortem', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor', feature } = req.body;

    if (!feature || !feature.name || !feature.description) {
      return res.status(400).json({
        success: false,
        error: 'Feature name and description required',
        timestamp: new Date()
      } as APIResponse);
    }

    const memo = await engine.generatePreLaunchMemo(tenantId, feature as Feature);

    res.json({
      success: true,
      data: memo,
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Pre-mortem failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// GET /api/v1/insights - List recent insights
app.get('/api/v1/insights', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor', limit = 20 } = req.query;

    // Query insights from database
    const insights: any[] = []; // Placeholder

    res.json({
      success: true,
      data: { insights },
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Failed to fetch insights', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// GET /api/v1/briefs/latest - Get latest brief
app.get('/api/v1/briefs/latest', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor' } = req.query;

    // Query latest brief
    const brief = null; // Placeholder

    res.json({
      success: true,
      data: { brief },
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Failed to fetch brief', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// POST /api/v1/webhooks/configure - Configure webhook
app.post('/api/v1/webhooks/configure', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor', url, events } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL required',
        timestamp: new Date()
      } as APIResponse);
    }

    // Save webhook configuration
    logger.info(`Webhook configured for ${tenantId}: ${url}`);

    res.json({
      success: true,
      data: { message: 'Webhook configured successfully' },
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Failed to configure webhook', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// GET /api/v1/tenants/:id/usage - Cost tracking
app.get('/api/v1/tenants/:id/usage', async (req: Request, res: Response) => {
  try {
    const { id: tenantId } = req.params;

    // Query usage from database
    const usage = {}; // Placeholder

    res.json({
      success: true,
      data: { usage },
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Failed to fetch usage', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// POST /api/v1/challenges - Challenge another agent
app.post('/api/v1/challenges', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'storytailor', agentName, question } = req.body;

    if (!agentName || !question) {
      return res.status(400).json({
        success: false,
        error: 'Agent name and question required',
        timestamp: new Date()
      } as APIResponse);
    }

    const challenge = await engine.challengeAgent(tenantId, agentName, question);

    res.json({
      success: true,
      data: challenge,
      timestamp: new Date()
    } as APIResponse);
  } catch (error: any) {
    logger.error('Challenge failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    } as APIResponse);
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date()
  } as APIResponse);
});

// Start server
async function start() {
  try {
    await engine.initialize();
    
    app.listen(PORT, () => {
      logger.info(`Fieldnotes API server listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await engine.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await engine.shutdown();
  process.exit(0);
});

start();
