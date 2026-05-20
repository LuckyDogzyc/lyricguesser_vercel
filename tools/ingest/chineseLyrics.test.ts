import { describe, expect, it } from "vitest"
import {
  createSongsFromChineseLyrics,
  findChineseLyricsByArtist,
  parseChineseLyricsEntries,
} from "./chineseLyrics"

const fixtureJson = JSON.stringify([
  {
    name: "晴天",
    singer: "周杰伦",
    lyric: ["作词：测试作者", "", "窗外的雨停了。", "故事还在跑。"],
  },
  {
    name: "晴天",
    singer: "周杰伦",
    lyric: ["制作人：测试制作", "第二个版本。"],
  },
  {
    name: "夜曲",
    singer: "周杰伦",
    lyric: ["月光落在路口。"],
  },
  {
    name: "成都夜路",
    singer: "马思唯",
    lyric: ["编曲：测试编曲", "车灯经过桥。"],
  },
])

describe("ChineseLyrics local importer", () => {
  it("parses ChineseLyrics JSON entries and finds songs by artist", () => {
    const entries = parseChineseLyricsEntries(fixtureJson)

    expect(entries).toHaveLength(4)
    expect(findChineseLyricsByArtist(entries, "周杰伦").map((entry) => entry.name)).toEqual([
      "晴天",
      "晴天",
      "夜曲",
    ])
    expect(findChineseLyricsByArtist(entries, "马思唯").map((entry) => entry.name)).toEqual(["成都夜路"])
  })

  it("creates normalized Song drafts without making every song random eligible", () => {
    const entries = findChineseLyricsByArtist(parseChineseLyricsEntries(fixtureJson), "周杰伦")
    const songs = createSongsFromChineseLyrics(entries, {
      canonicalArtist: "周杰伦",
      collectedAt: "2026-05-20",
      defaultTags: {
        genres: ["流行"],
        moods: ["怀旧"],
        themes: ["青春"],
        eras: ["2000s"],
      },
      popularityTier: ({ title }) => (title === "晴天" ? "classic" : undefined),
    })

    expect(songs[0].id).toMatch(/^song-[a-z0-9]+$/)
    expect(songs[1].id).toBe(`${songs[0].id}-2`)
    expect(songs[2].id).toMatch(/^song-[a-z0-9]+$/)
    expect(new Set(songs.map((song) => song.id)).size).toBe(3)
    expect(songs[0]).toMatchObject({
      title: "晴天",
      artists: ["周杰伦"],
      canonicalArtist: ["周杰伦"],
      language: "zh",
      originalLanguage: "zh",
      versionType: "original",
      lyricsStatus: "complete",
      genres: ["流行"],
      moods: ["怀旧"],
      themes: ["青春"],
      eras: ["2000s"],
      popularityTier: "classic",
    })
    expect(songs[0].lyrics).toEqual(["窗外的雨停了", "故事还在跑"])
    expect(songs[1].lyrics).toEqual(["第二个版本"])
    expect(songs[2].popularityTier).toBeUndefined()
  })

  it("supports a small MaSiWei import with default tags", () => {
    const entries = findChineseLyricsByArtist(parseChineseLyricsEntries(fixtureJson), "马思唯")
    const songs = createSongsFromChineseLyrics(entries, {
      canonicalArtist: "马思唯",
      collectedAt: "2026-05-20",
      defaultTags: {
        genres: ["说唱"],
        moods: ["松弛"],
        themes: ["城市"],
        eras: ["2020s"],
      },
    })

    expect(songs).toHaveLength(1)
    expect(songs[0]).toMatchObject({
      id: expect.stringMatching(/^song-[a-z0-9]+$/),
      title: "成都夜路",
      genres: ["说唱"],
      moods: ["松弛"],
      themes: ["城市"],
      eras: ["2020s"],
    })
    expect(songs[0].lyrics).toEqual(["车灯经过桥"])
    expect(songs[0].popularityTier).toBeUndefined()
  })
})
