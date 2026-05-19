# Lyric Guesser

A Chinese lyric guessing game. Phase one focuses on Codex-assisted lyric ingestion and a minimal random-mode web game.

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

Approved songs live in `content/lyrics/songs.json`.

Pending machine-readable review data lives in `content/pending`.

Human-readable review notes live in `content/review`.

## Ingestion

Ingestion is performed through Codex conversation plus tools in `tools/ingest`.

Every ingestion run should end with Tooling notes:

- parser/schema/tag gaps found
- tooling changed or not changed
- follow-up tooling recommendation
- tests run

## Deployment

Deploy the repository to Vercel as a Next.js project.

Phase one does not require Supabase environment variables. Later phases will add auth, leaderboards, daily challenges, and database-backed category queries.
