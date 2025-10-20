import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { useNavigation } from './NavigationContext';

// Define the User type for firebase auth user object
interface AuthUser {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  signup: (name: string, email: string, phone: string, pass: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { navigate } = useNavigation();

  function signup(name: string, email: string, phone: string, pass: string) {
    return auth.createUserWithEmailAndPassword(email, pass).then(cred => {
      return db.ref('users/' + cred.user.uid).set({
        name,
        email,
        phone
      });
    });
  }

  function login(email: string, pass: string) {
    return auth.signInWithEmailAndPassword(email, pass);
  }

  function logout() {
    return auth.signOut();
  }

  function resetPassword(email: string) {
    return auth.sendPasswordResetEmail(email);
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};