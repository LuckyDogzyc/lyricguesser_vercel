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

    const state = applyGuess(digitSong, createInitialGameState(digitSong), "123４５６")

    expect(state.revealedChars).toEqual(["1", "2", "3", "4", "5", "6"])
    expect(state.guessCount).toBe(6)
    expect(state.isSolved).toBe(true)
  })

  it("counts duplicate normalized guesses once", () => {
    const duplicateSong: Song = {
      ...song,
      title: "a",
      lyrics: [],
    }

    const state = applyGuess(duplicateSong, createInitialGameState(duplicateSong), "aＡ")

    expect(state.guessedChars).toEqual(["a"])
    expect(state.revealedChars).toEqual(["a"])
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
    expect(next.missedChars).toEqual(["海"])
    expect(next.guessedChars).toEqual(["天", "海", "花"])
    expect(next.revealedChars).not.toBe(previousRevealed)
    expect(next.missedChars).not.toBe(previousMissed)
    expect(next.guessedChars).not.toBe(previousGuessed)
  })

  it("reveals one unrevealed song character as a hint and counts it separately", () => {
    const state = applyGuess(song, createInitialGameState(song), "晴")
    const hinted = applyHint(song, state, () => 0)

    expect(hinted.revealedChars).toEqual(["晴", "天"])
    expect(hinted.guessedChars).toEqual(["晴", "天"])
    expect(hinted.guessCount).toBe(2)
    expect(hinted.hintCount).toBe(1)
    expect(hinted.missedChars).toEqual([])
    expect(hinted.isSolved).toBe(true)
  })

  it("does not count a hint when nothing is left to reveal", () => {
    const solved = applyGuess(song, createInitialGameState(song), "晴天故事的小黄花青")
    const hinted = applyHint(song, solved, () => 0)

    expect(hinted).toBe(solved)
  })
})
