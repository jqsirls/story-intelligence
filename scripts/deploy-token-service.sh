#!/bin/bash

# Deploy TokenService Agent Lambda
# This agent handles JWT token generation and verification with AWS KMS

set -e

echo "🚀 Deploying TokenService Agent..."

# Configuration
FUNCTION_NAME="storytailor-token-service-staging"
ROLE_NAME="storytailor-token-service-role"
REGION="us-east-1"
ACCOUNT_ID="654654370424"
KMS_KEY_ALIAS="alias/storytailor-jwt-signing"

# Create deployment directory
DEPLOY_DIR="deploy-token-service"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy agent code
cp -r packages/token-service/* $DEPLOY_DIR/
cd $DEPLOY_DIR

# Install production dependencies
npm install --production

# Create Lambda deployment package
zip -r ../token-service-lambda.zip . -x "*.test.ts" -x "__tests__/*" -x "*.md"
cd ..

# Create KMS key if it doesn't exist
echo "📝 Setting up KMS key for JWT signing..."
KMS_KEY_ID=$(aws kms describe-key --key-id $KMS_KEY_ALIAS --region $REGION 2>/dev/null | jq -r '.KeyMetadata.KeyId' || echo "")

if [ -z "$KMS_KEY_ID" ]; then
    echo "Creating new KMS key..."
    KMS_RESPONSE=$(aws kms create-key \
        --description "Storytailor JWT signing key" \
        --key-usage SIGN_VERIFY \
        --key-spec RSA_2048 \
        --region $REGION)
    
    KMS_KEY_ID=$(echo $KMS_RESPONSE | jq -r '.KeyMetadata.KeyId')
    
    # Create alias
    aws kms create-alias \
        --alias-name $KMS_KEY_ALIAS \
        --target-key-id $KMS_KEY_ID \
        --region $REGION
fi

echo "KMS Key ID: $KMS_KEY_ID"

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
        "kms:Sign",
        "kms:Verify",
        "kms:GetPublicKey",
        "kms:DescribeKey",
        "kms:Encrypt",
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:$REGION:$ACCOUNT_ID:key/$KMS_KEY_ID"
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
    }
  ]
}
EOF

# Create or update the policy
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/TokenServicePolicy"
aws iam create-policy \
    --policy-name TokenServicePolicy \
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
        --zip-file fileb://token-service-lambda.zip \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            KMS_KEY_ID=$KMS_KEY_ID,
            TOKEN_ISSUER=https://auth.storytailor.ai,
            TOKEN_AUDIENCE=https://api.storytailor.ai
        }" \
        --region $REGION
    
    # Wait for function to be active
    echo "Waiting for function to be active..."
    aws lambda wait function-active --function-name $FUNCTION_NAME --region $REGION
else
    # Update existing function
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://token-service-lambda.zip \
        --region $REGION
    
    # Wait for update to complete
    aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION
    
    # Update configuration
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            KMS_KEY_ID=$KMS_KEY_ID,
            TOKEN_ISSUER=https://auth.storytailor.ai,
            TOKEN_AUDIENCE=https://api.storytailor.ai
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
    --query "Parameters[?Name!='/storytailor/staging/JWT_SECRET'].{Name:Name,Value:Value}" \
    --output json)

# Build environment variables string
ENV_VARS="{"
ENV_VARS="${ENV_VARS}KMS_KEY_ID=$KMS_KEY_ID,"
ENV_VARS="${ENV_VARS}TOKEN_ISSUER=https://auth.storytailor.ai,"
ENV_VARS="${ENV_VARS}TOKEN_AUDIENCE=https://api.storytailor.ai,"

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

# Create EventBridge rule for token events
echo "📝 Setting up EventBridge rules..."
aws events put-rule \
    --name "${FUNCTION_NAME}-token-events" \
    --event-pattern '{
        "source": ["storytailor.idp", "storytailor.auth"],
        "detail-type": ["GENERATE_TOKEN", "VERIFY_TOKEN", "REVOKE_TOKEN", "ROTATE_KEYS", "INTROSPECT_TOKEN"]
    }' \
    --state ENABLED \
    --event-bus-name storytailor-staging \
    --region $REGION

# Add Lambda permission for EventBridge
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id allow-eventbridge-token \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:$REGION:$ACCOUNT_ID:rule/storytailor-staging/${FUNCTION_NAME}-token-events \
    --region $REGION 2>/dev/null || true

# Add EventBridge target
aws events put-targets \
    --rule "${FUNCTION_NAME}-token-events" \
    --event-bus-name storytailor-staging \
    --targets "Id"="1","Arn"="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME" \
    --region $REGION

# Test the deployment
echo "🧪 Testing TokenService deployment..."
TEST_PAYLOAD=$(cat << EOF
{
    "detail-type": "GET_JWKS",
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
cat response.json
echo ""

# Cleanup
rm -rf $DEPLOY_DIR
rm -f token-service-lambda.zip
rm -f trust-policy.json
rm -f policy.json
rm -f response.json

echo "✅ TokenService Agent deployed successfully!"
echo "📍 Function ARN: arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME"
echo "🔑 KMS Key ID: $KMS_KEY_ID"