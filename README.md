# reels-viewer

A Next.js app to browse, **tag**, and **curate** the reels collected by
[`reels-to-site`](../reels-to-site). Two-pane layout (list + scrollable detail with the
video and transcript), tag filtering, and hide/show, all persisted to **Netlify Blobs**
(no database). Editing is gated by a password.

## Data model

- **manifest** (the reels): produced by the `reels-to-site` pipeline. Lives in Netlify Blobs
  (key `manifest`), uploaded with `npm run push-manifest`. Never committed to git.
- **curation** (`{ tags: {code: [..]}, hidden: [code] }`): edited live in the app, persisted
  to Netlify Blobs (key `curation`).

Locally (plain `next dev`) both fall back to `data/manifest.json` and `data/curation.json`.

## Local dev

```bash
npm install
cp .env.example .env        # set EDIT_PASSWORD
# data/manifest.json was copied from the pipeline already
npm run dev                 # http://localhost:3000
```

Click "Editar", type the `EDIT_PASSWORD`, and you can add tags / hide videos. Locally,
changes save to `data/curation.json`.

## Deploy (Netlify + Blobs)

1. Push this repo to GitHub and create a Netlify site linked to it (Netlify auto-detects
   Next.js and runs the build).
2. In the Netlify site settings, set env var **`EDIT_PASSWORD`** (your editing password).
3. Upload the reels to Blobs from your machine:
   ```bash
   # in .env: NETLIFY_SITE_ID=<the site id>  NETLIFY_AUTH_TOKEN=<your token>
   npm run push-manifest
   ```

The deployed app reads/writes Blobs automatically (Netlify injects the context). Editing
on the live site requires the password; everyone else just views.

## Updating the reels

After running the `reels-to-site` pipeline again:

```bash
cp ../reels-to-site/sites/sportsfreakazoide/manifest.json data/manifest.json
npm run push-manifest
```

(No rebuild needed: the app reads the manifest from Blobs at request time.)
