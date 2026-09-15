import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app = getApps().length ? getApp() : initializeApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
