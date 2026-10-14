"""Losslessly package original Win16 cursor DIBs and hotspots for browsers."""
from pathlib import Path
import io,json,struct
from PIL import Image
from extract_assets import resources
ROOT=Path(__file__).resolve().parents[1]
def main():
    entries={(kind,rid):payload for kind,rid,_,payload in resources((ROOT/'SimTowerDOS/SIMTOWER.EXE').read_bytes())}
    out=ROOT/'public/assets/cursors';out.mkdir(exist_ok=True);metadata={}
    for group in range(1002,1006):
        data=entries[12,group]
        if struct.unpack_from('<3H',data)!=(0,2,1):raise ValueError('Unexpected original cursor group')
        width,doubleHeight,planes,bpp,size,rid=struct.unpack_from('<4HIH',data,6)
        resource=entries[1,rid][:size];hx,hy=struct.unpack_from('<2H',resource);dib=resource[4:];height=doubleHeight//2
        directory=struct.pack('<3H',0,2,1)+struct.pack('<4B2H2I',width,height,2,0,hx,hy,len(dib),22)
        (out/f'{group}.cur').write_bytes(directory+dib)
        # The XOR/AND source has no invert pixels; PNG keeps exact RGBA.
        icon=struct.pack('<3H',0,1,1)+struct.pack('<4B2H2I',width,height,2,0,planes,bpp,len(dib),22)+dib
        Image.open(io.BytesIO(icon)).convert('RGBA').save(out/f'{group}.png')
        metadata[group]={'width':width,'height':height,'hotspot':[hx,hy],'resource':rid}
    (out/'manifest.json').write_text(json.dumps(metadata,indent=2)+'\n')
if __name__=='__main__':main()
