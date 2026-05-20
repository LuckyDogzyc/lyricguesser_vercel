import type { Song } from "@/src/lib/catalog/song"
import { splitGuessChars, textToGuessableSet } from "./characters"

export type PuzzleLine = {
  type: "title" | "lyric"
  text: string
}

export type GameState = {
  songId: string
  revealedChars: string[]
  lastRevealedChars: string[]
  hintedChars: string[]
  lastHintedChars: string[]
  missedChars: string[]
  lastMissedChars: string[]
  guessedChars: string[]
  guessCount: number
  hintCount: number
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
    lastRevealedChars: [],
    hintedChars: [],
    lastHintedChars: [],
    missedChars: [],
    lastMissedChars: [],
    guessedChars: [],
    guessCount: 0,
    hintCount: 0,
    isSolved: false,
  }
}

export function getSongGuessableChars(song: Song): Set<string> {
  return textToGuessableSet([song.title, ...song.lyrics].join(" "))
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
  const previousRevealed = new Set(state.revealedChars)
  const missed = new Set(state.missedChars)
  const previousMissed = new Set(state.missedChars)
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
    lastRevealedChars: newChars.filter((char) => songChars.has(char) && !previousRevealed.has(char)),
    hintedChars: state.hintedChars,
    lastHintedChars: [],
    missedChars: Array.from(missed),
    lastMissedChars: newChars.filter((char) => !songChars.has(char) && !previousMissed.has(char)),
    guessedChars: Array.from(guessed),
    guessCount: state.guessCount + newChars.length,
    hintCount: state.hintCount,
    isSolved: false,
  }

  return {
    ...next,
    isSolved: isSolved(song, next),
  }
}

export function applyHint(song: Song, state: GameState, random: () => number = Math.random): GameState {
  if (state.isSolved) {
    return state
  }

  const unrevealedChars = getUnrevealedSongChars(song, state)
  if (unrevealedChars.length === 0) {
    return state
  }

  const hintedChar = unrevealedChars[Math.floor(random() * unrevealedChars.length)] ?? unrevealedChars[0]
  const revealed = new Set(state.revealedChars)
  const guessed = new Set(state.guessedChars)
  const hinted = new Set(state.hintedChars)
  revealed.add(hintedChar)
  guessed.add(hintedChar)
  hinted.add(hintedChar)

  const next: GameState = {
    ...state,
    revealedChars: Array.from(revealed),
    lastRevealedChars: [hintedChar],
    hintedChars: Array.from(hinted),
    lastHintedChars: [hintedChar],
    lastMissedChars: [],
    guessedChars: Array.from(guessed),
    guessCount: state.guessCount + 1,
    hintCount: state.hintCount + 1,
  }

  return {
    ...next,
    isSolved: isSolved(song, next),
  }
}

function getUnrevealedSongChars(song: Song, state: GameState): string[] {
  const titleChars = textToGuessableSet(song.title)
  const songChars = getSongGuessableChars(song)
  const unrevealedSongChars = Array.from(songChars).filter((char) => !state.revealedChars.includes(char))
  const unrevealedNonTitleChars = unrevealedSongChars.filter((char) => !titleChars.has(char))

  if (unrevealedNonTitleChars.length > 0) {
    return unrevealedNonTitleChars
  }

  return unrevealedSongChars
}
