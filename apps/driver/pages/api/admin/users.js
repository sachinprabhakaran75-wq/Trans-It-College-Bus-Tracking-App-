const admin = require('firebase-admin');
const path = require('path');

// Resolve service account from repo root (apps/driver cwd -> ../../firebase-service-account.json)
const serviceAccountPath = path.resolve(process.cwd(), '..', '..', 'firebase-service-account.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error('Service account not found at', serviceAccountPath);
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // list users (first 1000)
      const list = await admin.auth().listUsers(1000);
      const users = await Promise.all(
        list.users.map(async (u) => {
          const doc = await db.collection('users').doc(u.uid).get().catch(() => null);
          return {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            disabled: u.disabled,
            customClaims: u.customClaims || {},
            firestore: doc ? doc.data() : null,
          };
        })
      );
      return res.status(200).json({ users });
    }

    if (req.method === 'POST') {
      // revoke tokens: body { uid }
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: 'uid required' });
      await admin.auth().revokeRefreshTokens(uid);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      // delete user: body { uid }
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: 'uid required' });
      await admin.auth().deleteUser(uid);
      await db.collection('users').doc(uid).delete().catch(() => {});
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
