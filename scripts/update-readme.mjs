// Refreshes the dynamic sections of README.md from my own apps.
// Articles come from Dev-Note's public API, the same source the portfolio uses.
// Runs on a schedule in .github/workflows/update-readme.yml. No dependencies.

import { readFile, writeFile } from "node:fs/promises";

const API = "https://oyusdevnote.netlify.app/api/public/v1/articles?limit=5";
const SITE = "https://oyusportfolio.netlify.app/articles";
const README = new URL("../README.md", import.meta.url);

const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function replaceSection(text, name, body) {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(text)) throw new Error(`Missing ${name} markers in README`);
  return text.replace(re, `$1\n${body}\n$2`);
}

async function articlesSection() {
  const res = await fetch(API, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Articles API returned ${res.status}`);
  const { data } = await res.json();
  const rows = (data?.articles ?? []).map(
    (a) => `| [${a.title}](${SITE}/${encodeURIComponent(a.slug)}) | ${a.topic ?? ""} | ${a.readingMinutes ?? "?"} min | ${fmtDate(a.publishedAt)} |`
  );
  if (!rows.length) return "_New articles coming soon._";
  return ["| Article | Topic | Read | Published |", "|---|---|---|---|", ...rows].join("\n");
}

const original = await readFile(README, "utf8");
let next = original;

try {
  next = replaceSection(next, "ARTICLES", await articlesSection());
} catch (err) {
  // Keep the last good list if Dev-Note is down; never blank the README.
  console.warn(`Skipping articles: ${err.message}`);
}

if (next !== original) {
  const stamp = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  next = replaceSection(next, "UPDATED", `<sub>Auto-updated from my own apps on ${stamp} IST</sub>`);
  await writeFile(README, next);
  console.log("README updated");
} else {
  console.log("No changes");
}
