import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
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
import { ADMIN_PASSWORD, clearAdminSession, isAdminSessionActive, startAdminSession } from '@/lib/adminAuth';

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => isAdminSessionActive());
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
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

  const report = useMemo(() => {
    return getTransactionReport(transactions, reportStartDate, reportEndDate);
  }, [reportEndDate, reportStartDate, transactions]);

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

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      startAdminSession();
      setIsAuthenticated(true);
      setPassword('');
      setLoginError('');
      return;
    }

    setLoginError('Sandi admin salah.');
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setPassword('');
    setLoginError('');
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

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="mb-6 text-center">
              <img
                src="/logo-nostra.png"
                alt="Logo Nostra-Caffe"
                className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
              />
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Masuk Admin/Kasir</h1>
              <p className="text-sm text-muted-foreground">Masukkan sandi admin untuk membuka dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="admin-password" className="text-sm font-medium">
                  Sandi admin
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setLoginError('');
                  }}
                  placeholder="Masukkan sandi"
                />
                {loginError && <p className="text-sm font-medium text-destructive">{loginError}</p>}
              </div>

              <Button type="submit" className="w-full">
                Masuk Dashboard
              </Button>
              <Button asChild type="button" variant="ghost" className="w-full">
                <Link to="/">Kembali ke Menu</Link>
              </Button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 sm:py-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Dashboard admin/kasir</p>
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
              <Input
                value={menuForm.image}
                onChange={(event) => setMenuForm({ ...menuForm, image: event.target.value })}
                placeholder="URL gambar menu"
                className="min-w-0"
              />
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
              <Button type="submit">
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
