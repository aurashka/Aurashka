import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { User } from '../types';

// Define the User type for firebase auth user object
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: User | null;
  loading: boolean;
  signup: (name: string, email: string, phone: string, pass: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithProvider: (providerName: 'google' | 'facebook' | 'apple') => Promise<any>;
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

  // Function to create or update user profile in DB after social login
  const updateUserProfile = (user: AuthUser) => {
    const userRef = db.ref(`users/${user.uid}`);
    return userRef.once('value').then(snapshot => {
      if (!snapshot.exists()) {
        // User is new, create a profile
        return userRef.set({
          name: user.displayName || 'New User',
          email: user.email,
          phone: '', // Phone number not provided by social logins
          role: 'user',
        });
      }
    });
  };

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
  
  function loginWithProvider(providerName: 'google' | 'facebook' | 'apple') {
    let provider;
    switch(providerName) {
      case 'google':
        provider = new window.firebase.auth.GoogleAuthProvider();
        break;
      case 'facebook':
        provider = new window.firebase.auth.FacebookAuthProvider();
        break;
      case 'apple':
        provider = new window.firebase.auth.OAuthProvider('apple.com');
        break;
      default:
        return Promise.reject('Invalid provider');
    }
    
    return auth.signInWithPopup(provider).then((result: { user: AuthUser; }) => {
        if (result.user) {
          return updateUserProfile(result.user);
        }
    });
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
    loginWithProvider,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};