import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { AppSettings } from '@/types';
import { docToData } from '@/utils/helpers';

const SETTINGS_ID = 'main';
const DEFAULT_LOGO_URL = '/default-logo.png';

export async function getAppSettings(): Promise<AppSettings> {
  const snap = await getDoc(doc(db, COLLECTIONS.appSettings, SETTINGS_ID));
  if (!snap.exists()) {
    const defaults: Omit<AppSettings, 'id'> = {
      businessName: 'Mandap Decoration Services',
      businessNameGu: 'મંડપ સજાવટ સેવાઓ',
      logoUrl: DEFAULT_LOGO_URL,
      address: 'Surat, Gujarat',
      addressGu: 'સુરત, ગુજરાત',
      phone: '',
      gstNumber: '',
      defaultGstRate: 18,
      updatedAt: new Date(),
    };
    await setDoc(doc(db, COLLECTIONS.appSettings, SETTINGS_ID), {
      ...defaults,
      updatedAt: serverTimestamp(),
    });
    return { id: SETTINGS_ID, ...defaults };
  }
  const current = docToData<AppSettings>(snap.id, snap.data());
  if (!current.logoUrl) {
    await setDoc(
      doc(db, COLLECTIONS.appSettings, SETTINGS_ID),
      { logoUrl: DEFAULT_LOGO_URL, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { ...current, logoUrl: DEFAULT_LOGO_URL };
  }
  return current;
}

export async function updateAppSettings(data: Partial<AppSettings>): Promise<void> {
  const { id: _, ...rest } = data;
  await setDoc(
    doc(db, COLLECTIONS.appSettings, SETTINGS_ID),
    { ...rest, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function uploadLogo(file: File): Promise<string> {
  const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function exportAllData(): Promise<Record<string, unknown[]>> {
  const collections = Object.values(COLLECTIONS);
  const result: Record<string, unknown[]> = {};

  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    result[colName] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  return result;
}

export async function importData(data: Record<string, unknown[]>): Promise<void> {
  const batch = writeBatch(db);

  for (const [colName, docs] of Object.entries(data)) {
    for (const docData of docs) {
      const { id, ...rest } = docData as { id: string; [key: string]: unknown };
      if (id) {
        batch.set(doc(db, colName, id), rest, { merge: true });
      }
    }
  }

  await batch.commit();
}
