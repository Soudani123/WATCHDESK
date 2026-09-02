import React, { useState, useEffect } from 'react';
import './App.css';
import WatchDeskDashboard from './components/WatchDeskDashboard';
import Login from './components/Login';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { clearSession, saveSession } from './lib/api';
import { applyTheme, readStoredTheme } from './lib/theme';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function App() {
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('watchdesk_user');
    if (!saved) return null;

    try {
      const parsedUser = JSON.parse(saved);
      
      // Vérification de l'expiration du token JWT si présent
      if (parsedUser?.token) {
        const payload = JSON.parse(atob(parsedUser.token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        
        if (isExpired) {
          clearSession();
          return null;
        }
      }
      return parsedUser;
    } catch (e) {
      clearSession();
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    saveSession(userData);
    setUser(userData);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div>
        {!user ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          <WatchDeskDashboard user={user} onLogout={handleLogout} />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
