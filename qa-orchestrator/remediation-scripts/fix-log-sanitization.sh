#!/bin/bash
# Log Sanitization Remediation Script
# Implements proper PII hashing and removes raw prompts from logs

set -e

echo "🔒 LOG SANITIZATION REMEDIATION"
echo "==============================="

# 1. Create centralized logging utility with PII hashing
echo "1. Creating centralized logging utility..."
mkdir -p packages/shared-utils/src/logging

cat > packages/shared-utils/src/logging/SecureLogger.ts << 'EOF'
import crypto from 'crypto';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  childName?: string;
  parentEmail?: string;
  userInput?: string;
  [key: string]: any;
}

export class SecureLogger {
  private static instance: SecureLogger;
  private hashSalt: string;

  private constructor() {
    this.hashSalt = process.env.LOG_HASH_SALT || 'storytailor-default-salt';
  }

  public static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  private hashPII(value: string): string {
    return crypto
      .createHmac('sha256', this.hashSalt)
      .update(value)
      .digest('hex')
      .substring(0, 12);
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = { ...context };

    // Hash child names
    if (sanitized.childName) {
      sanitized.childName = `child_${this.hashPII(sanitized.childName)}`;
    }

    // Hash email addresses
    if (sanitized.parentEmail) {
      sanitized.parentEmail = `email_${this.hashPII(sanitized.parentEmail)}`;
    }

    // Hash user input (prompts)
    if (sanitized.userInput) {
      sanitized.userInput = `prompt_${this.hashPII(sanitized.userInput)}`;
    }

    // Hash any other potential PII fields
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        // Check for email patterns
        if (sanitized[key].includes('@') && sanitized[key].includes('.')) {
          sanitized[key] = `email_${this.hashPII(sanitized[key])}`;
        }
        // Check for phone number patterns
        else if (/\d{3}-\d{3}-\d{4}|\(\d{3}\)\s*\d{3}-\d{4}/.test(sanitized[key])) {
          sanitized[key] = `phone_${this.hashPII(sanitized[key])}`;
        }
        // Check for address patterns (basic)
        else if (/\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)/i.test(sanitized[key])) {
          sanitized[key] = `address_${this.hashPII(sanitized[key])}`;
        }
      }
    });

    return sanitized;
  }

  public info(message: string, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    console.log(JSON.stringify({
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...sanitizedContext
    }));
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...sanitizedContext
    }));
  }

  public debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const sanitizedContext = context ? this.sanitizeContext(context) : {};
      console.debug(JSON.stringify({
        level: 'DEBUG',
        message,
        timestamp: new Date().toISOString(),
        ...sanitizedContext
      }));
    }
  }

  public warn(message: string, context?: LogContext): void {
    const sanitizedContext = context ? this.sanitizeContext(context) : {};
    console.warn(JSON.stringify({
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      ...sanitizedContext
    }));
  }
}

export const logger = SecureLogger.getInstance();
EOF

# 2. Update all packages to use SecureLogger
echo "2. Updating all packages to use SecureLogger..."

# Find all TypeScript files that use console.log, console.error, etc.
find packages -name "*.ts" -not -path "*/node_modules/*" | while read file; do
    echo "   Updating $file"
    
    # Add import for SecureLogger if console logging is used
    if grep -q "console\." "$file"; then
        # Add import at the top
        sed -i '1i import { logger } from "@storytailor/shared-utils/logging/SecureLogger";' "$file"
        
        # Replace console.log with logger.info
        sed -i 's/console\.log(/logger.info(/g' "$file"
        
        # Replace console.error with logger.error
        sed -i 's/console\.error(/logger.error(/g' "$file"
        
        # Replace console.warn with logger.warn
        sed -i 's/console\.warn(/logger.warn(/g' "$file"
        
        # Replace console.debug with logger.debug
        sed -i 's/console\.debug(/logger.debug(/g' "$file"
    fi
done

# 3. Fix specific PII logging violations found in audit
echo "3. Fixing specific PII logging violations..."

