import { describe, expect, it } from 'vitest';
import {
  createTransactionsCsv,
  getFilteredTransactions,
  getTransactionReport,
  toDateInputValue,
} from '@/lib/adminReports';
import { Transaction } from '@/types/transaction';

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'TRX-1',
  customerName: 'Ayu',
  items: [
    {
      id: 'm1',
      name: 'Cafe Latte',
      price: 18,
      quantity: 2,
      subtotal: 36,
    },
  ],
  totalItems: 2,
  totalPrice: 36,
  paymentMethod: 'Cash',
  paymentStatus: 'Sudah bayar',
  orderStatus: 'Selesai',
  orderType: 'Dine in',
  tableNumber: '7',
  orderNotes: '',
  createdAt: '2026-06-15T10:00:00.000Z',
  ...overrides,
});

describe('adminReports', () => {
  it('formats a Date as a local date input value', () => {
    expect(toDateInputValue(new Date(2026, 5, 15))).toBe('2026-06-15');
  });

  it('summarizes transactions inside a date range', () => {
    const report = getTransactionReport(
      [
        makeTransaction(),
        makeTransaction({ id: 'TRX-2', totalPrice: 22, createdAt: '2026-06-16T08:00:00.000Z' }),
        makeTransaction({ id: 'TRX-3', totalPrice: 50, orderStatus: 'Dibatalkan' }),
        makeTransaction({ id: 'TRX-4', totalPrice: 20, paymentStatus: 'Belum bayar' }),
      ],
      '2026-06-15',
      '2026-06-15'
    );

    expect(report.totalTransactions).toBe(3);
    expect(report.totalRevenue).toBe(36);
    expect(report.completedOrders).toBe(2);
    expect(report.canceledOrders).toBe(1);
  });

  it('filters transactions by text and status controls', () => {
    const transactions = [
      makeTransaction({ id: 'TRX-1', customerName: 'Ayu', tableNumber: '7' }),
      makeTransaction({
        id: 'TRX-2',
        customerName: 'Bima',
        items: [{ id: 'm2', name: 'Matcha Noka', price: 27, quantity: 1, subtotal: 27 }],
        totalItems: 1,
        totalPrice: 27,
        paymentStatus: 'Belum bayar',
        orderStatus: 'Menunggu',
        orderType: 'Take away',
        tableNumber: '',
      }),
    ];

    expect(
      getFilteredTransactions(transactions, {
        searchQuery: 'matcha',
        paymentStatus: 'Belum bayar',
        orderStatus: 'Menunggu',
        orderType: 'Take away',
      })
    ).toEqual([transactions[1]]);
  });

  it('exports CSV with escaped values', () => {
    const csv = createTransactionsCsv([
      makeTransaction({ customerName: 'Ayu, Tim', orderNotes: 'less ice, no sugar' }),
    ]);

    expect(csv).toContain('"Ayu, Tim"');
    expect(csv).toContain('"less ice, no sugar"');
  });
});
