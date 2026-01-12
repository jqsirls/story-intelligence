/**
 * Universal Agent Lambda Handler
 * Full implementation with UniversalConversationManager integration
 */
// Use dynamic imports to avoid loading dependencies during health checks
let PlatformAwareRouter: any = null;
let createDefaultConfig: any = null;
let UniversalConversationManager: any = null;
let winston: any = null;
let logger: any = null;

// Initialize logger lazily (only when needed, not during health checks)
function getLogger() {
  if (!logger) {
    if (!winston) {
      // Use console for now if winston not available
      logger = {
        info: (...args: any[]) => console.log('[INFO]', ...args),
        error: (...args: any[]) => console.error('[ERROR]', ...args),
        warn: (...args: any[]) => console.warn('[WARN]', ...args)
      };
    } else {
      logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        defaultMeta: { service: 'universal-agent' },
        transports: [new winston.transports.Console()]
      });
    }
  }
  return logger;
}

// Global instances (cached between invocations)
let conversationManager: any = null;
let router: any = null;
let eventPublisher: any = null; // Use any type since we're loading dynamically
let restAPIGateway: any = null; // RESTAPIGateway instance for /api/v1/* routes
let universalStorytellerAPI: any = null; // UniversalStorytellerAPI instance

/**
 * Convert Lambda Function URL event to Express request/response
 */
async function handleExpressRequest(
  restAPIGateway: any,
  event: any,
  method: string,
  path: string
): Promise<any> {
  return new Promise((resolve) => {
    // Create mock Express request
    const req: any = {
      method,
      url: path + (event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters).toString() : ''),
      path,
      headers: event.headers || {},
      query: event.queryStringParameters || {},
      body: event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {},
      ip: event.requestContext?.http?.sourceIp || event.requestContext?.identity?.sourceIp || '127.0.0.1',
      get: (header: string) => event.headers?.[header.toLowerCase()] || event.headers?.[header] || '',
      id: event.requestContext?.requestId || `req_${Date.now()}`
    };

    // Create mock Express response
    let responseSent = false;
    const res: any = {
      statusCode: 200,
      headers: {},
      body: '',
      locals: {},
      status: (code: number) => {
        res.statusCode = code;
        return res;
      },
      json: (data: any) => {
        if (responseSent) return res;
        responseSent = true;
        res.body = JSON.stringify(data);
        res.locals.responseBody = data;
        resolve({
          statusCode: res.statusCode || 200,
          headers: {
            'Content-Type': 'application/json',
            ...res.headers
          },
          body: res.body
        });
        return res;
      },
      send: (data: any) => {
        if (responseSent) return res;
        responseSent = true;
        res.body = typeof data === 'string' ? data : JSON.stringify(data);
        res.locals.responseBody = data;
        resolve({
          statusCode: res.statusCode,
          headers: {
            'Content-Type': 'text/plain',
            ...res.headers
          },
          body: res.body
        });
        return res;
      },
      setHeader: (name: string, value: string) => {
        res.headers[name] = value;
        return res;
      },
      getHeader: (name: string) => res.headers[name],
      on: () => res, // Mock event emitter
      finish: false
    };

    // Route through RESTAPIGateway's Express app
    try {
      restAPIGateway.app(req, res, (err: any) => {
        if (err) {
          if (!responseSent) {
            responseSent = true;
            resolve({
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                error: 'Internal server error',
                message: err.message
              })
            });
          }
        } else if (!responseSent) {
          // Check if body was set but responseSent flag wasn't updated (race condition)
          if (res.body && res.body.length > 0) {
            getLogger().info('[LAMBDA] handleExpressRequest: Body set but responseSent false, resolving with body', {
              method,
              path,
              bodyLength: res.body.length
            });
            responseSent = true;
            resolve({
              statusCode: res.statusCode || 200,
              headers: {
                'Content-Type': 'application/json',
                ...res.headers
              },
              body: res.body
            });
          } else {
            // Wait for async operations (e.g., Supabase signUp, auto-confirmation)
            getLogger().warn('[LAMBDA] handleExpressRequest: No response sent, waiting for async operations', {
              method,
              path
            });
            setTimeout(() => {
              if (!responseSent) {
                // Check again if body was set during the wait
                if (res.body && res.body.length > 0) {
                  getLogger().info('[LAMBDA] handleExpressRequest: Body found after wait, resolving', {
                    method,
                    path,
                    bodyLength: res.body.length
                  });
                  responseSent = true;
                  resolve({
                    statusCode: res.statusCode || 200,
                    headers: {
                      'Content-Type': 'application/json',
                      ...res.headers
                    },
                    body: res.body
                  });
                } else {
                  responseSent = true;
                  getLogger().warn('[LAMBDA] handleExpressRequest: Timeout - no response after wait', {
                    method,
                    path,
                    hasBody: !!res.body,
                    bodyLength: res.body?.length || 0
                  });
                  resolve({
                    statusCode: res.statusCode || 200,
                    headers: {
                      'Content-Type': 'application/json',
                      ...res.headers
                    },
                    body: res.body || JSON.stringify({ message: 'No response' })
                  });
                }
              }
            }, 5000); // Wait 5 seconds for async operations (Supabase + auto-confirmation)
          }
        }
      });
    } catch (error: any) {
      if (!responseSent) {
        responseSent = true;
        resolve({
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Failed to process request',
            message: error.message
          })
        });
      }
    }
  });
}

/**
 * Initialize Universal Agent components
 * @param needsRouter - If false, skip router initialization (for REST API routes only)
 */
