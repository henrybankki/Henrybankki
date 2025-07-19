import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import type { firestore } from 'firebase-admin'
import { generateFinnishReference } from './util'

export function createBillCallable(db: firestore.Firestore) {
  return async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.')
    }
    const uref = db.collection('users').doc(context.auth.uid)
    const usnap = await uref.get()
    if (!usnap.exists || usnap.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Vain admin.')
    }

    const { issuedToUid, amount, dueDate, message } = data
    if (!issuedToUid || !amount || !dueDate) {
      throw new functions.https.HttpsError('invalid-argument', 'Pakollinen kenttä puuttuu.')
    }

    const base = Date.now().toString().slice(-7)
    const refNum = generateFinnishReference(base)

    const billRef = await db.collection('bills').add({
      issuedByUid: context.auth.uid,
      issuedToUid,
      amount,
      dueDate,
      message: message ?? '',
      referenceNumber: refNum,
      status: 'unpaid',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { id: billRef.id, referenceNumber: refNum }
  }
}
