import os
import sys
import json
import base64
import urllib.request
import urllib.error

EXCLUDE_DIRS = {'.git', 'node_modules', '__pycache__', '.netlify', 'test_esm_app'}
EXCLUDE_FILES = {'.env', 'desktop_started.txt', 'inspect.json'}

def github_request(url, token, data=None, method=None):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Aura-Pro-Deployer',
        'X-GitHub-Api-Version': '2022-11-28'
    }
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        try:
            return {'error': True, 'status': e.code, 'data': json.loads(err_msg)}
        except:
            return {'error': True, 'status': e.code, 'message': err_msg}

def push_project(token, repo_name='aura-pro-assistant', private=False):
    # 1. Get authenticated user
    print('Verifying GitHub token...')
    user_info = github_request('https://api.github.com/user', token)
    if 'login' not in user_info:
        print('Error verifying token:', user_info)
        return False
    
    username = user_info['login']
    print(f'Authenticated as: {username}')

    # 2. Check if repo exists, or create it
    print(f'Checking repository {username}/{repo_name}...')
    repo = github_request(f'https://api.github.com/repos/{username}/{repo_name}', token)
    if repo.get('error') and repo.get('status') == 404:
        print(f'Creating new repository {repo_name}...')
        create_res = github_request(
            'https://api.github.com/user/repos',
            token,
            {'name': repo_name, 'private': private, 'auto_init': True},
            method='POST'
        )
        if create_res.get('error'):
            print('Failed to create repository:', create_res)
            return False
        repo = create_res
        print(f'Repository created: {repo.get("html_url")}')
    elif repo.get('error'):
        print('Repository error:', repo)
        return False
    else:
        print(f'Found existing repository: {repo.get("html_url")}')

    repo_url = repo['html_url']
    default_branch = repo.get('default_branch', 'main')

    # 3. Collect files to upload
    base_dir = os.path.dirname(os.path.abspath(__file__))
    files_to_upload = []

    for root, dirs, files in os.walk(base_dir):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not any(ex in os.path.join(root, d).replace('\\', '/') for ex in ['desktop/node_modules', 'android/app/build'])]
        
        for f in files:
            if f in EXCLUDE_FILES or f.endswith('.pyc'):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir).replace('\\', '/')
            files_to_upload.append((rel_path, full_path))

    print(f'Uploading {len(files_to_upload)} project files...')

    tree_items = []
    for rel_path, full_path in files_to_upload:
        try:
            with open(full_path, 'rb') as fp:
                content = fp.read()
            b64_content = base64.b64encode(content).decode('ascii')
            
            blob_res = github_request(
                f'https://api.github.com/repos/{username}/{repo_name}/git/blobs',
                token,
                {'content': b64_content, 'encoding': 'base64'},
                method='POST'
            )
            if 'sha' in blob_res:
                tree_items.append({
                    'path': rel_path,
                    'mode': '100644',
                    'type': 'blob',
                    'sha': blob_res['sha']
                })
            else:
                print(f'Failed to upload blob for {rel_path}:', blob_res)
        except Exception as e:
            print(f'Error reading {rel_path}: {e}')

    if not tree_items:
        print('No files prepared for tree.')
        return False

    print(f'Successfully created {len(tree_items)} blobs. Constructing Git tree...')
    
    # 4. Get latest commit on default branch (if any)
    ref_res = github_request(f'https://api.github.com/repos/{username}/{repo_name}/git/refs/heads/{default_branch}', token)
    base_tree_sha = None
    parent_commit_sha = None

    if 'object' in ref_res:
        parent_commit_sha = ref_res['object']['sha']
        commit_res = github_request(f'https://api.github.com/repos/{username}/{repo_name}/git/commits/{parent_commit_sha}', token)
        if 'tree' in commit_res:
            base_tree_sha = commit_res['tree']['sha']

    # 5. Create new tree
    tree_payload = {'tree': tree_items}
    if base_tree_sha:
        tree_payload['base_tree'] = base_tree_sha

    new_tree = github_request(
        f'https://api.github.com/repos/{username}/{repo_name}/git/trees',
        token,
        tree_payload,
        method='POST'
    )
    if 'sha' not in new_tree:
        print('Failed to create tree:', new_tree)
        return False
    
    # 6. Create commit
    commit_payload = {
        'message': 'Deploy Aura Pro 2.0 with System-Wide Android Overlay & Actions workflow',
        'tree': new_tree['sha']
    }
    if parent_commit_sha:
        commit_payload['parents'] = [parent_commit_sha]

    new_commit = github_request(
        f'https://api.github.com/repos/{username}/{repo_name}/git/commits',
        token,
        commit_payload,
        method='POST'
    )
    if 'sha' not in new_commit:
        print('Failed to create commit:', new_commit)
        return False

    # 7. Update ref or create ref
    if parent_commit_sha:
        ref_update = github_request(
            f'https://api.github.com/repos/{username}/{repo_name}/git/refs/heads/{default_branch}',
            token,
            {'sha': new_commit['sha'], 'force': True},
            method='PATCH'
        )
    else:
        ref_update = github_request(
            f'https://api.github.com/repos/{username}/{repo_name}/git/refs',
            token,
            {'ref': f'refs/heads/{default_branch}', 'sha': new_commit['sha']},
            method='POST'
        )

    print('='*50)
    print('SUCCESS! Project successfully published to GitHub:')
    print(f'Repository URL: {repo_url}')
    print(f'Actions Build:  {repo_url}/actions')
    print('='*50)
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python push_to_github.py <GITHUB_TOKEN> [REPO_NAME]')
        sys.exit(1)
    token = sys.argv[1].strip()
    repo_name = sys.argv[2].strip() if len(sys.argv) > 2 else 'aura-pro-assistant'
    push_project(token, repo_name)
