import rawSongs from "@/content/lyrics/songs.json"
import type { Song } from "./song"
import { hasPlayableText } from "./song"

export type SongCategory = {
  id: string
  label: string
  type: "artist" | "genre" | "mood" | "theme" | "era" | "context"
  songCount: number
}

const RANDOM_ELIGIBLE_TIERS = new Set<Song["popularityTier"]>(["classic", "popular"])

export function getPlayableSongs(songs: Song[] = rawSongs as Song[]): Song[] {
  return songs.filter(hasPlayableText)
}

export function getRandomSong(songs: Song[] = getPlayableSongs()): Song | null {
  const randomPool = getRandomEligibleSongs(songs)

  if (randomPool.length === 0) {
    return null
  }

  return randomPool[Math.floor(Math.random() * randomPool.length)]
}

export function getRandomEligibleSongs(songs: Song[] = getPlayableSongs()): Song[] {
  return getPlayableSongs(songs).filter((song) =>
    RANDOM_ELIGIBLE_TIERS.has(song.popularityTier),
  )
}

export function getRandomPoolSongs(songs: Song[] = getPlayableSongs()): Song[] {
  return getRandomEligibleSongs(songs)
}

export function getCatalogCategories(songs: Song[] = getPlayableSongs()): SongCategory[] {
  const categories = new Map<string, SongCategory>()

  for (const song of getPlayableSongs(songs)) {
    addCategoryValues(categories, "artist", [
      ...song.canonicalArtist,
      ...song.artists,
      ...(song.relatedPerformers ?? []),
    ])
    addCategoryValues(categories, "genre", song.genres)
    addCategoryValues(categories, "mood", song.moods)
    addCategoryValues(categories, "theme", song.themes)
    addCategoryValues(categories, "era", song.eras)
    addCategoryValues(categories, "context", song.contexts ?? [])
  }

  return Array.from(categories.values()).sort((left, right) => {
    if (right.songCount !== left.songCount) {
      return right.songCount - left.songCount
    }

    return left.label.localeCompare(right.label, "zh-CN")
  })
}

export function getSongsForCategory(categoryId: string, songs: Song[] = getPlayableSongs()): Song[] {
  return getPlayableSongs(songs).filter((song) =>
    getSongCategories(song).includes(categoryId),
  )
}

export function getSongsByCategory(categoryId: string, songs: Song[] = getPlayableSongs()): Song[] {
  return getSongsForCategory(categoryId, songs)
}

export function getSongCategories(song: Song): string[] {
  const ids = new Set<string>()

  addIds(ids, "artist", [
    ...song.canonicalArtist,
    ...song.artists,
    ...(song.relatedPerformers ?? []),
  ])
  addIds(ids, "genre", song.genres)
  addIds(ids, "mood", song.moods)
  addIds(ids, "theme", song.themes)
  addIds(ids, "era", song.eras)
  addIds(ids, "context", song.contexts ?? [])

  return Array.from(ids)
}

function addCategoryValues(
  categories: Map<string, SongCategory>,
  type: SongCategory["type"],
  values: string[]
) {
  const uniqueValues = new Set(values.map((value) => value.trim()).filter(Boolean))

  for (const value of uniqueValues) {
    const id = makeCategoryId(type, value)
    const existing = categories.get(id)
    if (existing) {
      existing.songCount += 1
      continue
    }

    categories.set(id, {
      id,
      label: value,
      type,
      songCount: 1,
    })
  }
}

function addIds(ids: Set<string>, type: SongCategory["type"], values: string[]) {
  for (const value of values) {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      ids.add(makeCategoryId(type, trimmed))
    }
  }
}

function makeCategoryId(type: SongCategory["type"], value: string): string {
  return `${type}:${value}`
}
