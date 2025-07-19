import React, { createContext, useContext, useState } from 'react';
import bcrypt from 'bcryptjs';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const register = async (email, pin) => {
    const hashedPin = await bcrypt.hash(pin, 10);
    console.log('Registered:', email, hashedPin);
    setUser({ email });
  };
  const login = async (email, pin) => {
    console.log('Login attempt', email);
    setUser({ email });
  };
  return (
    <AuthContext.Provider value={{ user, register, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);