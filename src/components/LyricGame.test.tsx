import { fireEvent, render, screen, within } from "@testing-library/react"
import React from "react"
import { describe, expect, it } from "vitest"
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
})
