"use client";

import { createContext, useContext } from 'react';

interface User {
  name?: string;
  id_usuario?: string;
  [key: string]: any;
}

interface UserContextType {
  user: User | null;
}

const UserContext = createContext<UserContextType>({ user: null });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  let user: User | null = null;

  if (typeof window !== 'undefined') {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch (e) {
        user = null;
      }
    }
  }

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe ser usado dentro de UserProvider');
  }
  return context;
};
