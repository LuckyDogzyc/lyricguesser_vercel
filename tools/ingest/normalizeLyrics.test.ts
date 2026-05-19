import { describe, expect, it } from "vitest"
import { normalizeLyrics } from "./normalizeLyrics"

describe("normalizeLyrics", () => {
  it("converts punctuation to spaces and removes non-lyric lines", () => {
    expect(
      normalizeLyrics(["作词：某某", "故事的小黄花，", "", "从出生那年就飘着。", "版权所有"])
    ).toEqual(["故事的小黄花", "从出生那年就飘着"])
  })
})
