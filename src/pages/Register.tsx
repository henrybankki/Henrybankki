import React, { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || isNaN(Number(pin))) {
      setError('PIN-koodin tulee olla 4 numeroa.');
      return;
    }

    try {
      const email = `${username}@henrybankki.fi`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Päivitetään käyttäjän profiili
      await updateProfile(userCredential.user, { displayName: username });

      // Tallennetaan käyttäjätiedot Firestoreen
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: username,
        email: email,
        balance: 0,
        pin: pin
      });

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Rekisteröinti epäonnistui. Valitse toinen käyttäjätunnus.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleRegister} className="bg-white p-6 rounded shadow w-96">
        <h1 className="text-2xl font-bold mb-4">Luo uusi käyttäjä</h1>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        
        <input
          type="text"
          placeholder="Käyttäjätunnus (ilman @)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        <input
          type="password"
          placeholder="Salasana"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        <input
          type="text"
          placeholder="PIN-koodi (4 numeroa)"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="border p-2 w-full mb-4"
          maxLength={4}
        />

        <button type="submit" className="bg-green-500 text-white p-2 w-full rounded">
          Rekisteröidy
        </button>
      </form>
    </div>
  );
}
