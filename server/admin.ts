import * as admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json'; // lataa omasta projektistasi

// Alustetaan Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Lisää admin-claim käyttäjälle
 */
export async function addAdminRole(uid: string) {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`Admin-claim lisätty käyttäjälle: ${uid}`);
}
