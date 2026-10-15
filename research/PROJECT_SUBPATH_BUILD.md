# Project-subpath production build

`BASE_PATH=/simtower/ npm run build` emits the game for GitHub Pages project
hosting. Omit BASE_PATH for the unchanged root build. The base is validated
before replacing dist; nested unreserved URL path segments are supported.

The deployment transform is confined to emitted files. It rebases known
application URL prefixes in HTML/CSS/module literal and template boundaries,
and walks JSON string values for the three existing loader contracts:
original public/assets paths, generated assets paths prepended with `/`, and
absolute /assets index paths. It leaves relative module/viewer URLs, external
URLs, hash links, binary source provenance and source/dev files unchanged.
No fetch/Image/browser API is intercepted. Manual Return to game points to
the project root rather than the domain root.

Four tests cover base validation, all loader path forms, dynamic templates,
external/relative path preservation, transformation idempotence, and every
shipped original/tall-lobby/indexed/Waifu/manual resource's filesystem target.

Actual emitted build was served under http://localhost:5174/simtower/.
Browser verification booted the game after its858 preloads with no console
errors/warnings; Help opened its styled viewer, navigated topics, and loaded
startup/tutorial illustrations at /simtower/assets/manual/images. The texture
viewer loaded259 Waifu textures and its Resource inspector successfully.
Server logs recorded no asset404s during the clean final verification. A
favicon request and earlier requests during an overlapping default build were
outside that final verification; the overlapping build was resolved before
repeating the checks. Screenshot proof is in research/screenshots/
`pages-subpath-manual.jpg` and `pages-subpath-textures.jpg`.

The default root build was run afterward and confirmed to retain /src/main.js
and public/assets manifest values. Disposable browser tabs and the temporary
production proof server were closed. GitHub publication/Pages settings and the
workflow belong to the root agent's release task.
