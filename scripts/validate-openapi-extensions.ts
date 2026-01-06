#!/usr/bin/env ts-node
/**
 * OpenAPI Extension Validation Script
 * 
 * Enforces the canonical rules from docs/api/OPENAPI_EXTENSIONS.md
 * 
 * Rules Enforced:
 * 1. Every operation MUST have x-scope and x-visibility
 * 2. All mutations (POST, PUT, PATCH, DELETE) MUST have x-idempotency
 * 3. All mutations MUST have x-quota (even if type: none)
 * 4. State-changing operations SHOULD have x-lifecycle
 * 
 * Usage:
 *   npx ts-node scripts/validate-openapi-extensions.ts
 *   npm run validate:openapi
 * 
 * Exit Codes:
 *   0 - All validations passed
 *   1 - Validation errors found
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Types
interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  tags?: string[];
  'x-scope'?: string;
  'x-visibility'?: string;
  'x-idempotency'?: {
    required?: boolean;
    lockKey?: string;
    ttlSeconds?: number;
    consumesQuota?: boolean;
    retrySafe?: boolean;
  };
  'x-quota'?: {
    type?: string;
    cost?: number;
    refundable?: boolean;
    reservedAt?: string;
  };
  'x-lifecycle'?: {
    resource?: string;
    fromStates?: string[];
    toState?: string;
    sideEffects?: string[];
  };
  'x-rate-limit'?: {
    limit?: number;
    window?: number;
    scope?: string;
  };
}

interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
}

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, OpenAPIPathItem>;
}

interface ValidationError {
  path: string;
  method: string;
  operationId: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

// Valid values
const VALID_SCOPES = [
  'public',
  'child-safe',
  'parent-facing',
  'educator-facing',
  'org-admin',
  'platform-admin',
  'internal-only',
];

const VALID_VISIBILITY = ['public', 'restricted', 'internal'];

const MUTATION_METHODS = ['post', 'put', 'patch', 'delete'];

// Validation functions
function validateOperation(
  path: string,
  method: string,
  operation: OpenAPIOperation
): ValidationError[] {
  const errors: ValidationError[] = [];
  const opId = operation.operationId || `${method.toUpperCase()} ${path}`;
  const isMutation = MUTATION_METHODS.includes(method.toLowerCase());

  // Rule 1: x-scope is required
  if (!operation['x-scope']) {
    errors.push({
      path,
      method,
      operationId: opId,
      rule: 'SCOPE_REQUIRED',
      message: 'Missing required extension x-scope',
      severity: 'error',
    });
  } else if (!VALID_SCOPES.includes(operation['x-scope'])) {
    errors.push({
      path,
      method,
      operationId: opId,
      rule: 'SCOPE_INVALID',
      message: `Invalid x-scope value: ${operation['x-scope']}. Must be one of: ${VALID_SCOPES.join(', ')}`,
      severity: 'error',
    });
  }

  // Rule 2: x-visibility is required
  if (!operation['x-visibility']) {
    errors.push({
      path,
      method,
      operationId: opId,
      rule: 'VISIBILITY_REQUIRED',
      message: 'Missing required extension x-visibility',
      severity: 'error',
    });
  } else if (!VALID_VISIBILITY.includes(operation['x-visibility'])) {
    errors.push({
      path,
      method,
      operationId: opId,
      rule: 'VISIBILITY_INVALID',
      message: `Invalid x-visibility value: ${operation['x-visibility']}. Must be one of: ${VALID_VISIBILITY.join(', ')}`,
      severity: 'error',
    });
  }

  // Rule 3: Mutations must have x-idempotency
  if (isMutation && !operation['x-idempotency']) {
    errors.push({
      path,
      method,
      operationId: opId,
      rule: 'IDEMPOTENCY_REQUIRED',
      message: 'Mutation operation missing x-idempotency extension',
      severity: 'error',
    });
  }

  // Rule 4: Mutations must have x-quota
  if (isMutation && !operation['x-quota']) {
    errors.push({
      path,
      method,
      operationId: opId,
      rule: 'QUOTA_REQUIRED',
      message: 'Mutation operation missing x-quota extension (use type: none if not costed)',
      severity: 'error',
    });
  }

  // Rule 5: Validate idempotency structure if present
  if (operation['x-idempotency']) {
    const idem = operation['x-idempotency'];
    if (typeof idem.required !== 'boolean') {
      errors.push({
        path,
        method,
        operationId: opId,
        rule: 'IDEMPOTENCY_STRUCTURE',
        message: 'x-idempotency.required must be explicitly true or false',
        severity: 'error',
      });
    }
    if (idem.required && !idem.lockKey) {
      errors.push({
        path,
        method,
        operationId: opId,
        rule: 'IDEMPOTENCY_LOCKKEY',
        message: 'x-idempotency.required=true but missing lockKey',
        severity: 'error',
      });
    }
  }

  // Rule 6: Validate quota structure if present
  if (operation['x-quota']) {
    const quota = operation['x-quota'];
    if (quota.refundable && quota.reservedAt !== 'request') {
      errors.push({
        path,
        method,
        operationId: opId,
        rule: 'QUOTA_REFUND_SEMANTICS',
        message: 'x-quota.refundable=true only valid when reservedAt=request (canonical rule)',
        severity: 'warning',
      });
    }
  }

  // Rule 7: Warn if lifecycle might be needed
  if (isMutation && !operation['x-lifecycle']) {
    // Check if this looks like a state-changing operation
    const stateChangingPatterns = [
      '/generate',
      '/retry',
      '/cancel',
      '/archive',
      '/restore',
      '/accept',
      '/decline',
      '/complete',
    ];
    const looksLikeStateChange = stateChangingPatterns.some(p => path.includes(p));
    if (looksLikeStateChange) {
      errors.push({
        path,
        method,
        operationId: opId,
        rule: 'LIFECYCLE_RECOMMENDED',
        message: 'State-changing operation should have x-lifecycle extension',
        severity: 'warning',
      });
    }
  }

  return errors;
}

function validateSpec(specPath: string): ValidationError[] {
  const content = fs.readFileSync(specPath, 'utf8');
  const spec = yaml.load(content) as OpenAPISpec;
  const errors: ValidationError[] = [];

  if (!spec.paths) {
    console.error('No paths found in spec');
    return errors;
  }

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = pathItem[method];
      if (operation) {
        const opErrors = validateOperation(path, method, operation);
        errors.push(...opErrors);
      }
    }
  }

  return errors;
}

function generateReport(errors: ValidationError[]): void {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  console.log('\n========================================');
  console.log('OpenAPI Extension Validation Report');
  console.log('========================================\n');

  if (errors.length === 0) {
    console.log('✅ All operations have required extensions\n');
    return;
  }

  // Group by path
  const byPath = new Map<string, ValidationError[]>();
  for (const error of errors) {
    const key = `${error.method.toUpperCase()} ${error.path}`;
    if (!byPath.has(key)) {
      byPath.set(key, []);
    }
    byPath.get(key)!.push(error);
  }

  // Print errors
  for (const [endpoint, errs] of byPath) {
    console.log(`📍 ${endpoint}`);
    for (const err of errs) {
      const icon = err.severity === 'error' ? '❌' : '⚠️';
      console.log(`   ${icon} [${err.rule}] ${err.message}`);
    }
    console.log('');
  }

  // Summary
  console.log('----------------------------------------');
  console.log(`Total: ${errorCount} errors, ${warningCount} warnings`);
  console.log('----------------------------------------\n');

  if (errorCount > 0) {
    console.log('❌ Validation FAILED - Fix errors before merging\n');
  } else {
    console.log('⚠️ Validation passed with warnings\n');
  }
}

function generateContractArtifact(specPath: string, outputPath: string): void {
  const content = fs.readFileSync(specPath, 'utf8');
  const spec = yaml.load(content) as OpenAPISpec;

  const contracts: Array<{
    endpoint: string;
    method: string;
    scope: string;
    visibility: string;
    idempotent: string;
    retrySafe: string;
    costed: string;
  }> = [];

  for (const [pathStr, pathItem] of Object.entries(spec.paths || {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = pathItem[method];
      if (!operation) continue;

      const idem = operation['x-idempotency'];
      const quota = operation['x-quota'];

      contracts.push({
        endpoint: pathStr,
        method: method.toUpperCase(),
        scope: operation['x-scope'] || 'MISSING',
        visibility: operation['x-visibility'] || 'MISSING',
        idempotent: idem?.required ? '✓' : (idem?.required === false ? '✗' : '—'),
        retrySafe: idem?.retrySafe ? '✓' : (idem?.retrySafe === false ? '✗' : '—'),
        costed: quota?.type && quota.type !== 'none' ? '✓' : '✗',
      });
    }
  }

  // Generate markdown
  const header = '| Endpoint | Method | Scope | Visibility | Idempotent | Retry Safe | Costed |';
  const divider = '|----------|--------|-------|------------|------------|------------|--------|';
  const rows = contracts.map(c =>
    `| \`${c.endpoint}\` | ${c.method} | ${c.scope} | ${c.visibility} | ${c.idempotent} | ${c.retrySafe} | ${c.costed} |`
  );

  const markdown = `# Operation Contract

> **Generated**: ${new Date().toISOString()}  
> **Source**: ${path.basename(specPath)}  
> **Version**: ${spec.info?.version || 'unknown'}

This is an auto-generated artifact. Do not edit manually.

## Contract Table

${header}
${divider}
${rows.join('\n')}

## Legend

- **Scope**: Authorization level required
- **Visibility**: public (documented), restricted (partners), internal (staff only)
- **Idempotent**: ✓ = safe to retry with same key, ✗ = creates new resource
- **Retry Safe**: ✓ = no side effects on retry, ✗ = may duplicate
- **Costed**: ✓ = consumes quota, ✗ = free
`;

  fs.writeFileSync(outputPath, markdown);
  console.log(`📄 Generated contract artifact: ${outputPath}`);
}

// Main
function main(): void {
  const specPath = process.argv[2] || 'api/openapi-specification.yaml';
  const generateContract = process.argv.includes('--generate-contract');
  const contractPath = 'docs/api/OPERATION_CONTRACT.md';

  // Check if spec exists
  if (!fs.existsSync(specPath)) {
    console.error(`❌ Spec file not found: ${specPath}`);
    console.error('Usage: npx ts-node scripts/validate-openapi-extensions.ts [spec-path] [--generate-contract]');
    process.exit(1);
  }

  console.log(`\n🔍 Validating: ${specPath}\n`);

  const errors = validateSpec(specPath);
  generateReport(errors);

  if (generateContract) {
    generateContractArtifact(specPath, contractPath);
  }

  const errorCount = errors.filter(e => e.severity === 'error').length;
  process.exit(errorCount > 0 ? 1 : 0);
}

main();

