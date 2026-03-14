import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Globe, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { useToast } from '../hooks/useToast';

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [defaultPublic, setDefaultPublic] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.id));
        if (snap.exists()) {
          const data = snap.data();
          setDefaultPublic(data.defaultPublic ?? false);
        }
      } catch {
        // Use defaults
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, [user]);

  const handleToggleVisibility = async () => {
    if (!user) return;
    setSaving(true);
    const newValue = !defaultPublic;
    try {
      await setDoc(doc(db, 'users', user.id), { defaultPublic: newValue }, { merge: true });
      setDefaultPublic(newValue);
    } catch {
      showToast('Failed to update privacy setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth.currentUser) return;
    setDeleting(true);
    setDeleteError('');

    try {
      // Re-authenticate if password provided (email/password users)
      if (deletePassword) {
        const credential = EmailAuthProvider.credential(user.email, deletePassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // Delete Firestore user doc first (while still authenticated)
      await deleteDoc(doc(db, 'users', user.id));

      // Delete Firebase Auth account
      await deleteUser(auth.currentUser);

      navigate('/login');
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/requires-recent-login' || code === 'auth/wrong-password') {
        setDeleteError('Please enter your password to confirm account deletion.');
      } else if (code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please try again.');
      } else {
        setDeleteError('Failed to delete account. Please try again.');
      }
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center border-b border-slate-200">
        <button onClick={() => navigate('/profile')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h2 className="ml-2 font-bold text-lg">Settings</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Privacy Section */}
        <section className="space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-2">Privacy</h3>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              onClick={handleToggleVisibility}
              disabled={loadingSettings || saving}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2.5 rounded-xl ${defaultPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {defaultPublic ? <Globe size={20} /> : <Lock size={20} />}
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-700 block">Default Trip Visibility</span>
                  <span className="text-xs text-slate-400">
                    {loadingSettings ? 'Loading...' : defaultPublic ? 'Public — visible on Explore' : 'Private — invite only'}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${defaultPublic ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${defaultPublic ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4">
          <h3 className="text-xs font-extrabold text-rose-400 uppercase tracking-widest px-2">Danger Zone</h3>
          <div className="bg-white rounded-3xl shadow-sm border border-rose-100 overflow-hidden">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors"
              aria-label="Delete account"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl">
                  <Trash2 size={20} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-rose-700 block">Delete Account</span>
                  <span className="text-xs text-slate-400">Permanently remove your account and data</span>
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Delete Account?</h3>
            <p className="text-slate-500 text-sm">
              This action is permanent and cannot be undone. All your data will be deleted.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
              placeholder="Enter your password to confirm"
              className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 text-sm"
            />
            {deleteError && <p className="text-rose-500 text-xs font-medium">{deleteError}</p>}
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
