#!/bin/bash

# Simple SQL syntax validation script
echo "Validating SQL migration files..."

# Check if files exist
for file in "20240101000000_initial_schema.sql" "20240101000001_rls_policies.sql" "20240101000002_enhanced_schema_and_policies.sql"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
        
        # Basic syntax checks
        if grep -q "CREATE TABLE" "$file"; then
            echo "  ✓ Contains CREATE TABLE statements"
        fi
        
        if grep -q "CREATE POLICY" "$file"; then
            echo "  ✓ Contains CREATE POLICY statements"
        fi
        
        if grep -q "CREATE FUNCTION" "$file"; then
            echo "  ✓ Contains CREATE FUNCTION statements"
        fi
        
        # Check for common syntax errors
        if grep -q ";" "$file"; then
            echo "  ✓ Contains statement terminators"
        else
            echo "  ⚠ Warning: No statement terminators found"
        fi
        
        # Check for balanced parentheses (basic check)
        open_parens=$(grep -o "(" "$file" | wc -l)
        close_parens=$(grep -o ")" "$file" | wc -l)
        if [ "$open_parens" -eq "$close_parens" ]; then
            echo "  ✓ Parentheses appear balanced ($open_parens pairs)"
        else
            echo "  ⚠ Warning: Unbalanced parentheses (open: $open_parens, close: $close_parens)"
        fi
        
        echo ""
    else
        echo "✗ $file not found"
    fi
done

echo "SQL validation complete!"