const nonLyricPatterns = [/^作词[:：]/, /^作曲[:：]/, /^编曲[:：]/, /^演唱[:：]/, /版权/, /提供/]
const punctuationPattern = /[\p{P}\p{S}]/gu

export function normalizeLyricLine(line: string): string {
  return line.normalize("NFKC").replace(punctuationPattern, " ").replace(/\s+/g, " ").trim()
}

export function normalizeLyrics(lines: string[]): string[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !nonLyricPatterns.some((pattern) => pattern.test(line)))
    .map(normalizeLyricLine)
    .filter((line) => line.length > 0)
}
