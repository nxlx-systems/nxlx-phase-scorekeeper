// Static checks that need no browser. Run: node tests/static.mjs
// Fails (exit 1) with a plain message for each problem found.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const problems = [];
const html = readFileSync("index.html", "utf8");

// 1. The version is the same in index.html and version.json.
const m = html.match(/const APP_VERSION = (\d+);/);
let version = null;
try { version = JSON.parse(readFileSync("version.json", "utf8")); }
catch (e) { problems.push("version.json is not valid JSON: " + e.message); }
if (!m) problems.push("index.html has no `const APP_VERSION = <number>;` line");
if (m && version && Number(m[1]) !== Number(version.version))
  problems.push(`Version mismatch: index.html says ${m[1]}, version.json says ${version.version}`);
if (version && !(typeof version.notes === "string" && version.notes.trim()))
  problems.push("version.json needs a short `notes` line (people see it in the Update available bar)");

// The changelog has a heading for this version, e.g. "## 17 (26 November 2026)".
if (m && !new RegExp(`^## ${m[1]} `, "m").test(readFileSync("CHANGELOG.md", "utf8")))
  problems.push(`CHANGELOG.md has no "## ${m[1]} (date)" heading for this version`);

// 2. The storage key never changes (scores live under it).
if (!html.includes('const KEY = "phase10.v1";'))
  problems.push('The storage key `const KEY = "phase10.v1";` is missing or changed. Changing it loses everyone\'s scores.');

// 3. The manifest is valid JSON.
try { JSON.parse(readFileSync("manifest.webmanifest", "utf8")); }
catch (e) { problems.push("manifest.webmanifest is not valid JSON: " + e.message); }

// 4. Every inline script and sw.js parse as JavaScript.
const dir = mkdtempSync(join(tmpdir(), "p10-"));
// Only JavaScript: skip scripts with a src, and data scripts such as type="application/ld+json".
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(x => !/\bsrc=/.test(x[1]))
  .filter(x => { const t = x[1].match(/\btype=["']?([^"'\s>]+)/); return !t || /^(text\/javascript|module)$/i.test(t[1]); })
  .map(x => x[2]);
if (!scripts.length) problems.push("index.html has no inline script");
scripts.forEach((code, i) => {
  const f = join(dir, `inline-${i}.js`);
  writeFileSync(f, code);
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { problems.push(`Inline script ${i + 1} in index.html does not parse:\n${String(e.stderr)}`); }
});
try { execFileSync(process.execPath, ["--check", "sw.js"], { stdio: "pipe" }); }
catch (e) { problems.push("sw.js does not parse:\n" + String(e.stderr)); }

if (problems.length) {
  console.error("Static checks failed:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`Static checks passed (version ${m[1]}, ${scripts.length} inline script(s)).`);
