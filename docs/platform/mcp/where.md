# MCP (Model Context Protocol) - Where

**Last Updated**: 2025-12-17

## Deployment Location

The MCP server is deployed as an AWS Lambda function in the `us-east-1` region.

- **Primary Region**: `us-east-1` (N. Virginia)
- **Lambda Function Name**: `storytailor-mcp-server-production`
- **Package Location**: `tmp-ci/repo/services/mcp-server/`
- **Main Handler**: `dist/lambda.handler`

## AWS Lambda Configuration

- **Runtime**: `nodejs22.x`
- **Memory**: `512 MB` (optimized for tool handling and JSON-RPC processing)
- **Timeout**: `30 seconds` (sufficient for tool operations and router calls)
- **Concurrency**: Configured with auto-scaling based on demand
- **Trigger**: Lambda Function URL (HTTP endpoint)
- **IAM Role**: Possesses necessary permissions for:
  - Logging to CloudWatch
  - Accessing AWS Systems Manager (SSM) Parameter Store for configuration
  - Invoking Router Lambda function (if needed)
  - Reading from Supabase (via VPC endpoint or public API, if needed)

## Function URL

The MCP server is accessible via Lambda Function URL:

- **Function URL**: `https://gri66fqbukqq3ghgqb4kfrqabi0dupql.lambda-url.us-east-1.on.aws/`
- **Status**: ✅ Configured and accessible
- **AuthType**: NONE (authentication handled by JWT verification in the server)
- **CORS**: Configured for cross-origin requests from AI assistants

**Get Function URL**:
```bash
aws lambda get-function-url-config \
  --function-name storytailor-mcp-server-production \
  --region us-east-1 \
  --query 'FunctionUrl' \
  --output text
```

**Code References:**
- `docs/testing/mcp-production-status.md:22-26` - Function URL details
- `docs/docs/MCP_SETUP.md:40-61` - Function URL configuration

## Environment Variables

The following environment variables are configured via AWS Systems Manager (SSM) Parameter Store and injected into the Lambda function:

- `ROUTER_BASE_URL`: Router API base URL (from SSM or environment variable)
  - **SSM Path**: `/storytailor-production/router-base-url` (or similar)
  - **Default**: Router Lambda Function URL
- `AUTH_JWKS_URL`: JWKS URL for token verification (optional)
  - **SSM Path**: `/storytailor-production/auth-jwks-url` (or similar)
- `TOKEN_ISSUER`: Token issuer for JWT validation (optional)
  - **SSM Path**: `/storytailor-production/token-issuer` (or similar)
- `MCP_RATE_PER_MINUTE`: Rate limiting per caller (default: 60)
  - **SSM Path**: `/storytailor-production/mcp-rate-per-minute` (or similar)

**Code References:**
- `tmp-ci/repo/services/mcp-server/src/config.ts` - Configuration loading
- `tmp-ci/repo/services/mcp-server/src/index.ts:5-6` - Environment variables

## Monitoring and Logging

- **CloudWatch Logs**: All MCP server logs are streamed to CloudWatch for real-time monitoring and debugging
  - **Log Group**: `/aws/lambda/storytailor-mcp-server-production`
- **CloudWatch Metrics**: Key performance indicators monitored:
  - Invocation count
  - Error rate
  - Latency (duration)
  - Throttles
  - Rate limit hits
- **Health Monitoring**: Health endpoint (`/health`) available for monitoring
- **Distributed Tracing**: Can be integrated with AWS X-Ray for end-to-end request tracing

## Infrastructure Dependencies

### Router Lambda Function

- **Function Name**: `storytailor-router-production`
- **Region**: `us-east-1`
- **Runtime**: `nodejs22.x`
- **Handler**: `dist/lambda.handler`
- **Function URL**: `https://g372yobqhadsjw6ek7szqka3aq0rkyvt.lambda-url.us-east-1.on.aws/`
- **Status**: ✅ Active and functional (deployed December 17, 2025)
- **Dependencies**: ✅ Winston and all required modules included in deployment

**Code References:**
- `docs/testing/mcp-production-status.md:67-70` - Router connectivity
- `docs/testing/router-production-final-verification.md` - Router verification

### AWS Systems Manager (SSM) Parameter Store

- **Purpose**: Manages environment-specific configurations
- **Region**: `us-east-1`
- **Access**: Lambda execution role has read permissions

### Network Configuration

- **VPC**: Not required (public Lambda Function URL)
- **Security Groups**: N/A (Function URL handles security)
- **Internet Gateway**: Required for external access (via Function URL)

## Related Documentation

- [MCP Overview](./overview.md) - Complete technical overview
- [MCP What](./what.md) - Detailed functionality
- [MCP Deployment Status](../../testing/mcp-production-status.md) - Production deployment verification
