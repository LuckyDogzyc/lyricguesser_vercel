# Lyric Guesser Design

Date: 2026-05-19

## Goal

Build a Chinese lyric guessing game that is deployed on Vercel and backed by a GitHub codebase. The first phase prioritizes the content ingestion workflow over a complete player product.

The first usable version must support:

- Codex-assisted song ingestion from natural language requests.
- A repository-managed lyric catalog that can be reviewed in Git diffs.
- A minimal random-mode web game that validates the catalog and core guessing rules.

Login, leaderboards, daily challenges, and category mode are designed for later phases but are not required for phase one.

## Phase One Scope

Phase one follows the "content tooling first, minimal game second" approach.

In scope:

- Next.js app deployed to Vercel.
- Static repository catalog for songs and lyrics.
- Minimal random-mode game.
- Three-column game layout.
- Codex-facing ingestion tools and documentation.
- Pending review JSON and Markdown outputs for low-confidence songs.
- Data model fields that leave room for Supabase Auth, leaderboard, daily challenge, and category mode later.

Out of scope for phase one:

- Complete registration and login.
- Persisted user scores.
- Public admin dashboard.
- Fully automated web backend ingestion UI.
- Supabase runtime dependency.
- Daily challenge scheduling.
- Complete category browsing.

## Architecture

The repository is organized around four responsibilities:

- `app/`: the Next.js web app. The first screen is the playable game, not a marketing page.
- `content/lyrics/`: approved song catalog data.
- `content/pending/` and `content/review/`: low-confidence ingestion outputs for review.
- `tools/ingest/`: local Codex-facing ingestion utilities.

The phase one data flow is:

1. The user asks Codex to ingest songs, such as "录入周杰伦的情歌".
2. Codex searches for candidate songs, metadata, original performance information, and lyrics.
3. Ingestion tools normalize lyrics, score confidence, check duplicates, and write files.
4. High-confidence records are written into the approved catalog.
5. Low-confidence records are written to both machine-readable JSON and human-readable Markdown review files.
6. The Next.js app reads approved catalog data.
7. Vercel redeploys after GitHub changes are pushed.

Supabase is reserved for later phases. The repository catalog remains the source of truth for content, while Supabase will later store users, scores, daily challenge records, and imported song rows.

## Song Data Model

The catalog stores one song record per canonical playable version. Phase one focuses on Chinese songs.

Core shape:

```ts
type Song = {
  id: string
  title: string
  aliases?: string[]
  artists: string[]
  canonicalArtist: string[]
  relatedPerformers?: string[]
  versionType: "original" | "cover" | "adaptation"
  originalLanguage?: "zh"
  lyricist?: string[]
  composer?: string[]
  releaseYear?: number
  album?: string
  language: "zh"
  regions?: string[]
  genres: string[]
  moods: string[]
  themes: string[]
  contexts?: string[]
  eras: string[]
  popularityTier?: "classic" | "popular" | "niche"
  source: {
    query: string
    lyricUrls: string[]
    metadataUrls: string[]
    collectedAt: string
  }
  confidence: {
    metadata: number
    lyrics: number
    classification: number
    overall: number
  }
  lyrics: string[]
}
```

`artists` supports classification and search. It may include the original performer and important same-language cover performers.

`canonicalArtist` identifies the original or standard performer used for the playable lyric version.

`relatedPerformers` records relevant performers that should not necessarily affect category matching.

## Original And Cover Rules

The catalog defaults to lyrics from the same-language original version.

Rules:

- If a Chinese original version exists, use the Chinese original lyrics.
- Same-language cover performers can be added to `artists` or `relatedPerformers`.
- If a cover uses the same lyrics, it can help category matching while `canonicalArtist` remains the original performer.
- If a cover changes lyrics, do not merge it automatically. Send it to review.
- Cross-language adaptations can become separate `adaptation` records when the Chinese version has a distinct official release.
- Same-title different works must use different `id` values.
- If sources conflict about original performer or first release, lower metadata and lyric confidence and send the item to review.

