"""Decode original tall-lobby transportation CGPk resources, without new art.

IDA 0x18CA5 selects 11 stair frames / 12 escalator frames per storey;
0x31521 and 0x317E9 read eight-pixel columns, 36 rows, with index zero
transparent. The three/four-storey resources are selected by 0x38F50.
"""
from pathlib import Path
import io
import json
from PIL import Image
from extract_assets import resources

ROOT = Path(__file__).resolve().parents[1]


def main():
    entries = list(resources((ROOT / 'SimTowerDOS/SIMTOWER.EXE').read_bytes()))
    palette = Image.open(io.BytesIO(next(payload for kind, rid, _, payload in entries if kind == 2 and rid == 1515))).getpalette()
    outputs = []
    for rid, storeys in [(4073, 3), (4074, 4)]:
        _, _, offset, payload = next(e for e in entries if e[0] == 32514 and e[1] == rid)
        frames = storeys * (11 + 12)
        width, height = frames * 64, 36
        used = width * height
        if len(payload) < used or any(payload[used:]):
            raise ValueError(f'Unexpected CGPk length/padding for {rid}')
        pixels = bytearray(used)
        for column in range(width // 8):
            for y in range(height):
                start = (column * height + y) * 8
                dest = y * width + column * 8
                pixels[dest:dest + 8] = payload[start:start + 8]
        indexed = Image.frombytes('P', (width, height), bytes(pixels))
        indexed.putpalette(palette)
        indexed.info['transparency'] = 0
        path = ROOT / 'public/assets/graphics' / f'{rid}.png'
        indexed.convert('RGBA').save(path)
        outputs.append({'type': 32514, 'id': rid, 'offset': offset,
                        'size': len(payload), 'width': width, 'height': height,
                        'format': 'CGPk', 'path': str(path.relative_to(ROOT)),
                        'frames': frames, 'storeys': storeys})
    (ROOT / 'public/assets/lobby-transports.json').write_text(json.dumps(outputs, indent=2) + '\n')


if __name__ == '__main__':
    main()
