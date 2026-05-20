import "server-only"

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { Song } from "./song"
import type { SongCategory } from "./songs"
import { getArtistCategories, getPlayableSongs, getSongsForCategory } from "./songs"

const privateCatalogPath = join(process.cwd(), "content", "lyrics", "songs.local.json")
const publicCatalogDir = join(process.cwd(), "content", "lyrics", "catalog")

let cachedSongs: Song[] | null = null

export function getPrivateSongs(): Song[] {
  if (cachedSongs) {
    return cachedSongs
  }

  const chunkPaths = getPublicCatalogChunkPaths()
  if (chunkPaths.length > 0) {
    cachedSongs = chunkPaths.flatMap((chunkPath) => JSON.parse(readFileSync(chunkPath, "utf8")) as Song[])
    return cachedSongs
  }

  if (existsSync(privateCatalogPath)) {
    cachedSongs = JSON.parse(readFileSync(privateCatalogPath, "utf8")) as Song[]
    return cachedSongs
  }

  cachedSongs = []
  return cachedSongs
}

export function getPrivateArtistCategories(minimumSongCount = 4): SongCategory[] {
  return getArtistCategories(getPrivateSongs(), minimumSongCount)
}

export function getPrivateRandomSong(currentSongId?: string): Song | null {
  const songs = getPlayableSongs(getPrivateSongs())
  if (songs.length === 0) {
    return null
  }

  if (songs.length === 1) {
    return songs[0]
  }

  const alternatives = currentSongId ? songs.filter((song) => song.id !== currentSongId) : songs
  return alternatives[Math.floor(Math.random() * alternatives.length)] ?? songs[0]
}

export function getPrivateSongForCategory(categoryId: string): Song | null {
  const songs = getSongsForCategory(categoryId, getPrivateSongs())
  if (songs.length === 0) {
    return null
  }

  return songs[Math.floor(Math.random() * songs.length)] ?? songs[0]
}

function getPublicCatalogChunkPaths(): string[] {
  if (!existsSync(publicCatalogDir)) {
    return []
  }

  return readdirSync(publicCatalogDir)
    .filter((fileName) => /^songs-\d+\.json$/.test(fileName))
    .sort()
    .map((fileName) => join(publicCatalogDir, fileName))
}
