# SimTower JS

A browser port of the Windows 3.x SimTower executable, with recovered simulation
rules, original game resources and Windows 3.1-style controls. Gameplay defaults
to waifu2x-upscaled artwork; **Options → Textures → Original** restores original pixels.

## Run

Requires **Node.js 22+**. No npm dependencies or original installation are needed
to play; runtime assets are included.

```sh
npm run dev
```

Open [localhost:5173](http://localhost:5173). The Maxis loading screen preloads
assets, then shows the original title and **New Tower / Load Saved Tower** choices.

- Build a ground-floor lobby, add floors, then rooms and transport.
- Use **Finger** to toggle elevator stops, drag end machinery, or double-click a shaft to program it.
- Use the original scrollbars or map to navigate; the mouse wheel also pans.
- **F1** opens the illustrated manual. Browser JSON saves support Save/Open and local autosave.

## Develop

```sh
npm test
npm run build
```

The build produces a standalone static site in `dist/`. Serve that directory
with any static web server. Tests run without the original executable; an
additional cursor byte-comparison check runs when local raw resources exist.

| Directory | Contents |
| --- | --- |
| `src/` | Simulation, renderer and browser UI |
| `public/assets/` | Original and waifu2x resources, fonts, data and manual |
| `tests/` | Recovered behavior and save/load regressions |
| `tools/` | Build, extraction and manual-generation scripts |
| `research/` | Authored source audits, manual source and feature checklist |

## Fidelity and recovery

The port is playable and still undergoing direct comparison with the original.
[The feature checklist](research/MANUAL_COVERAGE.md) records covered behavior,
remaining gaps and deliberate browser adaptations. Native `.TDT` saves remain deferred.

Optional asset regeneration requires Python 3, Pillow and a locally supplied
`SimTowerDOS/SIMTOWER.EXE`. Install the Python dependency with
`python3 -m pip install -r tools/requirements.txt`, then run `npm run extract`.
The original installation,
saves, IDA files, raw dumps, downloads and build output are ignored by Git.
[Development notes](research/DEVELOPMENT.md) describe the recovery workflow.

Original game credits and asset provenance are recorded in [NOTICE.md](NOTICE.md).
