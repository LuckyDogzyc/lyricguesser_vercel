const punctuationPattern = /[\s\p{P}\p{S}]/u

export function normalizeGuessChar(char: string): string {
  return char.normalize("NFKC").toLocaleLowerCase("zh-CN")
}

export function isGuessableChar(char: string): boolean {
  return char.trim().length > 0 && !punctuationPattern.test(char)
}

export function splitGuessChars(input: string, alreadyGuessed: string[] = []): string[] {
  const seen = new Set(alreadyGuessed)
  const result: string[] = []

  for (const rawChar of Array.from(input)) {
    const char = normalizeGuessChar(rawChar)
    if (!isGuessableChar(char) || seen.has(char)) {
      continue
    }

    seen.add(char)
    result.push(char)
  }

  return result
}

export function textToGuessableSet(text: string): Set<string> {
  const chars = new Set<string>()

  for (const rawChar of Array.from(text)) {
    const char = normalizeGuessChar(rawChar)
    if (isGuessableChar(char)) {
      chars.add(char)
    }
  }

  return chars
}