async function initialize(needsRouter: boolean = true): Promise<void> {
  if (conversationManager && needsRouter) {
    return; // Already initialized with router
  }
  if (restAPIGateway && !needsRouter) {
    return; // Already initialized without router
  }

  try {
    // Load winston dynamically
    if (!winston) {
      winston = await import('winston');
    }
    const logger = getLogger();
    
    logger.info('Initializing Universal Agent components...', { needsRouter });
    
    // #region debug log
    fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:233',message:'Before router import - initialize() entry',data:{needsRouter,PlatformAwareRouterIsNull:PlatformAwareRouter===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Debug: List file system to verify router files exist
    // #region debug log
    fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:238',message:'Before require fs and path',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    
    let fs: any;
    let pathModule: any;
    try {
      fs = require('fs');
      pathModule = require('path');
      
      // #region debug log
      fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:245',message:'fs and path required successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
    } catch (fsPathError: any) {
      // #region debug log
      fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:249',message:'fs or path require failed',data:{error:fsPathError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      logger.error('Failed to require fs or path', { error: fsPathError?.message });
      throw fsPathError;
    }
    const cwd = process.cwd();
      const routerPath = pathModule.join(cwd, 'node_modules', '@alexa-multi-agent', 'router');
      try {
        const nodeModulesExists = fs.existsSync(pathModule.join(cwd, 'node_modules'));
        const routerDirExists = fs.existsSync(routerPath);
        const routerDistExists = fs.existsSync(pathModule.join(routerPath, 'dist'));
        const routerIndexExists = fs.existsSync(pathModule.join(routerPath, 'dist', 'index.js'));
        const pkgExists = fs.existsSync(pathModule.join(routerPath, 'package.json'));
      
      // #region debug log
      fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:252',message:'File system check results',data:{cwd,nodeModulesExists,routerDirExists,routerDistExists,routerIndexExists,pkgExists,routerPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
        
        logger.info('File system check', {
          cwd,
          nodeModulesExists,
          routerDirExists,
          routerDistExists,
          routerIndexExists,
          pkgExists,
          routerPath,
          nodeModulesContents: nodeModulesExists ? fs.readdirSync(pathModule.join(cwd, 'node_modules')).slice(0, 10) : 'N/A',
          routerDirContents: routerDirExists ? fs.readdirSync(routerPath) : 'N/A'
        });
      } catch (fsError: any) {
      // #region debug log
      fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:257',message:'File system check failed',data:{error:fsError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
        logger.error('File system check failed', { error: fsError?.message });
    }

    // Only import router if needed (for conversation routes)
    if (needsRouter && !PlatformAwareRouter) {
      // #region debug log
      fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:268',message:'Before router import block - needsRouter is true',data:{needsRouter,PlatformAwareRouterIsNull:PlatformAwareRouter===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      
      try {
        // #region debug log
        fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:272',message:'Inside router import try block',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
        // #endregion
        
        // Try multiple import strategies for Lambda environment
        let routerModule: any = null;
        
        // #region debug log
        fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:277',message:'Before requiring path and fs inside try',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
        // #endregion
        
        const pathModule = require('path');
        const fs = require('fs');
        
        // #region debug log
        fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:281',message:'path and fs required successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
        // #endregion
        
        // Log file system state for debugging
        const cwd = process.cwd();
        const routerDir1 = pathModule.join(cwd, 'node_modules', '@alexa-multi-agent', 'router');
        const routerDir2 = pathModule.join(__dirname, '..', 'node_modules', '@alexa-multi-agent', 'router');
        const routerFile1 = pathModule.join(routerDir1, 'dist', 'index.js');
        const routerFile2 = pathModule.join(routerDir2, 'dist', 'index.js');
        const pkgFile1 = pathModule.join(routerDir1, 'package.json');
        const pkgFile2 = pathModule.join(routerDir2, 'package.json');
        
        logger.info('Attempting router import', {
          cwd,
          __dirname: typeof __dirname !== 'undefined' ? __dirname : 'undefined',
          routerDir1Exists: fs.existsSync(routerDir1),
          routerDir2Exists: fs.existsSync(routerDir2),
          routerFile1Exists: fs.existsSync(routerFile1),
          routerFile2Exists: fs.existsSync(routerFile2),
          pkgFile1Exists: fs.existsSync(pkgFile1),
          pkgFile2Exists: fs.existsSync(pkgFile2)
        });
        
        // Strategy 1: Try dist/router fallback (bundled directly in dist)
        // CRITICAL: Use path.resolve to get absolute path, then require directly
        // Using require.resolve() on a relative path can trigger package resolution
        const routerFileDist = pathModule.resolve(__dirname, 'router', 'index.js');
        // #region debug log
        fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:348',message:'Before Strategy 1 - dist/router fallback',data:{routerFileDist,exists:fs.existsSync(routerFileDist),__dirname:typeof __dirname !== 'undefined' ? __dirname : 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
        // #endregion
        
        if (fs.existsSync(routerFileDist)) {
          // Check if there's a package.json in the router directory that might cause issues
          const routerDir = pathModule.dirname(routerFileDist);
          const routerPkgPath = pathModule.join(routerDir, 'package.json');
          const hasPkgJson = fs.existsSync(routerPkgPath);
          
          // #region debug log
          fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:354',message:'Strategy 1 - About to require routerFileDist (absolute path)',data:{routerFileDist,fileSize:fs.statSync(routerFileDist).size,hasPkgJson,routerDir},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
          // #endregion
          
            try {
              // CRITICAL FIX: ALWAYS remove package.json from router directory before requiring
              // When Node.js loads a file with relative requires (like ./Router, ./PlatformAwareRouter),
              // and there's a package.json in that directory, Node.js may try to resolve those
              // relative requires through package resolution, which can trigger a lookup for
              // @alexa-multi-agent/router as a package name.
            let pkgJsonBackup: string | null = null;
            if (hasPkgJson) {
              pkgJsonBackup = pathModule.join(routerDir, 'package.json.backup');
              fs.renameSync(routerPkgPath, pkgJsonBackup);
                logger.info('Temporarily removed package.json from router directory to prevent package resolution');
              }
              
              try {
                // Use absolute path directly - this should bypass package resolution
                // But we still need to remove package.json because the router's index.js
                // has top-level relative requires that execute immediately when loaded
                const absoluteRouterPath = pathModule.resolve(routerFileDist);
                
                // Wrap in try-catch to catch any module resolution errors
            try {
              routerModule = require(absoluteRouterPath);
                  
                  // #region debug log
                  fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:365',message:'Strategy 1 - require succeeded',data:{routerFileDist:absoluteRouterPath,hasRouterModule:!!routerModule},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
                  // #endregion
                  
              logger.info('Router loaded via dist/router fallback', { path: absoluteRouterPath });
            } catch (requireError: any) {
                  // If require fails with MODULE_NOT_FOUND for @alexa-multi-agent/router,
                  // this confirms Node.js is trying to resolve it as a package
              if (requireError?.code === 'MODULE_NOT_FOUND' && requireError?.message?.includes('@alexa-multi-agent/router')) {
                    logger.error('CRITICAL: Node.js tried to resolve @alexa-multi-agent/router as a package', {
                  error: requireError.message,
                      stack: requireError.stack,
                      routerPath: absoluteRouterPath,
                      routerDir,
                      hasPkgJson: fs.existsSync(routerPkgPath),
                      requireStack: (requireError as any)?.requireStack
                });
                throw requireError;
              }
              throw requireError;
                }
            } finally {
              // Restore package.json if we renamed it
              if (pkgJsonBackup && fs.existsSync(pkgJsonBackup)) {
                fs.renameSync(pkgJsonBackup, routerPkgPath);
                  logger.info('Restored package.json in router directory');
              }
            }
          } catch (distError: any) {
              // #region debug log
              fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:375',message:'Strategy 1 - require failed',data:{routerFileDist,error:distError?.message,stack:distError?.stack,code:distError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
              // #endregion
            logger.debug('Dist router fallback failed', { error: distError?.message });
          }
        }
        
        // Strategy 2: Direct file path using process.cwd() (Lambda uses /var/task as cwd)
        // Use path.resolve to ensure absolute path
        if (!routerModule && fs.existsSync(routerFile1)) {
          try {
            const absolutePath1 = pathModule.resolve(routerFile1);
            routerModule = require(absolutePath1);
            logger.info('Router loaded via direct file path (cwd)', { path: absolutePath1 });
          } catch (directPathError: any) {
            logger.error('Failed to require router file (cwd path)', { 
              path: routerFile1,
              error: directPathError?.message,
              stack: directPathError?.stack
            });
          }
        }
        
        // Strategy 3: Try with __dirname (compiled code location)
        // Use path.resolve to ensure absolute path
        if (!routerModule && fs.existsSync(routerFile2)) {
          try {
            const absolutePath2 = pathModule.resolve(routerFile2);
            routerModule = require(absolutePath2);
            logger.info('Router loaded via __dirname path', { path: absolutePath2 });
          } catch (dirnameError: any) {
            logger.error('Failed to require router file (__dirname path)', { 
              path: routerFile2,
              error: dirnameError?.message
            });
          }
        }
        
            // Strategy 3: Try require.resolve with package name (ONLY if all file paths failed)
            // NOTE: This will fail if package.json doesn't exist or is malformed
            // SKIP THIS STRATEGY - require.resolve triggers package resolution which fails
            // We'll rely on direct file paths only
            if (!routerModule) {
              logger.error('All router file path strategies failed', {
                distRouterExists: fs.existsSync(pathModule.join(__dirname, 'router', 'index.js')),
                cwdRouterExists: fs.existsSync(routerFile1),
                dirnameRouterExists: fs.existsSync(routerFile2),
                cwd,
                __dirname: typeof __dirname !== 'undefined' ? __dirname : 'undefined'
              });
              throw new Error('Router module not found in any expected location. Check deployment bundling.');
            }
        
        // Try multiple ways to get PlatformAwareRouter
        PlatformAwareRouter = routerModule.PlatformAwareRouter 
          || routerModule.default?.PlatformAwareRouter 
          || routerModule.default
          || (routerModule.default && typeof routerModule.default === 'function' ? routerModule.default : null);
        
        // If still not found, try importing PlatformAwareRouter directly using file paths (not ES import)
        if (!PlatformAwareRouter || typeof PlatformAwareRouter !== 'function') {
          // #region debug log
          fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:414',message:'Before PlatformAwareRouter file path require',data:{routerModuleIsNull:routerModule===null,PlatformAwareRouterIsNull:PlatformAwareRouter===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          // Try direct file path requires instead of ES import (which triggers package resolution)
          // Use path.resolve to ensure absolute paths
          const platformRouterPaths = [
            pathModule.resolve(__dirname, 'router', 'dist', 'PlatformAwareRouter.js'),
            pathModule.resolve(cwd, 'node_modules', '@alexa-multi-agent', 'router', 'dist', 'PlatformAwareRouter.js'),
            pathModule.resolve(__dirname, '..', 'node_modules', '@alexa-multi-agent', 'router', 'dist', 'PlatformAwareRouter.js')
          ];
          
          for (const platformRouterPath of platformRouterPaths) {
            if (fs.existsSync(platformRouterPath)) {
              try {
                const platformRouterModule: any = require(platformRouterPath);
                
                // #region debug log
                fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:425',message:'PlatformAwareRouter loaded via file path',data:{path:platformRouterPath,hasPlatformAwareRouter:!!platformRouterModule.PlatformAwareRouter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                
                PlatformAwareRouter = platformRouterModule.PlatformAwareRouter 
                  || platformRouterModule.default?.PlatformAwareRouter
                  || platformRouterModule.default 
                  || platformRouterModule;
                if (PlatformAwareRouter && typeof PlatformAwareRouter === 'function') {
                  break;
                }
              } catch (platformError: any) {
                // #region debug log
                fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:435',message:'PlatformAwareRouter file path require failed',data:{path:platformRouterPath,error:platformError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                logger.debug('PlatformAwareRouter file path failed', { path: platformRouterPath, error: platformError?.message });
              }
            }
          }
          
          if (!PlatformAwareRouter || typeof PlatformAwareRouter !== 'function') {
            logger.warn('Could not load PlatformAwareRouter from any file path');
          }
        }
        
        // Try to load config using file paths (not ES import)
        // #region debug log
        fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:448',message:'Before config file path require',data:{routerModuleIsNull:routerModule===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Try direct file path requires instead of ES import (which triggers package resolution)
        // Use path.resolve to ensure absolute paths
        const configPaths = [
          pathModule.resolve(__dirname, 'router', 'dist', 'config.js'),
          pathModule.resolve(cwd, 'node_modules', '@alexa-multi-agent', 'router', 'dist', 'config.js'),
          pathModule.resolve(__dirname, '..', 'node_modules', '@alexa-multi-agent', 'router', 'dist', 'config.js')
        ];
        
        let configLoaded = false;
        for (const configPath of configPaths) {
          if (fs.existsSync(configPath)) {
            try {
              const configModule: any = require(configPath);
              
              // #region debug log
              fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:459',message:'Config loaded via file path',data:{path:configPath,hasCreateDefaultConfig:!!configModule.createDefaultConfig},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              
              createDefaultConfig = configModule.createDefaultConfig || configModule.default?.createDefaultConfig || configModule.default;
              if (createDefaultConfig) {
                configLoaded = true;
                break;
              }
            } catch (configError: any) {
              // #region debug log
              fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:467',message:'Config file path require failed',data:{path:configPath,error:configError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              logger.debug('Config file path failed', { path: configPath, error: configError?.message });
            }
          }
        }
        
        // Fallback: try importing from router module directly
        if (!configLoaded) {
          logger.warn('Could not import router config from file paths, trying main export');
          createDefaultConfig = routerModule?.createDefaultConfig || routerModule?.default?.createDefaultConfig;
          if (!createDefaultConfig) {
            logger.warn('Could not import router config, using defaults');
            // Create a minimal default config function
            createDefaultConfig = () => ({
              openai: { apiKey: process.env.OPENAI_API_KEY || '', model: 'gpt-5' },
              redis: { url: process.env.REDIS_URL || '' },
              agents: {}
            });
          }
        }
      } catch (routerError: any) {
        // #region debug log
        fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:410',message:'Router import catch block - final error',data:{error:routerError?.message,stack:routerError?.stack,code:routerError?.code,name:routerError?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
        // #endregion
        
        logger.error('Failed to import router module', { error: routerError?.message });
        throw routerError;
      }
      
      if (!PlatformAwareRouter || typeof PlatformAwareRouter !== 'function') {
        logger.error('PlatformAwareRouter is not a constructor', { 
          type: typeof PlatformAwareRouter,
          isNull: PlatformAwareRouter === null,
          isUndefined: PlatformAwareRouter === undefined
        });
        throw new Error('PlatformAwareRouter is not a constructor');
      }
    }

    // Initialize Router (only if needed for conversation flows)
    let routerInitialized = false;
    if (needsRouter && PlatformAwareRouter) {
      try {
        const routerConfig = createDefaultConfig();
        router = new PlatformAwareRouter(routerConfig);
        
        // PlatformAwareRouter extends Router, which has an initialize() method
        // that connects to Redis and initializes services
        // Call initialize() to set up Redis connections and services
        if (router && typeof router.initialize === 'function') {
          logger.info('Calling router.initialize() to set up Redis and services...');
          // Add timeout to prevent hanging on Redis connection (5 second timeout)
          const initPromise = router.initialize();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Router initialization timeout after 5 seconds')), 5000)
          );
          
          try {
            await Promise.race([initPromise, timeoutPromise]);
            routerInitialized = true;
            logger.info('Router initialized successfully');
          } catch (initTimeoutError: any) {
            logger.warn('Router initialization timed out, continuing without full initialization', {
              error: initTimeoutError?.message
            });
            // Still mark as initialized - router can work with limited functionality
            routerInitialized = true;
          }
        } else {
          routerInitialized = true;
          logger.info('Router created (no initialize method)');
        }
      } catch (routerInitError: any) {
        logger.warn('Router initialization failed, continuing without router for REST API routes', { 
          error: routerInitError?.message,
          stack: routerInitError?.stack 
        });
        router = null;
        routerInitialized = false;
      }
    } else if (!needsRouter) {
      // Skip router initialization for REST API routes
      router = null;
      routerInitialized = false;
      logger.info('Skipping router initialization for REST API routes');
    }

    // Initialize Event Publisher
    const eventPublisherConfig = {
      eventBusName: process.env.EVENT_BUS_NAME || 'storytailor-events',
      region: process.env.AWS_REGION || 'us-east-2',
      source: 'com.storytailor.universal-agent' as const,
      enableReplay: true,
      enableDeadLetterQueue: true,
      retryAttempts: 3,
      batchSize: 10
    };
    
    // Try to load EventPublisher dynamically from the canonical package
    try {
      const eventSystemModule: any = await import('@alexa-multi-agent/event-system');
      const EventPublisher =
        eventSystemModule.EventPublisher ||
        eventSystemModule.default?.EventPublisher ||
        eventSystemModule.default;

      if (EventPublisher) {
        eventPublisher = new EventPublisher(eventPublisherConfig, logger);
        if (eventPublisher.initialize) {
          await eventPublisher.initialize();
        }
      } else {
        logger.warn('EventPublisher not available, continuing without event publishing');
        eventPublisher = {
          publishEvent: async () => {},
          publish: async () => {},
          initialize: async () => {},
          close: async () => {}
        };
      }
    } catch (error: any) {
      logger.warn('Failed to load EventPublisher, continuing without event publishing', { error: error.message });
      eventPublisher = {
        publishEvent: async () => {},
        publish: async () => {},
        initialize: async () => {},
        close: async () => {}
      };
    }

    // Dynamically import UniversalConversationManager (only if router is available)
    if (!UniversalConversationManager && routerInitialized && router) {
      try {
        const ucmModule: any = await import('./conversation/UniversalConversationManager');
        UniversalConversationManager = ucmModule.UniversalConversationManager || ucmModule.default?.UniversalConversationManager || ucmModule.default;
      } catch (ucmError: any) {
        logger.error('Failed to import UniversalConversationManager', { error: ucmError?.message });
        throw ucmError;
      }
    }

    // Initialize Universal Conversation Manager (only if router is available)
    if (routerInitialized && router) {
      conversationManager = new UniversalConversationManager(router, eventPublisher, logger);
    } else {
      logger.warn('Conversation Manager not initialized - router unavailable');
    }

    // Initialize UniversalStorytellerAPI and RESTAPIGateway for /api/v1/* routes
    try {
      const RESTAPIGatewayModule: any = await import('./api/RESTAPIGateway');
      const RESTAPIGatewayClass = RESTAPIGatewayModule.RESTAPIGateway || RESTAPIGatewayModule.default?.RESTAPIGateway || RESTAPIGatewayModule.default;
      
      if (RESTAPIGatewayClass) {
        // For REST API routes that don't need the router, we can initialize RESTAPIGateway without UniversalStorytellerAPI
        // Some routes (like sensory profile) only need Supabase, not the router
        if (routerInitialized && router) {
          // Full initialization with router for conversation routes
          const UniversalStorytellerAPIModule: any = await import('./UniversalStorytellerAPI');
          const UniversalStorytellerAPIClass = UniversalStorytellerAPIModule.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default?.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default;
          
          if (UniversalStorytellerAPIClass) {
            universalStorytellerAPI = new UniversalStorytellerAPIClass(router, eventPublisher, logger);
            restAPIGateway = new RESTAPIGatewayClass(universalStorytellerAPI, logger);
            // Initialize AuthAgent (required before using auth routes)
            await restAPIGateway.initialize();
            logger.info('RESTAPIGateway initialized with full router support');
          } else {
            logger.warn('UniversalStorytellerAPI not available, RESTAPIGateway will have limited functionality');
          }
        } else {
          // Minimal initialization for REST API routes that don't need router (e.g., auth, sensory profile)
          // Pass null for router and eventPublisher - RESTAPIGateway will handle routes that don't need them
          const UniversalStorytellerAPIModule: any = await import('./UniversalStorytellerAPI');
          const UniversalStorytellerAPIClass = UniversalStorytellerAPIModule.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default?.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default;
          
          if (UniversalStorytellerAPIClass) {
            // Pass null for router and eventPublisher - conversation routes will return 503
            universalStorytellerAPI = new UniversalStorytellerAPIClass(null, null, logger);
            restAPIGateway = new RESTAPIGatewayClass(universalStorytellerAPI, logger);
            // Initialize AuthAgent (required before using auth routes)
            await restAPIGateway.initialize();
            logger.info('RESTAPIGateway initialized without router (REST API routes only, conversation routes disabled)');
          } else {
            logger.warn('UniversalStorytellerAPI not available, RESTAPIGateway will have limited functionality');
            // Still create RESTAPIGateway with null storytellerAPI for routes that don't need it
            restAPIGateway = new RESTAPIGatewayClass(null, logger);
            // Initialize AuthAgent (required before using auth routes)
            await restAPIGateway.initialize();
          }
        }
      } else {
        logger.warn('RESTAPIGateway not available, /api/v1/* routes will not work');
      }
    } catch (error: any) {
      logger.warn('Failed to initialize RESTAPIGateway, /api/v1/* routes will not work', { error: error.message });
    }

    logger.info('Universal Agent initialized successfully');
  } catch (error) {
    const logger = getLogger();
    logger.error('Failed to initialize Universal Agent', { error });
    throw error;
  }
}