Examples:

- "周杰伦的情歌" should prefer Jay Chou original songs.
- "王菲唱过的经典歌" may include covers or adaptations, but records must clearly identify canonical version and performer.

## Lyric Normalization

Lyrics are stored as an array of lines.

Normalization rules:

- One lyric sentence per line when possible.
- Preserve Chinese characters, English letters, and numbers.
- Convert punctuation to spaces.
- Remove empty lines.
- Remove non-lyric metadata such as composer credits, copyright text, and source page decorations.
- Do not mix the title into `lyrics`; the frontend renders the title as a separate first puzzle line.

The frontend builds puzzle lines as:

```ts
type PuzzleLine =
  | { type: "title"; text: string }
  | { type: "lyric"; text: string }
```

## Classification

Classification uses multiple dimensions instead of one category per song.

Supported dimensions:

- `artists`
- `canonicalArtist`
- `releaseYear`
- `eras`
- `genres`
- `moods`
- `themes`
- `contexts`
- `regions`
- `popularityTier`

Examples:

```json
{
  "artists": ["周杰伦"],
  "canonicalArtist": ["周杰伦"],
  "genres": ["流行", "R&B"],
  "moods": ["抒情", "伤感"],
  "themes": ["爱情", "离别"],
  "contexts": ["KTV"],
  "eras": ["2000s"],
  "popularityTier": "classic"
}
```

The ingestion process may infer classifications from song title, lyric content, public descriptions, playlist context, and common music knowledge. Inferred fields lower classification confidence unless they are strongly supported by sources.

## Confidence And Review

Each song receives independent confidence scores:

- `metadata`: title, performers, original version, release year, album.
- `lyrics`: lyric source reliability and consistency.
- `classification`: tag reliability.
- `overall`: combined score.

Thresholds:

- `overall >= 0.8`: write to approved catalog.
- `0.5 <= overall < 0.8`: write to pending JSON and review Markdown.
- `overall < 0.5`: do not write to catalog; include in task summary only.

Review is also required when:

- Lyrics are missing or suspiciously short.
- Lyrics appear to include non-lyric page text.
- Same title and artist already exist.
- Same title different artist may be a different work.
- Cover or adaptation status is unclear.
- Lyric sources disagree.
- New tags reveal schema or vocabulary gaps.

## Codex Ingestion Workflow

The ingestion flow is a Codex conversation workflow supported by repository tools. It is not a web admin panel.

Suggested tool structure:

```txt
tools/ingest/
  README.md
  schema.ts
  normalizeLyrics.ts
  scoreConfidence.ts
  writeCatalog.ts
  tasks/
content/
  lyrics/
    songs.json
  pending/
  review/
```

Workflow:

1. Parse the user's natural language request into a structured ingestion task.
2. Decide whether the request reveals a reusable gap in the scripts, schema, or tag vocabulary.
3. Search for candidate songs and metadata.
4. Identify original or canonical same-language versions.
5. Search for lyrics for the canonical version.
6. Normalize lyrics.
7. Classify each song.
8. Score confidence.
9. Write high-confidence songs to approved catalog.
10. Write low-confidence songs to pending JSON and review Markdown.
11. Report results, skipped items, pending items, and tooling notes.

The workflow must continue to handle the current request even if the parser does not yet understand the user's phrasing.

## Tooling Improvement Rule

Each ingestion task ends with `Tooling notes`.

The notes must state:

- Whether the user's description exposed a parser, schema, tag, or confidence-scoring gap.
- Whether tooling was changed during the task.
- If tooling was not changed, whether a follow-up change is recommended.
- Which new interpretation patterns were added or should be added.
- Whether the relevant tests were run.

Examples of reusable request patterns:

