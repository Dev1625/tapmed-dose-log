import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

test("the service worker serves the cached app under a project path while offline", async () => {
  const base = "https://dev1625.github.io/tapmed-dose-log/";
  const saved = new Map();
  const handlers = new Map();
  const cache = {
    addAll: async (requests) => {
      for (const req of requests) saved.set(req.url, new Response(req.url));
    },
    match: async (url) => saved.get(url),
  };
  runInNewContext(await readFile(new URL("./sw.js", import.meta.url), "utf8"), {
    URL,
    Request,
    caches: { open: async () => cache },
    fetch: () => { throw new Error("Offline"); },
    self: {
      location: new URL("sw.js", base),
      addEventListener: (name, handler) => { handlers.set(name, handler); },
      skipWaiting: () => Promise.resolve(),
    },
  });

  let work;
  handlers.get("install")({ waitUntil: (promise) => { work = promise; } });
  await work;
  assert.equal(saved.size, 4);

  handlers.get("fetch")({ request: new Request(base), respondWith: (promise) => { work = promise; } });
  assert.equal(await (await work).text(), `${base}index.html`);
  handlers.get("fetch")({ request: new Request(`${base}app.js`), respondWith: (promise) => { work = promise; } });
  assert.equal(await (await work).text(), `${base}app.js`);

  handlers.get("fetch")({
    request: new Request("https://dev1625.github.io/other-app/"),
    respondWith: () => { assert.fail("Should not handle another project's request"); },
  });
});
