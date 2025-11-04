# Easy Stream Schedule Tool
Like the name implies, this tool is meant to simplify sharing your stream schedule across social media platforms and your discord server by using your existing Twitch schedule! 


## Project intent

- Intent: This tool serves as an easy way for streamers, mods, and community managers to pull scheduled streams into a simple formatted list to share on Discord servers combined with a simple image showing upcoming streams that can be shared on social media as well.
- Audience: Anyone can use it if they want but if you're a streamer, moderator, or community manager this tool can save you some time or effort. Also if you're just not a creative individual but want to share your stream schedule with some visual flair.

## How to use (quickstart)

### Pre-Requisite: Schedule your upcoming streams from your [Twitch Dashboard](dashboard.twitch.tv)
1. From the left side menu to go to Settings -> Channel
2. Click Schedule in the top navigation on the Channel Settings page.
3. Add your streams! Be sure to put a title, time, and category for best results. 

### Using The Easy Schedule Tool
1. Visit: [Easy Schedule Tool](https://chrono32123.github.io/schedule-formatter/) (using GitHub Pages to host)
2. Input your twitch username or your twitch calendar URL
3. Get your next week of streams in a list that you can export into a custom image OR copy a list of Discord formatted timestamps to share on your local server.


## Project-specific notes (must-know for contributors)

- Entry points:
	- `src/App.tsx` — main UI, parsing, Twitch integration, and canonical `ParsedEvent` type.
	- `src/components/ScheduleImage.tsx` — offscreen DOM canvas + `GenerateScheduleImage` helper used to export PNGs.
- `index.html` loads `ical.js` from CDN and the code expects it as `window.ICAL`.
- Twitch: supply `VITE_TWITCH_CLIENT_ID` and `VITE_TWITCH_CLIENT_SECRET` in a `.env` / `.env.local` file for token fetching (client credentials flow).
- Image export is CSS-driven; sizing is controlled with CSS variables in `src/components/scheduleImage.css`.

## Environment variables

- VITE_TWITCH_CLIENT_ID — Twitch application client id (optional; needed for Twitch mode)
- VITE_TWITCH_CLIENT_SECRET — Twitch application secret (optional; needed for Twitch mode)

Place them in `.env.local` in the project root (example):

```
VITE_TWITCH_CLIENT_ID=your_client_id
VITE_TWITCH_CLIENT_SECRET=your_client_secret
```

## Testing

- Run tests with Vitest:

```bash
npm test
```

- Run local environment:
 ```bash
 npm run dev
 ```

There are basic smoke tests for `ScheduleImageTemplate` and `App` in `src/__tests__`.

## Troubleshooting

- CORS when fetching third-party `webcal://`/ICS sources is a browser/runtime limitation. Use local ICS samples or a proxy for testing.
- `window.ICAL` is provided by the CDN script in `index.html` — do not remove unless you modify import code accordingly.
- If tests fail locally due to peer-deps, run `npm install --legacy-peer-deps` as a temporary workaround (we updated testing dependencies to support React 19).

## Contributing

- If you change image layout, prefer editing `src/components/scheduleImage.css` and the style props set on `#schedule-image-canvas` rather than hardcoding sizes in JSX.
- When adding features that modify `ParsedEvent`, update the type in `src/App.tsx` and ensure `ScheduleImageTemplate` props are kept in sync.

## Where to look first when editing

- `src/App.tsx` — parsing, enrichment, API calls, and main UI.
- `src/components/ScheduleImage.tsx` & `src/components/scheduleImage.css` — image layout and export.
- `index.html` — global scripts (ical.js) and fonts.

Feel free to fill in the sections above (project intent, audience, goals) with the specific details you'd like to publish for this project.
