#!/usr/bin/env python3
"""Reproducible, local-only texture experiment. Originals are never modified.

Requires Pillow and the official portable tools unpacked into tmp/upscalers.
Run with GPU access on macOS; a restricted sandbox may hide Metal.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import time

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / 'tmp/upscalers'
OUTPUT = ROOT / 'public/assets/upscaled'
KEYED = {900, 901, 902, 903, 904, 1001, 1002, 1003, 21256, 700, 702, 703,
         1069, 1128, 1129, 1512, 1513, 1514, 1515, 1516, 1517, 1518,
         2088, 2408, 2409, 2472, 2473, 2728, 2792, 3624,
         3944, 3945, 3946, 3947, 3948, 3949}
MODES = {
    'waifu2x': ('waifu2x CUnet · no denoise · 2×', 2),
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_mask(source, rid=None):
    plane = ROOT / 'public/assets/indices' / f'{rid}.png'
    if rid is not None and plane.exists():
        return Image.open(plane).convert('L').point(lambda index: 0 if index == 0 else 255)
    rgb = source.convert('RGB')
    mask = Image.new('L', rgb.size, 255)
    pixels = rgb.get_flattened_data() if hasattr(rgb, 'get_flattened_data') else rgb.getdata()
    mask.putdata([0 if pixel == (255, 255, 255) else 255 for pixel in pixels])
    return mask


def command(mode, input_path, output_path):
    if mode == 'waifu2x':
        tool = TOOLS / 'waifu2x-ncnn-vulkan-20250915-macos'
        return [str(tool / 'waifu2x-ncnn-vulkan'), '-i', str(input_path), '-o', str(output_path),
                '-s', '2', '-n', '-1', '-m', str(tool / 'models-cunet'), '-t', '128', '-j', '1:1:1']
    raise ValueError('Unsupported upscaler')


def run(mode, resources):
    started = time.monotonic()
    work = ROOT / 'tmp/upscale-work' / mode
    work.mkdir(parents=True, exist_ok=True)
    log = work / 'inference.log'
    records = []
    for folder in ('bitmaps', 'graphics'):
        raw = work / folder
        raw.mkdir(exist_ok=True)
        cmd = command(mode, ROOT / 'public/assets' / folder, raw)
        with log.open('a') as stream:
            subprocess.run(cmd, stdout=stream, stderr=stream, check=True)
        for r in resources:
            if Path(r['path']).parent.name != folder:
                continue
            source_path = ROOT / r['path']
            source = Image.open(source_path).convert('RGB')
            result = Image.open(raw / source_path.name).convert('RGB')
            native_scale = MODES[mode][1]
            assert result.size == (source.width * native_scale, source.height * native_scale), r['id']
            if native_scale != 2:
                result = result.resize((source.width * 2, source.height * 2), Image.Resampling.LANCZOS)
            if r['id'] in KEYED:
                # Do not re-key AI whites: the network changes their RGB values.
                # Exact original silhouettes survive at 2x, including white holes.
                result.putalpha(alpha_mask(source, r['id']).resize(result.size, Image.Resampling.NEAREST))
            destination = OUTPUT / mode / folder / source_path.name
            destination.parent.mkdir(parents=True, exist_ok=True)
            result.save(destination)
            reopened = Image.open(destination)
            assert reopened.size == (source.width * 2, source.height * 2)
            if r['id'] in KEYED:
                expected = alpha_mask(source, r['id']).resize(reopened.size, Image.Resampling.NEAREST)
                assert ImageChops.difference(reopened.getchannel('A'), expected).getbbox() is None
            records.append({'id': r['id'], 'path': str(destination.relative_to(ROOT / 'public')),
                            'width': source.width, 'height': source.height, 'scale': 2,
                            'source_sha256': digest(source_path), 'sha256': digest(destination),
                            'bytes': destination.stat().st_size, 'original_alpha_mask': r['id'] in KEYED})
        print(f'{mode}: {folder} complete', flush=True)
    metadata = {'label': MODES[mode][0], 'scale': 2, 'native_scale': MODES[mode][1],
                'seconds': round(time.monotonic() - started, 2), 'resources': records,
                'binary_sha256': digest(Path(command(mode, '.', '.')[0])),
                'commands': [[str(item).removeprefix(str(ROOT) + '/') for item in command(mode, ROOT / 'public/assets' / f, work / f)] for f in ('bitmaps', 'graphics')]}
    (OUTPUT / mode / 'manifest.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(f'{mode}: verified {len(records)} resources in {metadata["seconds"]}s', flush=True)


def comparison():
    samples = [(1448, 'Office', 0, 0, 144, 24), (1576, 'Condo', 0, 0, 128, 24),
               (1384, 'Restaurant', 0, 0, 192, 24), (1768, 'Fast food', 0, 0, 128, 24),
               (2537, 'Lobby', 0, 0, 192, 36), (1065, 'Elevator', 0, 0, 96, 36),
               (1515, 'People', 0, 0, 160, 24), (300, 'Toolbar / small text', 0, 0, 192, 32)]
    modes = ['original', *MODES]
    width, row = 800, 180
    out = Image.new('RGB', (width * len(modes), 90 + row * len(samples)), '#e9e7e1')
    draw = ImageDraw.Draw(out)
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
    small = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 17)
    for column, mode in enumerate(modes):
        draw.text((column * width + 24, 22), 'Original · nearest pixels' if mode == 'original' else MODES[mode][0], font=font, fill='#222222')
        for index, (rid, label, x, y, w, h) in enumerate(samples):
            folder = 'graphics' if rid == 2537 else 'bitmaps'
            scale = 1 if mode == 'original' else 2
            path = ROOT / 'public/assets' / folder / f'{rid}.png' if mode == 'original' else OUTPUT / mode / folder / f'{rid}.png'
            im = Image.open(path).convert('RGBA')
            if mode == 'original' and rid in KEYED:
                im.putalpha(alpha_mask(im, rid))
            im = im.crop((x * scale, y * scale, (x + w) * scale, (y + h) * scale))
            im = im.resize((w * 4, h * 4), Image.Resampling.NEAREST)
            top = 90 + index * row
            draw.text((column * width + 24, top), f'{label} · resource {rid} · shown at 4×', font=small, fill='#555555')
            out.paste(im, (column * width + 24, top + 32), im)
    out.save(OUTPUT / 'comparison.png')
    overview = Image.new('RGB', (1125, 370), '#e9e7e1')
    draw = ImageDraw.Draw(overview)
    for x, label in [(24, 'OFFICE'), (350, 'RESTAURANT'), (785, 'PEOPLE')]:
        draw.text((x, 14), label, font=small, fill='#555555')
    for row_index, mode in enumerate(modes):
        y = 50 + row_index * 160
        label = 'Original pixels' if mode == 'original' else MODES[mode][0]
        draw.text((24, y), label, font=font, fill='#222222')
        for rid, x, w in [(1448, 24, 72), (1384, 350, 96), (1515, 785, 80)]:
            scale = 1 if mode == 'original' else 2
            path = ROOT / 'public/assets/bitmaps' / f'{rid}.png' if mode == 'original' else OUTPUT / mode / 'bitmaps' / f'{rid}.png'
            im = Image.open(path).convert('RGBA')
            if mode == 'original' and rid in KEYED:
                im.putalpha(alpha_mask(im, rid))
            im = im.crop((0, 0, w * scale, 24 * scale)).resize((w * 4, 96), Image.Resampling.NEAREST)
            overview.paste(im, (x, y + 38), im)
    overview.save(OUTPUT / 'overview.png')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=MODES, action='append')
    parser.add_argument('--comparison-only', action='store_true')
    args = parser.parse_args()
    resources = [r for r in json.loads((ROOT / 'public/assets/manifest.json').read_text())['resources'] if r['path'].endswith('.png')]
    if not args.comparison_only:
        for mode in args.mode or MODES:
            run(mode, resources)
    if all((OUTPUT / mode / 'manifest.json').exists() for mode in MODES):
        comparison()
