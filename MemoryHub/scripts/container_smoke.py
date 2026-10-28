"""Disposable CI-only HTTP smoke test; run inside the application container."""
import json
import secrets
import subprocess
import sys
import time
from pathlib import Path

import httpx

proof = Path('/data/ci-proof.json')
origin = 'http://127.0.0.1:8765'
client = httpx.Client(base_url='http://127.0.0.1:8000', headers={'Host': '127.0.0.1:8765', 'Origin': origin}, timeout=10)
for attempt in range(60):
    try:
        if client.get('/healthz').status_code == 200:
            break
    except httpx.HTTPError:
        pass
    time.sleep(1)
else:
    raise SystemExit('API did not become healthy after restart')

if sys.argv[1] == 'prepare':
    password_file = Path('/tmp/memoryhub-ci-password')
    password = secrets.token_urlsafe(24)
    password_file.touch(mode=0o600, exist_ok=False)
    password_file.write_text(password)
    subprocess.run([sys.executable, '-m', 'app.cli', 'init', '--password-file', str(password_file)], check=True)
    password_file.unlink()
else:
    state = json.loads(proof.read_text())
    password = state['password']

response = client.post('/api/login', json={'username': 'admin', 'password': password})
response.raise_for_status()
if sys.argv[1] == 'prepare':
    project = client.post('/api/projects', headers={'Idempotency-Key': 'ci-project'}, json={'name': 'CI restart proof'})
    project.raise_for_status()
    memory = client.post('/api/memories', headers={'Idempotency-Key': 'ci-memory'}, json={
        'category': 'project', 'title': '容器重启验证', 'body': '验收数据：重启容器后保留项目和最新记忆。', 'project_id': project.json()['id']})
    memory.raise_for_status()
    proof.touch(mode=0o600, exist_ok=False)
    proof.write_text(json.dumps({'password': password, 'memory_id': memory.json()['id'], 'version': memory.json()['version']}))
    print('Actual HTTP create and login passed')
else:
    memory = client.get('/api/memories/' + state['memory_id'])
    memory.raise_for_status()
    assert memory.json()['version'] == state['version']
    assert memory.json()['body'] == '验收数据：重启容器后保留项目和最新记忆。'
    proof.unlink()
    print('Actual container restart persistence passed')
