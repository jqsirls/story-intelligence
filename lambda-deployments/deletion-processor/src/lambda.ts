/**
 * Deletion Processor Lambda Handler
 * Triggered by EventBridge to process pending deletion requests
 */

import { Handler, EventBridgeEvent } from 'aws-lambda';
import { createClient } from '@supabase/supabase-js';
import winston from 'winston';
// Services are bundled during deployment - import from local dist
import { DeletionService } from './services/DeletionService';
import { StorageLifecycleService } from './services/StorageLifecycleService';
import { EmailService } from './services/EmailService';

// Lambda container reuse - persist services across invocations
let deletionService: DeletionService | null = null;
let storageLifecycleService: StorageLifecycleService | null = null;
let emailService: EmailService | null = null;
let logger: winston.Logger | null = null;

/**
 * Initialize logger
 */
function getLogger(): winston.Logger {
  if (!logger) {
    logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }
  return logger;
}

/**
 * Initialize services
 */
function initializeServices(): {
  deletion: DeletionService;
  storage: StorageLifecycleService;
  email: EmailService;
} {
  const log = getLogger();
  
  if (!deletionService || !storageLifecycleService || !emailService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    emailService = new EmailService(supabase, log);
    storageLifecycleService = new StorageLifecycleService(supabase, log);
    deletionService = new DeletionService(supabase, log);
  }
  
  return {
    deletion: deletionService,
    storage: storageLifecycleService,
    email: emailService
  };
}

/**
 * Lambda handler for EventBridge scheduled events
 */
export const handler: Handler<EventBridgeEvent<'Scheduled Event', any>> = async (event, context) => {
  const log = getLogger();
  
  try {
    log.info('Deletion processor triggered', {
      source: event.source,
      time: event.time,
      region: event.region
    });
    
    const { deletion } = initializeServices();
    
    // Process scheduled deletions
    const result = await deletion.processScheduledDeletions();
    
    log.info('Deletion processing completed', {
      processed: result.processed,
      errors: result.errors
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...result
      })
    };
  } catch (error: any) {
    log.error('Error processing deletions', {
      error: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
