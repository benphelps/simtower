"""Preserve original indexed sky/rain/cloud pixels for native palette animation."""
from pathlib import Path
import base64
import hashlib
import io
import json
from PIL import Image
from extract_assets import resources

ROOT = Path(__file__).resolve().parents[1]
WANTED = {352, 905} | set(range(850, 858)) | set(range(900, 904))
def main():
    result = {'source': 'SimTowerDOS/SIMTOWER.EXE', 'resources': {}}
    binary = (ROOT / result['source']).read_bytes()
    result['sha256'] = hashlib.sha256(binary).hexdigest()
    for kind, rid, offset, payload in resources(binary):
        if kind != 2 or rid not in WANTED:
            continue
        image = Image.open(io.BytesIO(payload))
        assert image.mode == 'P', (rid, image.mode)
        result['resources'][str(rid)] = {'width': image.width, 'height': image.height,
            'offset': offset, 'indices': base64.b64encode(image.tobytes()).decode('ascii')}
    (ROOT / 'public/assets/scene-indices.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')

if __name__ == '__main__':
    main()
