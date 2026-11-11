# BioAgent-world

Project website for **BioAgent-World: Interactive Digital Twins for Scalable Robot Skill Learning**.

The page presents skill-conditioned scene construction and interaction validation, state-consistent demonstration generation, real-robot transfer, and execution-driven world refinement. English and Chinese versions are available through the language switch.

## Local development

Node.js 22 or newer; no third-party build dependencies.

```sh
node scripts/check.mjs
node scripts/build.mjs
node scripts/serve.mjs --dist
# http://127.0.0.1:4173
```

The build writes a fresh `dist/` directory. GitHub Actions validates and deploys this directory to GitHub Pages on pushes to `main`. The Sites identity in `.openai/hosting.json` is preserved for the existing private preview.

## Content provenance

The current page is based on the user-supplied nine-page manuscript `BioAgent_World_cvpr.pdf`. It supersedes the first draft's description of the earlier offline BioagentNav implementation. The PDF itself is not distributed by this website; author affiliations, publication status, and acceptance claims are not inferred from the review template.

- `assets/paper-overview.webp`: manuscript Figure 1, extracted from the original embedded 3840×2160 image.
- `assets/paper-workflow.webp`: manuscript Figure 2, extracted from the original embedded 3840×2160 image.
- `assets/paper-real-executions.webp`: manuscript Figure 3, original 2326×1164 image.
- Aggregate transfer and data-production numbers reproduce Tables 1 and 2. `app.js` contains the successes out of 20 for all 11 skills and three backbones.
- Retention is the ratio of the macro-averaged success rates. Each skill is initialized independently, so results are not presented as end-to-end workflow success rates.
- Debugging-session and teleoperation-attempt counts retain their different definitions and are not described as a total labor-hour speedup.

## User-supplied videos

- `assets/task-real.mp4`: full `task.mp4` recording on the physical robot, 1920×1080, 30 fps, approximately 4:36. H.264/AAC with faststart; original duration and audio retained.
- `assets/waterbath-simulation.mp4`: full `waterbath_full_english.mp4` simulation recording, 1280×720, 15 fps, approximately 2:04. H.264 with faststart; embedded English task annotations preserved. The source has no audio track.
- `assets/research-overview.mp4`: silent 16-second montage: simulation seconds 18–26, followed by real recording seconds 30–38, 1280×720 at 30 fps. The montage is labeled as excerpts, not a synchronized trial pair.
- `assets/task-poster.jpg` and `assets/simulation-poster.jpg`: video stills at 35 and 21 seconds respectively.

The original files remain outside the repository. Web encodings are below the 32 MiB per-file source hosting limit; resolution and full durations are preserved. Former demonstration and schematic placeholders have been replaced by the new recordings and manuscript figures.

The geometric favicon and site styling are original to this website. Google Fonts supplies DM Sans and Manrope, with system-font fallbacks. No reference-site institution branding or media is used.
