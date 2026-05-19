import { describe, expect, it } from "vitest"
import { getPlayableSongs } from "./songs"

describe("getPlayableSongs", () => {
  it("returns only songs with a non-empty title and lyrics", () => {
    const songs = getPlayableSongs([
      {
        id: "valid",
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
        source: {
          query: "seed",
          lyricUrls: [],
          metadataUrls: [],
          collectedAt: "2026-05-19",
        },
        confidence: {
          metadata: 1,
          lyrics: 1,
          classification: 1,
          overall: 1,
        },
        lyrics: ["故事的小黄花"],
      },
      {
        id: "empty-title",
        title: " ",
        artists: ["测试"],
        canonicalArtist: ["测试"],
        versionType: "original",
        language: "zh",
        genres: [],
        moods: [],
        themes: [],
        eras: [],
        source: {
          query: "seed",
          lyricUrls: [],
          metadataUrls: [],
          collectedAt: "2026-05-19",
        },
        confidence: {
          metadata: 1,
          lyrics: 1,
          classification: 1,
          overall: 1,
        },
        lyrics: ["一句歌词"],
      },
    ])

    expect(songs.map((song) => song.id)).toEqual(["valid"])
  })
})
