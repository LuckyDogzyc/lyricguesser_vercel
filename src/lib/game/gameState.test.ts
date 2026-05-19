import { describe, expect, it } from "vitest"
import type { Song } from "@/src/lib/catalog/song"
import { applyGuess, createInitialGameState, getPuzzleLines, isSolved } from "./gameState"

const song: Song = {
  id: "test",
  title: "晴天",
  artists: ["周杰伦"],
  canonicalArtist: ["周杰伦"],
  versionType: "original",
  originalLanguage: "zh",
  language: "zh",
  genres: [],
  moods: [],
  themes: [],
  eras: [],
  source: {
    query: "test",
    lyricUrls: [],
    metadataUrls: [],
    collectedAt: "2026-05-19",
  },
  confidence: {
    metadata: 1,
    lyrics: 1,
    classification: 1,
    overall: 1,
  },
  lyrics: ["故事的小黄花", "天 青"],
}

describe("game state", () => {
  it("puts title on the first puzzle line", () => {
    expect(getPuzzleLines(song)).toEqual([
      { type: "title", text: "晴天" },
      { type: "lyric", text: "故事的小黄花" },
      { type: "lyric", text: "天 青" },
    ])
  })

  it("reveals guessed characters across title and lyrics", () => {
    const state = createInitialGameState(song)
    const next = applyGuess(song, state, "天花")

    expect(next.revealedChars).toEqual(["天", "花"])
    expect(next.missedChars).toEqual([])
    expect(next.guessCount).toBe(2)
    expect(isSolved(song, next)).toBe(false)
  })

  it("tracks new misses and ignores duplicate guesses", () => {
    const first = applyGuess(song, createInitialGameState(song), "海海天")
    const second = applyGuess(song, first, "海天")

    expect(first.missedChars).toEqual(["海"])
    expect(first.guessCount).toBe(2)
    expect(second.guessCount).toBe(2)
  })

  it("is solved when every non-space title character is revealed", () => {
    const state = applyGuess(song, createInitialGameState(song), "晴天")

    expect(state.isSolved).toBe(true)
    expect(isSolved(song, state)).toBe(true)
  })

  it("ignores spaces and punctuation without incrementing guesses", () => {
    const state = applyGuess(song, createInitialGameState(song), " ，。、 ")

    expect(state.guessedChars).toEqual([])
    expect(state.guessCount).toBe(0)
  })

  it("normalizes English case and full-width input for comparison", () => {
    const englishSong: Song = {
      ...song,
      title: "Ａbc",
      lyrics: ["full width ABC"],
    }

    const state = applyGuess(englishSong, createInitialGameState(englishSong), "aＢC")

    expect(state.revealedChars).toEqual(["a", "b", "c"])
    expect(state.guessCount).toBe(3)
    expect(state.isSolved).toBe(true)
  })
})
