import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Check, Loader2, Wifi, WifiOff } from 'lucide-react';
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

  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'failed'>('syncing');

  useEffect(() => {
    if (!transactionId) return;

    // Baca dari localStorage dulu agar halaman tampil INSTAN tanpa menunggu Firestore.
    const localTx = getTransactions().find((item) => item.id === transactionId);
    if (localTx) {
      setTransaction(localTx);
      setLoading(false);
    }

    // includeMetadataChanges: true agar kita bisa membedakan data dari server vs cache lokal.
    // fromCache: false + hasPendingWrites: false = data sudah benar-benar dikonfirmasi server.
    const docRef = doc(db, 'transactions', transactionId);
    const unsubscribe = onSnapshot(docRef, { includeMetadataChanges: true }, (docSnap) => {
      if (docSnap.exists()) {
        setTransaction(docSnap.data() as Transaction);
        // Hanya tandai 'synced' jika SERVER yang mengkonfirmasi — bukan cache lokal/pending write.
        if (!docSnap.metadata.fromCache && !docSnap.metadata.hasPendingWrites) {
          setSyncStatus('synced');
        }
      } else if (!docSnap.metadata.hasPendingWrites) {
        // Dokumen tidak ada di server dan tidak ada pending write → sync gagal
        if (!localTx) setSyncStatus('failed');
      }
      setLoading(false);
    }, () => {
      setSyncStatus('failed');
      setLoading(false);
    });

    // Jika setelah 25 detik server belum konfirmasi, tandai sebagai gagal.
    const failTimer = setTimeout(() => {
      setSyncStatus((prev) => prev === 'syncing' ? 'failed' : prev);
    }, 25000);

    return () => {
      unsubscribe();
      clearTimeout(failTimer);
    };
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
          {/* Sync status badge */}
          <div className="mt-2 flex justify-center">
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 border border-amber-500/20">
                <Loader2 className="h-3 w-3 animate-spin" />
                Menyinkronkan ke server...
              </span>
            )}
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                <Wifi className="h-3 w-3" />
                Tersimpan & dikirim ke kasir
              </span>
            )}
            {syncStatus === 'failed' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 border border-red-500/20">
                <WifiOff className="h-3 w-3" />
                Koneksi server bermasalah — tunjukkan ID ke kasir
              </span>
            )}
          </div>
        </div>

        {/* Real-time Order Status Stepper */}
        <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Status Pemrosesan Pesanan</h3>
          
          <div className="relative flex items-center justify-between px-2">
            {/* Background line */}
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-muted -z-0" />
            
            {/* Progress line */}
            <div 
              className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-500 -z-0 animate-none"
              style={{
                width: 
                  transaction.orderStatus === 'Menunggu' ? '0%' :
                  transaction.orderStatus === 'Diproses' ? '50%' :
                  transaction.orderStatus === 'Selesai' ? '100%' : '0%'
              }}
            />

            {/* Steppers */}
            {/* Step 1: Menunggu */}
            <div className="flex flex-col items-center gap-1.5 z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  transaction.orderStatus === 'Menunggu' 
                    ? 'bg-amber-500 text-white border-amber-600 scale-110 shadow-lg shadow-amber-500/20 animate-pulse'
                    : 'bg-primary text-primary-foreground border-primary'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground">Diterima</span>
            </div>

            {/* Step 2: Diproses */}
            <div className="flex flex-col items-center gap-1.5 z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  transaction.orderStatus === 'Diproses'
                    ? 'bg-blue-500 text-white border-blue-600 scale-110 shadow-lg shadow-blue-500/20 animate-none'
                    : transaction.orderStatus === 'Selesai'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-muted'
                }`}
              >
                <svg className={`w-4 h-4 ${transaction.orderStatus === 'Diproses' ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32 8" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-foreground">Diproses</span>
            </div>

            {/* Step 3: Selesai */}
            <div className="flex flex-col items-center gap-1.5 z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  transaction.orderStatus === 'Selesai'
                    ? 'bg-emerald-500 text-white border-emerald-600 scale-110 shadow-lg shadow-emerald-500/20'
                    : 'bg-background text-muted-foreground border-muted'
                }`}
              >
                <Check className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-foreground">Selesai</span>
            </div>
          </div>
          
          <div className="text-center bg-muted/40 p-2.5 rounded-lg border text-xs text-muted-foreground font-semibold">
            {transaction.orderStatus === 'Menunggu' && 'Pesanan diterima! Barista kami akan segera menyiapkan pesanan Anda.'}
            {transaction.orderStatus === 'Diproses' && 'Pesanan Anda sedang dalam proses pembuatan/antrean kopi.'}
            {transaction.orderStatus === 'Selesai' && 'Pesanan selesai dibuat! Silakan nikmati atau ambil di meja kasir.'}
            {transaction.orderStatus === 'Dibatalkan' && 'Maaf, pesanan ini telah dibatalkan.'}
          </div>
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
