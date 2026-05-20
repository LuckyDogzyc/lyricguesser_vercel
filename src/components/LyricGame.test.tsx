import { fireEvent, render, screen, within } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"
import type { Song } from "@/src/lib/catalog/song"
import { LyricGame } from "./LyricGame"

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
  lyrics: ["故事的小黄花"],
}

describe("LyricGame", () => {
  it("reveals guessed title characters and wins when the full title is revealed", () => {
    render(<LyricGame initialSong={song} songs={[song]} />)

    expect(screen.queryByText("晴")).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "晴" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))

    expect(screen.getByText("晴")).toBeInTheDocument()
    expect(screen.queryByText("天")).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "天" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))

    expect(screen.getByText("胜利")).toBeInTheDocument()
    expect(screen.getByLabelText("歌词行 1")).toHaveTextContent("故事的小黄花")

    const titleLine = screen.getByLabelText("歌名")
    expect(within(titleLine).getByText("晴")).toHaveClass("puzzle-cell-revealed")
    expect(within(screen.getByLabelText("歌词行 1")).getByText("故")).toHaveClass("puzzle-cell-complete")
  })

  it("starts a fresh random round from the left nav and clears previous guesses", () => {
    const nextSong: Song = {
      ...song,
      id: "next",
      title: "花海",
      popularityTier: "classic",
      lyrics: ["海风吹过"],
    }
    vi.spyOn(Math, "random").mockReturnValue(0)

    render(<LyricGame initialSong={song} songs={[song, nextSong]} />)

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "晴" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))
    expect(screen.getByText("晴")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "随机" }))

    expect(screen.queryByText("晴")).not.toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "花海" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))
    expect(screen.getByText("胜利")).toBeInTheDocument()

    vi.restoreAllMocks()
  })

  it("renders artist categories and starts a category round", () => {
    const masiweiSong: Song = {
      ...song,
      id: "masiwei",
      title: "黑马",
      artists: ["马思唯"],
      canonicalArtist: ["马思唯"],
      genres: ["说唱"],
      themes: ["城市"],
      eras: ["2020s"],
      popularityTier: "niche",
      lyrics: ["城市夜色"],
    }

    render(<LyricGame initialSong={song} songs={[song, masiweiSong]} />)

    fireEvent.click(screen.getByRole("button", { name: "马思唯 1" }))
    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "黑马" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))

    expect(screen.getByText("胜利")).toBeInTheDocument()
    expect(screen.getByText("黑马 · 马思唯")).toBeInTheDocument()
  })
})
