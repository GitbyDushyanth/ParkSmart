import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/services.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync session with server on initial load
  useEffect(() => {
    const token = localStorage.getItem('ps_token');
    const storedUser = localStorage.getItem('ps_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('ps_token');
        localStorage.removeItem('ps_user');
      }

      // Verify token with backend to ensure user still exists and role is fresh
      authAPI.me()
        .then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('ps_user', JSON.stringify(res.data.user));
          }
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            localStorage.removeItem('ps_token');
            localStorage.removeItem('ps_user');
            setUser(null);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('ps_token', token);
    localStorage.setItem('ps_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ps_token');
    localStorage.removeItem('ps_user');
    setUser(null);
  };

  const updateUser = useCallback((updatedUserData, newToken) => {
    if (newToken) {
      localStorage.setItem('ps_token', newToken);
    }
    localStorage.setItem('ps_user', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await authAPI.me();
      if (res.data?.user) {
        updateUser(res.data.user);
        return res.data;
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
      throw err;
    }
  }, [updateUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        refreshProfile,
        loading,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

