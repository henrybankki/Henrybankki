import React, { useEffect, useState } from 'react';
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listenBillsForUser, payBill } from '../lib/api/bills'

export default function Bills() {
  const { user } = useAuth()
  const [bills, setBills] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    const unsub = listenBillsForUser(user.uid, setBills)
    return unsub
  }, [user])

  if (!user) return null

  return (
    <div className='p-4 max-w-xl mx-auto'>
      <h1 className='text-2xl font-bold mb-6'>Laskut</h1>
      {bills.length === 0 && <p>Ei laskuja.</p>}

      <ul className='space-y-3'>
        {bills.map((b) => (
          <li
            key={b.id}
            className='border rounded p-3 flex items-center justify-between'
          >
            <div>
              <p className='font-semibold'>{b.message || 'Lasku'}</p>
              <p className='text-sm'>Summa: €{b.amount}</p>
              <p className='text-sm'>Viite: {b.referenceNumber}</p>
              <p className='text-sm'>Eräpäivä: {b.dueDate}</p>
              <p className='text-sm'>Tila: {b.status}</p>
            </div>
            {b.status === 'unpaid' && (
              <button
                onClick={() => payBill(b.id)}
                className='bg-green-600 text-white px-3 py-1 rounded'
              >
                Maksa
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
