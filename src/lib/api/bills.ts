import { db } from '../firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { generateFinnishReference } from '../referenceNumber'

export function listenBillsForUser(uid: string, cb: (arr: any[]) => void) {
  const q = query(collection(db, 'bills'), where('issuedToUid', '==', uid))
  return onSnapshot(q, (snap) => {
    const arr: any[] = []
    snap.forEach((d) => arr.push({ id: d.id, ...d.data() }))
    cb(arr)
  })
}

export async function payBill(billId: string) {
  const ref = doc(db, 'bills', billId)
  await updateDoc(ref, {
    status: 'paid',
    paidAt: serverTimestamp(),
  })
}

export async function adminCreateBill(
  issuedByUid: string,
  issuedToUid: string,
  amount: number,
  dueDate: string,
  message: string,
) {
  const base = Date.now().toString().slice(-7)
  const refNum = generateFinnishReference(base)
  const ref = await addDoc(collection(db, 'bills'), {
    issuedByUid,
    issuedToUid,
    amount,
    dueDate,
    message,
    referenceNumber: refNum,
    status: 'unpaid',
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, referenceNumber: refNum }
}
