import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'

export async function listAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  const arr: any[] = []
  snap.forEach((d) => arr.push({ uid: d.id, ...d.data() }))
  return arr
}
