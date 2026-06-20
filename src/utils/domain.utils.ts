// /src/utils/domain.utils.ts
export const normalizeDomain = (url: string | undefined): string | null => {
  if (!url) return null
  try {
    // Add protocol if missing to ensure URL constructor works
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    const hostname = new URL(fullUrl).hostname
    // Remove 'www.' if present
    return hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
