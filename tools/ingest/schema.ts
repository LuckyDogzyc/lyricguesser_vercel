export type { Song, SongConfidence, SongSource } from "@/src/lib/catalog/song"

export type IngestionTask = {
  id: string
  query: string
  language: "zh"
  desiredCount?: number
  artists?: string[]
  themes?: string[]
  moods?: string[]
  genres?: string[]
  contexts?: string[]
  releaseYearRange?: {
    from: number
    to: number
  }
}
