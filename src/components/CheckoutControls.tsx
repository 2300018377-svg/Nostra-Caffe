import { useEffect, useState } from 'react';
import { MessageCircle, QrCode, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrderType, PaymentMethod } from '@/types/transaction';

const qrisCandidates = ['/qris.png', '/qris.jpg', '/qris.jpeg'];

interface CheckoutControlsProps {
  idPrefix: string;
  customerName: string;
  setCustomerName: (value: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;
  orderType: OrderType;
  setOrderType: (value: OrderType) => void;
  tableNumber: string;
  setTableNumber: (value: string) => void;
  orderNotes: string;
  setOrderNotes: (value: string) => void;
  onCheckout: () => void;
  onWhatsApp: () => void;
  disabled?: boolean;
}

export const CheckoutControls = ({
  idPrefix,
  customerName,
  setCustomerName,
  paymentMethod,
  setPaymentMethod,
  orderType,
  setOrderType,
  tableNumber,
  setTableNumber,
  orderNotes,
  setOrderNotes,
  onCheckout,
  onWhatsApp,
  disabled = false,
}: CheckoutControlsProps) => {
  const customerNameId = `${idPrefix}-customer-name`;
  const paymentMethodId = `${idPrefix}-payment-method`;
  const orderTypeId = `${idPrefix}-order-type`;
  const tableNumberId = `${idPrefix}-table-number`;
  const orderNotesId = `${idPrefix}-order-notes`;
  const [qrisImage, setQrisImage] = useState<string | null>(null);

  useEffect(() => {
    if (paymentMethod !== 'QRIS') {
      return;
    }

    let cancelled = false;
    const loadImage = (src: string) =>
      new Promise<boolean>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image.naturalWidth > 0);
        image.onerror = () => resolve(false);
        image.src = src;
      });

    const findQrisImage = async () => {
      for (const candidate of qrisCandidates) {
        const exists = await loadImage(candidate);
        if (!cancelled && exists) {
          setQrisImage(candidate);
          return;
        }
      }

      if (!cancelled) {
        setQrisImage(null);
      }
    };

    findQrisImage();
    return () => {
      cancelled = true;
    };
  }, [paymentMethod]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor={customerNameId} className="text-sm font-medium text-foreground">
          Nama pemesan
        </label>
        <Input
          id={customerNameId}
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="Masukkan nama kamu"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={orderTypeId} className="text-sm font-medium text-foreground">
          Tipe pesanan
        </label>
        <select
          id={orderTypeId}
          value={orderType}
          onChange={(event) => setOrderType(event.target.value as OrderType)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="Dine in">Dine in</option>
          <option value="Take away">Take away</option>
        </select>
      </div>

      {orderType === 'Dine in' && (
        <div className="space-y-2">
          <label htmlFor={tableNumberId} className="text-sm font-medium text-foreground">
            Nomor meja
          </label>
          <Input
            id={tableNumberId}
            value={tableNumber}
            onChange={(event) => setTableNumber(event.target.value)}
            placeholder="Contoh: 7"
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor={orderNotesId} className="text-sm font-medium text-foreground">
          Catatan pesanan
        </label>
        <Textarea
          id={orderNotesId}
          value={orderNotes}
          onChange={(event) => setOrderNotes(event.target.value)}
          placeholder="Contoh: less ice, tanpa gula"
          className="min-h-20 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={paymentMethodId} className="text-sm font-medium text-foreground">
          Metode pembayaran
        </label>
        <select
          id={paymentMethodId}
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="Cash">Cash</option>
          <option value="QRIS">QRIS</option>
          <option value="Transfer">Transfer</option>
        </select>
      </div>

      {paymentMethod === 'QRIS' && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium text-primary">
            <QrCode className="h-4 w-4" />
            Informasi QRIS
          </div>
          {qrisImage ? (
            <img
              src={qrisImage}
              alt="QRIS Nostra-Caffe"
              className="mx-auto max-h-44 w-full rounded-md object-contain bg-white p-2"
            />
          ) : (
            <p className="text-muted-foreground">
              QRIS belum tersedia. Silakan bayar langsung ke kasir.
            </p>
          )}
        </div>
      )}

      <Button onClick={onCheckout} className="w-full" disabled={disabled}>
        <ReceiptText className="w-4 h-4 mr-2" />
        Buat Pesanan
      </Button>

      <Button onClick={onWhatsApp} variant="outline" className="w-full">
        <MessageCircle className="w-4 h-4 mr-2" />
        Kirim Ringkasan ke WhatsApp
      </Button>
    </div>
  );
};
