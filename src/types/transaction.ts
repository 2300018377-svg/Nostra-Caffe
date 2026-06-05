export type PaymentMethod = 'Cash' | 'QRIS' | 'Transfer';

export type PaymentStatus = 'Belum bayar' | 'Sudah bayar';

export type OrderStatus = 'Menunggu' | 'Diproses' | 'Selesai' | 'Dibatalkan';

export interface TransactionItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  customerName: string;
  items: TransactionItem[];
  totalItems: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
}

export interface CheckoutPayload {
  customerName: string;
  paymentMethod: PaymentMethod;
  items: TransactionItem[];
  totalItems: number;
  totalPrice: number;
}
