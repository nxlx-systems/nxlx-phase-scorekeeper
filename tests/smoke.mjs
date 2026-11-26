// Browser smoke test. Serve the repo folder first, then run:
//   BASE_URL=http://localhost:8080/ node tests/smoke.mjs
// Needs the `playwright` package and its Chromium (CI installs both).
// Uses a made-up game only (Sam, Jo, Lee). Never put real names or scores in tests.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8080/";
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); else console.log("ok  " + msg); };

const GAME = {
  current: {
    id: 1, started: "2026-01-01T00:00:00.000Z", players: ["Sam", "Jo", "Lee"],
    rounds: [
      { pts: [0, 65, 15], made: [true, false, true], dealer: 0 },
      { pts: [10, 0, 50], made: [true, true, false], dealer: 1 },
    ],
    ended: null, dealerSet: null, firstDealer: 0, colors: [0, 1, 2],
  },
  past: [],
};

const browser = await chromium.launch();
const stop = setTimeout(() => { console.error("Smoke test took over 90 seconds; stopping."); process.exit(1); }, 90_000);
try {
  for (const [label, viewport] of [["upright", { width: 390, height: 844 }], ["sideways", { width: 844, height: 390 }]]) {
    for (const scheme of ["light", "dark"]) {
      const ctx = await browser.newContext({ viewport, colorScheme: scheme });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(String(e)));
      await page.goto(BASE);
      await page.waitForLoadState("load");
      check(errors.length === 0, `${label} ${scheme}: first visit loads with no script errors ${errors.join(" ")}`);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      check(wide, `${label} ${scheme}: nothing sticks out sideways`);
      await ctx.close();
    }
  }

  // A saved game shows, and backup then restore gives back the same scores.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.__shared = [];
    navigator.canShare = d => !!(d && d.files);
    navigator.share = async d => { window.__shared.push(d); };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("dialog", d => d.accept());
  await page.goto(BASE);
  await page.evaluate(g => localStorage.setItem("phase10.v1", JSON.stringify(g)), GAME);
  await page.reload();
  const text = await page.evaluate(() => document.body.innerText);
  check(["Sam", "Jo", "Lee"].every(n => text.includes(n)), "a saved game shows every player");

  const version = await page.evaluate(() => APP_VERSION);
  const served = await (await page.request.get(new URL("version.json", BASE).href)).json();
  check(version === served.version, `the page and version.json agree (${version})`);

  await page.evaluate(() => exportData());
  const shared = await page.evaluate(async () => {
    const d = window.__shared[0];
    if (!d) return null;
    return { keys: Object.keys(d).sort(), count: d.files.length, name: d.files[0].name, type: d.files[0].type, body: await d.files[0].text() };
  });
  check(shared && shared.keys.join() === "files", "Back up scores shares the file only (no title or text, which some phones save as a second file)");
  check(shared && shared.count === 1 && /^phase10-backup-\d{4}-\d{2}-\d{2}\.json$/.test(shared.name) && shared.type === "application/json", "the backup is one .json file");

  await page.evaluate(() => localStorage.removeItem("phase10.v1"));
  await page.reload();
  await page.evaluate(body => restoreFromText(body), shared ? shared.body : "");
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem("phase10.v1")));
  check(JSON.stringify(restored.current.rounds) === JSON.stringify(GAME.current.rounds)
    && JSON.stringify(restored.current.players) === JSON.stringify(GAME.current.players), "restoring the backup gives back the same game");
  check(errors.length === 0, `no script errors during backup and restore ${errors.join(" ")}`);
  await ctx.close();
} finally {
  clearTimeout(stop);
  await browser.close();
}

if (failures.length) { console.error("\nSmoke test failed:\n- " + failures.join("\n- ")); process.exit(1); }
console.log("\nSmoke test passed.");
