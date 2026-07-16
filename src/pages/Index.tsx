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
import { addTransaction, addTransactionAsync, getMenuItems, subscribeToMenuItems, StoredMenuItem } from '@/lib/storage';
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

    try {
      // Lakukan penulisan ke Firestore dengan batas waktu 1.5 detik.
      // Jika jaringan cepat, selesai instan. Jika menolak/eror (misal Permission Denied), tampilkan toast eror.
      // Jika lambat/offline, timeout akan terlampaui dan pesanan tetap diproses via background sync.
      await Promise.race([
        addTransactionAsync(transaction),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
      
      toast({
        title: 'Pesanan berhasil dibuat',
        description: `Transaksi ${transaction.id} tersimpan untuk ${transaction.customerName}.`,
      });
      navigate(`/pesanan/${transaction.id}`);
    } catch (error: any) {
      console.error('Failed to place order in Firestore:', error);
      // Fallback: Tulis secara lokal jika ditolak agar transaksi tidak hilang bagi pelanggan
      addTransaction(transaction);
      toast({
        title: 'Sinkronisasi database tertunda',
        description: `Status: ${error?.message || 'Database offline atau menolak akses. Pesanan akan disinkronkan di latar belakang.'}`,
        variant: 'destructive',
      });
      navigate(`/pesanan/${transaction.id}`);
    }
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
