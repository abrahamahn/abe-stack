import os
from pathlib import Path

def generate_directory_tree(directory, prefix="", exclude_dirs=None):
    """Generate a tree-like directory structure string."""
    if exclude_dirs is None:
        exclude_dirs = set()
    
    tree = []
    dir_path = Path(directory)
    
    # Get all items in directory
    try:
        items = list(dir_path.iterdir())
    except Exception:
        return []
    
    # Sort items (directories first, then files)
    items.sort(key=lambda x: (not x.is_dir(), x.name.lower()))
    
    for index, item in enumerate(items):
        if item.name in exclude_dirs:
            continue
            
        is_last = index == len(items) - 1
        current_prefix = "└── " if is_last else "├── "
        next_prefix = "    " if is_last else "│   "
        
        tree.append(prefix + current_prefix + item.name)
        
        if item.is_dir():
            tree.extend(generate_directory_tree(
                item,
                prefix + next_prefix,
                exclude_dirs
            ))
    
    return tree

def extract_code_for_directory(base_dir, target_dir):
    # File extensions to include
    code_extensions = {
        '.ts', '.tsx', '.js', '.jsx', '.py', '.json', 
        '.css', '.scss', '.less', '.html', '.md',
        '.sql', '.prisma', '.env', '.yml', '.yaml'
    }
    
    # Directories to exclude
    exclude_dirs = {
        'node_modules', 'dist', '.git', '__pycache__',
        'build', 'coverage', '.next', '.cache'
    }
    
    # Store all code content
    code_content = []
    total_files = 0
    total_lines = 0
    
    dir_path = os.path.join(base_dir, target_dir)
    
    if not os.path.exists(dir_path):
        return None
    
    # Generate directory tree
    tree = generate_directory_tree(dir_path, exclude_dirs=exclude_dirs)
    
    for root, dirs, files in os.walk(dir_path):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            file_path = os.path.join(root, file)
            extension = os.path.splitext(file)[1].lower()
            
            if extension in code_extensions:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        line_count = len(lines)
                        
                        # Update statistics
                        total_files += 1
                        total_lines += line_count
                        
                        # Add file separator and content
                        relative_path = os.path.relpath(file_path, dir_path)
                        separator = f"\n{'=' * 80}\n"
                        header = f"File: {relative_path}\nLines: {line_count}\n{'-' * 80}\n"
                        content = ''.join(lines)
                        
                        code_content.append(f"{separator}{header}{content}")
                        
                except Exception as e:
                    print(f"Error reading {file_path}: {str(e)}")
    
    if total_files == 0:
        return None
        
    return {
        'content': ''.join(code_content),
        'total_files': total_files,
        'total_lines': total_lines,
        'tree': tree
    }

def save_code_to_file(code_info, output_file, directory_name):
    with open(output_file, 'w', encoding='utf-8') as f:
        # Write summary header
        f.write(f"{directory_name.upper()} DIRECTORY SUMMARY\n")
        f.write("=" * 80 + "\n")
        f.write(f"Total Files: {code_info['total_files']}\n")
        f.write(f"Total Lines: {code_info['total_lines']}\n")
        f.write("=" * 80 + "\n\n")
        
        # Write directory structure
        f.write("DIRECTORY STRUCTURE:\n")
        f.write("-" * 80 + "\n")
        f.write("\n".join(code_info['tree']))
        f.write("\n" + "=" * 80 + "\n\n")
        
        # Write full code content
        f.write(code_info['content'])

def main():
    # Get the project root directory and src directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent  # Go up two levels from tools directory
    src_dir = project_root / 'src'
    
    # Create output directory in tools
    output_dir = script_dir / 'code_analysis'
    output_dir.mkdir(exist_ok=True)
    
    # Directories to process
    directories = ['client', 'server', 'shared', 'tools']
    
    print("Extracting code from directories...")
    total_files = 0
    total_lines = 0
    
    # Store directory trees for summary
    all_trees = {}
    
    # Process each directory
    for directory in directories:
        code_info = extract_code_for_directory(src_dir, directory)
        
        if code_info:
            output_file = output_dir / f'{directory}_code.txt'
            save_code_to_file(code_info, output_file, directory)
            
            total_files += code_info['total_files']
            total_lines += code_info['total_lines']
            all_trees[directory] = code_info['tree']
            
            print(f"\n{directory.capitalize()} Directory:")
            print(f"Files: {code_info['total_files']}")
            print(f"Lines: {code_info['total_lines']}")
            print(f"Output saved to: {output_file}")
    
    # Create summary file
    summary_file = output_dir / 'code_summary.txt'
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("OVERALL CODEBASE SUMMARY\n")
        f.write("=" * 80 + "\n")
        f.write(f"Total Files Across All Directories: {total_files}\n")
        f.write(f"Total Lines Across All Directories: {total_lines}\n")
        f.write("\nBreakdown by Directory:\n")
        
        for directory in directories:
            if directory in all_trees:
                f.write(f"\n{directory.capitalize()}:\n")
                f.write("-" * 40 + "\n")
                f.write("\n".join(all_trees[directory]))
                f.write("\n\n")
                code_info = extract_code_for_directory(src_dir, directory)
                if code_info:
                    f.write(f"Files: {code_info['total_files']}\n")
                    f.write(f"Lines: {code_info['total_lines']}\n")
                f.write("=" * 40 + "\n")
    
    print("\nCode Extraction Complete!")
    print("-" * 50)
    print(f"Total Files Processed: {total_files}")
    print(f"Total Lines of Code: {total_lines}")
    print(f"\nSummary saved to: {summary_file}")

if __name__ == "__main__":
    main() 