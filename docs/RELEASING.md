# Releasing

GitHub Pages publishes the `main` branch. Every push to `main` is a release, so changes reach `main` only through a pull request whose checks have passed.

## Checklist

1. Make the change on a branch and open a pull request. The template lists the release steps.
2. Raise the version to the **same number in two places**:
   - `APP_VERSION` in `index.html`
   - `version` in `version.json`, plus a short `notes` line (people see it in the "Update available" bar)
3. **Do not change `sw.js`** (see below). Before version 15 its cache name was raised every release; that is no longer done.
4. Add a line for the version to `CHANGELOG.md`.
5. Wait for the **Checks** workflow to pass (see below), and for a review.
6. Test on a phone-sized screen, upright and sideways, light and dark. Say in the pull request what was and was not tried on a real device.
7. Merge. Pages rebuilds in a minute or two. If a build sticks, request one:
   `gh api -X POST repos/nxlx-systems/nxlx-phase-scorekeeper/pages/builds`
8. Check the live `version.json` shows the new number, then tag the merge commit and push the tag:
   `git tag -a v17 -m "Version 17" <merge commit> && git push origin v17`

## Automatic checks

The **Checks** workflow (`.github/workflows/checks.yml`) runs on every pull request and every push to `main`:

- **Static checks** (`tests/static.mjs`): the two version numbers match and `version.json` has notes; the storage key is unchanged; the manifest is valid; every script parses. On pull requests it also fails if `sw.js` changed, unless the pull request has the label `sw-change`.
- **Browser smoke test** (`tests/smoke.mjs`): the app loads with no script errors upright and sideways, light and dark, with nothing sticking out sideways; a saved game shows; Back up scores shares one `.json` file only; restoring that backup gives back the same game.

To run them on a computer, from the repo folder:

```
node tests/static.mjs
npm install --no-save --no-package-lock playwright@1 && npx playwright install chromium
python3 -m http.server 8080 --bind 127.0.0.1 &
BASE_URL=http://127.0.0.1:8080/ node tests/smoke.mjs
```

## Rules that protect people's scores

- Scores live in the browser's `localStorage` under the key **`phase10.v1`**. Never rename it, and keep old saved data readable.
- The service worker serves the saved copy first (works offline). Installed apps only change when the person taps **Update now**, which checks for a connection, saves a safety copy (`phase10.beforeUpdate`, restorable from the Menu) and then clears the saved app files.
- **Keep `sw.js` the same between versions.** A browser that sees a changed `sw.js` installs it by itself, which updates the app without "Update now" and without the safety copy. Change it only to fix the service worker, and know that that one release reaches installed apps without asking.
- The web address must not change: scores belong to the address, so a new address starts with no scores.

## Screenshots and tests

The README pictures in `docs/` and the tests use a made-up game (Sam, Jo, Lee, Kai). Never use real people's names or scores.
