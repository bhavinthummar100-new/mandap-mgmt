import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { AppUser, UserRole } from '@/types';
import { docToData } from '@/utils/helpers';

export async function login(email: string, password: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = (await Promise.race([
    getUserProfile(cred.user.uid),
    new Promise<null>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'Profile loading timed out. Check Firestore rules and users/{uid} document.'
          )
        );
      }, 8000);
    }),
  ])) as AppUser | null;
  if (!user) throw new Error('User profile not found');
  if (!user.isActive) throw new Error('Account is inactive');
  return user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const ref = doc(db, COLLECTIONS.users, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToData<AppUser>(snap.id, snap.data());
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole,
  phone?: string,
  laborerId?: string
): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.users, uid), {
    uid,
    email,
    displayName,
    role,
    phone: phone ?? '',
    laborerId: laborerId ?? null,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
