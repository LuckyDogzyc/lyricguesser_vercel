import type { SongConfidence } from "@/src/lib/catalog/song"

export function combineConfidence(confidence: Omit<SongConfidence, "overall">): SongConfidence {
  const overall = Number(
    (confidence.metadata * 0.35 + confidence.lyrics * 0.45 + confidence.classification * 0.2).toFixed(2)
  )

  return {
    ...confidence,
    overall,
  }
}

export function getConfidenceBucket(overall: number): "approved" | "pending" | "skipped" {
  if (overall >= 0.8) {
    return "approved"
  }

  if (overall >= 0.5) {
    return "pending"
  }

  return "skipped"
}