/**
 * Lambda handler
 * Handles both API Gateway and Function URL events
 */
export const handler = async (event: any, context?: any): Promise<any> => {
  // CRITICAL: Log immediately to verify handler is being called
  console.error('[HANDLER ENTRY] Module loaded successfully, handler called', {
    hasEvent: !!event,
    eventPath: event?.path,
    eventRawPath: event?.rawPath,
    PlatformAwareRouterIsNull: PlatformAwareRouter === null,
        timestamp: new Date().toISOString()
  });
  
  // #region debug log
  fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:618',message:'Handler entry - module load complete',data:{hasEvent:!!event,eventPath:event?.path,eventRawPath:event?.rawPath,PlatformAwareRouterIsNull:PlatformAwareRouter===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  try {
    // Log event structure for debugging (only in development)
    if (process.env.LOG_EVENTS === 'true') {
      logger.info('Lambda event received', { 
        hasRequestContext: !!event.requestContext,
        hasHttp: !!event.requestContext?.http,
        rawPath: event.rawPath,
        path: event.path,
        method: event.requestContext?.http?.method || event.httpMethod,
        bodyType: typeof event.body
      });
    }

    // Handle Lambda Function URL events (new format)
    // Function URLs use: requestContext.http.method, rawPath, etc.
    if (event.requestContext?.http) {
      const method = event.requestContext.http.method;
      // Normalize path: remove double slashes and ensure it starts with /
      let path = (event.rawPath || event.requestContext.http.path || '/').replace(/\/+/g, '/');
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      
      // Health check for Function URLs - handle early to avoid initialization
      if (method === 'GET' && (path === '/health' || path === 'health')) {
        // Try to verify RESTAPIGateway can initialize (fail fast)
        try {
          const RESTAPIGatewayModule: any = await import('./api/RESTAPIGateway');
          const RESTAPIGatewayClass = RESTAPIGatewayModule.RESTAPIGateway || RESTAPIGatewayModule.default?.RESTAPIGateway || RESTAPIGatewayModule.default;
          if (!RESTAPIGatewayClass) {
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'unhealthy',
                service: 'universal-agent',
                code: 'REST_API_NOT_READY',
                error: 'RESTAPIGateway class not found',
                timestamp: new Date().toISOString()
              })
            };
          }
          // Try to construct (will fail if dependencies missing)
          const logger = getLogger();
          const UniversalStorytellerAPIModule: any = await import('./UniversalStorytellerAPI');
          const UniversalStorytellerAPIClass = UniversalStorytellerAPIModule.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default?.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default;
          if (!UniversalStorytellerAPIClass) {
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'unhealthy',
                service: 'universal-agent',
                code: 'REST_API_NOT_READY',
                error: 'UniversalStorytellerAPI class not found',
                timestamp: new Date().toISOString()
              })
            };
          }
          const mockRouter = { route: async () => ({ success: false }), processMessage: async () => ({ success: false }) };
          const mockEventPublisher = { publish: async () => {}, initialize: async () => {}, close: async () => {} };
          const mockStorytellerAPI = new UniversalStorytellerAPIClass(mockRouter as any, mockEventPublisher, logger);
          new RESTAPIGatewayClass(mockStorytellerAPI, logger);
        } catch (healthError: any) {
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'unhealthy',
              service: 'universal-agent',
              code: 'REST_API_NOT_READY',
              error: healthError.message || String(healthError),
              timestamp: new Date().toISOString()
            })
          };
        }
        // Check AuthAgent initialization status
        let authReady = false;
        let authError: string | null = null;
        try {
          if (restAPIGateway && typeof (restAPIGateway as any).isAuthAgentInitialized === 'function') {
            authReady = (restAPIGateway as any).isAuthAgentInitialized();
          } else if (restAPIGateway === null) {
            authError = 'RESTAPIGateway not initialized';
          } else {
            authError = 'AuthAgent status check not available';
          }
        } catch (err: any) {
          authError = err.message || String(err);
        }

        if (!authReady && authError) {
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'unhealthy',
              service: 'universal-agent',
              code: 'AUTH_NOT_READY',
              details: authError,
              checks: {
                auth: { ready: false }
              },
              timestamp: new Date().toISOString(),
              version: '1.0.0'
            })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'healthy',
            service: 'universal-agent',
            initialized: conversationManager !== null,
            restApiReady: true,
            checks: {
              auth: { ready: authReady }
            },
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          })
        };
      }
      
      // For other Function URL requests, try to parse body
      let body: any = {};
        if (event.body) {
          try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
          } catch (e) {
          // Ignore parse errors for health checks - but still verify RESTAPIGateway
          if (path === '/health' || path === 'health') {
            // Try to verify RESTAPIGateway can initialize (fail fast)
            try {
              const RESTAPIGatewayModule: any = await import('./api/RESTAPIGateway');
              const RESTAPIGatewayClass = RESTAPIGatewayModule.RESTAPIGateway || RESTAPIGatewayModule.default?.RESTAPIGateway || RESTAPIGatewayModule.default;
              if (!RESTAPIGatewayClass) {
                return {
                  statusCode: 500,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    status: 'unhealthy',
                    service: 'universal-agent',
                    code: 'REST_API_NOT_READY',
                    error: 'RESTAPIGateway class not found',
                    timestamp: new Date().toISOString()
                  })
                };
              }
              const logger = getLogger();
              const UniversalStorytellerAPIModule: any = await import('./UniversalStorytellerAPI');
              const UniversalStorytellerAPIClass = UniversalStorytellerAPIModule.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default?.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default;
              if (!UniversalStorytellerAPIClass) {
                return {
                  statusCode: 500,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    status: 'unhealthy',
                    service: 'universal-agent',
                    code: 'REST_API_NOT_READY',
                    error: 'UniversalStorytellerAPI class not found',
                    timestamp: new Date().toISOString()
                  })
                };
              }
              const mockRouter = { route: async () => ({ success: false }), processMessage: async () => ({ success: false }) };
              const mockEventPublisher = { publish: async () => {}, initialize: async () => {}, close: async () => {} };
              const mockStorytellerAPI = new UniversalStorytellerAPIClass(mockRouter as any, mockEventPublisher, logger);
              new RESTAPIGatewayClass(mockStorytellerAPI, logger);
            } catch (healthError: any) {
              return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'unhealthy',
                  service: 'universal-agent',
                  code: 'REST_API_NOT_READY',
                  error: healthError.message || String(healthError),
                  timestamp: new Date().toISOString()
                })
              };
            }
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'healthy',
                service: 'universal-agent',
                restApiReady: true,
                timestamp: new Date().toISOString()
              })
            };
          }
          }
        }
        
        const action = body.action || (path.startsWith('/api/') ? 'api' : 'process');
        
      // Determine if router is needed based on path
      // Conversation routes need router, REST API routes don't
      const needsRouter = path.startsWith('/api/v1/conversation') || 
                         (!path.startsWith('/api/v1/') && action !== 'api');
      
        // Initialize if needed (but not for health checks)
      if (action !== 'health' && path !== '/health' && path !== 'health') {
          try {
            await initialize(needsRouter);
          } catch (initError: any) {
            logger.error('Initialization failed', { error: initError.message });
          // Health check must verify RESTAPIGateway even if init fails
          if (path === '/health' || path === 'health') {
            // Try to verify RESTAPIGateway can initialize (fail fast)
            try {
              const RESTAPIGatewayModule: any = await import('./api/RESTAPIGateway');
              const RESTAPIGatewayClass = RESTAPIGatewayModule.RESTAPIGateway || RESTAPIGatewayModule.default?.RESTAPIGateway || RESTAPIGatewayModule.default;
              if (!RESTAPIGatewayClass) {
                return {
                  statusCode: 500,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    status: 'unhealthy',
                    service: 'universal-agent',
                    code: 'REST_API_NOT_READY',
                    error: 'RESTAPIGateway class not found',
                    timestamp: new Date().toISOString()
                  })
                };
              }
              const logger = getLogger();
              const UniversalStorytellerAPIModule: any = await import('./UniversalStorytellerAPI');
              const UniversalStorytellerAPIClass = UniversalStorytellerAPIModule.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default?.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default;
              if (!UniversalStorytellerAPIClass) {
                return {
                  statusCode: 500,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    status: 'unhealthy',
                    service: 'universal-agent',
                    code: 'REST_API_NOT_READY',
                    error: 'UniversalStorytellerAPI class not found',
                    timestamp: new Date().toISOString()
                  })
                };
              }
              const mockRouter = { route: async () => ({ success: false }), processMessage: async () => ({ success: false }) };
              const mockEventPublisher = { publish: async () => {}, initialize: async () => {}, close: async () => {} };
              const mockStorytellerAPI = new UniversalStorytellerAPIClass(mockRouter as any, mockEventPublisher, logger);
              new RESTAPIGatewayClass(mockStorytellerAPI, logger);
            } catch (healthError: any) {
              return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'unhealthy',
                  service: 'universal-agent',
                  code: 'REST_API_NOT_READY',
                  error: healthError.message || String(healthError),
                  timestamp: new Date().toISOString()
                })
              };
            }
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'healthy',
                service: 'universal-agent',
                initialized: false,
                restApiReady: true,
                timestamp: new Date().toISOString()
              })
            };
          }
          throw initError;
        }
      }
      
      // Handle health check action - verify RESTAPIGateway can initialize
      if (action === 'health' || path === '/health' || path === 'health') {
        // Try to verify RESTAPIGateway can initialize (fail fast)
        try {
          const RESTAPIGatewayModule: any = await import('./api/RESTAPIGateway');
          const RESTAPIGatewayClass = RESTAPIGatewayModule.RESTAPIGateway || RESTAPIGatewayModule.default?.RESTAPIGateway || RESTAPIGatewayModule.default;
          if (!RESTAPIGatewayClass) {
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'unhealthy',
                service: 'universal-agent',
                code: 'REST_API_NOT_READY',
                error: 'RESTAPIGateway class not found',
                timestamp: new Date().toISOString()
              })
            };
          }
          // Try to construct (will fail if dependencies missing)
          const logger = getLogger();
          const UniversalStorytellerAPIModule: any = await import('./UniversalStorytellerAPI');
          const UniversalStorytellerAPIClass = UniversalStorytellerAPIModule.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default?.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default;
          if (!UniversalStorytellerAPIClass) {
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'unhealthy',
                service: 'universal-agent',
                code: 'REST_API_NOT_READY',
                error: 'UniversalStorytellerAPI class not found',
                timestamp: new Date().toISOString()
              })
            };
          }
          const mockRouter = { route: async () => ({ success: false }), processMessage: async () => ({ success: false }) };
          const mockEventPublisher = { publish: async () => {}, initialize: async () => {}, close: async () => {} };
          const mockStorytellerAPI = new UniversalStorytellerAPIClass(mockRouter as any, mockEventPublisher, logger);
          new RESTAPIGatewayClass(mockStorytellerAPI, logger);
        } catch (healthError: any) {
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'unhealthy',
              service: 'universal-agent',
              code: 'REST_API_NOT_READY',
              error: healthError.message || String(healthError),
              timestamp: new Date().toISOString()
            })
          };
        }
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'healthy',
            service: 'universal-agent',
            initialized: conversationManager !== null,
            restApiReady: true,
            timestamp: new Date().toISOString()
          })
        };
      }
      
      // Route /api/v1/* requests through RESTAPIGateway
      if (path.startsWith('/api/v1/') || path.startsWith('/api/v1')) {
        if (!restAPIGateway) {
          // Initialize RESTAPIGateway only (skip router initialization for REST API routes)
          try {
            // Initialize RESTAPIGateway without router for REST API routes
            const RESTAPIGatewayModule: any = await import('./api/RESTAPIGateway');
            const RESTAPIGatewayClass = RESTAPIGatewayModule.RESTAPIGateway || RESTAPIGatewayModule.default?.RESTAPIGateway || RESTAPIGatewayModule.default;
            
            if (RESTAPIGatewayClass) {
              // Create minimal mock components for REST API routes
              let UniversalStorytellerAPIClass: any = null;
              try {
                const UniversalStorytellerAPIModule: any = await import('./UniversalStorytellerAPI');
                UniversalStorytellerAPIClass = UniversalStorytellerAPIModule.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default?.UniversalStorytellerAPI || UniversalStorytellerAPIModule.default;
              } catch (importError: any) {
                logger.warn('UniversalStorytellerAPI import failed, creating minimal mock', { error: importError.message });
                // Create a minimal mock UniversalStorytellerAPI
                UniversalStorytellerAPIClass = class {
                  constructor(router: any, eventPublisher: any, logger: any) {}
                };
              }
              
              if (UniversalStorytellerAPIClass) {
                const mockRouter = {
                  route: async () => ({ success: false, error: 'Router not available' }),
                  processMessage: async () => ({ success: false, error: 'Router not available' })
                };
                const mockEventPublisher = {
                  publish: async () => {},
                  initialize: async () => {},
                  close: async () => {}
                };
                try {
                  universalStorytellerAPI = new UniversalStorytellerAPIClass(mockRouter as any, mockEventPublisher, logger);
                  restAPIGateway = new RESTAPIGatewayClass(universalStorytellerAPI, logger);
                  // Initialize AuthAgent (required before using auth routes)
                  await restAPIGateway.initialize();
                  logger.info('RESTAPIGateway initialized for REST API routes (router not required)');
                } catch (initError: any) {
                  logger.error('Failed to create UniversalStorytellerAPI instance', { error: initError.message });
                  throw initError;
                }
              } else {
                throw new Error('UniversalStorytellerAPI not available');
              }
            } else {
              throw new Error('RESTAPIGateway not available');
            }
          } catch (initError: any) {
            logger.error('Failed to initialize RESTAPIGateway', { error: initError.message });
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                error: 'RESTAPIGateway not initialized',
                message: initError.message
              })
            };
          }
        }
        
        if (restAPIGateway && restAPIGateway.handleLambdaEvent) {
          // Use RESTAPIGateway's built-in Lambda event handler
          return await restAPIGateway.handleLambdaEvent(event);
        } else if (restAPIGateway) {
            // Fallback to manual adapter
            return await handleExpressRequest(restAPIGateway, event, method, path);
        }
      }
      
      // For non-API routes, return operational message
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Universal Agent is operational',
          path,
          method,
          note: 'Full API available at /api/v1/*'
        })
      };
    }
    
    // Handle traditional API Gateway events or direct invocations
    // Handle health check early (before initialization)
    const isHealthCheck = 
      event.path === '/health' ||
      event.rawPath === '/health' ||
      (event.body && typeof event.body === 'string' && event.body.includes('"action":"health"')) ||
      (event.body && typeof event.body === 'object' && event.body.action === 'health') ||
      event.action === 'health';
    
    if (isHealthCheck) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'healthy',
          service: 'universal-agent',
          initialized: conversationManager !== null,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // #region debug log
    fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:828',message:'Before initialize() call',data:{conversationManagerIsNull:conversationManager===null,restAPIGatewayIsNull:restAPIGateway===null,PlatformAwareRouterIsNull:PlatformAwareRouter===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    
    // Initialize if needed
    try {
      await initialize();
      
      // #region debug log
      fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:832',message:'After initialize() call',data:{PlatformAwareRouterIsNull:PlatformAwareRouter===null,conversationManagerIsNull:conversationManager===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
    } catch (initError: any) {
      // #region debug log
      fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:835',message:'initialize() catch block',data:{error:initError?.message,stack:initError?.stack,code:initError?.code,name:initError?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      
      logger.error('Initialization failed', { error: initError.message });
      throw initError;
    }

    // Parse request
    let body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : event;
    const action = body.action || body.intent?.type || 'process';
    
    // Health check
    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'healthy',
          service: 'universal-agent',
          initialized: conversationManager !== null
        })
      };
    }

    // Route to Universal Conversation Manager
    if (!conversationManager) {
      throw new Error('Universal Conversation Manager not initialized');
    }

    // Helper function to normalize channel names
    const normalizeChannel = (channel: string | undefined): any => {
      if (!channel) return 'web_chat'; // Default to web_chat
      const channelMap: Record<string, string> = {
        'web': 'web_chat',
        'web_chat': 'web_chat',
        'mobile': 'mobile_voice',
        'mobile_voice': 'mobile_voice',
        'api': 'api_direct',
        'api_direct': 'api_direct',
        'alexa': 'alexa_plus',
        'alexa_plus': 'alexa_plus',
        'google': 'google_assistant',
        'google_assistant': 'google_assistant',
        'siri': 'apple_siri',
        'apple_siri': 'apple_siri'
      };
      return channelMap[channel.toLowerCase()] || channel;
    };

    // Handle different actions
    switch (action) {
      case 'start':
      case 'start_conversation': {
        const session = await conversationManager.startConversation({
          userId: body.userId || 'anonymous',
          channel: normalizeChannel(body.channel) as any,
          sessionId: body.sessionId
        });
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'universal',
            success: true,
            data: session
          })
        };
      }

      case 'message':
      case 'process_message': {
        const now = new Date().toISOString();
        const response = await conversationManager.processMessage({
          requestId: body.requestId || `req_${Date.now()}`,
          sessionId: body.sessionId,
          userId: body.userId || 'anonymous',
          channel: normalizeChannel(body.channel) as any,
          message: {
            type: body.messageType || 'text',
            content: body.message || body.content || '',
            metadata: {
              timestamp: now,
              ...(body.messageMetadata || {})
            }
          },
          timestamp: now,
          locale: body.locale || 'en-US',
          metadata: body.metadata || {}
        });
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'universal',
            success: true,
            data: response
          })
        };
      }

      case 'end':
      case 'end_conversation': {
        await conversationManager.endConversation(
          body.sessionId,
          body.reason || 'user_ended'
        );
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'universal',
            success: true,
            data: { message: 'Conversation ended' }
          })
        };
      }

      case 'sync':
      case 'synchronize_channels': {
        const syncResult = await conversationManager.synchronizeChannels({
          sourceChannel: normalizeChannel(body.sourceChannel || body.channel) as any,
          targetChannels: (body.targetChannels || body.channels || []).map((c: string) => normalizeChannel(c) as any),
          syncType: body.syncType || 'full',
          conflictResolution: body.conflictResolution || 'merge'
        });
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'universal',
            success: true,
            data: syncResult
          })
        };
      }

      case 'switch_channel': {
        const switchResult = await conversationManager.switchChannel(
          body.sessionId,
          body.fromChannel,
          body.toChannel,
          body.switchContext
        );
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'universal',
            success: true,
            data: switchResult
          })
        };
      }

      default: {
        // Default: treat as message processing
        const now = new Date().toISOString();
        const response = await conversationManager.processMessage({
          requestId: body.requestId || `req_${Date.now()}`,
          sessionId: body.sessionId || `session_${Date.now()}`,
          userId: body.userId || 'anonymous',
          channel: normalizeChannel(body.channel) as any,
          message: {
            type: 'text',
            content: body.message || body.content || JSON.stringify(body),
            metadata: {
              timestamp: now
            }
          },
          timestamp: now,
          locale: body.locale || 'en-US',
          metadata: body.metadata || {}
        });
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'universal',
            success: true,
            data: response
          })
        };
      }
    }
  } catch (error: any) {
    // #region debug log
    fetch('http://127.0.0.1:7242/ingest/ee813704-9400-4ad4-946d-70e4a59c3da5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lambda.ts:993',message:'Handler catch block - top level error',data:{error:error?.message,stack:error?.stack,code:error?.code,name:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    
    logger.error('Universal Agent handler error', { error: error.message, stack: error.stack });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'universal',
        success: false,
        error: error.message || 'Internal error'
      })
    };
  }
};

