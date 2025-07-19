export interface AssetDef {
  symbol: string  // e.g. 'NOKIA.HE' or 'bitcoin'
  name: string
  type: 'stock' | 'crypto'
  exchange?: string
  currency?: string
}

// 25 Finnish tickers (approx; some may not resolve in Yahoo if delisted; demo use)
export const FINNISH_STOCKS: AssetDef[] = [
  { symbol: 'NOKIA.HE', name: 'Nokia', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'KNEBV.HE', name: 'Kone', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'NESTE.HE', name: 'Neste', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'UPM.HE', name: 'UPM-Kymmene', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'OUT1V.HE', name: 'Outokumpu', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'SAMP0.HE', name: 'Sampo', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'FORTUM.HE', name: 'Fortum', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'TIETO.HE', name: 'Tietoevry', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'ELISA.HE', name: 'Elisa', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'KESKOB.HE', name: 'Kesko B', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'METSB.HE', name: 'Metsä Board B', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'WRT1V.HE', name: 'Wärtsilä', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'ORNBV.HE', name: 'Orion B', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'HKSCAN.HE', name: 'HKScan', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'KCR.HE', name: 'Konecranes', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'CITYCON.HE', name: 'Citycon', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'CGCBV.HE', name: 'Cargotec', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'PON1V.HE', name: 'Ponsse', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'SSH1V.HE', name: 'SSH Communications', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'ASPO.HE', name: 'Aspo', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'RAUTE.HE', name: 'Raute', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'UPONOR.HE', name: 'Uponor', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'VALMT.HE', name: 'Valmet', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: 'KEMIRA.HE', name: 'Kemira', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
  { symbol: '^OMXH25', name: 'OMX Helsinki 25 Index', type: 'stock', exchange: 'Helsinki', currency: 'EUR' },
]

// 10 cryptos (CoinGecko ids)
export const CRYPTOS: AssetDef[] = [
  { symbol: 'bitcoin', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ethereum', name: 'Ethereum', type: 'crypto' },
  { symbol: 'tether', name: 'Tether', type: 'crypto' },
  { symbol: 'binancecoin', name: 'BNB', type: 'crypto' },
  { symbol: 'solana', name: 'Solana', type: 'crypto' },
  { symbol: 'ripple', name: 'XRP', type: 'crypto' },
  { symbol: 'cardano', name: 'Cardano', type: 'crypto' },
  { symbol: 'dogecoin', name: 'Dogecoin', type: 'crypto' },
  { symbol: 'tron', name: 'TRON', type: 'crypto' },
  { symbol: 'litecoin', name: 'Litecoin', type: 'crypto' },
]

export const ALL_ASSETS = [...FINNISH_STOCKS, ...CRYPTOS]
