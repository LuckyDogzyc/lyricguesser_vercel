# Ingestion Workflow

This directory supports Codex-assisted lyric ingestion. It is not a public admin UI.

For every ingestion request:

1. Parse the user's request into an ingestion task.
2. Search for candidate songs, metadata, original version information, popularity, classification tags, and lyrics.
3. Record candidates in an `IngestionPlan` before final catalog writes.
4. Use same-language original lyrics as the source of truth. Cover versions can be tracked as related performers, but should not replace the original-language original when one exists.
5. Classify artists with both canonical/original artists and notable cover or related performers, so artist searches can still find important versions.
6. Normalize lyrics with `normalizeLyrics`.
7. Score metadata, lyrics, classification, and overall confidence.
8. Use `reviewIngestionPlan` to split candidates into approved, pending, and skipped with the existing confidence buckets plus review notes.
9. Use `writeIngestionResult` to write approved songs to `content/lyrics/songs.json`.
10. Write lower-confidence songs to `content/pending` and `content/review`.
11. End the response with Tooling notes.

## Schema Notes

- `CandidateSong` is for Codex planning and review. It can express candidate songs, `popularityTier`, `allowRandomPool`, original/cover/adaptation status, related performers, category tags, source URLs, and confidence.
- `IngestionPlan.scriptImprovementRequests` is for cases where the user's phrasing exposes a parser, ranking, tagging, source selection, or confidence-scoring gap.
- `popularityTier` should be `classic`, `popular`, or `niche`. The random pool only accepts `classic` and `popular`; niche songs can remain cataloged or pending for review, but should not be marked random-pool eligible.
- `allowRandomPool` means the candidate is allowed to enter random play after approval. Set it to `false` when a candidate is useful for classification or review but should not appear in normal guessing rounds.

Tooling notes must say whether the request exposed gaps in parser behavior, tags, schema, or confidence scoring.
When the user request is ambiguous or suggests a better workflow, include a concrete script modification request in Tooling notes and mirror it in `scriptImprovementRequests`.

Do not bulk-ingest lyrics during tooling work. Search only enough to validate candidate flow, schema shape, or review behavior.
