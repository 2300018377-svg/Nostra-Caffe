import { useState } from 'react';
import { ShoppingBag, Plus, Minus, Trash2, Instagram, ShoppingCart } from 'lucide-react';
import { useCartContext } from '@/context/CartContext';
import { formatPrice } from '@/data/menuData';
import { ImageWithFallback } from './ImageWithFallback';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CheckoutControls } from './CheckoutControls';
import { CheckoutPayload, OrderType, PaymentMethod } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

interface CartProps {
  onCheckout: (payload: CheckoutPayload) => void;
}

export const Cart = ({ onCheckout }: CartProps) => {
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [orderType, setOrderType] = useState<OrderType>('Dine in');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const { toast } = useToast();
  const {
    items,
    isOpen,
    setIsOpen,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    generateOrderSummary,
    cartIconRef,
    isShaking,
  } = useCartContext();

  const handleWhatsApp = () => {
    const message = encodeURIComponent(generateOrderSummary({
      customerName: customerName.trim(),
      paymentMethod,
      orderType,
      tableNumber: tableNumber.trim(),
      orderNotes: orderNotes.trim(),
    }));
    window.open(`https://wa.me/6282178695665?text=${message}`, '_blank');
  };

  const handleCheckout = () => {
    const trimmedName = customerName.trim();
    if (!trimmedName) {
      toast({
        title: 'Nama pemesan wajib diisi',
        description: 'Masukkan nama sebelum membuat pesanan.',
      });
      return;
    }

    const trimmedTableNumber = tableNumber.trim();
    if (orderType === 'Dine in' && !trimmedTableNumber) {
      toast({
        title: 'Nomor meja wajib diisi',
        description: 'Masukkan nomor meja untuk pesanan dine in.',
      });
      return;
    }

    onCheckout({
      customerName: trimmedName,
      paymentMethod,
      orderType,
      tableNumber: orderType === 'Dine in' ? trimmedTableNumber : '',
      orderNotes: orderNotes.trim(),
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      })),
      totalItems,
      totalPrice,
    });
    clearCart();
    setCustomerName('');
    setPaymentMethod('Cash');
    setOrderType('Dine in');
    setTableNumber('');
    setOrderNotes('');
    setIsOpen(false);
  };

  const handleInstagram = () => {
    window.open('https://www.instagram.com/noka.yogyakarta', '_blank');
  };

  const handleShopeeFood = () => {
    window.open('https://shopee.co.id/universal-link/now-food/shop/22056334', '_blank');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div
          ref={cartIconRef}
          className={`fixed bottom-6 right-6 z-50 lg:hidden ${isShaking ? 'animate-shake' : ''}`}
        >
          <button
            className="btn-accent w-16 h-16 rounded-full shadow-xl flex items-center justify-center relative"
            aria-label="Keranjang belanja"
          >
            <ShoppingBag className="w-7 h-7" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </SheetTrigger>

      {/* Desktop Cart Icon in Header */}
      <div
        ref={cartIconRef}
        className={`hidden lg:block ${isShaking ? 'animate-shake' : ''}`}
      />

      <SheetContent className="flex h-dvh w-full flex-col overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-6 pb-4 pt-6 pr-12">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Keranjang Kamu
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <ShoppingBag className="w-20 h-20 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Keranjang masih kosong
            </h3>
            <p className="text-muted-foreground text-sm">
              Yuk, pilih menu favoritmu!
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* Cart Items */}
            <div className="py-4 space-y-4">
              {items.map((item) => (
                <div 
                  key={item.id}
                  className="flex gap-4 p-3 bg-secondary/30 rounded-xl"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.name}
                      fallbackKeyword={item.fallbackKeyword}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-primary font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-auto w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t pt-4 space-y-4">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              <CheckoutControls
                idPrefix="mobile-checkout"
                customerName={customerName}
                setCustomerName={setCustomerName}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                orderType={orderType}
                setOrderType={setOrderType}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                orderNotes={orderNotes}
                setOrderNotes={setOrderNotes}
                onCheckout={handleCheckout}
                onWhatsApp={handleWhatsApp}
                disabled={items.length === 0}
              />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={handleInstagram}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90 text-white px-2 text-xs"
                >
                  <Instagram className="w-5 h-5 mr-2" />
                  Instagram
                </Button>
                <Button 
                  onClick={handleShopeeFood}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-2 text-xs"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Shopee
                </Button>
              </div>

              {/* Clear Cart */}
              <Button 
                onClick={clearCart}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Kosongkan Keranjang
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
