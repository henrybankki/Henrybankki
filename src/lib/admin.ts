import { db } from './firebase';
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';

export async function adminAddBalance(userId: string, amount: number) {
  if (amount <= 0) throw new Error('Summa oltava > 0');
  await runTransaction(db, async (trx) => {
    const ref = doc(db,'users', userId);
    const snap = await trx.get(ref);
    if (!snap.exists()) throw new Error('Käyttäjää ei ole');
    const cur = snap.data().balance ?? 0;
    trx.update(ref, { balance: cur + amount });
  });
}
