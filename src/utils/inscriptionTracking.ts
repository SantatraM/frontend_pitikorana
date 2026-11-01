export function normalizeTrackingCode(value: string): string | null {
  const code = value.trim().toUpperCase()
  const short = code.match(/^([A-HJ-NP-Z]{3})-?([2-9]{5})$/)
  if (short) return `${short[1]}-${short[2]}`
  return /^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}$/.test(code) ? code : null
}
