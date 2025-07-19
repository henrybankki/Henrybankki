import { auth, db } from '../firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export async function register(email: string, pw: string, name: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, pw)
  await updateProfile(cred.user, { displayName: name })
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    displayName: name,
    role: 'user',
    customerNumber: null,
    kycStatus: 'pending',
    createdAt: serverTimestamp(),
  })
  return cred.user
}


export function verifyUserPin(inputPin: string, userPin: string): boolean {
  return inputPin === userPin;
}



export async function login(email: string, pw: string) {
  const cred = await signInWithEmailAndPassword(auth, email, pw)
  return cred.user
}
