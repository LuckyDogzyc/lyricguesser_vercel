import type { Song } from "@/src/lib/catalog/song"
import type { PopularityTier } from "./schema"
import { normalizeLyrics } from "./normalizeLyrics"

export type ChineseLyricsEntry = {
  name: string
  singer: string
  lyric: string[]
}

export type ChineseLyricsDefaultTags = {
  genres?: string[]
  moods?: string[]
  themes?: string[]
  eras?: string[]
  regions?: string[]
  contexts?: string[]
}

export type CreateSongsFromChineseLyricsOptions = {
  canonicalArtist: string | string[]
  defaultTags: ChineseLyricsDefaultTags
  popularityTier?: PopularityTier | ((input: ChineseLyricsPopularityInput) => PopularityTier | undefined)
  collectedAt: string
}

export type ChineseLyricsPopularityInput = {
  entry: ChineseLyricsEntry
  title: string
  artist: string
}

const productionLinePatterns = [/^制作(?:人)?[:：]/, /^监制[:：]/]

export function parseChineseLyricsEntries(jsonText: string): ChineseLyricsEntry[] {
  const parsed: unknown = JSON.parse(jsonText)
  if (!Array.isArray(parsed)) {
    throw new Error("ChineseLyrics JSON must be an array.")
  }

  return parsed.map((item, index) => {
    if (!isChineseLyricsEntry(item)) {
      throw new Error(`Invalid ChineseLyrics entry at index ${index}.`)
    }

    return {
      name: item.name.trim(),
      singer: item.singer.trim(),
      lyric: item.lyric,
    }
  })
}

export function findChineseLyricsByArtist(
  entries: ChineseLyricsEntry[],
  artist: string,
): ChineseLyricsEntry[] {
  const normalizedArtist = normalizeComparableName(artist)
  return entries.filter((entry) => {
    return splitArtistNames(entry.singer).some((name) => normalizeComparableName(name) === normalizedArtist)
  })
}

export function createSongsFromChineseLyrics(
  entries: ChineseLyricsEntry[],
  options: CreateSongsFromChineseLyricsOptions,
): Song[] {
  const canonicalArtist = toArray(options.canonicalArtist)
  const primaryArtist = canonicalArtist[0] ?? ""
  const seenIds = new Map<string, number>()

  return entries.map((entry) => {
    const title = entry.name.trim()
    const artist = entry.singer.trim()
    const baseId = toSongId([...canonicalArtist, title].join(" "))
    const id = dedupeId(baseId, seenIds)
    const popularityTier = resolvePopularityTier(options.popularityTier, { entry, title, artist })

    return {
      id,
      title,
      artists: splitArtistNames(artist),
      canonicalArtist,
      versionType: "original",
      originalLanguage: "zh",
      language: "zh",
      genres: options.defaultTags.genres ?? [],
      moods: options.defaultTags.moods ?? [],
      themes: options.defaultTags.themes ?? [],
      contexts: options.defaultTags.contexts,
      eras: options.defaultTags.eras ?? [],
      regions: options.defaultTags.regions,
      popularityTier,
      lyricsStatus: "complete",
      source: {
        query: `ChineseLyrics local JSON: ${primaryArtist} ${title}`.trim(),
        lyricUrls: [],
        metadataUrls: [],
        collectedAt: options.collectedAt,
      },
      confidence: {
        metadata: 0.6,
        lyrics: 0.7,
        classification: 0.5,
        overall: 0.6,
      },
      lyrics: normalizeLyrics(entry.lyric.filter((line) => !isProductionLine(line))),
    }
  })
}

function isChineseLyricsEntry(item: unknown): item is ChineseLyricsEntry {
  if (!item || typeof item !== "object") {
    return false
  }

  const candidate = item as Partial<ChineseLyricsEntry>
  return (
    typeof candidate.name === "string" &&
    typeof candidate.singer === "string" &&
    Array.isArray(candidate.lyric) &&
    candidate.lyric.every((line) => typeof line === "string")
  )
}

function splitArtistNames(artist: string): string[] {
  return artist
    .split(/[、,，/／&]+/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
}

function normalizeComparableName(name: string): string {
  return name.normalize("NFKC").trim().toLocaleLowerCase()
}

function toArray(value: string | string[]): string[] {
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter((item) => item.length > 0)
}

function resolvePopularityTier(
  strategy: CreateSongsFromChineseLyricsOptions["popularityTier"],
  input: ChineseLyricsPopularityInput,
): PopularityTier | undefined {
  if (!strategy) {
    return undefined
  }

  return typeof strategy === "function" ? strategy(input) : strategy
}

function isProductionLine(line: string): boolean {
  const normalized = line.trim().normalize("NFKC")
  return productionLinePatterns.some((pattern) => pattern.test(normalized))
}

function dedupeId(baseId: string, seenIds: Map<string, number>): string {
  const count = seenIds.get(baseId) ?? 0
  seenIds.set(baseId, count + 1)
  return count === 0 ? baseId : `${baseId}-${count + 1}`
}

function toSongId(value: string): string {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("zh-CN")
  const readable = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  if (readable.length > 0) {
    return readable
  }

  return `song-${hashText(normalized)}`
}

function hashText(value: string): string {
  let hash = 0
  for (const character of value) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0
  }

  return hash.toString(36)
}
