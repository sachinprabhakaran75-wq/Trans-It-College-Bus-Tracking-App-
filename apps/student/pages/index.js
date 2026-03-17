import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ fontFamily: 'Inter, sans-serif', padding: 20 }}>
      <h1>Trans-It — Student App</h1>
      <p>Welcome to the student Progressive Web App (PWA) starter.</p>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3>Quick Links:</h3>
        <Link href="/auth/signin" style={{ color: 'blue', textDecoration: 'underline' }}>Go to Sign In</Link>
        <Link href="/scan" style={{ color: 'blue', textDecoration: 'underline' }}>Go to QR Scanner</Link>
        <Link href="/dashboard" style={{ color: 'blue', textDecoration: 'underline' }}>Go to Dashboard</Link>
      </div>

      <p style={{ marginTop: 40, color: '#666', fontSize: '0.9em' }}>
        Development Note: Check <code>.env.local</code> if you encounter connection errors.
      </p>
    </main>
  );
}
