# Storytailor Multi-Agent System Infrastructure
# Simplified Terraform configuration for initial deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Storytailor"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

# Local values
locals {
  name_prefix = "storytailor-${var.environment}"
  common_tags = {
    Project     = "Storytailor"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# S3 Bucket for Assets
resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets-${random_id.suffix.hex}"
  
  tags = merge(local.common_tags, {
    Name = "Storytailor Assets"
    Type = "Assets"
  })
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Parameter Store for configuration
resource "aws_ssm_parameter" "supabase_url" {
  name  = "/${local.name_prefix}/supabase/url"
  type  = "String"
  value = var.supabase_url
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "supabase_anon_key" {
  name  = "/${local.name_prefix}/supabase/anon_key"
  type  = "SecureString"
  value = var.supabase_anon_key
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "supabase_service_key" {
  name  = "/${local.name_prefix}/supabase/service_key"
  type  = "SecureString"
  value = var.supabase_service_key
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "openai_api_key" {
  name  = "/${local.name_prefix}/openai/api_key"
  type  = "SecureString"
  value = var.openai_api_key
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "elevenlabs_api_key" {
  name  = "/${local.name_prefix}/elevenlabs/api_key"
  type  = "SecureString"
  value = var.elevenlabs_api_key
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "stripe_secret_key" {
  name  = "/${local.name_prefix}/stripe/secret_key"
  type  = "SecureString"
  value = var.stripe_secret_key
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.name_prefix}/jwt/secret"
  type  = "SecureString"
  value = var.jwt_secret
  
  tags = local.common_tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"
  
  tags = merge(local.common_tags, {
    Name = "Alert Notifications"
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "main" {
  name              = "/aws/storytailor/${var.environment}"
  retention_in_days = var.log_retention_days
  
  tags = merge(local.common_tags, {
    Name = "Storytailor Logs"
  })
}

# Output values
output "s3_assets_bucket" {
  description = "S3 assets bucket name"
  value       = aws_s3_bucket.assets.bucket
}

output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region"
  value       = data.aws_region.current.name
}

output "ssm_parameters" {
  description = "SSM Parameter names"
  value = {
    supabase_url         = aws_ssm_parameter.supabase_url.name
    supabase_anon_key    = aws_ssm_parameter.supabase_anon_key.name
    supabase_service_key = aws_ssm_parameter.supabase_service_key.name
    openai_api_key       = aws_ssm_parameter.openai_api_key.name
    elevenlabs_api_key   = aws_ssm_parameter.elevenlabs_api_key.name
    stripe_secret_key    = aws_ssm_parameter.stripe_secret_key.name
    jwt_secret           = aws_ssm_parameter.jwt_secret.name
  }
}