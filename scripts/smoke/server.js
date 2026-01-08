// Plain JS harness that runs compiled universal-agent server
const path = require('path')
const PORT = parseInt(process.env.PORT || '8787', 10)
const distRoot = path.join(__dirname, '..', '..', 'packages', 'universal-agent', 'dist')
const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => console.debug(...args)
}

const { UniversalStorytellerAPI } = require(path.join(distRoot, 'UniversalStorytellerAPI.js'))
const { RESTAPIGateway } = require(path.join(distRoot, 'api', 'RESTAPIGateway.js'))

const storytellerAPI = new UniversalStorytellerAPI(null, null, logger)
const gateway = new RESTAPIGateway(storytellerAPI, logger)
const app = gateway.app

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`LISTENING http://127.0.0.1:${PORT}`)
})

const shutdown = () => server.close(() => process.exit(0))
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

