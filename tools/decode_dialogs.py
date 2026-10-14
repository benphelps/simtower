"""Read Win16 RT_DIALOG templates and native pixel-coordinate dialog tables."""
from pathlib import Path
import struct,json
ROOT=Path(__file__).resolve().parents[1]
RES=ROOT/'research/resources'
CLASSES={0x80:'button',0x81:'edit',0x82:'static',0x83:'listbox',0x84:'scrollbar',0x85:'combobox'}
def parse(payload,encoding='cp1252'):
    pos=0
    def z():
        nonlocal pos
        end=payload.index(0,pos); value=payload[pos:end].decode(encoding,errors='replace');pos=end+1;return value
    def identifier(control=False):
        nonlocal pos
        if payload[pos]==255:
            pos+=1;n=struct.unpack_from('<H',payload,pos)[0];pos+=2;return n
        if control and payload[pos]>=128:
            n=payload[pos];pos+=1;return CLASSES.get(n,n)
        return z()
    style,count,x,y,w,h=struct.unpack_from('<IB4h',payload,0);pos=13
    size=[w,h]
    window_style=style
    menu=identifier();cls=identifier();title=z()
    font=None
    if style&0x40:
        points=struct.unpack_from('<H',payload,pos)[0];pos+=2;font={'points':points,'family':z()}
    controls=[]
    for _ in range(count):
        x,y,w,h,cid,style=struct.unpack_from('<4hHI',payload,pos);pos+=14
        cls=identifier(True);text=identifier();extra=payload[pos];pos+=1+extra
        controls.append({'id':cid,'class':cls,'text':text,'style':style,'rectDU':[x,y,w,h]})
    return {'title':title,'style':window_style,'font':font,'controls':controls,'templateSizeDU':size}
dialog_paths=sorted(RES.glob('5-*.bin'))
position_paths=sorted(RES.glob('32516-*.bin'))
if not dialog_paths or not position_paths:
    missing=', '.join(kind for kind,paths in [('RT_DIALOG (5-*.bin)',dialog_paths),('DTMP (32516-*.bin)',position_paths)] if not paths)
    raise SystemExit(f'Missing original dialog inputs: {missing}. Restore research/resources with tools/extract_assets.py and a local SimTowerDOS/SIMTOWER.EXE. Existing public/assets/dialogs.json was not changed.')
# These three stock templates use dialog units only. Every other template
# in the supplied executable has a native pixel-coordinate DTMP companion.
dialog_unit_only={'1','123','124'}
missing_positions=[f'32516-{path.stem[2:]}.bin' for path in dialog_paths if path.stem[2:] not in dialog_unit_only and not (RES/f'32516-{path.stem[2:]}.bin').is_file()]
if missing_positions:
    raise SystemExit(f'Missing original dialog coordinate inputs: {", ".join(missing_positions)}. Restore research/resources with tools/extract_assets.py. Existing public/assets/dialogs.json was not changed.')
result={}
for path in dialog_paths:
    rid=path.stem[2:]
    try: dialog=parse(path.read_bytes(),'cp932' if 4000 <= int(rid) <= 4002 else 'cp1252')
    except (ValueError,IndexError,struct.error) as e:
        raise ValueError(f'{path}: {e}')
    positions=RES/f'32516-{rid}.bin'
    if positions.exists():
        pixels=positions.read_bytes()
        start=pixels.index(0)+1
        width,height,count=struct.unpack_from('<3H',pixels,start)
        rect_start=start+6
        dialog['hotspots']={cid:list(struct.unpack_from('<4h',pixels,rect_start+(cid-1)*8)) for cid in range(1,count+1)}
        if pixels[0]==0:
            dialog['size']=[width,height]
            for control in dialog['controls']:
                cid=control['id']
                if 0<cid<=count:
                    x,y,right,bottom=dialog['hotspots'][cid]
                    control['rect']=[x,y,right-x,bottom-y]
            # Native icon entries need not be represented by a child HWND.
            child_ids={c['id'] for c in dialog['controls']}
            for cid in range(1,count+1):
                x,y,right,bottom=dialog['hotspots'][cid]
                if cid not in child_ids and right>=10000 and bottom==0:
                    dialog.setdefault('icons',[]).append({'id':right,'x':x,'y':y})
        else:
            dialog['background']=pixels[:start-1].decode('ascii')
            for control in dialog['controls']:
                if control['id'] in dialog['hotspots']:
                    x,y,right,bottom=dialog['hotspots'][control['id']]
                    control['rect']=[x,y,right-x,bottom-y]
    result[rid]=dialog
(ROOT/'public/assets/dialogs.json').write_text(json.dumps(result,indent=2)+'\n')
for rid,d in result.items():
    print(rid,repr(d['title']),d.get('size',d.get('background')),[(c['id'],c['class'],c['text']) for c in d['controls']])
