#!/usr/bin/env python3
"""Fetch pinned official macOS universal upscalers into this workspace only."""
import hashlib
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1] / 'tmp/upscalers'
RELEASES = [
    ('https://github.com/nihui/waifu2x-ncnn-vulkan/releases/download/20250915/waifu2x-ncnn-vulkan-20250915-macos.zip',
     'a5b58b239eb3aa030db5464f6759637fe412d8c07891a4346ea57f708b514d42'),

]

if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    for url, expected in RELEASES:
        archive = ROOT / url.rsplit('/', 1)[1]
        if not archive.exists():
            print(f'Downloading {archive.name}', flush=True)
            urllib.request.urlretrieve(url, archive)
        actual = hashlib.sha256(archive.read_bytes()).hexdigest()
        if actual != expected:
            raise RuntimeError(f'Checksum mismatch for {archive.name}: {actual}')
        with zipfile.ZipFile(archive) as files:
            for entry in files.infolist():
                if not (ROOT / entry.filename).resolve().is_relative_to(ROOT.resolve()):
                    raise RuntimeError(f'Unsafe archive path: {entry.filename}')
            files.extractall(ROOT)
        print(f'Verified and unpacked {archive.name}', flush=True)
    for binary in [ROOT / 'waifu2x-ncnn-vulkan-20250915-macos/waifu2x-ncnn-vulkan']:
        binary.chmod(binary.stat().st_mode | 0o100)
