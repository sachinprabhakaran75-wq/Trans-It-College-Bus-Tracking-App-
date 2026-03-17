import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { initFirebase } from '../firebaseClient';
import { getAuth, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    initFirebase();
    const auth = getAuth();
    const db = getFirestore();
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/auth/signin');
        return;
      }
      const snap = await getDoc(doc(db, 'users', u.uid));
      setProfile({ uid: u.uid, email: u.email, ...(snap.data() || {}) });
      setEditingName(u.displayName || '');
    });
    return () => unsub();
  }, []);

  if (!profile) return <div style={{padding:20}}>Loading...</div>;

  async function handleSave() {
    try {
      const auth = getAuth();
      const db = getFirestore();
      await updateProfile(auth.currentUser, { displayName: editingName });
      await setDoc(doc(db, 'users', profile.uid), { displayName: editingName }, { merge: true });
      setProfile((p) => ({ ...p, displayName: editingName }));
      alert('Profile updated');
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
  }

  async function handleSignOut() {
    await signOut(getAuth());
    router.push('/auth/signin');
  }

  return (
    <main style={{ padding: 20, background: '#071029', minHeight: '100vh', color: '#e6eef6' }}>
      <h1>Profile</h1>
      <p>Email: {profile.email}</p>
      <p>Role: {profile.role}</p>
      <div style={{ marginTop: 12 }}>
        <input value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
        <button onClick={handleSave} style={{ marginLeft: 8, padding: '8px 12px' }}>Save</button>
      </div>
      <div style={{ marginTop: 20 }}>
        <button onClick={handleSignOut} style={{ padding: '8px 12px' }}>Sign out</button>
      </div>
    </main>
  );
}
