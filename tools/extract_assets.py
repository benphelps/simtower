"""Extract Win16 NE resources from the supplied SimTower executable.

Requires Pillow for lossless DIB -> PNG conversion. Resource IDs and byte
offsets are preserved in the manifest so analysis is reproducible.
"""
from pathlib import Path
import hashlib
import io
import json
import struct
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'SimTowerDOS/SIMTOWER.EXE'
OUTPUT = ROOT / 'public/assets'


def resources(data):
    if data[:2] != b'MZ':
        raise ValueError('Expected an MZ executable')
    ne = struct.unpack_from('<I', data, 0x3c)[0]
    if data[ne:ne + 2] != b'NE':
        raise ValueError('Expected a Windows NE header')
    base = ne + struct.unpack_from('<H', data, ne + 0x24)[0]
    shift = struct.unpack_from('<H', data, base)[0]
    pos = base + 2

    def name(value):
        if value & 0x8000:
            return value & 0x7fff
        start = base + value
        return data[start + 1:start + 1 + data[start]].decode('latin1')

    while True:
        kind, count = struct.unpack_from('<HH', data, pos)
        if kind == 0:
            return
        pos += 8
        for _ in range(count):
            offset, size, flags, rid, _, _ = struct.unpack_from('<6H', data, pos)
            pos += 12
            offset, size = offset << shift, size << shift
            if offset + size > len(data):
                raise ValueError('Resource outside executable')
            yield name(kind), name(rid), offset, data[offset:offset + size]


def main():
    data = SOURCE.read_bytes()
    source_resources = list(resources(data))
    game_palette = Image.open(io.BytesIO(next(payload for kind, rid, _, payload in source_resources if kind == 2 and rid == 1515))).getpalette()
    manifest = {'source': str(SOURCE.relative_to(ROOT)),
                'sha256': hashlib.sha256(data).hexdigest(), 'resources': []}
    images = []
    for kind, rid, offset, payload in source_resources:
        entry = {'type': kind, 'id': rid, 'offset': offset, 'size': len(payload)}
        if kind == 2:
            # A Win16 RT_BITMAP is a DIB, without the BMP file header.
            image = Image.open(io.BytesIO(payload)).convert('RGB')
            target = OUTPUT / 'bitmaps' / f'{rid}.png'
            entry.update(width=image.width, height=image.height)
            images.append((rid, image.copy()))
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target)
        elif kind == 32514 and rid in [2536, 2537, 2538, 2600, 2601, 2602, 2664, 2665, 2666]:
            # CGPk is uncompressed 8-bit indexed data stored in vertical
            # 8 x 36 strips, not a row-major DIB. See IDA 0x30F8C/0x317E9.
            height = 36
            columns = len(payload) // (8 * height)
            width = columns * 8
            pixels = bytearray(width * height)
            for column in range(columns):
                for y in range(height):
                    start = column * 8 * height + y * 8
                    dest = y * width + column * 8
                    pixels[dest:dest + 8] = payload[start:start + 8]
            image = Image.frombytes('P', (width, height), bytes(pixels))
            image.putpalette(game_palette)
            target = OUTPUT / 'graphics' / f'{rid}.png'
            target.parent.mkdir(parents=True, exist_ok=True)
            image.convert('RGB').save(target)
            entry.update(width=width, height=height, format='CGPk')
            raw = ROOT / 'research/resources' / f'{kind}-{rid}.bin'
            raw.parent.mkdir(parents=True, exist_ok=True)
            raw.write_bytes(payload)
        elif payload[:4] == b'RIFF' and payload[8:12] == b'WAVE':
            target = OUTPUT / 'sounds' / f'{rid}.wav'
            size = struct.unpack_from('<I', payload, 4)[0] + 8
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload[:size])
        else:
            target = ROOT / 'research/resources' / f'{kind}-{rid}.bin'
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
        entry['path'] = str(target.relative_to(ROOT))
        manifest['resources'].append(entry)
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    # Indexed contact sheets are analysis artifacts, never substitutes for sprites.
    for page in range((len(images) + 39) // 40):
        sheet = Image.new('RGB', (1200, 1000), '#d9d9d9')
        draw = ImageDraw.Draw(sheet)
        for index, (rid, image) in enumerate(images[page * 40:(page + 1) * 40]):
            x, y = (index % 4) * 300, (index // 4) * 100
            draw.text((x + 4, y + 3), f'{rid}: {image.width} x {image.height}', fill='black')
            image.thumbnail((292, 76), Image.Resampling.NEAREST)
            sheet.paste(image, (x + 4, y + 20))
        sheet.save(ROOT / 'research' / f'contact-{page}.png')
    print(f'Extracted {len(images)} bitmaps and '
          f'{sum(r["path"].endswith(".wav") for r in manifest["resources"])} sounds')


if __name__ == '__main__':
    main()
