const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const users = [
  { email: 'student.test@transit.local', password: 'Test1234!', displayName: 'Test Student', role: 'student' },
  { email: 'driver.test@transit.local', password: 'Test1234!', displayName: 'Test Driver', role: 'driver' },
];

async function upsertUser(u) {
  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(u.email);
      console.log('Found user:', u.email, 'uid=', userRecord.uid, '-> updating');
      await admin.auth().updateUser(userRecord.uid, { password: u.password, displayName: u.displayName });
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({ email: u.email, password: u.password, displayName: u.displayName });
        console.log('Created user', u.email, 'uid=', userRecord.uid);
      } else {
        throw err;
      }
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: u.role });

    await db.collection('users').doc(userRecord.uid).set({
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('Upserted Firestore doc for', u.email);
  } catch (err) {
    console.error('Error upserting user', u.email, err);
  }
}

(async () => {
  for (const u of users) {
    // eslint-disable-next-line no-await-in-loop
    await upsertUser(u);
  }
  console.log('All done');
  process.exit(0);
})();
