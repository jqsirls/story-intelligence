#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:-/tmp/db.types.ts}"
OUTPUT="${2:-packages/shared-types/src/types/database.ts}"

if [[ ! -f "$INPUT" ]]; then
  echo "Input file not found: $INPUT" >&2
  exit 1
fi

# Keep only the first emitted module (up to before the second `export type Json`)
awk 'BEGIN{c=0} /^export type Json/{c++; if(c>1) exit} {print}' "$INPUT" > "$OUTPUT"

echo "Normalized Supabase types written to $OUTPUT"

