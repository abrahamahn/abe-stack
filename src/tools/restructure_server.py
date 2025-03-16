import os
import shutil
from pathlib import Path

def create_directory_structure(base_path: Path):
    """Create the new directory structure."""
    # Define the directory structure
    structure = {
        'config': {
            'files': ['database.ts', 'environment.ts', 'server.ts']
        },
        'core': {
            'auth': {
                'files': ['auth.routes.ts', 'auth.service.ts', 'auth.controller.ts', 
                         'auth.validators.ts', 'token.service.ts']
            },
            'users': {
                'files': ['user.model.ts', 'user.routes.ts', 'user.service.ts',
                         'user.controller.ts', 'user.validators.ts']
            },
            'media': {
                'files': ['media.routes.ts', 'media.service.ts', 'media.controller.ts',
                         'media.model.ts'],
                'processors': {
                    'files': ['image.processor.ts', 'video.processor.ts', 'audio.processor.ts']
                },
                'streaming': {
                    'files': ['stream.controller.ts', 'stream.routes.ts']
                }
            },
            'social': {
                'posts': {
                    'files': ['post.model.ts', 'post.routes.ts', 'post.controller.ts',
                             'post.service.ts']
                },
                'comments': {
                    'files': ['comment.model.ts', 'comment.routes.ts', 'comment.controller.ts']
                },
                'likes': {
                    'files': ['like.model.ts', 'like.service.ts']
                },
                'follows': {
                    'files': ['follow.model.ts', 'follow.service.ts']
                }
            }
        },
        'database': {
            'files': ['connection.ts'],
            'migrations': {'files': []},
            'repositories': {'files': []}
        },
        'shared': {
            'middleware': {
                'files': ['error.middleware.ts', 'auth.middleware.ts',
                         'validation.middleware.ts', 'logging.middleware.ts']
            },
            'errors': {
                'files': ['api-error.ts', 'error-types.ts']
            },
            'types': {
                'files': ['index.ts', 'media.types.ts', 'request.types.ts']
            },
            'utils': {
                'files': ['logger.ts', 'file-helpers.ts', 'validators.ts']
            }
        }
    }

    # Root level files
    root_files = ['api.ts', 'server.ts', 'index.ts']

    def create_structure(current_path: Path, structure_dict: dict):
        """Recursively create directories and files."""
        for name, content in structure_dict.items():
            dir_path = current_path / name
            dir_path.mkdir(exist_ok=True)
            print(f"Created directory: {dir_path}")

            if isinstance(content, dict):
                if 'files' in content:
                    # Create files in current directory
                    for file_name in content['files']:
                        file_path = dir_path / file_name
                        if not file_path.exists():
                            file_path.touch()
                            print(f"Created file: {file_path}")
                
                # Process subdirectories
                for key, value in content.items():
                    if key != 'files' and isinstance(value, dict):
                        create_structure(dir_path, {key: value})

    # Create the main structure
    create_structure(base_path, structure)

    # Create root level files
    for file_name in root_files:
        file_path = base_path / file_name
        if not file_path.exists():
            file_path.touch()
            print(f"Created root file: {file_path}")

def backup_existing_files(server_path: Path):
    """Backup existing server directory."""
    if server_path.exists():
        backup_path = server_path.parent / 'server_backup'
        if backup_path.exists():
            shutil.rmtree(backup_path)
        shutil.copytree(server_path, backup_path)
        print(f"Created backup at: {backup_path}")
        return True
    return False

def move_existing_files(server_path: Path):
    """Move existing files to their new locations in the new structure."""
    # Add your file moving logic here based on your current structure
    # This is a placeholder for the actual implementation
    pass

def main():
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    server_path = project_root / 'src' / 'server'

    print("Starting server directory restructuring...")

    # Backup existing files
    if backup_existing_files(server_path):
        print("Existing server directory backed up.")
    
    # Create new structure
    create_directory_structure(server_path)
    
    # Move existing files to new structure
    move_existing_files(server_path)
    
    print("\nServer directory restructuring complete!")
    print("\nNext steps:")
    print("1. Review the new structure")
    print("2. Move your existing code to the appropriate new locations")
    print("3. Update import paths in your code")
    print("4. Test the application")
    print("\nBackup of the original server directory is available at: src/server_backup")

if __name__ == "__main__":
    main() 