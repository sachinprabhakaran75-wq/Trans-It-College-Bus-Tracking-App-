import React, { useEffect, useState } from 'react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch: ' + res.statusText);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function doAction(uid, method) {
    try {
      const res = await fetch('/api/admin/users', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid }) });
      if (!res.ok) throw new Error('Action failed: ' + await res.text());
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <main style={{ padding: 20, background: '#071029', color: '#e6eef6', minHeight: '100vh' }}>
      <h1>Admin — Users</h1>
      <p>Use these buttons to revoke tokens or delete test users. Secure this page before production.</p>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'salmon' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <th>Email</th>
            <th>Role</th>
            <th>UID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td>{u.email}</td>
              <td>{(u.firestore && u.firestore.role) || (u.customClaims && u.customClaims.role) || 'n/a'}</td>
              <td style={{ wordBreak: 'break-all' }}>{u.uid}</td>
              <td>
                <button onClick={() => doAction(u.uid, 'POST')} style={{ marginRight: 8 }}>Revoke Tokens</button>
                <button onClick={() => { if (confirm('Delete user ' + u.email + '?')) doAction(u.uid, 'DELETE'); }} style={{ color: 'white', background: 'linear-gradient(90deg,#ef4444,#9a3412)', border: 'none', padding: '6px 10px', borderRadius: 6 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
