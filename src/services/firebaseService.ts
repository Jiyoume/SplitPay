/**
 * AmbagKo - Firebase Backend Service
 * 
 * Cloud backend for online sync using Firebase:
 * - Firestore: Real-time database for expenses, groups, payments
 * - Auth: User authentication (email, Google, phone)
 * - Storage: Receipt images, ID documents
 * - Cloud Functions: Notifications, scheduled reports
 * 
 * Install: npm install firebase
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore, collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
  Timestamp, serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';
import {
  getAuth, Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  PhoneAuthProvider, signInWithPhoneNumber, User as FirebaseUser,
} from 'firebase/auth';
import {
  getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';

import { User, Group, Expense, Payment } from '../models/types';
import { AmbagKoKYCProfile } from '../models/kyc';

// ===== FIREBASE CONFIG =====
// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "ambagko-app.firebaseapp.com",
  projectId: "ambagko-app",
  storageBucket: "ambagko-app.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000",
};

// ===== INITIALIZATION =====

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

export function initFirebase(): void {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
}

// ===== AUTHENTICATION =====

export async function registerWithEmail(email: string, password: string, displayName: string): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // Create user profile in Firestore
  await setDoc(doc(db, 'users', credential.user.uid), {
    email, displayName, createdAt: serverTimestamp(),
    kycLevel: 'none', kycStatus: 'NOT_STARTED',
  });
  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  // Upsert user profile
  const userRef = doc(db, 'users', credential.user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: credential.user.email,
      displayName: credential.user.displayName,
      photoURL: credential.user.photoURL,
      createdAt: serverTimestamp(),
      kycLevel: 'none', kycStatus: 'NOT_STARTED',
    });
  }
  return credential.user;
}

export async function loginWithPhone(phoneNumber: string, appVerifier: any): Promise<any> {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

// ===== USERS =====

export async function getUserProfile(userId: string): Promise<any> {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(userId: string, data: Partial<any>): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() });
}

// ===== GROUPS =====

export async function createGroup(group: Omit<Group, 'id'>): Promise<string> {
  const groupRef = doc(collection(db, 'groups'));
  await setDoc(groupRef, { ...group, createdAt: serverTimestamp() });
  return groupRef.id;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } as any : null;
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
}

export async function updateGroup(groupId: string, data: Partial<Group>): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId));
}

// ===== EXPENSES =====

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
  const expRef = doc(collection(db, 'expenses'));
  await setDoc(expRef, { ...expense, createdAt: serverTimestamp() });
  // Update group total
  if (expense.groupId) {
    await updateDoc(doc(db, 'groups', expense.groupId), {
      totalExpenses: increment(expense.amount),
    });
  }
  return expRef.id;
}

export async function getExpense(expenseId: string): Promise<Expense | null> {
  const snap = await getDoc(doc(db, 'expenses', expenseId));
  return snap.exists() ? { id: snap.id, ...snap.data() } as any : null;
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const q = query(collection(db, 'expenses'), where('groupId', '==', groupId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
}

export async function getUserExpenses(userId: string, limitCount: number = 50): Promise<Expense[]> {
  const q = query(collection(db, 'expenses'), where('memberIds', 'array-contains', userId), orderBy('date', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
}

export async function updateExpense(expenseId: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(doc(db, 'expenses', expenseId), { ...data, updatedAt: serverTimestamp() });
}

// ===== PAYMENTS =====

export async function recordPayment(payment: Omit<Payment, 'id'>): Promise<string> {
  const payRef = doc(collection(db, 'payments'));
  await setDoc(payRef, { ...payment, createdAt: serverTimestamp() });
  return payRef.id;
}

export async function getGroupPayments(groupId: string): Promise<Payment[]> {
  const q = query(collection(db, 'payments'), where('groupId', '==', groupId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
}

export async function getUserPayments(userId: string): Promise<Payment[]> {
  const sent = query(collection(db, 'payments'), where('fromUserId', '==', userId), orderBy('date', 'desc'));
  const received = query(collection(db, 'payments'), where('toUserId', '==', userId), orderBy('date', 'desc'));
  const [sentSnap, recvSnap] = await Promise.all([getDocs(sent), getDocs(received)]);
  const all = [...sentSnap.docs, ...recvSnap.docs].map(d => ({ id: d.id, ...d.data() }) as any);
  return all.sort((a, b) => (b.date > a.date ? 1 : -1));
}

// ===== KYC =====

export async function saveKYCProfile(userId: string, profile: Partial<AmbagKoKYCProfile>): Promise<void> {
  await setDoc(doc(db, 'kyc', userId), { ...profile, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getKYCProfile(userId: string): Promise<AmbagKoKYCProfile | null> {
  const snap = await getDoc(doc(db, 'kyc', userId));
  return snap.exists() ? snap.data() as any : null;
}

// ===== STORAGE (RECEIPTS, DOCUMENTS) =====

export async function uploadReceiptImage(userId: string, file: File | Blob, fileName: string): Promise<string> {
  const storageRef = ref(storage, `receipts/${userId}/${Date.now()}_${fileName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadKYCDocument(userId: string, file: File | Blob, docType: string): Promise<string> {
  const storageRef = ref(storage, `kyc/${userId}/${docType}_${Date.now()}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteFile(filePath: string): Promise<void> {
  await deleteObject(ref(storage, filePath));
}

// ===== REAL-TIME LISTENERS =====

export function listenToGroupExpenses(groupId: string, callback: (expenses: Expense[]) => void): () => void {
  const q = query(collection(db, 'expenses'), where('groupId', '==', groupId), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as any));
  });
}

export function listenToUserNotifications(userId: string, callback: (notifications: any[]) => void): () => void {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ===== BATCH OPERATIONS =====

export async function settleGroupDebts(groupId: string, settlements: { from: string; to: string; amount: number }[]): Promise<void> {
  const batch = writeBatch(db);
  settlements.forEach(s => {
    const payRef = doc(collection(db, 'payments'));
    batch.set(payRef, {
      groupId, fromUserId: s.from, toUserId: s.to, amount: s.amount,
      settled: true, date: Timestamp.now(), createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

// ===== EXPORT =====
export { db, auth, storage, app };
