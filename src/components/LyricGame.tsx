"use client"

import React, { FormEvent, useMemo, useState } from "react"
import type { Song } from "@/src/lib/catalog/song"
import { getArtistCategories, getRandomEligibleSongs, getSongsForCategory } from "@/src/lib/catalog/songs"
import { splitTextGuessUnits } from "@/src/lib/game/characters"
import { applyGuess, applyHint, createInitialGameState, getPuzzleLines } from "@/src/lib/game/gameState"
import type { SongCategory } from "@/src/lib/catalog/songs"

type LyricGameProps = {
  initialSong: Song
  songs?: Song[]
  artistCategories?: SongCategory[]
}

export function LyricGame({ initialSong, songs = [], artistCategories: providedArtistCategories }: LyricGameProps) {
  const [song, setSong] = useState(initialSong)
  const [state, setState] = useState(() => createInitialGameState(initialSong))
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<"play" | "artists">("play")
  const [artistSearch, setArtistSearch] = useState("")
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const puzzleLines = useMemo(() => getPuzzleLines(song), [song])
  const randomSongs = useMemo(() => getRandomEligibleSongs(songs), [songs])
  const artistCategories = useMemo(() => providedArtistCategories ?? getArtistCategories(songs), [providedArtistCategories, songs])
  const visibleArtists = useMemo(() => {
    const keyword = artistSearch.trim().toLocaleLowerCase("zh-CN")
    if (keyword.length === 0) {
      return artistCategories
    }

    return artistCategories.filter((artist) => artist.label.toLocaleLowerCase("zh-CN").includes(keyword))
  }, [artistCategories, artistSearch])

  function submitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState((current) => applyGuess(song, current, input))
    setInput("")
  }

  function startSong(next: Song) {
    setSong(next)
    setState(createInitialGameState(next))
    setInput("")
    setMode("play")
    setIsNavOpen(false)
  }

  function startRandomSong() {
    void startRemoteRandomSong()
  }

  async function startRemoteRandomSong() {
    setActiveCategoryId(null)
    const response = await fetch(`/api/random-song?currentSongId=${encodeURIComponent(song.id)}`)
    if (response.ok) {
      const remoteSong = (await response.json()) as Song
      startSong(remoteSong)
      return
    }

    const pool = randomSongs.length > 0 ? randomSongs : songs
    startSong(pickRandomSong(pool, song) ?? initialSong)
  }

  async function startCategory(categoryId: string) {
    const categorySongs = getSongsForCategory(categoryId, songs)
    const next = pickRandomSong(categorySongs, song)
    if (next) {
      setActiveCategoryId(categoryId)
      startSong(next)
      return
    }

    const response = await fetch(
      `/api/category-song?categoryId=${encodeURIComponent(categoryId)}&currentSongId=${encodeURIComponent(song.id)}`,
    )
    if (response.ok) {
      const remoteSong = (await response.json()) as Song
      setActiveCategoryId(categoryId)
      startSong(remoteSong)
    }
  }

  function showArtistPicker() {
    setArtistSearch("")
    setMode("artists")
    setIsNavOpen(false)
  }

  function revealHint() {
    setState((current) => applyHint(song, current))
  }

  return (
    <main className="app-shell">
      <aside className={`side-nav ${isNavOpen ? "side-nav-open" : ""}`} aria-label="模式">
        <button
          aria-expanded={isNavOpen}
          className="mobile-mode-toggle"
          onClick={() => setIsNavOpen((current) => !current)}
          type="button"
        >
          模式
        </button>
        <h1>猜歌词</h1>
        <div className="nav-items">
          <button className="nav-item nav-item-active" onClick={startRandomSong} type="button">
            随机
          </button>
          <button className="nav-item" disabled>
            每日挑战
          </button>
          <button className="nav-item" onClick={showArtistPicker} type="button">
            分类
          </button>
          <button className="nav-item" disabled>
            登录
          </button>
        </div>
      </aside>

      <section className="lyrics-panel" aria-label="歌词谜面">
        {mode === "artists" ? (
          <ArtistPicker
            artists={visibleArtists}
            search={artistSearch}
            onSearchChange={setArtistSearch}
            onStartCategory={startCategory}
          />
        ) : (
          puzzleLines.map((line, lineIndex) => (
            <div
              aria-label={line.type === "title" ? "歌名" : `歌词行 ${lineIndex}`}
              className={`puzzle-line puzzle-line-${line.type}`}
              key={`${line.type}-${lineIndex}`}
            >
              {splitTextGuessUnits(line.text).map((unit, unitIndex) => (
                <PuzzleCell
                  unit={unit}
                  isRevealed={state.revealedChars.includes(unit.normalized)}
                  isSolved={state.isSolved}
                  wasLastRevealed={state.lastRevealedChars.includes(unit.normalized)}
                  wasHinted={state.hintedChars.includes(unit.normalized)}
                  wasLastHinted={state.lastHintedChars.includes(unit.normalized)}
                  key={`${line.type}-${lineIndex}-${unitIndex}`}
                />
              ))}
            </div>
          ))
        )}
      </section>

      <aside className="guess-panel" aria-label="猜测">
        <div className="guess-actions">
          <form onSubmit={submitGuess} className="guess-form">
            <label htmlFor="guess-input">输入要猜的字</label>
            <input
              autoComplete="off"
              disabled={state.isSolved}
              id="guess-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入要猜的字"
              value={input}
            />
            <button type="submit" disabled={state.isSolved || input.trim().length === 0}>
              提交
            </button>
          </form>
          <button className="hint-button" disabled={state.isSolved} onClick={revealHint} type="button">
            提示
          </button>
        </div>

        <dl className="stats">
          <div>
            <dt>已猜次数</dt>
            <dd>{state.guessCount}</dd>
          </div>
          <div>
            <dt>提示次数</dt>
            <dd>{state.hintCount}</dd>
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
            <button
              type="button"
              onClick={activeCategoryId ? () => void startCategory(activeCategoryId) : startRandomSong}
            >
              {activeCategoryId ? "分类下一首" : "随机下一首"}
            </button>
          </div>
        ) : null}
      </aside>
    </main>
  )
}

