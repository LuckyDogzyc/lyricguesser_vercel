"use client"

import React, { FormEvent, useMemo, useState } from "react"
import type { Song } from "@/src/lib/catalog/song"
import { isGuessableChar, normalizeGuessChar } from "@/src/lib/game/characters"
import { applyGuess, createInitialGameState, getPuzzleLines } from "@/src/lib/game/gameState"

type LyricGameProps = {
  initialSong: Song
  songs: Song[]
}

export function LyricGame({ initialSong, songs }: LyricGameProps) {
  const [song, setSong] = useState(initialSong)
  const [state, setState] = useState(() => createInitialGameState(initialSong))
  const [input, setInput] = useState("")
  const puzzleLines = useMemo(() => getPuzzleLines(song), [song])

  function submitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState((current) => applyGuess(song, current, input))
    setInput("")
  }

  function nextSong() {
    const next = songs[Math.floor(Math.random() * songs.length)] ?? initialSong
    setSong(next)
    setState(createInitialGameState(next))
    setInput("")
  }

  return (
    <main className="app-shell">
      <aside className="side-nav" aria-label="模式">
        <h1>猜歌词</h1>
        <button className="nav-item nav-item-active">随机</button>
        <button className="nav-item" disabled>
          每日挑战
        </button>
        <button className="nav-item" disabled>
          分类
        </button>
        <button className="nav-item" disabled>
          登录
        </button>
      </aside>

      <section className="lyrics-panel" aria-label="歌词谜面">
        {puzzleLines.map((line, lineIndex) => (
          <div
            aria-label={line.type === "title" ? "歌名" : `歌词行 ${lineIndex}`}
            className={`puzzle-line puzzle-line-${line.type}`}
            key={`${line.type}-${lineIndex}`}
          >
            {Array.from(line.text).map((char, charIndex) => (
              <PuzzleCell
                char={char}
                isRevealed={state.revealedChars.includes(normalizeGuessChar(char))}
                isSolved={state.isSolved}
                key={`${line.type}-${lineIndex}-${charIndex}`}
              />
            ))}
          </div>
        ))}
      </section>

      <aside className="guess-panel" aria-label="猜测">
        <form onSubmit={submitGuess} className="guess-form">
          <label htmlFor="guess-input">输入要猜的字</label>
          <input
            autoComplete="off"
            disabled={state.isSolved}
            id="guess-input"
            onChange={(event) => setInput(event.target.value)}
            value={input}
          />
          <button type="submit" disabled={state.isSolved || input.trim().length === 0}>
            提交
          </button>
        </form>

        <dl className="stats">
          <div>
            <dt>已猜次数</dt>
            <dd>{state.guessCount}</dd>
          </div>
          <div>
            <dt>不在歌里的字</dt>
            <dd>{state.missedChars.length > 0 ? state.missedChars.join(" ") : "无"}</dd>
          </div>
        </dl>

        {state.isSolved ? (
          <div className="victory" role="status">
            <strong>胜利</strong>
            <p>
              {song.title} · {song.canonicalArtist.join(" / ")}
            </p>
            <button type="button" onClick={nextSong}>
              随机下一首
            </button>
          </div>
        ) : null}
      </aside>
    </main>
  )
}

function PuzzleCell({ char, isRevealed, isSolved }: { char: string; isRevealed: boolean; isSolved: boolean }) {
  const normalizedChar = normalizeGuessChar(char)

  if (!isGuessableChar(normalizedChar)) {
    return <span className="puzzle-space" aria-hidden="true" />
  }

  if (isRevealed) {
    return <span className="puzzle-cell puzzle-cell-revealed">{char}</span>
  }

  if (isSolved) {
    return <span className="puzzle-cell puzzle-cell-complete">{char}</span>
  }

  return <span className="puzzle-cell puzzle-cell-hidden" aria-label="隐藏字" />
}
