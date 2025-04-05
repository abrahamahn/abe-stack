# 🔍 Code Analysis Tools

## 📋 Overview

This directory contains tools for code analysis, extraction, and documentation to help understand the codebase structure and metrics. These scripts facilitate code review, documentation generation, and codebase exploration by providing insights into the organization and volume of code.

## 🧩 Available Tools

| Script                                             | Description                                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| [extract_server.py](./extract_server.py)           | Extracts and analyzes code from specified directories within the server codebase |
| [extract_server_test.py](./extract_server_test.py) | Extracts and analyzes code from specified directories within the test codebase   |

## 🔧 Usage Instructions

### Extract Server Code

The `extract_server.py` script extracts code from specified subdirectories within the `src/server` folder, generates a directory tree, and counts lines of code.

```bash
python src/tools/code_analysis/extract_server.py --subfolder infrastructure/cache --output cache_code.js

# Additional options
python src/tools/code_analysis/extract_server.py \
  --subfolder infrastructure/database \
  --output database_code.js \
  --extensions .ts .js
```

#### Parameters:

- `--subfolder`: The subfolder within src/server to extract code from (required)
- `--output`: Output filename for the extracted code (required)
- `--extensions`: File extensions to include (optional, defaults to `.ts`, `.js`, `.tsx`, `.jsx`)

### Extract Test Code

The `extract_server_test.py` script works similarly but focuses on the test codebase, extracting code from specified subdirectories within the `src/tests` folder.

```bash
python src/tools/code_analysis/extract_server_test.py --subfolder server/unit/infrastructure/cache --output cache_tests.js

# Additional options
python src/tools/code_analysis/extract_server_test.py \
  --subfolder server/integration \
  --output integration_tests.js \
  --extensions .ts .test.ts
```

#### Parameters:

- `--subfolder`: The subfolder within src/tests to extract code from (required)
- `--output`: Output filename for the extracted code (required)
- `--extensions`: File extensions to include (optional, defaults to `.ts`, `.js`, `.tsx`, `.jsx`)

## 📊 Output Format

Both scripts generate an output file with the following sections:

1. **Summary Information**:

   - Total number of files
   - Total lines of code
   - File extensions included

2. **Directory Structure**:

   - ASCII tree representation of the directory structure

3. **File Contents**:
   - Contents of each file with filename and line count headers

Example output:

```javascript
// SUMMARY FOR: infrastructure/cache
// Total files: 8
// Total lines of code: 1253
// File extensions included: .ts, .js, .tsx, .jsx

// DIRECTORY STRUCTURE:
// └── cache
//     ├── CacheService.ts
//     ├── ICacheService.ts
//     ├── index.ts
//     └── types.ts

// ====================== FILE CONTENTS ======================

// ---------------------- infrastructure/cache/CacheService.ts (423 lines) ----------------------

import { injectable, inject } from 'inversify';
import { TYPES } from '../di';
...
```

## 🚀 Development

If you need to enhance these tools:

1. **Add New Features**:

   - Extend existing scripts with additional metrics or analysis
   - Create new scripts for different types of analysis

2. **Improve Output Format**:

   - Modify the output generation for better readability
   - Add support for different output formats (HTML, Markdown, JSON)

3. **Integration**:
   - Integrate with CI/CD for automated code analysis
   - Connect with documentation generators
