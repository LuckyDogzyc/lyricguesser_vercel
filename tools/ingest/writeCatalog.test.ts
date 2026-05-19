import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "vitest"
import type { Song } from "@/src/lib/catalog/song"
import { writeIngestionResult } from "./writeCatalog"

function makeSong(id: string, overall: number): Song {
  return {
    id,
    title: "晴天",
    artists: ["周杰伦"],
    canonicalArtist: ["周杰伦"],
    versionType: "original",
    originalLanguage: "zh",
    language: "zh",
    genres: ["流行"],
    moods: ["怀旧"],
    themes: ["青春"],
    eras: ["2000s"],
    source: {
      query: "test",
      lyricUrls: [],
      metadataUrls: [],
      collectedAt: "2026-05-19",
    },
    confidence: {
      metadata: overall,
      lyrics: overall,
      classification: overall,
      overall,
    },
    lyrics: ["故事的小黄花"],
  }
}

describe("writeIngestionResult", () => {
  it("writes high confidence songs to catalog and lower confidence songs to review files", () => {
    const dir = mkdtempSync(join(tmpdir(), "lyric-ingest-"))
    const catalogPath = join(dir, "nested", "songs.json")
    const pendingDir = join(dir, "pending")
    const reviewDir = join(dir, "review")
    mkdirSync(dirname(catalogPath), { recursive: true })
    writeFileSync(catalogPath, "[]")

    const result = writeIngestionResult({
      taskId: "task",
      songs: [makeSong("approved", 0.9), makeSong("pending", 0.7), makeSong("skipped", 0.3)],
      catalogPath,
      pendingDir,
      reviewDir,
    })

    expect(result).toEqual({ approved: 1, pending: 1, skipped: 1 })
    expect(JSON.parse(readFileSync(catalogPath, "utf8")).map((song: Song) => song.id)).toEqual(["approved"])
    expect(readFileSync(join(pendingDir, "task.json"), "utf8")).toContain("\"pending\"")
    expect(readFileSync(join(reviewDir, "task.md"), "utf8")).toContain("pending")
  })

  it("rejects duplicate song ids anywhere in one ingestion batch", () => {
    const dir = mkdtempSync(join(tmpdir(), "lyric-ingest-"))
    const catalogPath = join(dir, "songs.json")
    writeFileSync(catalogPath, "[]")

    expect(() =>
      writeIngestionResult({
        taskId: "task",
        songs: [makeSong("same-id", 0.7), makeSong("same-id", 0.6)],
        catalogPath,
        pendingDir: join(dir, "pending"),
        reviewDir: join(dir, "review"),
      })
    ).toThrow("Duplicate song id: same-id")
  })
})
