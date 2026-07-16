import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  DollarSign,
  Download,
  FileDown,
  ListChecks,
  LogOut,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categories, formatPrice } from '@/data/menuData';
import {
  deleteTransaction,
  getMenuItems,
  getTransactions,
  resetMenuItems,
  saveMenuItems,
  saveTransactions,
  StoredMenuItem,
  updateTransaction,
  subscribeToMenuItems,
  subscribeToTransactions,
} from '@/lib/storage';
import { OrderStatus, OrderType, PaymentStatus, Transaction } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';
import {
  createTransactionsCsv,
  getFilteredTransactions,
  getTransactionReport,
  toDateInputValue,
} from '@/lib/adminReports';
import { createBackupPayload, getBackupFileName, parseBackupPayload } from '@/lib/backup';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const orderStatuses: OrderStatus[] = ['Menunggu', 'Diproses', 'Selesai', 'Dibatalkan'];
const paymentStatuses: PaymentStatus[] = ['Belum bayar', 'Sudah bayar'];
const orderTypes: OrderType[] = ['Dine in', 'Take away'];
const adminCategories = categories.filter((category) => category.id !== 'all');

interface MenuFormState {
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  available: boolean;
}

const emptyMenuForm: MenuFormState = {
  name: '',
  description: '',
  price: '',
  image: '',
  category: 'coffee',
  available: true,
};

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getFallbackKeyword = (categoryId: string) => {
  return categories.find((category) => category.id === categoryId)?.fallbackKeyword ?? 'espresso';
};

const getCategoryName = (categoryId: string) => {
  return categories.find((category) => category.id === categoryId)?.name ?? categoryId;
};

const getOrderTypeDisplay = (transaction: Transaction) => {
  if (transaction.orderType === 'Dine in' && transaction.tableNumber) {
    return `${transaction.orderType} - Meja ${transaction.tableNumber}`;
  }

  return transaction.orderType;
};

