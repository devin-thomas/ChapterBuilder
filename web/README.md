# ChapterBuilder Web

React + TypeScript + Vite PWA for building VidChopper chapter files entirely in the browser.

## Features

- Preserves the original 2XKO match-entry workflow.
- Imports and exports strict VidChopper chapter JSON.
- Loads the checked-in TNS 2XKO #36 compatibility fixture.
- Plays local video files without uploading them.
- Captures start/end timestamps from the current playhead.
- Autosaves the current project to versioned browser storage.
- Exports YouTube chapter text.
- Works offline after the first successful load.

## Development

```bash
cd web
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

## Cloudflare Pages

Use the repository root directory `web`, build command `npm run build`, and output directory `dist`.
See `../docs/cloudflare-pages.md` for the full setup.
