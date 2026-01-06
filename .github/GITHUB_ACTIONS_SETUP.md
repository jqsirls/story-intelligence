# GitHub Actions CI/CD Setup Guide

This guide explains how to configure GitHub repository settings for the Storytailor CI/CD pipeline.

## Required GitHub Secrets

Navigate to your repository → Settings → Secrets and variables → Actions → Secrets

### AWS Credentials (Required)
- `AWS_ACCESS_KEY_ID` - AWS access key for staging deployments
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for staging deployments
- `AWS_ACCESS_KEY_ID_PROD` - AWS access key for production deployments  
- `AWS_SECRET_ACCESS_KEY_PROD` - AWS secret key for production deployments

### Optional Integration Secrets
- `SLACK_WEBHOOK` - Slack webhook URL for notifications (optional)
- `DEPLOYMENT_API` - API endpoint for deployment tracking (optional)
- `DEPLOYMENT_TOKEN` - Authentication token for deployment API (optional)

## Required GitHub Variables

Navigate to your repository → Settings → Secrets and variables → Actions → Variables

### Feature Flags
- `ENABLE_SLACK_NOTIFICATIONS` - Set to `true` to enable Slack notifications
- `ENABLE_DEPLOYMENT_TRACKING` - Set to `true` to enable deployment tracking

## Required Environments

Navigate to your repository → Settings → Environments

### Create Two Environments:
1. **staging**
   - Add protection rules as needed
   - Add reviewers if desired
   - Configure deployment branch rules

2. **production**
   - Add protection rules (recommended)
   - Add required reviewers
   - Configure deployment branch rules
   - Consider adding deployment delay

## AWS IAM Permissions

The AWS credentials need the following permissions:

### Staging IAM Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:ListFunctions",
        "s3:PutObject",
        "s3:GetObject",
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### Production IAM Policy
Same as staging but consider adding:
- MFA requirement
- IP restrictions
- More granular resource restrictions

## Setting Up Slack Notifications (Optional)

1. Create a Slack App at https://api.slack.com/apps
2. Add Incoming Webhook functionality
3. Install to your workspace and select a channel
4. Copy the webhook URL
5. Add as `SLACK_WEBHOOK` secret in GitHub

## Setting Up Deployment Tracking (Optional)

If you have a deployment tracking system:
1. Add the API endpoint as `DEPLOYMENT_API` secret
2. Add the authentication token as `DEPLOYMENT_TOKEN` secret
3. Set `ENABLE_DEPLOYMENT_TRACKING` variable to `true`

## Troubleshooting

### "Context access might be invalid" warnings
These warnings appear because the secrets aren't yet configured in your repository. Once you add the secrets, these warnings will disappear.

### Environment protection rules
If deployments fail with permission errors, check:
- Environment protection rules
- Required reviewers
- Branch protection rules

### AWS credential errors
Ensure the IAM user/role has the necessary permissions and the credentials are valid.

## Quick Start

Minimum setup to get started:
1. Add AWS credentials as secrets
2. Create staging and production environments
3. All optional features are disabled by default

The pipeline will work with just AWS credentials - all other integrations are optional.