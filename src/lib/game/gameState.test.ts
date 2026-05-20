import { describe, expect, it } from "vitest"
import type { Song } from "@/src/lib/catalog/song"
import { applyGuess, applyHint, createInitialGameState, getPuzzleLines, isSolved } from "./gameState"

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

  it("treats English words as whole guess units", () => {
    const englishSong: Song = {
      ...song,
      title: "Ａbc Song",
      lyrics: ["full width ABC"],
    }

    const partial = applyGuess(englishSong, createInitialGameState(englishSong), "aＢC")
    const solved = applyGuess(englishSong, partial, "song")

    expect(partial.revealedChars).toEqual(["abc"])
    expect(partial.guessCount).toBe(1)
    expect(partial.isSolved).toBe(false)
    expect(solved.revealedChars).toEqual(["abc", "song"])
    expect(solved.guessCount).toBe(2)
    expect(solved.isSolved).toBe(true)
  })

  it("normalizes decomposed guesses against precomposed title text", () => {
    const accentSong: Song = {
      ...song,
      title: "é",
      lyrics: ["cafe\u0301"],
    }

    const state = applyGuess(accentSong, createInitialGameState(accentSong), "e\u0301")

    expect(state.revealedChars).toEqual(["é"])
    expect(state.missedChars).toEqual([])
    expect(state.guessedChars).toEqual(["é"])
    expect(state.guessCount).toBe(1)
    expect(state.isSolved).toBe(true)
  })

  it("normalizes full-width digits for guesses", () => {
    const digitSong: Song = {
      ...song,
      title: "１２3",
      lyrics: ["digits 456"],
    }

    const state = applyGuess(digitSong, createInitialGameState(digitSong), "123 ４５６")

    expect(state.revealedChars).toEqual(["123", "456"])
    expect(state.guessCount).toBe(2)
    expect(state.isSolved).toBe(true)
  })

  it("counts duplicate normalized guesses once", () => {
    const duplicateSong: Song = {
      ...song,
      title: "apple",
      lyrics: [],
    }

    const state = applyGuess(duplicateSong, createInitialGameState(duplicateSong), "apple ＡＰＰＬＥ")

    expect(state.guessedChars).toEqual(["apple"])
    expect(state.revealedChars).toEqual(["apple"])
    expect(state.guessCount).toBe(1)
    expect(state.isSolved).toBe(true)
  })

  it("does not mutate previous state arrays when applying guesses", () => {
    const previous = applyGuess(song, createInitialGameState(song), "天")
    const previousRevealed = previous.revealedChars
    const previousMissed = previous.missedChars
    const previousGuessed = previous.guessedChars

    const next = applyGuess(song, previous, "海花")

    expect(previous.revealedChars).toEqual(["天"])
    expect(previous.missedChars).toEqual([])
    expect(previous.guessedChars).toEqual(["天"])
    expect(next.revealedChars).toEqual(["天", "花"])
    expect(next.lastRevealedChars).toEqual(["花"])
    expect(next.missedChars).toEqual(["海"])
    expect(next.lastMissedChars).toEqual(["海"])
    expect(next.guessedChars).toEqual(["天", "海", "花"])
    expect(next.revealedChars).not.toBe(previousRevealed)
    expect(next.missedChars).not.toBe(previousMissed)
    expect(next.guessedChars).not.toBe(previousGuessed)
  })

  it("reveals one unrevealed lyric character as a hint before title characters", () => {
    const state = applyGuess(song, createInitialGameState(song), "晴")
    const hinted = applyHint(song, state, () => 0)

    expect(hinted.revealedChars).toEqual(["晴", "故"])
    expect(hinted.lastRevealedChars).toEqual(["故"])
    expect(hinted.hintedChars).toEqual(["故"])
    expect(hinted.lastHintedChars).toEqual(["故"])
    expect(hinted.guessedChars).toEqual(["晴", "故"])
    expect(hinted.guessCount).toBe(2)
    expect(hinted.hintCount).toBe(1)
    expect(hinted.missedChars).toEqual([])
    expect(hinted.isSolved).toBe(false)
  })

  it("falls back to title hints only after lyric characters are revealed", () => {
    const titleFallbackSong: Song = {
      ...song,
      title: "海天",
      lyrics: ["风"],
    }
    const state = applyGuess(titleFallbackSong, createInitialGameState(titleFallbackSong), "风海")
    const hinted = applyHint(titleFallbackSong, state, () => 0)

    expect(hinted.revealedChars).toContain("天")
    expect(hinted.lastHintedChars).toEqual(["天"])
    expect(hinted.isSolved).toBe(true)
  })

  it("does not count a hint when nothing is left to reveal", () => {
    const solved = applyGuess(song, createInitialGameState(song), "晴天故事的小黄花青")
    const hinted = applyHint(song, solved, () => 0)

    expect(hinted).toBe(solved)
  })
})
