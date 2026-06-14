import { describe, expect, it } from 'vitest';
import { createBackupPayload, parseBackupPayload } from '@/lib/backup';
import { StoredMenuItem } from '@/lib/storage';
import { Transaction } from '@/types/transaction';

const menuItem: StoredMenuItem = {
  id: 'm1',
  name: 'Cafe Latte',
  description: '',
  price: 18,
  image: '/latte.jpg',
  category: 'coffee',
  fallbackKeyword: 'espresso',
  available: true,
};

const transaction: Transaction = {
  id: 'TRX-1',
  customerName: 'Ayu',
  items: [{ id: 'm1', name: 'Cafe Latte', price: 18, quantity: 1, subtotal: 18 }],
  totalItems: 1,
  totalPrice: 18,
  paymentMethod: 'QRIS',
  paymentStatus: 'Belum bayar',
  orderStatus: 'Menunggu',
  orderType: 'Dine in',
  tableNumber: '3',
  orderNotes: 'less ice',
  createdAt: '2026-06-15T10:00:00.000Z',
};

describe('backup payloads', () => {
  it('creates and parses a valid backup payload', () => {
    const payload = createBackupPayload([menuItem], [transaction], '2026-06-15T00:00:00.000Z');
    const parsed = parseBackupPayload(JSON.stringify(payload));

    expect(parsed.menuItems).toEqual([menuItem]);
    expect(parsed.transactions).toEqual([transaction]);
  });

  it('rejects an invalid backup payload', () => {
    expect(() => parseBackupPayload(JSON.stringify({ app: 'other', menuItems: [], transactions: [] }))).toThrow(
      'Format backup tidak valid.'
    );
  });
});
