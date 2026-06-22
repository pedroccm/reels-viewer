import { readJSON } from "./blobs";
import type { Curation, Manifest, Reel } from "./types";

export async function getManifest(): Promise<Manifest> {
  return readJSON<Manifest>("manifest", { items: [] });
}

export async function getCuration(): Promise<Curation> {
  const c = await readJSON<Curation>("curation", { tags: {}, hidden: [] });
  return { tags: c.tags || {}, hidden: c.hidden || [] };
}

export async function getData(): Promise<{ reels: Reel[]; curation: Curation; title: string }> {
  const [m, curation] = await Promise.all([getManifest(), getCuration()]);
  return { reels: m.items ?? [], curation, title: m.title || "Reels" };
}
