# 10.21 laboratory viewer

## Source and loading

The user-supplied `20261111_lab1021_web_assets_v1.zip` was extracted locally. Its original package is preserved in `data/`; `data/README.md` and `data/scene.json` define the export conventions. All 23 entries passed `shasum -a 256 -c SHA256SUMS` in the extracted resource directory. `node scripts/check.mjs` independently rechecks those SHA256 hashes on every validation.

PlayCanvas **2.24.0**, from the official npm `playcanvas` package, is bundled in `vendor/` with its MIT license. The npm distribution SHA512 integrity was checked before vendoring. The viewer requires WebGL2 and uses no runtime CDN or additional build dependencies.

The manifest is the only scene entry point. Background SOG and static-room GLB load first, at identity. The 15 asset groups follow with bounded concurrency. Each group applies `position_m` and `rotation_xyzw` once to a common parent of its GLB and SOG children. The data are already metric Y-up; no additional unit conversion, axis rotation, `world_from_asset`, or `web_from_source` transform is applied. The build copies the original resource files without modification.

## Controls and selection

- Left drag: orbit. Right/middle drag or Shift-drag: pan. Wheel: zoom.
- Touch: one finger orbits; two fingers pan and pinch to zoom.
- Toolbar and keys `2` / `3`: the two manifest camera presets. `R`: reset to the initial operation site 2.
- Arrow keys: orbit; Shift + arrows: pan. `+` / `-`: zoom. Escape: clear selection. Focus the canvas for keyboard controls.
- A left-pointer gesture moving less than 6 CSS pixels is a click. Dragging, cancellation, and multi-pointer gestures suppress selection. Results from asynchronous GPU picking are discarded after a camera change.
- GPU picking supports GLB and SOG. Registered local `pick_bounds_y_up_m` supply a fallback if the rendered selection has no registered asset. Highlighting combines mesh emission with a wire bounds overlay, including for transparent or scanned objects.
- The directory selects equipment; “Focus on this object” centers it. It does not change asset placement.

The property panel shows both language names, the original asset ID, source-local X/Y/Z dimensions in meters, dimension evidence, purpose, and geometry provenance. Only the rack dimensions have user-confirmed STL scale. Other displayed dimensions are bounds of exported preview geometry, not independently measured physical dimensions.

## Browser validation — 2026-11-11

Validation uses the built `dist/` served at `/BioAgent_worldweb/`, matching a GitHub Pages project subpath. All **19/19** SOG/GLB files loaded; **15/15** asset groups were present, with zero loading errors or browser console warnings/errors during the verified session.

The following were selected by actual canvas clicks, after clearing any directory selection. Each produced the expected ID, bilingual property panel, and visible highlight:

| Equipment | Original asset ID | Observed picking |
| --- | --- | --- |
| Black tube rack | `reagent_rack_black_01` | rendered |
| Pipette | `pipette_body` | rendered |
| Six-well plate | `six_well_plate` | rendered, transparent geometry |
| Six-well plate lid | `six_well_plate_cover` | rendered, transparent geometry |
| Tube capper | `capper_01` | rendered, GLB + SOG group |
| Water bath | `waterbath_01` | rendered, GLB + SOG group |

Dragging the view retained the previously selected rack instead of selecting an object at release. Pan, zoom, preset switching, reset, and Chinese/English switching were checked. The automated checks also exercise inverse transforms, ray/bounds hits and misses, and the click/drag threshold. The other nine groups are available in the directory; individual canvas selection of those groups has not been exhaustively checked. Touch controls need a physical touch-device pass.

The English and Chinese homepage links both navigate correctly and share the language preference with the viewer. A 390 × 844 responsive viewport uses the stacked mobile layout with no horizontal page overflow. This checks layout, not physical mobile GPU performance.

Both operation presets were compared with `data/reference/`. The capper, rack, pipette stand, tip box, waste container, and water bath retain the reference's relative placement and orientation. Viewport aspect and camera FOV affect framing; manifest eye/target values are used unchanged.

## Remaining visual limitations

- The supplied package omits the robot seen in the two simulation reference images. This page displays the exported room and equipment; it does not recreate the missing robot or its motion.
- The plate and lid retain the export's approximate transparent materials and are pale against the bright teal table. Their selection outlines improve identification, but physically accurate plastic/refraction remains future material work.
- Room, capper, and bath scans show view-dependent softness, incomplete surfaces, and capture artifacts in close or oblique views. SOG and GLB can differ in shading where they meet.
- The background contains about 1.73 million Gaussians. Initial decode/upload and interactive performance depend on GPU capability; low-end/mobile performance has not been benchmarked. Loading errors are displayed with the failing relative resource paths.
- The page is a visual explorer; it does not run simulation physics or robot execution.
