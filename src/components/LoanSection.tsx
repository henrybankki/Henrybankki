import React, { useEffect, useState } from 'react';

export default function LoanSection() {
  const maxLoan = 30;
  const step = 10;
  const [currentLoan, setCurrentLoan] = useState(0);
  const [msg, setMsg] = useState('');

  function takeLoan() {
    if (currentLoan + step > maxLoan) {
      setMsg(`Et voi ylittää ${maxLoan} € lainakattoa.`);
      return;
    }
    const newLoan = currentLoan + step;
    setCurrentLoan(newLoan);
    setMsg(`Lainasaldo nyt ${newLoan} €`);
  }

  function repayAll() {
    setCurrentLoan(0);
    setMsg('Laina maksettu pois (demo).');
  }

  return (
    <div className="border rounded p-4 space-y-3 bg-white shadow">
      <p><strong>Laina käytetty:</strong> {currentLoan} € / {maxLoan} €</p>
      <div className="flex gap-2">
        <button
          onClick={takeLoan}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={currentLoan >= maxLoan}
        >
          Lainaa {step} €
        </button>
        <button
          onClick={repayAll}
          className="bg-gray-600 text-white px-4 py-2 rounded"
        >
          Maksa pois
        </button>
      </div>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  );
}
