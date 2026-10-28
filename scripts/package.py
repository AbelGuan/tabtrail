import json
import hashlib
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'extension' / 'manifest.json').read_text())
package = json.loads((root / 'package.json').read_text())
version = manifest['version']
if version != package['version']:
    raise SystemExit('Version mismatch: package.json and extension/manifest.json must agree.')
dist = root / 'dist'
dist.mkdir(exist_ok=True)
output = dist / f'Pickmark-{version}.zip'
extras = {
    '安装与更新说明.md': root / 'docs' / f'INSTALL-UPDATE-{version}.md',
    'docs/本次版本更新.md': root / 'docs' / f'RELEASE-NOTES-{version}.md',
    'PRIVACY.md': root / 'PRIVACY.md',
    'LICENSE': root / 'LICENSE',
}
for source in extras.values():
    if not source.is_file():
        raise SystemExit(f'Missing release document: {source}')
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted((root / 'extension').rglob('*')):
        if path.is_file() and not path.name.startswith('.'):
            archive.write(path, path.relative_to(root / 'extension'))
    for name, source in extras.items():
        archive.write(source, name)
with ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise SystemExit('Archive integrity check failed.')
    for path in (root / 'extension').rglob('*'):
        if path.is_file() and not path.name.startswith('.'):
            if archive.read(str(path.relative_to(root / 'extension'))) != path.read_bytes():
                raise SystemExit(f'Packaged file differs from source: {path}')
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.sha256').write_text(f'{digest}  {output.name}\n')
print(output)
