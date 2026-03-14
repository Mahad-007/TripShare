import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Capacitor } from '@capacitor/core';

const googleProvider = new GoogleAuthProvider();

export async function registerWithEmail(name: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await setDoc(doc(db, 'users', credential.user.uid), {
    name,
    email,
    createdAt: new Date().toISOString(),
  });
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    // Native Android/iOS: use Capacitor Google Auth plugin
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    await GoogleAuth.initialize({
      clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser.authentication.idToken;
    const firebaseCredential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, firebaseCredential);
    await setDoc(
      doc(db, 'users', result.user.uid),
      {
        name: result.user.displayName || '',
        email: result.user.email || '',
        avatar: result.user.photoURL || '',
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return result.user;
  } else {
    // Web: use popup as before
    const credential = await signInWithPopup(auth, googleProvider);
    await setDoc(
      doc(db, 'users', credential.user.uid),
      {
        name: credential.user.displayName || '',
        email: credential.user.email || '',
        avatar: credential.user.photoURL || '',
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return credential.user;
  }
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  if (Capacitor.isNativePlatform()) {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.signOut();
    } catch (_) {
      // Not signed in with Google, ignore
    }
  }
  await signOut(auth);
}

export async function updateUserProfile(
  updates: { displayName?: string; photoURL?: string }
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  await updateProfile(currentUser, updates);

  const firestoreUpdates: Record<string, string> = {};
  if (updates.displayName) firestoreUpdates.name = updates.displayName;
  if (updates.photoURL) firestoreUpdates.avatar = updates.photoURL;

  if (Object.keys(firestoreUpdates).length > 0) {
    await setDoc(doc(db, 'users', currentUser.uid), firestoreUpdates, { merge: true });
  }
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
