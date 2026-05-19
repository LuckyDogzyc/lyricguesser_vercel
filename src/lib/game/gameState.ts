import type { Song } from "@/src/lib/catalog/song"
import { splitGuessChars, textToGuessableSet } from "./characters"

export type PuzzleLine = {
  type: "title" | "lyric"
  text: string
}

export type GameState = {
  songId: string
  revealedChars: string[]
  missedChars: string[]
  guessedChars: string[]
  guessCount: number
  isSolved: boolean
}

export function getPuzzleLines(song: Song): PuzzleLine[] {
  return [
    { type: "title", text: song.title },
    ...song.lyrics.map((line) => ({ type: "lyric" as const, text: line })),
  ]
}

export function createInitialGameState(song: Song): GameState {
  return {
    songId: song.id,
    revealedChars: [],
    missedChars: [],
    guessedChars: [],
    guessCount: 0,
    isSolved: false,
  }
}

export function getSongGuessableChars(song: Song): Set<string> {
  return textToGuessableSet([song.title, ...song.lyrics].join(""))
}

export function isSolved(song: Song, state: GameState): boolean {
  const titleChars = textToGuessableSet(song.title)
  return Array.from(titleChars).every((char) => state.revealedChars.includes(char))
}

export function applyGuess(song: Song, state: GameState, input: string): GameState {
  if (state.isSolved) {
    return state
  }

  const newChars = splitGuessChars(input, state.guessedChars)
  if (newChars.length === 0) {
    return state
  }

  const songChars = getSongGuessableChars(song)
  const revealed = new Set(state.revealedChars)
  const missed = new Set(state.missedChars)
  const guessed = new Set(state.guessedChars)

  for (const char of newChars) {
    guessed.add(char)
    if (songChars.has(char)) {
      revealed.add(char)
    } else {
      missed.add(char)
    }
  }

  const next: GameState = {
    songId: state.songId,
    revealedChars: Array.from(revealed),
    missedChars: Array.from(missed),
    guessedChars: Array.from(guessed),
    guessCount: state.guessCount + newChars.length,
    isSolved: false,
  }

  return {
    ...next,
    isSolved: isSolved(song, next),
  }
}
