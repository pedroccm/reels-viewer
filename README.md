# reels-viewer

A Next.js app to browse, **tag**, and **curate** the reels collected by
[`reels-to-site`](../reels-to-site). Two-pane layout (list on the left, scrollable detail
with the video + transcript on the right), tag filtering, and hide/show. Editing is gated
by a password. No database.

**Live:** https://sportsfreak-viewer.netlify.app

## How the data flows

- **Reels (`manifest`)** live in **Cloudflare R2** (public JSON), produced by the
  `reels-to-site` pipeline. The app fetches it from `MANIFEST_URL` (cached ~10 min).
- **Curation (`{ tags, hidden }`)** lives in **Netlify Blobs**, written by the app's own
  API route. Persisted, no DB.
- Locally (plain `next dev`) both fall back to `data/manifest.json` / `data/curation.json`.

## Env vars

| var | where | what |
|-----|-------|------|
| `EDIT_PASSWORD` | Netlify + local `.env` | password to unlock editing |
| `MANIFEST_URL` | Netlify | public R2 URL of the manifest JSON |
| `NETLIFY_SITE_ID`, `NETLIFY_AUTH_TOKEN` | Netlify | let the functions reach Blobs |

## Local dev

```bash
npm install
cp .env.example .env          # set EDIT_PASSWORD
# data/manifest.json is copied from the pipeline (gitignored)
npm run dev                   # http://localhost:3000
```

Click **Editar**, type the password, then add tags / hide videos. Locally, curation saves
to `data/curation.json`.

## Updating the reels (after running the pipeline)

Re-upload the manifest to R2 (the app picks it up within ~10 min):

```bash
cd ../reels-to-site
python -c "import r2; r2.upload('sites/sportsfreakazoide/manifest.json','manifest/sportsfreakazoide.json','application/json')"
```

No rebuild needed. To force an instant refresh, redeploy the Netlify site.

## Deploy

Repo is connected to Netlify (auto-builds Next.js on push). Set the env vars above in the
Netlify site settings. The deployed app reads the manifest from R2 and reads/writes curation
in Netlify Blobs; editing requires the password, everyone else just views.
