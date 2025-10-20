import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';

const Signup: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup, currentUser } = useAuth();
    const { navigate } = useNavigation();

    useEffect(() => {
        if (currentUser) {
            navigate('profile');
        }
    }, [currentUser, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await signup(name, email, phone, password);
            navigate('profile');
        } catch (err) {
            setError('Failed to create an account. The email might already be in use.');
            setLoading(false);
        }
    };

    return (
        <section className="py-32 bg-brand-bg">
            <div className="max-w-md mx-auto bg-brand-surface p-8 rounded-lg shadow-md mt-12">
                <h2 className="text-3xl font-serif font-bold text-center text-brand-text mb-6">Create Account</h2>
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-brand-secondary text-sm font-bold mb-2" htmlFor="name">
                            Full Name
                        </label>
                        <input
                            className="bg-brand-surface border border-brand-light-gray text-brand-text rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green"
                            id="name"
                            type="text"
                            placeholder="Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-brand-secondary text-sm font-bold mb-2" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            className="bg-brand-surface border border-brand-light-gray text-brand-text rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green"
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-brand-secondary text-sm font-bold mb-2" htmlFor="phone">
                            Phone Number
                        </label>
                        <input
                            className="bg-brand-surface border border-brand-light-gray text-brand-text rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green"
                            id="phone"
                            type="tel"
                            placeholder="123-456-7890"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-brand-secondary text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            className="bg-brand-surface border border-brand-light-gray text-brand-text rounded-md w-full py-2 px-3 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green"
                            id="password"
                            type="password"
                            placeholder="******************"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            disabled={loading}
                            className="w-full bg-brand-green hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transition-colors"
                            type="submit"
                        >
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center">
                    <p className="text-brand-secondary">
                        Already have an account?{' '}
                        <button onClick={() => navigate('login')} className="font-bold text-brand-green hover:underline">
                            Login
                        </button>
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Signup;