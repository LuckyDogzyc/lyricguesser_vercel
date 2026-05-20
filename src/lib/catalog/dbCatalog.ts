import "server-only"

import Database from "better-sqlite3"
import { existsSync } from "node:fs"
import { join } from "node:path"
import type { Song } from "./song"
import type { SongCategory } from "./songs"

const defaultCatalogDbPath = join(process.cwd(), "data", "lyric-catalog.sqlite")

type SongJsonRow = {
  song_json: string
}

type CategoryRow = {
  category_id: string
  label: string
  type: SongCategory["type"]
  song_count: number
}

let cachedDb: Database.Database | null = null
let cachedDbPath: string | null = null

export function getCatalogDbPath(): string {
  return process.env.LYRIC_CATALOG_DB_PATH || defaultCatalogDbPath
}

export function hasCatalogDatabase(): boolean {
  return existsSync(getCatalogDbPath())
}

export function getDatabaseSongs(): Song[] {
  if (!hasCatalogDatabase()) {
    return []
  }

  return (
    getDatabase()
      .prepare("SELECT song_json FROM songs WHERE playable = 1 ORDER BY id")
      .all() as SongJsonRow[]
  ).map(parseSongRow)
}

export function getDatabaseArtistCategories(minimumSongCount = 4): SongCategory[] {
  if (!hasCatalogDatabase()) {
    return []
  }

  return getDatabase()
    .prepare(
      `SELECT c.category_id, c.label, c.type, COUNT(*) AS song_count
       FROM categories c
       JOIN song_categories sc ON sc.category_id = c.category_id
       JOIN songs s ON s.id = sc.song_id
       WHERE c.type = 'artist' AND s.playable = 1
       GROUP BY c.category_id, c.label, c.type
       HAVING COUNT(*) > ?
       ORDER BY song_count DESC, c.label ASC`,
    )
    .all(minimumSongCount)
    .map((row) => {
      const category = row as CategoryRow
      return {
        id: category.category_id,
        label: category.label,
        type: category.type,
        songCount: category.song_count,
      }
    })
}

export function getDatabaseRandomSong(currentSongId?: string): Song | null {
  if (!hasCatalogDatabase()) {
    return null
  }

  const db = getDatabase()
  const row = db
    .prepare(
      `SELECT song_json
       FROM songs
       WHERE playable = 1 AND (? IS NULL OR id != ?)
       ORDER BY random()
       LIMIT 1`,
    )
    .get(currentSongId ?? null, currentSongId ?? null) as SongJsonRow | undefined

  if (row) {
    return parseSongRow(row)
  }

  return parseOptionalSongRow(
    db.prepare("SELECT song_json FROM songs WHERE playable = 1 ORDER BY random() LIMIT 1").get() as
      | SongJsonRow
      | undefined,
  )
}

export function getDatabaseSongForCategory(categoryId: string, currentSongId?: string): Song | null {
  if (!hasCatalogDatabase()) {
    return null
  }

  const db = getDatabase()
  const row = db
    .prepare(
      `SELECT s.song_json
       FROM songs s
       JOIN song_categories sc ON sc.song_id = s.id
       WHERE s.playable = 1 AND sc.category_id = ? AND (? IS NULL OR s.id != ?)
       ORDER BY random()
       LIMIT 1`,
    )
    .get(categoryId, currentSongId ?? null, currentSongId ?? null) as SongJsonRow | undefined

  if (row) {
    return parseSongRow(row)
  }

  return parseOptionalSongRow(
    db
      .prepare(
        `SELECT s.song_json
         FROM songs s
         JOIN song_categories sc ON sc.song_id = s.id
         WHERE s.playable = 1 AND sc.category_id = ?
         ORDER BY random()
         LIMIT 1`,
      )
      .get(categoryId) as SongJsonRow | undefined,
  )
}

export function closeCatalogDatabaseForTests() {
  cachedDb?.close()
  cachedDb = null
  cachedDbPath = null
}

function getDatabase(): Database.Database {
  const dbPath = getCatalogDbPath()
  if (cachedDb && cachedDbPath === dbPath) {
    return cachedDb
  }

  cachedDb?.close()
  cachedDb = new Database(dbPath, { readonly: true, fileMustExist: true })
  cachedDb.pragma("query_only = ON")
  cachedDbPath = dbPath
  return cachedDb
}

function parseOptionalSongRow(row: SongJsonRow | undefined): Song | null {
  return row ? parseSongRow(row) : null
}

function parseSongRow(row: SongJsonRow): Song {
  return JSON.parse(row.song_json) as Song
}
