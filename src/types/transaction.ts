export type PaymentMethod = 'Cash' | 'QRIS' | 'Transfer';

export type PaymentStatus = 'Belum bayar' | 'Sudah bayar';

export type OrderStatus = 'Menunggu' | 'Diproses' | 'Selesai' | 'Dibatalkan';

export type OrderType = 'Dine in' | 'Take away';

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
  orderType: OrderType;
  tableNumber?: string;
  orderNotes?: string;
  createdAt: string;
}

export interface CheckoutPayload {
  customerName: string;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  tableNumber?: string;
  orderNotes?: string;
  items: TransactionItem[];
  totalItems: number;
  totalPrice: number;
}
