import { getStore } from "@netlify/blobs";
import { promises as fs } from "fs";
import path from "path";

const STORE = "reels";
const DATA_DIR = path.join(process.cwd(), "data");

function store() {
  // Explicit creds (env) work everywhere; inside a Netlify function the context is
  // auto-injected so getStore(name) also works. Falls back to local files on error.
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
  try {
    const v = (await store().get(key, { type: "json", consistency: "strong" })) as T | null;
    return v ?? fallback;
  } catch {
    // local dev without a Netlify Blobs context -> file fallback
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, `${key}.json`), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await store().setJSON(key, value);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${key}.json`), JSON.stringify(value, null, 2), "utf8");
  }
}
