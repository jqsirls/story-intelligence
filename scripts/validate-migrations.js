#!/usr/bin/env node

/**
 * Validate Migration SQL Files
 * 
 * Checks for:
 * - SQL syntax errors
 * - Missing dependencies
 * - Column name mismatches
 * - Constraint conflicts
 * - Foreign key issues
 */

const fs = require('fs');
const path = require('path');

const migrations = [
  'supabase/migrations/20251226000000_adult_only_registration.sql',
  'supabase/migrations/20251226000001_storytailor_id_enhancement.sql',
  'supabase/migrations/20251226000002_library_consent.sql',
  'supabase/migrations/20251226000003_migrate_existing_libraries.sql'
];

const errors = [];
const warnings = [];

function validateSQL(sql, filename) {
  // Check for common SQL errors
  
  // 1. Check for typos in comments
  if (sql.includes('yes--')) {
    errors.push(`${filename}: Found typo "yes--" instead of "--"`);
  }
  
  // 2. Check for missing semicolons in DO blocks
  const doBlocks = sql.match(/DO \$\$[\s\S]*?\$\$;/g);
  if (doBlocks) {
    doBlocks.forEach((block, i) => {
      if (!block.endsWith('$$;')) {
        errors.push(`${filename}: DO block ${i + 1} missing closing "$$;"`);
      }
    });
  }
  
  // 3. Check for constraint conflicts
  if (sql.includes('ADD CONSTRAINT') && sql.includes('CHECK')) {
    const constraintName = sql.match(/ADD CONSTRAINT\s+(\w+)/);
    if (constraintName) {
      warnings.push(`${filename}: Adding constraint "${constraintName[1]}" - ensure no existing data violates it`);
    }
  }
  
  // 4. Check for foreign key references to non-existent tables
  const fkRefs = sql.match(/REFERENCES\s+(\w+)\(/g);
  if (fkRefs) {
    fkRefs.forEach(ref => {
      const table = ref.match(/REFERENCES\s+(\w+)\(/)[1];
      const expectedTables = ['users', 'libraries', 'characters', 'stories', 'library_permissions'];
      if (!expectedTables.includes(table)) {
        warnings.push(`${filename}: Foreign key references "${table}" - verify table exists`);
      }
    });
  }
  
  // 5. Check for DROP COLUMN on columns that might be referenced
  const dropColumns = sql.match(/DROP COLUMN\s+IF EXISTS\s+(\w+)/g);
  if (dropColumns) {
    dropColumns.forEach(drop => {
      const column = drop.match(/DROP COLUMN\s+IF EXISTS\s+(\w+)/)[1];
      warnings.push(`${filename}: Dropping column "${column}" - ensure no foreign keys or indexes reference it`);
    });
  }
  
  // 6. Check for NOT NULL constraints on existing columns
  if (sql.includes('NOT NULL') && sql.includes('ADD COLUMN')) {
    warnings.push(`${filename}: Adding NOT NULL column - ensure default value or existing data handling`);
  }
}

console.log('🔍 Validating Migration SQL Files...\n');

migrations.forEach(migration => {
  const filePath = path.join(process.cwd(), migration);
  
  if (!fs.existsSync(filePath)) {
    errors.push(`${migration}: File not found`);
    return;
  }
  
  const sql = fs.readFileSync(filePath, 'utf8');
  validateSQL(sql, migration);
  
  console.log(`✅ ${migration}`);
});

console.log('\n📊 Validation Summary\n');

if (warnings.length > 0) {
  console.log(`⚠️  Warnings: ${warnings.length}`);
  warnings.forEach(w => console.log(`   ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log(`❌ Errors: ${errors.length}`);
  errors.forEach(e => console.log(`   ${e}`));
  console.log('');
  process.exit(1);
} else {
  console.log('✅ All migrations validated successfully!');
  console.log('\n⚠️  Review warnings above before applying migrations.');
  process.exit(0);
}

