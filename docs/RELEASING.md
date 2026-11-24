# Releasing

GitHub Pages publishes the `main` branch. Every push to `main` is a release.

## Checklist

1. Make the change on a branch.
2. Raise the version to the **same number in two places**:
   - `APP_VERSION` in `index.html`
   - `version` in `version.json`, plus a short `notes` line (people see it in the "Update available" bar)
3. **Do not change `sw.js`** (see below). Before version 15 its cache name was raised every release; that is no longer done.
4. Test on a phone-sized screen, upright and sideways, light and dark.
5. Merge to `main`. Pages rebuilds in a minute or two. If a build sticks, request one:
   `gh api -X POST repos/nxlx-systems/nxlx-phase-scorekeeper/pages/builds`

## Rules that protect people's scores

- Scores live in the browser's `localStorage` under the key **`phase10.v1`**. Never rename it, and keep old saved data readable.
- The service worker serves the saved copy first (works offline). Installed apps only change when the person taps **Update now**, which checks for a connection, saves a safety copy (`phase10.beforeUpdate`, restorable from the Menu) and then clears the saved app files.
- **Keep `sw.js` the same between versions.** A browser that sees a changed `sw.js` installs it by itself, which updates the app without "Update now" and without the safety copy. Change it only to fix the service worker, and know that that one release reaches installed apps without asking.
- The web address must not change: scores belong to the address, so a new address starts with no scores.

## Screenshots

The README pictures in `docs/` use a made-up game (Sam, Jo, Lee, Kai). Never use real people's names or scores.
