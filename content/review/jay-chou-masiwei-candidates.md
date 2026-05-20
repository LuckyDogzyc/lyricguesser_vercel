# Review: jay-chou-masiwei-candidates

This is a Codex ingestion planning note for testing the artist-driven workflow. It records candidate songs and categories without bulk-copying copyrighted lyrics into the repository.

## Random Pool Rule

- `classic` and `popular` songs may enter random mode after lyrics are supplied and confidence is high enough.
- `niche` songs may be kept for artist/category modes, but they do not enter random mode.
- Missing `popularityTier` is treated as not random-eligible.

## 周杰伦 Candidates

These songs are suitable candidates for the general random pool after complete lyrics are supplied locally:

| Title | Era | Suggested tags | Popularity |
| --- | --- | --- | --- |
| 简单爱 | 2000s | 流行, R&B, 爱情, 甜蜜, KTV | classic |
| 安静 | 2000s | 流行, R&B, 爱情, 伤感, KTV | classic |
| 七里香 | 2000s | 流行, 中国风, 爱情, 夏天, KTV | classic |
| 夜曲 | 2000s | 流行, R&B, 伤感, KTV | classic |
| 青花瓷 | 2000s | 中国风, 流行, 古典意象, KTV | classic |
| 稻香 | 2000s | 流行, 励志, 家庭, KTV | classic |
| 告白气球 | 2010s | 流行, 爱情, 甜蜜, KTV | classic |
| 等你下课 | 2010s | 流行, 青春, 暗恋 | popular |

## 马思唯 Candidates

These songs should primarily create `artist:马思唯` and `genre:说唱` category content. Only mark individual tracks as random-eligible if they are demonstrably mainstream for the intended player group:

| Title | Era | Suggested tags | Popularity | Random pool |
| --- | --- | --- | --- | --- |
| 崂山道士 | 2010s | 说唱, Trap, 自我表达 | niche | no |
| 花花公子 | 2010s | 说唱, Trap, 爱情 | niche | no |
| 暴风雨 | 2010s | 说唱, 流行说唱, 情绪 | niche | no |
| 黑马 | 2020s | 说唱, 城市, 自我表达 | niche | no |
| 豆瓣酱 | 2020s | 说唱, 生活方式 | niche | no |

## Tooling Notes

- Add a script entrypoint that turns broad prompts such as `录入所有周杰伦的情歌` into a candidate `IngestionPlan`.
- Add a local-only lyric completion step that accepts user-provided full lyrics and marks `lyricsStatus: complete` after normalization and review.
- Add popularity scoring inputs so artist fame does not automatically make every song random-eligible.
- For cover-heavy songs, store all notable performers in artist categories but keep lyrics attached to the same-language original.
