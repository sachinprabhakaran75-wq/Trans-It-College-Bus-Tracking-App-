import React from 'react';
import { useRouter } from 'next/router';
import { AuthPortal, AnimatedBackground } from '@transit/ui';
import { initFirebase } from '../../firebaseClient';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

export default function SignIn() {
  const router = useRouter();
  initFirebase();

  async function handleAuth({ type, email, password, displayName }) {
    const auth = getAuth();
    const db = getFirestore();

    try {
      if (type === 'google') {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        // Create user doc if not exists (merge: true handles existing silently)
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName: cred.user.displayName,
          email: cred.user.email,
          role: 'driver',
          lastLogin: Date.now(),
        }, { merge: true });
      } else if (type === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName,
          email,
          role: 'driver',
          createdAt: Date.now(),
        });
      }
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        // Ignored: User closed popup or previous request cancelled
        return;
      }
      alert('Authentication error: ' + err.message);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <AnimatedBackground />
      <AuthPortal
        onAuth={handleAuth}
        appName="driver"
        driverUrl="/auth/signin"
        studentUrl="http://localhost:3001/auth/signin"
        showAppSwitcher={false}
      />
    </div>
  );
}
