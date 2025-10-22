import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useSiteSettings } from '../contexts/SettingsContext';
import { XIcon, GoogleIcon, AppleIcon, FacebookIcon } from '../components/Icons';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, userProfile, resetPassword, loginWithProvider } = useAuth();
  const { navigate } = useNavigation();
  const settings = useSiteSettings();
  const socialLoginSettings = settings.socialLogin;

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
  
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      setError('');
      setLoading(true);
      await loginWithProvider(provider);
      // Navigation is handled by useEffect
    } catch(err: any) {
      console.error(err);
      let message = 'Failed to log in with social provider.';
      if (err.code === 'auth/account-exists-with-different-credential') {
          message = 'An account already exists with the same email address. Sign in using the original method.'
      }
      setError(message);
    } finally {
        setLoading(false);
    }
  }

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
          {(socialLoginSettings?.google?.enabled || socialLoginSettings?.facebook?.enabled || socialLoginSettings?.apple?.enabled) && (
            <>
                <div className="mt-6 flex items-center">
                    <div className="flex-grow border-t border-brand-light-gray"></div>
                    <span className="flex-shrink mx-4 text-brand-secondary text-sm">OR</span>
                    <div className="flex-grow border-t border-brand-light-gray"></div>
                </div>
                <div className="mt-6 space-y-3">
                    {socialLoginSettings?.google?.enabled && (
                        <button
                            onClick={() => handleSocialLogin('google')}
                            disabled={loading}
                            className="w-full inline-flex justify-center items-center py-2 px-4 border border-brand-light-gray rounded-md shadow-sm bg-brand-surface text-sm font-medium text-brand-text hover:bg-brand-light-gray/50"
                        >
                            <GoogleIcon className="w-5 h-5 mr-2" />
                            Sign in with Google
                        </button>
                    )}
                    {socialLoginSettings?.facebook?.enabled && (
                        <button
                            onClick={() => handleSocialLogin('facebook')}
                            disabled={loading}
                            className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm bg-[#1877F2] text-sm font-medium text-white hover:bg-[#166fe5]"
                        >
                            <FacebookIcon className="w-5 h-5 mr-2" />
                            Sign in with Facebook
                        </button>
                    )}
                    {socialLoginSettings?.apple?.enabled && (
                        <button
                            onClick={() => handleSocialLogin('apple')}
                            disabled={loading}
                            className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm bg-black text-sm font-medium text-white hover:bg-gray-800"
                        >
                            <AppleIcon className="w-5 h-5 mr-2" />
                            Sign in with Apple
                        </button>
                    )}
                </div>
            </>
        )}
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