#!/usr/bin/env python3
"""
Convert HTML files to PDF using WeasyPrint
"""

import os
import sys
from pathlib import Path

try:
    from weasyprint import HTML
except ImportError:
    print("Error: weasyprint not installed. Run: pip3 install --user weasyprint")
    sys.exit(1)

# Get the directory of this script
script_dir = Path(__file__).parent
pdf_dir = script_dir / "pdf-version"

if not pdf_dir.exists():
    print(f"Error: {pdf_dir} does not exist")
    sys.exit(1)

# Find all HTML files
html_files = sorted(pdf_dir.glob("*.html"))

if not html_files:
    print(f"No HTML files found in {pdf_dir}")
    sys.exit(1)

print(f"Found {len(html_files)} HTML files to convert to PDF\n")

converted = 0
failed = 0

for html_file in html_files:
    pdf_file = html_file.with_suffix('.pdf')
    
    print(f"Converting {html_file.name}...", end=" ")
    
    try:
        HTML(filename=str(html_file)).write_pdf(str(pdf_file))
        print(f"✓ Created {pdf_file.name}")
        converted += 1
    except Exception as e:
        print(f"✗ Error: {e}")
        failed += 1

print(f"\n✅ Successfully converted {converted} files to PDF")
if failed > 0:
    print(f"⚠️  {failed} files failed to convert")
