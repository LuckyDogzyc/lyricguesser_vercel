# Lyric Guesser

A Chinese lyric guessing game for Chinese songs.

The current app supports random play, artist category play, hints, mobile layout, and a licensed full lyric catalog. The production target for mainland China is a Tencent Cloud Lighthouse server, because it can provide a mainland-reachable address when paired with a properly configured domain and ICP filing.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test And Build

```bash
npm run test
npm run build
```

## Content Catalog

Small seed songs live in `content/lyrics/songs.json`.

The licensed full catalog is split into JSON chunks under:

```text
content/lyrics/catalog/songs-001.json
content/lyrics/catalog/songs-002.json
...
```

The ignored local single-file copy, when present, lives at:

```text
content/lyrics/songs.local.json
```

Runtime lookup currently reads the chunked JSON catalog from the server filesystem. Do not ship the full catalog to the browser bundle.

Pending machine-readable review data lives in `content/pending`.

Human-readable review notes live in `content/review`.

## Ingestion

Ingestion is performed through Codex conversation plus tools in `tools/ingest`.

Every ingestion run should end with Tooling notes:

- parser/schema/tag gaps found
- tooling changed or not changed
- follow-up tooling recommendation
- tests run

## Mainland China Deployment

Use Tencent Cloud Lighthouse as the primary deployment target.

Recommended runtime shape:

- Node.js runs the Next.js server on `127.0.0.1:3000`.
- Nginx terminates HTTP/HTTPS and proxies traffic to the Next.js server.
- The full lyric catalog stays on the server side.
- Random play and category play use server APIs, so the frontend only downloads the current song.
- A domain with ICP filing is recommended for stable mainland access.

### Server Requirements

Recommended minimum:

- Tencent Cloud Lighthouse, 2 GB memory or higher.
- Node.js 20 LTS or newer.
- npm.
- Git.
- Nginx.
- pm2 or systemd for process management.

### First Deploy

Hermes agent can use these steps on the server:

```bash
git clone git@github.com:LuckyDogzyc/lyricguesser_vercel.git lyric-guesser
cd lyric-guesser
npm ci
npm run test
npm run build
npm run start
```

For a persistent process with pm2:

```bash
npm install -g pm2
pm2 start npm --name lyric-guesser -- run start
pm2 save
pm2 startup
```

Example Nginx reverse proxy:

```nginx
server {
  listen 80;
  server_name your-domain.example;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

After DNS points to the Lighthouse public IP, add HTTPS with Tencent Cloud SSL or certbot.

### Updating From GitHub

The server does not update automatically unless Hermes or another deployment job runs a deploy script.

Recommended deploy script:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /path/to/lyric-guesser
git fetch origin main
git reset --hard origin/main
npm ci
npm run test
npm run build
pm2 restart lyric-guesser
```

If this repository is mirrored through a deployment-specific remote, replace `origin main` with that remote and branch.

Hermes can run this script manually, on a cron schedule, or from a GitHub webhook receiver. After Codex pushes changes to GitHub, the Lighthouse server will only see them after this script runs.

## Local Database Option

Hermes may import the lyric catalog into a local database on the Lighthouse server. SQLite is the simplest first target because it keeps the deployment self-contained.

Recommended SQLite layout:

```sql
CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artists_json TEXT NOT NULL,
  canonical_artist_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  lyrics_json TEXT NOT NULL,
  lyrics_status TEXT
);

CREATE TABLE song_categories (
  category_id TEXT NOT NULL,
  song_id TEXT NOT NULL,
  PRIMARY KEY (category_id, song_id)
);

CREATE INDEX idx_song_categories_category_id ON song_categories(category_id);
```

Database-backed runtime should expose the same behavior as the current JSON-backed runtime:

- random mode samples from all playable songs, not from a small frontend list;
- category mode samples from all songs attached to that category;
- the frontend receives only the selected song;
- category lists include artists with more than four songs.

Current code still reads chunked JSON from `content/lyrics/catalog`. If Hermes moves the catalog into SQLite, the app needs a small catalog adapter change so `getPrivateRandomSong`, `getPrivateArtistCategories`, and `getPrivateSongForCategory` read from SQLite instead of JSON files.
