import React from 'react';
import { useRouter } from 'next/router';
import { AuthForm } from '@transit/ui';
import { initFirebase } from '../../firebaseClient';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

export default function SignUp() {
  const router = useRouter();
  initFirebase();

  async function handleSubmit({ displayName, email, password }) {
    try {
      const auth = getAuth();
      const db = getFirestore();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName,
        email,
        role: 'student',
        createdAt: Date.now(),
      });
      router.push('/profile');
    } catch (err) {
      alert('Signup error: ' + err.message);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#071029', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#e6eef6' }}>
        <h2>Student Sign Up</h2>
        <AuthForm onSubmit={handleSubmit} submitLabel="Create account" showDisplayName={true} />
      </div>
    </div>
  );
}
