export type SongConfidence = {
  metadata: number
  lyrics: number
  classification: number
  overall: number
}

export type SongSource = {
  query: string
  lyricUrls: string[]
  metadataUrls: string[]
  collectedAt: string
}

export type Song = {
  id: string
  title: string
  aliases?: string[]
  artists: string[]
  canonicalArtist: string[]
  relatedPerformers?: string[]
  versionType: "original" | "cover" | "adaptation"
  originalLanguage?: "zh"
  lyricist?: string[]
  composer?: string[]
  releaseYear?: number
  album?: string
  language: "zh"
  regions?: string[]
  genres: string[]
  moods: string[]
  themes: string[]
  contexts?: string[]
  eras: string[]
  popularityTier?: "classic" | "popular" | "niche"
  source: SongSource
  confidence: SongConfidence
  lyrics: string[]
}

export function hasPlayableText(song: Song): boolean {
  return song.title.trim().length > 0 && song.lyrics.some((line) => line.trim().length > 0)
}
