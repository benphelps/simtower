"""Losslessly export native bitmap/CGPk byte planes for retained palette drawing.

The gray RGB value is the original byte INDEX, not recreated artwork.
Transparency is applied by the original draw mode in the browser loader.
"""
from pathlib import Path
import hashlib
import io
import json
from PIL import Image
from extract_assets import resources

ROOT = Path(__file__).resolve().parents[1]
ANIMATED = set(range(188, 204)) | set(range(207, 219))

def main():
    binary = (ROOT / 'SimTowerDOS/SIMTOWER.EXE').read_bytes()
    manifest = json.loads((ROOT / 'public/assets/manifest.json').read_text())
    manifest['resources'] += json.loads((ROOT / 'public/assets/lobby-transports.json').read_text())
    wanted = {(entry['type'], entry['id']): entry for entry in manifest['resources'] if entry['path'].endswith('.png')}
    target = ROOT / 'public/assets/indices'
    target.mkdir(parents=True, exist_ok=True)
    entries=list(resources(binary))
    _, _, palette_offset, clut=next(entry for entry in entries if entry[0]==32515 and entry[1]==1000)
    #642B skips one8-byte source entry at destination184 and makes255black.
    palette=[[clut[(index+(index>=184))*8+color] for color in (2,4,6)] for index in range(255)]+[[0,0,0]]
    result = {'source': 'SimTowerDOS/SIMTOWER.EXE', 'sha256': hashlib.sha256(binary).hexdigest(),
        'basePalette':palette,'paletteSource':{'type':32515,'id':1000,'offset':palette_offset},'resources': {}}
    for kind, rid, offset, payload in entries:
        if (kind, rid) not in wanted:
            continue
        if kind == 2:
            original = Image.open(io.BytesIO(payload))
            assert original.mode == 'P', (rid, original.mode)
            width, height = original.size
            indices = original.tobytes()
        elif kind == 32514:
            height, width = wanted[(kind,rid)]['height'], wanted[(kind,rid)]['width']
            assert len(payload)>=width*height and not any(payload[width*height:]), (rid, 'nonzero CGPk padding')
            indices = bytearray(width * height)
            for column in range(width // 8):
                for row in range(height):
                    start = column * 8 * height + row * 8
                    dest = row * width + column * 8
                    indices[dest:dest + 8] = payload[start:start + 8]
            indices = bytes(indices)
        else:
            continue
        Image.frombytes('L', (width, height), indices).convert('RGB').save(target / f'{rid}.png')
        result['resources'][str(rid)] = {'width': width, 'height': height, 'offset': offset,
            'path': f'/assets/indices/{rid}.png', 'animated': bool(set(indices) & ANIMATED),
            'indicesSha256': hashlib.sha256(indices).hexdigest()}
    (ROOT / 'public/assets/native-indices.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(f'Exported {len(result["resources"])} source index planes')

if __name__ == '__main__':
    main()
