const nonGuessablePattern = /[\s\p{M}\p{P}\p{S}]/u

function splitNormalizedChars(input: string): string[] {
  return Array.from(input.normalize("NFKC").toLocaleLowerCase("zh-CN"))
}

export function normalizeGuessChar(char: string): string {
  return char.normalize("NFKC").toLocaleLowerCase("zh-CN")
}

export function isGuessableChar(char: string): boolean {
  return char.trim().length > 0 && !nonGuessablePattern.test(char)
}

export function splitGuessChars(input: string, alreadyGuessed: string[] = []): string[] {
  const seen = new Set(alreadyGuessed)
  const result: string[] = []

  for (const char of splitNormalizedChars(input)) {
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

  for (const char of splitNormalizedChars(text)) {
    if (isGuessableChar(char)) {
      chars.add(char)
    }
  }

  return chars
}
