import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { User } from '../types';

// Define the User type for firebase auth user object
interface AuthUser {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: User | null;
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
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function signup(name: string, email: string, phone: string, pass: string) {
    return auth.createUserWithEmailAndPassword(email, pass).then((cred: { user: { uid: any; }; }) => {
      return db.ref('users/' + cred.user.uid).set({
        name,
        email,
        phone,
        role: 'user',
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
    const unsubscribe = auth.onAuthStateChanged((user: AuthUser | null) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser) {
      const userRef = db.ref(`users/${currentUser.uid}`);
      const listener = userRef.on('value', (snapshot: any) => {
        setUserProfile(snapshot.val() ? { id: currentUser.uid, ...snapshot.val() } : null);
      });
      return () => userRef.off('value', listener);
    } else {
      setUserProfile(null);
    }
  }, [currentUser]);


  const value = {
    currentUser,
    userProfile,
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