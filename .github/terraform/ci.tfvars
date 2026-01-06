# Terraform variables for CI environment
# Used for infrastructure validation in CI pipeline

environment = "ci"
aws_region = "us-east-1"

# VPC Configuration
vpc_cidr = "10.1.0.0/16"

# Redis Configuration (minimal for CI)
redis_node_type = "cache.t3.micro"
redis_num_nodes = 1

# Lambda Configuration (minimal resources for CI)
lambda_reserved_concurrency = {
  router           = 10
  auth_agent      = 5
  storytailor_agent = 10
  content_agent   = 5
  library_agent   = 5
  emotion_agent   = 5
  commerce_agent  = 5
  insights_agent  = 5
  smart_home_agent = 5
  universal_agent = 10
}

# Monitoring Configuration
log_retention_days = 3
enable_debug_logging = true

# Security Configuration
enable_waf = false  # Disabled for CI to reduce costs
enable_xray_tracing = false

# Cost Optimization
enable_cost_optimization = true
enable_auto_scaling = false

# Feature Flags (disabled for CI)
enable_smart_home = false
enable_voice_synthesis = false
enable_compliance_monitoring = false

# Backup Configuration (minimal for CI)
backup_retention_days = 1

# Performance Configuration (relaxed for CI)
api_gateway_throttle_rate = 100
api_gateway_throttle_burst = 200

# Environment-specific overrides
environment_config = {
  lambda_memory_multiplier = 0.5  # Reduce memory for CI
  lambda_timeout_multiplier = 0.5  # Reduce timeout for CI
  redis_node_type_override = "cache.t3.micro"
  enable_detailed_monitoring = false
  log_level = "DEBUG"
}

# CORS Configuration for CI
cors_allowed_origins = ["*"]

# Additional tags for CI resources
additional_tags = {
  Purpose = "CI"
  AutoDelete = "true"
  Owner = "CI-Pipeline"
}