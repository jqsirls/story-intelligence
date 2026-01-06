# IAM Permissions Fixed for Universal Agent Lambda

## Summary

Fixed AWS IAM permissions to allow the Universal Agent Lambda to invoke the Content Agent Lambda function.

## Issue

The Universal Agent Lambda was failing with:
```
User: arn:aws:sts::326181217496:assumed-role/storytailor-lambda-role-staging/storytailor-universal-agent-production 
is not authorized to perform: lambda:InvokeFunction on resource: 
arn:aws:lambda:us-east-1:326181217496:function:storytailor-content-agent-production
```

## Solution

Created an inline IAM policy `UniversalAgentInvokeContentAgent` on both:
- `storytailor-lambda-role-production`
- `storytailor-lambda-role-staging`

The policy grants:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-east-1:326181217496:function:storytailor-content-agent-production"
    }
  ]
}
```

## Script Created

**File**: `scripts/fix-universal-agent-lambda-permissions.sh`

**Usage**:
```bash
./scripts/fix-universal-agent-lambda-permissions.sh [production|staging]
```

## Verification

Both roles have been updated:
- ✅ `storytailor-lambda-role-production` - Policy created
- ✅ `storytailor-lambda-role-staging` - Policy created

## Next Steps

1. **Wait 30-60 seconds** for IAM changes to propagate
2. **Re-run the pipeline integration test**:
   ```bash
   TEST_EMAIL="j+1226@jqsirls.com" TEST_PASSWORD="Fntra2015!" \
   node scripts/test-pipeline-integration.js
   ```

## Status Update

**Progress**: IAM permissions are now working! The error changed from "not authorized" to "Story generation failed", which means:
- ✅ Lambda invocation permission is working
- ✅ The Content Agent Lambda is being called
- ⚠️  There's a different error in the Content Agent Lambda itself (needs investigation)

## Current Test Results

- ✅ Authentication: Working
- ✅ Character creation: Working
- ⚠️  Story creation: Lambda invocation works, but Content Agent is returning an error
- ⚠️  Need to check CloudWatch logs for Content Agent error details

## Notes

- IAM changes can take 30-60 seconds to propagate across AWS
- If errors persist, verify the policy was attached correctly:
  ```bash
  aws iam get-role-policy \
    --role-name storytailor-lambda-role-production \
    --policy-name UniversalAgentInvokeContentAgent
  ```

