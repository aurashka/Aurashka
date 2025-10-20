import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { db } from '../firebase';
import { User } from '../types';

const Profile: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { navigate } = useNavigation();
    const [userData, setUserData] = useState<Omit<User, 'id'> | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!currentUser) {
            navigate('login');
            return;
        }

        const userRef = db.ref('users/' + currentUser.uid);
        const listener = userRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUserData(data);
            }
        });

        return () => userRef.off('value', listener);
    }, [currentUser, navigate]);

    const handleLogout = async () => {
        setError('');
        try {
            await logout();
            navigate('home');
        } catch {
            setError('Failed to log out');
        }
    };
    
    if (!userData) {
        return (
             <div className="py-40 text-center min-h-screen flex items-center justify-center bg-brand-bg text-brand-text">Loading profile...</div>
        )
    }

    return (
        <section className="py-32 bg-brand-bg min-h-screen">
            <div className="max-w-2xl mx-auto bg-brand-surface p-8 rounded-lg shadow-md mt-12">
                <h2 className="text-3xl font-serif font-bold text-center text-brand-text mb-8">My Profile</h2>
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
                
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-semibold text-brand-secondary">Full Name</p>
                        <p className="text-lg text-brand-text">{userData.name}</p>
                    </div>
                    <hr className="border-brand-light-gray"/>
                    <div>
                        <p className="text-sm font-semibold text-brand-secondary">Email Address</p>
                        <p className="text-lg text-brand-text">{userData.email}</p>
                    </div>
                    <hr className="border-brand-light-gray"/>
                    <div>
                        <p className="text-sm font-semibold text-brand-secondary">Phone Number</p>
                        <p className="text-lg text-brand-text">{userData.phone}</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full mt-8 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transition-colors"
                >
                    Logout
                </button>
            </div>
        </section>
    );
};

export default Profile;