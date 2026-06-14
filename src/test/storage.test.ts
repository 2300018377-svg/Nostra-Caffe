import { afterEach, describe, expect, it } from 'vitest';
import { getTransactions, saveTransactions } from '@/lib/storage';
import { Transaction } from '@/types/transaction';

const transaction: Transaction = {
  id: 'TRX-1',
  customerName: 'Ayu',
  items: [{ id: 'm1', name: 'Cafe Latte', price: 18, quantity: 1, subtotal: 18 }],
  totalItems: 1,
  totalPrice: 18,
  paymentMethod: 'Cash',
  paymentStatus: 'Belum bayar',
  orderStatus: 'Menunggu',
  orderType: 'Dine in',
  tableNumber: '5',
  orderNotes: '',
  createdAt: '2026-06-15T10:00:00.000Z',
};

afterEach(() => {
  window.localStorage.clear();
});

describe('transaction storage', () => {
  it('normalizes older transactions that do not have order detail fields', () => {
    const legacyTransaction = { ...transaction };
    delete (legacyTransaction as Partial<Transaction>).orderType;
    delete (legacyTransaction as Partial<Transaction>).tableNumber;
    delete (legacyTransaction as Partial<Transaction>).orderNotes;

    window.localStorage.setItem('nostra-caffe-transactions', JSON.stringify([legacyTransaction]));

    expect(getTransactions()[0]).toMatchObject({
      orderType: 'Dine in',
      tableNumber: '',
      orderNotes: '',
    });
  });

  it('saves normalized transactions', () => {
    saveTransactions([{ ...transaction, tableNumber: undefined, orderNotes: undefined }]);

    expect(JSON.parse(window.localStorage.getItem('nostra-caffe-transactions') ?? '[]')[0]).toMatchObject({
      tableNumber: '',
      orderNotes: '',
    });
  });
});
