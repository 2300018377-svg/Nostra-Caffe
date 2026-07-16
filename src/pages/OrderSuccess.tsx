import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/data/menuData';
import { getTransactions } from '@/lib/storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction } from '@/types/transaction';

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const OrderSuccess = () => {
  const { transactionId } = useParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) return;

    // Check local storage first
    const localTx = getTransactions().find((item) => item.id === transactionId);
    if (localTx) {
      setTransaction(localTx);
      setLoading(false);
    }

    const docRef = doc(db, 'transactions', transactionId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setTransaction(docSnap.data() as Transaction);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [transactionId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Memuat data pesanan...</p>
        </div>
      </main>
    );
  }

  if (!transaction) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <img src="/logo-nostra.png" alt="Logo Nostra-Caffe" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
          <h1 className="mb-2 text-2xl font-bold">Pesanan tidak ditemukan.</h1>
          <p className="mb-6 text-sm text-muted-foreground">Silakan kembali ke menu dan buat pesanan baru.</p>
          <Button asChild>
            <Link to="/">Kembali ke Menu</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <section className="mx-auto max-w-lg rounded-lg border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-6 text-center">
          <img src="/logo-nostra.png" alt="Logo Nostra-Caffe" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Pesanan Berhasil Dibuat</h1>
          <p className="text-sm text-muted-foreground">Simpan ID transaksi untuk pengecekan di kasir.</p>
        </div>

        <div className="space-y-3 rounded-md bg-muted/40 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">ID Transaksi</span>
            <strong className="text-right">{transaction.id}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Waktu</span>
            <strong className="text-right">{formatDateTime(transaction.createdAt)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Nama</span>
            <strong className="text-right">{transaction.customerName}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Tipe</span>
            <strong className="text-right">
              {transaction.orderType}
              {transaction.orderType === 'Dine in' && transaction.tableNumber ? ` - Meja ${transaction.tableNumber}` : ''}
            </strong>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Pembayaran</span>
            <strong>{transaction.paymentMethod}</strong>
          </div>
        </div>

        <div className="my-5 border-y py-4">
          <h2 className="mb-3 text-base font-semibold">Ringkasan Menu</h2>
          <div className="space-y-2 text-sm">
            {transaction.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0 break-words">{item.name} x{item.quantity}</span>
                <strong className="shrink-0">{formatPrice(item.subtotal)}</strong>
              </div>
            ))}
          </div>
          {transaction.orderNotes && (
            <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">Catatan</p>
              <p className="mt-1 text-muted-foreground">{transaction.orderNotes}</p>
            </div>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <span className="text-lg font-medium">Total</span>
          <strong className="text-2xl text-primary">{formatPrice(transaction.totalPrice)}</strong>
        </div>

        <div className="grid gap-2">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Menu
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default OrderSuccess;
