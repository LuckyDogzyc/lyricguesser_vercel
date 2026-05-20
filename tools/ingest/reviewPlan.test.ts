import { describe, expect, it } from "vitest"
import type { Song } from "@/src/lib/catalog/song"
import type { IngestionPlan } from "./schema"
import { reviewIngestionPlan } from "./reviewPlan"

function makeSong(id: string, overall: number, overrides: Partial<Song> = {}): Song {
  return {
    id,
    title: "晴天",
    artists: ["周杰伦"],
    canonicalArtist: ["周杰伦"],
    versionType: "original",
    originalLanguage: "zh",
    language: "zh",
    genres: ["流行"],
    moods: ["怀旧"],
    themes: ["青春"],
    eras: ["2000s"],
    popularityTier: "classic",
    source: {
      query: "test",
      lyricUrls: [],
      metadataUrls: [],
      collectedAt: "2026-05-20",
    },
    confidence: {
      metadata: overall,
      lyrics: overall,
      classification: overall,
      overall,
    },
    lyrics: ["故事的小黄花"],
    ...overrides,
  }
}

describe("reviewIngestionPlan", () => {
  it("splits finalized songs with the existing confidence buckets", () => {
    const result = reviewIngestionPlan([
      makeSong("approved", 0.9),
      makeSong("pending", 0.65),
      makeSong("skipped", 0.25),
    ])

    expect(result.approved.map((song) => song.id)).toEqual(["approved"])
    expect(result.pending.map((song) => song.id)).toEqual(["pending"])
    expect(result.skipped.map((song) => song.id)).toEqual(["skipped"])
    expect(result.notes).toEqual([])
  })

  it("reviews candidate plans for random-pool eligibility, original versions, and tooling notes", () => {
    const plan: IngestionPlan = {
      task: {
        id: "jay-love-songs",
        query: "录入所有周杰伦的情歌",
        language: "zh",
        artists: ["周杰伦"],
        themes: ["爱情"],
      },
      candidates: [
        {
          id: "approved-original",
          title: "简单爱",
          artists: ["周杰伦"],
          canonicalArtist: ["周杰伦"],
          versionType: "original",
          language: "zh",
          originalLanguage: "zh",
          popularityTier: "popular",
          allowRandomPool: true,
          categoryTags: {
            artists: ["周杰伦"],
            themes: ["爱情"],
            moods: ["甜蜜"],
          },
          confidence: {
            metadata: 0.9,
            lyrics: 0.85,
            classification: 0.85,
            overall: 0.87,
          },
          source: {
            query: "周杰伦 情歌",
            lyricUrls: ["https://example.test/lyrics"],
            metadataUrls: ["https://example.test/song"],
            collectedAt: "2026-05-20",
          },
        },
        {
          id: "niche-random-pool",
          title: "冷门歌",
          artists: ["周杰伦"],
          canonicalArtist: ["周杰伦"],
          versionType: "original",
          language: "zh",
          originalLanguage: "zh",
          popularityTier: "niche",
          allowRandomPool: true,
          confidence: {
            metadata: 0.9,
            lyrics: 0.9,
            classification: 0.9,
            overall: 0.9,
          },
          source: {
            query: "周杰伦 冷门歌",
            lyricUrls: [],
            metadataUrls: [],
            collectedAt: "2026-05-20",
          },
        },
        {
          id: "cover-version",
          title: "被翻唱的歌",
          artists: ["翻唱歌手"],
          canonicalArtist: ["原唱歌手"],
          relatedPerformers: [
            {
              name: "翻唱歌手",
              relationship: "cover",
            },
          ],
          versionType: "cover",
          language: "zh",
          originalLanguage: "zh",
          popularityTier: "classic",
          allowRandomPool: true,
          confidence: {
            metadata: 0.9,
            lyrics: 0.9,
            classification: 0.9,
            overall: 0.9,
          },
          source: {
            query: "翻唱歌手 被翻唱的歌",
            lyricUrls: [],
            metadataUrls: [],
            collectedAt: "2026-05-20",
          },
        },
        {
          id: "low-confidence",
          title: "待查歌曲",
          artists: ["周杰伦"],
          canonicalArtist: ["周杰伦"],
          versionType: "original",
          language: "zh",
          originalLanguage: "zh",
          popularityTier: "popular",
          allowRandomPool: true,
          confidence: {
            metadata: 0.2,
            lyrics: 0.2,
            classification: 0.2,
            overall: 0.2,
          },
          source: {
            query: "周杰伦 待查歌曲",
            lyricUrls: [],
            metadataUrls: [],
            collectedAt: "2026-05-20",
          },
        },
      ],
      scriptImprovementRequests: [
        {
          title: "Parse broad artist-plus-theme requests",
          reason: "用户会说“所有周杰伦的情歌”，需要脚本自动拆成候选歌单搜索。",
          requestedChange: "Add parser support for artist + theme expansion.",
        },
      ],
    }

    const result = reviewIngestionPlan(plan)

    expect(result.approved.map((candidate) => candidate.id)).toEqual(["approved-original"])
    expect(result.pending.map((candidate) => candidate.id)).toEqual(["niche-random-pool", "cover-version"])
    expect(result.skipped.map((candidate) => candidate.id)).toEqual(["low-confidence"])
    expect(result.notes).toContain("niche-random-pool: random pool requires popularityTier classic or popular.")
    expect(result.notes).toContain("cover-version: prefer same-language original lyrics before approving cover versions.")
    expect(result.notes).toContain(
      "Tooling: Parse broad artist-plus-theme requests - Add parser support for artist + theme expansion."
    )
  })

  it("allows niche songs into the catalog when they are not marked for random play", () => {
    const result = reviewIngestionPlan({
      task: {
        id: "masiwei",
        query: "录入马思唯歌曲",
        language: "zh",
        artists: ["马思唯"],
      },
      candidates: [
        {
          id: "masiwei-niche-category-song",
          title: "分类用歌曲",
          artists: ["马思唯"],
          canonicalArtist: ["马思唯"],
          versionType: "original",
          language: "zh",
          originalLanguage: "zh",
          popularityTier: "niche",
          allowRandomPool: false,
          categoryTags: {
            artists: ["马思唯"],
            genres: ["说唱"],
          },
          confidence: {
            metadata: 0.9,
            lyrics: 0.9,
            classification: 0.85,
            overall: 0.89,
          },
        },
      ],
    })

    expect(result.approved.map((candidate) => candidate.id)).toEqual(["masiwei-niche-category-song"])
    expect(result.pending).toEqual([])
  })
})
