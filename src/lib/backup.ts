import { StoredMenuItem, normalizeMenuItem, normalizeTransaction } from '@/lib/storage';
import { Transaction } from '@/types/transaction';

const BACKUP_APP_ID = 'nostra-caffe';
const BACKUP_VERSION = 1;

export interface BackupPayload {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  menuItems: StoredMenuItem[];
  transactions: Transaction[];
}

export const createBackupPayload = (
  menuItems: StoredMenuItem[],
  transactions: Transaction[],
  exportedAt = new Date().toISOString()
): BackupPayload => ({
  app: BACKUP_APP_ID,
  version: BACKUP_VERSION,
  exportedAt,
  menuItems: menuItems.map(normalizeMenuItem),
  transactions: transactions.map(normalizeTransaction),
});

export const parseBackupPayload = (rawBackup: string) => {
  const parsed = JSON.parse(rawBackup) as Partial<BackupPayload>;

  if (parsed.app !== BACKUP_APP_ID || !Array.isArray(parsed.menuItems) || !Array.isArray(parsed.transactions)) {
    throw new Error('Format backup tidak valid.');
  }

  return {
    menuItems: parsed.menuItems.map(normalizeMenuItem),
    transactions: parsed.transactions.map(normalizeTransaction),
  };
};

export const getBackupFileName = (date = new Date()) => {
  const stamp = date.toISOString().slice(0, 10);
  return `backup-nostra-caffe-${stamp}.json`;
};
