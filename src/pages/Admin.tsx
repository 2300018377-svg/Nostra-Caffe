import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  DollarSign,
  ListChecks,
  LogOut,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  Trash2,
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
  StoredMenuItem,
  updateTransaction,
} from '@/lib/storage';
import { OrderStatus, PaymentStatus, Transaction } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

const ADMIN_PASSWORD = 'admin123';
const ADMIN_SESSION_KEY = 'nostra-caffe-admin-session';
const orderStatuses: OrderStatus[] = ['Menunggu', 'Diproses', 'Selesai', 'Dibatalkan'];
const paymentStatuses: PaymentStatus[] = ['Belum bayar', 'Sudah bayar'];
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

const isAdminSessionActive = () => {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
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

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isAdminSessionActive());
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>(() => getTransactions());
  const [menuItems, setMenuItems] = useState<StoredMenuItem[]>(() => getMenuItems());
  const [menuForm, setMenuForm] = useState<MenuFormState>(emptyMenuForm);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const { toast } = useToast();

  const report = useMemo(() => {
    const today = new Date().toDateString();
    const todayTransactions = transactions.filter((transaction) => {
      return new Date(transaction.createdAt).toDateString() === today;
    });

    return {
      totalTransactions: todayTransactions.length,
      totalRevenue: todayTransactions
        .filter((transaction) => transaction.paymentStatus === 'Sudah bayar' && transaction.orderStatus !== 'Dibatalkan')
        .reduce((sum, transaction) => sum + transaction.totalPrice, 0),
      completedOrders: todayTransactions.filter((transaction) => transaction.orderStatus === 'Selesai').length,
      canceledOrders: todayTransactions.filter((transaction) => transaction.orderStatus === 'Dibatalkan').length,
    };
  }, [transactions]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === ADMIN_PASSWORD) {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setPassword('');
      setLoginError('');
      return;
    }

    setLoginError('Sandi admin salah.');
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
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
        <div className="container mx-auto flex flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Dashboard admin/kasir</p>
            <h1 className="text-3xl font-bold text-foreground">Pengelolaan Transaksi</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Menu
              </Link>
            </Button>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Keluar Admin
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto space-y-8 px-4 py-8">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <ClipboardList className="mb-3 h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">Transaksi hari ini</p>
            <p className="text-2xl font-bold">{report.totalTransactions}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <DollarSign className="mb-3 h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">Pendapatan hari ini</p>
            <p className="text-2xl font-bold">{formatPrice(report.totalRevenue)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <ListChecks className="mb-3 h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">Pesanan selesai</p>
            <p className="text-2xl font-bold">{report.completedOrders}</p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <Trash2 className="mb-3 h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">Pesanan dibatalkan</p>
            <p className="text-2xl font-bold">{report.canceledOrders}</p>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Transaksi Masuk dan Riwayat</h2>
              <p className="text-sm text-muted-foreground">Ubah status, cetak nota, atau hapus transaksi dari tabel ini.</p>
            </div>
            <p className="text-sm font-medium text-primary">{transactions.length} transaksi tersimpan</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-3 font-semibold">Waktu</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
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
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      Belum ada transaksi. Pesanan dari halaman customer akan muncul di sini.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => {
                    const receiptReady =
                      transaction.orderStatus === 'Selesai' || transaction.paymentStatus === 'Sudah bayar';

                    return (
                      <tr key={transaction.id} className="border-b last:border-0">
                        <td className="px-3 py-3 align-top">{formatDateTime(transaction.createdAt)}</td>
                        <td className="px-3 py-3 align-top font-medium">{transaction.customerName}</td>
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
                              <Link to={`/nota/${transaction.id}`} target="_blank" rel="noopener noreferrer">
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
              <h2 className="text-xl font-semibold">{editingMenuId ? 'Edit Menu' : 'Tambah Menu'}</h2>
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

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Pengelolaan Menu</h2>
              <p className="text-sm text-muted-foreground">Menu yang tidak tersedia tidak tampil di halaman customer.</p>
            </div>

            <div className="overflow-x-auto">
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
                  {menuItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium">{item.name}</td>
                      <td className="px-3 py-3">
                        {categories.find((category) => category.id === item.category)?.name ?? item.category}
                      </td>
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
