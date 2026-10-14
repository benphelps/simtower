"""Decode SimTower's original Win16 application/file icons, preserving masks.

RT_NAMETABLE15/1 maps TOWER_APPICON to RT_GROUP_ICON14/1 and
TOWER_FILEICON to14/2; MAINWNDPROC class registration4A415 uses the former.
Resource blocks are NE-padded, so the group entry's byte count is authoritative.
"""
from pathlib import Path
import io
import struct
from PIL import Image
from extract_assets import resources
ROOT=Path(__file__).resolve().parents[1]

def main():
    entries=list(resources((ROOT/'SimTowerDOS/SIMTOWER.EXE').read_bytes()))
    out=ROOT/'public/assets/icons';out.mkdir(exist_ok=True)
    for group,name in [(1,'application'),(2,'file')]:
        payload=next(b for kind,rid,_,b in entries if kind==14 and rid==group)
        reserved,kind,count=struct.unpack_from('<3H',payload)
        if (reserved,kind,count)!=(0,1,1):raise ValueError('Unexpected icon group')
        width,height,colors,pad,planes,bpp,size,rid=struct.unpack_from('<4B2HIH',payload,6)
        dib=next(b for kind,identifier,_,b in entries if kind==3 and identifier==rid)[:size]
        ico=struct.pack('<3H',0,1,1)+struct.pack('<4B2H2I',width,height,colors,pad,planes,bpp,size,22)+dib
        Image.open(io.BytesIO(ico)).convert('RGBA').save(out/f'{name}.png')
if __name__=='__main__':main()
