#!/usr/bin/env node

/**
 * Canary image runs:
 * - End-to-end (default): complete_character_creation_with_visuals
 * - Component mode: generate_character_art (explicitly opt-in)
 * - waits for results and reads DB
 * - captures validation from trace URLs
 * - appends JSONL + review pack
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let dotenv = null;
try {
  dotenv = require('dotenv');
  dotenv.config();
  dotenv.config({ path: '.env.local' });
} catch {
  // dotenv not installed; continue without local env loading
}

const argv = process.argv.slice(2);
const getArgValue = (flag) => {
  const match = argv.find(arg => arg.startsWith(`${flag}=`));
  if (match) return match.split('=').slice(1).join('=');
  return null;
};
const hasFlag = (flag) => argv.includes(flag);

const RUN_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUTPUT_JSONL = process.env.CANARY_IMAGE_JSONL || '/tmp/character-image-canaries.jsonl';
const OUTPUT_MARKDOWN = process.env.CANARY_IMAGE_MARKDOWN || '/tmp/character-image-canaries.md';
const OUTPUT_ATTEMPTS_JSONL = process.env.CANARY_IMAGE_ATTEMPTS_JSONL || '/tmp/character-image-canary-attempts.jsonl';
const OUTPUT_REVIEW_MARKDOWN = process.env.CANARY_IMAGE_REVIEW_MARKDOWN || '/tmp/canary-review-pack-latest.md';
const OUTPUT_REVIEW_MARKDOWN_RUN = process.env.CANARY_IMAGE_REVIEW_MARKDOWN_RUN
  || `/tmp/canary-review-pack-${RUN_TIMESTAMP}.md`;
const FORCE_BAD_HOST = hasFlag('--force-bad-host');
const useMatrix = hasFlag('--matrix');
const useTargeted = hasFlag('--targeted');
const useCanonical = hasFlag('--canonical');
const onlyArg = argv.find((arg) => arg.startsWith('--only='));
const SKIP_AUTH_PREFLIGHT = hasFlag('--skip-auth-preflight');
const CONFIRM_PRODUCTION = hasFlag('--confirm-production');
const ENSURE_CANARY_USER = hasFlag('--ensure-canary-user');
const ALLOW_PROD_ENSURE_USER = hasFlag('--allow-prod-ensure-user');
const PERSIST_SSM = hasFlag('--persist-ssm');
const cliCanaryEmail = getArgValue('--canary-email');
const cliCanaryPassword = getArgValue('--canary-password');
const SHOW_HELP = hasFlag('--help');
const LIST_TRAITS = hasFlag('--list-traits');
const LIST_ENUMS = hasFlag('--list-enums');
const RESOLVE_VALUE = getArgValue('--resolve');
const STRICT_MODE = hasFlag('--strict') || hasFlag('--strict-mode');
const MODE_RAW = (getArgValue('--mode') || 'e2e').toLowerCase();
const MODE = MODE_RAW === 'end-to-end' ? 'e2e' : MODE_RAW;
const PREFLIGHT_ONLY = hasFlag('--preflight-only');
const ENV_FLAG = getArgValue('--env'); // staging | production
const LEGACY_FALLBACK_EXPIRY = '2026-01-28';

if (!['e2e', 'component'].includes(MODE)) {
  console.error(`Invalid --mode=${MODE_RAW}. Use --mode=e2e or --mode=component.`);
  process.exit(1);
}

if (cliCanaryEmail) process.env.CANARY_AUTH_EMAIL = cliCanaryEmail;
if (cliCanaryPassword) process.env.CANARY_AUTH_PASSWORD = cliCanaryPassword;
const onlyCanaries = onlyArg
  ? onlyArg.replace('--only=', '').split(',').map((value) => value.trim()).filter(Boolean)
  : [];

function log(message, extra) {
  const stamp = new Date().toISOString();
  if (extra) {
    console.log(`[${stamp}] ${message}`, extra);
  } else {
    console.log(`[${stamp}] ${message}`);
  }
}

function logResolved(name, source, value, detail) {
  const lowered = name.toLowerCase();
  const masked = /(key|secret|password|token)/.test(lowered) ? '***' : value;
  log(`Resolved ${name} from ${source}`, { value: masked, detail });
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function classifyToken(token) {
  const payload = decodeJwtPayload(token);
  const issuer = payload?.iss || null;
  const tokenType = issuer && /supabase/i.test(issuer) ? 'supabase_jwt' : 'custom_jwt';
  return { tokenType, issuer, payload };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getSSMParam(ssm, name) {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true
  });
  const response = await ssm.send(command);
  return response.Parameter?.Value || '';
}

async function resolveConfigValue({
  name,
  envVar,
  ssmPaths,
  fallback,
  required,
  ssm
}) {
  const envVal = process.env[envVar];
  if (envVal) {
    logResolved(name, 'env', envVal);
    return envVal;
  }

  if (ssm && Array.isArray(ssmPaths)) {
    const errors = [];
    for (const path of ssmPaths) {
      try {
        const value = await getSSMParam(ssm, path);
        if (value) {
          logResolved(name, 'ssm', value, { path });
          return value;
        }
        errors.push({ path, error: 'Empty value' });
      } catch (err) {
        errors.push({ path, error: err.message || String(err) });
      }
    }
    if (required) {
      console.error(`Missing required secret: ${name}`);
      console.error(`Provider env missing for ${envVar}`);
      errors.forEach(entry => {
        console.error(`Provider ssm failed for ${entry.path}: ${entry.error}`);
      });
      process.exit(1);
    }
  }

  if (fallback !== undefined) {
    logResolved(name, 'fallback', fallback);
    return fallback;
  }

  console.error(`Missing required value: ${name}`);
  console.error(`Provider env missing for ${envVar}`);
  process.exit(1);
}

function assertCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function assertAuthPreflight(config) {
  const authPrefix = config.authBasePath || '/api/v1';
  const loginUrl = joinUrl(config.apiBaseUrl, `${authPrefix}/auth/login`);
  const meUrl = joinUrl(config.apiBaseUrl, `${authPrefix}/auth/me`);

  const loginRes = await jsonFetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: config.authEmail,
      password: config.authPassword
    })
  });

  if (!loginRes.ok || !loginRes.data?.tokens?.accessToken) {
    console.error('Auth preflight failed: /api/v1/auth/login did not return a usable access token.');
    console.error(`Status: ${loginRes.status}`);
    console.error(`Body: ${JSON.stringify(loginRes.data, null, 2)}`);
    process.exit(1);
  }

  const accessToken = loginRes.data.tokens.accessToken;
  const tokenInfo = classifyToken(accessToken);
  const meRes = await jsonFetch(meUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!meRes.ok) {
    console.error('Auth preflight failed: /api/v1/auth/me rejected the login token.');
    console.error(`Status: ${meRes.status}`);
    console.error(`Body: ${JSON.stringify(meRes.data, null, 2)}`);
    process.exit(1);
  }

  log('Auth preflight ok (login -> auth/me)', {
    status: meRes.status,
    tokenType: tokenInfo.tokenType,
    tokenIssuer: tokenInfo.issuer || 'unknown'
  });
  return {
    accessToken,
    tokenInfo,
    user: meRes.data?.user || null
  };
}

function persistLocalCanaryEnv(email, password) {
  const envPath = '.env.local';
  const lines = [];
  if (email) lines.push(`CANARY_AUTH_EMAIL=${email}`);
  if (password) lines.push(`CANARY_AUTH_PASSWORD=${password}`);
  if (lines.length === 0) return;
  try {
    const content = `${lines.join('\n')}\n`;
    fs.appendFileSync(envPath, content);
    log(`Stored canary credentials locally at ${envPath} for reuse`);
  } catch (err) {
    console.error(`Failed to write ${envPath}: ${err.message || err}`);
  }
}

async function ensureCanaryUser({
  apiBaseUrl,
  supabaseUrl,
  supabaseServiceRoleKey,
  email,
  password,
  authBasePath
}) {
  const authPrefix = authBasePath || '/api/v1';
  const loginUrl = joinUrl(apiBaseUrl, `${authPrefix}/auth/login`);
  const meUrl = joinUrl(apiBaseUrl, `${authPrefix}/auth/me`);

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const loginAttempt = async (pw) => jsonFetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pw })
  });

  const tryLogin = await loginAttempt(password);
  if (tryLogin.ok && tryLogin.data?.tokens?.accessToken) {
    log('Canary user already exists; login succeeded.');
    persistLocalCanaryEnv(email, password);
    return { email, password };
  }

  log('Canary user login failed; attempting ensure via Supabase admin', {
    status: tryLogin.status,
    body: tryLogin.data
  });

  const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = Array.isArray(list.data?.users)
    ? list.data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
    : null;

  if (existing) {
    const updated = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true
    });
    if (updated.error) {
      throw new Error(`Failed to update canary user password: ${updated.error.message || updated.error.name || 'unknown error'}`);
    }
    log('Updated canary user password via Supabase admin');
  } else {
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (created.error) {
      throw new Error(`Failed to create canary user: ${created.error.message || created.error.name || 'unknown error'}`);
    }
    log('Created canary user via Supabase admin');
  }

  // Verify new user works
  const verifyLogin = await loginAttempt(password);
  if (!verifyLogin.ok || !verifyLogin.data?.tokens?.accessToken) {
    throw new Error('Ensured canary user but login verification failed');
  }

  const accessToken = verifyLogin.data.tokens.accessToken;
  await jsonFetch(meUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  persistLocalCanaryEnv(email, password);
  log('Ensured canary user via Supabase admin and verified login');
  return { email, password };
}

function assertUrl(url, label, errors, allowedHosts) {
  assertCondition(!!url, `${label} is missing`, errors);
  if (!url) return;
  assertCondition(url.startsWith('https://'), `${label} must be https`, errors);
  assertCondition(!url.startsWith('data:'), `${label} must not be data URI`, errors);
  try {
    const host = new URL(url).host;
    const allowed = allowedHosts.some((entry) => {
      if (entry.startsWith('*.')) {
        return host.endsWith(entry.slice(1));
      }
      if (entry === 's3.amazonaws.com') {
        return host === entry || host.endsWith(`.${entry}`);
      }
      return host === entry;
    });
    assertCondition(allowed, `${label} host not allowed: ${host}`, errors);
  } catch {
    errors.push(`${label} is not a valid URL`);
  }
}

function printHelpAndExit() {
  console.log(`
Usage: node scripts/canary-image-runs.js [options]

Options:
  --help                   Show this help and exit
  --matrix                 Run matrix canaries
  --targeted               Include targeted canaries
  --canonical              Run canonical regression set (4 cases)
  --mode=<e2e|component>   Run mode (default: e2e)
  --only=<ids>             Comma-separated canary ids to run
  --preflight-only         Run preflights and exit
  --list-traits            List canonical inclusivity traits and aliases
  --list-enums             List canonical enums (species, genders, etc)
  --resolve=<value>        Resolve a user-entered value to canonical IDs
  --strict                 Treat nonhuman drift as hard fail
  --canary-email=<email>   Override canary auth email (env wins)
  --canary-password=<pw>   Override canary auth password (env wins)
  --skip-auth-preflight    Skip login -> /auth/me preflight (warning)
  --confirm-production     Required if API_BASE_URL targets production
  --ensure-canary-user     Auto-create/reset canary user (staging auto-allowed)
  --allow-prod-ensure-user Allow ensure-canary-user in production (requires --confirm-production)
  --force-bad-host         Negative test: force bad PUBLIC_ASSET_HOSTS
  --env=<staging|production> Explicit environment selector (infers from API host if omitted)
  --persist-ssm            Persist ensured creds back to SSM for the selected env

Env vars respected:
  CANARY_AUTH_EMAIL / CANARY_AUTH_PASSWORD
  API_BASE_URL
  SSM_PREFIX (overrides auto selection; otherwise derived from env)
  CANARY_IMAGE_JSONL / CANARY_IMAGE_MARKDOWN / CANARY_IMAGE_REVIEW_MARKDOWN
`);
  process.exit(0);
}

function resolvedFrom(source) {
  return source || 'unknown';
}

function randomPassword() {
  return `Canary-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}!Aa`;
}

function joinUrl(base, path) {
  const u = new URL(base);
  const basePath = (u.pathname || '').replace(/\/+$/, '');
  const add = path.startsWith('/') ? path : `/${path}`;
  u.pathname = `${basePath}${add}`;
  return u.toString();
}

function loadCanonicalDictionaries() {
  const distPath = path.join(__dirname, '..', 'packages', 'shared-types', 'dist', 'constants', 'CanonicalDictionaries.js');
  if (!fs.existsSync(distPath)) {
    console.error('Canonical dictionaries not built. Run: pnpm -C packages/shared-types build');
    process.exit(1);
  }
  const loaded = require(distPath);
  if (!loaded || !loaded.CANONICAL_DICTIONARIES) {
    console.error('Failed to load canonical dictionaries from shared-types.');
    process.exit(1);
  }
  return loaded;
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['".]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function listTraits(canonical) {
  const rows = canonical.CANONICAL_DICTIONARIES.inclusivityTraits.map((trait) => {
    const aliases = Array.isArray(trait.aliases) && trait.aliases.length > 0
      ? ` (aliases: ${trait.aliases.join(', ')})`
      : '';
    return `${trait.id}: ${trait.label}${aliases}`;
  });
  console.log(rows.join('\n'));
}

function listEnums(canonical) {
  const sections = [
    { label: 'species', list: canonical.CANONICAL_DICTIONARIES.species },
    { label: 'genders', list: canonical.CANONICAL_DICTIONARIES.genders },
    { label: 'ethnicities', list: canonical.CANONICAL_DICTIONARIES.ethnicities },
    { label: 'languages', list: canonical.CANONICAL_DICTIONARIES.languages },
    { label: 'personalityTraits', list: canonical.CANONICAL_DICTIONARIES.personalityTraits },
    { label: 'ageBuckets', list: canonical.CANONICAL_DICTIONARIES.ageBuckets }
  ];
  sections.forEach(section => {
    console.log(`\n${section.label}:`);
    section.list.forEach(entry => {
      const aliases = Array.isArray(entry.aliases) && entry.aliases.length > 0
        ? ` (aliases: ${entry.aliases.join(', ')})`
        : '';
      const key = entry.key || entry.id;
      console.log(`- ${key}: ${entry.label}${aliases}`);
    });
  });
}

function resolveValue(canonical, value) {
  const results = [];
  const entries = [
    { label: 'species', resolver: canonical.resolveCanonicalSpecies },
    { label: 'gender', resolver: canonical.resolveCanonicalGender },
    { label: 'ethnicity', resolver: canonical.resolveCanonicalEthnicity },
    { label: 'language', resolver: canonical.resolveCanonicalLanguage },
    { label: 'personalityTrait', resolver: canonical.resolveCanonicalPersonalityTrait },
    { label: 'ageBucket', resolver: canonical.resolveCanonicalAgeBucket },
    { label: 'inclusivityTrait', resolver: canonical.resolveCanonicalInclusivityTrait }
  ];
  entries.forEach(entry => {
    const resolved = entry.resolver(value);
    if (resolved && resolved.value) {
      results.push(`${entry.label}: ${resolved.value}${resolved.isAlias ? ' (alias)' : ''}`);
    }
  });
  if (results.length === 0) {
    console.log(`No canonical match for "${value}".`);
  } else {
    console.log(results.join('\n'));
  }
}

function mergeFreeText(...parts) {
  const merged = parts
    .map(part => (part || '').toString().trim())
    .filter(Boolean)
    .join(' ');
  return merged || '';
}

function assertCanonicalValue({ label, value, resolver, getClosest, errors }) {
  if (!value && value !== 0) return;
  const resolved = resolver(value);
  if (!resolved || !resolved.value) {
    const suggestions = getClosest ? getClosest(String(value)) : [];
    const suggestionText = suggestions.length > 0 ? ` (closest: ${suggestions.join(', ')})` : '';
    errors.push(`${label} is not canonical: "${value}"${suggestionText}`);
    return;
  }
  if (resolved.isAlias || normalizeToken(value) !== normalizeToken(resolved.value)) {
    errors.push(`${label} must use canonical value "${resolved.value}", not "${value}"`);
  }
}

function normalizeCanaryInput(input, canonical) {
  const appearance = mergeFreeText(input.appearance, input.speciesDescriptor);
  const personality = mergeFreeText(input.personality, input.aboutThem);
  const traitUserDescriptions = input.traitUserDescriptions || {};
  const inclusivityTraits = Array.isArray(input.inclusivityTraits) ? input.inclusivityTraits : [];
  const personalityTraits = Array.isArray(input.personalityTraits) ? input.personalityTraits : [];
  const speciesResolved = canonical.resolveCanonicalSpecies(input.species || '');
  const speciesKey = speciesResolved.value || input.species || '';

  return {
    id: input.id,
    name: input.name,
    age: input.age,
    ageBucket: input.ageBucket,
    species: speciesResolved.value || input.species,
    speciesKey,
    gender: input.gender,
    ethnicity: input.ethnicity,
    personalityTraits,
    personality,
    appearance,
    inclusivityTraits,
    traitUserDescriptions,
    characterSpokenLanguage: input.characterSpokenLanguage,
    readerLanguage: input.readerLanguage,
    expectations: input.expectations || {}
  };
}

function validateCanaryInputs(canaries, canonical) {
  const errors = [];
  const getClosest = (list) => (value) => canonical.getClosestMatches(String(value), list);
  const isHumanLikeSpecies = (value) => {
    return value === 'human' || value === 'superhero';
  };
  canaries.forEach((canary) => {
    const prefix = `[${canary.id}]`;
    assertCanonicalValue({
      label: `${prefix} species`,
      value: canary.species,
      resolver: canonical.resolveCanonicalSpecies,
      getClosest: getClosest(canonical.CANONICAL_DICTIONARIES.species.map(entry => entry.key)),
      errors
    });
    if (canary.gender) {
      assertCanonicalValue({
        label: `${prefix} gender`,
        value: canary.gender,
        resolver: canonical.resolveCanonicalGender,
        getClosest: getClosest(canonical.CANONICAL_DICTIONARIES.genders.map(entry => entry.key)),
        errors
      });
    }
    if (canary.ageBucket) {
      assertCanonicalValue({
        label: `${prefix} ageBucket`,
        value: canary.ageBucket,
        resolver: canonical.resolveCanonicalAgeBucket,
        getClosest: getClosest(canonical.CANONICAL_DICTIONARIES.ageBuckets.map(entry => entry.key)),
        errors
      });
    }
    if (canary.ethnicity && Array.isArray(canary.ethnicity)) {
      const resolvedSpecies = canonical.resolveCanonicalSpecies(canary.species || '').value;
      if (resolvedSpecies && !isHumanLikeSpecies(resolvedSpecies)) {
        errors.push(`${prefix} ethnicity not allowed for species "${resolvedSpecies}"`);
      }
      canary.ethnicity.forEach((entry) => {
        assertCanonicalValue({
          label: `${prefix} ethnicity`,
          value: entry,
          resolver: canonical.resolveCanonicalEthnicity,
          getClosest: getClosest(canonical.CANONICAL_DICTIONARIES.ethnicities.map(item => item.key)),
          errors
        });
      });
    }
    if (canary.personalityTraits && Array.isArray(canary.personalityTraits)) {
      canary.personalityTraits.forEach((entry) => {
        assertCanonicalValue({
          label: `${prefix} personalityTrait`,
          value: entry,
          resolver: canonical.resolveCanonicalPersonalityTrait,
          getClosest: getClosest(canonical.CANONICAL_DICTIONARIES.personalityTraits.map(item => item.key)),
          errors
        });
      });
    }
    if (canary.characterSpokenLanguage) {
      assertCanonicalValue({
        label: `${prefix} characterSpokenLanguage`,
        value: canary.characterSpokenLanguage,
        resolver: canonical.resolveCanonicalLanguage,
        getClosest: getClosest(canonical.CANONICAL_DICTIONARIES.languages.map(item => item.key)),
        errors
      });
    }
    if (canary.readerLanguage) {
      assertCanonicalValue({
        label: `${prefix} readerLanguage`,
        value: canary.readerLanguage,
        resolver: canonical.resolveCanonicalLanguage,
        getClosest: getClosest(canonical.CANONICAL_DICTIONARIES.languages.map(item => item.key)),
        errors
      });
    }
    if (canary.inclusivityTraits && Array.isArray(canary.inclusivityTraits)) {
      canary.inclusivityTraits.forEach((entry) => {
        assertCanonicalValue({
          label: `${prefix} inclusivityTrait`,
          value: entry,
          resolver: canonical.resolveCanonicalInclusivityTrait,
          getClosest: getClosest(canonical.CANONICAL_DICTIONARIES.inclusivityTraits.map(item => item.id)),
          errors
        });
      });
    }
    if (canary.traitUserDescriptions) {
      Object.keys(canary.traitUserDescriptions).forEach((key) => {
        const match = canonical.resolveCanonicalInclusivityTrait(key);
        if (!match.value) {
          const suggestions = canonical.getClosestMatches(key, canonical.CANONICAL_DICTIONARIES.inclusivityTraits.map(item => item.id));
          const suggestionText = suggestions.length > 0 ? ` (closest: ${suggestions.join(', ')})` : '';
          errors.push(`${prefix} traitUserDescriptions key is not canonical: "${key}"${suggestionText}`);
        }
        if (!canary.inclusivityTraits || !canary.inclusivityTraits.includes(key)) {
          errors.push(`${prefix} traitUserDescriptions key "${key}" not in inclusivityTraits`);
        }
      });
    }
  });
  return errors;
}

async function detectAuthPrefix(apiBaseUrl) {
  const candidates = ['/api/v1', '/v1'];
  const probeBody = JSON.stringify({ email: 'probe@example.com', password: 'probe' });
  for (const prefix of candidates) {
    const url = joinUrl(apiBaseUrl, `${prefix}/auth/login`);
    const res = await jsonFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: probeBody
    });
    if (res.status === 404) {
      continue;
    }
    log('Auth prefix detected', { prefix, url, status: res.status });
    return prefix;
  }
  console.error('Unable to detect auth prefix. Both /api/v1 and /v1 returned 404.');
  return '/api/v1';
}

async function connectivityPreflight(apiBaseUrl, envOverride) {
  if (!apiBaseUrl) {
    console.error('Connectivity preflight failed: API_BASE_URL is missing.');
    return false;
  }
  try {
    const url = joinUrl(apiBaseUrl, '/ready');
    const host = new URL(apiBaseUrl).host;
    const inferredEnv = inferEnv(apiBaseUrl);
    const envGuess = envOverride || inferredEnv;
    const res = await fetch(url, { method: 'GET' });
    if (res.status === 404) {
      console.error('Connectivity preflight failed (ready endpoint not found).', {
        env: envGuess,
        inferred_env: inferredEnv,
        url,
        host,
        status: res.status
      });
      console.error('Action items:');
      console.error('- Ensure /ready (or /health/ready) is deployed.');
      console.error('- Re-run after readiness endpoint is live.');
      return false;
    }
    if (res.status >= 500) {
      console.error('Connectivity preflight failed (5xx).', {
        env: envGuess,
        inferred_env: inferredEnv,
        url,
        host,
        status: res.status
      });
      console.error('Action items:');
      console.error('- Confirm API is up (ready endpoint returns 200).');
      console.error('- Check staging deployment readiness.');
      return false;
    }
    log('Connectivity preflight ok', { env: envGuess, inferred_env: inferredEnv, url, host, status: res.status });
    return true;
  } catch (err) {
    const message = err?.message || String(err);
    const host = (() => { try { return new URL(apiBaseUrl).host; } catch { return 'unknown-host'; } })();
    const inferredEnv = inferEnv(apiBaseUrl);
    const envGuess = envOverride || inferredEnv;
    console.error('Connectivity preflight failed.', { apiBaseUrl, host, env: envGuess, inferred_env: inferredEnv, error: message });
    if (/ENOTFOUND/i.test(message)) {
      console.error(`DNS lookup failed for API host: ${host}`);
      console.error('Action items:');
      console.error(`- run: nslookup ${host}`);
      console.error(`- run: dig ${host}`);
      console.error(`- run: curl -v https://${host}/ready`);
      console.error('- Verify the correct staging host/domain.');
      console.error('- Check VPN or private DNS requirements.');
      console.error('- Try an alternate known staging host if available.');
      console.error('- Re-run from a network with access to staging.');
    } else {
      console.error('Action items:');
      console.error('- Confirm API is reachable (health/HTTP).');
      console.error('- Verify networking/firewall/VPN to staging.');
      console.error('- Retry or try from a different network.');
    }
    return false;
  }
}

async function persistSsmSecret(ssm, path, value) {
  if (!ssm || !path || !value) return;
  const command = new PutParameterCommand({
    Name: path,
    Value: value,
    Type: 'SecureString',
    Overwrite: true
  });
  await ssm.send(command);
  log(`Persisted secret to SSM`, { path });
}

async function resolveSecretWithSource({ name, envVar, ssmPaths, ssm }) {
  const envVal = process.env[envVar];
  if (envVal) {
    return { value: envVal, source: `env ${envVar}` };
  }
  if (ssm && Array.isArray(ssmPaths)) {
    for (const path of ssmPaths) {
      try {
        const value = await getSSMParam(ssm, path);
        if (value) {
          return { value, source: `ssm ${path}` };
        }
      } catch {
        // ignore and continue
      }
    }
  }
  return { value: null, source: null };
}

const PRODUCTION_API_HOSTS = [
  'api.storytailor.dev',
  'api.storytailor.com',
  'storytailor.com',
  'storyintelligence.dev'
];
const STAGING_API_HOSTS = [
  'staging-api.storytailor.dev'
];

function isProductionApi(baseUrl) {
  try {
    const host = new URL(baseUrl).host;
    return PRODUCTION_API_HOSTS.includes(host);
  } catch {
    return false;
  }
}

function inferEnv(apiBaseUrl) {
  if (!apiBaseUrl) return 'production';
  try {
    const parsed = new URL(apiBaseUrl);
    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (STAGING_API_HOSTS.includes(host)) return 'staging';
    if (PRODUCTION_API_HOSTS.includes(host)) return 'production';
    if (path.includes('/staging') || host.includes('staging')) return 'staging';
  } catch {
    // ignore
  }
  return 'production';
}

function isExplicitHumanSpecies(speciesKey, speciesDescriptor) {
  const key = String(speciesKey || '').toLowerCase()
  const descriptor = String(speciesDescriptor || '').toLowerCase()
  if (key === 'human') return true
  // Assumption: superhero counts as human only when explicitly stated in species text.
  if (key === 'superhero') return /\bhuman\b/.test(descriptor)
  return false
}

function trimValidation(validation) {
  if (!validation) return null;
  return {
    rating: validation.rating,
    is_child_safe: validation.is_child_safe,
    trait_visibility_pass: validation.trait_visibility_pass ?? null,
    missing_traits: validation.missing_traits || [],
    limbs: validation.limbs || null,
    species_anatomy_confirmed: validation.species_anatomy_confirmed ?? null,
    support_world_fit: validation.support_world_fit || null,
    nonhuman_human_default: validation.nonhuman_human_default ?? null,
    nonhuman_human_default_confidence: validation.nonhuman_human_default_confidence ?? null,
    nonhuman_human_default_reason: validation.nonhuman_human_default_reason ?? null
  };
}

function trimAttemptValidation(validation) {
  if (!validation) return null;
  return {
    rating: validation.rating,
    trait_visibility_pass: validation.trait_visibility_pass ?? null,
    missing_traits: validation.missing_traits || [],
    limbs: validation.limbs || null,
    species_anatomy_confirmed: validation.species_anatomy_confirmed ?? null,
    support_world_fit: validation.support_world_fit || null,
    nonhuman_human_default: validation.nonhuman_human_default ?? null,
    nonhuman_human_default_confidence: validation.nonhuman_human_default_confidence ?? null,
    nonhuman_human_default_reason: validation.nonhuman_human_default_reason ?? null
  };
}

function buildPublicCharacterSnapshot(character) {
  const traits = character?.traits || {};
  const speciesKey = character?.speciesKey
    ?? character?.species_key
    ?? traits?.speciesKey
    ?? traits?.species_key
    ?? traits?.species
    ?? null;
  const speciesDescriptor = character?.speciesDescriptor
    ?? character?.species_descriptor
    ?? traits?.speciesDescriptor
    ?? traits?.species_descriptor
    ?? null;
  const speciesLabel = character?.species
    ?? traits?.species
    ?? speciesDescriptor
    ?? speciesKey
    ?? null;
  const age = character?.age_raw ?? traits?.age ?? character?.age ?? null;
  const aboutThem = character?.aboutThem
    ?? character?.about_them
    ?? traits?.aboutThem
    ?? traits?.about_them
    ?? traits?.backstory
    ?? null;
  const personality = Array.isArray(character?.personality)
    ? character.personality
    : (Array.isArray(traits?.personality) ? traits.personality : null);
  const inclusivityTraits = Array.isArray(character?.inclusivityTraits)
    ? character.inclusivityTraits
    : (Array.isArray(traits?.inclusivityTraits) ? traits.inclusivityTraits : null);
  const traitUserDescriptions = character?.traitUserDescriptions
    ?? traits?.traitUserDescriptions
    ?? null;

  return {
    id: character?.id || null,
    name: character?.name || null,
    age: typeof age === 'number' && Number.isFinite(age) ? age : (age ? Number(age) : null),
    species_key: speciesKey,
    species_label: speciesLabel,
    species_descriptor: speciesDescriptor,
    gender: character?.gender ?? traits?.gender ?? null,
    pronouns: character?.pronouns ?? traits?.pronouns ?? null,
    about_them: aboutThem,
    personality,
    appearance: character?.appearance ?? traits?.appearance ?? null,
    inclusivity_traits: inclusivityTraits,
    trait_user_descriptions: traitUserDescriptions,
    headshot_url: character?.headshot_url || null,
    bodyshot_url: character?.bodyshot_url || null,
    character_state: character?.character_state || null,
    headshot_status: character?.headshot_status || null,
    bodyshot_status: character?.bodyshot_status || null,
    visible_to_user: character?.visible_to_user ?? null,
    user_banner: character?.user_banner ?? null,
    created_at: character?.created_at || null,
    updated_at: character?.updated_at || null
  };
}

let reviewHeaderMeta = {
  windowStart: new Date().toISOString(),
  env: null,
  envInferred: null,
  contentAgentLambda: null,
  contentAgentSource: null,
  mode: null,
  runNonce: null,
  apiBaseUrl: null,
  authBasePath: null
};

function buildReviewHeader() {
  const meta = reviewHeaderMeta || {};
  const lines = [
    '# Canary Review Pack (latest run window)',
    `- window_start: ${meta.windowStart || new Date().toISOString()}`,
    '- window_end: ',
    '- total_runs: ',
    `- env: ${meta.env || 'unknown'}`,
    `- env_inferred: ${meta.envInferred || 'unknown'}`,
    `- mode: ${meta.mode || 'unknown'}`,
    `- run_nonce: ${meta.runNonce || 'unknown'}`,
    `- api_base_url: ${meta.apiBaseUrl || 'unknown'}`,
    `- auth_base_path: ${meta.authBasePath || 'unknown'}`,
    `- snapshot_base_path: ${meta.snapshotBasePath || 'unknown'}`,
    `- content_agent_lambda: ${meta.contentAgentLambda || 'unknown'}`,
    `- content_agent_source: ${meta.contentAgentSource || 'unknown'}`,
    ''
  ];
  return `${lines.join('\n')}\n`;
}

function setReviewHeaderMeta(meta = {}) {
  reviewHeaderMeta = {
    ...reviewHeaderMeta,
    ...meta,
    windowStart: meta.windowStart || reviewHeaderMeta.windowStart || new Date().toISOString()
  };
}

function ensureReviewFiles() {
  const header = buildReviewHeader();
  if (!fs.existsSync(OUTPUT_REVIEW_MARKDOWN)) {
    fs.writeFileSync(OUTPUT_REVIEW_MARKDOWN, header);
  }
  if (!fs.existsSync(OUTPUT_REVIEW_MARKDOWN_RUN)) {
    fs.writeFileSync(OUTPUT_REVIEW_MARKDOWN_RUN, header);
  }
}

function resetReviewPacks(meta = {}) {
  setReviewHeaderMeta(meta);
  const header = buildReviewHeader();
  fs.writeFileSync(OUTPUT_REVIEW_MARKDOWN, header);
  fs.writeFileSync(OUTPUT_REVIEW_MARKDOWN_RUN, header);
}

const SECRET_PATTERNS = [
  /SUPABASE/i,
  /JWT/i,
  /OPENAI/i,
  /SECRET/i,
  /KEY/i
];

function scanForSecrets(dir, findings) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'extract' || entry.name === 'node_modules') {
        return;
      }
      scanForSecrets(fullPath, findings);
      return;
    }
    if (!entry.isFile()) return;
    if (!entry.name.endsWith('.json')) return;
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (SECRET_PATTERNS.some(pattern => pattern.test(content))) {
        findings.push(fullPath);
      }
    } catch (err) {
      console.warn(`Secret scan skipped for ${fullPath}: ${err.message || err}`);
    }
  });
}

function assertNoRecoverySecrets() {
  const stagingRecoveryDir = path.join(__dirname, '..', 'recovery', 'deployed', 'staging');
  const findings = [];
  scanForSecrets(stagingRecoveryDir, findings);
  if (findings.length > 0) {
    console.error('Secret scan failed: recovery snapshots contain secret-looking patterns.');
    findings.forEach(file => console.error(`- ${file}`));
    console.error('Remove or redact these snapshots before running canaries.');
    process.exit(1);
  }
}

const REQUIRED_CHARACTER_COLUMNS = [
  { name: 'character_id', type: 'uuid' },
  { name: 'age_raw', type: 'integer' },
  { name: 'age_safe_language', type: 'text' },
  { name: 'species', type: 'text' },
  { name: 'speciesKey', type: 'text' },
  { name: 'speciesDescriptor', type: 'text' },
  { name: 'ethnicity', type: 'jsonb' },
  { name: 'gender', type: 'text' },
  { name: 'personality', type: 'jsonb' },
  { name: 'appearance', type: 'text' },
  { name: 'inclusivityTraits', type: 'jsonb' },
  { name: 'traitUserDescriptions', type: 'jsonb' },
  { name: 'headshot_status', type: 'text' },
  { name: 'bodyshot_status', type: 'text' },
  { name: 'character_state', type: 'text' },
  { name: 'visible_to_user', type: 'boolean' },
  { name: 'generation_timestamps', type: 'jsonb' },
  { name: 'traits', type: 'jsonb' },
  { name: 'worldMaterialHint', type: 'text' },
  { name: 'worldPhysicsHint', type: 'text' },
  { name: 'back_story', type: 'text' },
  { name: 'origin', type: 'text' },
  { name: 'hairColor', type: 'text' },
  { name: 'hairTexture', type: 'text' },
  { name: 'hairLength', type: 'text' },
  { name: 'eyeColor', type: 'text' },
  { name: 'skinTone', type: 'text' },
  { name: 'surfaceMaterial', type: 'text' },
  { name: 'surfaceLogic', type: 'text' },
  { name: 'clothing', type: 'text' },
  { name: 'clothingColors', type: 'jsonb' },
  { name: 'accessories', type: 'jsonb' },
  { name: 'signatureColors', type: 'jsonb' },
  { name: 'signatureProps', type: 'jsonb' },
  { name: 'styleNotes', type: 'text' },
  { name: 'values', type: 'jsonb' },
  { name: 'strengths', type: 'jsonb' },
  { name: 'fears', type: 'jsonb' },
  { name: 'joyTriggers', type: 'jsonb' },
  { name: 'comfortSignals', type: 'jsonb' },
  { name: 'catchphrase', type: 'text' },
  { name: 'aboutThem', type: 'text' },
  { name: 'appearanceSummary', type: 'text' },
  { name: 'headshot_prompt', type: 'text' },
  { name: 'bodyshot_prompt', type: 'text' },
  { name: 'prompt_hashes', type: 'jsonb' },
  { name: 'global_style_hash', type: 'text' },
  { name: 'applied_inclusivity_traits', type: 'jsonb' },
  { name: 'excluded_traits_headshot', type: 'jsonb' },
  { name: 'excluded_traits_bodyshot', type: 'jsonb' },
  { name: 'image_model_used', type: 'text' },
  { name: 'headshot_url', type: 'text' },
  { name: 'bodyshot_url', type: 'text' },
  { name: 'headshot_trace_url', type: 'text' },
  { name: 'bodyshot_trace_url', type: 'text' },
  { name: 'current_headshot_attempt_id', type: 'uuid' },
  { name: 'current_bodyshot_attempt_id', type: 'uuid' },
  { name: 'last_good_headshot_attempt_id', type: 'uuid' },
  { name: 'last_good_bodyshot_attempt_id', type: 'uuid' },
  { name: 'headshot_fail_url', type: 'text' },
  { name: 'bodyshot_fail_url', type: 'text' },
  { name: 'failure_codes', type: 'jsonb' },
  { name: 'failure_summary', type: 'text' },
  { name: 'admin_review_required', type: 'boolean' },
  { name: 'retries_count', type: 'integer' },
  { name: 'last_failure_at', type: 'timestamptz' },
  { name: 'reference_images', type: 'jsonb' }
];

const SQL_RESERVED = new Set(['values']);

function sqlIdentifier(name) {
  return /[A-Z]/.test(name) || SQL_RESERVED.has(name) ? `"${name}"` : name;
}

async function assertSchemaParity(supabase) {
  const missing = [];
  for (const column of REQUIRED_CHARACTER_COLUMNS) {
    const { error } = await supabase
      .from('characters')
      .select(column.name)
      .limit(1);
    if (error) {
      const message = error.message || '';
      if (/column/i.test(message) && /does not exist/i.test(message)) {
        missing.push(column);
        continue;
      }
      console.error(`Schema parity preflight failed while checking ${column.name}: ${message}`);
      process.exit(1);
    }
  }
  if (missing.length === 0) return;

  console.error('Schema parity preflight failed: missing columns in characters table.');
  missing.forEach(column => console.error(`- ${column.name}`));
  const sql = missing
    .map(column => `ALTER TABLE characters ADD COLUMN IF NOT EXISTS ${sqlIdentifier(column.name)} ${column.type};`)
    .join('\n');
  console.error('\nApply SQL (staging) then rerun canaries:\n');
  console.error(sql);
  process.exit(1);
}

function appendAttemptReviewPack(characterId, attempts, publicSnapshot, publicSnapshotReceipt) {
  ensureReviewFiles();
  if (!Array.isArray(attempts) || attempts.length === 0) {
    const entry = {
      character_id: characterId,
      asset_type: null,
      attempt_index: null,
      status: 'no_attempts',
      image_url: null,
      fail_image_url: null,
      trace_url: null,
      openai_request_id: null,
      failure_codes: [],
      failure_reason: null,
      validation_summary: null,
      public_character_snapshot: publicSnapshot || null,
      public_character_snapshot_receipt: publicSnapshotReceipt || null
    };
    fs.appendFileSync(
      OUTPUT_REVIEW_MARKDOWN,
      `## ${characterId} / no_attempts\n\n` +
      `Status: no_attempts\n\n` +
      "```json\n" +
      `${JSON.stringify(entry, null, 2)}\n` +
      "```\n\n"
    );
    fs.appendFileSync(
      OUTPUT_REVIEW_MARKDOWN_RUN,
      `## ${characterId} / no_attempts\n\n` +
      `Status: no_attempts\n\n` +
      "```json\n" +
      `${JSON.stringify(entry, null, 2)}\n` +
      "```\n\n"
    );
    return;
  }
  const sorted = attempts.slice().sort((a, b) => {
    const aIndex = a?.attempt_index || 0;
    const bIndex = b?.attempt_index || 0;
    return aIndex - bIndex;
  });
  sorted.forEach((attempt) => {
    const entry = {
      character_id: characterId,
      asset_type: attempt.asset_type || null,
      attempt_index: attempt.attempt_index || null,
      status: attempt.status || null,
      image_url: attempt.image_url || null,
      fail_image_url: attempt.fail_image_url || null,
      trace_url: attempt.trace_url || null,
      openai_request_id: attempt.openai_request_id || null,
      failure_codes: attempt.failure_codes || [],
      failure_reason: attempt.failure_reason || null,
      validation_summary: trimAttemptValidation(attempt.validation_summary),
      public_character_snapshot: publicSnapshot || null,
      public_character_snapshot_receipt: publicSnapshotReceipt || null
    };
    fs.appendFileSync(OUTPUT_ATTEMPTS_JSONL, `${JSON.stringify(entry)}\n`);
    fs.appendFileSync(
      OUTPUT_REVIEW_MARKDOWN,
      `## ${characterId} / ${entry.asset_type} / attempt ${entry.attempt_index}\n\n` +
      `Status: ${entry.status}\n\n` +
      "```json\n" +
      `${JSON.stringify(entry, null, 2)}\n` +
      "```\n\n"
    );
    fs.appendFileSync(
      OUTPUT_REVIEW_MARKDOWN_RUN,
      `## ${characterId} / ${entry.asset_type} / attempt ${entry.attempt_index}\n\n` +
      `Status: ${entry.status}\n\n` +
      "```json\n" +
      `${JSON.stringify(entry, null, 2)}\n` +
      "```\n\n"
    );
  });
}

const MUST_HAVE_CODES = new Set([
  'safety',
  'headshot_transparent_background',
  'wheelchair_not_present',
  'limb_difference_missing_not_present',
  'missing_traits'
]);

const SHOULD_HAVE_CODES = new Set([
  'nonhuman_drift_human_default',
  'nonhuman_drift_human_default_terminal',
  'elemental_embodiment_missing',
  'elemental_embodiment_unconfirmed',
  'alien_nonhuman_cues_missing',
  'alien_nonhuman_cues_unconfirmed',
  'species_anatomy_unconfirmed',
  'traits_unconfirmed',
  'world_native_support_missing',
  'wheelchair_unconfirmed',
  'style_drift'
]);

function truncateText(value, maxLength = 800) {
  if (!value || typeof value !== 'string') return null;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}… [truncated]`;
}

function buildEnrichmentSummary(invocationData, updatedRow) {
  const story = invocationData?.snapshots?.after_enrichment?.traits?.story
    || updatedRow?.traits?.story
    || null;
  const derived = invocationData?.snapshots?.after_enrichment?.traits?.derived
    || updatedRow?.traits?.derived
    || null;
  const storyConstants = story?.story_constants || story?.storyConstants || {};
  return {
    story: story ? {
      back_story: story.back_story || null,
      origin: story.origin || null,
      recurring_setting: storyConstants.recurring_setting || story.recurring_setting || null,
      scene_seed: storyConstants.scene_seed || story.scene_seed || null,
      motif_words: storyConstants.motif_words || story.motif_words || null,
      tone_notes: story.tone_notes || story.toneNotes || null
    } : null,
    derived: derived ? {
      appearanceSummary: derived.appearanceSummary || null,
      aboutThem: derived.aboutThem || null,
      worldMaterialHint: derived.worldMaterialHint || null,
      worldPhysicsHint: derived.worldPhysicsHint || null,
      styleNotes: derived.styleNotes || null,
      signatureProps: derived.signatureProps || null
    } : null
  };
}

function buildPromptExcerpt(invocationData, updatedRow) {
  const prompts = invocationData?.prompts || null;
  const headshot = prompts?.headshot || updatedRow?.headshot_prompt || null;
  const bodyshot = prompts?.bodyshot || updatedRow?.bodyshot_prompt || null;
  return {
    headshot: truncateText(headshot),
    bodyshot: truncateText(bodyshot)
  };
}

function buildValidatorFireRate(attempts) {
  const relevant = Array.isArray(attempts)
    ? attempts.filter(entry => entry?.asset_type === 'headshot' || entry?.asset_type === 'bodyshot')
    : [];
  let fired = 0;
  let mustHaveCount = 0;
  let shouldHaveCount = 0;
  const byCode = {};
  relevant.forEach((attempt) => {
    const codes = Array.isArray(attempt?.failure_codes) ? attempt.failure_codes : [];
    if (codes.length === 0) return;
    fired += 1;
    codes.forEach((code) => {
      byCode[code] = (byCode[code] || 0) + 1;
      if (MUST_HAVE_CODES.has(code)) {
        mustHaveCount += 1;
      } else if (SHOULD_HAVE_CODES.has(code)) {
        shouldHaveCount += 1;
      } else {
        shouldHaveCount += 1;
      }
    });
  });
  const total = relevant.length;
  return {
    total_attempts: total,
    fired_attempts: fired,
    fire_rate: total > 0 ? Number((fired / total).toFixed(3)) : 0,
    must_have_count: mustHaveCount,
    should_have_count: shouldHaveCount,
    by_code: byCode
  };
}

function appendRunReviewPack(summary) {
  ensureReviewFiles();
  const entry = summary || {};
  const title = entry.character_id ? `${entry.character_id} / run_summary` : 'run_summary';
  const payload = `## ${title}\n\n` +
    '```json\n' +
    `${JSON.stringify(entry, null, 2)}\n` +
    '```\n\n';
  fs.appendFileSync(OUTPUT_REVIEW_MARKDOWN, payload);
  fs.appendFileSync(OUTPUT_REVIEW_MARKDOWN_RUN, payload);
}

async function createCharacterRow(supabase, input, config) {
  const payload = {
    library_id: config.testLibraryId,
    creator_user_id: config.testUserId,
    name: input.name,
    traits: {
      name: input.name,
      age: input.age,
      ageBucket: input.ageBucket,
      species: input.species,
      appearance: input.appearance,
      personality: input.personality,
      personalityTraits: input.personalityTraits,
      gender: input.gender,
      ethnicity: input.ethnicity,
      characterSpokenLanguage: input.characterSpokenLanguage,
      readerLanguage: input.readerLanguage,
      traitUserDescriptions: input.traitUserDescriptions,
      inclusivityTraits: input.inclusivityTraits || [],
      canary_nonce: config.runNonce
    }
  };

  const { data, error } = await supabase
    .from('characters')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(`Character insert failed: ${error.message}`);
  }

  return data;
}

async function invokeCompleteCharacterCreation(input, config) {
  const traits = {
    name: input.name,
    age: input.age,
    ageBucket: input.ageBucket,
    species: input.species,
    appearance: input.appearance,
    personality: input.personality,
    personalityTraits: input.personalityTraits,
    gender: input.gender,
    ethnicity: input.ethnicity,
    characterSpokenLanguage: input.characterSpokenLanguage,
    readerLanguage: input.readerLanguage,
    traitUserDescriptions: input.traitUserDescriptions,
    inclusivityTraits: input.inclusivityTraits || [],
    canary_nonce: config.runNonce
  };

  const payload = {
    action: 'complete_character_creation_with_visuals',
    data: {
      userId: config.testUserId,
      libraryId: config.testLibraryId,
      traits,
      canary: true
    }
  };

  const command = new InvokeCommand({
    FunctionName: config.contentAgentLambda,
    Payload: JSON.stringify(payload)
  });

  const start = Date.now();
  const response = await config.lambda.send(command);
  const durationMs = Date.now() - start;
  const parsed = JSON.parse(new TextDecoder().decode(response.Payload));
  const body = parsed?.body && typeof parsed.body === 'string' ? JSON.parse(parsed.body) : parsed;
  const data = body?.data || body?.result?.data || body?.body?.data || null;
  const images = [];
  if (data?.headshotUrl) {
    images.push({
      type: 'headshot',
      url: data.headshotUrl,
      traceUrl: data.traceUrls?.headshot || null,
      promptHash: data.promptHashes?.headshot || null
    });
  }
  if (data?.bodyshotUrl) {
    images.push({
      type: 'bodyshot',
      url: data.bodyshotUrl,
      traceUrl: data.traceUrls?.bodyshot || null,
      promptHash: data.promptHashes?.bodyshot || null
    });
  }

  return {
    durationMs,
    statusCode: parsed?.statusCode || null,
    functionError: response.FunctionError || null,
    responseBody: {
      ...body,
      images
    }
  };
}

async function invokeGenerateCharacterArt(character, config) {
  const payload = {
    action: 'generate_character_art',
    characterId: character.id,
    characterName: character.name,
    userId: config.testUserId,
    characterTraits: character.traits,
    ethnicity: character.traits.ethnicity,
    inclusivityTraits: character.traits.inclusivityTraits,
    generationNonce: config.runNonce
  };

  const command = new InvokeCommand({
    FunctionName: config.contentAgentLambda,
    Payload: JSON.stringify(payload)
  });

  const start = Date.now();
  const response = await config.lambda.send(command);
  const durationMs = Date.now() - start;
  const parsed = JSON.parse(new TextDecoder().decode(response.Payload));
  const body = parsed?.body && typeof parsed.body === 'string' ? JSON.parse(parsed.body) : parsed;

  return {
    durationMs,
    statusCode: parsed?.statusCode || null,
    functionError: response.FunctionError || null,
    responseBody: body
  };
}

async function invokeEditFix({ characterId, attemptId, assetType, config }) {
  const payload = {
    action: 'edit_character_image',
    characterId,
    attemptId,
    assetType
  };
  const command = new InvokeCommand({
    FunctionName: config.contentAgentLambda,
    InvocationType: 'Event',
    Payload: JSON.stringify(payload)
  });
  await config.lambda.send(command);
}

async function fetchTrace(traceUrl) {
  if (!traceUrl) return null;
  try {
    const res = await fetch(traceUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCharacterRow(supabase, id) {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    throw new Error(`Character fetch failed: ${error.message}`);
  }
  return data;
}

async function fetchAttempts(supabase, id) {
  const { data, error } = await supabase
    .from('character_image_attempts')
    .select('*')
    .eq('character_id', id)
    .order('created_at', { ascending: false })
  if (error) {
    throw new Error(`Attempt fetch failed: ${error.message}`);
  }
  return Array.isArray(data) ? data : [];
}

async function fetchPublicSnapshotReceipt({ apiBaseUrl, authBasePath, snapshotBasePath, characterId, accessToken }) {
  const primaryPrefix = snapshotBasePath || authBasePath || '/api/v1';
  const fallbackPrefix = authBasePath || '/api/v1';
  const prefixes = [primaryPrefix];
  if (fallbackPrefix && fallbackPrefix !== primaryPrefix) {
    prefixes.push(fallbackPrefix);
  }
  let last = null;
  for (const prefix of prefixes) {
    const url = joinUrl(apiBaseUrl, `${prefix}/characters/${characterId}`);
    const res = await jsonFetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    last = { url, status: res.status, ok: res.ok, data: res.data, prefix };
    if (res.status !== 404) {
      return last;
    }
  }
  return last || { url: null, status: null, ok: false, data: { error: 'Snapshot fetch failed' }, prefix: primaryPrefix };
}

function containsTposeFields(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (Array.isArray(payload)) return payload.some(containsTposeFields);
  return Object.keys(payload).some((key) => {
    if (key.toLowerCase().startsWith('tpose')) return true;
    return containsTposeFields(payload[key]);
  });
}

async function waitForEditAttempts({ supabase, characterId, maxWaitMs = 60000, intervalMs = 5000 }) {
  const started = Date.now();
  let attempts = await fetchAttempts(supabase, characterId);
  let editAttempts = attempts.filter(entry => entry?.fix_of_attempt_id);
  while (editAttempts.length === 0 && Date.now() - started < maxWaitMs) {
    await sleep(intervalMs);
    attempts = await fetchAttempts(supabase, characterId);
    editAttempts = attempts.filter(entry => entry?.fix_of_attempt_id);
  }
  return attempts;
}

async function runCanary(input, config, canonical) {
  const runId = `canary-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const startedAt = new Date().toISOString();
  const instrumentationErrors = [];
  const hardFailErrors = [];
  const softIssues = [];

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const normalizedInput = normalizeCanaryInput(input, canonical);
  let invocation = null;
  let invocationData = null;
  let character = null;
  if (config.mode === 'component') {
    const createdRow = await createCharacterRow(supabase, normalizedInput, config);
    character = createdRow;
    invocation = await invokeGenerateCharacterArt(character, config);
    invocationData = invocation.responseBody?.data || invocation.responseBody?.result?.data || null;
    log(`Created character ${character.id} via component flow for ${normalizedInput.id}`);
  } else {
    invocation = await invokeCompleteCharacterCreation(normalizedInput, config);
    invocationData = invocation.responseBody?.data || invocation.responseBody?.result?.data || null;
    const characterId = invocationData?.characterId || invocation.responseBody?.characterId || null;
    if (!characterId) {
      console.error('Pipeline response missing characterId', {
        statusCode: invocation.statusCode,
        functionError: invocation.functionError,
        responseBody: invocation.responseBody
      });
      throw new Error(`Pipeline did not return characterId for ${normalizedInput.id}`);
    }
    character = { id: characterId, name: normalizedInput.name };
    log(`Created character ${character.id} via pipeline for ${normalizedInput.id}`);
  }

  if (invocation.functionError) {
    log(`Lambda function error for ${normalizedInput.id}`, { functionError: invocation.functionError });
  }

  let publicSnapshotReceipt = {
    url: null,
    status: null,
    ok: false,
    data: { error: 'Missing auth access token' }
  };
  if (!config.authAccessToken) {
    instrumentationErrors.push('Missing auth access token for public snapshot receipt');
  } else {
    publicSnapshotReceipt = await fetchPublicSnapshotReceipt({
    apiBaseUrl: config.apiBaseUrl,
    authBasePath: config.authBasePath,
    snapshotBasePath: config.snapshotBasePath,
      characterId: character.id,
    accessToken: config.authAccessToken
    });
  }
  if (!publicSnapshotReceipt.ok) {
    const tokenInfo = config.authTokenInfo || {};
    const receiptError = {
      error: 'AUTH_RECEIPT_FAILED',
      status: publicSnapshotReceipt.status,
      url: publicSnapshotReceipt.url,
      tokenType: tokenInfo.tokenType || 'unknown',
      tokenIssuer: tokenInfo.issuer || 'unknown',
      authBasePath: config.authBasePath
    };
    instrumentationErrors.push(`Public snapshot receipt failed: ${JSON.stringify(receiptError)}`);
  }
  if (publicSnapshotReceipt?.ok && containsTposeFields(publicSnapshotReceipt.data)) {
    instrumentationErrors.push('Public snapshot response contains tpose fields');
  }

  const updated = await fetchCharacterRow(supabase, character.id);
  let attempts = await fetchAttempts(supabase, character.id);
  const publicSnapshot = buildPublicCharacterSnapshot(updated);
  const receiptFailure = !publicSnapshotReceipt.ok;
  let bodyshotAttempts = attempts.filter(entry => entry?.asset_type === 'bodyshot');
  let editAttempts = attempts.filter(entry => entry?.fix_of_attempt_id);
  let latestHeadshotAttempt = attempts
    .filter(entry => entry?.asset_type === 'headshot')
    .sort((a, b) => (a?.attempt_index || 0) - (b?.attempt_index || 0))
    .slice(-1)[0];
  let latestBodyshotAttempt = attempts
    .filter(entry => entry?.asset_type === 'bodyshot')
    .sort((a, b) => (a?.attempt_index || 0) - (b?.attempt_index || 0))
    .slice(-1)[0];
  const referenceImages = Array.isArray(updated.reference_images) ? updated.reference_images : [];
  const dbHeadshot = referenceImages.find(img => img?.type === 'headshot') || null;
  const dbBodyshot = referenceImages.find(img => img?.type === 'bodyshot') || null;
  const headshotTraceUrl = dbHeadshot?.traceUrl || updated.headshot_trace_url;
  const bodyshotTraceUrl = dbBodyshot?.traceUrl || updated.bodyshot_trace_url;
  const resolvedHeadshotUrl = dbHeadshot?.url || updated.headshot_url || null;
  const resolvedBodyshotUrl = dbBodyshot?.url || updated.bodyshot_url || null;
  const resolvedHeadshotTraceUrl = dbHeadshot?.traceUrl || updated.headshot_trace_url || null;
  const resolvedBodyshotTraceUrl = dbBodyshot?.traceUrl || updated.bodyshot_trace_url || null;
  const headshotTrace = await fetchTrace(headshotTraceUrl);
  const bodyshotTrace = await fetchTrace(bodyshotTraceUrl);

  const returnedImages = Array.isArray(invocation.responseBody?.images)
    ? invocation.responseBody.images
    : (Array.isArray(invocation.responseBody?.data?.images) ? invocation.responseBody.data.images : []);
  const returnedHeadshot = returnedImages.find(img => img?.type === 'headshot') || null;
  const returnedBodyshot = returnedImages.find(img => img?.type === 'bodyshot') || null;
  const headshotValidation = headshotTrace?.validation || null;
  const bodyshotValidation = bodyshotTrace?.validation || null;
  const expectations = normalizedInput.expectations || {};
  const retryPending = updated.character_state === 'needs_retry';
  const speciesKey = normalizedInput.speciesKey || updated?.species_key || updated?.speciesKey || updated?.traits?.speciesKey || updated?.traits?.species || ''
  const speciesDescriptor = updated?.species_descriptor || updated?.speciesDescriptor || updated?.traits?.speciesDescriptor || ''
  const nonhumanSpecies = !isExplicitHumanSpecies(speciesKey, speciesDescriptor)
  const headshotFailureCodes = Array.isArray(latestHeadshotAttempt?.failure_codes)
    ? latestHeadshotAttempt.failure_codes
    : []
  const bodyshotFailureCodes = Array.isArray(latestBodyshotAttempt?.failure_codes)
    ? latestBodyshotAttempt.failure_codes
    : []
  const headshotEditCodes = ['nonhuman_drift_human_default']
  const bodyshotEditCodes = [
    'nonhuman_drift_human_default',
    'species_anatomy_unconfirmed',
    'elemental_embodiment_missing',
    'missing_traits',
    'wheelchair_not_present',
    'limb_difference_missing_not_present',
    'wheelchair_unconfirmed',
    'world_native_support_missing'
  ]
  const headshotNeedsEdit = nonhumanSpecies && headshotFailureCodes.some(code => headshotEditCodes.includes(code))
  const bodyshotSafetyFail = bodyshotFailureCodes.includes('safety')
  const bodyshotNeedsEdit = !bodyshotSafetyFail && bodyshotFailureCodes.some(code => bodyshotEditCodes.includes(code))

  const editByAsset = new Map()
  editAttempts.forEach(entry => {
    if (entry?.asset_type) editByAsset.set(entry.asset_type, entry)
  })

  const editTargets = []
  if (headshotNeedsEdit && !editByAsset.get('headshot') && latestHeadshotAttempt?.id) {
    editTargets.push({ assetType: 'headshot', attemptId: latestHeadshotAttempt.id })
  }
  if (bodyshotNeedsEdit && !editByAsset.get('bodyshot') && latestBodyshotAttempt?.id) {
    editTargets.push({ assetType: 'bodyshot', attemptId: latestBodyshotAttempt.id })
  }

  if (editTargets.length > 0) {
    for (const target of editTargets) {
      await invokeEditFix({ characterId: character.id, attemptId: target.attemptId, assetType: target.assetType, config });
    }
    attempts = await waitForEditAttempts({ supabase, characterId: character.id, maxWaitMs: 180000, intervalMs: 5000 });
    bodyshotAttempts = attempts.filter(entry => entry?.asset_type === 'bodyshot');
    editAttempts = attempts.filter(entry => entry?.fix_of_attempt_id);
    latestHeadshotAttempt = attempts
      .filter(entry => entry?.asset_type === 'headshot')
      .sort((a, b) => (a?.attempt_index || 0) - (b?.attempt_index || 0))
      .slice(-1)[0];
    latestBodyshotAttempt = attempts
      .filter(entry => entry?.asset_type === 'bodyshot')
      .sort((a, b) => (a?.attempt_index || 0) - (b?.attempt_index || 0))
      .slice(-1)[0];
  }

  const bodyshotEditRequired = !bodyshotSafetyFail && bodyshotFailureCodes.some(code => bodyshotEditCodes.includes(code));
  if (bodyshotEditRequired && !editAttempts.some(entry => entry?.asset_type === 'bodyshot')) {
    instrumentationErrors.push('Bodyshot drift code present without edit attempt (pipeline bug)');
  }

  // Assertions
  assertCondition(config.publicAssetHosts.length > 0, 'PUBLIC_ASSET_HOSTS is required', instrumentationErrors);
  const persistedHeadshotUrl = dbHeadshot?.url || updated.headshot_url;
  const persistedBodyshotUrl = dbBodyshot?.url || updated.bodyshot_url;
  if (!persistedHeadshotUrl) {
    instrumentationErrors.push('headshot_url is missing');
  } else {
    assertUrl(persistedHeadshotUrl, 'headshot_url', instrumentationErrors, config.publicAssetHosts);
  }
  if (!persistedBodyshotUrl) {
    instrumentationErrors.push('bodyshot_url is missing');
  } else {
    assertUrl(persistedBodyshotUrl, 'bodyshot_url', instrumentationErrors, config.publicAssetHosts);
  }
  if (latestHeadshotAttempt) {
    assertCondition(!!latestHeadshotAttempt.trace_url, 'Headshot attempt missing trace_url', instrumentationErrors);
    assertCondition(!!latestHeadshotAttempt.validation_summary || latestHeadshotAttempt.status === 'hard_fail', 'Headshot attempt missing validation_summary', instrumentationErrors);
  }
  if (latestBodyshotAttempt) {
    assertCondition(!!latestBodyshotAttempt.trace_url, 'Bodyshot attempt missing trace_url', instrumentationErrors);
    assertCondition(!!latestBodyshotAttempt.validation_summary || latestBodyshotAttempt.status === 'hard_fail', 'Bodyshot attempt missing validation_summary', instrumentationErrors);
  }

  if (returnedHeadshot?.url && persistedHeadshotUrl) {
    assertCondition(persistedHeadshotUrl === returnedHeadshot.url, 'DB headshot_url does not match returned headshot url', instrumentationErrors);
  }
  if (returnedBodyshot?.url && persistedBodyshotUrl) {
    assertCondition(persistedBodyshotUrl === returnedBodyshot.url, 'DB bodyshot_url does not match returned bodyshot url', instrumentationErrors);
  }

  const persistedHeadshotHash = dbHeadshot?.promptHash || updated.prompt_hashes?.headshot;
  const persistedBodyshotHash = dbBodyshot?.promptHash || updated.prompt_hashes?.bodyshot;
  assertCondition(!!persistedHeadshotHash, 'DB prompt_hashes.headshot missing', instrumentationErrors);
  assertCondition(!!persistedBodyshotHash, 'DB prompt_hashes.bodyshot missing', instrumentationErrors);
  if (returnedHeadshot?.promptHash && persistedHeadshotHash) {
    assertCondition(persistedHeadshotHash === returnedHeadshot.promptHash, 'DB headshot promptHash does not match returned promptHash', instrumentationErrors);
  }
  if (returnedBodyshot?.promptHash && persistedBodyshotHash) {
    assertCondition(persistedBodyshotHash === returnedBodyshot.promptHash, 'DB bodyshot promptHash does not match returned promptHash', instrumentationErrors);
  }

  if (returnedHeadshot?.traceUrl) {
    assertCondition(headshotTraceUrl === returnedHeadshot.traceUrl, 'DB headshot_trace_url does not match returned traceUrl', instrumentationErrors);
    assertUrl(returnedHeadshot.traceUrl, 'headshot_trace_url', instrumentationErrors, config.publicAssetHosts);
  }
  if (returnedBodyshot?.traceUrl) {
    assertCondition(bodyshotTraceUrl === returnedBodyshot.traceUrl, 'DB bodyshot_trace_url does not match returned traceUrl', instrumentationErrors);
    assertUrl(returnedBodyshot.traceUrl, 'bodyshot_trace_url', instrumentationErrors, config.publicAssetHosts);
  }
  if (resolvedHeadshotTraceUrl && resolvedBodyshotTraceUrl) {
    assertCondition(resolvedHeadshotTraceUrl !== resolvedBodyshotTraceUrl, 'headshot_trace_url and bodyshot_trace_url must be different', instrumentationErrors);
  }

  if (returnedHeadshot?.openaiRequestId) {
    const headshotTraceId = dbHeadshot?.openaiRequestId
      || headshotTrace?.openaiRequestId
      || headshotTrace?.openaiRequestId?.headshot;
    assertCondition(
      headshotTraceId === returnedHeadshot.openaiRequestId,
      'Headshot openaiRequestId not persisted in trace',
      instrumentationErrors
    );
  }
  if (returnedBodyshot?.openaiRequestId) {
    const bodyshotTraceId = dbBodyshot?.openaiRequestId
      || bodyshotTrace?.openaiRequestId
      || bodyshotTrace?.openaiRequestId?.bodyshot;
    assertCondition(
      bodyshotTraceId === returnedBodyshot.openaiRequestId,
      'Bodyshot openaiRequestId not persisted in trace',
      instrumentationErrors
    );
  }

  if (expectations.requireLimbDifference) {
    if (!bodyshotValidation) {
      instrumentationErrors.push('Bodyshot validation missing in trace for limb difference check');
    }
    const limbConfirmed = bodyshotValidation?.limbs?.limb_difference_confirmed;
    if (limbConfirmed !== true) {
      if (!retryPending) {
        hardFailErrors.push('Limb difference not confirmed should hard_fail bodyshot');
      }
    }
  }

  if (expectations.requireWheelchairPresence) {
    if (!bodyshotValidation) {
      instrumentationErrors.push('Bodyshot validation missing in trace for wheelchair check');
    }
    const wheelchairEntry = Array.isArray(bodyshotValidation?.traits_visible)
      ? bodyshotValidation.traits_visible.find(entry => /wheelchair/i.test(entry?.trait || ''))
      : null;
    if (wheelchairEntry?.visible === false) {
      if (!retryPending) {
        hardFailErrors.push('Wheelchair not present should hard_fail bodyshot');
      }
    }
  }

  if (expectations.requireSpeciesTruthiness) {
    if (!bodyshotValidation) {
      instrumentationErrors.push('Bodyshot validation missing in trace for species truthiness check');
    }
    const speciesConfirmed = bodyshotValidation?.species_anatomy_confirmed;
    if (speciesConfirmed !== true) {
      if (STRICT_MODE && !retryPending) {
        hardFailErrors.push('Species anatomy not confirmed in strict mode');
      } else {
        softIssues.push('Species anatomy not confirmed (needs_review)');
      }
    }
  }

  if (expectations.requireSupportWorldFit) {
    const worldFitEntries = Array.isArray(bodyshotValidation?.support_world_fit)
      ? bodyshotValidation.support_world_fit
      : [];
    const worldFitFailed = worldFitEntries.some(entry => entry?.world_fit === false);
    if (worldFitFailed) {
      if (updated.bodyshot_status !== 'soft_fail' && updated.bodyshot_status !== 'ready') {
        softIssues.push('Support world-fit mismatch should soft_fail bodyshot');
      }
      if (editAttempts.length === 0) {
        softIssues.push('Support world-fit mismatch should queue or execute edit pass');
      }
      const editedBodyshot = editAttempts.find(entry => entry?.asset_type === 'bodyshot');
      if (editedBodyshot?.image_url && persistedBodyshotUrl && editedBodyshot.image_url === persistedBodyshotUrl) {
        softIssues.push('Edit pass should produce a second bodyshot URL');
      }
    }
  }

  if (nonhumanSpecies) {
    const driftChecks = [
      { assetType: 'headshot', validation: headshotValidation, attempt: latestHeadshotAttempt },
      { assetType: 'bodyshot', validation: bodyshotValidation, attempt: latestBodyshotAttempt }
    ];
    driftChecks.forEach(entry => {
      if (!entry.validation) return;
      const drift = entry.validation?.nonhuman_human_default;
      if (drift === null || drift === undefined) {
        instrumentationErrors.push(`nonhuman_human_default missing for ${entry.assetType}`);
        return;
      }
      if (drift === true) {
        if (entry.attempt?.failure_codes?.includes('safety')) {
          return;
        }
        const edited = editAttempts
          .filter(attempt => attempt?.asset_type === entry.assetType)
          .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())[0];
        if (!edited) {
          instrumentationErrors.push(`Nonhuman drift detected without edit attempt for ${entry.assetType}`);
          return;
        }
        if (!edited.validation_summary) {
          instrumentationErrors.push(`Edit attempt missing validation_summary for ${entry.assetType}`);
          return;
        }
        const editedDrift = edited.validation_summary?.nonhuman_human_default;
        if (editedDrift === true) {
          const driftConfidence = edited.validation_summary?.nonhuman_human_default_confidence;
          if (STRICT_MODE) {
            hardFailErrors.push(`Nonhuman drift persisted after edit for ${entry.assetType}`);
          } else {
            softIssues.push(`Nonhuman drift persisted after edit for ${entry.assetType} (confidence: ${driftConfidence ?? 'unknown'})`);
          }
        }
      }
    })
  }

  const validatorFireRate = buildValidatorFireRate(attempts);
  const runSummary = {
    run_id: runId,
    canary_id: normalizedInput.id,
    mode: config.mode,
    character_id: character.id,
    started_at: startedAt,
    inputs: normalizedInput,
    enrichment_summary: buildEnrichmentSummary(invocationData, updated),
    prompt_excerpt: buildPromptExcerpt(invocationData, updated),
    outputs: {
      headshot_url: resolvedHeadshotUrl,
      bodyshot_url: resolvedBodyshotUrl,
      headshot_trace_url: resolvedHeadshotTraceUrl,
      bodyshot_trace_url: resolvedBodyshotTraceUrl,
      prompt_hashes: updated.prompt_hashes || invocationData?.promptHashes || null
    },
    validations: {
      headshot: headshotValidation,
      bodyshot: bodyshotValidation
    },
    edit_attempts: editAttempts.map(entry => ({
      id: entry?.id || null,
      asset_type: entry?.asset_type || null,
      fix_of_attempt_id: entry?.fix_of_attempt_id || null,
      status: entry?.status || null
    })),
    public_snapshot_receipt: publicSnapshotReceipt,
    validator_fire_rate: validatorFireRate,
    errors: {
      instrumentation: instrumentationErrors,
      hard_fail: hardFailErrors,
      soft_issues: softIssues
    }
  };
  appendRunReviewPack(runSummary);
  appendAttemptReviewPack(character.id, attempts, publicSnapshot, publicSnapshotReceipt);

  const errors = [...instrumentationErrors, ...hardFailErrors];
  const report = {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    input: normalizedInput,
    mode: config.mode,
    status: errors.length === 0 ? 'pass' : 'fail',
    errors,
    instrumentationErrors,
    hardFailErrors,
    softIssues,
    characterId: character.id,
    public_character_snapshot: publicSnapshot,
    public_character_snapshot_receipt: publicSnapshotReceipt,
    lambda: invocation,
    db: {
      headshot_url: resolvedHeadshotUrl,
      bodyshot_url: resolvedBodyshotUrl,
      headshot_status: updated.headshot_status || null,
      bodyshot_status: updated.bodyshot_status || null,
      headshot_trace_url: resolvedHeadshotTraceUrl,
      bodyshot_trace_url: resolvedBodyshotTraceUrl,
      headshot_prompt: updated.headshot_prompt || null,
      bodyshot_prompt: updated.bodyshot_prompt || null,
      prompt_hashes: updated.prompt_hashes || null,
      global_style_hash: updated.global_style_hash || null,
      image_model_used: updated.image_model_used || null,
      generation_timestamps: updated.generation_timestamps || null,
      reference_images: referenceImages.length > 0 ? referenceImages : null,
      attempts: attempts.length > 0 ? attempts : null
    },
    validation: {
      headshot: headshotValidation || null,
      bodyshot: bodyshotValidation || null
    },
    validator_fire_rate: validatorFireRate,
    trace: {
      headshot: headshotTrace || null,
      bodyshot: bodyshotTrace || null
    }
  };

  fs.appendFileSync(OUTPUT_JSONL, `${JSON.stringify(report)}\n`);
  const markdownEntry = {
    id: report.input?.id || null,
    characterId: report.characterId,
    speciesKey: report.input?.speciesKey || null,
    traitIds: report.input?.inclusivityTraits || [],
    status: report.status,
    publicSnapshot: report.public_character_snapshot,
    urls: {
      headshot: report.db.headshot_url,
      bodyshot: report.db.bodyshot_url
    },
    statuses: {
      headshot: report.db.headshot_status,
      bodyshot: report.db.bodyshot_status
    },
    promptHashes: report.db.prompt_hashes,
    traceUrls: {
      headshot: report.db.headshot_trace_url,
      bodyshot: report.db.bodyshot_trace_url
    },
    validation: {
      headshot: trimValidation(report.validation?.headshot),
      bodyshot: trimValidation(report.validation?.bodyshot)
    }
  };
  if (!fs.existsSync(OUTPUT_MARKDOWN)) {
    fs.writeFileSync(
      OUTPUT_MARKDOWN,
      `# Character Image Canary Results\n\nStarted: ${report.startedAt}\n\n`
    );
  }
  fs.appendFileSync(
    OUTPUT_MARKDOWN,
    `## ${report.input?.id || 'canary'}\n\n` +
      `Status: ${report.status}\n\n` +
      '```json\n' +
      `${JSON.stringify(markdownEntry, null, 2)}\n` +
      '```\n\n'
  );
  log(`Saved canary report to ${OUTPUT_JSONL} for ${normalizedInput.id}`);

  return { ...report, receiptFailure };
}

async function main() {
  if (SHOW_HELP) {
    printHelpAndExit();
  }

  const canonical = loadCanonicalDictionaries();
  if (LIST_TRAITS) {
    listTraits(canonical);
    return;
  }
  if (LIST_ENUMS) {
    listEnums(canonical);
    return;
  }
  if (RESOLVE_VALUE) {
    resolveValue(canonical, RESOLVE_VALUE);
    return;
  }

  assertNoRecoverySecrets();

  const apiBaseUrlEnv = process.env.API_BASE_URL;
  const inferredEnv = ENV_FLAG || inferEnv(apiBaseUrlEnv);
  const ssmPrefix = process.env.SSM_PREFIX
    || (inferredEnv === 'staging' ? '/storytailor-staging' : '/storytailor-production');
  logResolved('ENV', ENV_FLAG ? 'cli' : 'inferred', inferredEnv);
  logResolved('SSM_PREFIX', process.env.SSM_PREFIX ? 'env' : 'auto', ssmPrefix);

  const awsRegion = await resolveConfigValue({
    name: 'AWS_REGION',
    envVar: 'AWS_REGION',
    ssmPaths: [`${ssmPrefix}/aws/region`],
    fallback: 'us-east-1',
    required: false
  });

  const lambda = new LambdaClient({ region: awsRegion });
  const ssm = new SSMClient({ region: awsRegion });

  const supabaseUrl = await resolveConfigValue({
    name: 'SUPABASE_URL',
    envVar: 'SUPABASE_URL',
    ssmPaths: [
      `${ssmPrefix}/supabase/url`,
      `${ssmPrefix}/supabase-url`
    ],
    required: true,
    ssm
  });

  const supabaseServiceRoleKey = await resolveConfigValue({
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    envVar: 'SUPABASE_SERVICE_ROLE_KEY',
    ssmPaths: [
      `${ssmPrefix}/supabase/service-key`,
      `${ssmPrefix}/supabase-service-key`,
      `${ssmPrefix}/supabase/service_key`
    ],
    required: true,
    ssm
  });

  const apiBaseUrl = await resolveConfigValue({
    name: 'API_BASE_URL',
    envVar: 'API_BASE_URL',
    ssmPaths: [
      `${ssmPrefix}/api-base-url`,
      `${ssmPrefix}/api/base-url`,
      `${ssmPrefix}/api_base_url`
    ],
    fallback: 'https://api.storytailor.dev',
    required: false,
    ssm
  });

  const resolvedEnv = ENV_FLAG || inferredEnv;
  const apiIsProduction = isProductionApi(apiBaseUrl);
  if (apiIsProduction && !CONFIRM_PRODUCTION) {
    console.error(`API_BASE_URL=${apiBaseUrl} looks like production. Re-run with --confirm-production to proceed.`);
    process.exit(1);
  }
  if (apiIsProduction) {
    log('Production API target confirmed via --confirm-production', { apiBaseUrl });
  }
  if (resolvedEnv === 'staging' && apiIsProduction) {
    console.warn('Warning: ENV=staging but API host looks production.');
  }

  const connectivityOk = await connectivityPreflight(apiBaseUrl, resolvedEnv);
  if (!connectivityOk) {
    process.exit(1);
  }

  const authBasePath = await detectAuthPrefix(apiBaseUrl);

  const authEmailPrimaryPaths = [`${ssmPrefix}/canary/auth_email`];
  const authPasswordPrimaryPaths = [`${ssmPrefix}/canary/auth_password`];

  let authEmailSource = null;
  let authPasswordSource = null;

  const primaryEmail = await resolveSecretWithSource({
    name: 'CANARY_AUTH_EMAIL',
    envVar: 'CANARY_AUTH_EMAIL',
    ssmPaths: authEmailPrimaryPaths,
    ssm
  });
  const primaryPassword = await resolveSecretWithSource({
    name: 'CANARY_AUTH_PASSWORD',
    envVar: 'CANARY_AUTH_PASSWORD',
    ssmPaths: authPasswordPrimaryPaths,
    ssm
  });

  let authEmail = primaryEmail.value;
  let authPassword = primaryPassword.value;
  authEmailSource = primaryEmail.source;
  authPasswordSource = primaryPassword.source;

  if (!authEmail || !authPassword) {
    const fallbackEmail = await resolveSecretWithSource({
      name: 'CANARY_AUTH_EMAIL (seeded test user)',
      envVar: 'CANARY_AUTH_EMAIL_SEEDED',
      ssmPaths: [
        `${ssmPrefix}/test/user-email`,
        `${ssmPrefix}/test/user_email`
      ],
      ssm
    });
    const fallbackPassword = await resolveSecretWithSource({
      name: 'CANARY_AUTH_PASSWORD (seeded test user)',
      envVar: 'CANARY_AUTH_PASSWORD_SEEDED',
      ssmPaths: [
        `${ssmPrefix}/test/user-password`,
        `${ssmPrefix}/test/user_password`
      ],
      ssm
    });
    if (fallbackEmail.value && fallbackPassword.value) {
      console.warn(`[DEPRECATED] Using legacy test/user-* credentials. TODO remove after ${LEGACY_FALLBACK_EXPIRY}. Seed /canary/auth_* instead.`);
      authEmail = fallbackEmail.value;
      authPassword = fallbackPassword.value;
      authEmailSource = fallbackEmail.source || 'legacy';
      authPasswordSource = fallbackPassword.source || 'legacy';
    }
  }

  let shouldEnsure = ENSURE_CANARY_USER;
  if (resolvedEnv === 'staging' && (!authEmail || !authPassword)) {
    shouldEnsure = true;
  }
  if (resolvedEnv === 'production' && shouldEnsure && !ALLOW_PROD_ENSURE_USER) {
    console.error('Refusing to ensure canary user in production without --allow-prod-ensure-user (and --confirm-production).');
    process.exit(1);
  }

  if (shouldEnsure) {
    const ensureEmail = authEmail || `canary+${resolvedEnv}@storytailor.dev`;
    const ensurePassword = authPassword || randomPassword();
    const ensured = await ensureCanaryUser({
      apiBaseUrl,
      supabaseUrl,
      supabaseServiceRoleKey,
      email: ensureEmail,
      password: ensurePassword,
      authBasePath
    });
    authEmail = ensured.email;
    authPassword = ensured.password;
    authEmailSource = authEmailSource || 'ensure';
    authPasswordSource = authPasswordSource || 'ensure';
    if (PERSIST_SSM) {
      await persistSsmSecret(ssm, authEmailPrimaryPaths[0], authEmail);
      await persistSsmSecret(ssm, authPasswordPrimaryPaths[0], authPassword);
    }
  } else if (!authEmail || !authPassword) {
    console.error('Missing canary credentials. Provide via env/SSM or use --ensure-canary-user.');
    console.error(`Checked SSM paths: ${authEmailPrimaryPaths[0]}, ${authPasswordPrimaryPaths[0]}`);
    if (resolvedEnv === 'production') {
      console.error('Ensure-user in prod requires --confirm-production and --allow-prod-ensure-user.');
    }
    process.exit(1);
  }

  if (!authEmail || !authPassword) {
    console.error('Missing canary credentials after ensure step.');
    process.exit(1);
  }

  log(`Auth email source: ${resolvedFrom(authEmailSource)}`);
  log(`Auth password source: ${resolvedFrom(authPasswordSource)}`);

  const contentAgentSsmPaths = [
    `${ssmPrefix}/content-agent/lambda-name`,
    `${ssmPrefix}/content-agent-lambda-name`
  ];
  let contentAgentLambda = null;
  let contentAgentSource = null;
  if (ssm) {
    for (const ssmPath of contentAgentSsmPaths) {
      try {
        const value = await getSSMParam(ssm, ssmPath);
        if (value) {
          contentAgentLambda = value;
          contentAgentSource = `ssm:${ssmPath}`;
          break;
        }
      } catch {
        // keep trying fallbacks
      }
    }
  }
  if (!contentAgentLambda && process.env.CONTENT_AGENT_LAMBDA) {
    contentAgentLambda = process.env.CONTENT_AGENT_LAMBDA;
    contentAgentSource = 'env';
  }
  if (!contentAgentLambda && resolvedEnv === 'production') {
    contentAgentLambda = 'storytailor-content-agent-production';
    contentAgentSource = 'fallback';
  }
  if (!contentAgentLambda) {
    console.error('Missing required secret: CONTENT_AGENT_LAMBDA');
    console.error('Provider env missing for CONTENT_AGENT_LAMBDA');
    contentAgentSsmPaths.forEach(path => {
      console.error(`Provider ssm failed for ${path}: Unknown`);
    });
    process.exit(1);
  }
  logResolved('CONTENT_AGENT_LAMBDA', contentAgentSource || 'unknown', contentAgentLambda);

  if (resolvedEnv !== 'production' && /production/i.test(contentAgentLambda)) {
    console.error('Refusing to run non-production canary against production content-agent lambda.');
    console.error(`Resolved CONTENT_AGENT_LAMBDA: ${contentAgentLambda}`);
    console.error('Provide CONTENT_AGENT_LAMBDA via env/SSM for staging.');
    process.exit(1);
  }

  const testUserId = await resolveConfigValue({
    name: 'STORYTAILOR_TEST_USER_ID',
    envVar: 'STORYTAILOR_TEST_USER_ID',
    ssmPaths: [`${ssmPrefix}/test/user-id`],
    fallback: '0073efb7-38ec-45ce-9f71-faccdc7bddc5',
    required: false,
    ssm
  });

  const testLibraryId = await resolveConfigValue({
    name: 'STORYTAILOR_TEST_LIBRARY_ID',
    envVar: 'STORYTAILOR_TEST_LIBRARY_ID',
    ssmPaths: [`${ssmPrefix}/test/library-id`],
    fallback: 'f03c25d5-7eb3-4a90-a71e-17e9a194b5e9',
    required: false,
    ssm
  });

  const assetCdnUrl = await resolveConfigValue({
    name: 'ASSET_CDN_URL',
    envVar: 'ASSET_CDN_URL',
    ssmPaths: [`${ssmPrefix}/asset-cdn-url`],
    fallback: 'https://assets.storytailor.dev',
    required: false,
    ssm
  });

  const assetHost = (() => {
    try {
      return new URL(assetCdnUrl).host;
    } catch {
      return 'assets.storytailor.dev';
    }
  })();

  const publicAssetHostsRaw = await resolveConfigValue({
    name: 'PUBLIC_ASSET_HOSTS',
    envVar: 'PUBLIC_ASSET_HOSTS',
    ssmPaths: [`${ssmPrefix}/public-asset-hosts`],
    fallback: `${assetHost},s3.amazonaws.com`,
    required: false,
    ssm
  });

  const publicAssetHosts = publicAssetHostsRaw.split(',')
    .map(host => host.trim())
    .filter(Boolean);

  if (FORCE_BAD_HOST) {
    log('PUBLIC_ASSET_HOSTS forced override for negative test', { value: 'bad.example.com' });
    publicAssetHosts.splice(0, publicAssetHosts.length, 'bad.example.com');
  }

  const config = {
    awsRegion,
    supabaseUrl,
    supabaseServiceRoleKey,
    contentAgentLambda,
    contentAgentSource,
    publicAssetHosts,
    testUserId,
    testLibraryId,
    apiBaseUrl,
    authEmail,
    authPassword,
    authBasePath,
    snapshotBasePath: process.env.CANARY_SNAPSHOT_BASE_PATH || '/v1',
    runNonce: `canary-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    mode: MODE,
    lambda
  };

  resetReviewPacks({
    env: resolvedEnv,
    envInferred: inferredEnv,
    mode: config.mode,
    runNonce: config.runNonce,
    apiBaseUrl: config.apiBaseUrl,
    authBasePath: config.authBasePath,
    snapshotBasePath: config.snapshotBasePath,
    contentAgentLambda: config.contentAgentLambda,
    contentAgentSource: config.contentAgentSource || 'unknown'
  });

  const preflightSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  await assertSchemaParity(preflightSupabase);
  if (PREFLIGHT_ONLY) {
    log('Schema parity preflight ok', { table: 'characters' });
    return;
  }

  if (SKIP_AUTH_PREFLIGHT) {
    console.warn('Skipping auth preflight due to --skip-auth-preflight (use for local debugging only)');
  } else {
    const authResult = await assertAuthPreflight(config);
    config.authAccessToken = authResult.accessToken;
    config.authTokenInfo = authResult.tokenInfo;
    config.authUser = authResult.user;
  }

  const canaries = [
    {
      id: 'canary-made-up-nonsense',
      name: `Doodle_${Date.now()}`,
      age: 7,
      species: 'made_up',
      speciesKey: 'made_up',
      speciesDescriptor: 'a wobbly zigzag blob with glitter freckles and a zipper smile',
      appearance: 'bouncy shape, soft edges, playful face',
      inclusivityTraits: []
    },
    {
      id: 'canary-nonhuman-wheelchair',
      name: `Nimbus_${Date.now()}`,
      age: 7,
      species: 'elemental',
      speciesKey: 'elemental',
      speciesDescriptor: 'cloud kid made of mist and rainbow sprinkles',
      appearance: 'puffy, floaty, soft edges with drifting sparkles',
      inclusivityTraits: ['wheelchair_manual']
    },
    {
      id: 'canary-nonhuman-down-syndrome',
      name: `Wafflewing_${Date.now()}`,
      age: 6,
      species: 'fantasy_being',
      speciesKey: 'fantasy_being',
      speciesDescriptor: 'tiny dragon made of waffle batter with syrup freckles',
      appearance: 'warm waffle texture, syrup freckles, soft wings',
      inclusivityTraits: ['down_syndrome']
    }
  ];
  const matrixCanaries = [
    {
      id: 'matrix-human-down-syndrome',
      name: `Avery_${Date.now()}`,
      age: 8,
      species: 'human',
      speciesKey: 'human',
      speciesDescriptor: 'human',
      appearance: 'warm smile, short curly hair, bright eyes',
      aboutThem: 'loves tinkering with puzzles and sharing stories',
      inclusivityTraits: ['down_syndrome']
    },
    {
      id: 'matrix-robot-prosthetic',
      name: `Gearling_${Date.now()}`,
      age: 9,
      species: 'robot',
      speciesKey: 'robot',
      speciesDescriptor: 'clockwork robot with brass joints and glass chest core',
      appearance: 'brass-and-copper plates with a soft blue glow',
      aboutThem: 'builds tiny gadgets and maps star routes',
      inclusivityTraits: ['prosthetic_leg']
    },
    {
      id: 'matrix-aquatic-none',
      name: `Coral_${Date.now()}`,
      age: 7,
      species: 'animal',
      speciesKey: 'animal',
      speciesDescriptor: 'small octopus with coral-like arms',
      appearance: 'teal skin, coral-tipped arms, speckled freckles',
      aboutThem: 'plays hide and seek in kelp gardens',
      inclusivityTraits: []
    },
    {
      id: 'matrix-fantasy-burns',
      name: `Luma_${Date.now()}`,
      age: 10,
      species: 'fantasy_being',
      speciesKey: 'fantasy_being',
      speciesDescriptor: 'forest sprite with leaf wings',
      appearance: 'leafy wings, glowing freckles, soft moss accents',
      aboutThem: 'protects seedling villages and tells wind poems',
      inclusivityTraits: ['burn_scars']
    },
    {
      id: 'matrix-elemental-wheelchair',
      name: `Ember_${Date.now()}`,
      age: 9,
      species: 'elemental',
      speciesKey: 'elemental',
      speciesDescriptor: 'small fire elemental with ember hair',
      appearance: 'ember glow with swirling sparks and warm gradients',
      aboutThem: 'guides lantern festivals with steady warmth',
      inclusivityTraits: ['wheelchair_manual']
    },
    {
      id: 'matrix-made-up-none',
      name: `Scribble_${Date.now()}`,
      age: 6,
      species: 'made_up',
      speciesKey: 'made_up',
      speciesDescriptor: 'scribble creature with zigzag ears and button eyes',
      appearance: 'ink-drawn textures with soft pastel shading',
      aboutThem: 'collects stickers and hides in art studios',
      inclusivityTraits: []
    },
    {
      id: 'matrix-animal-limb-difference',
      name: `Pip_${Date.now()}`,
      age: 7,
      species: 'animal',
      speciesKey: 'animal',
      speciesDescriptor: 'curious fox',
      appearance: 'soft fur with a striped tail and amber eyes',
      aboutThem: 'builds tiny bridges across streams',
      inclusivityTraits: ['limb_difference_arm_missing']
    },
    {
      id: 'matrix-alien-prosthetic',
      name: `Zyra_${Date.now()}`,
      age: 9,
      species: 'alien',
      speciesKey: 'alien',
      speciesDescriptor: 'starborne alien with glowing antennae',
      appearance: 'violet skin, luminous freckles, gentle glow',
      aboutThem: 'charts new constellations for friends',
      inclusivityTraits: ['prosthetic_leg']
    },
    {
      id: 'matrix-cloud-wheelchair',
      name: `Nimbus_${Date.now()}`,
      age: 7,
      species: 'elemental',
      speciesKey: 'elemental',
      speciesDescriptor: 'cloud kid made of mist and rainbow sprinkles',
      appearance: 'puffy mist form with drifting sparkles',
      aboutThem: 'shapes rainbows and rides warm breezes',
      inclusivityTraits: ['wheelchair_manual']
    },
    {
      id: 'matrix-plant-burns',
      name: `Sprig_${Date.now()}`,
      age: 6,
      species: 'made_up',
      speciesKey: 'made_up',
      speciesDescriptor: 'sapling guardian with leaf hair',
      appearance: 'bark-textured limbs and leafy hair',
      aboutThem: 'guards dew ponds and makes flower crowns',
      inclusivityTraits: ['burn_scars']
    },
    {
      id: 'matrix-monster-none',
      name: `Mossy_${Date.now()}`,
      age: 8,
      species: 'monster',
      speciesKey: 'monster',
      speciesDescriptor: 'soft mossy monster with gentle horns',
      appearance: 'mossy texture with leaf accents',
      aboutThem: 'collects shiny stones and hums songs',
      inclusivityTraits: []
    },
    {
      id: 'matrix-insectoid-limb-difference',
      name: `Chitin_${Date.now()}`,
      age: 10,
      species: 'monster',
      speciesKey: 'monster',
      speciesDescriptor: 'beetle-like explorer with iridescent shell',
      appearance: 'iridescent shell with gentle eyes',
      aboutThem: 'maps underground tunnels with glowing markers',
      inclusivityTraits: ['limb_difference_arm_missing']
    }
  ]

  const targetedCanaries = [
    {
      id: 'targeted-limb-arm-missing',
      name: `Brook_${Date.now()}`,
      age: 8,
      species: 'animal',
      speciesKey: 'animal',
      speciesDescriptor: 'river otter with bright whiskers',
      appearance: 'sleek fur, warm amber eyes, playful posture',
      aboutThem: 'builds moss bridges and loves water puzzles',
      inclusivityTraits: ['limb_difference_arm_missing'],
      expectations: { requireLimbDifference: true }
    },
    {
      id: 'targeted-limb-leg-missing',
      name: `Cedar_${Date.now()}`,
      age: 9,
      species: 'animal',
      speciesKey: 'animal',
      speciesDescriptor: 'gentle deer with soft dappled fur',
      appearance: 'dappled coat, wide kind eyes, calm stance',
      aboutThem: 'moves with a shorter right leg and explores meadow paths',
      inclusivityTraits: ['limb_length_discrepancy'],
      expectations: { requireLimbDifference: true }
    },
    {
      id: 'targeted-elemental-fire-wheelchair',
      name: `Emberlight_${Date.now()}`,
      age: 8,
      species: 'elemental',
      speciesKey: 'elemental',
      speciesDescriptor: 'small fire elemental with ember core and flame petals',
      appearance: 'ember glow with gentle sparks and warm gradients',
      aboutThem: 'guides lantern festivals with steady warmth',
      inclusivityTraits: ['wheelchair_manual'],
      expectations: { requireSpeciesTruthiness: true, requireSupportWorldFit: true, requireWheelchairPresence: true }
    },
    {
      id: 'targeted-elemental-ice-prosthetic',
      name: `Froststep_${Date.now()}`,
      age: 9,
      species: 'elemental',
      speciesKey: 'elemental',
      speciesDescriptor: 'ice elemental with crystalline curls and frosted aura',
      appearance: 'translucent ice sheen with soft snow sparkles',
      aboutThem: 'draws glowing snow maps for friends',
      inclusivityTraits: ['prosthetic_leg'],
      expectations: { requireSpeciesTruthiness: true, requireSupportWorldFit: true }
    },
    {
      id: 'targeted-alien-prosthetic',
      name: `Vega_${Date.now()}`,
      age: 10,
      species: 'alien',
      speciesKey: 'alien',
      speciesDescriptor: 'starborne alien with luminous antennae and nebula skin',
      appearance: 'violet glow, constellations in the skin, calm smile',
      aboutThem: 'charts new constellations and shares star maps',
      inclusivityTraits: ['prosthetic_arm'],
      expectations: { requireSpeciesTruthiness: true, requireSupportWorldFit: true }
    },
    {
      id: 'targeted-alien-down-syndrome',
      name: `Nova_${Date.now()}`,
      age: 9,
      species: 'alien',
      speciesKey: 'alien',
      speciesDescriptor: 'nebula alien with luminous antennae and prismatic fins',
      appearance: 'soft glow with patterned nebula swirls and gentle eyes',
      aboutThem: 'collects star seeds and maps moonlit trails',
      inclusivityTraits: ['down_syndrome'],
      expectations: { requireSpeciesTruthiness: true }
    },
    {
      id: 'targeted-cloud-wheelchair',
      name: `Nimbus_${Date.now()}`,
      age: 7,
      species: 'elemental',
      speciesKey: 'elemental',
      speciesDescriptor: 'cloud-mist elemental with rainbow shimmer',
      appearance: 'soft mist form with drifting sparkles and airy edges',
      aboutThem: 'shapes rainbows and rides warm breezes',
      inclusivityTraits: ['wheelchair_manual'],
      expectations: { requireSpeciesTruthiness: true, requireSupportWorldFit: true, requireWheelchairPresence: true }
    },
    {
      id: 'targeted-max-whimsy-mobility',
      name: `Orbit_${Date.now()}`,
      age: 7,
      species: 'made_up',
      speciesKey: 'made_up',
      speciesDescriptor: 'bubble-comet being with soft glow and star-map freckles',
      appearance: 'round, friendly silhouette with shimmering pastel highlights and big curious eyes',
      aboutThem: 'rides a bubble pod rocket seat to deliver glitter notes across the sky',
      inclusivityTraits: ['wheelchair_manual'],
      traitUserDescriptions: {
        wheelchair_manual: 'mobility support device is a bubble pod rocket seat with a visible seat and support frame; clearly in use'
      },
      expectations: { requireWheelchairPresence: true }
    },
    {
      id: 'targeted-elemental-halo',
      name: `Zephyr_${Date.now()}`,
      age: 6,
      species: 'elemental',
      speciesKey: 'elemental',
      speciesDescriptor: 'wind elemental with swirling vapor trails and gentle breeze aura',
      appearance: 'translucent air currents with soft shimmer and dancing particles',
      aboutThem: 'carries messages on the wind and guides paper airplanes',
      inclusivityTraits: ['halo_cervical_orthosis'],
      expectations: { requireSpeciesTruthiness: true, requireSupportWorldFit: true }
    },
    {
      id: 'targeted-made-up-down-syndrome',
      name: `Biscuit_${Date.now()}`,
      age: 8,
      species: 'made_up',
      speciesKey: 'made_up',
      speciesDescriptor: 'cookie dough creature with chocolate chip freckles and frosting swirls',
      appearance: 'soft warm dough texture with sprinkle accents and a gentle smile',
      aboutThem: 'bakes friendship cookies and leaves warm crumb trails',
      inclusivityTraits: ['down_syndrome'],
      expectations: { requireSpeciesTruthiness: true }
    },
    {
      id: 'targeted-monster-missing-limb',
      name: `Grumble_${Date.now()}`,
      age: 9,
      species: 'monster',
      speciesKey: 'monster',
      speciesDescriptor: 'fuzzy monster with horns, fangs, and a big lovable grin',
      appearance: 'thick purple fur with teal spots and expressive round eyes',
      aboutThem: 'collects lost socks and organizes them by color',
      inclusivityTraits: ['limb_difference_arm_missing'],
      expectations: { requireSpeciesTruthiness: true, requireLimbDifference: true }
    }
  ]

  const summary = {
    canaries: [],
    failures: []
  };

  const canonicalIds = new Set([
    'targeted-cloud-wheelchair',
    'targeted-elemental-ice-prosthetic',
    'targeted-alien-down-syndrome',
    'targeted-max-whimsy-mobility'
  ])
  const canonicalCanaries = targetedCanaries.filter(canary => canonicalIds.has(canary.id))
  const baseCanaries = useMatrix ? matrixCanaries : canaries
  const combinedCanaries = useTargeted
    ? baseCanaries.concat(targetedCanaries)
    : baseCanaries
  const canaryPool = useCanonical ? canonicalCanaries : combinedCanaries
  const selectedCanaries = onlyCanaries.length > 0
    ? canaryPool.filter((canary) => onlyCanaries.includes(canary.id))
    : canaryPool;

  if (onlyCanaries.length > 0 && selectedCanaries.length === 0) {
    console.error(`No canaries matched --only=${onlyCanaries.join(',')}`);
    process.exit(1);
  }

  const validationErrors = validateCanaryInputs(selectedCanaries, canonical);
  if (validationErrors.length > 0) {
    console.error('Canary authoring validation failed:\n' + validationErrors.map(err => `- ${err}`).join('\n'));
    process.exit(1);
  }

  for (const canary of selectedCanaries) {
    log(`Starting ${canary.id}`);
    const report = await runCanary(canary, config, canonical);
    summary.canaries.push({ id: canary.id, status: report.status, errors: report.errors });
    if (report.receiptFailure) {
      console.error('Auth receipt failed; stopping canary run early.');
      process.exit(1);
    }
    if (report.status !== 'pass') {
      summary.failures.push({ id: canary.id, errors: report.errors });
    }
  }

  log('All image canaries complete.');
  summary.exitCode = summary.failures.length > 0 ? 1 : 0;
  console.log(JSON.stringify(summary, null, 2));

  if (summary.exitCode !== 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
