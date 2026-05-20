const nonGuessablePattern = /[\s\p{M}\p{P}\p{S}]/u
const latinWordCharPattern = /^[a-z0-9]$/i

export type TextGuessUnit = {
  text: string
  normalized: string
  isGuessable: boolean
}

function splitDisplayChars(input: string): string[] {
  return Array.from(input.normalize("NFKC"))
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

  for (const unit of splitTextGuessUnits(input)) {
    if (!unit.isGuessable || seen.has(unit.normalized)) {
      continue
    }

    seen.add(unit.normalized)
    result.push(unit.normalized)
  }

  return result
}

export function textToGuessableSet(text: string): Set<string> {
  const chars = new Set<string>()

  for (const unit of splitTextGuessUnits(text)) {
    if (unit.isGuessable) {
      chars.add(unit.normalized)
    }
  }

  return chars
}

export function splitTextGuessUnits(text: string): TextGuessUnit[] {
  const displayChars = splitDisplayChars(text)
  const units: TextGuessUnit[] = []
  let currentLatinWord = ""
  let currentNormalizedLatinWord = ""

  function flushLatinWord() {
    if (currentLatinWord.length === 0) {
      return
    }

    units.push({
      text: currentLatinWord,
      normalized: currentNormalizedLatinWord,
      isGuessable: true,
    })
    currentLatinWord = ""
    currentNormalizedLatinWord = ""
  }

  for (const char of displayChars) {
    const normalized = normalizeGuessChar(char)
    if (latinWordCharPattern.test(normalized)) {
      currentLatinWord += char
      currentNormalizedLatinWord += normalized
      continue
    }

    flushLatinWord()
    units.push({
      text: char,
      normalized,
      isGuessable: isGuessableChar(normalized),
    })
  }

  flushLatinWord()
  return units
}
