import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const assets = [
  // 25 suomal. + 15 krypto (yht. 40)
  'Neste','Fortum','Kone','Nokia','Outokumpu',
  'UPM','Stora Enso','Elisa','Sampo','Kesko',
  'Orion','Valmet','Metso','Fiskars','Caverion',
  'Olvi','YIT','Ponsse','SRV','Tokmanni',
  'Wärtsilä','Verkkokauppa.com','Sanoma','Harvia','F-Secure',
  'Bitcoin','Ethereum','Ripple','Cardano','Polkadot',
  'Litecoin','Solana','Avalanche','Dogecoin','Shiba Inu',
  'Polygon','Stellar','Chainlink','Aave','Uniswap'
];

interface HistoryPoint {
  t: string;
  v: number;
}

function generateHistory(): HistoryPoint[] {
  const arr: HistoryPoint[] = [];
  let base = 100 + Math.random() * 20;
  for (let i = 29; i >= 0; i--) {
    base += (Math.random() - 0.5) * 3;
    arr.push({
      t: `P${30 - i}`,
      v: parseFloat(base.toFixed(2))
    });
  }
  return arr;
}

export default function InvestmentChart() {
  const [selected, setSelected] = useState(assets[0]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    setHistory(generateHistory());
  }, [selected]);

  const chartData = {
    labels: history.map(h => h.t),
    datasets: [
      {
        label: selected,
        data: history.map(h => h.v),
        borderColor: 'rgba(34,197,94,1)',
        backgroundColor: 'rgba(34,197,94,0.15)',
        tension: 0.3,
        pointRadius: 0,
        fill: true
      }
    ]
  };

  const options = {
    responsive: true,
    scales: {
      x: { display: true },
      y: { display: true }
    },
    plugins: {
      legend: { display: true },
      tooltip: { mode: 'index' as const, intersect: false }
    },
    interaction: { mode: 'nearest' as const, intersect: false }
  };

  return (
    <div className="border rounded p-4 bg-white shadow space-y-4">
      <div>
        <label className="text-sm font-semibold block mb-1">
          Valitse kohde
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="border p-2 rounded w-full"
        >
          {assets.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <Line data={chartData} options={options} />
    </div>
  );
}
