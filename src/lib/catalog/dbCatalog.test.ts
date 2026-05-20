import Database from "better-sqlite3"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "vitest"
import type { Song } from "./song"
import {
  closeCatalogDatabaseForTests,
  getDatabaseArtistCategories,
  getDatabaseRandomSong,
  getDatabaseSongForCategory,
} from "./dbCatalog"

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

describe("SQLite catalog runtime", () => {
  let tempDir: string | null = null

  afterEach(() => {
    closeCatalogDatabaseForTests()
    delete process.env.LYRIC_CATALOG_DB_PATH
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it("samples random and category songs from the database", () => {
    const dbPath = createCatalogDatabase([
      makeSong({ id: "jay", title: "晴天", canonicalArtist: ["周杰伦"], artists: ["周杰伦"] }),
      makeSong({ id: "mao", title: "消愁", canonicalArtist: ["毛不易"], artists: ["毛不易"] }),
    ])
    process.env.LYRIC_CATALOG_DB_PATH = dbPath

    expect(getDatabaseRandomSong("jay")?.id).toBe("mao")
    expect(getDatabaseSongForCategory("artist:周杰伦")?.id).toBe("jay")
  })

  it("avoids the current song when sampling a category when alternatives exist", () => {
    const dbPath = createCatalogDatabase([
      makeSong({ id: "jay-1", title: "晴天", canonicalArtist: ["周杰伦"], artists: ["周杰伦"] }),
      makeSong({ id: "jay-2", title: "稻香", canonicalArtist: ["周杰伦"], artists: ["周杰伦"] }),
    ])
    process.env.LYRIC_CATALOG_DB_PATH = dbPath

    expect(getDatabaseSongForCategory("artist:周杰伦", "jay-1")?.id).toBe("jay-2")
  })

  it("lists artist categories without loading the full song catalog into the client", () => {
    const jaySongs = Array.from({ length: 5 }, (_, index) =>
      makeSong({ id: `jay-${index}`, title: `周歌${index}`, canonicalArtist: ["周杰伦"], artists: ["周杰伦"] }),
    )
    const maoSongs = Array.from({ length: 4 }, (_, index) =>
      makeSong({ id: `mao-${index}`, title: `毛歌${index}`, canonicalArtist: ["毛不易"], artists: ["毛不易"] }),
    )
    const dbPath = createCatalogDatabase([...jaySongs, ...maoSongs])
    process.env.LYRIC_CATALOG_DB_PATH = dbPath

    expect(getDatabaseArtistCategories(4)).toEqual([
      expect.objectContaining({ id: "artist:周杰伦", label: "周杰伦", songCount: 5 }),
    ])
  })

  function createCatalogDatabase(songs: Song[]): string {
    tempDir = mkdtempSync(join(tmpdir(), "lyric-db-test-"))
    const dbPath = join(tempDir, "catalog.sqlite")
    const db = new Database(dbPath)
    db.exec(`
      CREATE TABLE songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artists_json TEXT NOT NULL,
        canonical_artist_json TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        lyrics_json TEXT NOT NULL,
        song_json TEXT NOT NULL,
        playable INTEGER NOT NULL,
        popularity_tier TEXT,
        lyrics_status TEXT
      );
      CREATE TABLE categories (category_id TEXT PRIMARY KEY, type TEXT NOT NULL, label TEXT NOT NULL);
      CREATE TABLE song_categories (category_id TEXT NOT NULL, song_id TEXT NOT NULL, PRIMARY KEY (category_id, song_id));
    `)
    const insertSong = db.prepare(
      "INSERT INTO songs (id, title, artists_json, canonical_artist_json, metadata_json, lyrics_json, song_json, playable, popularity_tier, lyrics_status) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL)",
    )
    const insertCategory = db.prepare("INSERT OR IGNORE INTO categories (category_id, type, label) VALUES (?, ?, ?)")
    const insertSongCategory = db.prepare("INSERT OR IGNORE INTO song_categories (category_id, song_id) VALUES (?, ?)")
    for (const song of songs) {
      insertSong.run(
        song.id,
        song.title,
        JSON.stringify(song.artists),
        JSON.stringify(song.canonicalArtist),
        JSON.stringify({}),
        JSON.stringify(song.lyrics),
        JSON.stringify(song),
      )
      for (const artist of song.canonicalArtist) {
        insertCategory.run(`artist:${artist}`, "artist", artist)
        insertSongCategory.run(`artist:${artist}`, song.id)
      }
    }
    db.close()
    return dbPath
  }
})
