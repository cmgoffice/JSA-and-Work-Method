import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, Firestore, collection, doc, CollectionReference, DocumentReference } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

export const FIRESTORE_COLLECTION = "JSA Work Method";
export const FIRESTORE_ROOT_DOC = "root";

let app: FirebaseApp;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error:", e);
  throw e;
}

export const auth = getAuth(app);
export { db };

export function projectsRef(): CollectionReference {
  return collection(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "projects");
}

export function wmsDocumentsRef(): CollectionReference {
  return collection(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "wms_documents");
}

export function jsaDocumentsRef(): CollectionReference {
  return collection(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "jsa_documents");
}

export function projectDoc(id: string): DocumentReference {
  return doc(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "projects", id);
}

export function wmsDoc(id: string): DocumentReference {
  return doc(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "wms_documents", id);
}

export function jsaDoc(id: string): DocumentReference {
  return doc(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "jsa_documents", id);
}

export function metaDoc(): DocumentReference {
  return doc(db, FIRESTORE_COLLECTION, "_meta");
}

export function usersRef(): CollectionReference {
  return collection(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "users");
}

export function userDoc(uid: string): DocumentReference {
  return doc(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "users", uid);
}

export function appMetaRef(): CollectionReference {
  return collection(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "appMeta");
}

export function appMetaConfigDoc(): DocumentReference {
  return doc(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "appMeta", "config");
}

export function activityLogsRef(): CollectionReference {
  return collection(db, FIRESTORE_COLLECTION, FIRESTORE_ROOT_DOC, "activityLogs");
}
