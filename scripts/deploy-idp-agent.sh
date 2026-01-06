#!/bin/bash

# Deploy IdP Agent Lambda
# This agent handles OAuth 2.0 and OpenID Connect flows

set -e

echo "🚀 Deploying IdP Agent..."

# Configuration
FUNCTION_NAME="storytailor-idp-agent-staging"
ROLE_NAME="storytailor-idp-agent-role"
REGION="us-east-1"
ACCOUNT_ID="654654370424"

# Create deployment directory
DEPLOY_DIR="deploy-idp-agent"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy agent code
cp -r packages/idp-agent/* $DEPLOY_DIR/
cd $DEPLOY_DIR

# Install production dependencies
npm install --production

# Create Lambda deployment package
zip -r ../idp-agent-lambda.zip . -x "*.test.ts" -x "__tests__/*" -x "*.md"
cd ..

# Create or update IAM role
echo "📝 Setting up IAM role..."
ROLE_EXISTS=$(aws iam get-role --role-name $ROLE_NAME 2>/dev/null || echo "")

if [ -z "$ROLE_EXISTS" ]; then
    # Create role with trust policy
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json \
        --region $REGION
    
    # Wait for role to be created
    sleep 10
fi

# Update role policies
cat > policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:$REGION:$ACCOUNT_ID:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:PutEvents"
      ],
      "Resource": "arn:aws:events:$REGION:$ACCOUNT_ID:event-bus/storytailor-staging"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:$REGION:$ACCOUNT_ID:parameter/storytailor/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": [
        "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:storytailor-token-service-staging",
        "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:storytailor-auth-agent-staging"
      ]
    }
  ]
}
EOF

# Create or update the policy
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/IdPAgentPolicy"
aws iam create-policy \
    --policy-name IdPAgentPolicy \
    --policy-document file://policy.json \
    --region $REGION 2>/dev/null || \
aws iam create-policy-version \
    --policy-arn $POLICY_ARN \
    --policy-document file://policy.json \
    --set-as-default \
    --region $REGION

# Attach policies to role
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn $POLICY_ARN \
    --region $REGION

aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole \
    --region $REGION

# Create or update Lambda function
echo "📦 Deploying Lambda function..."
FUNCTION_EXISTS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null || echo "")

if [ -z "$FUNCTION_EXISTS" ]; then
    # Create new function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --role arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME \
        --handler handler.handler \
        --zip-file fileb://idp-agent-lambda.zip \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            OIDC_ISSUER=https://auth.storytailor.ai,
            OIDC_AUTH_ENDPOINT=https://auth.storytailor.ai/oauth/authorize,
            OIDC_TOKEN_ENDPOINT=https://auth.storytailor.ai/oauth/token,
            OIDC_USERINFO_ENDPOINT=https://auth.storytailor.ai/oauth/userinfo,
            OIDC_JWKS_URI=https://auth.storytailor.ai/.well-known/jwks.json,
            OIDC_REGISTRATION_ENDPOINT=https://auth.storytailor.ai/oauth/register,
            TOKEN_SERVICE_URL=https://token.storytailor.ai,
            EVENT_BUS_NAME=storytailor-staging
        }" \
        --region $REGION
    
    # Wait for function to be active
    echo "Waiting for function to be active..."
    aws lambda wait function-active --function-name $FUNCTION_NAME --region $REGION
else
    # Update existing function
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://idp-agent-lambda.zip \
        --region $REGION
    
    # Wait for update to complete
    aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION
    
    # Update configuration
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            OIDC_ISSUER=https://auth.storytailor.ai,
            OIDC_AUTH_ENDPOINT=https://auth.storytailor.ai/oauth/authorize,
            OIDC_TOKEN_ENDPOINT=https://auth.storytailor.ai/oauth/token,
            OIDC_USERINFO_ENDPOINT=https://auth.storytailor.ai/oauth/userinfo,
            OIDC_JWKS_URI=https://auth.storytailor.ai/.well-known/jwks.json,
            OIDC_REGISTRATION_ENDPOINT=https://auth.storytailor.ai/oauth/register,
            TOKEN_SERVICE_URL=https://token.storytailor.ai,
            EVENT_BUS_NAME=storytailor-staging
        }" \
        --region $REGION
fi

# Update Lambda with environment variables from SSM
echo "📝 Configuring environment variables..."
PARAMS=$(aws ssm get-parameters-by-path \
    --path "/storytailor/staging/" \
    --recursive \
    --with-decryption \
    --region $REGION \
    --query "Parameters[].{Name:Name,Value:Value}" \
    --output json)

# Build environment variables string
ENV_VARS="{"
ENV_VARS="${ENV_VARS}OIDC_ISSUER=https://auth.storytailor.ai,"
ENV_VARS="${ENV_VARS}OIDC_AUTH_ENDPOINT=https://auth.storytailor.ai/oauth/authorize,"
ENV_VARS="${ENV_VARS}OIDC_TOKEN_ENDPOINT=https://auth.storytailor.ai/oauth/token,"
ENV_VARS="${ENV_VARS}OIDC_USERINFO_ENDPOINT=https://auth.storytailor.ai/oauth/userinfo,"
ENV_VARS="${ENV_VARS}OIDC_JWKS_URI=https://auth.storytailor.ai/.well-known/jwks.json,"
ENV_VARS="${ENV_VARS}OIDC_REGISTRATION_ENDPOINT=https://auth.storytailor.ai/oauth/register,"
ENV_VARS="${ENV_VARS}TOKEN_SERVICE_URL=https://token.storytailor.ai,"
ENV_VARS="${ENV_VARS}EVENT_BUS_NAME=storytailor-staging,"

for param in $(echo $PARAMS | jq -c '.[]'); do
    NAME=$(echo $param | jq -r '.Name' | sed 's|/storytailor/staging/||')
    VALUE=$(echo $param | jq -r '.Value')
    ENV_VARS="${ENV_VARS}${NAME}=${VALUE},"
done

# Remove trailing comma and close
ENV_VARS="${ENV_VARS%,}}"

# Update function configuration
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="$ENV_VARS" \
    --region $REGION

# Create EventBridge rule for IdP events
echo "📝 Setting up EventBridge rules..."
aws events put-rule \
    --name "${FUNCTION_NAME}-oauth-events" \
    --event-pattern '{
        "source": ["storytailor.router", "storytailor.auth", "storytailor.webapp"],
        "detail-type": ["AUTHORIZE", "TOKEN", "USERINFO", "REVOKE_TOKEN", "GET_DISCOVERY"]
    }' \
    --state ENABLED \
    --event-bus-name storytailor-staging \
    --region $REGION

# Add Lambda permission for EventBridge
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id allow-eventbridge-oauth \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:$REGION:$ACCOUNT_ID:rule/storytailor-staging/${FUNCTION_NAME}-oauth-events \
    --region $REGION 2>/dev/null || true

# Add EventBridge target
aws events put-targets \
    --rule "${FUNCTION_NAME}-oauth-events" \
    --event-bus-name storytailor-staging \
    --targets "Id"="1","Arn"="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME" \
    --region $REGION

# Update API Gateway routes for OAuth endpoints
echo "📝 Updating API Gateway routes..."
API_ID="y1dqd1evp5"

# Add routes for OAuth endpoints
ROUTES=(
    "GET /.well-known/openid-configuration"
    "GET /oauth/authorize"
    "POST /oauth/authorize"
    "POST /oauth/token"
    "GET /oauth/userinfo"
    "POST /oauth/userinfo"
    "POST /oauth/revoke"
)

for ROUTE in "${ROUTES[@]}"; do
    METHOD=$(echo $ROUTE | cut -d' ' -f1)
    PATH=$(echo $ROUTE | cut -d' ' -f2)
    
    # Check if route exists
    ROUTE_ID=$(aws apigatewayv2 get-routes \
        --api-id $API_ID \
        --region $REGION \
        --query "Items[?RouteKey=='$ROUTE'].RouteId" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$ROUTE_ID" ]; then
        # Create new route
        aws apigatewayv2 create-route \
            --api-id $API_ID \
            --route-key "$ROUTE" \
            --target "integrations/cuvl5f1" \
            --region $REGION
    fi
done

# Test the deployment
echo "🧪 Testing IdP deployment..."
TEST_PAYLOAD=$(cat << EOF
{
    "detail-type": "GET_DISCOVERY",
    "detail": {}
}
EOF
)

aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload "$(echo $TEST_PAYLOAD | base64)" \
    --region $REGION \
    response.json

echo "Response:"
cat response.json | jq '.' 2>/dev/null || cat response.json
echo ""

# Cleanup
rm -rf $DEPLOY_DIR
rm -f idp-agent-lambda.zip
rm -f trust-policy.json
rm -f policy.json
rm -f response.json

echo "✅ IdP Agent deployed successfully!"
echo "📍 Function ARN: arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME"
echo "🌐 OIDC Discovery: https://auth.storytailor.ai/.well-known/openid-configuration"