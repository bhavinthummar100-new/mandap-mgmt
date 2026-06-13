import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { InventoryItem } from '@/types';
import { docToData, stripUndefined } from '@/utils/helpers';

const col = collection(db, COLLECTIONS.inventoryItems);

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const q = query(col, orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<InventoryItem>(d.id, d.data()));
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.inventoryItems, id));
  if (!snap.exists()) return null;
  return docToData<InventoryItem>(snap.id, snap.data());
}

export async function createInventoryItem(
  data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'bookedStock' | 'availableStock'>
): Promise<string> {
  const ref = await addDoc(col, stripUndefined({
    ...data,
    bookedStock: 0,
    availableStock: data.totalStock,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<void> {
  const item = await getInventoryItem(id);
  if (!item) return;
  const totalStock = data.totalStock ?? item.totalStock;
  const bookedStock = data.bookedStock ?? item.bookedStock;
  const { id: _, createdAt, ...rest } = data;
  await updateDoc(doc(db, COLLECTIONS.inventoryItems, id), stripUndefined({
    ...rest,
    totalStock,
    availableStock: totalStock - bookedStock,
    updatedAt: serverTimestamp(),
  }));
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.inventoryItems, id));
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const items = await getInventoryItems();
  return items.filter((i) => i.availableStock <= i.lowStockThreshold);
}

export async function checkAvailability(itemName: string, quantity: number): Promise<{ available: boolean; availableStock: number }> {
  const items = await getInventoryItems();
  const item = items.find((i) => i.name.toLowerCase() === itemName.toLowerCase());
  if (!item) return { available: true, availableStock: 999 };
  return { available: item.availableStock >= quantity, availableStock: item.availableStock };
}
