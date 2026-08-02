# ChapterBuilder Web

React + TypeScript + Vite PWA for building VidChopper chapter files entirely in the browser.

## Modes

- **2XKO** — player names, Point, Assist, and Fuse.
- **Street Fighter 6** — player names, character, and a Boolean Modern flag. Modern selections export as `M-Character`.
- **Generic chapters** — game-neutral or non-game chapter title and timestamps.
- **Planned stubs** — Marvel Tōkon: Fighting Souls, Avatar Legends: The Fighting Game, and Guilty Gear -Strive- are visible but disabled until their profiles are implemented.

Each editable project stores its profile ID and profile version. Browser projects from the original 2XKO-only storage format migrate to the 2XKO profile automatically.

## File types

- `event.chapterbuilder.json` preserves the selected mode, structured player/game fields, timestamps, output overrides, and other editable project state.
- `event-chapters.json` is the strict, game-neutral VidChopper schema consumed by the CLI.
- YouTube chapter text can also be exported directly.

## Features

- Imports and exports strict VidChopper chapter JSON.
- Saves and reopens fully editable ChapterBuilder projects.
- Loads the checked-in TNS 2XKO #36 compatibility fixture.
- Plays local video files without uploading them.
- Captures start/end timestamps from the current playhead.
- Autosaves the current project to versioned browser storage.
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
