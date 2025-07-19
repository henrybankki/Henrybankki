import React, { useEffect, useState } from 'react';

export default function SetPin() {
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');

  function savePin() {
    if (!/^\d{4}$/.test(pin)) {
      setMsg('PIN täytyy olla 4 numeroa.');
      return;
    }
    // Tallennus Firestoreen lisättävissä myöhemmin
    setMsg('PIN tallennettu (demo).');
    setPin('');
  }

  return (
    <div className="border p-4 rounded bg-white shadow space-y-3">
      <h3 className="font-semibold">Aseta PIN</h3>
      <input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="4-num PIN"
        className="border p-2 rounded w-full"
        maxLength={4}
      />
      <button
        onClick={savePin}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        disabled={pin.length !== 4}
      >
        Tallenna
      </button>
      {msg && <p className="text-xs text-gray-600">{msg}</p>}
    </div>
  );
}
