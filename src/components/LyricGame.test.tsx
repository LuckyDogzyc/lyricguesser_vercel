import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
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
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

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

  it("starts a fresh random round from the left nav and clears previous guesses", async () => {
    const nextSong: Song = {
      ...song,
      id: "next",
      title: "花海",
      popularityTier: "classic",
      lyrics: ["海风吹过"],
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(nextSong)),
    )

    render(<LyricGame initialSong={song} songs={[song, nextSong]} />)

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "晴" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))
    expect(screen.getByText("晴")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "随机" }))

    await waitFor(() => expect(screen.queryByText("晴")).not.toBeInTheDocument())
    expect(screen.getByText("已猜次数").nextSibling).toHaveTextContent("0")

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "花海" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))
    expect(screen.getByText("胜利")).toBeInTheDocument()
  })

  it("renders artist categories and starts a category round", () => {
    const masiweiSongs = Array.from({ length: 5 }, (_, index): Song => ({
      ...song,
      id: `masiwei-${index}`,
      title: index === 0 ? "黑马" : `马歌${index}`,
      artists: ["马思唯"],
      canonicalArtist: ["马思唯"],
      genres: ["说唱"],
      themes: ["城市"],
      eras: ["2020s"],
      popularityTier: "niche",
      lyrics: ["城市夜色"],
    }))
    vi.spyOn(Math, "random").mockReturnValue(0)

    render(<LyricGame initialSong={song} songs={[song, ...masiweiSongs]} />)

    fireEvent.click(screen.getByRole("button", { name: "分类" }))
    expect(screen.getByRole("searchbox", { name: "搜索歌手" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "周杰伦 1" })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索歌手" }), { target: { value: "马思" } })
    fireEvent.click(screen.getByRole("button", { name: "马思唯 5" }))
    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "黑马" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))

    expect(screen.getByText("胜利")).toBeInTheDocument()
    expect(screen.getByText("黑马 · 马思唯")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "分类下一首" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "分类下一首" }))
    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "马歌1" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))
    expect(screen.getByText("马歌1 · 马思唯")).toBeInTheDocument()
  })

  it("reveals a lyric character through a hint and highlights it separately", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    render(<LyricGame initialSong={song} songs={[song]} />)

    fireEvent.click(screen.getByRole("button", { name: "提示" }))

    expect(screen.getByText("故")).toHaveClass("puzzle-cell-hinted", "puzzle-cell-last", "puzzle-cell-last-hinted")
    expect(screen.getByText("已猜次数").nextSibling).toHaveTextContent("1")
    expect(screen.getByText("提示次数").nextSibling).toHaveTextContent("1")

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "事" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))

    expect(screen.getByText("故")).toHaveClass("puzzle-cell-hinted")
    expect(screen.getByText("故")).not.toHaveClass("puzzle-cell-last")
    expect(screen.getByText("事")).toHaveClass("puzzle-cell-last")
  })

  it("treats English words as one puzzle cell instead of individual letters", () => {
    const englishSong: Song = {
      ...song,
      id: "english",
      title: "Love Story",
      lyrics: ["Baby just say yes"],
    }

    render(<LyricGame initialSong={englishSong} songs={[englishSong]} />)

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "l" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))
    expect(screen.queryByText("Love")).not.toBeInTheDocument()
    expect(screen.getByText("不在歌里的字").nextSibling).toHaveTextContent("l")

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "love" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))
    expect(screen.getByText("Love")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("输入要猜的字"), { target: { value: "story" } })
    fireEvent.click(screen.getByRole("button", { name: "提交" }))
    expect(screen.getByText("胜利")).toBeInTheDocument()
  })
})