- "90 后 KTV 必点" maps to `contexts: ["KTV"]`, an era or audience hint, and likely high popularity.
- "失恋后半夜听" maps to sad, quiet, breakup-related moods and themes.
- "空灵" maps to an ethereal mood and possibly alternative pop or dream pop.
- "1998 年到 2000 年热门中文歌" maps to a release year range and popularity requirement.
- "甜甜的男女对唱" maps to duet, love theme, and upbeat or sweet mood.

If a pattern is likely to recur, Codex should propose or implement an ingestion script change instead of relying only on one-off judgment.

## Game Layout

The minimal web game uses a three-column layout.

Left column:

- Mode navigation: daily challenge, random, category.
- Login placeholder.
- Only random mode is active in phase one.

Center column:

- Scrollable puzzle list.
- First line is the song title.
- Second line onward is lyrics.
- One visible cell per character.
- Spaces are visible as spacing.
- Hidden characters are covered with a consistent block color.
- Revealed characters show the real character.

Right column:

- One text input.
- One submit button.
- Guess count.
- Characters guessed that are not present in the current song.
- Victory state.
- Random next-song action after victory.

No separate "guess title" area exists in phase one.

## Guessing Rules

The player enters any text and presses the single submit button.

Processing:

1. Split input into characters.
2. Normalize each character for comparison.
3. Remove spaces, punctuation, and characters already guessed.
4. Add the count of new valid characters to `guessCount`.
5. If a new character appears in the song title or lyrics, add it to `revealedChars`.
6. If a new character appears nowhere in title or lyrics, add it to `missedChars`.
7. Reveal every matching position across title and lyric lines.

State:

```ts
type GameState = {
  songId: string
  revealedChars: string[]
  missedChars: string[]
  guessedChars: string[]
  guessCount: number
  isSolved: boolean
}
```

Victory condition:

- The game is solved when every non-space character in the song title has been guessed.
- Lyrics help reveal context, but the player does not need to reveal every lyric character.

Victory display:

- Title and all lyrics are shown completely.
- Characters guessed before victory use the "guessed" highlight style.
- Characters automatically shown after victory use the normal completed style.

## Error Handling

Ingestion errors:

- Duplicate `id` blocks approved write.
- Same title different performer requires careful version handling.
- Missing title, performer, or lyrics blocks approved write.
- Empty or suspicious lyrics go to review.
- Large normalization changes lower confidence.
- Unknown tags are allowed only with `Tooling notes`.

Game errors:

- Empty catalog shows an empty state.
- Failed random song loading shows a recoverable error.
- Input containing only spaces or punctuation does not change state.
- Repeated guesses do not increase guess count.
- Songs with empty or all-space titles are excluded from play.
- Victory disables normal guessing and offers another random song.

## Testing

Phase one should include focused tests for:

- `normalizeLyrics`: punctuation to spaces, empty-line removal, non-lyric cleanup.
- `splitGuessChars`: character splitting, filtering, de-duplication.
- `applyGuess`: revealed and missed character updates.
- `isSolved`: title-only victory condition.
- `writeCatalog`: duplicate checks and approved vs pending writes.
- Page smoke behavior: render a song, reveal a character, solve by title characters.

## Deployment

Vercel deploys the Next.js app from GitHub.

Phase one reads `content/lyrics/songs.json` from the repository. Adding songs requires a GitHub change and a redeploy.

Later phases can add:

- Supabase Auth for registration and login.
- `scores` table for leaderboards.
- `daily_challenges` table for fixed daily songs.
- `song_catalog` import table for querying the repository catalog in Postgres.
- Category pages backed by catalog tags.

## Success Criteria

Phase one is successful when:

- Codex can process a natural language ingestion request.
- High-confidence songs become approved catalog entries.
- Low-confidence songs produce both pending JSON and review Markdown.
- The tooling notes identify parser or schema improvements.
- The deployed app can randomly select an approved song.
- The player can reveal title and lyric characters by guessing.
- The player wins when all title characters have been guessed.
