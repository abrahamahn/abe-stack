#!/usr/bin/env python3
import os
import glob
import re
import json
import argparse
from pathlib import Path

"""
This script extracts all database-related code from /src/server/database
and saves it to a single text file for review.
"""

def parse_args():
    parser = argparse.ArgumentParser(description='Extract database code files.')
    parser.add_argument('--ts-only', action='store_true', help='Extract only TypeScript files')
    parser.add_argument('--extensions', nargs='+', default=['.ts'], help='File extensions to extract (default: [.ts])')
    return parser.parse_args()

# Get the project root directory (2 levels up from the script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

# Configuration with absolute paths
DATABASE_DIR = os.path.join(PROJECT_ROOT, "server", "database")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "code_analysis")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "database_code.txt")
EXCLUDE_PATTERNS = ["node_modules", "dist", ".git"]

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Script directory: {SCRIPT_DIR}")
print(f"Project root: {PROJECT_ROOT}")
print(f"Database directory: {DATABASE_DIR}")
print(f"Output directory: {OUTPUT_DIR}")
print(f"Output file: {OUTPUT_FILE}")


def is_excluded(file_path):
    """Check if a file should be excluded based on patterns."""
    for pattern in EXCLUDE_PATTERNS:
        if pattern in file_path:
            return True
    return False


def extract_files(directory, file_extensions):
    """Extract all database-related files and their content."""
    files_data = []
    
    if not os.path.exists(directory):
        print(f"ERROR: Database directory not found: {directory}")
        return files_data
    
    # Get all files with specified extensions
    for ext in file_extensions:
        if not ext.startswith('.'):
            ext = f'.{ext}'
        file_pattern = os.path.join(directory, "**", f"*{ext}")
        for file_path in glob.glob(file_pattern, recursive=True):
            if is_excluded(file_path):
                continue
                
            relative_path = os.path.relpath(file_path, directory)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                files_data.append({
                    "path": relative_path,
                    "lines": content.count('\n') + 1,
                    "content": content
                })
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
                files_data.append({
                    "path": relative_path,
                    "lines": 0,
                    "content": f"ERROR: {e}"
                })
    
    # Sort files by path for consistent output
    return sorted(files_data, key=lambda x: x["path"])


def main():
    """Main function to extract all database code."""
    args = parse_args()
    
    # Use either just TypeScript or specified extensions
    file_extensions = ['.ts'] if args.ts_only else args.extensions
    
    print(f"Extracting database code from {DATABASE_DIR}...")
    print(f"Using file extensions: {file_extensions}")
    
    # Extract all files
    files_data = extract_files(DATABASE_DIR, file_extensions)
    
    if not files_data:
        print("No files found or directory does not exist.")
        return
    
    # Write to a single text file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        # Write header
        f.write("===========================================================\n")
        f.write("DATABASE LAYER CODE EXTRACTION\n")
        f.write("===========================================================\n\n")
        
        # Write summary
        f.write(f"Total Files: {len(files_data)}\n")
        f.write(f"Total Lines: {sum(file['lines'] for file in files_data)}\n\n")
        
        # Write file listing
        f.write("File Listing:\n")
        for i, file in enumerate(files_data, 1):
            f.write(f"{i}. {file['path']} ({file['lines']} lines)\n")
        f.write("\n\n")
        
        # Write each file with separator
        for i, file in enumerate(files_data, 1):
            f.write("===========================================================\n")
            f.write(f"FILE {i}: {file['path']}\n")
            f.write("===========================================================\n\n")
            f.write(file['content'])
            f.write("\n\n\n")
    
    print(f"Extraction complete. Database code saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main() 