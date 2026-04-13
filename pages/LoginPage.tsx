
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { getFirebaseErrorMessage } from '../utils/firebaseErrors';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="flex-1 flex flex-col justify-center px-8 relative z-10">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5">
            <Logo size={72} className="justify-center" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">TripShare</h1>
          <p className="text-slate-500 mt-3 font-medium">Plan together. Travel smarter.</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-medium mb-4">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-white border border-slate-200 py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
              />
            </div>
          </div>

          <Link to="/forgot-password" className="text-teal-600 text-sm font-bold block ml-auto hover:underline text-right">
            Forgot Password?
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-teal-100 hover:bg-teal-700 active:scale-[0.98] transition-all mt-6 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            ) : (
              <>
                <span>Sign In</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-4 text-slate-400 text-sm font-medium">or</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="mt-12 text-center">
          <p className="text-slate-500 font-medium">
            New to TripShare?{' '}
            <Link to="/register" className="text-teal-600 font-bold hover:underline">
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
