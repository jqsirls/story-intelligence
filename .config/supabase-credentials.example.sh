#!/usr/bin/env bash
set -euo pipefail

# Example only. Do NOT commit real credentials.
# Copy to `.config/supabase-credentials.sh` and fill in values locally.

export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_ANON_KEY="[REDACTED_SUPABASE_ANON_KEY]"
export SUPABASE_SERVICE_ROLE_KEY="[REDACTED_SUPABASE_SERVICE_ROLE_KEY]"

