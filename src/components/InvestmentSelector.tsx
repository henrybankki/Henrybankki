import type { AssetDef } from '../lib/api/investment_assets'

interface Props {
  assets: AssetDef[]
  value: string
  onChange: (symbol: string) => void
}
export default function InvestmentSelector({ assets, value, onChange }: Props) {
  return (
    <select
      className='w-full border p-2 rounded'
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {assets.map((a) => (
        <option key={a.symbol} value={a.symbol}>
          {a.name}
        </option>
      ))}
    </select>
  )
}
