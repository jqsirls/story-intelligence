// Thin wrapper to reuse the canonical Lambda handler from the workspace package.
// This keeps lambda-deployments aligned with the packaged universal-agent build.
import { handler as packagedHandler } from '@alexa-multi-agent/universal-agent/dist/lambda'

export const handler = packagedHandler
export default packagedHandler

