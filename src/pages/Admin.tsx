import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ClipboardList,
  DollarSign,
  Download,
  ListChecks,
  LogOut,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
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

import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'reports' | 'menu'>('queue');
  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to 7 days ago
    return toDateInputValue(date);
  });
  const [reportEndDate, setReportEndDate] = useState(() => toDateInputValue());
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<{ customerName: string; id: string; totalPrice: number } | null>(null);
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
    let unsubscribeAdminSnap: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous admin document snapshot listener
      if (unsubscribeAdminSnap) {
        unsubscribeAdminSnap();
        unsubscribeAdminSnap = null;
      }

      if (currentUser) {
        const docRef = doc(db, 'authorizedAdmins', currentUser.uid);
        unsubscribeAdminSnap = onSnapshot(
          docRef,
          (docSnap) => {
            setIsAuthorized(docSnap.exists());
            setLoadingAuth(false);
          },
          (error) => {
            console.error("Error verifying admin document:", error);
            setIsAuthorized(false);
            setLoadingAuth(false);
          }
        );
      } else {
        setIsAuthorized(false);
        setLoadingAuth(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeAdminSnap) {
        unsubscribeAdminSnap();
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    const unsubscribeMenu = subscribeToMenuItems(setMenuItems);
    
    const unsubscribeTx = subscribeToTransactions((nextTx) => {
      setTransactions((prevTx) => {
        if (!isInitialLoad.current && nextTx.length > prevTx.length) {
          playOrderChime();
          const newOrder = nextTx[0];
          setNewOrderAlert({
            id: newOrder.id,
            customerName: newOrder.customerName,
            totalPrice: newOrder.totalPrice,
          });
        }
        return nextTx;
      });
      isInitialLoad.current = false;
    });

    return () => {
      unsubscribeMenu();
      unsubscribeTx();
    };
  }, [isAuthorized, toast]);

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
    const baseFiltered = getFilteredTransactions(transactions, {
      searchQuery: transactionSearchQuery,
      paymentStatus: transactionPaymentFilter,
      orderStatus: transactionOrderFilter,
      orderType: transactionTypeFilter,
    });

    if (activeTab === 'queue') {
      return baseFiltered.filter((tx) => tx.orderStatus === 'Menunggu' || tx.orderStatus === 'Diproses');
    } else if (activeTab === 'history') {
      return baseFiltered.filter((tx) => tx.orderStatus === 'Selesai' || tx.orderStatus === 'Dibatalkan');
    }

    return baseFiltered;
  }, [activeTab, transactionOrderFilter, transactionPaymentFilter, transactionSearchQuery, transactionTypeFilter, transactions]);

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

  const handlePrintReportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Gagal mencetak',
        description: 'Bloker pop-up aktif. Harap izinkan pop-up untuk mencetak.',
        variant: 'destructive',
      });
      return;
    }

    const startStr = reportStartDate ? formatDateTime(reportStartDate) : 'Awal';
    const endStr = reportEndDate ? formatDateTime(reportEndDate) : 'Akhir';
    const printTimeStr = new Date().toLocaleString('id-ID');

    const transactionsRowsHtml = report.transactions.length === 0
      ? `<tr><td colspan="9" style="text-align: center; padding: 12px; border: 1px solid #cbd5e1; color: #64748b;">Tidak ada transaksi</td></tr>`
      : report.transactions.map((tx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; white-space: nowrap;">${formatDateTime(tx.createdAt)}</td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">${tx.id}</td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; font-weight: bold;">${tx.customerName}</td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">${getOrderTypeDisplay(tx)}</td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1; max-width: 200px; word-wrap: break-word;">
            ${tx.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
          </td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">${tx.paymentMethod}</td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">${tx.paymentStatus}</td>
          <td style="padding: 8px; border-right: 1px solid #cbd5e1;">${tx.orderStatus}</td>
          <td style="padding: 8px; font-weight: bold; text-align: right;">${formatPrice(tx.totalPrice)}</td>
        </tr>
      `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Penjualan - Nostra-Caffe</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #cbd5e1;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .logo {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
          }
          .title {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
          }
          .subtitle {
            margin: 4px 0 0 0;
            font-size: 14px;
            color: #64748b;
          }
          .meta-right {
            text-align: right;
          }
          .meta-right p {
            margin: 2px 0;
            font-size: 12px;
          }
          .meta-right .period {
            font-weight: bold;
            font-size: 14px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }
          .summary-card {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
            background-color: #f8fafc;
          }
          .summary-label {
            margin: 0;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.05em;
          }
          .summary-value {
            margin: 6px 0 0 0;
            font-size: 20px;
            font-weight: 800;
          }
          .table-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #334155;
            margin-bottom: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            border: 1px solid #cbd5e1;
            margin-bottom: 24px;
          }
          th {
            background-color: #f1f5f9;
            padding: 10px;
            font-weight: bold;
            border-bottom: 1px solid #cbd5e1;
            border-right: 1px solid #cbd5e1;
            text-align: left;
          }
          th:last-child, td:last-child {
            border-right: none;
          }
          td {
            padding: 8px;
            border-right: 1px solid #cbd5e1;
            vertical-align: top;
          }
          .footer {
            border-top: 1px dashed #94a3b8;
            padding-top: 24px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <img src="/logo-nostra.png" alt="Logo" class="logo" />
            <div>
              <h1 class="title">Nostra-Caffe</h1>
              <p class="subtitle">Laporan Penjualan Harian & Analitis</p>
            </div>
          </div>
          <div class="meta-right">
            <p class="period">Periode Laporan</p>
            <p style="color: #475569;">${startStr} s/d ${endStr}</p>
            <p style="color: #94a3b8; font-size: 10px; margin-top: 4px;">Dicetak pada: ${printTimeStr}</p>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <p class="summary-label">Total Transaksi</p>
            <p class="summary-value">${report.totalTransactions}</p>
          </div>
          <div class="summary-card">
            <p class="summary-label">Total Pendapatan</p>
            <p class="summary-value" style="color: #059669;">${formatPrice(report.totalRevenue)}</p>
          </div>
          <div class="summary-card">
            <p class="summary-label">Pesanan Selesai</p>
            <p class="summary-value" style="color: #2563eb;">${report.completedOrders}</p>
          </div>
          <div class="summary-card">
            <p class="summary-label">Pesanan Batal</p>
            <p class="summary-value" style="color: #e11d48;">${report.canceledOrders}</p>
          </div>
        </div>

        <div class="table-title">Rincian Transaksi</div>
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>ID Transaksi</th>
              <th>Customer</th>
              <th>Tipe</th>
              <th>Daftar Menu (Qty)</th>
              <th>Metode</th>
              <th>Bayar</th>
              <th>Status</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${transactionsRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <p>Nostra-Caffe © ${new Date().getFullYear()} - Dokumen Laporan Penjualan Resmi</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 150);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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
    const tx = transactions.find(t => t.id === transactionId);
    const updates: Partial<Transaction> = { orderStatus };
    if (orderStatus === 'Selesai' && tx && tx.paymentStatus === 'Belum bayar') {
      updates.paymentStatus = 'Sudah bayar';
    }
    setTransactions(updateTransaction(transactionId, updates));
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
    <div className="min-h-screen bg-background">
      {/* High-Contrast Order Alert Notification */}
      {newOrderAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-slide-down">
          <div className="bg-destructive text-destructive-foreground p-4 rounded-xl shadow-2xl flex items-center justify-between border-2 border-white/20 relative overflow-hidden">
            {/* Pulsing light behind */}
            <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
            
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-extrabold text-base tracking-wide animate-pulse">PESANAN BARU MASUK!</h4>
                <p className="text-sm font-semibold opacity-95">{newOrderAlert.customerName} ({formatPrice(newOrderAlert.totalPrice)})</p>
              </div>
            </div>
            
            <div className="flex gap-2 z-10 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                className="font-bold text-xs"
                onClick={() => {
                  setActiveTab('queue');
                  setNewOrderAlert(null);
                }}
              >
                Lihat
              </Button>
              <button
                onClick={() => setNewOrderAlert(null)}
                className="p-1 hover:bg-white/10 rounded-full text-white/80 hover:text-white"
                aria-label="Tutup notifikasi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

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
        
        {/* Tab Navigation sticky bar */}
        <div className="flex border-b bg-card/50 backdrop-blur sticky top-0 z-10 overflow-x-auto justify-start sm:justify-center border border-border rounded-lg shadow-sm">
          <div className="flex gap-1 p-1 w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab('queue');
                setTransactionOrderFilter('all');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md transition-all ${
                activeTab === 'queue'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Antrean Pesanan
              {transactions.filter(t => t.orderStatus === 'Menunggu' || t.orderStatus === 'Diproses').length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white animate-pulse">
                  {transactions.filter(t => t.orderStatus === 'Menunggu' || t.orderStatus === 'Diproses').length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setTransactionOrderFilter('all');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md transition-all ${
                activeTab === 'history'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Riwayat Selesai
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md transition-all ${
                activeTab === 'reports'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Laporan Keuangan
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md transition-all ${
                activeTab === 'menu'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Plus className="w-4 h-4" />
              Kelola Menu
            </button>
          </div>
        </div>

        {/* Tab 1: Queue & Tab 2: History */}
        {(activeTab === 'queue' || activeTab === 'history') && (
          <section className="space-y-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold leading-tight">
                  {activeTab === 'queue' ? 'Antrean Pesanan Aktif' : 'Riwayat Transaksi Selesai & Batal'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'queue' 
                    ? 'Kelola pesanan yang masuk dan tandai selesai jika pesanan sudah dibuat.' 
                    : 'Riwayat transaksi yang telah diselesaikan atau dibatalkan.'}
                </p>
              </div>
              <p className="text-sm font-medium text-primary">
                {displayedTransactions.length} dari {
                  transactions.filter(t => 
                    activeTab === 'queue' 
                      ? (t.orderStatus === 'Menunggu' || t.orderStatus === 'Diproses') 
                      : (t.orderStatus === 'Selesai' || t.orderStatus === 'Dibatalkan')
                  ).length
                } transaksi
              </p>
            </div>

            {/* Filter controls */}
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
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm animate-none"
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
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm animate-none"
                  >
                    <option value="all">Semua</option>
                    {orderStatuses
                      .filter((status) => 
                        activeTab === 'queue'
                          ? (status === 'Menunggu' || status === 'Diproses')
                          : (status === 'Selesai' || status === 'Dibatalkan')
                      )
                      .map((status) => (
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
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm animate-none"
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

            {/* Mobile View Card List */}
            <div className="grid gap-3 md:hidden">
              {displayedTransactions.length === 0 ? (
                <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
                  Belum ada transaksi yang sesuai.
                </div>
              ) : (
                displayedTransactions.map((transaction) => {
                  const getStatusStyles = () => {
                    switch (transaction.orderStatus) {
                      case 'Menunggu':
                        return 'border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/10 ring-1 ring-amber-500/20';
                      case 'Diproses':
                        return 'border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/10 ring-1 ring-blue-500/20';
                      case 'Selesai':
                        return 'border-l-4 border-l-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5';
                      case 'Dibatalkan':
                        return 'border-l-4 border-l-rose-500 bg-rose-50/10 dark:bg-rose-950/5 opacity-70';
                      default:
                        return 'border-l-4 border-l-muted';
                    }
                  };

                  return (
                    <article 
                      key={transaction.id} 
                      className={`rounded-lg border bg-card p-3 shadow-sm transition-all duration-200 ${getStatusStyles()}`}
                    >
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-semibold truncate max-w-[150px]">{transaction.customerName}</h4>
                            {transaction.orderStatus === 'Menunggu' && (
                              <span className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase animate-pulse">
                                Baru
                              </span>
                            )}
                            {transaction.orderStatus === 'Diproses' && (
                              <span className="inline-flex items-center rounded bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-[9px] font-bold text-blue-800 dark:text-blue-300 uppercase">
                                Proses
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(transaction.createdAt)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total</p>
                          <p className="text-sm font-bold text-primary">{formatPrice(transaction.totalPrice)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground font-medium mb-1.5">
                        <span className="text-foreground">{getOrderTypeDisplay(transaction)}</span>
                        <span>•</span>
                        <span>{transaction.paymentMethod}</span>
                        <span>•</span>
                        <span>{transaction.totalItems} Item</span>
                      </div>

                      {transaction.orderNotes && (
                        <div className="mb-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 px-2 py-1 rounded border border-amber-200/30 italic">
                          "{transaction.orderNotes}"
                        </div>
                      )}

                      <div className="text-xs bg-muted/30 dark:bg-muted/10 p-2 rounded border border-border/50">
                        <span className="font-semibold text-muted-foreground">Pesanan: </span>
                        <span className="font-medium text-foreground">
                          {transaction.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <div className="grid gap-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Pembayaran</span>
                          <select
                            value={transaction.paymentStatus}
                            onChange={(event) =>
                              handlePaymentStatusChange(transaction.id, event.target.value as PaymentStatus)
                            }
                            className="h-8 w-full rounded-md border border-input bg-background px-1.5 py-0.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          >
                            {paymentStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Status Pesanan</span>
                          <select
                            value={transaction.orderStatus}
                            onChange={(event) =>
                              handleOrderStatusChange(transaction.id, event.target.value as OrderStatus)
                            }
                            className="h-8 w-full rounded-md border border-input bg-background px-1.5 py-0.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          >
                            {orderStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Quick 'Selesai' Button */}
                      {(transaction.orderStatus === 'Menunggu' || transaction.orderStatus === 'Diproses') && (
                        <Button
                          type="button"
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold mt-3 h-8 text-xs"
                          onClick={() => {
                            handleOrderStatusChange(transaction.id, 'Selesai');
                            // Also mark as paid if unpaid (optional logic for user convenience)
                            if (transaction.paymentStatus === 'Belum bayar') {
                              handlePaymentStatusChange(transaction.id, 'Sudah bayar');
                            }
                          }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Tandai Selesai & Bayar
                        </Button>
                      )}

                      <div className="mt-2.5 flex gap-2">
                        <Button asChild size="sm" variant="outline" className="h-8 flex-1 text-xs font-medium">
                          <Link to={`/nota/${transaction.id}`}>
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Cetak
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="h-8 flex-1 text-xs font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Desktop View Table */}
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

                      const getRowStyles = () => {
                        switch (transaction.orderStatus) {
                          case 'Menunggu':
                            return 'bg-amber-50/50 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 border-l-4 border-l-amber-500 font-medium';
                          case 'Diproses':
                            return 'bg-blue-50/50 hover:bg-blue-100/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 border-l-4 border-l-blue-500';
                          case 'Selesai':
                            return 'border-l-4 border-l-emerald-500 hover:bg-muted/40';
                          case 'Dibatalkan':
                            return 'border-l-4 border-l-rose-500 opacity-60 bg-muted/20 hover:bg-muted/30 line-through decoration-muted-foreground/30';
                          default:
                            return 'hover:bg-muted/40';
                        }
                      };

                      return (
                        <tr key={transaction.id} className={`border-b last:border-0 transition-colors ${getRowStyles()}`}>
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
                              {(transaction.orderStatus === 'Menunggu' || transaction.orderStatus === 'Diproses') && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                  onClick={() => {
                                    handleOrderStatusChange(transaction.id, 'Selesai');
                                    if (transaction.paymentStatus === 'Belum bayar') {
                                      handlePaymentStatusChange(transaction.id, 'Sudah bayar');
                                    }
                                  }}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Selesai
                                </Button>
                              )}
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
        )}

        {/* Tab 3: Reports */}
        {activeTab === 'reports' && (
          <section className="space-y-6">
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
                <Button 
                  type="button" 
                  variant="default" 
                  onClick={handlePrintReportPdf} 
                  className="self-end bg-primary hover:bg-primary/95 text-primary-foreground"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Cetak Laporan (PDF)
                </Button>
              </div>
            </div>

            {/* Metrics cards */}
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
                  <h3 className="text-lg font-semibold leading-tight">Grafik Pendapatan Harian</h3>
                  <p className="text-sm text-muted-foreground">Grafik total pendapatan harian dari transaksi sukses.</p>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="date" tickLine={false} style={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${val}k`} style={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }} />
                      <Tooltip formatter={(value: any) => [formatPrice(Number(value)), 'Pendapatan']} contentStyle={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 8 }} />
                      <Bar dataKey="Pendapatan (K)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tab 4: Menu management */}
        {activeTab === 'menu' && (
          <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <form onSubmit={handleMenuSubmit} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold leading-tight">{editingMenuId ? 'Edit Menu' : 'Tambah Menu'}</h2>
                <p className="text-sm text-muted-foreground">Data menu tersimpan di database cloud.</p>
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

              {/* Mobile menus list */}
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

              {/* Desktop menus table */}
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
        )}

      </div>
    </main>
  </div>
);
};

export default Admin;
