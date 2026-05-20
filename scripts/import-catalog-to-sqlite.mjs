#!/usr/bin/env node
import Database from "better-sqlite3"
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const defaultInputDir = join(root, "content", "lyrics", "catalog")
const defaultLocalCatalog = join(root, "content", "lyrics", "songs.local.json")
const outputPath = process.env.LYRIC_CATALOG_DB_PATH || join(root, "data", "lyric-catalog.sqlite")

function main() {
  const songs = readSongs()
  mkdirSync(dirname(outputPath), { recursive: true })
  const tempPath = `${outputPath}.tmp`
  rmSync(tempPath, { force: true })

  const db = new Database(tempPath)
  db.pragma("journal_mode = WAL")
  db.pragma("synchronous = NORMAL")
  createSchema(db)

  const insertSong = db.prepare(
    `INSERT INTO songs (id, title, artists_json, canonical_artist_json, metadata_json, lyrics_json, song_json, playable, popularity_tier, lyrics_status)
     VALUES (@id, @title, @artists_json, @canonical_artist_json, @metadata_json, @lyrics_json, @song_json, @playable, @popularity_tier, @lyrics_status)`,
  )
  const insertCategory = db.prepare(
    "INSERT OR IGNORE INTO categories (category_id, type, label) VALUES (?, ?, ?)",
  )
  const insertSongCategory = db.prepare(
    "INSERT OR IGNORE INTO song_categories (category_id, song_id) VALUES (?, ?)",
  )

  const writeAll = db.transaction((catalogSongs) => {
    for (const song of catalogSongs) {
      const playable = hasPlayableText(song) ? 1 : 0
      insertSong.run({
        id: song.id,
        title: song.title,
        artists_json: JSON.stringify(song.artists ?? []),
        canonical_artist_json: JSON.stringify(song.canonicalArtist ?? []),
        metadata_json: JSON.stringify({
          aliases: song.aliases,
          relatedPerformers: song.relatedPerformers,
          versionType: song.versionType,
          originalLanguage: song.originalLanguage,
          lyricist: song.lyricist,
          composer: song.composer,
          releaseYear: song.releaseYear,
          album: song.album,
          language: song.language,
          regions: song.regions,
          genres: song.genres,
          moods: song.moods,
          themes: song.themes,
          contexts: song.contexts,
          eras: song.eras,
          source: song.source,
          confidence: song.confidence,
        }),
        lyrics_json: JSON.stringify(song.lyrics ?? []),
        song_json: JSON.stringify(song),
        playable,
        popularity_tier: song.popularityTier ?? null,
        lyrics_status: song.lyricsStatus ?? null,
      })

      if (!playable) continue
      for (const category of getSongCategories(song)) {
        insertCategory.run(category.id, category.type, category.label)
        insertSongCategory.run(category.id, song.id)
      }
    }
  })

  writeAll(songs)
  db.pragma("wal_checkpoint(TRUNCATE)")
  db.exec("VACUUM")
  db.close()
  renameSync(tempPath, outputPath)

  console.log(
    JSON.stringify(
      {
        outputPath,
        songs: songs.length,
        playableSongs: songs.filter(hasPlayableText).length,
      },
      null,
      2,
    ),
  )
}

function createSchema(db) {
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

    CREATE TABLE categories (
      category_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      label TEXT NOT NULL
    );

    CREATE TABLE song_categories (
      category_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      PRIMARY KEY (category_id, song_id),
      FOREIGN KEY (category_id) REFERENCES categories(category_id),
      FOREIGN KEY (song_id) REFERENCES songs(id)
    );

    CREATE INDEX idx_songs_playable ON songs(playable);
    CREATE INDEX idx_song_categories_category_id ON song_categories(category_id);
    CREATE INDEX idx_song_categories_song_id ON song_categories(song_id);
  `)
}

function readSongs() {
  if (existsSync(defaultInputDir)) {
    const chunkFiles = readdirSync(defaultInputDir)
      .filter((fileName) => /^songs-\d+\.json$/.test(fileName))
      .sort()

    if (chunkFiles.length > 0) {
      return chunkFiles.flatMap((fileName) => JSON.parse(readFileSync(join(defaultInputDir, fileName), "utf8")))
    }
  }

  if (existsSync(defaultLocalCatalog)) {
    return JSON.parse(readFileSync(defaultLocalCatalog, "utf8"))
  }

  throw new Error("No lyric catalog found under content/lyrics/catalog or content/lyrics/songs.local.json")
}

function hasPlayableText(song) {
  return typeof song.title === "string" && song.title.trim().length > 0 && Array.isArray(song.lyrics) && song.lyrics.some((line) => String(line).trim().length > 0)
}

function getSongCategories(song) {
  const categories = new Map()
  addCategoryValues(categories, "artist", [
    ...(song.canonicalArtist ?? []),
    ...(song.artists ?? []),
    ...(song.relatedPerformers ?? []),
  ])
  addCategoryValues(categories, "genre", song.genres ?? [])
  addCategoryValues(categories, "mood", song.moods ?? [])
  addCategoryValues(categories, "theme", song.themes ?? [])
  addCategoryValues(categories, "era", song.eras ?? [])
  addCategoryValues(categories, "context", song.contexts ?? [])
  return Array.from(categories.values())
}

function addCategoryValues(categories, type, values) {
  for (const rawValue of new Set(values.map((value) => String(value).trim()).filter(Boolean))) {
    const id = `${type}:${rawValue}`
    categories.set(id, { id, type, label: rawValue })
  }
}

main()
