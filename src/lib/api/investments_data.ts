import axios from 'axios'
import type { AssetDef } from './investment_assets'

export interface PricePoint {
  t: number
  p: number
}

// Yahoo Finance
async function fetchYahooSeries(symbol: string, range: string = '1d', interval: string = '1m'): Promise<PricePoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`
  const resp = await axios.get(url)
  const result = resp.data?.chart?.result?.[0]
  if (!result) return []
  const timestamps = result.timestamp || []
  const closes = result.indicators?.quote?.[0]?.close || []
  const out: PricePoint[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i] * 1000
    const p = closes[i]
    if (p != null) out.push({ t, p })
  }
  return out
}

// CoinGecko
async function fetchCoinGeckoSeries(id: string, days: number = 1): Promise<PricePoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=eur&days=${days}`
  const resp = await axios.get(url)
  const prices: [number, number][] = resp.data?.prices || []
  return prices.map(([t, p]) => ({ t, p }))
}

export async function fetchSeriesForAsset(asset: AssetDef): Promise<PricePoint[]> {
  if (asset.type === 'crypto') return fetchCoinGeckoSeries(asset.symbol, 1)
  return fetchYahooSeries(asset.symbol, '1d', '1m')
}
