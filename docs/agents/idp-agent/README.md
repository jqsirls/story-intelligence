# Idp Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/idp-agent`
**Lambda Function**: `storytailor-idp-agent-production`  
**Region**: us-east-1  
**Last Updated**: 2025-12-13

## Overview

Identity Provider Agent implementing OAuth 2.0 and OpenID Connect (OIDC) for the Storytailor platform. Provides secure authentication and authorization for third-party integrations and partner applications.

## Quick Start

### What It Does

- **OAuth 2.0 Support**: Authorization Code Flow (with PKCE), Refresh Token Flow, Client Credentials Flow
- **OpenID Connect Support**: Discovery endpoint, UserInfo endpoint, ID tokens with standard and custom claims
- **Security Features**: PKCE mandatory for public clients, consent management with parental controls, token binding and rotation
- **Kid-Safe Consent Flow**: Parental consent for applications requiring access to child accounts

## Documentation Links

- [What It Does](./what.md) - Detailed functionality and capabilities
- [Why It Exists](./why.md) - Business rationale and value proposition
- [When to Use](./when.md) - Usage guidelines and integration points
- [Where It's Deployed](./where.md) - Deployment location and Lambda configuration
- [Who Owns It](./who.md) - Team ownership and maintainers
- [Development Guide](./development.md) - Technical implementation and API reference
- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics

## Configuration

### Environment Variables
- `SUPABASE_URL` - From SSM Parameter Store
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM Parameter Store

### Lambda Configuration
- **Runtime**: Node.js 18.x
- **Timeout**: 60 seconds
- **Memory**: 512 MB
- **Region**: us-east-1

## API Endpoints

### Discovery
- `GET /.well-known/openid-configuration` - Returns OIDC discovery document

### Authorization
- `GET/POST /oauth/authorize` - Authorization endpoint with PKCE support

### Token Exchange
- `POST /oauth/token` - Token exchange endpoint

### UserInfo
- `GET/POST /oauth/userinfo` - User information endpoint

### Token Revocation
- `POST /oauth/revoke` - Token revocation endpoint

## Supported Scopes

### Standard OIDC Scopes
- `openid` - Required for OIDC, returns sub claim
- `profile` - User profile information
- `email` - Email address and verification status
- `phone` - Phone number and verification status
- `address` - Physical address
- `offline_access` - Refresh token issuance

### Custom Storytailor Scopes
- `storytailor:characters` - Access to user's characters
- `storytailor:library` - Access to story library
- `storytailor:family` - Family management permissions

## Status

✅ **Production Ready**
- Deployed to AWS Lambda (us-east-1)
- OAuth 2.0 operational
- OIDC support active
- Kid-safe consent functional
- Bundled in Universal Agent
