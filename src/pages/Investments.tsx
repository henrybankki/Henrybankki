import React, { useEffect, useState } from 'react';
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import InvestmentSelector from '../components/InvestmentSelector'
import InvestmentChart from '../components/InvestmentChart'
import { ALL_ASSETS } from '../lib/api/investment_assets'
import { fetchSeriesForAsset, type PricePoint } from '../lib/api/investments_data'

export default function Investments() {
  const { user } = useAuth()
  const [symbol, setSymbol] = useState(ALL_ASSETS[0].symbol)
  const [series, setSeries] = useState<PricePoint[]>([])
  const timerRef = useRef<number | null>(null)

  async function load() {
    const asset = ALL_ASSETS.find((a) => a.symbol === symbol)!
    try {
      const data = await fetchSeriesForAsset(asset)
      setSeries(data)
    } catch (err) {
      console.error('fetch error', err)
    }
  }

  useEffect(() => {
    load()
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(load, 5000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [symbol])

  if (!user) return null

  const asset = ALL_ASSETS.find((a) => a.symbol === symbol)!
  return (
    <div className='p-4 max-w-2xl mx-auto'>
      <h1 className='text-2xl font-bold mb-4'>Sijoitukset</h1>
      <InvestmentSelector assets={ALL_ASSETS} value={symbol} onChange={setSymbol} />
      <div className='mt-4 border rounded p-2 bg-white'>
        <InvestmentChart data={series} label={asset.name} />
      </div>
      <p className='mt-2 text-xs text-gray-500'>
        Data haetaan 5 s välein (CoinGecko / Yahoo Finance). Esimerkkikäyttöön.
      </p>
    </div>
  )
}