const downloadTextFile = (fileName: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getMenuSearchScore = (menuName: string, query: string) => {
  const normalizedName = menuName.toLowerCase();

  if (normalizedName === query) {
    return 0;
  }

  if (normalizedName.startsWith(query)) {
    return 1;
  }

  if (normalizedName.split(/\s+/).some((word) => word.startsWith(query))) {
    return 2;
  }

  if (normalizedName.includes(query)) {
    return 3;
  }

  return 4;
};

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [registrationCode, setRegistrationCode] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => getTransactions());
  const [menuItems, setMenuItems] = useState<StoredMenuItem[]>(() => getMenuItems());
  const [menuForm, setMenuForm] = useState<MenuFormState>(emptyMenuForm);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [transactionPaymentFilter, setTransactionPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [transactionOrderFilter, setTransactionOrderFilter] = useState<OrderStatus | 'all'>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<OrderType | 'all'>('all');
  const [reportStartDate, setReportStartDate] = useState(() => toDateInputValue());
  const [reportEndDate, setReportEndDate] = useState(() => toDateInputValue());
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const { toast } = useToast();

  const isInitialLoad = useRef(true);

  const playOrderChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5
      gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.1);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (error) {
      console.error("Failed to play chime:", error);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'authorizedAdmins', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
        } catch (error) {
          console.error("Error verifying admin document:", error);
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
      setLoadingAuth(false);
    });

    const unsubscribeMenu = subscribeToMenuItems(setMenuItems);
    
    const unsubscribeTx = subscribeToTransactions((nextTx) => {
      setTransactions((prevTx) => {
        if (!isInitialLoad.current && nextTx.length > prevTx.length) {
          playOrderChime();
          toast({
            title: 'Pesanan Baru Masuk!',
            description: `Pesanan dari ${nextTx[0].customerName} baru saja diterima.`,
          });
        }
        return nextTx;
      });
      isInitialLoad.current = false;
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMenu();
      unsubscribeTx();
    };
  }, []);

  const report = useMemo(() => {
    return getTransactionReport(transactions, reportStartDate, reportEndDate);
  }, [reportEndDate, reportStartDate, transactions]);

  const chartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    
    if (reportStartDate && reportEndDate) {
      const start = new Date(reportStartDate);
      const end = new Date(reportEndDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        dailyMap[dateStr] = 0;
      }
    }

    report.transactions.forEach((tx) => {
      if (tx.paymentStatus === 'Sudah bayar' && tx.orderStatus !== 'Dibatalkan') {
        const dateStr = new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + tx.totalPrice;
      }
    });

    return Object.entries(dailyMap).map(([date, revenue]) => ({
      date,
      'Pendapatan (K)': revenue,
    }));
  }, [report.transactions, reportStartDate, reportEndDate]);

  const displayedTransactions = useMemo(() => {
    return getFilteredTransactions(transactions, {
      searchQuery: transactionSearchQuery,
      paymentStatus: transactionPaymentFilter,
      orderStatus: transactionOrderFilter,
      orderType: transactionTypeFilter,
    });
  }, [transactionOrderFilter, transactionPaymentFilter, transactionSearchQuery, transactionTypeFilter, transactions]);

  const displayedMenuItems = useMemo(() => {
    const normalizedQuery = menuSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return menuItems;
    }

    return menuItems
      .map((item, index) => ({
        item,
        index,
        searchScore: getMenuSearchScore(item.name, normalizedQuery),
      }))
      .sort((first, second) => first.searchScore - second.searchScore || first.index - second.index)
      .map(({ item }) => item);
  }, [menuItems, menuSearchQuery]);

  const handleGoogleLogin = async () => {
    setLoadingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login failed:", error);
      toast({
        title: 'Gagal login',
        description: 'Terjadi kesalahan saat masuk menggunakan Google.',
        variant: 'destructive',
      });
      setLoadingAuth(false);
    }
  };

  const handleRegistrationSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    if (registrationCode.trim() === 'nostra') {
      try {
        setLoadingAuth(true);
        const docRef = doc(db, 'authorizedAdmins', user.uid);
        await setDoc(docRef, {
          email: user.email,
          authorizedAt: new Date().toISOString()
        });
        setIsAuthorized(true);
        toast({
          title: 'Registrasi Berhasil',
          description: 'Anda telah resmi terdaftar sebagai Admin.',
        });
      } catch (error) {
        console.error("Failed to register admin UID in Firestore:", error);
        setRegistrationError('Gagal menyimpan akses admin ke database.');
      } finally {
        setLoadingAuth(false);
      }
    } else {
      setRegistrationError('Kode registrasi salah. Hubungi pemilik untuk mendapatkan kode.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Keluar berhasil',
        description: 'Anda telah keluar dari sesi admin.',
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const base64Url = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64Url);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Ukuran file terlalu besar',
        description: 'Maksimal ukuran gambar adalah 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await compressImageToBase64(file);
      setMenuForm((prev) => ({ ...prev, image: base64 }));
      toast({
        title: 'Gambar berhasil diproses',
        description: 'Gambar telah dikompresi untuk performa optimal.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Gagal memproses gambar',
        description: 'Pastikan file yang diunggah adalah gambar yang valid.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOrderStatusChange = (transactionId: string, orderStatus: OrderStatus) => {
    setTransactions(updateTransaction(transactionId, { orderStatus }));
  };

  const handlePaymentStatusChange = (transactionId: string, paymentStatus: PaymentStatus) => {
    setTransactions(updateTransaction(transactionId, { paymentStatus }));
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin menghapus transaksi ini? Data transaksi yang dihapus tidak dapat dikembalikan.'
    );

    if (!confirmed) {
      return;
    }

    setTransactions(deleteTransaction(transactionId));
    toast({
      title: 'Transaksi berhasil dihapus',
      description: 'Riwayat dan laporan penjualan sudah diperbarui.',
    });
  };

  const resetMenuForm = () => {
    setMenuForm(emptyMenuForm);
    setEditingMenuId(null);
  };

  const handleExportReportCsv = () => {
    if (report.transactions.length === 0) {
      toast({
        title: 'Tidak ada data laporan',
        description: 'Pilih rentang tanggal yang memiliki transaksi terlebih dahulu.',
      });
      return;
    }

    const csv = createTransactionsCsv(report.transactions);
    downloadTextFile(
      `laporan-nostra-caffe-${reportStartDate || 'awal'}-${reportEndDate || 'akhir'}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
  };

  const handleExportBackup = () => {
    const backup = createBackupPayload(menuItems, transactions);
    downloadTextFile(
      getBackupFileName(),
      JSON.stringify(backup, null, 2),
      'application/json;charset=utf-8'
    );
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const backup = parseBackupPayload(await file.text());
      const confirmed = window.confirm(
        'Import backup akan mengganti seluruh transaksi dan menu yang tersimpan di browser ini. Lanjutkan?'
      );

      if (!confirmed) {
        return;
      }

      saveMenuItems(backup.menuItems);
      saveTransactions(backup.transactions);
      setMenuItems(backup.menuItems);
      setTransactions(backup.transactions);
      resetMenuForm();
      toast({
        title: 'Backup berhasil dipulihkan',
        description: `${backup.menuItems.length} menu dan ${backup.transactions.length} transaksi sudah dimuat.`,
      });
    } catch {
      toast({
        title: 'Import backup gagal',
        description: 'Pastikan file yang dipilih adalah backup Nostra-Caffe yang valid.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleMenuSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const price = Number(menuForm.price);
    if (!menuForm.name.trim() || !Number.isFinite(price) || price <= 0) {
      toast({
        title: 'Data menu belum lengkap',
        description: 'Nama menu dan harga wajib diisi dengan benar.',
      });
      return;
    }

    const nextMenu: StoredMenuItem = {
      id: editingMenuId ?? `menu-${Date.now()}`,
      name: menuForm.name.trim(),
      description: menuForm.description.trim(),
      price,
      image: menuForm.image.trim() || 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=400&fit=crop',
      category: menuForm.category,
      fallbackKeyword: getFallbackKeyword(menuForm.category),
      available: menuForm.available,
    };

    const nextMenus = editingMenuId
      ? menuItems.map((item) => (item.id === editingMenuId ? nextMenu : item))
      : [nextMenu, ...menuItems];

    saveMenuItems(nextMenus);
    setMenuItems(nextMenus);
    resetMenuForm();
    toast({
      title: editingMenuId ? 'Menu berhasil diperbarui' : 'Menu berhasil ditambahkan',
      description: `${nextMenu.name} tersimpan di daftar menu.`,
    });
  };

  const handleEditMenu = (item: StoredMenuItem) => {
    setEditingMenuId(item.id);
    setMenuForm({
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      image: item.image,
      category: item.category,
      available: item.available,
    });
  };

  const handleDeleteMenu = (itemId: string) => {
    if (!window.confirm('Hapus menu ini dari daftar?')) {
      return;
    }

    const nextMenus = menuItems.filter((item) => item.id !== itemId);
    saveMenuItems(nextMenus);
    setMenuItems(nextMenus);
  };

  const handleToggleAvailable = (item: StoredMenuItem) => {
    const nextMenus = menuItems.map((menuItem) =>
      menuItem.id === item.id ? { ...menuItem, available: !menuItem.available } : menuItem
    );
    saveMenuItems(nextMenus);
    setMenuItems(nextMenus);
  };

  const handleResetMenu = () => {
    const firstConfirmation = window.confirm('Apakah Anda yakin ingin mereset menu?');
    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation = window.confirm(
      'Reset menu akan menghapus perubahan menu yang sudah dibuat dan mengembalikan data menu ke data awal. Tindakan ini tidak dapat dibatalkan. Lanjutkan reset menu?'
    );
    if (!secondConfirmation) {
      return;
    }

    setMenuItems(resetMenuItems());
    resetMenuForm();
    toast({
      title: 'Menu berhasil direset ke data awal.',
    });
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Memeriksa hak akses admin...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="mx-auto w-full max-w-md rounded-lg border bg-card p-6 shadow-sm text-center">
          <img
            src="/logo-nostra.png"
            alt="Logo Nostra-Caffe"
            className="mx-auto mb-4 h-24 w-24 rounded-full object-cover"
          />
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Masuk Admin/Kasir</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Gunakan akun Google terverifikasi Anda untuk mengakses dashboard pengelolaan.
          </p>
          <Button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2" variant="default">
            <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.35,11.1H12v2.7h5.38C16.88,16.06,14.77,18,12,18A6,6,0,1,1,18,12a5.79,5.79,0,0,1-.5,2.35l1.94,1.5A8.94,8.94,0,1,0,12,21c4.97,0,9-4.03,9-9A8.34,8.34,0,0,0,21.35,11.1Z" fill="currentColor"/>
            </svg>
            Masuk dengan Google
          </Button>
          <Button asChild type="button" variant="ghost" className="w-full mt-2">
            <Link to="/">Kembali ke Menu</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (user && !isAuthorized) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="mx-auto w-full max-w-md rounded-lg border bg-card p-6 shadow-sm text-center space-y-4">
          <img
            src="/logo-nostra.png"
            alt="Logo Nostra-Caffe"
            className="mx-auto mb-2 h-20 w-20 rounded-full object-cover"
          />
          <h1 className="text-xl font-bold">Kode Registrasi Diperlukan</h1>
          <p className="text-sm text-muted-foreground">
            Akun <strong>{user.email}</strong> belum terdaftar sebagai admin. Masukkan kode registrasi untuk memverifikasi.
          </p>
          
          <form onSubmit={handleRegistrationSubmit} className="space-y-4 text-left">
            <div className="space-y-2">
              <label htmlFor="reg-code" className="text-sm font-medium">
                Kode Registrasi
              </label>
              <Input
                id="reg-code"
                type="password"
                value={registrationCode}
                onChange={(e) => {
                  setRegistrationCode(e.target.value);
                  setRegistrationError('');
                }}
                placeholder="Masukkan kode rahasia"
              />
              {registrationError && (
                <p className="text-sm font-medium text-destructive">{registrationError}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Daftarkan Sebagai Admin
            </Button>
            <Button type="button" onClick={handleLogout} variant="ghost" className="w-full">
              Kembali / Ganti Akun
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 sm:py-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Dashboard admin/kasir &bull; {user?.email}</p>
            <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">Pengelolaan Transaksi</h1>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Menu
              </Link>
            </Button>
            <Button type="button" variant="secondary" onClick={handleLogout} className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Keluar Admin
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold leading-tight">Laporan Penjualan</h2>
              <p className="text-sm text-muted-foreground">Rekap transaksi berdasarkan rentang tanggal.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] md:w-auto">
              <label className="grid gap-1 text-sm font-medium">
                Dari
                <Input
                  type="date"
                  value={reportStartDate}
                  onChange={(event) => setReportStartDate(event.target.value)}
                  className="h-10"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Sampai
                <Input
                  type="date"
                  value={reportEndDate}
                  onChange={(event) => setReportEndDate(event.target.value)}
                  className="h-10"
                />
              </label>
              <Button type="button" variant="outline" onClick={handleExportReportCsv} className="self-end">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm sm:p-4">
              <ClipboardList className="mb-2 h-5 w-5 text-primary sm:mb-3 sm:h-6 sm:w-6" />
              <p className="text-sm text-muted-foreground">Transaksi periode</p>
              <p className="break-words text-xl font-bold sm:text-2xl">{report.totalTransactions}</p>
            </div>
            <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm sm:p-4">
              <DollarSign className="mb-2 h-5 w-5 text-primary sm:mb-3 sm:h-6 sm:w-6" />
              <p className="text-sm text-muted-foreground">Pendapatan periode</p>
              <p className="break-words text-xl font-bold sm:text-2xl">{formatPrice(report.totalRevenue)}</p>
            </div>
            <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm sm:p-4">
              <ListChecks className="mb-2 h-5 w-5 text-primary sm:mb-3 sm:h-6 sm:w-6" />
              <p className="text-sm text-muted-foreground">Pesanan selesai</p>
              <p className="break-words text-xl font-bold sm:text-2xl">{report.completedOrders}</p>
            </div>
            <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm sm:p-4">
              <Trash2 className="mb-2 h-5 w-5 text-primary sm:mb-3 sm:h-6 sm:w-6" />
              <p className="text-sm text-muted-foreground">Pesanan dibatalkan</p>
              <p className="break-words text-xl font-bold sm:text-2xl">{report.canceledOrders}</p>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-semibold leading-tight">Grafik Tren Pendapatan</h3>
                <p className="text-sm text-muted-foreground">Grafik tren pendapatan harian dari transaksi sukses.</p>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tickLine={false} style={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${val}k`} style={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }} />
                    <Tooltip formatter={(value: any) => [formatPrice(Number(value)), 'Pendapatan']} contentStyle={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="Pendapatan (K)" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold leading-tight">Backup Data</h2>
              <p className="text-sm text-muted-foreground">Simpan atau pulihkan menu dan transaksi dari file JSON.</p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button type="button" variant="outline" onClick={handleExportBackup}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Backup
              </Button>
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="h-4 w-4" />
                Import Backup
                <input type="file" accept="application/json,.json" onChange={handleImportBackup} className="sr-only" />
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold leading-tight">Transaksi Masuk dan Riwayat</h2>
              <p className="text-sm text-muted-foreground">Ubah status, cetak nota, atau hapus transaksi.</p>
            </div>
            <p className="text-sm font-medium text-primary">
              {displayedTransactions.length} dari {transactions.length} transaksi
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_160px]">
              <div className="relative">
                <label htmlFor="transaction-search" className="sr-only">
                  Cari transaksi
                </label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="transaction-search"
                  value={transactionSearchQuery}
                  onChange={(event) => setTransactionSearchQuery(event.target.value)}
                  placeholder="Cari customer, ID, menu, meja"
                  className="h-10 pl-9 pr-10"
                />
                {transactionSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTransactionSearchQuery('')}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Bersihkan pencarian transaksi"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <label className="grid gap-1 text-sm font-medium">
                Pembayaran
                <select
                  value={transactionPaymentFilter}
                  onChange={(event) => setTransactionPaymentFilter(event.target.value as PaymentStatus | 'all')}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Semua</option>
                  {paymentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Status pesanan
                <select
                  value={transactionOrderFilter}
                  onChange={(event) => setTransactionOrderFilter(event.target.value as OrderStatus | 'all')}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Semua</option>
                  {orderStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Tipe
                <select
                  value={transactionTypeFilter}
                  onChange={(event) => setTransactionTypeFilter(event.target.value as OrderType | 'all')}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Semua</option>
                  {orderTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {displayedTransactions.length === 0 ? (
              <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
                Belum ada transaksi yang sesuai.
              </div>
            ) : (
              displayedTransactions.map((transaction) => {
                const receiptReady =
                  transaction.orderStatus === 'Selesai' || transaction.paymentStatus === 'Sudah bayar';

                return (
                  <article key={transaction.id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold">{transaction.customerName}</h3>
                        <p className="text-xs text-muted-foreground">{formatDateTime(transaction.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold text-primary">{formatPrice(transaction.totalPrice)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Item</p>
                        <p className="font-medium">{transaction.totalItems}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Metode</p>
                        <p className="font-medium">{transaction.paymentMethod}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Tipe pesanan</p>
                        <p className="font-medium">{getOrderTypeDisplay(transaction)}</p>
                      </div>
                      {transaction.orderNotes && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Catatan</p>
                          <p className="font-medium">{transaction.orderNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Daftar menu</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {transaction.items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-3">
                            <span className="min-w-0 break-words">{item.name}</span>
                            <span className="shrink-0 font-medium">x{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <label className="grid gap-1 text-sm font-medium">
                        Pembayaran
                        <select
                          value={transaction.paymentStatus}
                          onChange={(event) =>
                            handlePaymentStatusChange(transaction.id, event.target.value as PaymentStatus)
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {paymentStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm font-medium">
                        Status pesanan
                        <select
                          value={transaction.orderStatus}
                          onChange={(event) =>
                            handleOrderStatusChange(transaction.id, event.target.value as OrderStatus)
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {orderStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {!receiptReady && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Ideal dicetak setelah selesai atau sudah bayar.
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link to={`/nota/${transaction.id}`}>
                          <Printer className="w-4 h-4 mr-1" />
                          Cetak
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-sm md:block">
            <table className="w-full min-w-[1320px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-3 font-semibold">Waktu</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Tipe</th>
                  <th className="px-3 py-3 font-semibold">Catatan</th>
                  <th className="px-3 py-3 font-semibold">Daftar menu</th>
                  <th className="px-3 py-3 font-semibold">Item</th>
                  <th className="px-3 py-3 font-semibold">Total</th>
                  <th className="px-3 py-3 font-semibold">Metode</th>
                  <th className="px-3 py-3 font-semibold">Pembayaran</th>
                  <th className="px-3 py-3 font-semibold">Status pesanan</th>
                  <th className="px-3 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                      Belum ada transaksi yang sesuai.
                    </td>
                  </tr>
                ) : (
                  displayedTransactions.map((transaction) => {
                    const receiptReady =
                      transaction.orderStatus === 'Selesai' || transaction.paymentStatus === 'Sudah bayar';

                    return (
                      <tr key={transaction.id} className="border-b last:border-0">
                        <td className="px-3 py-3 align-top">{formatDateTime(transaction.createdAt)}</td>
                        <td className="px-3 py-3 align-top font-medium">{transaction.customerName}</td>
                        <td className="px-3 py-3 align-top">{getOrderTypeDisplay(transaction)}</td>
                        <td className="px-3 py-3 align-top">{transaction.orderNotes || '-'}</td>
                        <td className="px-3 py-3 align-top">
                          {transaction.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
                        </td>
                        <td className="px-3 py-3 align-top">{transaction.totalItems}</td>
                        <td className="px-3 py-3 align-top font-semibold">{formatPrice(transaction.totalPrice)}</td>
                        <td className="px-3 py-3 align-top">{transaction.paymentMethod}</td>
                        <td className="px-3 py-3 align-top">
                          <select
                            value={transaction.paymentStatus}
                            onChange={(event) =>
                              handlePaymentStatusChange(transaction.id, event.target.value as PaymentStatus)
                            }
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {paymentStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <select
                            value={transaction.orderStatus}
                            onChange={(event) =>
                              handleOrderStatusChange(transaction.id, event.target.value as OrderStatus)
                            }
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {orderStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/nota/${transaction.id}`}>
                                <Printer className="w-4 h-4 mr-1" />
                                Cetak Nota
                              </Link>
                            </Button>
                            {!receiptReady && (
                              <p className="max-w-36 text-xs text-muted-foreground">
                                Ideal dicetak setelah selesai atau sudah bayar.
                              </p>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={handleMenuSubmit} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold leading-tight">{editingMenuId ? 'Edit Menu' : 'Tambah Menu'}</h2>
              <p className="text-sm text-muted-foreground">Data menu tersimpan di penyimpanan browser.</p>
            </div>

            <div className="space-y-3">
              <Input
                value={menuForm.name}
                onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })}
                placeholder="Nama menu"
              />
              <Input
                value={menuForm.description}
                onChange={(event) => setMenuForm({ ...menuForm, description: event.target.value })}
                placeholder="Deskripsi singkat"
              />
              <Input
                type="number"
                min="1"
                value={menuForm.price}
                onChange={(event) => setMenuForm({ ...menuForm, price: event.target.value })}
                placeholder="Harga dalam K, contoh 22"
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Gambar Menu (Maks 2MB, Rekomendasi 1:1)</label>
                {menuForm.image && (
                  <div className="relative aspect-square w-24 overflow-hidden rounded-md border bg-muted">
                    <img src={menuForm.image} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMenuForm((prev) => ({ ...prev, image: '' }))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="cursor-pointer text-sm"
                  disabled={isUploading}
                />
                {isUploading && <p className="text-xs text-primary animate-pulse">Mengompresi gambar...</p>}
              </div>
              <select
                value={menuForm.category}
                onChange={(event) => setMenuForm({ ...menuForm, category: event.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {adminCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={menuForm.available}
                  onChange={(event) => setMenuForm({ ...menuForm, available: event.target.checked })}
                />
                Menu tersedia
              </label>
            </div>

            <div className="mt-4 grid gap-2">
              <Button type="submit" disabled={isUploading}>
                <Plus className="w-4 h-4 mr-2" />
                {editingMenuId ? 'Simpan Perubahan' : 'Tambah Menu'}
              </Button>
              {editingMenuId && (
                <Button type="button" variant="outline" onClick={resetMenuForm}>
                  Batal Edit
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={handleResetMenu}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Menu
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold leading-tight">Pengelolaan Menu</h2>
                <p className="text-sm text-muted-foreground">Menu yang tidak tersedia tidak tampil di halaman customer.</p>
              </div>
              <div className="relative w-full md:max-w-xs">
                <label htmlFor="menu-search" className="sr-only">
                  Cari nama menu
                </label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="menu-search"
                  value={menuSearchQuery}
                  onChange={(event) => setMenuSearchQuery(event.target.value)}
                  placeholder="Cari nama menu"
                  className="h-10 pl-9 pr-10"
                />
                {menuSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMenuSearchQuery('')}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:hidden">
              {displayedMenuItems.map((item) => (
                <article key={item.id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{getCategoryName(item.category)}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-primary">{formatPrice(item.price)}</p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(item)}
                      className={`w-full rounded-md px-3 py-2 text-sm font-medium ${
                        item.available
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.available ? 'Tersedia' : 'Tidak tersedia'}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleEditMenu(item)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => handleDeleteMenu(item.id)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-sm md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Nama</th>
                    <th className="px-3 py-3 font-semibold">Kategori</th>
                    <th className="px-3 py-3 font-semibold">Harga</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMenuItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium">{item.name}</td>
                      <td className="px-3 py-3">{getCategoryName(item.category)}</td>
                      <td className="px-3 py-3">{formatPrice(item.price)}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailable(item)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item.available
                              ? 'bg-green-100 text-green-700'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {item.available ? 'Tersedia' : 'Tidak tersedia'}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => handleEditMenu(item)}>
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => handleDeleteMenu(item.id)}>
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Admin;
