import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("לא נמצא", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the Hebrew right-to-left game menu", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*\blang="he"[^>]*\bdir="rtl"/i);
  assert.match(html, /<title>שערי הגורל \| משחק תפקידים אפל<\/title>/);
  assert.match(html, /שערי הגורל/);
  assert.match(html, /משחק חדש/);
  assert.match(html, /המשך משחק/);
  assert.match(html, /משחק מקוון/);
  assert.match(html, /הגדרות/);
  assert.match(html, /הישגים/);
  assert.match(html, /יציאה/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|Starter Project/);
  assert.doesNotMatch(html, /codex-preview/);
});

test("keeps translations centralized and removes the starter", async () => {
  const [page, layout, styles, gameShell, dictionary, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/game/GameShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/i18n.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<GameShell \/>/);
  assert.match(layout, /lang="he"/);
  assert.match(layout, /dir="rtl"/);
  assert.match(styles, /fonts\/heebo-variable\.ttf/);
  assert.match(styles, /fonts\/frank-ruhl-libre-variable\.ttf/);
  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.match(gameShell, /from "framer-motion"/);
  assert.match(dictionary, /export const dictionaries = \{ he \}/);
  assert.match(dictionary, /רגיל/);
  assert.match(dictionary, /נדיר/);
  assert.match(dictionary, /אפי/);
  assert.match(dictionary, /אגדי/);
  assert.match(dictionary, /מיתי/);
  assert.match(packageJson, /"framer-motion"/);
  assert.match(packageJson, /"tailwindcss"/);
  assert.doesNotMatch(page + layout, /_sites-preview|SkeletonPreview|Starter Project/);
});
