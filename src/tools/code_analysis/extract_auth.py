#!/usr/bin/env python3
"""
Extract Auth Files

This script extracts the contents of all auth-related files in the project
and combines them into a single text file for analysis.
"""

import os
import glob
import datetime
from pathlib import Path

def extract_files_to_txt():
    """Extract contents of auth-related files into a single text file."""
    # Define the root directory and output file
    root_dir = Path(__file__).resolve().parents[3]  # Go up 3 levels from the script location
    output_file = root_dir / "auth_code_extract.txt"
    
    # Create a 'code_analysis' directory in the project root if needed
    analysis_dir = root_dir / "code_analysis"
    if not analysis_dir.exists():
        analysis_dir.mkdir(exist_ok=True)
        print(f"Created directory: {analysis_dir}")
    
    # Change output to be in the code_analysis directory
    output_file = analysis_dir / "auth_code_extract.txt"
    
    print(f"Extracting auth code to: {output_file}")
    print(f"Scanning directory: {root_dir}")
    
    # Define the list of files to extract by their relative paths
    file_paths = [
        # PostgreSQL related files
        "src/server/database/PostgreSQLIndexingStrategy.ts",
        # Correct path to PostgreSQLConfig.ts
        "src/server/database/PostgreSQLConfig.ts",
        
        # SQL seed files
        "src/server/database/seeds/02_users_seed.sql",
        "src/server/database/seeds/03_auth_roles_seed.sql",
        
        # Auth models
        "src/server/database/models/auth/index.ts",
        "src/server/database/models/auth/PasswordResetToken.ts",
        "src/server/database/models/auth/Permission.ts",
        "src/server/database/models/auth/Role.ts",
        "src/server/database/models/auth/RolePermission.ts",
        "src/server/database/models/auth/Token.ts",
        "src/server/database/models/auth/User.ts",
        "src/server/database/models/auth/UserConnection.ts",
        "src/server/database/models/auth/UserPreferences.ts",
        "src/server/database/models/auth/UserProfile.ts",
        "src/server/database/models/auth/UserRole.ts",
        
        # Auth repositories
        "src/server/database/repositories/auth/index.ts",
        "src/server/database/repositories/auth/PasswordResetTokenRepository.ts",
        "src/server/database/repositories/auth/PermissionRepository.ts",
        "src/server/database/repositories/auth/RolePermissionRepository.ts",
        "src/server/database/repositories/auth/RoleRepository.ts",
        "src/server/database/repositories/auth/TokenRepository.ts",
        "src/server/database/repositories/auth/UserConnectionRepository.ts",
        "src/server/database/repositories/auth/UserPreferencesRepository.ts",
        "src/server/repositories/auth/UserProfileRepository.ts",  # Updated correct path
        "src/server/database/repositories/auth/UserRepository.ts",
        "src/server/database/repositories/auth/UserRoleRepository.ts",
        
        # Auth services
        "src/server/services/core/auth/AuthService.ts",
        "src/server/services/core/auth/EmailVerificationService.ts",
        "src/server/services/core/auth/index.ts",
        "src/server/services/core/auth/MFAService.ts",
        "src/server/services/core/auth/PasswordService.ts",
        "src/server/services/core/auth/RolePermissionService.ts",
        "src/server/services/core/auth/TokenService.ts",
        "src/server/services/core/auth/types.ts",
    ]
    
    # Find additional auth files using wildcards (in case there are files we missed)
    additional_patterns = [
        "src/server/database/models/auth/*.ts",
        "src/server/database/repositories/auth/*.ts",
        "src/server/repositories/auth/*.ts",  # Added this pattern to catch files in the repositories/auth directory
        "src/server/services/core/auth/*.ts",
        "src/server/database/*.ts",  # Added to catch PostgreSQLConfig.ts
    ]
    
    print("Finding all auth-related files...")
    additional_files = []
    for pattern in additional_patterns:
        full_pattern = os.path.join(root_dir, pattern)
        for file_path in glob.glob(full_pattern):
            # Convert to relative path
            rel_path = os.path.relpath(file_path, root_dir)
            if rel_path not in file_paths:
                additional_files.append(rel_path)
    
    # Combine all file paths, removing duplicates
    all_files = file_paths + additional_files
    all_files = list(set(all_files))  # Remove duplicates
    all_files.sort()  # Sort for consistent output
    
    print(f"Found {len(all_files)} files to process")
    
    # Open the output file
    with open(output_file, 'w', encoding='utf-8') as outf:
        outf.write("# AUTH CODE EXTRACT\n")
        outf.write("# This file contains the combined code from all auth-related files in the project\n\n")
        outf.write(f"# Generated from: {root_dir}\n")
        outf.write(f"# Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        # Keep track of files that were successfully extracted
        found_files = []
        not_found_files = []
        
        # Process each file
        for file_path in all_files:
            full_path = root_dir / file_path
            
            if full_path.exists():
                # Add a header for the file
                outf.write(f"\n\n{'='*80}\n")
                outf.write(f"FILE: {file_path}\n")
                outf.write(f"{'='*80}\n\n")
                
                # Read and write the file's contents
                try:
                    with open(full_path, 'r', encoding='utf-8') as inf:
                        content = inf.read()
                        outf.write(content)
                        found_files.append(file_path)
                except Exception as e:
                    outf.write(f"ERROR READING FILE: {str(e)}\n")
                    not_found_files.append(file_path)
            else:
                not_found_files.append(file_path)
        
        # Add a summary at the end
        outf.write(f"\n\n{'='*80}\n")
        outf.write(f"SUMMARY\n")
        outf.write(f"{'='*80}\n\n")
        outf.write(f"Total files processed: {len(all_files)}\n")
        outf.write(f"Files found and extracted: {len(found_files)}\n")
        outf.write(f"Files not found: {len(not_found_files)}\n")
        
        if not_found_files:
            outf.write("\nMissing files:\n")
            for file_path in not_found_files:
                outf.write(f"- {file_path}\n")
    
    print(f"Extraction complete. Output saved to: {output_file}")
    print(f"Total files processed: {len(all_files)}")
    print(f"Files found and extracted: {len(found_files)}")
    print(f"Files not found: {len(not_found_files)}")
    
    if len(found_files) == len(all_files):
        print("SUCCESS: All files were found and extracted.")
    else:
        print("WARNING: Some files were not found. Check the output for details.")

if __name__ == "__main__":
    extract_files_to_txt() 