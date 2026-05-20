import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Song } from "@/src/lib/catalog/song"
import { getConfidenceBucket } from "./scoreConfidence"

export type WriteIngestionInput = {
  taskId: string
  songs: Song[]
  catalogPath: string
  pendingDir: string
  reviewDir: string
}

export type WriteIngestionResult = {
  approved: number
  pending: number
  skipped: number
}

export function writeIngestionResult(input: WriteIngestionInput): WriteIngestionResult {
  mkdirSync(input.pendingDir, { recursive: true })
  mkdirSync(input.reviewDir, { recursive: true })

  const existing = JSON.parse(readFileSync(input.catalogPath, "utf8")) as Song[]
  const seenIds = new Set(existing.map((song) => song.id))
  const approved: Song[] = []
  const pending: Song[] = []
  let skipped = 0

  for (const song of input.songs) {
    if (seenIds.has(song.id)) {
      throw new Error(`Duplicate song id: ${song.id}`)
    }
    seenIds.add(song.id)

    const bucket = getConfidenceBucket(song.confidence.overall)
    if (bucket === "approved") {
      approved.push(song)
    } else if (bucket === "pending") {
      pending.push(song)
    } else {
      skipped += 1
    }
  }

  writeFileSync(input.catalogPath, `${JSON.stringify([...existing, ...approved], null, 2)}\n`)

  if (pending.length > 0) {
    writeFileSync(join(input.pendingDir, `${input.taskId}.json`), `${JSON.stringify(pending, null, 2)}\n`)
    writeFileSync(join(input.reviewDir, `${input.taskId}.md`), renderReviewMarkdown(input.taskId, pending))
  }

  return {
    approved: approved.length,
    pending: pending.length,
    skipped,
  }
}

function renderReviewMarkdown(taskId: string, songs: Song[]): string {
  const rows = songs
    .map((song) => {
      return [
        `## ${song.title}`,
        "",
        `- ID: \`${song.id}\``,
        `- Artists: ${song.artists.join(", ")}`,
        `- Canonical artist: ${song.canonicalArtist.join(", ")}`,
        `- Related performers: ${(song.relatedPerformers ?? []).join(", ") || "none"}`,
        `- Version: ${song.versionType}`,
        `- Popularity: ${song.popularityTier ?? "unclassified"}`,
        `- Random pool eligible: ${song.popularityTier === "classic" || song.popularityTier === "popular" ? "yes" : "no"}`,
        `- Confidence: ${song.confidence.overall}`,
        `- Lyrics lines: ${song.lyrics.length}`,
        "",
      ].join("\n")
    })
    .join("\n")

  return [`# Review: ${taskId}`, "", rows].join("\n")
}
