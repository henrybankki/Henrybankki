// NOT PRODUCTION SAFE - simple FI IBAN mock generator for demo
export function generateFinnishIBAN(seed: string): string {
  const digits = (Date.now().toString() + seed).replace(/\D/g, '').slice(-14)
  return 'FI00' + digits.padStart(14, '0')
}
