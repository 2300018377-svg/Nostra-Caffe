import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartProvider } from '@/context/CartContext';
import { HeroSection } from '@/components/HeroSection';
import { SearchBar } from '@/components/SearchBar';
import { MenuGrid } from '@/components/MenuGrid';
import { Cart } from '@/components/Cart';
import { DesktopCart } from '@/components/DesktopCart';
import { Footer } from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { addTransactionAsync, getMenuItems, subscribeToMenuItems, StoredMenuItem } from '@/lib/storage';
import { CheckoutPayload, Transaction } from '@/types/transaction';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [menuItems, setMenuItems] = useState<StoredMenuItem[]>(() => getMenuItems());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToMenuItems(setMenuItems);
    return () => unsubscribe();
  }, []);

  const handleCheckout = async (payload: CheckoutPayload) => {
    const transaction: Transaction = {
      id: `TRX-${Date.now()}`,
      customerName: payload.customerName,
      items: payload.items,
      totalItems: payload.totalItems,
      totalPrice: payload.totalPrice,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'Belum bayar',
      orderStatus: 'Menunggu',
      orderType: payload.orderType,
      tableNumber: payload.tableNumber,
      orderNotes: payload.orderNotes,
      createdAt: new Date().toISOString(),
    };

    // Await langsung tanpa timeout — pastikan data BENAR-BENAR tersimpan
    // di Firestore server sebelum diarahkan ke halaman sukses.
    // Jika gagal, tampilkan error nyata dan JANGAN navigasi agar user bisa coba lagi.
    await addTransactionAsync(transaction);
    navigate(`/pesanan/${transaction.id}`);
  };

  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <HeroSection />
        
        {/* Main Content */}
        <div className="flex">
          {/* Menu Section */}
          <div className="flex-1 min-w-0">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
            />
            <MenuGrid 
              menuItems={menuItems}
              searchQuery={searchQuery}
              activeCategory={activeCategory}
            />
            <Footer />
          </div>
          
          {/* Desktop Sidebar Cart */}
          <DesktopCart onCheckout={handleCheckout} />
        </div>

        {/* Mobile Floating Cart */}
        <Cart onCheckout={handleCheckout} />
      </div>
    </CartProvider>
  );
};

export default Index;
