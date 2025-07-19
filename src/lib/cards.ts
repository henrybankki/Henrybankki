import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';

function randomDigits(n: number) {
  let s = '';
  for (let i=0;i<n;i++) s += Math.floor(Math.random()*10);
  return s;
}

export async function createVirtualCard(userId: string) {
  // “PAN” vain demoon
  const pan = randomDigits(16);
  const last4 = pan.slice(-4);
  const cardRef = await addDoc(collection(db, 'cards'), {
    userId,
    type: 'virtual',
    panMasked: `**** **** **** ${last4}`,
    last4,
    active: true,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db,'users',userId), {
    cards: arrayUnion(cardRef.id)
  });

  return cardRef.id;
}
