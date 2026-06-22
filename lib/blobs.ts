import { getStore } from "@netlify/blobs";
import { promises as fs } from "fs";
import path from "path";

const STORE = "reels";
const DATA_DIR = path.join(process.cwd(), "data");

// Netlify injects a Blobs context on deploy and under `netlify dev`.
// Plain `next dev` has neither, so we fall back to local files in /data.
function hasNetlifyContext(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.NETLIFY_BLOBS_CONTEXT ||
      (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN)
  );
}

function store() {
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
    return getStore({
      name: STORE,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN,
    });
  }
  return getStore(STORE);
}

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  if (!hasNetlifyContext()) {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, `${key}.json`), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  try {
    const v = (await store().get(key, { type: "json" })) as T | null;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  if (!hasNetlifyContext()) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${key}.json`), JSON.stringify(value, null, 2), "utf8");
    return;
  }
  await store().setJSON(key, value);
}
