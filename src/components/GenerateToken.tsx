import React, { useEffect, useState } from 'react';

export default function GenerateToken() {
  const [token, setToken] = useState<string | null>(null);

  function createToken() {
    const t = Math.random().toString(36).slice(2, 10).toUpperCase();
    setToken(t);
  }

  useEffect(() => {
    // Voisit lisätä tokenin synkronoinnin Firestoreen
  }, [token]);

  return (
    <div className="border p-4 rounded bg-white shadow space-y-3">
      <h3 className="font-semibold">Maksutoken (demo)</h3>
      <button
        onClick={createToken}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Luo token
      </button>
      {token && (
        <div className="text-sm break-all">
          <strong>Token:</strong> {token}
        </div>
      )}
    </div>
  );
}
