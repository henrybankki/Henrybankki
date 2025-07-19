/**
 * Generate Finnish reference number with checksum (7-3-1 weighting).
 */
export function generateFinnishReference(base: string): string {
  const clean = base.replace(/\D/g, '')
  const weights = [7, 3, 1]
  let sum = 0
  for (let i = clean.length - 1, w = 0; i >= 0; i--, w++) {
    const digit = Number(clean[i])
    sum += digit * weights[w % 3]
  }
  const checksum = (10 - (sum % 10)) % 10
  return clean + String(checksum)
}

export function validateFinnishReference(ref: string): boolean {
  const clean = ref.replace(/\D/g, '')
  if (clean.length < 2) return false
  const base = clean.slice(0, -1)
  return generateFinnishReference(base) === clean
}