# Fix child name logging in story creation
cat > packages/content-agent/src/ContentAgent.ts.logging.patch << 'EOF'
--- a/packages/content-agent/src/ContentAgent.ts
+++ b/packages/content-agent/src/ContentAgent.ts
@@ -45,7 +45,7 @@ export class ContentAgent {
   
   public async createStory(request: StoryRequest): Promise<StoryResponse> {
-    logger.info(`Story created for child: ${request.childName}, age ${request.childAge}`);
+    logger.info('Story created for child', { childName: request.childName, childAge: request.childAge });
     
     try {
       const response = await this.generateStoryContent(request);
EOF

# Fix parent email logging in notification service
cat > packages/child-safety-agent/src/services/ParentNotificationService.ts.logging.patch << 'EOF'
--- a/packages/child-safety-agent/src/services/ParentNotificationService.ts
+++ b/packages/child-safety-agent/src/services/ParentNotificationService.ts
@@ -67,7 +67,7 @@ export class ParentNotificationService {
   
   private async sendEmail(email: string, subject: string, body: string): Promise<void> {
     try {
-      logger.error(`Failed to send notification to ${email}`);
+      logger.error('Failed to send notification', { parentEmail: email });
     } catch (error) {
       logger.error('Email sending failed', error);
     }
EOF

# Fix user input logging in debug mode
find packages -name "*.ts" -not -path "*/node_modules/*" | while read file; do
    # Replace direct user input logging with hashed version
    sed -i 's/logger\.debug(`User input: \${.*}`)/logger.debug("User input received", { userInput: userInput })/g' "$file"
    sed -i 's/logger\.info(`User input: \${.*}`)/logger.info("User input received", { userInput: userInput })/g' "$file"
done

# 4. Apply the patches
echo "4. Applying logging patches..."
if [ -f packages/content-agent/src/ContentAgent.ts.logging.patch ]; then
    patch packages/content-agent/src/ContentAgent.ts < packages/content-agent/src/ContentAgent.ts.logging.patch
fi

if [ -f packages/child-safety-agent/src/services/ParentNotificationService.ts.logging.patch ]; then
    patch packages/child-safety-agent/src/services/ParentNotificationService.ts.logging.patch < packages/child-safety-agent/src/services/ParentNotificationService.ts.logging.patch
fi

# 5. Create log analysis script to verify compliance
echo "5. Creating log analysis verification script..."
cat > qa-orchestrator/verify-log-sanitization.py << 'EOF'
#!/usr/bin/env python3
"""
Log Sanitization Verification Script
Scans logs to ensure no PII or raw prompts are exposed
"""

import re
import json
import sys
from typing import List, Dict, Any

class LogSanitizationVerifier:
    def __init__(self):
        self.pii_patterns = [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\b\d{3}-\d{3}-\d{4}\b',  # Phone number
            r'\b\d{3}\s\d{3}\s\d{4}\b',  # Phone number (spaces)
            r'\(\d{3}\)\s*\d{3}-\d{4}',  # Phone number (parentheses)
            r'\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)\b',  # Address
            r'\bchild:\s*[A-Z][a-z]+\s+[A-Z][a-z]+',  # Child names
        ]
        
        self.compliant_patterns = [
            r'child_[a-f0-9]{12}',  # Hashed child reference
            r'email_[a-f0-9]{12}',  # Hashed email reference
            r'prompt_[a-f0-9]{12}',  # Hashed prompt reference
            r'phone_[a-f0-9]{12}',  # Hashed phone reference
            r'address_[a-f0-9]{12}',  # Hashed address reference
        ]
    
    def scan_log_line(self, line: str) -> Dict[str, Any]:
        """Scan a single log line for PII violations"""
        violations = []
        compliant_refs = []
        
        # Check for PII patterns
        for pattern in self.pii_patterns:
            matches = re.findall(pattern, line, re.IGNORECASE)
            if matches:
                violations.extend(matches)
        
        # Check for compliant patterns
        for pattern in self.compliant_patterns:
            matches = re.findall(pattern, line)
            if matches:
                compliant_refs.extend(matches)
        
        return {
            'line': line.strip(),
            'violations': violations,
            'compliant_refs': compliant_refs,
            'has_violations': len(violations) > 0
        }
    
    def scan_logs(self, log_content: str) -> Dict[str, Any]:
        """Scan entire log content"""
        lines = log_content.split('\n')
        total_lines = len(lines)
        violation_lines = []
        compliant_lines = []
        
        for i, line in enumerate(lines, 1):
            if line.strip():
                result = self.scan_log_line(line)
                if result['has_violations']:
                    violation_lines.append({
                        'line_number': i,
                        **result
                    })
                elif result['compliant_refs']:
                    compliant_lines.append({
                        'line_number': i,
                        **result
                    })
        
        return {
            'total_lines': total_lines,
            'violation_count': len(violation_lines),
            'compliant_count': len(compliant_lines),
            'violations': violation_lines,
            'compliant_examples': compliant_lines[:10],  # First 10 examples
            'compliance_rate': (total_lines - len(violation_lines)) / total_lines * 100
        }

def main():
    if len(sys.argv) != 2:
        print("Usage: python verify-log-sanitization.py <log_file>")
        sys.exit(1)
    
    log_file = sys.argv[1]
    verifier = LogSanitizationVerifier()
    
    try:
        with open(log_file, 'r') as f:
            log_content = f.read()
        
        results = verifier.scan_logs(log_content)
        
        print(f"Log Sanitization Verification Results:")
        print(f"=====================================")
        print(f"Total lines scanned: {results['total_lines']}")
        print(f"PII violations found: {results['violation_count']}")
        print(f"Compliant references: {results['compliant_count']}")
        print(f"Compliance rate: {results['compliance_rate']:.2f}%")
        
        if results['violations']:
            print(f"\nVIOLATIONS FOUND:")
            for violation in results['violations'][:5]:  # Show first 5
                print(f"  Line {violation['line_number']}: {violation['violations']}")
        
        if results['compliant_examples']:
            print(f"\nCOMPLIANT EXAMPLES:")
            for example in results['compliant_examples'][:3]:  # Show first 3
                print(f"  Line {example['line_number']}: {example['compliant_refs']}")
        
        # Exit with error code if violations found
        sys.exit(1 if results['violation_count'] > 0 else 0)
        
    except FileNotFoundError:
        print(f"Error: Log file '{log_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
EOF

chmod +x qa-orchestrator/verify-log-sanitization.py

# 6. Update package.json to include shared-utils dependency
echo "6. Updating package dependencies..."
find packages -name "package.json" -not -path "*/node_modules/*" | while read package_file; do
    # Add shared-utils dependency if not present
    if ! grep -q "@storytailor/shared-utils" "$package_file"; then
        # Add to dependencies
        sed -i '/"dependencies": {/a\    "@storytailor/shared-utils": "workspace:*",' "$package_file"
    fi
done

# 7. Create environment variable for log hash salt
echo "7. Setting up log hash salt environment variable..."
echo "LOG_HASH_SALT=storytailor-production-salt-$(openssl rand -hex 16)" >> .env.production
echo "LOG_HASH_SALT=storytailor-staging-salt-$(openssl rand -hex 16)" >> .env.staging
echo "LOG_HASH_SALT=storytailor-dev-salt-$(openssl rand -hex 16)" >> .env.development

echo "✅ Log sanitization remediation completed!"
echo ""
echo "VERIFICATION STEPS:"
echo "1. Run the log verification script on existing logs"
echo "2. Deploy updated logging to staging environment"
echo "3. Generate test logs and verify PII is properly hashed"
echo "4. Update monitoring alerts to detect PII in logs"
echo ""
echo "USAGE:"
echo "python qa-orchestrator/verify-log-sanitization.py /path/to/logfile.log"