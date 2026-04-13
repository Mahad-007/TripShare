import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { getFirebaseErrorMessage } from '../utils/firebaseErrors';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full px-8 py-12">
      <Link to="/login" className="flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-8">
        <ArrowLeft size={20} className="mr-2" />
        <span className="font-medium">Back to Sign In</span>
      </Link>

      <div className="mb-8">
        <Logo size={44} className="mb-4" />
        <h1 className="text-3xl font-extrabold text-slate-900">Reset Password</h1>
        <p className="text-slate-500 mt-2 font-medium">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start space-x-4">
          <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <p className="font-bold text-emerald-800">Check your inbox</p>
            <p className="text-emerald-700 text-sm mt-1">
              We've sent a password reset link to <strong>{email}</strong>. It may take a few minutes to arrive.
            </p>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100 hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
