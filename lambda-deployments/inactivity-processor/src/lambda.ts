/**
 * Inactivity Processor Lambda Handler
 * Triggered by EventBridge to monitor user inactivity and send warning emails
 */

import { Handler, EventBridgeEvent } from 'aws-lambda';
import { createClient } from '@supabase/supabase-js';
import winston from 'winston';
// Services are bundled during deployment - import from local dist
import { InactivityMonitorService } from './services/InactivityMonitorService';
import { EmailService } from './services/EmailService';

// Lambda container reuse - persist services across invocations
let inactivityMonitorService: InactivityMonitorService | null = null;
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
function initializeServices(): { inactivityMonitor: InactivityMonitorService; email: EmailService } {
  const log = getLogger();
  
  if (!inactivityMonitorService || !emailService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    emailService = new EmailService(supabase, log);
    inactivityMonitorService = new InactivityMonitorService(supabase, log, emailService);
  }
  
  return {
    inactivityMonitor: inactivityMonitorService,
    email: emailService
  };
}

/**
 * Lambda handler for EventBridge scheduled events
 */
export const handler: Handler<EventBridgeEvent<'Scheduled Event', any>> = async (event, context) => {
  const log = getLogger();
  
  try {
    log.info('Inactivity processor triggered', {
      source: event.source,
      time: event.time,
      region: event.region
    });
    
    const { inactivityMonitor } = initializeServices();
    
    // Process inactivity monitoring
    const result = await inactivityMonitor.checkInactiveUsers();
    
    log.info('Inactivity processing completed', {
      checked: result.checked,
      warningsSent: result.warningsSent,
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
    log.error('Error processing inactivity', {
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
