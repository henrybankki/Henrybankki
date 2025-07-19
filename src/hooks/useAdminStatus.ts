import React, { useEffect, useState } from 'react';
import { useState, useEffect } from 'react';
import { getIdTokenResult } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const token = await getIdTokenResult(user);
        if (!cancelled) setIsAdmin(!!token.claims.admin);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return isAdmin;
}
