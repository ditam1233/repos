import { createContext, useContext, useState, useEffect } from 'react';
import { getUser } from '../utils/storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('moments_current');
    if (id) {
      getUser(id).then(u => { setUser(u); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (u) => {
    localStorage.setItem('moments_current', u.id);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('moments_current');
    setUser(null);
  };

  const refresh = async () => {
    const id = localStorage.getItem('moments_current');
    if (id) setUser(await getUser(id));
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />;

  return (
    <AuthContext.Provider value={{ user, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
