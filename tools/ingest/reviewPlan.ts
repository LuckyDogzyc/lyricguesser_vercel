import type { Song } from "@/src/lib/catalog/song"
import { getConfidenceBucket } from "./scoreConfidence"
import type { CandidateSong, IngestionPlan } from "./schema"

export type IngestionReviewResult<T> = {
  approved: T[]
  pending: T[]
  skipped: T[]
  notes: string[]
}

type Reviewable = Song | CandidateSong

export function reviewIngestionPlan(input: Song[]): IngestionReviewResult<Song>
export function reviewIngestionPlan(input: IngestionPlan): IngestionReviewResult<CandidateSong>
export function reviewIngestionPlan(input: Song[] | IngestionPlan): IngestionReviewResult<Reviewable> {
  const items = Array.isArray(input) ? input : input.candidates
  const result: IngestionReviewResult<Reviewable> = {
    approved: [],
    pending: [],
    skipped: [],
    notes: [],
  }

  for (const item of items) {
    const confidence = item.confidence
    if (!confidence) {
      result.pending.push(item)
      result.notes.push(`${item.id}: confidence is missing.`)
      continue
    }

    const bucket = getConfidenceBucket(confidence.overall)
    if (bucket === "skipped") {
      result.skipped.push(item)
      continue
    }

    const blockers = getApprovalBlockers(item)
    if (bucket === "pending" || blockers.length > 0) {
      result.pending.push(item)
      result.notes.push(...blockers)
      continue
    }

    result.approved.push(item)
  }

  if (!Array.isArray(input)) {
    result.notes.push(
      ...(input.scriptImprovementRequests ?? []).map((request) => {
        return `Tooling: ${request.title} - ${request.requestedChange}`
      })
    )
  }

  return result
}

function getApprovalBlockers(item: Reviewable): string[] {
  const blockers: string[] = []
  const allowRandomPool = "allowRandomPool" in item ? item.allowRandomPool === true : false

  if (allowRandomPool && !isRandomPoolPopularity(item.popularityTier)) {
    blockers.push(`${item.id}: random pool requires popularityTier classic or popular.`)
  }

  if (item.versionType !== "original") {
    blockers.push(`${item.id}: prefer same-language original lyrics before approving cover versions.`)
  }

  return blockers
}

function isRandomPoolPopularity(popularityTier: Reviewable["popularityTier"]): boolean {
  return popularityTier === "classic" || popularityTier === "popular"
}
