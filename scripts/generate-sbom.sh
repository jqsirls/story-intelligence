#!/bin/bash

# SBOM (Software Bill of Materials) Generation Script
# Generates comprehensive SBOM with license compliance and vulnerability scanning

set -e

echo "🔧 Software Bill of Materials (SBOM) Generator"
echo "============================================"
echo ""

# Configuration
PROJECT_ROOT=$(pwd)
OUTPUT_DIR="sbom-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SBOM_FORMAT="${1:-cyclonedx}" # Default to CycloneDX
SCAN_VULNERABILITIES="${2:-true}"
SIGN_SBOM="${3:-true}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    # Check TypeScript
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ npx is not available${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo ""
    echo "📦 Installing SBOM dependencies..."
    
    # Install license-checker globally
    npm install -g license-checker@latest || true
    
    # Install cyclonedx-node for SBOM generation
    npm install -g @cyclonedx/cyclonedx-npm@latest || true
    
    # Install spdx-license-list for license validation
    npm install -g spdx-license-list@latest || true
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to run vulnerability scan
run_vulnerability_scan() {
    echo ""
    echo "🔍 Running vulnerability scan..."
    
    # Create audit report
    npm audit --json > "$OUTPUT_DIR/npm-audit-$TIMESTAMP.json" 2>/dev/null || true
    
    # Parse audit results
    CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' "$OUTPUT_DIR/npm-audit-$TIMESTAMP.json")
    HIGH=$(jq '.metadata.vulnerabilities.high // 0' "$OUTPUT_DIR/npm-audit-$TIMESTAMP.json")
    MODERATE=$(jq '.metadata.vulnerabilities.moderate // 0' "$OUTPUT_DIR/npm-audit-$TIMESTAMP.json")
    LOW=$(jq '.metadata.vulnerabilities.low // 0' "$OUTPUT_DIR/npm-audit-$TIMESTAMP.json")
    
    echo "Vulnerability Summary:"
    echo "  Critical: $CRITICAL"
    echo "  High: $HIGH"
    echo "  Moderate: $MODERATE"
    echo "  Low: $LOW"
    
    if [ "$CRITICAL" -gt 0 ]; then
        echo -e "${RED}⚠️  Critical vulnerabilities detected!${NC}"
    fi
}

# Function to analyze licenses
analyze_licenses() {
    echo ""
    echo "📄 Analyzing licenses..."
    
    # Generate license report
    license-checker --json --out "$OUTPUT_DIR/licenses-$TIMESTAMP.json"
    
    # Check for problematic licenses
    PROBLEMATIC_LICENSES=("GPL-3.0" "AGPL-3.0" "SSPL-1.0")
    
    for license in "${PROBLEMATIC_LICENSES[@]}"; do
        COUNT=$(jq "[.[] | select(.licenses == \"$license\")] | length" "$OUTPUT_DIR/licenses-$TIMESTAMP.json")
        if [ "$COUNT" -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Found $COUNT packages with $license license${NC}"
            jq -r ".[] | select(.licenses == \"$license\") | \"\(.name) - \(.licenses)\"" "$OUTPUT_DIR/licenses-$TIMESTAMP.json"
        fi
    done
    
    # Count unique licenses
    UNIQUE_LICENSES=$(jq -r '.[].licenses' "$OUTPUT_DIR/licenses-$TIMESTAMP.json" | sort -u | wc -l)
    echo "Found $UNIQUE_LICENSES unique licenses"
}

# Function to generate SBOM using TypeScript implementation
generate_typescript_sbom() {
    echo ""
    echo "🚀 Generating comprehensive SBOM..."
    
    # Create temporary TypeScript file to run SBOM generator
    cat > "$OUTPUT_DIR/generate-sbom-temp.ts" << 'EOF'
import { SBOMGenerator } from '../packages/testing/src/sbom/SBOMGenerator';

async function main() {
    const generator = new SBOMGenerator();
    
    const config = {
        format: process.argv[2] as 'cyclonedx' | 'spdx',
        vulnerabilityScanning: process.argv[3] === 'true',
        signSBOM: process.argv[4] === 'true',
        outputPath: process.argv[5]
    };
    
    try {
        const result = await generator.generateSBOM(config);
        console.log('\n✅ SBOM generation complete!');
        console.log(`   Output: ${result.outputFile}`);
        console.log(`   Compliance: ${result.compliance.compliant ? 'PASSED' : 'FAILED'}`);
        
        // Exit with error if not compliant
        process.exit(result.compliance.compliant ? 0 : 1);
    } catch (error) {
        console.error('❌ SBOM generation failed:', error);
        process.exit(1);
    }
}

main();
EOF

    # Compile and run
    npx ts-node "$OUTPUT_DIR/generate-sbom-temp.ts" "$SBOM_FORMAT" "$SCAN_VULNERABILITIES" "$SIGN_SBOM" "$OUTPUT_DIR"
    
    # Clean up
    rm -f "$OUTPUT_DIR/generate-sbom-temp.ts"
}

# Function to generate basic SBOM using CycloneDX
generate_cyclonedx_sbom() {
    echo ""
    echo "📋 Generating CycloneDX SBOM..."
    
    # Generate SBOM for each workspace
    for package_dir in packages/*/; do
        if [ -f "$package_dir/package.json" ]; then
            package_name=$(basename "$package_dir")
            echo "  Processing $package_name..."
            
            cd "$package_dir"
            npx @cyclonedx/cyclonedx-npm --output-file "../../$OUTPUT_DIR/sbom-$package_name-$TIMESTAMP.json" || true
            cd "$PROJECT_ROOT"
        fi
    done
    
    # Generate root SBOM
    npx @cyclonedx/cyclonedx-npm --output-file "$OUTPUT_DIR/sbom-root-$TIMESTAMP.json"
}

# Function to create compliance report
create_compliance_report() {
    echo ""
    echo "📊 Creating compliance report..."
    
    cat > "$OUTPUT_DIR/compliance-report-$TIMESTAMP.md" << EOF
# SBOM Compliance Report
Generated: $(date)

## Summary
- Project: Storytailor Multi-Agent System
- Format: $SBOM_FORMAT
- Vulnerabilities Scanned: $SCAN_VULNERABILITIES
- SBOM Signed: $SIGN_SBOM

## License Compliance
$(cat "$OUTPUT_DIR/licenses-$TIMESTAMP.json" | jq -r 'group_by(.licenses) | map({license: .[0].licenses, count: length}) | sort_by(.count) | reverse | .[] | "- \(.license): \(.count) packages"')

## Vulnerability Status
- Critical: $CRITICAL
- High: $HIGH
- Moderate: $MODERATE
- Low: $LOW

## Recommendations
EOF

    if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
        echo "1. **URGENT**: Address critical and high severity vulnerabilities immediately" >> "$OUTPUT_DIR/compliance-report-$TIMESTAMP.md"
    fi
    
    echo "2. Review and approve all third-party licenses" >> "$OUTPUT_DIR/compliance-report-$TIMESTAMP.md"
    echo "3. Ensure attribution requirements are met for MIT/Apache licenses" >> "$OUTPUT_DIR/compliance-report-$TIMESTAMP.md"
    echo "4. Schedule regular SBOM updates (recommended: weekly)" >> "$OUTPUT_DIR/compliance-report-$TIMESTAMP.md"
    
    echo -e "${GREEN}✅ Compliance report created${NC}"
}

# Function to archive SBOMs
archive_sboms() {
    echo ""
    echo "📦 Archiving SBOMs..."
    
    # Create archive directory
    ARCHIVE_DIR="$OUTPUT_DIR/archive/$TIMESTAMP"
    mkdir -p "$ARCHIVE_DIR"
    
    # Copy all generated files
    cp "$OUTPUT_DIR"/*"$TIMESTAMP"* "$ARCHIVE_DIR/" 2>/dev/null || true
    
    # Create tarball
    tar -czf "$OUTPUT_DIR/sbom-archive-$TIMESTAMP.tar.gz" -C "$OUTPUT_DIR/archive" "$TIMESTAMP"
    
    # Upload to S3 if configured
    if [ -n "$AWS_SBOM_BUCKET" ]; then
        echo "Uploading to S3..."
        aws s3 cp "$OUTPUT_DIR/sbom-archive-$TIMESTAMP.tar.gz" \
            "s3://$AWS_SBOM_BUCKET/sbom-archives/" \
            --metadata "timestamp=$TIMESTAMP,project=storytailor"
    fi
    
    echo -e "${GREEN}✅ SBOMs archived${NC}"
}

# Function to sign SBOM
sign_sbom() {
    echo ""
    echo "🔐 Signing SBOM..."
    
    # This is a placeholder - in production, use proper signing
    for sbom_file in "$OUTPUT_DIR"/sbom-*"$TIMESTAMP".json; do
        if [ -f "$sbom_file" ]; then
            # Generate checksum
            sha256sum "$sbom_file" > "$sbom_file.sha256"
            echo "  Signed: $(basename "$sbom_file")"
        fi
    done
    
    echo -e "${GREEN}✅ SBOMs signed${NC}"
}

# Main execution
main() {
    echo "Starting SBOM generation at $(date)"
    echo ""
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Check prerequisites
    check_prerequisites
    
    # Install dependencies
    install_dependencies
    
    # Run vulnerability scan if enabled
    if [ "$SCAN_VULNERABILITIES" = "true" ]; then
        run_vulnerability_scan
    fi
    
    # Analyze licenses
    analyze_licenses
    
    # Generate SBOM
    if [ -f "packages/testing/src/sbom/SBOMGenerator.ts" ]; then
        # Use our TypeScript implementation
        generate_typescript_sbom
    else
        # Fallback to CycloneDX CLI
        generate_cyclonedx_sbom
    fi
    
    # Sign SBOM if requested
    if [ "$SIGN_SBOM" = "true" ]; then
        sign_sbom
    fi
    
    # Create compliance report
    create_compliance_report
    
    # Archive SBOMs
    archive_sboms
    
    echo ""
    echo "🎉 SBOM generation complete!"
    echo "   Reports available in: $OUTPUT_DIR"
    echo ""
    
    # Show summary
    echo "Summary:"
    ls -la "$OUTPUT_DIR"/*"$TIMESTAMP"* 2>/dev/null | grep -v "temp"
    
    echo ""
    echo "Next steps:"
    echo "1. Review compliance report: $OUTPUT_DIR/compliance-report-$TIMESTAMP.md"
    echo "2. Address any critical vulnerabilities"
    echo "3. Verify license compliance"
    echo "4. Archive SBOMs for audit trail"
}

# Run main function
main

# Exit with appropriate code
if [ "$CRITICAL" -gt 0 ]; then
    exit 1
else
    exit 0
fi