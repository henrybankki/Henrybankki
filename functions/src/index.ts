import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { createBillCallable } from './bills'

admin.initializeApp()
const db = admin.firestore()

export const adminCreateBill = functions.https.onCall(createBillCallable(db))