function ArtistPicker({
  artists,
  search,
  onSearchChange,
  onStartCategory,
}: {
  artists: Array<{ id: string; label: string; songCount: number }>
  search: string
  onSearchChange: (value: string) => void
  onStartCategory: (categoryId: string) => void
}) {
  return (
    <div className="artist-picker">
      <div className="artist-search">
        <label htmlFor="artist-search">搜索歌手</label>
        <input
          autoComplete="off"
          id="artist-search"
          onChange={(event) => onSearchChange(event.target.value)}
          role="searchbox"
          value={search}
        />
      </div>
      <div className="artist-grid" aria-label="歌手列表">
        {artists.map((artist) => (
          <button className="artist-button" key={artist.id} onClick={() => onStartCategory(artist.id)} type="button">
            {artist.label}
            <span>{artist.songCount}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PuzzleCell({
  unit,
  isRevealed,
  isSolved,
  wasLastRevealed,
  wasHinted,
  wasLastHinted,
}: {
  unit: ReturnType<typeof splitTextGuessUnits>[number]
  isRevealed: boolean
  isSolved: boolean
  wasLastRevealed: boolean
  wasHinted: boolean
  wasLastHinted: boolean
}) {
  if (!unit.isGuessable) {
    return <span className="puzzle-space" aria-hidden="true" />
  }

  if (isRevealed) {
    return (
      <span
        className={[
          "puzzle-cell",
          "puzzle-cell-revealed",
          wasHinted ? "puzzle-cell-hinted" : "",
          wasLastRevealed ? "puzzle-cell-last" : "",
          wasLastHinted ? "puzzle-cell-last-hinted" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {unit.text}
      </span>
    )
  }

  if (isSolved) {
    return <span className="puzzle-cell puzzle-cell-complete">{unit.text}</span>
  }

  return <span className="puzzle-cell puzzle-cell-hidden" aria-label="隐藏字" />
}

function pickRandomSong(songs: Song[], currentSong: Song): Song | null {
  if (songs.length === 0) {
    return null
  }

  if (songs.length === 1) {
    return songs[0]
  }

  const alternatives = songs.filter((candidate) => candidate.id !== currentSong.id)
  return alternatives[Math.floor(Math.random() * alternatives.length)] ?? songs[0]
}
