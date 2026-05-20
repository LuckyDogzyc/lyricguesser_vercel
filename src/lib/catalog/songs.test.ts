import { describe, expect, it } from "vitest"
import type { Song } from "./song"
import {
  getCatalogCategories,
  getArtistCategories,
  getPlayableSongs,
  getRandomPoolSongs,
  getRandomSong,
  getSongCategories,
  getSongsByCategory,
} from "./songs"

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "valid",
    title: "晴天",
    artists: ["周杰伦"],
    canonicalArtist: ["周杰伦"],
    versionType: "original",
    originalLanguage: "zh",
    language: "zh",
    genres: ["流行"],
    moods: [],
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
    ...overrides,
  }
}

describe("getPlayableSongs", () => {
  it("returns only songs with a non-empty title and lyrics", () => {
    const songs = getPlayableSongs([
      makeSong({ id: "valid" }),
      makeSong({
        id: "empty-title",
        title: " ",
        artists: ["测试"],
        canonicalArtist: ["测试"],
        genres: [],
        moods: [],
        themes: [],
        eras: [],
        lyrics: ["一句歌词"],
      }),
    ])

    expect(songs.map((song) => song.id)).toEqual(["valid"])
  })
})

describe("getRandomPoolSongs", () => {
  it("includes only playable classic and popular songs", () => {
    const songs = getRandomPoolSongs([
      makeSong({ id: "classic", popularityTier: "classic" }),
      makeSong({ id: "popular", popularityTier: "popular" }),
      makeSong({ id: "niche", popularityTier: "niche" }),
      makeSong({ id: "missing-tier" }),
      makeSong({
        id: "unplayable-popular",
        popularityTier: "popular",
        lyrics: [],
      }),
    ])

    expect(songs.map((song) => song.id)).toEqual(["classic", "popular"])
  })

  it("keeps a lower-awareness artist out unless the song has an eligible tier", () => {
    const songs = getRandomPoolSongs([
      makeSong({
        id: "masiwei-missing-tier",
        artists: ["马思唯"],
        canonicalArtist: ["马思唯"],
      }),
      makeSong({
        id: "masiwei-popular-song",
        artists: ["马思唯"],
        canonicalArtist: ["马思唯"],
        popularityTier: "popular",
      }),
    ])

    expect(songs.map((song) => song.id)).toEqual(["masiwei-popular-song"])
  })

  it("returns null for random mode when no songs are eligible", () => {
    expect(
      getRandomSong([
        makeSong({ id: "niche", popularityTier: "niche" }),
        makeSong({ id: "missing-tier" }),
      ]),
    ).toBeNull()
  })
})

describe("catalog categories", () => {
  it("generates category keys from song metadata", () => {
    expect(
      getSongCategories(
        makeSong({
          artists: ["周杰伦"],
          canonicalArtist: ["周杰伦"],
          genres: ["流行"],
          themes: ["爱情", "青春"],
          eras: ["2000s"],
        }),
      ),
    ).toEqual([
      "artist:周杰伦",
      "genre:流行",
      "theme:爱情",
      "theme:青春",
      "era:2000s",
    ])
  })

  it("lists categories and returns playable songs by category", () => {
    const songs = [
      makeSong({
        id: "jay",
        canonicalArtist: ["周杰伦"],
        themes: ["爱情"],
        popularityTier: "classic",
      }),
      makeSong({
        id: "masiwei",
        artists: ["马思唯"],
        canonicalArtist: ["马思唯"],
        genres: ["说唱"],
        themes: ["城市"],
        eras: ["2020s"],
        popularityTier: "niche",
      }),
      makeSong({
        id: "unplayable",
        canonicalArtist: ["马思唯"],
        themes: ["爱情"],
        lyrics: [],
      }),
    ]

    expect(new Set(getCatalogCategories(songs).map((category) => category.id))).toEqual(
      new Set([
        "artist:周杰伦",
        "artist:马思唯",
        "genre:流行",
        "genre:说唱",
        "theme:爱情",
        "theme:城市",
        "era:2000s",
        "era:2020s",
      ]),
    )
    expect(getSongsByCategory("artist:马思唯", songs).map((song) => song.id)).toEqual(["masiwei"])
    expect(getSongsByCategory("theme:爱情", songs).map((song) => song.id)).toEqual(["jay"])
  })

  it("lists only artists with more than the requested minimum song count", () => {
    const songs = [
      ...Array.from({ length: 5 }, (_, index) =>
        makeSong({
          id: `jay-${index}`,
          title: `周歌${index}`,
          artists: ["周杰伦"],
          canonicalArtist: ["周杰伦"],
        }),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        makeSong({
          id: `masiwei-${index}`,
          title: `马歌${index}`,
          artists: ["马思唯"],
          canonicalArtist: ["马思唯"],
        }),
      ),
    ]

    expect(getArtistCategories(songs, 4)).toEqual([
      expect.objectContaining({ id: "artist:周杰伦", label: "周杰伦", songCount: 5 }),
    ])
  })
})
