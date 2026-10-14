"""Preserve3624's native zero-index transparency for31521→317E9."""
from pathlib import Path
import base64
import hashlib
import io
import json
from PIL import Image
from extract_assets import resources

ROOT = Path(__file__).resolve().parents[1]

def main():
    binary = (ROOT / 'SimTowerDOS/SIMTOWER.EXE').read_bytes()
    _, _, offset, payload = next(r for r in resources(binary) if r[0] == 2 and r[1] == 3624)
    image = Image.open(io.BytesIO(payload))
    assert image.mode == 'P' and image.size == (328, 36)
    output = {'source': 'SimTowerDOS/SIMTOWER.EXE', 'sha256': hashlib.sha256(binary).hexdigest(),
        'id': 3624, 'offset': offset, 'width': image.width, 'height': image.height,
        'indices': base64.b64encode(image.tobytes()).decode('ascii')}
    (ROOT / 'public/assets/scaffold-indices.json').write_text(json.dumps(output, separators=(',', ':')) + '\n')

if __name__ == '__main__':
    main()
