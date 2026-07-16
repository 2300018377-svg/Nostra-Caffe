import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, MessageCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/data/menuData';
import { getTransactions } from '@/lib/storage';
import { downloadReceiptPdf, shareReceiptPdf } from '@/lib/receiptPdf';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Transaction } from '@/types/transaction';

const fallbackShareMessage =
  'Browser tidak mendukung berbagi file PDF otomatis. Nota akan diunduh terlebih dahulu, lalu silakan kirim PDF tersebut ke WhatsApp secara manual.';

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));
};

const Receipt = () => {
  const { transactionId } = useParams();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'authorizedAdmins', currentUser.uid);
          const docSnap = await getDoc(docRef);
          setIsAdmin(docSnap.exists());
        } catch (error) {
          console.error("Error checking receipt page admin auth:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoadingAdmin(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!transactionId || !isAdmin) return;

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
  }, [transactionId, isAdmin]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!transaction) {
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await downloadReceiptPdf(transaction);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!transaction) {
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const result = await shareReceiptPdf(transaction);
      if (result === 'unsupported') {
        window.alert(fallbackShareMessage);
        await downloadReceiptPdf(transaction);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loadingAdmin) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Memeriksa hak akses...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <img src="/logo-nostra.png" alt="Logo Nostra-Caffe" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
          <h1 className="mb-2 text-2xl font-bold">Nota khusus admin/kasir.</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Ringkasan pesanan pembeli bukan nota resmi. Silakan masuk sebagai admin/kasir untuk mencetak nota.
          </p>
          <Button asChild>
            <Link to="/admin">Masuk Admin/Kasir</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Memuat data nota...</p>
        </div>
      </main>
    );
  }

  if (!transaction) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <img src="/logo-nostra.png" alt="Logo Nostra-Caffe" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
          <h1 className="mb-2 text-2xl font-bold">Transaksi tidak ditemukan.</h1>
          <p className="mb-6 text-sm text-muted-foreground">Periksa kembali ID transaksi dari dashboard admin/kasir.</p>
          <Button asChild>
            <Link to="/admin">Kembali ke Admin</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted px-4 py-6 print:bg-white">
      <div className="mx-auto mb-4 flex max-w-md flex-wrap gap-2 print:hidden">
        <Button asChild variant="outline">
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Link>
        </Button>
        <Button onClick={handlePrint} disabled={isGeneratingPdf}>
          <Printer className="h-4 w-4 mr-2" />
          Cetak Nota
        </Button>
        <Button onClick={handleDownloadPdf} variant="secondary" disabled={isGeneratingPdf}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button onClick={handleShareWhatsApp} variant="outline" disabled={isGeneratingPdf}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Bagikan PDF ke WhatsApp
        </Button>
      </div>

      <section className="mx-auto max-w-md rounded-lg bg-white p-6 text-slate-950 shadow-lg print:shadow-none">
        <header className="border-b border-dashed border-slate-300 pb-4 text-center">
          <img src="/logo-nostra.png" alt="Logo Nostra-Caffe" className="mx-auto mb-3 h-20 w-20 rounded-full object-cover" />
          <h1 className="text-2xl font-bold">Nostra-Caffe</h1>
          <p className="text-sm text-slate-500">Nota Transaksi</p>
        </header>

        <div className="space-y-2 border-b border-dashed border-slate-300 py-4 text-sm">
          <div className="flex justify-between gap-4">
            <span>ID Transaksi</span>
            <strong className="text-right">{transaction.id}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Waktu</span>
            <strong className="text-right">{formatDateTime(transaction.createdAt)}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Customer</span>
            <strong className="text-right">{transaction.customerName}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Tipe Pesanan</span>
            <strong className="text-right">
              {transaction.orderType}
              {transaction.orderType === 'Dine in' && transaction.tableNumber ? ` - Meja ${transaction.tableNumber}` : ''}
            </strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Metode</span>
            <strong>{transaction.paymentMethod}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Status Bayar</span>
            <strong>{transaction.paymentStatus}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Status Pesanan</span>
            <strong>{transaction.orderStatus}</strong>
          </div>
          {transaction.orderNotes && (
            <div className="gap-2">
              <span>Catatan</span>
              <strong className="block pt-1 text-right">{transaction.orderNotes}</strong>
            </div>
          )}
        </div>

        <div className="border-b border-dashed border-slate-300 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Menu</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Harga</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {transaction.items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatPrice(item.price)}</td>
                  <td className="py-2 text-right">{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 py-4 text-sm">
          <div className="flex justify-between">
            <span>Jumlah item</span>
            <strong>{transaction.totalItems}</strong>
          </div>
          <div className="flex justify-between text-lg">
            <span>Total</span>
            <strong>{formatPrice(transaction.totalPrice)}</strong>
          </div>
        </div>

        <footer className="border-t border-dashed border-slate-300 pt-4 text-center text-sm text-slate-600">
          Terima kasih telah memesan di Nostra-Caffe.
        </footer>
      </section>
    </main>
  );
};

export default Receipt;
