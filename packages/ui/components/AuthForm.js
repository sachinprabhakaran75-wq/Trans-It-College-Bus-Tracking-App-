import React, { useState } from 'react';

export default function AuthForm({ onSubmit, submitLabel = 'Continue', showDisplayName = true }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ displayName, email, password });
      }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        padding: 20,
        borderRadius: 12,
        backdropFilter: 'blur(6px)',
        color: '#e6eef6',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: 320,
      }}
    >
      {showDisplayName && (
        <input
          placeholder="Full name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'inherit' }}
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'inherit' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'inherit' }}
      />
      <button
        type="submit"
        style={{
          padding: 10,
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(90deg,#0ea5a4,#7c3aed)',
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
