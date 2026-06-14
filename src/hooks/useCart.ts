import { useState, useCallback } from 'react';
import { MenuItem } from '@/data/menuData';
import { OrderType, PaymentMethod } from '@/types/transaction';

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderSummaryDetails {
  customerName?: string;
  paymentMethod?: PaymentMethod;
  orderType?: OrderType;
  tableNumber?: string;
  orderNotes?: string;
}

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((item: MenuItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, quantity } : i)
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const generateOrderSummary = (details: OrderSummaryDetails = {}) => {
    const orderLines = items.map(item =>
      `- ${item.name} x${item.quantity} = ${item.price * item.quantity}K`
    ).join('\n');
    const detailLines = [
      details.customerName ? `Nama: ${details.customerName}` : null,
      details.orderType ? `Tipe: ${details.orderType}${details.tableNumber ? ` - Meja ${details.tableNumber}` : ''}` : null,
      details.paymentMethod ? `Pembayaran: ${details.paymentMethod}` : null,
      details.orderNotes ? `Catatan: ${details.orderNotes}` : null,
    ].filter(Boolean).join('\n');

    return `*PESANAN Nostra-Caffe*\n\n${detailLines ? `${detailLines}\n\n` : ''}${orderLines}\n\n*Total: ${totalPrice}K*`;
  };

  return {
    items,
    isOpen,
    setIsOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    generateOrderSummary,
  };
};
