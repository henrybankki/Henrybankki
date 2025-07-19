import React, { useEffect, useState } from 'react';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { auth, db } from '../lib/firebase'
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { AppUser } from '../types'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
})

async function ensureUserProfile(fbUser: FirebaseUser) {
  const ref = doc(db, 'users', fbUser.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      email: fbUser.email ?? null,
      displayName: fbUser.displayName ?? fbUser.email ?? '',
      customerNumber: null,
      role: 'user',
      kycStatus: 'pending',
      createdAt: serverTimestamp(),
    })
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setLoading(false)
        return
      }
      await ensureUserProfile(fbUser)
      const ref = doc(db, 'users', fbUser.uid)
      const snap = await getDoc(ref)
      const data = snap.data()
      setUser({
        uid: fbUser.uid,
        email: fbUser.email ?? null,
        displayName: data?.displayName ?? fbUser.email ?? '',
        customerNumber: data?.customerNumber ?? null,
        role: data?.role ?? 'user',
        kycStatus: data?.kycStatus ?? 'pending',
      })
      setLoading(false)
    })
  }, [])

  async function logout() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
