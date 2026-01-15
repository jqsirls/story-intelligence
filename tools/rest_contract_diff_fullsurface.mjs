#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const argv = process.argv.slice(2)
const args = {}
for (let i = 0; i < argv.length; i += 2) {
  const key = argv[i]
  const val = argv[i + 1]
  if (!key || !key.startsWith('--')) continue
  args[key.replace(/^--/, '')] = val
}

if (!args.contract || !args.roots || !args.out_json || !args.out_md) {
  console.log('Usage: node tools/rest_contract_diff_fullsurface.mjs --contract <path> --roots <comma-separated> --out_json <path> --out_md <path>')
  process.exit(0)
}

const roots = args.roots.split(',').map((p) => p.trim()).filter(Boolean)
const contractPath = args.contract
const outJson = args.out_json
const outMd = args.out_md

const generatorCommand = `node tools/rest_contract_diff_fullsurface.mjs --contract ${contractPath} --roots ${roots.join(',')} --out_json ${outJson} --out_md ${outMd}`

function normPath(p) {
  let x = p.trim()
  x = x.split('?')[0]
  x = x.replace(/\/+/g, '/')
  x = x.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
  if (!x.startsWith('/')) x = `/${x}`
  if (x.length > 1 && x.endsWith('/')) x = x.slice(0, -1)
  return x
}

function key(method, p) {
  return `${method.toLowerCase()} ${normPath(p)}`
}

function readAllFiles(root) {
  const out = []
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    if (!dir) continue
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        stack.push(full)
      } else if (e.isFile() && full.endsWith('.ts')) {
        out.push(full)
      }
    }
  }
  return out
}

function extractContractEndpoints(contractText) {
  const out = []
  const rx = /\*\*(GET|POST|PUT|PATCH|DELETE)\s+([^*\s]+)\*\*/gi
  let m
  while ((m = rx.exec(contractText)) !== null) {
    out.push({ method: m[1], path: m[2], norm: key(m[1], m[2]) })
  }
  return out
}

function extractCodeEndpointsFromFile(filePath) {
  const ts = fs.readFileSync(filePath, 'utf8')
  
  // Skip test files - they may have route strings in test code
  if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) {
    return []
  }
  
  // Skip unmounted router files (WebVTTRoutes is not mounted in RESTAPIGateway)
  if (filePath.includes('WebVTTRoutes.ts')) {
    return []
  }
  
  // Remove comments to avoid matching route strings in comments
  // Remove single-line comments (// ...)
  let code = ts.replace(/\/\/.*$/gm, '')
  // Remove multi-line comments (/* ... */)
  code = code.replace(/\/\*[\s\S]*?\*\//g, '')
  // Remove JSDoc comments (/** ... */)
  code = code.replace(/\/\*\*[\s\S]*?\*\//g, '')
  
  // Match routes: app.get('/path', ...) or router.post("/api/v1/...", ...)
  // Also match /health and other non-/api paths
  // Only match if it's followed by a comma or closing paren (actual route registration)
  const rx = /(?:app|this\.app|router)\.(get|post|put|patch|delete)\s*\(\s*([`'"])(\/[^`'"\n]+)\2\s*[,\)]/gi
  const out = []
  let m
  while ((m = rx.exec(code)) !== null) {
    const method = m[1].toUpperCase()
    const p = m[3]
    out.push({ method, path: p, norm: key(method, p), file: filePath })
  }
  return out
}

// Mount expansion for AuthRoutes specifically (minimum acceptable scope)
function expandAuthRoutesFromMount(filePath, endpoints) {
  const ts = fs.readFileSync(filePath, 'utf8')
  const varRx = /const\s+([A-Za-z0-9_]+)\s*=\s*new\s+AuthRoutes/i
  const useRx = /app\.use\(\s*['"](\/api\/v1\/auth)['"]\s*,\s*([A-Za-z0-9_]+)\.getRouter\(\s*\)\s*\)/i
  const varMatch = ts.match(varRx)
  const useMatch = ts.match(useRx)
  if (!varMatch || !useMatch) return endpoints
  if (varMatch[1] !== useMatch[2]) return endpoints

  const authFile = path.resolve(path.dirname(filePath), 'AuthRoutes.ts')
  if (!fs.existsSync(authFile)) return endpoints

  const authSrc = fs.readFileSync(authFile, 'utf8')
  const routeRx = /router\.(get|post|put|patch|delete)\s*\(\s*['"](\/[^'"\n]+)['"]/gi
  let m
  while ((m = routeRx.exec(authSrc)) !== null) {
    const method = m[1].toUpperCase()
    const sub = m[2]
    const fullPath = `/api/v1/auth${sub === '/' ? '' : sub}`
    endpoints.push({
      method,
      path: fullPath,
      norm: key(method, fullPath),
      file: authFile,
      note: 'expanded from AuthRoutes mount'
    })
  }
  return endpoints
}

const contractText = fs.readFileSync(contractPath, 'utf8')
const contractEndpoints = extractContractEndpoints(contractText)
const contractSet = new Set(contractEndpoints.map((e) => e.norm))

let codeEndpoints = []
for (const root of roots) {
  const files = readAllFiles(root)
  for (const f of files) {
    let eps = extractCodeEndpointsFromFile(f)
    if (f.endsWith('RESTAPIGateway.ts')) {
      eps = expandAuthRoutesFromMount(f, eps)
    }
    codeEndpoints.push(...eps)
  }
}

const codeSet = new Set(codeEndpoints.map((e) => e.norm))

const missing = Array.from(contractSet).filter((k) => !codeSet.has(k)).sort()
const extra = Array.from(codeSet).filter((k) => !contractSet.has(k)).sort()

const headSha = (() => {
  try {
    return fs.readFileSync('.git/HEAD', 'utf8').trim()
  } catch {
    return 'UNKNOWN'
  }
})()

const generatedAt = new Date().toISOString()

const out = {
  head_sha: headSha,
  generated_at: generatedAt,
  generator_command: generatorCommand,
  contract_total: contractSet.size,
  implementation_total: codeSet.size,
  missing_in_code: missing,
  extra_in_code: extra
}

fs.writeFileSync(outJson, JSON.stringify(out, null, 2))

const md = []
md.push('# REST Contract Diff')
md.push('')
md.push(`- head_sha: ${out.head_sha}`)
md.push(`- generated_at: ${out.generated_at}`)
md.push(`- generator_command: ${out.generator_command}`)
md.push('')
md.push('## Counts')
md.push(`- contract_total: ${out.contract_total}`)
md.push(`- implementation_total: ${out.implementation_total}`)
md.push(`- missing_in_code: ${out.missing_in_code.length}`)
md.push(`- extra_in_code: ${out.extra_in_code.length}`)
md.push('')
md.push('## missing_in_code')
md.push(...missing.map((k) => `- ${k}`))
md.push('')
md.push('## extra_in_code')
md.push(...extra.map((k) => `- ${k}`))
md.push('')

fs.writeFileSync(outMd, md.join('\n'))
