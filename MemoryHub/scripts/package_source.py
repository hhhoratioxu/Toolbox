"""Build a source-only delivery; never include live data or secrets."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
output = root / 'artifacts' / 'MemoryHub-v0.1.0-source.zip'
allowed_dirs = {'backend', 'frontend', 'deploy', 'examples', 'docs', 'scripts', 'artifacts'}
allowed_root = {'README.md','LICENSE','Dockerfile','compose.yml','compose.local.yml','.env.example','.gitignore','.dockerignore'}
excluded = {'node_modules','dist','__pycache__','.pytest_cache','.venv','.local','.git'}
files = []
for path in root.rglob('*'):
    if not path.is_file():
        continue
    relative = path.relative_to(root)
    if any(p in excluded for p in relative.parts):
        continue
    if len(relative.parts) == 1 and relative.name not in allowed_root:
        continue
    if len(relative.parts) > 1 and relative.parts[0] not in allowed_dirs:
        continue
    if path.suffix in {'.log','.zip','.sha256','.tsbuildinfo','.pyc'} or relative.name.startswith('private'):
        continue
    files.append(path)
secrets = []
password = root / '.local/admin-password'
if password.exists():
    secrets.append(password.read_text().strip().encode())
clients = root / '.local/live-clients.json'
if clients.exists():
    secrets.extend(t.encode() for t in json.loads(clients.read_text())['tokens'])
manifest = {}
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        data = path.read_bytes()
        assert not any(secret and secret in data for secret in secrets), 'Live credential found in ' + str(path)
        rel = str(path.relative_to(root))
        manifest[rel] = hashlib.sha256(data).hexdigest()
        archive.write(path, 'MemoryHub/' + rel)
    archive.writestr('MemoryHub/SHA256SUMS.json', json.dumps(manifest, ensure_ascii=False, indent=2))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    for name, digest in manifest.items():
        assert hashlib.sha256(archive.read('MemoryHub/' + name)).hexdigest() == digest
    for name in ('scripts/dev-start.sh', 'scripts/dev-stop.sh', 'scripts/local-start.sh'):
        assert (archive.getinfo('MemoryHub/' + name).external_attr >> 16) & 0o111, 'Executable bit missing: ' + name
sha = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(sha + '  ' + output.name + '\n')
print(json.dumps({'source_files':len(files),'bytes':output.stat().st_size,'sha256':sha,'secrets_scan':'passed','zip_integrity':'passed'},indent=2))
