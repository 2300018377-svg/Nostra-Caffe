import { createContext, useContext, ReactNode, useRef, useCallback, useState } from 'react';
import { useCart, CartItem } from '@/hooks/useCart';
import { MenuItem } from '@/data/menuData';

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  generateOrderSummary: () => string;
  cartIconRef: React.RefObject<HTMLDivElement>;
  triggerShake: () => void;
  isShaking: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const cart = useCart();
  const cartIconRef = useRef<HTMLDivElement>(null);
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  return (
    <CartContext.Provider value={{ ...cart, cartIconRef, triggerShake, isShaking }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext must be used within CartProvider');
  }
  return context;
};
