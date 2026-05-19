# Ingestion Workflow

This directory supports Codex-assisted lyric ingestion. It is not a public admin UI.

For every ingestion request:

1. Parse the user's request into an ingestion task.
2. Search for candidate songs, metadata, original version information, and lyrics.
3. Prefer same-language original lyrics. Track important cover performers separately.
4. Normalize lyrics with `normalizeLyrics`.
5. Score metadata, lyrics, classification, and overall confidence.
6. Use `writeIngestionResult` to write approved songs to `content/lyrics/songs.json`.
7. Write lower-confidence songs to `content/pending` and `content/review`.
8. End the response with Tooling notes.

Tooling notes must say whether the request exposed gaps in parser behavior, tags, schema, or confidence scoring.
