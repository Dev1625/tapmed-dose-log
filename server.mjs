import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = {
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/style.css": ["style.css", "text/css"],
  "/app.js": ["app.js", "text/javascript"],
  "/log.js": ["log.js", "text/javascript"],
  "/sw.js": ["sw.js", "text/javascript"],
};

const port = Number(process.env.TAPMED_PORT || 4173);

createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  const file = Object.hasOwn(files, path) ? files[path] : null;

  if (!file) {
    res.writeHead(404).end("Page not found");
    return;
  }

  try {
    const [name, type] = file;
    const body = await readFile(new URL(name, import.meta.url));
    res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` }).end(body);
  } catch {
    res.writeHead(500).end("Could not load page");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`TapMed demo at http://127.0.0.1:${port}`);
});
