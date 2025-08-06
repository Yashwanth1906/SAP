import base64
import requests
import json
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse

class GitHubFetcher:
    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json"
        }
        
        self.relevant_extensions = {
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', 
            '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', 
            '.scala', '.r', '.m', '.mm', '.pl', '.sh', '.bash', '.zsh',
            '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
            '.md', '.txt', '.rst', '.html', '.css', '.scss', '.sass',
            '.xml', '.sql', '.dockerfile', '.dockerignore', '.gitignore',
            '.requirements', '.pip', '.setup', '.pyproject', '.cargo',
            '.package', '.composer', '.gemfile', '.pom', '.gradle'
        }
        
        
        self.exclude_dirs = {
            '.git', '__pycache__', 'node_modules', '.venv', 'venv', 
            'env', '.env', 'build', 'dist', 'target', 'bin', 'obj',
            '.vscode', '.idea', '.pytest_cache', '.coverage', 'logs'
        }

    def parse_github_url(self, url: str) -> Optional[Dict[str, str]]:
        
        patterns = [
            r'https://github\.com/([^/]+)/([^/]+)(?:/tree/[^/]+/(.+))?',
            r'https://github\.com/([^/]+)/([^/]+)(?:/blob/[^/]+/(.+))?',
            r'https://github\.com/([^/]+)/([^/]+)'
        ]
        
        for pattern in patterns:
            match = re.match(pattern, url)
            if match:
                owner = match.group(1)
                repo = match.group(2)
                path = match.group(3) if match.group(3) else ""
                return {
                    'owner': owner,
                    'repo': repo,
                    'path': path
                }
        return None

    def get_file_content(self, owner: str, repo: str, path: str = "") -> Dict[str, str]:
        
        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        
        try:
            response = requests.get(api_url, headers=self.headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error fetching {api_url}: {response.status_code}")
                return {}
        except Exception as e:
            print(f"Error fetching {api_url}: {e}")
            return {}

    def is_relevant_file(self, filename: str) -> bool:
        
        if any(filename.endswith(ext) for ext in self.relevant_extensions):
            return True
        
        important_files = {
            'dockerfile', 'docker-compose', 'makefile', 'readme', 'license',
            'requirements', 'setup', 'package', 'gemfile', 'pom', 'gradle',
            '.gitignore', '.env', '.env.example', '.env.local'
        }
        
        filename_lower = filename.lower()
        return any(name in filename_lower for name in important_files)

    def should_exclude_path(self, path: str) -> bool:
        
        path_parts = path.lower().split('/')
        return any(part in self.exclude_dirs for part in path_parts)

    def fetch_repository_files(self, github_url: str) -> Dict[str, str]:
        
        parsed = self.parse_github_url(github_url)
        if not parsed:
            print("Invalid GitHub URL")
            return {}
        
        owner = parsed['owner']
        repo = parsed['repo']
        base_path = parsed['path']
        
        print(f"Fetching files from {owner}/{repo}")
        if base_path:
            print(f"Starting from path: {base_path}")
        
        files_content = {}
        files_to_process = [base_path] if base_path else [""]
        
        while files_to_process:
            current_path = files_to_process.pop(0)
            
            try:
                content_data = self.get_file_content(owner, repo, current_path)
                
                if isinstance(content_data, list):  # Directory
                    for item in content_data:
                        if item['type'] == 'file':
                            file_path = item['path']
                            if not self.should_exclude_path(file_path):
                                if self.is_relevant_file(file_path):
                                    
                                    file_content = self.get_file_content(owner, repo, file_path)
                                    if file_content and 'content' in file_content:
                                        try:
                                            decoded_content = base64.b64decode(file_content['content']).decode('utf-8')
                                            files_content[file_path] = decoded_content
                                            print(f"✓ Fetched: {file_path}")
                                        except Exception as e:
                                            print(f"✗ Error decoding {file_path}: {e}")
                        elif item['type'] == 'dir':
                            dir_path = item['path']
                            if not self.should_exclude_path(dir_path):
                                files_to_process.append(dir_path)
                
                elif isinstance(content_data, dict) and 'content' in content_data:  
                    try:
                        decoded_content = base64.b64decode(content_data['content']).decode('utf-8')
                        files_content[current_path] = decoded_content
                        print(f"✓ Fetched: {current_path}")
                    except Exception as e:
                        print(f"✗ Error decoding {current_path}: {e}")
                        
            except Exception as e:
                print(f"Error processing {current_path}: {e}")
        
        return files_content

    def format_for_llm(self, files_content: Dict[str, str]) -> str:
        
        if not files_content:
            return "No relevant files found in the repository."
        
        formatted_content = "GitHub Repository Code Analysis:\n\n"
        formatted_content += "=" * 50 + "\n\n"
        
        for file_path, content in files_content.items():
            formatted_content += f"File: {file_path}\n"
            formatted_content += "-" * 30 + "\n"
            formatted_content += content + "\n\n"
            formatted_content += "=" * 50 + "\n\n"
        
        return formatted_content

def main():
    
    fetcher = GitHubFetcher()
    
    
    test_url = "https://github.com/shivasankaran18/model_test"
    
    print("Fetching files from GitHub repository...")
    files_content = fetcher.fetch_repository_files(test_url)
    
    if files_content:
        print(f"\nFound {len(files_content)} relevant files:")
        for file_path in files_content.keys():
            print(f"  - {file_path}")
        

        llm_content = fetcher.format_for_llm(files_content)
        print(f"\nFormatted content length: {len(llm_content)} characters")
        
        
        with open('github_code_analysis.txt', 'w', encoding='utf-8') as f:
            f.write(llm_content)
        print("Content saved to github_code_analysis.txt")
    else:
        print("No files found or error occurred.")

if __name__ == "__main__":
    main() 