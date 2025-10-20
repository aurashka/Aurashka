import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { XIcon } from '../components/Icons';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, userProfile, resetPassword } = useAuth();
  const { navigate } = useNavigation();

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'admin') {
        navigate('admin');
      } else {
        navigate('profile');
      }
    }
  }, [userProfile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // Navigation is now handled by the useEffect hook
    } catch {
      setError('Failed to log in. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        setResetMessage('');
        setResetError('');
        setResetLoading(true);
        await resetPassword(resetEmail);
        setResetMessage('Check your email for further instructions.');
    } catch {
        setResetError('Failed to reset password. Please check the email address.');
    }
    setResetLoading(false);
  };


  return (
    <>
      <section className="py-32 bg-brand-bg">
        <div className="max-w-md mx-auto bg-brand-surface p-8 rounded-lg shadow-md mt-12">
          <h2 className="text-3xl font-serif font-bold text-center text-brand-text mb-6">Login</h2>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
          <form onSubmit={handleSubmit}>
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
              <label className="block text-brand-secondary text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                className="bg-brand-surface border border-brand-light-gray text-brand-text rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green"
                id="password"
                type="password"
                placeholder="******************"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-end mb-6">
                <button
                    type="button"
                    onClick={() => {
                        setShowResetModal(true);
                        setResetError('');
                        setResetMessage('');
                        setResetEmail('');
                    }}
                    className="text-sm font-medium text-brand-green hover:underline"
                >
                    Forgot Password?
                </button>
            </div>
            <div className="flex items-center justify-between">
              <button
                disabled={loading}
                className="w-full bg-brand-green hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transition-colors"
                type="submit"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-brand-secondary">
              Don't have an account?{' '}
              <button onClick={() => navigate('signup')} className="font-bold text-brand-green hover:underline">
                Sign up
              </button>
            </p>
          </div>
        </div>
      </section>

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-brand-surface p-8 rounded-lg shadow-xl w-full max-w-md relative animate-fade-in-up">
            <button onClick={() => setShowResetModal(false)} className="absolute top-4 right-4 text-brand-secondary hover:text-brand-text">
                <XIcon className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold text-center text-brand-text mb-6">Reset Password</h3>
            {resetMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{resetMessage}</div>}
            {resetError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{resetError}</div>}
            <form onSubmit={handleResetPassword}>
                <p className="text-brand-secondary mb-4 text-center">Enter your email and we'll send a link to reset your password.</p>
                <div className="mb-4">
                    <label className="block text-brand-secondary text-sm font-bold mb-2" htmlFor="reset-email">
                        Email Address
                    </label>
                    <input
                        className="bg-brand-surface border border-brand-light-gray text-brand-text rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green"
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="flex items-center justify-between">
                    <button
                        disabled={resetLoading}
                        className="w-full bg-brand-green hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline transition-colors"
                        type="submit"
                    >
                        {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;