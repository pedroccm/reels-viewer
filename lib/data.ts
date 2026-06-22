import { readJSON } from "./blobs";
import type { Curation, Manifest, Reel } from "./types";

export async function getManifest(): Promise<Manifest> {
  // On deploy: fetch the manifest from a public URL (R2), cached briefly.
  // Locally (no MANIFEST_URL): fall back to data/manifest.json.
  const url = process.env.MANIFEST_URL;
  if (url) {
    try {
      const res = await fetch(url, { next: { revalidate: 600 } });
      if (res.ok) return (await res.json()) as Manifest;
    } catch {
      /* fall through */
    }
  }
  return readJSON<Manifest>("manifest", { items: [] });
}

export async function getCuration(): Promise<Curation> {
  const c = await readJSON<Curation>("curation", { tags: {}, hidden: [], langs: {} });
  return { tags: c.tags || {}, hidden: c.hidden || [], langs: c.langs || {} };
}

export async function getData(): Promise<{ reels: Reel[]; curation: Curation; title: string }> {
  const [m, curation] = await Promise.all([getManifest(), getCuration()]);
  return { reels: m.items ?? [], curation, title: m.title || "Reels" };
}
