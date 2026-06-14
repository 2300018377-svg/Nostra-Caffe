import { OrderStatus, OrderType, PaymentStatus, Transaction } from '@/types/transaction';

export interface TransactionFilters {
  searchQuery: string;
  paymentStatus: PaymentStatus | 'all';
  orderStatus: OrderStatus | 'all';
  orderType: OrderType | 'all';
}

export const toDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfDayTime = (dateInput: string) => {
  return dateInput ? new Date(`${dateInput}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
};

const getEndOfDayTime = (dateInput: string) => {
  return dateInput ? new Date(`${dateInput}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
};

export const isTransactionInDateRange = (transaction: Transaction, startDate: string, endDate: string) => {
  const createdTime = new Date(transaction.createdAt).getTime();

  if (!Number.isFinite(createdTime)) {
    return false;
  }

  return createdTime >= getStartOfDayTime(startDate) && createdTime <= getEndOfDayTime(endDate);
};

export const getTransactionsInDateRange = (transactions: Transaction[], startDate: string, endDate: string) => {
  return transactions.filter((transaction) => isTransactionInDateRange(transaction, startDate, endDate));
};

export const getTransactionReport = (transactions: Transaction[], startDate: string, endDate: string) => {
  const scopedTransactions = getTransactionsInDateRange(transactions, startDate, endDate);

  return {
    transactions: scopedTransactions,
    totalTransactions: scopedTransactions.length,
    totalRevenue: scopedTransactions
      .filter((transaction) => transaction.paymentStatus === 'Sudah bayar' && transaction.orderStatus !== 'Dibatalkan')
      .reduce((sum, transaction) => sum + transaction.totalPrice, 0),
    completedOrders: scopedTransactions.filter((transaction) => transaction.orderStatus === 'Selesai').length,
    canceledOrders: scopedTransactions.filter((transaction) => transaction.orderStatus === 'Dibatalkan').length,
  };
};

export const getFilteredTransactions = (transactions: Transaction[], filters: TransactionFilters) => {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();

  return transactions.filter((transaction) => {
    const matchesPaymentStatus =
      filters.paymentStatus === 'all' || transaction.paymentStatus === filters.paymentStatus;
    const matchesOrderStatus = filters.orderStatus === 'all' || transaction.orderStatus === filters.orderStatus;
    const matchesOrderType = filters.orderType === 'all' || transaction.orderType === filters.orderType;

    if (!matchesPaymentStatus || !matchesOrderStatus || !matchesOrderType) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [
      transaction.id,
      transaction.customerName,
      transaction.paymentMethod,
      transaction.paymentStatus,
      transaction.orderStatus,
      transaction.orderType,
      transaction.tableNumber,
      transaction.orderNotes,
      ...transaction.items.map((item) => item.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
};

const escapeCsvValue = (value: string | number | undefined) => {
  const stringValue = String(value ?? '');

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

export const createTransactionsCsv = (transactions: Transaction[]) => {
  const headers = [
    'ID Transaksi',
    'Waktu',
    'Customer',
    'Tipe Pesanan',
    'Nomor Meja',
    'Catatan',
    'Item',
    'Total Item',
    'Total K',
    'Metode',
    'Status Bayar',
    'Status Pesanan',
  ];

  const rows = transactions.map((transaction) => [
    transaction.id,
    transaction.createdAt,
    transaction.customerName,
    transaction.orderType,
    transaction.tableNumber,
    transaction.orderNotes,
    transaction.items.map((item) => `${item.name} x${item.quantity}`).join('; '),
    transaction.totalItems,
    transaction.totalPrice,
    transaction.paymentMethod,
    transaction.paymentStatus,
    transaction.orderStatus,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
};
