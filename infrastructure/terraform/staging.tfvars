# Staging Environment Configuration
environment = "staging"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr = "10.1.0.0/16"

# Redis Configuration (smaller for staging)
redis_node_type = "cache.t3.micro"
redis_num_nodes = 1

# Lambda Configuration
lambda_reserved_concurrency = {
  router           = 20
  auth_agent      = 10
  storytailor_agent = 30
  content_agent   = 20
  library_agent   = 10
  emotion_agent   = 5
  commerce_agent  = 10
  insights_agent  = 5
  smart_home_agent = 5
  universal_agent = 25
}

# Monitoring Configuration
log_retention_days = 7
enable_debug_logging = true

# Performance Configuration
api_gateway_throttle_rate = 100
api_gateway_throttle_burst = 200

# Cost Optimization for staging
enable_cost_optimization = true

# Feature Flags
enable_smart_home = true
enable_voice_synthesis = true
enable_compliance_monitoring = true

# CORS for development
cors_allowed_origins = ["*"]

# Environment-specific config
environment_config = {
  lambda_memory_multiplier = 0.5
  lambda_timeout_multiplier = 1.0
  enable_detailed_monitoring = true
  log_level = "DEBUG"
}

# Alert configuration
alert_email_addresses = []

# Additional tags
additional_tags = {
  Purpose = "Development"
  AutoShutdown = "true"
}