import { MenuItem, menuItems } from '@/data/menuData';
import { Transaction } from '@/types/transaction';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MENU_STORAGE_KEY = 'nostra-caffe-menu-items';
const TRANSACTION_STORAGE_KEY = 'nostra-caffe-transactions';

export type StoredMenuItem = MenuItem & {
  available: boolean;
};

const isBrowser = () => typeof window !== 'undefined';

const readJson = <T,>(key: string, fallback: T): T => {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T,>(key: string, value: T) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const normalizeMenuItem = (item: MenuItem): StoredMenuItem => ({
  ...item,
  description: item.description ?? '',
  fallbackKeyword: item.fallbackKeyword || 'espresso',
  available: item.available ?? true,
});

export const normalizeTransaction = (transaction: Transaction): Transaction => ({
  ...transaction,
  orderType: transaction.orderType ?? 'Dine in',
  tableNumber: transaction.tableNumber ?? '',
  orderNotes: transaction.orderNotes ?? '',
});

export const getMenuItems = (): StoredMenuItem[] => {
  const stored = readJson<StoredMenuItem[] | null>(MENU_STORAGE_KEY, null);
  if (Array.isArray(stored)) {
    return stored.map(normalizeMenuItem);
  }

  const defaults = menuItems.map(normalizeMenuItem);
  saveMenuItems(defaults);
  return defaults;
};

export const saveMenuItems = async (items: StoredMenuItem[]) => {
  const currentItems = getMenuItems();
  const nextItemIds = new Set(items.map(item => item.id));
  const deletedItems = currentItems.filter(item => !nextItemIds.has(item.id));

  writeJson(MENU_STORAGE_KEY, items.map(normalizeMenuItem));

  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, 'menuItems', item.id);
      batch.set(docRef, normalizeMenuItem(item));
    });
    deletedItems.forEach((item) => {
      const docRef = doc(db, 'menuItems', item.id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error syncing menu items to Firestore:', error);
  }
};

export const resetMenuItems = () => {
  const defaults = menuItems.map(normalizeMenuItem);
  saveMenuItems(defaults);
  return defaults;
};

export const getTransactions = (): Transaction[] => {
  return readJson<Transaction[]>(TRANSACTION_STORAGE_KEY, []).map(normalizeTransaction);
};

export const saveTransactions = async (transactions: Transaction[]) => {
  const currentTransactions = getTransactions();
  const nextIds = new Set(transactions.map(t => t.id));
  const deletedTransactions = currentTransactions.filter(t => !nextIds.has(t.id));

  writeJson(TRANSACTION_STORAGE_KEY, transactions.map(normalizeTransaction));

  try {
    const batch = writeBatch(db);
    transactions.forEach((transaction) => {
      const docRef = doc(db, 'transactions', transaction.id);
      batch.set(docRef, normalizeTransaction(transaction));
    });
    deletedTransactions.forEach((transaction) => {
      const docRef = doc(db, 'transactions', transaction.id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error saving transactions to Firestore:', error);
  }
};

export const addTransaction = (transaction: Transaction) => {
  const transactions = getTransactions();
  const nextTransactions = [transaction, ...transactions];
  writeJson(TRANSACTION_STORAGE_KEY, nextTransactions.map(normalizeTransaction));

  // Sync to Firestore asynchronously
  const docRef = doc(db, 'transactions', transaction.id);
  setDoc(docRef, normalizeTransaction(transaction)).catch((error) => {
    console.error('Error adding transaction to Firestore:', error);
  });

  return nextTransactions;
};

export const addTransactionAsync = async (transaction: Transaction): Promise<void> => {
  // Tulis HANYA ke Firestore server — jangan tulis ke localStorage dulu.
  // localStorage akan diisi secara otomatis oleh subscribeToTransactions (onSnapshot)
  // saat server mengkonfirmasi data diterima. Ini memastikan semua device melihat data yang sama.
  const docRef = doc(db, 'transactions', transaction.id);
  await setDoc(docRef, normalizeTransaction(transaction));
};

export const updateTransaction = (transactionId: string, updates: Partial<Transaction>) => {
  const nextTransactions = getTransactions().map((transaction) =>
    transaction.id === transactionId ? { ...transaction, ...updates } : transaction
  );
  writeJson(TRANSACTION_STORAGE_KEY, nextTransactions.map(normalizeTransaction));

  // Sync to Firestore asynchronously
  const docRef = doc(db, 'transactions', transactionId);
  updateDoc(docRef, updates).catch((error) => {
    console.error('Error updating transaction in Firestore:', error);
  });

  return nextTransactions;
};

export const deleteTransaction = (transactionId: string) => {
  const nextTransactions = getTransactions().filter((transaction) => transaction.id !== transactionId);
  writeJson(TRANSACTION_STORAGE_KEY, nextTransactions.map(normalizeTransaction));

  // Sync to Firestore asynchronously
  const docRef = doc(db, 'transactions', transactionId);
  deleteDoc(docRef).catch((error) => {
    console.error('Error deleting transaction in Firestore:', error);
  });

  return nextTransactions;
};

// Real-time listener subscriptions
export const subscribeToMenuItems = (callback: (items: StoredMenuItem[]) => void) => {
  return onSnapshot(collection(db, 'menuItems'), (snapshot) => {
    const items: StoredMenuItem[] = [];
    snapshot.forEach((doc) => {
      items.push({ ...doc.data(), id: doc.id } as StoredMenuItem);
    });
    
    if (items.length === 0) {
      // If Firestore is empty, upload default menu items
      const defaults = menuItems.map(normalizeMenuItem);
      saveMenuItems(defaults);
      callback(defaults);
    } else {
      writeJson(MENU_STORAGE_KEY, items);
      callback(items);
    }
  });
};

export const subscribeToTransactions = (
  callback: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void
) => {
  // hasMeta: false — hanya terima update dari server, bukan cache lokal
  return onSnapshot(
    collection(db, 'transactions'),
    { includeMetadataChanges: false },
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Transaction);
      });

      // Sort transactions by createdAt descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      writeJson(TRANSACTION_STORAGE_KEY, list);
      callback(list);
    },
    (error) => {
      console.error('subscribeToTransactions error:', error);
      if (onError) onError(error);
    }
  );
};

