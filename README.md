# Nostra-Caffe

Sistem pemesanan dan pengelolaan transaksi sederhana untuk Nostra-Caffe. Aplikasi ini menyediakan halaman customer untuk memilih menu dan checkout, serta dashboard admin/kasir untuk memantau transaksi, status pembayaran, status pesanan, laporan harian, dan pengelolaan menu.

## Project setup

Install dependencies and start the development server:

```sh
npm install
npm run dev
```

## Local development

- `npm run dev` starts the app at `http://localhost:8080`
- `npm run build` creates a production build
- `npm run preview` serves the built output locally

## Main routes

- `/` halaman customer/menu
- `/admin` dashboard admin/kasir
- `/nota/:transactionId` halaman nota transaksi untuk cetak, simpan PDF via print browser, dan bagikan ke WhatsApp

## Technologies used

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn-ui

## Notes

Data transaksi dan menu tersimpan di localStorage browser karena project ini belum memakai backend/database.
