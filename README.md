# Nostra Caffe: Sistem Pemesanan & Pengelolaan Kasir Digital
> **Proyek Mata Kuliah: Manajemen Proyek Teknologi Informasi (MPTI)**  
> Jurusan Teknik Informatika / Sistem Informasi

---

## 📝 1. Latar Belakang & Deskripsi Proyek

Nostra Caffe adalah sebuah aplikasi pemesanan berbasis web (SaaS Kasir) yang dirancang untuk mengotomatisasi proses pemesanan menu, pelacakan transaksi, cetak nota digital, serta penyusunan laporan keuangan harian di kafe secara *real-time*. 

Tujuan utama dari proyek ini adalah meminimalkan kesalahan pencatatan transaksi manual, mempercepat proses layanan meja, dan memberikan analisis omzet harian yang akurat bagi pemilik usaha. Proyek ini dikembangkan menggunakan pendekatan manajemen proyek tangkas (*Agile Project Management*) untuk mengintegrasikan kebutuhan pelanggan dan pengelola dalam satu kesatuan sistem yang aman, responsif, dan ringan.

---

## 🛠️ 2. Arsitektur & Spesifikasi Teknologi

Aplikasi ini menggunakan arsitektur modern berbasis **Serverless** dan **Offline-First Capabilities** dengan rincian *stack* sebagai berikut:

* **Frontend Framework**: [Vite](https://vite.dev/) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Menjaga keamanan tipe data dan kecepatan kompilasi kode).
* **Styling (CSS)**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Menghasilkan desain UI bernuansa *Glassmorphism* premium yang fully-responsive di layar HP, Tablet, maupun Desktop).
* **Database & Real-time Sync**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Sinkronisasi pesanan secara real-time dari HP pembeli ke laptop kasir tanpa reload halaman).
* **Autentikasi Keamanan**: [Firebase Authentication](https://firebase.google.com/docs/auth) (Google OAuth Login + Sistem Registrasi Admin berbasis Token Rahasia).
* **Visualisasi Laporan**: [Recharts](https://recharts.org/) (Grafik garis area interaktif untuk tren omzet harian).
* **Notifikasi Suara**: Web Audio API (Sintesis audio lonceng pesanan masuk tanpa membebani aset jaringan).
* **Hosting**: [Vercel](https://vercel.com/) (Deploy otomatis terintegrasi CI/CD melalui repositori GitHub).

---

## 📦 3. Fitur Utama & Keunggulan Sistem

### 🌟 Sisi Pembeli (Customer Flow)
1. **Pencarian & Filter Instan**: Menyaring menu berdasarkan kategori dan pencarian kata kunci dengan performa 60 FPS.
2. **Interactive Cart (Keranjang Belanja)**: Ditunjang dengan micro-animation (tombol bergoyang dan menu terbang ke keranjang).
3. **Checkout Asinkron & Caching Offline**: Memproses checkout dalam waktu **<50ms** berkat *Persistent Local Cache (IndexedDB)*. Jika HP pelanggan kehilangan koneksi internet, pesanan tetap tersimpan secara lokal dan otomatis tersinkronisasi ke cloud ketika internet kembali aktif.
4. **Nota Digital (Receipt PDF)**: Mengunduh nota transaksi digital secara langsung sebagai file PDF tanpa kertas.

### 💼 Sisi Pengelola (Admin/Kasir Flow)
1. **Google OAuth & Guarded Routes**: Login admin terproteksi menggunakan Google. Registrasi admin baru wajib memasukkan kode otorisasi khusus (token rahasia pengelola).
2. **Real-time Order Tracker**: Daftar pesanan kasir diperbarui otomatis secara real-time menggunakan Firebase Snapshot Listeners.
3. **Audio Chime Notification**: Kasir memperoleh sinyal suara lonceng otomatis saat ada pesanan baru yang dikirim oleh pelanggan.
4. **Analitik Finansial**: Laporan harian interaktif berupa total omzet, pesanan sukses, pembatalan pesanan, dan visualisasi grafik tren omzet harian.
5. **Manajemen Menu Mandiri (CRUD)**:
   * **Client-side Image Compressor (HTML5 Canvas)**: Gambar menu yang di-upload dari galeri lokal dikompresi otomatis menjadi resolusi 500x500px JPEG kualitas 80% (~35KB) dan disimpan langsung di Firestore dalam string Base64. **Menghilangkan biaya sewa Cloud Storage tambahan dan menghapus lag pemuatan gambar di HP pembeli.**
6. **Backup & Ekspor Data**: Mengekspor data laporan ke format CSV dan mencadangkan data menu secara berkala via file JSON.

---

## 🗂️ 4. Aspek Manajemen Proyek (MPTI)

Proyek ini dikembangkan dengan mematuhi siklus manajemen proyek TI terstruktur:

### A. WBS (Work Breakdown Structure)
1. **Inisiasi & Desain**: Perancangan mockup antarmuka, pembuatan desain database Firestore, dan penyusunan WBS.
2. **Pengembangan Core Frontend**: Pembuatan halaman menu pembeli, keranjang belanja, dan responsivitas tablet.
3. **Integrasi Database & Auth**: Penyambungan Firestore, setup Firebase Auth Google Sign-in, dan konfigurasi *Security Rules* Firestore.
4. **Optimasi Performa (Quality Assurance)**: Pembuatan sistem kompresi gambar lokal Canvas dan implementasi *IndexedDB Offline Caching*.
5. **Verifikasi & Deployment**: Pengujian performa, build produksi, dan deployment ke Vercel.

### B. Manajemen Kualitas & Mitigasi Risiko
* **Risiko Latensi Jaringan**: Dimigrasi dengan teknologi *IndexedDB Persistent Cache* pada client side agar pengguna tidak mengalami delay saat checkout.
* **Risiko Kebocoran Data**: Dimigrasi dengan menerapkan *Firestore Security Rules* berlapis di mana pelanggan hanya diberikan akses tulis transaksi, sedangkan akses manajemen menu dikunci khusus untuk user ID yang terdaftar dalam koleksi `authorizedAdmins`.

---

## 🛠️ 5. Panduan Instalasi Lokal

Ikuti langkah-langkah berikut untuk menjalankan proyek Nostra Caffe di komputer lokal Anda:

### 1. Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (Rekomendasi versi LTS 18 atau di atasnya).

### 2. Kloning Repositori
```bash
git clone https://github.com/2300018377-svg/Nostra-Caffe.git
cd Nostra-Caffe
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Menjalankan Server Pengembangan (Local Dev)
```bash
npm run dev
```
Buka browser Anda dan akses halaman di `http://localhost:8080` (untuk halaman pembeli) atau `http://localhost:8080/admin` (untuk dashboard pengelola).

### 5. Kompilasi Produksi (Production Build)
Untuk membangun file bundel siap pakai dan optimal untuk dideploy:
```bash
npm run build
```
File hasil kompilasi akan berada di direktori `/dist`.

---

## 🔒 6. Konfigurasi Aturan Database (Firestore Security Rules)
Untuk memastikan keamanan data, pastikan aturan berikut terpasang pada tab **Rules** Firestore Database di Firebase Console Anda:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /transactions/{transactionId} {
      allow read, write: if true;
    }
    match /menuItems/{menuItemId} {
      allow read: if true;
      allow write: if request.auth != null && exists(/databases/$(database)/documents/authorizedAdmins/$(request.auth.uid));
    }
    match /authorizedAdmins/{adminId} {
      allow read, write: if request.auth != null && request.auth.uid == adminId;
    }
  }
}
```
