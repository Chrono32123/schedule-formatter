## Repository overview

This is a small single-page React + Vite app (TypeScript) for formatting and exporting stream schedules.
- Key entry points: `src/App.tsx` (parsing, Twitch integration, UI) and `src/components/ScheduleImage.tsx` (offscreen canvas + image export).
- Build/dev: Vite (`npm run dev`, `npm run build`, `npm run preview`) — see `package.json` scripts.

## Important project-specific details for an AI coding agent

- ical.js is loaded from CDN in `index.html` and accessed as `window.ICAL` (not imported). When modifying calendar parsing, prefer keeping the CDN approach or update `index.html` accordingly.
- Twitch API: `VITE_TWITCH_CLIENT_ID` and `VITE_TWITCH_CLIENT_SECRET` environment variables are required for token fetches (client-credentials flow). Examples go in a `.env` / `.env.local` with VITE_ prefix.
- Image generation uses CSS-driven layout in `src/components/scheduleImage.css` and `html-to-image` to export a fixed-size PNG. The DOM node is rendered offscreen (positioned at `left: -9999px`) and CSS variables control sizing and scaling.

## Patterns and conventions to follow

- Keep UI logic in `src/App.tsx`. It contains most parsing/enrichment, network calls, and state shape. Exported type `ParsedEvent` in `App.tsx` is the canonical event shape used by `ScheduleImage`.
- `ScheduleImage.tsx` exposes two exports:
  - `ScheduleImageTemplate`: a React component that renders the offscreen canvas. It expects props matching `ParsedEvent[]`, sizes, and helper `extractCategory`.
  - `GenerateScheduleImage`: an async helper that finds `#schedule-image-canvas` and calls `html-to-image` to produce and trigger a PNG download.
- When changing layout/exports, prefer editing CSS variables in `scheduleImage.css` and the style props set on `#schedule-image-canvas` rather than hardcoding sizes.

## Build, run and deploy notes

- Local dev: `npm run dev` (Vite dev server). Use `pwsh` or standard shells — vite is configured in `vite.config.ts` with `base: '/schedule-formatter/'` for GitHub Pages builds.
- Build: `npm run build`. Deploy: `npm run deploy` uses `gh-pages` to push the `build` directory (homepage in `package.json`).
- If you encounter CORS when fetching arbitrary webcal/ICS URLs, it's a runtime environment limitation (browser). Recommend testing with local ICS files or a proxied endpoint.

## Examples (concrete references)

- To find parsing logic and timestamp formatting, inspect `src/App.tsx` (search for `formatDiscordTimestamp`, `fetchAndParseCalendar`, and `ParsedEvent`).
- To change how images are exported or add alternate sizes, edit `src/components/ScheduleImage.tsx` (check `size: {width,height}` usage) and corresponding CSS in `src/components/scheduleImage.css`.

## Small gotchas

- `window.ICAL` is provided by `index.html` — adding or removing the script must be considered globally.
- Twitch token refresh is implemented with client-credentials flow in `App.tsx`; tests or edits that touch this flow should preserve uses of `accessToken` and `clientId` checks.
- Some dependencies (moment, html-to-image, ical.js) are used in-browser — server-side or SSR changes may require alternate libraries or bundling adjustments.

## Where to look first when editing

- `src/App.tsx` — overall flow, network calls, ParsedEvent type.
- `src/components/ScheduleImage.tsx` and `src/components/scheduleImage.css` — image layout and export.
- `index.html` — global scripts (ical.js) and fonts.
- `package.json` & `vite.config.ts` — scripts, build base path for GitHub Pages.

If anything here is unclear or you need extra details (examples of .env, tests, or a checklist for adding a new export size), tell me which piece to expand and I will update this file.
