import { MenuItem, menuItems } from '@/data/menuData';
import { Transaction } from '@/types/transaction';

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

export const getMenuItems = (): StoredMenuItem[] => {
  const stored = readJson<StoredMenuItem[] | null>(MENU_STORAGE_KEY, null);
  if (Array.isArray(stored)) {
    return stored.map(normalizeMenuItem);
  }

  const defaults = menuItems.map(normalizeMenuItem);
  saveMenuItems(defaults);
  return defaults;
};

export const saveMenuItems = (items: StoredMenuItem[]) => {
  writeJson(MENU_STORAGE_KEY, items.map(normalizeMenuItem));
};

export const resetMenuItems = () => {
  const defaults = menuItems.map(normalizeMenuItem);
  saveMenuItems(defaults);
  return defaults;
};

export const getTransactions = (): Transaction[] => {
  return readJson<Transaction[]>(TRANSACTION_STORAGE_KEY, []);
};

export const saveTransactions = (transactions: Transaction[]) => {
  writeJson(TRANSACTION_STORAGE_KEY, transactions);
};

export const addTransaction = (transaction: Transaction) => {
  const transactions = getTransactions();
  const nextTransactions = [transaction, ...transactions];
  saveTransactions(nextTransactions);
  return nextTransactions;
};

export const updateTransaction = (transactionId: string, updates: Partial<Transaction>) => {
  const nextTransactions = getTransactions().map((transaction) =>
    transaction.id === transactionId ? { ...transaction, ...updates } : transaction
  );
  saveTransactions(nextTransactions);
  return nextTransactions;
};

export const deleteTransaction = (transactionId: string) => {
  const nextTransactions = getTransactions().filter((transaction) => transaction.id !== transactionId);
  saveTransactions(nextTransactions);
  return nextTransactions;
};
