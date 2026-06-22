// Uploads a local manifest.json to Netlify Blobs (key: "manifest").
// Run after the pipeline produces a new manifest:
//   npm run push-manifest            (uses data/manifest.json)
//   npm run push-manifest -- path/to/manifest.json
import { getStore } from "@netlify/blobs";
import { readFileSync, existsSync } from "fs";

// load .env (NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN) since plain node doesn't
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const siteID = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!siteID || !token) {
  console.error("Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN in .env to push to Blobs.");
  process.exit(1);
}

const file = process.argv[2] || "data/manifest.json";
const manifest = JSON.parse(readFileSync(file, "utf8"));
const store = getStore({ name: "reels", siteID, token });
await store.setJSON("manifest", manifest);
console.log(`Pushed ${manifest.items?.length ?? 0} reels from ${file} to Netlify Blobs (key: manifest).`);
