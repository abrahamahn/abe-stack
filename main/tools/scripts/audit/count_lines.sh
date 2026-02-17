#!/bin/bash

# Define exclusion patterns (add more as needed)
EXCLUDES="-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/coverage/*' -not -path '*/.turbo/*' -not -name '*.test.ts' -not -name '*.test.tsx' -not -name '*.spec.ts' -not -name '*.spec.tsx'"

echo "Lines of Code by Package (excluding tests and node_modules):"
echo "---------------------------------------------------------"

# Find all package.json files to identify packages
find main -name "package.json" -not -path "*/node_modules/*" | while read pkg_json; do
  pkg_dir=$(dirname "$pkg_json")
  pkg_name=$(grep '"name":' "$pkg_json" | head -n 1 | sed 's/.*"name": "\(.*\)".*/\1/') or "Unknown"

  # Count lines in .ts and .tsx files within this package directory, applying exclusions
  # We use a subshell to construct the find command with the exclusion string properly
  line_count=$(eval "find \"$pkg_dir\" -type f \( -name '*.ts' -o -name '*.tsx' \) $EXCLUDES -print0" | xargs -0 wc -l | tail -n 1 | awk '{print $1}')

  # Handle case where no files are found (wc returns 0 or empty)
  if [ -z "$line_count" ]; then
      line_count=0
  fi

  printf "%-50s : %s\n" "$pkg_name ($pkg_dir)" "$line_count"
done

echo "---------------------------------------------------------"
echo "Total Source Lines of Code (excluding tests):"
# Total count across all src, applying same exclusions
total_lines=$(eval "find main -type f \( -name '*.ts' -o -name '*.tsx' \) $EXCLUDES -print0" | xargs -0 wc -l | tail -n 1 | awk '{print $1}')
echo "$total_lines"
