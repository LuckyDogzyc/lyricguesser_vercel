export type { Song, SongConfidence, SongSource } from "@/src/lib/catalog/song"
import type { SongConfidence, SongSource } from "@/src/lib/catalog/song"

export type PopularityTier = "classic" | "popular" | "niche"
export type VersionType = "original" | "cover" | "adaptation"
export type RelatedPerformerRelationship = "original" | "cover" | "related"

export type RelatedPerformer = {
  name: string
  relationship: RelatedPerformerRelationship
  note?: string
}

export type CategoryTags = {
  artists?: string[]
  themes?: string[]
  moods?: string[]
  genres?: string[]
  contexts?: string[]
  eras?: string[]
}

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

export type CandidateSong = {
  id: string
  title: string
  aliases?: string[]
  artists: string[]
  canonicalArtist: string[]
  relatedPerformers?: RelatedPerformer[]
  versionType: VersionType
  language: "zh"
  originalLanguage?: "zh"
  releaseYear?: number
  album?: string
  popularityTier?: PopularityTier
  allowRandomPool?: boolean
  categoryTags?: CategoryTags
  source?: SongSource
  confidence?: SongConfidence
  notes?: string[]
}

export type ScriptImprovementRequest = {
  title: string
  reason: string
  requestedChange: string
}

export type IngestionPlan = {
  task: IngestionTask
  candidates: CandidateSong[]
  scriptImprovementRequests?: ScriptImprovementRequest[]
}
