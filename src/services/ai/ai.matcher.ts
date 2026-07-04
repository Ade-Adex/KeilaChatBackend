// /src/services/ai/ai.matcher.ts

export function similarity(a: string, b: string) {
  const shorter = a.length < b.length ? a : b

  const longer = a.length >= b.length ? a : b

  let matches = 0

  for (const c of shorter) {
    if (longer.includes(c)) matches++
  }

  return matches / longer.length
}

export function fuzzyMatch(input: string, patterns: string[]) {
  return patterns.some(
    (pattern) =>
      input === pattern ||
      input.includes(pattern) ||
      pattern.includes(input) ||
      similarity(input, pattern) > 0.75,
  )
}
