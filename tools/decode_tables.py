"""Decode verified economic and Pascal string tables; see research/REVERSE_ENGINEERING.md."""
from pathlib import Path
import json
import struct
import io
from PIL import Image
from extract_assets import resources

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / 'research/resources'
strings = {}
for path in sorted(RES.glob('32518-*.bin')):
    data = path.read_bytes()
    count = struct.unpack_from('>H', data)[0]
    pos, values = 2, []
    for _ in range(count):
        length = data[pos]
        pos += 1
        values.append(data[pos:pos + length].decode('latin1'))
        pos += length
    strings[int(path.stem.split('-')[1])] = values

def table(rid):
    return list(struct.unpack('>64i', (RES / f'32523-{rid}.bin').read_bytes()[:256]))

part = (RES / '32517-1000.bin').read_bytes()
palette = Image.open(io.BytesIO(next(payload for kind, rid, _, payload in resources((ROOT / 'SimTowerDOS/SIMTOWER.EXE').read_bytes()) if kind == 2 and rid == 1515))).getpalette()
icon_types = list((RES / '32519-1000.bin').read_bytes()[:26])
unlocks = {}
for rating in range(1, 6):
    slots = (RES / f'32519-{1000 + rating}.bin').read_bytes()
    count = struct.unpack_from('>H', slots)[0]
    for slot in struct.unpack_from(f'>{count}H', slots, 2):
        group, icon = slot >> 8, slot & 255
        if group:
            submenu = (RES / f'32520-{1000 + group}.bin').read_bytes()
            n = struct.unpack_from('>H', submenu)[0]
            icons = struct.unpack_from(f'>{n}H', submenu, 2)
        else:
            icons = [icon]
        for i in icons:
            unlocks.setdefault(icon_types[i], rating)
data = {
    'moneyScale': 100,
    'cost': table(1000),
    'rent': [table(1001)[i:i + 4] for i in range(0, 64, 4)],
    'maintenance': table(1002),
    'populationThresholds': list(struct.unpack_from('>4i', part, 0x42)),
    'unlockRating': unlocks,
    'toolbar': {
        'iconTypes': icon_types,
        'ratings': {rating: list(struct.unpack_from(f'>{struct.unpack_from(">H", (RES / f"32519-{1000 + rating}.bin").read_bytes())[0]}H', (RES / f'32519-{1000 + rating}.bin').read_bytes(), 2)) for rating in range(1, 6)},
        'groups': {group: list(struct.unpack_from(f'>{struct.unpack_from(">H", (RES / f"32520-{1000 + group}.bin").read_bytes())[0]}H', (RES / f'32520-{1000 + group}.bin').read_bytes(), 2)) for group in range(1, 23)},
    },
    'businessReceipts': {
        12: {'thresholds': list(struct.unpack_from('>3h', part, 0x16)), 'amounts': list(struct.unpack_from('>4h', part, 0x6a))},
        6: {'thresholds': list(struct.unpack_from('>3h', part, 0x24)), 'amounts': list(struct.unpack_from('>4h', part, 0x62))},
    },
    'lobbyMaintenance': list(struct.unpack_from('>3h', part, 0x9c)),
    'tenantStress': {'good': list(struct.unpack_from('>3h',part,0x0a)), 'bad': list(struct.unpack_from('>3h',part,0x10))},
    'transport': {'queueTimeout':struct.unpack_from('>h',part,0)[0], 'fullQueueStress':struct.unpack_from('>h',part,2)[0], 'boardingFailureStress':struct.unpack_from('>h',part,4)[0], 'noRouteStress':struct.unpack_from('>h',part,6)[0], 'escalatorStress':struct.unpack_from('>h',part,0x3e)[0], 'stairStress':struct.unpack_from('>h',part,0x40)[0]},
    'visits': {'missingPenalty':struct.unpack_from('>h',part,8)[0], 'shop':struct.unpack_from('>h',part,0x1c)[0], 'restaurant':struct.unpack_from('>h',part,0x2a)[0], 'fastfood':struct.unpack_from('>h',part,0x36)[0]},
    'movie': {'thresholds':list(struct.unpack_from('>3h',part,0x72)), 'receipts':list(struct.unpack_from('>4h',part,0x78)), 'classicAudience':list(struct.unpack_from('>4h',part,0x88)), 'newAudience':list(struct.unpack_from('>4h',part,0x80)), 'newCost':struct.unpack_from('>h',part,0x96)[0], 'classicCost':struct.unpack_from('>h',part,0x98)[0]},
    'events': {'delay':struct.unpack_from('>h',part,0x5c)[0], 'securityFireDelay':struct.unpack_from('>h',part,0x5e)[0], 'fireCrewCost':struct.unpack_from('>h',part,0x9a)[0], 'bombDemand':list(struct.unpack_from('>3h',part,0xa2)), 'treasure':list(struct.unpack_from('>3h',part,0xa8))},
    'skyPalettes': {rid: [[(RES / f'32515-{rid}.bin').read_bytes()[(i + 1) * 8 + channel] for channel in (2, 4, 6)] for i in range(188, 194)] for rid in range(1000, 1004)},
    'skyBasePalette': [palette[i * 3:i * 3 + 3] for i in range(188, 194)],
    'strings': strings,
    'alerts': {int(path.stem.split('-')[1]): {'flags':struct.unpack_from('<H',path.read_bytes())[0], 'text':path.read_bytes()[4:].split(b'\0',1)[0].decode('cp1252')} for path in sorted(RES.glob('32513-*.bin'))},
    'credits':(RES/'32521-128.bin').read_bytes().split(b'\0',1)[0].decode('cp1252'),
}
(ROOT / 'public/assets/game-data.json').write_text(json.dumps(data, indent=2) + '\n')
print('Decoded economic tables and', len(strings), 'string tables')
