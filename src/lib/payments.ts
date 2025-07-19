import { db } from './firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { verifyUserPin } from './api/auth';
import { getIdTokenResult } from 'firebase/auth';
import { auth } from '../lib/firebase';

async function checkAdmin() {
  const user = auth.currentUser;
  if (user) {
    const token = await getIdTokenResult(user);
    return token.claims.admin === true;
  }
  return false;
}



function generateTokenString() {
  // Lyhyt turvallinen koodi (demo) – tuotannossa esim. Crypto.randomUUID + lyhyt alias
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function generatePaymentToken(userId: string, cardId: string) {
  const tokenStr = generateTokenString();
  const ref = await addDoc(collection(db,'paymentTokens'), {
    userId,
    cardId,
    token: tokenStr,
    status: 'issued',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id: ref.id, token: tokenStr };
}

/** Admin “klikkaa” tai syöttää tokenin -> valitsee summan -> status pending_pin */
export async function adminClaimToken(tokenStr: string, amount: number) {
  if (amount <= 0) throw new Error('Virheellinen summa');
  // Etsi token brute force (demossa token unique)
  // Oikeasti käytä queryä:
  // query(collection(db,'paymentTokens'), where('token','==',tokenStr))
  // -> yksinkertaistetaan: admin syöttää dokumentti-ID:n sijaan tokenin -> tee haku
  // Tässä vain viite mitä tehtäisiin.
  throw new Error('Implementoi query: token -> docId');
}

/** Käyttäjä syöttää PIN: veloitus ja status completed */
export async function confirmPaymentWithPin(tokenDocId: string, userId: string, pin: string) {
  const ok = await verifyUserPin(userId, pin);
  if (!ok) throw new Error('Väärä PIN');

  await runTransaction(db, async (trx) => {
    const tRef = doc(db,'paymentTokens', tokenDocId);
    const snap = await trx.get(tRef);
    if (!snap.exists()) throw new Error('Token puuttuu');
    const data = snap.data() as any;
    if (data.userId !== userId) throw new Error('Token ei kuulu tälle käyttäjälle');
    if (data.status !== 'pending_pin') throw new Error('Token ei odota PINiä');

    // Lue käyttäjän saldo
    const uRef = doc(db,'users', userId);
    const uSnap = await trx.get(uRef);
    const uData = uSnap.data() as any;
    const balance = uData.balance ?? 0;
    const amount = data.amount;
    if (balance < amount) throw new Error('Saldo ei riitä');

    const newBalance = balance - amount;

    // Päivitä
    trx.update(uRef, { balance: newBalance });
    trx.update(tRef, {
      status: 'completed',
      updatedAt: serverTimestamp()
    });

    // Luo transaktio
    const txRef = doc(collection(db,'transactions'));
    trx.set(txRef, {
      userId,
      cardId: data.cardId,
      amount,
      direction: 'debit',
      tokenId: tRef.id,
      createdAt: serverTimestamp(),
      balanceAfter: newBalance,
    });
  });
}


