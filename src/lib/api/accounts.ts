import { db } from '../firebase'
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { generateFinnishIBAN } from '../iban'

export async function createAccount(ownerUid: string, type: string) {
  const iban = generateFinnishIBAN(ownerUid + type)
  const ref = await addDoc(collection(db, 'accounts'), {
    ownerUid,
    iban,
    type,
    currency: 'EUR',
    balance: 0,
    status: 'active',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function listAccounts(ownerUid: string) {
  const q = query(collection(db, 'accounts'), where('ownerUid', '==', ownerUid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
}
