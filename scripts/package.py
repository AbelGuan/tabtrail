import json
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
output = dist / f'tabtrail-{version}.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted((root / 'extension').rglob('*')):
        if path.is_file() and not path.name.startswith('.'):
            archive.write(path, path.relative_to(root / 'extension'))
print(output)
