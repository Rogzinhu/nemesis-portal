import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import * as Icons from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDhATgpXHx05KdkxKvvdyoCGLem8875_4k",
  authDomain: "nemesis-portal.firebaseapp.com",
  projectId: "nemesis-portal",
  storageBucket: "nemesis-portal.firebasestorage.app",
  messagingSenderId: "866418817027",
  appId: "1:866418817027:web:87a7fc61ad596ca9d27636",
  measurementId: "G-BXC92BNY27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth);
      setUser(u);
    });
  }, []);

  return (
    <div style={{ 
      backgroundColor: '#000', 
      color: '#fbbf24', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'sans-serif' 
    }}>
      <Icons.Shield size={64} style={{ marginBottom: '20px' }} />
      <h1 style={{ fontSize: '3rem', margin: 0 }}>NÊMESIS 2</h1>
      <p style={{ color: '#666', letterSpacing: '0.5em' }}>SISTEMA OPERACIONAL ATIVO</p>
      {user ? (
        <p style={{ marginTop: '20px', color: '#22c55e' }}>● CONEXÃO ESTABELECIDA</p>
      ) : (
        <p style={{ marginTop: '20px', color: '#ef4444' }}>○ SINCRONIZANDO ARCA...</p>
      )}
    </div>
  );
}
