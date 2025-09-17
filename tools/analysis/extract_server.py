#!/usr/bin/env python3
import os
import argparse
import glob
from pathlib import Path

def generate_directory_tree(base_path, target_path, prefix="", is_last=True, exclude_patterns=None):
    """
    Generate a directory tree representation as a string.
    
    Args:
        base_path (str): Base directory path (for calculating relative paths)
        target_path (str): Path to generate tree from
        prefix (str): Prefix to use for current line
        is_last (bool): Is this the last item in the current directory
        exclude_patterns (list): Patterns to exclude from the tree
    
    Returns:
        str: Directory tree representation
    """
    if exclude_patterns is None:
        exclude_patterns = ['__pycache__', '.git', 'node_modules']
    
    rel_path = os.path.relpath(target_path, base_path)
    
    # Skip excluded patterns
    if any(pattern in target_path for pattern in exclude_patterns):
        return ""
    
    # Determine the display name (just the directory/file name)
    display_name = os.path.basename(target_path)
    
    # Start building the tree
    result = f"{prefix}{'└── ' if is_last else '├── '}{display_name}\n"
    
    # If it's a directory, process its contents
    if os.path.isdir(target_path):
        # Get all entries in the directory
        entries = [e for e in os.listdir(target_path)
                  if not any(pattern in os.path.join(target_path, e) for pattern in exclude_patterns)]
        entries.sort()
        
        # Process each entry
        for i, entry in enumerate(entries):
            entry_path = os.path.join(target_path, entry)
            is_entry_last = (i == len(entries) - 1)
            # Add to the result with updated prefix
            next_prefix = f"{prefix}{'    ' if is_last else '│   '}"
            result += generate_directory_tree(base_path, entry_path, next_prefix, is_entry_last, exclude_patterns)
    
    return result

def count_lines_of_code(file_path):
    """Count the number of lines in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return sum(1 for _ in file)
    except UnicodeDecodeError:
        return 0
    except Exception:
        return 0

def extract_code(base_dir, target_subfolder, output_filename, file_extensions=None):
    """
    Extract code from a specific subfolder within src/server directory
    and save it to a custom-named output file.
    
    Args:
        base_dir (str): Base directory (should point to src/server)
        target_subfolder (str): Target subfolder within src/server
        output_filename (str): Name of the output file
        file_extensions (list): List of file extensions to include
    """
    if file_extensions is None:
        file_extensions = ['.ts', '.js', '.tsx', '.jsx']
    
    # Ensure base directory is an absolute path
    base_dir = os.path.abspath(base_dir)
    
    # Construct the target directory path
    target_dir = os.path.join(base_dir, target_subfolder)
    
    if not os.path.isdir(target_dir):
        print(f"Error: Target directory {target_dir} does not exist or is not a directory")
        return
    
    # Set up output directory
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_file_path = os.path.join(output_dir, output_filename)
    
    # Get all matching files from the target directory recursively
    all_files = []
    for ext in file_extensions:
        all_files.extend(glob.glob(os.path.join(target_dir, '**', f'*{ext}'), recursive=True))
    
    # Sort files for consistent output
    all_files.sort()
    
    # Count total lines of code
    total_loc = sum(count_lines_of_code(file) for file in all_files)
    
    # Generate directory tree
    dir_tree = generate_directory_tree(base_dir, target_dir)
    
    # Open output file
    with open(output_file_path, 'w', encoding='utf-8') as output_file:
        # Write summary information
        output_file.write(f"// SUMMARY FOR: {target_subfolder}\n")
        output_file.write(f"// Total files: {len(all_files)}\n")
        output_file.write(f"// Total lines of code: {total_loc}\n")
        output_file.write(f"// File extensions included: {', '.join(file_extensions)}\n\n")
        
        # Write directory tree
        output_file.write("// DIRECTORY STRUCTURE:\n")
        output_file.write("// " + "\n// ".join(dir_tree.split('\n')))
        output_file.write("\n\n// ====================== FILE CONTENTS ======================\n")
        
        # Process each file
        for file_path in all_files:
            rel_path = os.path.relpath(file_path, base_dir)
            loc = count_lines_of_code(file_path)
            output_file.write(f"\n\n// ---------------------- {rel_path} ({loc} lines) ----------------------\n\n")
            
            try:
                with open(file_path, 'r', encoding='utf-8') as input_file:
                    file_content = input_file.read()
                    output_file.write(file_content)
            except UnicodeDecodeError:
                output_file.write("// [File could not be decoded with UTF-8 encoding]\n")
            except Exception as e:
                output_file.write(f"// [Error reading file: {str(e)}]\n")
    
    print(f"Code extraction complete. Output written to: {output_file_path}")
    print(f"Processed {len(all_files)} files with {total_loc} total lines of code from {target_subfolder}")

def main():
    parser = argparse.ArgumentParser(description='Extract code from specific directories within src/server')
    parser.add_argument('--subfolder', required=True, help='Subfolder within src/server to extract code from')
    parser.add_argument('--output', required=True, help='Output filename')
    parser.add_argument('--extensions', nargs='+', default=['.ts', '.js', '.tsx', '.jsx'], 
                        help='File extensions to include (default: .ts .js .tsx .jsx)')
    
    args = parser.parse_args()
    
    # Determine the src/server directory path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Navigate up to find src/server directory
    # Assumes the script is in src/tools/code_analysis
    src_server_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..', 'src', 'server'))
    
    if not os.path.isdir(src_server_dir):
        print(f"Error: src/server directory not found at {src_server_dir}")
        print("Please run this script from within the project directory structure")
        return
    
    # Run the extraction
    extract_code(
        base_dir=src_server_dir,
        target_subfolder=args.subfolder,
        output_filename=args.output,
        file_extensions=args.extensions
    )

if __name__ == "__main__":
    main()